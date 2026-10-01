import { describe, expect, it } from "vitest";
import { sentryOptions } from "./sentry";

describe("sentryOptions", () => {
  it("añade la integración de feature flags a las de por defecto", () => {
    const { integrations } = sentryOptions("https://key@example.ingest.sentry.io/1");
    if (typeof integrations !== "function") throw new Error("integrations must be a function");

    const names = integrations([{ name: "Default" }]).map(({ name }) => name);

    expect(names).toEqual(["Default", "FeatureFlags"]);
  });
});
