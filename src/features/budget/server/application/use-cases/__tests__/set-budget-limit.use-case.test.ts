import { describe, expect, it, vi } from "vitest";
import type { BudgetSchedule } from "../../../domain/entities/budget.entity";
import { SetBudgetLimitUseCase } from "../set-budget-limit.use-case";
import { budget, fakeMonitor, fakeRepository } from "./fake-budget.repository";

const monthly: BudgetSchedule = { startDate: new Date("2026-09-01"), kind: "recurring", periodUnit: "month", periodCount: 1 };

const withSchedule = (schedule: BudgetSchedule | null = monthly) =>
  fakeRepository({
    findSchedule: vi.fn().mockResolvedValue(schedule),
    findById: vi.fn().mockResolvedValue(budget),
  });

describe("SetBudgetLimitUseCase", () => {
  it("fija el tope desde ese periodo y vuelve a revisar el presupuesto", async () => {
    const repository = withSchedule();
    const monitor = fakeMonitor();

    const result = await new SetBudgetLimitUseCase(repository, monitor).execute("user-1", "b1", "2026-10-01", {
      amount: 800,
    });

    expect(result).toEqual({ budget });
    expect(repository.setLimit).toHaveBeenCalledWith("b1", new Date("2026-10-01"), 800);
    expect(monitor.scheduleCheck).toHaveBeenCalledWith("user-1", "food");
  });

  it.each([
    ["sin presupuesto", null, "2026-10-01", "not_found"],
    ["fecha a mitad de periodo", monthly, "2026-10-15", "invalid_period_start"],
    ["antes del inicio", monthly, "2026-08-01", "limit_before_start"],
    ["otro periodo de uno de una sola vez", { ...monthly, kind: "once" as const }, "2026-10-01", "single_period"],
  ])("%s es %s", async (_case, schedule, effectiveFrom, error) => {
    const repository = withSchedule(schedule);

    expect(
      await new SetBudgetLimitUseCase(repository, fakeMonitor()).execute("user-1", "b1", effectiveFrom, { amount: 800 }),
    ).toEqual({ error });
    expect(repository.setLimit).not.toHaveBeenCalled();
  });

  it("si el presupuesto desaparece al guardar es not_found y no revisa", async () => {
    const repository = fakeRepository({
      findSchedule: vi.fn().mockResolvedValue(monthly),
      setLimit: vi.fn().mockResolvedValue("not_found"),
    });
    const monitor = fakeMonitor();

    expect(
      await new SetBudgetLimitUseCase(repository, monitor).execute("user-1", "b1", "2026-10-01", { amount: 800 }),
    ).toEqual({ error: "not_found" });
    expect(monitor.scheduleCheck).not.toHaveBeenCalled();
  });
});
