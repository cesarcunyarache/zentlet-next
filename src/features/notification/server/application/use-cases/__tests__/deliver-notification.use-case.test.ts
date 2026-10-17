import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_ATTEMPTS } from "../../../../lib/retry";
import { DeliverNotificationUseCase } from "../deliver-notification.use-case";
import { DeliverPendingUseCase } from "../deliver-pending.use-case";
import { claimed, fakeNotifications } from "./fake-notification";

const NOW = new Date("2026-09-30T12:00:00.000Z");

beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ["Date"] }));
afterEach(() => vi.useRealTimers());

function setup() {
  const fakes = fakeNotifications();
  const deliver = new DeliverNotificationUseCase(fakes.deliveries, fakes.sender, fakes.monitor);
  return { ...fakes, deliver };
}

describe("DeliverNotificationUseCase", () => {
  it("reclama el envío con una reserva de 10 minutos y lo marca como enviado", async () => {
    const { deliver, deliveries, sender } = setup();

    await deliver.execute("delivery-1");

    expect(deliveries.claim).toHaveBeenCalledWith("delivery-1", NOW, new Date("2026-09-30T12:10:00.000Z"));
    expect(sender.send).toHaveBeenCalledWith("email", claimed(1).notification, claimed(1).recipient);
    expect(deliveries.saveOutcome).toHaveBeenCalledWith("delivery-1", { status: "sent", sentAt: NOW });
  });

  it("si otro proceso ya lo reclamó no envía nada", async () => {
    const { deliver, deliveries, sender } = setup();
    vi.mocked(deliveries.claim).mockResolvedValue(null);

    await deliver.execute("delivery-1");

    expect(sender.send).not.toHaveBeenCalled();
    expect(deliveries.saveOutcome).not.toHaveBeenCalled();
  });

  it("si el canal falla, lo reporta y programa un reintento", async () => {
    const { deliver, deliveries, sender, monitor } = setup();
    vi.mocked(sender.send).mockRejectedValue(new Error("smtp down"));

    await deliver.execute("delivery-1");

    expect(monitor.sendFailed).toHaveBeenCalledWith(expect.any(Error), "email");
    expect(deliveries.saveOutcome).toHaveBeenCalledWith("delivery-1", { nextAttemptAt: new Date("2026-09-30T12:05:00.000Z") });
    expect(monitor.deliveryFailed).toHaveBeenCalledWith("delivery-1", "email", 1);
  });

  it("un canal que ya no existe cuenta como fallo sin intentar enviar", async () => {
    const { deliver, deliveries, sender } = setup();
    vi.mocked(deliveries.claim).mockResolvedValue(claimed(1, "sms"));

    await deliver.execute("delivery-1");

    expect(sender.send).not.toHaveBeenCalled();
    expect(deliveries.saveOutcome).toHaveBeenCalledWith("delivery-1", expect.objectContaining({ nextAttemptAt: expect.any(Date) }));
  });

  it("en el último intento se rinde", async () => {
    const { deliver, deliveries, sender } = setup();
    vi.mocked(deliveries.claim).mockResolvedValue(claimed(MAX_ATTEMPTS));
    vi.mocked(sender.send).mockResolvedValue(false);

    await deliver.execute("delivery-1");

    expect(deliveries.saveOutcome).toHaveBeenCalledWith("delivery-1", { status: "failed" });
  });
});

describe("DeliverPendingUseCase", () => {
  it("entrega uno por uno los envíos vencidos y cuenta cuántos procesó", async () => {
    const { deliver, deliveries } = setup();
    vi.mocked(deliveries.findDueIds).mockResolvedValue(["d1", "d2"]);
    const execute = vi.spyOn(deliver, "execute");

    expect(await new DeliverPendingUseCase(deliveries, deliver).execute()).toEqual({ processed: 2 });
    expect(deliveries.findDueIds).toHaveBeenCalledWith(NOW, 50);
    expect(execute.mock.calls).toEqual([["d1"], ["d2"]]);
  });
});
