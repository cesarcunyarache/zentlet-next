import { describe, expect, it } from "vitest";
import { readPushEmailAddress } from "../gmail-push";

const envelope = (data: unknown) => ({ message: { data } });
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64");

describe("readPushEmailAddress", () => {
  it("reads the lowercased address from a Pub/Sub notification", () => {
    expect(readPushEmailAddress(envelope(encode({ emailAddress: "Cesar@Gmail.com", historyId: 1 })))).toBe("cesar@gmail.com");
  });

  it("rejects malformed notifications", () => {
    expect(readPushEmailAddress(null)).toBeNull();
    expect(readPushEmailAddress(envelope(42))).toBeNull();
    expect(readPushEmailAddress(envelope("not-json"))).toBeNull();
    expect(readPushEmailAddress(envelope(encode({ historyId: 1 })))).toBeNull();
  });
});
