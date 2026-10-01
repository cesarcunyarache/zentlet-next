import { describe, expect, it } from "vitest";
import { parseSunatQr, sunatSummary } from "./sunat-qr";

const BOLETA_QR = "20508565934|03|B105|00482211|11.43|74.90|2026-09-27|1|45678912|";

describe("parseSunatQr", () => {
  it("reads total, date and document from a boleta QR", () => {
    expect(parseSunatQr(BOLETA_QR)).toEqual({
      ruc: "20508565934",
      documentType: "03",
      series: "B105",
      number: "00482211",
      total: 74.9,
      date: "2026-09-27",
    });
  });

  it("accepts dd/mm/yyyy dates", () => {
    expect(parseSunatQr("20100070970|01|F001|123|18.00|118.00|27/09/2026|6|20123456789")?.date).toBe("2026-09-27");
  });

  it("keeps the total when the date is unreadable", () => {
    expect(parseSunatQr("20100070970|01|F001|123|18.00|118.00|ayer")).toMatchObject({ total: 118, date: null });
  });

  it.each([
    ["a URL", "https://zentlet.app"],
    ["too few fields", "20508565934|03|B105"],
    ["a bad RUC", "2050856|03|B105|1|0|10.00|2026-09-27"],
    ["a zero total", "20508565934|03|B105|1|0|0.00|2026-09-27"],
    ["nothing", null],
  ])("rejects %s", (_, raw) => {
    expect(parseSunatQr(raw)).toBeNull();
  });
});

describe("sunatSummary", () => {
  it("labels known document types", () => {
    expect(sunatSummary(parseSunatQr(BOLETA_QR)!)).toBe("Boleta B105-00482211");
  });
});
