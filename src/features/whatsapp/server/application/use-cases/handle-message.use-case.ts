import { routing } from "@/i18n/routing";
import { toISODate, today } from "@/lib/dates";
import { isoDate } from "@/features/transaction/schemas/transaction-api.schema";
import { parseVoiceEntry } from "@/features/transaction/lib/parse-voice";
import { parseCommand, type Command } from "../../../lib/commands";
import {
  emptyConversation,
  emptyMovement,
  missingField,
  mergeMovement,
  parseChoice,
  quickAnswer,
  sanitizeMovement,
  sanitizeMovements,
  splitReady,
  toReadyMovement,
  withTurn,
  type ReadyMovement,
} from "../../../lib/conversation";
import { hashLinkCode } from "../../../lib/link-code";
import { movementId } from "../../../lib/movement-id";
import { createReplies, type Replies } from "../../../lib/replies";
import type {
  ChatCategory,
  ChatProfile,
  Conversation,
  IncomingMessage,
  Interpretation,
  MediaFile,
  Movement,
  Period,
  Reply,
} from "../../../types";
import { CONVERSATION_TTL_MS, type WhatsappLink } from "../../domain/entities/whatsapp-link.entity";
import type { Ledger, MessageInterpreter, TextsFor, Throttle, WhatsappMessenger } from "../../domain/ports/whatsapp.ports";
import type { WhatsappRepository } from "../../domain/repositories/whatsapp.repository";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MESSAGES_PER_MINUTE = 20;
const LINK_ATTEMPTS_PER_HOUR = 5;
const STRANGER_REPLIES_PER_DAY = 3;
const MAX_CHAT_REPLY_LENGTH = 500;

export interface HandleMessageDependencies {
  links: WhatsappRepository;
  messenger: WhatsappMessenger;
  ledger: Ledger;
  interpreter: MessageInterpreter;
  throttle: Throttle;
  texts: TextsFor;
  appUrl: string;
  now?: () => Date;
}

export type HandleOutcome = "duplicate" | "throttled" | "linked" | "stranger" | "handled";

interface Context {
  userId: string;
  messageId: string;
  profile: ChatProfile;
  categories: ChatCategory[];
  replies: Replies;
}

interface Outcome {
  conversation: Conversation;
  replies: Reply[];
}

const say = (conversation: Conversation, ...replies: Reply[]): Outcome => ({ conversation, replies });

function userTurnText(message: IncomingMessage) {
  if (message.kind === "text") return message.text;
  if (message.kind === "image") return `[imagen] ${message.caption ?? ""}`;
  return `[${message.kind}]`;
}

const replyText = (reply: Reply) => reply.text;

const RECEIPT_ERROR_REPLIES = { limited: "busy", not_receipt: "notReceipt", failed: "imageFailed" } as const;

function validDate(value: string | undefined) {
  if (!value) return null;
  const isValid = isoDate.safeParse(value).success;
  return isValid ? value : null;
}

const firstOfMonth = (isoDay: string) => `${isoDay.slice(0, 8)}01`;

export class HandleMessageUseCase {
  private readonly now: () => Date;

  constructor(private readonly deps: HandleMessageDependencies) {
    this.now = deps.now ?? (() => new Date());
  }

  async execute(message: IncomingMessage): Promise<HandleOutcome> {
    const { links, messenger, throttle } = this.deps;
    const isFirstDelivery = await links.markMessageSeen(message.id);
    if (!isFirstDelivery) return "duplicate";

    const withinRate = await throttle.allow(`whatsapp:${message.from}`, MESSAGES_PER_MINUTE, MINUTE_MS);
    if (!withinRate) return "throttled";

    await messenger.markRead(message.id);

    const command = message.kind === "text" ? parseCommand(message.text) : null;
    if (command?.kind === "link") {
      await this.link(message.from, command.code);
      return "linked";
    }

    const link = await links.findByPhone(message.from);
    if (!link) {
      await this.greetStranger(message.from);
      return "stranger";
    }

    await this.converse(link, message, command);
    return "handled";
  }

  private defaultTexts() {
    return this.deps.texts(routing.defaultLocale);
  }

  private async link(phone: string, code: string) {
    const { links, messenger, ledger, throttle } = this.deps;
    const t = this.defaultTexts();
    const canTryLinking = await throttle.allow(`whatsapp-link:${phone}`, LINK_ATTEMPTS_PER_HOUR, HOUR_MS);
    if (!canTryLinking) return messenger.send(phone, { kind: "text", text: t("linkLimited") });

    const userId = await links.consumeLinkCode(hashLinkCode(code), this.now());
    if (!userId) return messenger.send(phone, { kind: "text", text: t("linkInvalid") });

    await links.link(userId, phone);
    const profile = await ledger.profile(userId);
    const text = this.deps.texts(profile.locale)("linked", { name: profile.name });
    await messenger.send(phone, { kind: "text", text });
  }

  private async greetStranger(phone: string) {
    const { messenger, throttle } = this.deps;
    const canReply = await throttle.allow(`whatsapp-stranger:${phone}`, STRANGER_REPLIES_PER_DAY, DAY_MS);
    if (!canReply) return;

    const text = this.defaultTexts()("notLinked", { url: this.deps.appUrl });
    await messenger.send(phone, { kind: "text", text });
  }

  private async converse(link: WhatsappLink, message: IncomingMessage, command: Command | null) {
    const { messenger, ledger } = this.deps;
    const [profile, categories] = await Promise.all([ledger.profile(link.userId), ledger.categories(link.userId)]);
    const t = this.deps.texts(profile.locale);
    const context: Context = {
      userId: link.userId,
      messageId: message.id,
      profile,
      categories,
      replies: createReplies(t, profile, categories),
    };

    const previous = link.conversation ?? emptyConversation();
    let outcome: Outcome;
    try {
      outcome = await this.respond(context, previous, message, command);
    } catch (error) {
      await messenger.send(message.from, { kind: "text", text: t("failed") });
      throw error;
    }

    const isUnlinking = command?.kind === "unlink";
    if (!isUnlinking) await this.saveTranscript(link.userId, message, outcome);

    for (const reply of outcome.replies) await messenger.send(message.from, reply);
  }

  private async saveTranscript(userId: string, message: IncomingMessage, outcome: Outcome) {
    const withUser = withTurn(outcome.conversation, "user", userTurnText(message));
    const conversation = outcome.replies.reduce(
      (current, reply) => withTurn(current, "bot", replyText(reply)),
      withUser,
    );

    const now = this.now();
    const expiresAt = new Date(now.getTime() + CONVERSATION_TTL_MS);
    await this.deps.links.saveConversation(userId, conversation, expiresAt, now);
  }

  private async respond(context: Context, conversation: Conversation, message: IncomingMessage, command: Command | null) {
    switch (message.kind) {
      case "text":
        if (command) return this.runCommand(context, conversation, command);
        return this.understand(context, conversation, message.text, null);
      case "choice":
        return this.choose(context, conversation, message.choiceId);
      case "audio": {
        const audio = await this.deps.messenger.downloadMedia(message.mediaId);
        if (!audio) return say(conversation, context.replies.text("audioFailed"));
        return this.understand(context, conversation, null, audio);
      }
      case "image":
        return this.readImage(context, conversation, message.mediaId);
      case "unsupported":
        return say(conversation, context.replies.text("unsupported"));
    }
  }

  private async runCommand(context: Context, conversation: Conversation, command: Command): Promise<Outcome> {
    const { replies } = context;
    switch (command.kind) {
      case "unlink":
        await this.deps.links.unlinkUser(context.userId);
        return say(emptyConversation(), replies.text("unlinked"));
      case "cancel":
        return this.cancel(context, conversation);
      case "undo":
        return this.undo(context, conversation, conversation.lastRecorded);
      case "help":
      case "link":
        return say(conversation, replies.text("help"));
    }
  }

  private cancel({ replies }: Context, conversation: Conversation): Outcome {
    if (!conversation.drafts.length) return say(conversation, replies.text("nothingPending"));
    return say({ ...conversation, drafts: [] }, replies.text("cancelled"));
  }

  private async undo(context: Context, conversation: Conversation, ids: string[]): Promise<Outcome> {
    if (ids.length === 0) return say(conversation, context.replies.text("nothingToUndo"));

    const removed = await this.deps.ledger.remove(context.userId, ids);
    if (removed === 0) return say(conversation, context.replies.text("nothingToUndo"));

    const lastRecorded = conversation.lastRecorded.filter((id) => !ids.includes(id));
    return say({ ...conversation, lastRecorded }, context.replies.text("undone", { count: removed }));
  }

  private async choose(context: Context, conversation: Conversation, choiceId: string): Promise<Outcome> {
    const choice = parseChoice(choiceId);
    if (!choice) return say(conversation, context.replies.text("notUnderstood"));
    if (choice.kind === "undo") return this.undo(context, conversation, choice.ids);
    if (choice.kind === "cancel") return this.cancel(context, conversation);

    const [head, ...rest] = conversation.drafts;
    if (!head) return say(conversation, context.replies.text("nothingPending"));
    const answer = sanitizeMovement({ ...emptyMovement(), categoryId: choice.categoryId }, context.categories);
    return this.advance(context, { ...conversation, drafts: [mergeMovement(head, answer), ...rest] });
  }

  private async understand(context: Context, conversation: Conversation, text: string | null, audio: MediaFile | null) {
    const [head, ...rest] = conversation.drafts;
    const missing = head ? missingField(head) : null;
    const canAnswerQuickly = text !== null && head && missing;
    if (canAnswerQuickly) {
      const quick = quickAnswer(text, missing, context.categories, context.profile.locale);
      if (quick) return this.advance(context, { ...conversation, drafts: [mergeMovement(head, quick), ...rest] });
    }

    const result = await this.deps.interpreter.interpret(
      context.userId,
      {
        profile: context.profile,
        categories: context.categories,
        pending: head ?? null,
        history: conversation.history,
        text,
      },
      audio,
    );

    if (result.ok) return this.act(context, conversation, result.interpretation);
    if (result.error === "limited") return say(conversation, context.replies.text("busy"));
    if (text === null) return say(conversation, context.replies.text("audioFailed"));
    return this.fallback(context, conversation, text);
  }

  private fallback(context: Context, conversation: Conversation, text: string) {
    const draft = parseVoiceEntry(text, context.categories, context.profile.locale);
    if (draft.amount === null) return say(conversation, context.replies.text("notUnderstood"));
    const serverToday = toISODate(today());
    const movement = sanitizeMovement(
      {
        type: draft.type,
        amount: draft.amount,
        categoryId: draft.categoryId,
        description: draft.description || null,
        date: draft.transactionDate === serverToday ? null : draft.transactionDate,
      },
      context.categories,
    );
    return this.advance(context, { ...conversation, drafts: [movement] });
  }

  private async act(context: Context, conversation: Conversation, interpretation: Interpretation): Promise<Outcome> {
    const { replies, categories } = context;
    switch (interpretation.intent) {
      case "record": {
        const movements = sanitizeMovements(interpretation.movements, categories);
        if (!movements.length) return say(conversation, replies.text("notUnderstood"));
        return this.advance(context, { ...conversation, drafts: movements });
      }
      case "answer": {
        const [head, ...rest] = conversation.drafts;
        const patch = sanitizeMovement(interpretation.movements[0] ?? emptyMovement(), categories);
        if (head) return this.advance(context, { ...conversation, drafts: [mergeMovement(head, patch), ...rest] });
        if (patch.amount === null) return say(conversation, replies.text("nothingPending"));
        return this.advance(context, { ...conversation, drafts: [patch] });
      }
      case "summary":
        return this.summarize(context, conversation, interpretation.period);
      case "chat": {
        const text = interpretation.reply?.trim().slice(0, MAX_CHAT_REPLY_LENGTH);
        return say(conversation, text ? { kind: "text", text } : replies.text("help"));
      }
      case "cancel":
      case "undo":
      case "help":
        return this.runCommand(context, conversation, { kind: interpretation.intent });
    }
  }

  private async readImage(context: Context, conversation: Conversation, mediaId: string): Promise<Outcome> {
    const { replies } = context;
    const image = await this.deps.messenger.downloadMedia(mediaId);
    if (!image) return say(conversation, replies.text("imageFailed"));

    const { userId, categories, profile } = context;
    const result = await this.deps.interpreter.readReceipt(userId, image, categories, profile.today);
    if (!result.ok) return say(conversation, replies.text(RECEIPT_ERROR_REPLIES[result.error]));

    const movement = sanitizeMovement(result.movement, context.categories);
    if (movement.amount === null) return say(conversation, replies.text("notReceipt"));
    return this.advance(context, { ...conversation, drafts: [movement] });
  }

  private async summarize(context: Context, conversation: Conversation, period: Partial<Period> | null) {
    const { profile, userId, replies } = context;
    const to = validDate(period?.to) ?? profile.today;
    const from = validDate(period?.from) ?? firstOfMonth(profile.today);

    const isInOrder = from <= to;
    const start = isInOrder ? from : to;
    const end = isInOrder ? to : from;

    const summary = await this.deps.ledger.summarize(userId, { from: start, to: end });
    return say(conversation, replies.summary(summary, start, end));
  }

  private async advance(context: Context, conversation: Conversation): Promise<Outcome> {
    const { ready, pending } = splitReady(conversation.drafts);
    const replies: Reply[] = [];
    const recorded: ReadyMovement[] = [];
    const recordedIds: string[] = [];
    const rejected: Movement[] = [];

    for (const [index, draft] of ready.entries()) {
      const movement = toReadyMovement(draft, context.profile.today, context.categories);
      const id = movementId(context.messageId, index);
      const isRecorded = await this.deps.ledger.record(context.userId, id, movement);
      if (isRecorded) {
        recorded.push(movement);
        recordedIds.push(id);
      } else {
        rejected.push({ ...draft, categoryId: null });
      }
    }

    if (recorded.length) replies.push(context.replies.recorded(recorded, recordedIds));

    const stillPending = [...rejected, ...pending];
    const [head] = stillPending;
    if (head) replies.push(this.askForMissing(context, head));

    return {
      conversation: {
        ...conversation,
        drafts: stillPending,
        lastRecorded: recordedIds.length ? recordedIds : conversation.lastRecorded,
      },
      replies,
    };
  }

  private askForMissing({ replies }: Context, draft: Movement) {
    const isMissingAmount = missingField(draft) === "amount";
    if (isMissingAmount) return replies.askAmount(draft);
    return replies.askCategory(draft);
  }
}
