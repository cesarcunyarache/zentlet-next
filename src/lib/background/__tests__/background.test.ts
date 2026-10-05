import { describe, expect, it, vi } from "vitest";
import { runInBackground } from "..";

describe("runInBackground", () => {
  it("fuera de una petición ejecuta la tarea en el acto", async () => {
    const task = vi.fn().mockResolvedValue(undefined);
    runInBackground(task);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
