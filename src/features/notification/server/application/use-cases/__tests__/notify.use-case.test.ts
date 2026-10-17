import { describe, expect, it, vi } from "vitest";
import { DeliverNotificationUseCase } from "../deliver-notification.use-case";
import { GetNotificationFeedUseCase } from "../get-notification-feed.use-case";
import { NotifyUseCase } from "../notify.use-case";
import { fakeNotifications, input } from "./fake-notification";

function setup() {
  const fakes = fakeNotifications();
  const deliver = new DeliverNotificationUseCase(fakes.deliveries, fakes.sender, fakes.monitor);
  const execute = vi.spyOn(deliver, "execute").mockResolvedValue(undefined);
  const notify = new NotifyUseCase(fakes.notifications, fakes.flags, deliver, fakes.monitor);
  return { ...fakes, notify, execute };
}

describe("NotifyUseCase", () => {
  it("crea la notificación con un envío por canal activo y los entrega", async () => {
    const { notify, notifications, monitor, execute } = setup();

    await notify.execute(input);

    expect(notifications.createWithDeliveries).toHaveBeenCalledWith(input, ["email"]);
    expect(monitor.created).toHaveBeenCalledWith("budget.exceeded", ["email"]);
    expect(execute).toHaveBeenCalledWith("delivery-1");
  });

  it("con el flag del canal apagado queda sólo la notificación en la app", async () => {
    const { notify, notifications, flags, execute } = setup();
    vi.mocked(flags.isEnabled).mockResolvedValue(false);

    await notify.execute(input);

    expect(notifications.createWithDeliveries).toHaveBeenCalledWith(input, []);
    expect(execute).not.toHaveBeenCalled();
  });

  it("una clave repetida no notifica dos veces", async () => {
    const { notify, notifications, monitor, execute } = setup();
    vi.mocked(notifications.createWithDeliveries).mockResolvedValue("duplicate");

    await notify.execute(input);

    expect(monitor.created).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("GetNotificationFeedUseCase", () => {
  it("devuelve las últimas 50 y cuántas faltan por leer", async () => {
    const { notifications } = fakeNotifications();
    vi.mocked(notifications.countUnread).mockResolvedValue(3);

    expect(await new GetNotificationFeedUseCase(notifications).execute("user-1")).toEqual({ items: [], unreadCount: 3 });
    expect(notifications.findLatest).toHaveBeenCalledWith("user-1", 50);
  });
});
