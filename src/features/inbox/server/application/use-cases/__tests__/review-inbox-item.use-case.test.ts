import { describe, expect, it, vi } from "vitest";
import type { Transaction } from "@/features/transaction/server/domain/entities/transaction.entity";
import { AcceptInboxItemUseCase } from "../accept-inbox-item.use-case";
import { DismissInboxItemUseCase } from "../dismiss-inbox-item.use-case";
import { fakeItemRepository, fakeSenderRepository, pendingItem, sender, USER } from "./fake-inbox";

const input = { description: "Almuerzo", amount: 14.5, type: "expense" as const, categoryId: "food", transactionDate: "2026-09-24" };

const createdTransaction = (type: "expense" | "income"): Transaction => ({
  id: "tx-1",
  userId: USER,
  description: "Almuerzo",
  amount: 14.5,
  type,
  categoryId: "food",
  reference: "576278",
  transactionDate: new Date("2026-09-24"),
  recurringTransactionId: null,
  listId: "private-list",
  createdAt: new Date(),
});

function acceptUseCase(type: "expense" | "income" = "expense") {
  const repository = fakeItemRepository({ accept: vi.fn().mockResolvedValue(createdTransaction(type)) });
  const budgetMonitor = { scheduleCheck: vi.fn() };
  const listPlacement = { privateListFor: vi.fn().mockResolvedValue("private-list") };
  return { repository, budgetMonitor, useCase: new AcceptInboxItemUseCase(repository, listPlacement, budgetMonitor) };
}

describe("AcceptInboxItemUseCase", () => {
  it("crea el movimiento en la lista privada, aprende el comercio y revisa el presupuesto", async () => {
    const { repository, budgetMonitor, useCase } = acceptUseCase();

    await useCase.execute(USER, "item-1", input);

    expect(repository.accept).toHaveBeenCalledWith({
      item: pendingItem,
      merchantKey: "ikf",
      transaction: {
        userId: USER,
        description: "Almuerzo",
        amount: 14.5,
        type: "expense",
        categoryId: "food",
        transactionDate: new Date("2026-09-24"),
        reference: "576278",
        listId: "private-list",
      },
    });
    expect(budgetMonitor.scheduleCheck).toHaveBeenCalledWith(USER, "food");
  });

  it("un ingreso no revisa el presupuesto", async () => {
    const { budgetMonitor, useCase } = acceptUseCase("income");

    await useCase.execute(USER, "item-1", { ...input, type: "income" });

    expect(budgetMonitor.scheduleCheck).not.toHaveBeenCalled();
  });

  it("un movimiento ya revisado o ajeno es not_found", async () => {
    const { repository, useCase } = acceptUseCase();
    vi.mocked(repository.findPendingOwned).mockResolvedValue(null);

    expect(await useCase.execute(USER, "item-1", input)).toEqual({ error: "not_found" });
    expect(repository.accept).not.toHaveBeenCalled();
  });

  it("una categoría ajena es category_not_found", async () => {
    const { repository, useCase } = acceptUseCase();
    vi.mocked(repository.categoryBelongsTo).mockResolvedValue(false);

    expect(await useCase.execute(USER, "item-1", input)).toEqual({ error: "category_not_found" });
    expect(repository.accept).not.toHaveBeenCalled();
  });
});

describe("DismissInboxItemUseCase", () => {
  it("descarta el movimiento y cuenta el descarte del remitente", async () => {
    const items = fakeItemRepository();
    const senders = fakeSenderRepository();

    expect(await new DismissInboxItemUseCase(items, senders).execute(USER, "item-1")).toEqual({ ok: true });
    expect(items.markDismissed).toHaveBeenCalledWith("item-1");
    expect(senders.recordDismissal).toHaveBeenCalledWith(USER, "alerts@shop.pe");
    expect(senders.block).not.toHaveBeenCalled();
  });

  it("bloquea al remitente aprendido tras varios descartes sin aceptaciones", async () => {
    const senders = fakeSenderRepository({ recordDismissal: vi.fn().mockResolvedValue(sender({ dismissedCount: 3 })) });

    await new DismissInboxItemUseCase(fakeItemRepository(), senders).execute(USER, "item-1");

    expect(senders.block).toHaveBeenCalledWith("sender-1");
  });

  it("no bloquea a un remitente agregado a mano", async () => {
    const manual = sender({ origin: "manual", dismissedCount: 5 });
    const senders = fakeSenderRepository({ recordDismissal: vi.fn().mockResolvedValue(manual) });

    await new DismissInboxItemUseCase(fakeItemRepository(), senders).execute(USER, "item-1");

    expect(senders.block).not.toHaveBeenCalled();
  });
});
