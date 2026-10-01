import { describe, expect, it } from "vitest";
import { readReceiptText } from "../receipt-text";

const categories = [
  { id: "market", name: "Supermercado" },
  { id: "transport", name: "Transporte" },
  { id: "food", name: "Comida" },
];

function read(text: string) {
  return readReceiptText(text, categories, "es");
}

const YAPE_SENT = `
¡Yapeaste!
S/ 25
Juan Carlos Pérez R.
29 set. 2026 - 08:14 p. m.
Nro. de celular: *** *** 432
Destino: Yape
Nro. de operación: 04561239
`;

const YAPE_RECEIVED = `
Te yapeó
S/ 150.50
Maria Lopez
02 sep. 2026 10:20 a. m.
`;

const PLIN_SENT = `
Plin
Pagaste S/ 12.50
Bodega Don Lucho
30/09/2026 13:05
`;

const BOLETA = `
HIPERMERCADOS TOTTUS S.A.
RUC 20508565934
AV. ANGAMOS ESTE 1805 - SURQUILLO
BOLETA DE VENTA ELECTRONICA
B105-00482211
FECHA: 27/09/2026 HORA: 18:22
LECHE GLORIA X6 27.90
ARROZ COSTEÑO 5KG 24.50
OP. GRAVADA S/ 63.47
IGV 18% S/ 11.43
TOTAL S/ 74.90
EFECTIVO S/ 100.00
VUELTO S/ 25.10
`;

const POS_VOUCHER = `
NIUBIZ
TAXI SEGURO SAC
VENTA
VISA ************4521
28/09/26 21:40
IMPORTE: S/ 1,250.00
`;

describe("readReceiptText", () => {
  it("reads a sent Yape screenshot", () => {
    const { extraction, isConfident } = read(YAPE_SENT);
    expect(isConfident).toBe(true);
    expect(extraction).toMatchObject({
      isReceipt: true,
      amount: 25,
      currency: "PEN",
      date: "2026-09-29",
      type: "expense",
      description: "Yape a Juan Carlos Pérez R.",
      summary: "Yape a Juan Carlos Pérez R.",
    });
  });

  it("reads a received Yape as income", () => {
    expect(read(YAPE_RECEIVED).extraction).toMatchObject({
      amount: 150.5,
      type: "income",
      date: "2026-09-02",
      description: "Yape de Maria Lopez",
    });
  });

  it("reads a Plin payment", () => {
    expect(read(PLIN_SENT).extraction).toMatchObject({
      amount: 12.5,
      type: "expense",
      date: "2026-09-30",
      description: "Plin a Bodega Don Lucho",
    });
  });

  it("takes the TOTAL of a boleta, not the taxable base, cash or change", () => {
    const { extraction, isConfident } = read(BOLETA);
    expect(isConfident).toBe(true);
    expect(extraction).toMatchObject({
      amount: 74.9,
      date: "2026-09-27",
      type: "expense",
      description: "Hipermercados Tottus",
      summary: "Boleta · Hipermercados Tottus",
      categoryId: "market",
    });
  });

  it("reads IMPORTE on a card voucher and skips the payment processor name", () => {
    const { extraction, isConfident } = read(POS_VOUCHER);
    expect(isConfident).toBe(true);
    expect(extraction).toMatchObject({
      amount: 1250,
      date: "2026-09-28",
      description: "Taxi Seguro",
      categoryId: "transport",
    });
  });

  it("matches a category from the merchant name", () => {
    expect(read("SUPERMERCADO LA CANASTA\nTOTAL S/ 30.00").extraction.categoryId).toBe("market");
  });

  it("detects dollars", () => {
    expect(read("STARBUCKS\nTOTAL US$ 8.50").extraction).toMatchObject({ amount: 8.5, currency: "USD" });
  });

  it("reads a misread S/ (5/) as soles", () => {
    expect(read("¡Yapeaste!\n5/ 40\nCarlos").extraction).toMatchObject({ amount: 40, currency: "PEN" });
  });

  it("is not confident when no total or payment app is found", () => {
    const { extraction, isConfident } = read("MINIMARKET ROSITA\nGASEOSA S/ 3.50\nGALLETAS S/ 2.00");
    expect(isConfident).toBe(false);
    expect(extraction.amount).toBe(3.5);
  });

  it("ignores times, dates, phone numbers and document numbers as amounts", () => {
    expect(read("BOLETA B001-00012345\n12/09/2026 08:14\nTelf 987654321").extraction.amount).toBeNull();
  });

  it("does not treat random text as a receipt", () => {
    const { extraction, isConfident } = read("hola gatito");
    expect(isConfident).toBe(false);
    expect(extraction.isReceipt).toBe(false);
    expect(extraction.amount).toBeNull();
  });
});
