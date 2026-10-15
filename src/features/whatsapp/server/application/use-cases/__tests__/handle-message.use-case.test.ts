import { describe, expect, it, vi } from "vitest";
import { movementId } from "../../../../lib/movement-id";
import type { IncomingMessage, Movement } from "../../../../types";
import type { Ledger, MessageInterpreter, Throttle } from "../../../domain/ports/whatsapp.ports";
import { HandleMessageUseCase } from "../handle-message.use-case";
import {
  allowAll,
  echoTexts,
  fakeInterpreter,
  fakeLedger,
  fakeLinks,
  fakeMessenger,
  PHONE,
  TODAY,
  understood,
  USER,
} from "./fakes";

let counter = 0;
const text = (body: string): IncomingMessage => ({ id: `wamid.${++counter}`, from: PHONE, kind: "text", text: body });
const choice = (choiceId: string): IncomingMessage => ({ id: `wamid.${++counter}`, from: PHONE, kind: "choice", choiceId });

const movement = (fields: Partial<Movement>): Movement => ({
  type: null,
  amount: null,
  categoryId: null,
  description: null,
  date: null,
  ...fields,
});

function setup(
  options: {
    linked?: boolean;
    codeUserId?: string | null;
    interpreter?: MessageInterpreter;
    ledger?: Ledger;
    throttle?: Throttle;
  } = {},
) {
  const links = fakeLinks({ linked: options.linked, codeUserId: options.codeUserId });
  const { messenger, sent } = fakeMessenger();
  const ledger = options.ledger ?? fakeLedger();
  const interpreter = options.interpreter ?? fakeInterpreter();
  const useCase = new HandleMessageUseCase({
    links: links.repository,
    messenger,
    ledger,
    interpreter,
    throttle: options.throttle ?? allowAll,
    texts: echoTexts,
    appUrl: "https://zentlet.app/admin",
  });
  return { useCase, links, sent, ledger, interpreter, messenger };
}

describe("HandleMessageUseCase · vinculación", () => {
  it("un número desconocido recibe el enlace a la app y nada más", async () => {
    const { useCase, sent, interpreter } = setup({ linked: false });

    expect(await useCase.execute(text("almuerzo 25"))).toBe("stranger");
    expect(sent).toEqual([{ kind: "text", text: 'notLinked {"url":"https://zentlet.app/admin"}' }]);
    expect(interpreter.interpret).not.toHaveBeenCalled();
  });

  it("un código válido vincula el número y saluda por su nombre", async () => {
    const { useCase, links, sent } = setup({ linked: false, codeUserId: USER });

    expect(await useCase.execute(text("vincular K7P2-9QXM"))).toBe("linked");
    expect(links.repository.link).toHaveBeenCalledWith(USER, PHONE);
    expect(sent).toEqual([{ kind: "text", text: 'linked {"name":"Ana"}' }]);
  });

  it("un código inválido no vincula nada", async () => {
    const { useCase, links, sent } = setup({ linked: false, codeUserId: null });

    await useCase.execute(text("vincular AAAA-BBBB"));
    expect(links.repository.link).not.toHaveBeenCalled();
    expect(sent).toEqual([{ kind: "text", text: "linkInvalid" }]);
  });

  it("limita los intentos de código por número", async () => {
    const throttle: Throttle = { allow: vi.fn(async (key: string) => !key.startsWith("whatsapp-link:")) };
    const { useCase, links, sent } = setup({ linked: false, codeUserId: USER, throttle });

    await useCase.execute(text("vincular K7P2-9QXM"));
    expect(links.repository.consumeLinkCode).not.toHaveBeenCalled();
    expect(sent).toEqual([{ kind: "text", text: "linkLimited" }]);
  });

  it("desvincular borra el vínculo y no guarda conversación", async () => {
    const { useCase, links, sent } = setup();

    await useCase.execute(text("desvincular"));
    expect(links.repository.unlinkUser).toHaveBeenCalledWith(USER);
    expect(links.repository.saveConversation).not.toHaveBeenCalled();
    expect(sent).toEqual([{ kind: "text", text: "unlinked" }]);
  });
});

describe("HandleMessageUseCase · registro", () => {
  it("ignora un mensaje repetido por Meta", async () => {
    const interpreter = fakeInterpreter(
      understood({ movements: [movement({ type: "expense", amount: 25, categoryId: "food", description: "Almuerzo" })] }),
    );
    const { useCase, ledger } = setup({ interpreter });
    const message = text("almuerzo 25");

    expect(await useCase.execute(message)).toBe("handled");
    expect(await useCase.execute(message)).toBe("duplicate");
    expect(ledger.record).toHaveBeenCalledTimes(1);
  });

  it("registra un movimiento completo con un id estable y ofrece deshacer", async () => {
    const interpreter = fakeInterpreter(
      understood({ movements: [movement({ type: "expense", amount: 25, categoryId: "food", description: "Almuerzo" })] }),
    );
    const { useCase, ledger, sent } = setup({ interpreter });
    const message = text("almuerzo 25");

    await useCase.execute(message);

    const id = movementId(message.id, 0);
    expect(ledger.record).toHaveBeenCalledWith(USER, id, {
      type: "expense",
      amount: 25,
      categoryId: "food",
      description: "Almuerzo",
      date: TODAY,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ kind: "buttons", buttons: [{ id: `undo:${id}`, title: "undoButton" }] });
  });

  it("pregunta el monto y luego la categoría, y registra con la respuesta del botón", async () => {
    const interpreter = fakeInterpreter(understood({ movements: [movement({ type: "expense", description: "Taxi" })] }));
    const { useCase, ledger, sent, links } = setup({ interpreter });

    await useCase.execute(text("gasté en taxi"));
    expect(sent.at(-1)).toMatchObject({ kind: "buttons", text: 'askAmount {"description":"Taxi"}' });
    expect(links.state.conversation?.drafts).toHaveLength(1);

    await useCase.execute(text("18"));
    expect(interpreter.interpret).toHaveBeenCalledTimes(1);
    expect(sent.at(-1)).toMatchObject({
      kind: "list",
      rows: [
        { id: "cat:food", title: "Comida" },
        { id: "cat:transport", title: "Transporte" },
      ],
    });

    const pick = choice("cat:transport");
    await useCase.execute(pick);
    expect(ledger.record).toHaveBeenCalledWith(USER, movementId(pick.id, 0), {
      type: "expense",
      amount: 18,
      categoryId: "transport",
      description: "Taxi",
      date: TODAY,
    });
    expect(links.state.conversation?.drafts).toEqual([]);
    expect(links.state.conversation?.lastRecorded).toEqual([movementId(pick.id, 0)]);
  });

  it("registra los completos de un mensaje con varios y pregunta por el resto", async () => {
    const interpreter = fakeInterpreter(
      understood({
        movements: [
          movement({ type: "expense", amount: 45, categoryId: "food", description: "Mercado" }),
          movement({ type: "income", amount: 1200, description: "Sueldo" }),
        ],
      }),
    );
    const { useCase, ledger, sent } = setup({ interpreter });

    await useCase.execute(text("45 mercado y me pagaron 1200"));
    expect(ledger.record).toHaveBeenCalledTimes(1);
    expect(sent.map((reply) => reply.kind)).toEqual(["buttons", "list"]);
  });

  it("descarta ids de categoría inventados por la IA y pregunta la categoría", async () => {
    const interpreter = fakeInterpreter(
      understood({ movements: [movement({ type: "expense", amount: 30, categoryId: "no-existe", description: "Regalo" })] }),
    );
    const { useCase, ledger, sent } = setup({ interpreter });

    await useCase.execute(text("regalo 30"));
    expect(ledger.record).not.toHaveBeenCalled();
    expect(sent[0]).toMatchObject({ kind: "list" });
  });

  it("sin IA disponible usa el parser local", async () => {
    const { useCase, ledger } = setup({ interpreter: fakeInterpreter() });

    await useCase.execute(text("comida 25"));
    expect(ledger.record).toHaveBeenCalledWith(USER, expect.any(String), expect.objectContaining({ amount: 25, categoryId: "food" }));
  });

  it("sin IA y sin monto responde que no entendió", async () => {
    const { useCase, sent, ledger } = setup({ interpreter: fakeInterpreter() });

    await useCase.execute(text("hola qué tal"));
    expect(ledger.record).not.toHaveBeenCalled();
    expect(sent).toEqual([{ kind: "text", text: "notUnderstood" }]);
  });

  it("con el cupo de IA agotado pide esperar", async () => {
    const { useCase, sent } = setup({ interpreter: fakeInterpreter({ ok: false, error: "limited" }) });

    await useCase.execute(text("almuerzo 25"));
    expect(sent).toEqual([{ kind: "text", text: "busy" }]);
  });

  it("si falla el registro avisa al usuario y propaga el error", async () => {
    const interpreter = fakeInterpreter(
      understood({ movements: [movement({ type: "expense", amount: 25, categoryId: "food", description: "Almuerzo" })] }),
    );
    const ledger = fakeLedger({ record: vi.fn().mockRejectedValue(new Error("db down")) });
    const { useCase, sent } = setup({ interpreter, ledger });

    await expect(useCase.execute(text("almuerzo 25"))).rejects.toThrow("db down");
    expect(sent).toEqual([{ kind: "text", text: "failed" }]);
  });
});

describe("HandleMessageUseCase · deshacer, cancelar y consultas", () => {
  it("el botón deshacer borra exactamente esos movimientos", async () => {
    const { useCase, ledger, sent } = setup();

    await useCase.execute(choice("undo:a,b"));
    expect(ledger.remove).toHaveBeenCalledWith(USER, ["a", "b"]);
    expect(sent).toEqual([{ kind: "text", text: 'undone {"count":2}' }]);
  });

  it("«deshacer» sin nada reciente lo dice", async () => {
    const { useCase, ledger, sent } = setup();

    await useCase.execute(text("deshacer"));
    expect(ledger.remove).not.toHaveBeenCalled();
    expect(sent).toEqual([{ kind: "text", text: "nothingToUndo" }]);
  });

  it("cancelar descarta el borrador pendiente", async () => {
    const interpreter = fakeInterpreter(understood({ movements: [movement({ description: "Taxi" })] }));
    const { useCase, links, sent } = setup({ interpreter });

    await useCase.execute(text("taxi"));
    await useCase.execute(choice("cancel"));
    expect(links.state.conversation?.drafts).toEqual([]);
    expect(sent.at(-1)).toEqual({ kind: "text", text: "cancelled" });
  });

  it("el resumen usa el mes en curso si la IA no da un periodo válido", async () => {
    const interpreter = fakeInterpreter(understood({ intent: "summary", period: { from: "ayer", to: undefined } }));
    const { useCase, ledger, sent } = setup({ interpreter });

    await useCase.execute(text("cuánto gasté?"));
    expect(ledger.summarize).toHaveBeenCalledWith(USER, { from: "2026-10-01", to: TODAY });
    expect(sent[0].kind).toBe("text");
    expect(sent[0].text).toContain("summaryTop");
  });

  it("la charla libre se recorta y no registra nada", async () => {
    const interpreter = fakeInterpreter(understood({ intent: "chat", reply: "x".repeat(900) }));
    const { useCase, ledger, sent } = setup({ interpreter });

    await useCase.execute(text("hola!"));
    expect(ledger.record).not.toHaveBeenCalled();
    expect(sent[0].text).toHaveLength(500);
  });
});
