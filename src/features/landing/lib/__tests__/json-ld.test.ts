import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "../json-ld";

describe("serializeJsonLd", () => {
  it("escapa `<` para que no cierre el <script>", () => {
    expect(serializeJsonLd({ text: "</script><b>" })).toBe('{"text":"\\u003c/script>\\u003cb>"}');
  });
});
