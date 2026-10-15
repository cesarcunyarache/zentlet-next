import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { listErrorKey } from "../errors";

const withStatus = (status: number) =>
  new AxiosError("fail", "ERR", undefined, undefined, {
    status,
    statusText: "",
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("listErrorKey", () => {
  it("traduce el código HTTP al mensaje que ve el usuario", () => {
    expect(listErrorKey(withStatus(409))).toBe("currencyMismatch");
    expect(listErrorKey(withStatus(403))).toBe("forbidden");
    expect(listErrorKey(withStatus(410))).toBe("inviteInvalid");
    expect(listErrorKey(withStatus(429))).toBe("tooMany");
    expect(listErrorKey(withStatus(502))).toBe("emailFailed");
    expect(listErrorKey(withStatus(500))).toBe("generic");
    expect(listErrorKey(new Error("offline"))).toBe("generic");
  });
});
