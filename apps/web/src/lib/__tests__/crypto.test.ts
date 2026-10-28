import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "../crypto";

afterEach(() => vi.unstubAllEnvs());

describe("crypto", () => {
  it("round-trips a secret with a random iv", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "test-key");
    const first = encryptSecret("1//refresh-token");
    expect(first).not.toContain("refresh-token");
    expect(encryptSecret("1//refresh-token")).not.toBe(first);
    expect(decryptSecret(first)).toBe("1//refresh-token");
  });

  it("rejects a tampered or foreign secret", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "test-key");
    const sealed = encryptSecret("secret");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "other-key");
    expect(() => decryptSecret(sealed)).toThrow();
    expect(() => decryptSecret("plain")).toThrow();
  });

  it("is unavailable without a key", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret("x")).toThrow();
  });
});
