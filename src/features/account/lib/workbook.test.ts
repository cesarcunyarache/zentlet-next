import { describe, expect, it } from "vitest";
import writeXlsxFile from "write-excel-file/node";
import es from "@/locales/es/settings.json";
import { buildWorkbook, type ExportCategory, type ExportTransaction } from "./workbook";

const transactions: ExportTransaction[] = [
  {
    transactionDate: new Date("2026-09-20T00:00:00.000Z"),
    type: "expense",
    amount: { toString: () => "1234.5" },
    description: "=HYPERLINK(\"http://evil\")",
    reference: null,
    category: { name: "Salud" },
  },
  {
    transactionDate: new Date("2026-09-01T00:00:00.000Z"),
    type: "income",
    amount: { toString: () => "3000" },
    description: null,
    reference: "Planilla",
    category: { name: "Sueldo" },
  },
];

const categories: ExportCategory[] = [
  {
    name: "Salud",
    icon: "💊",
    color: "#D5F0DD",
    description: null,
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    _count: { transactions: 1 },
  },
];

const [txSheet, categorySheet] = buildWorkbook({ transactions, categories }, es.export, "dd/mm/yyyy");

type CellLike = { value?: unknown; type?: unknown; format?: string } | null;
const cell = (row: unknown[], column: number) => row[column] as CellLike;

describe("buildWorkbook", () => {
  it("crea una hoja de movimientos y otra de categorías con sus nombres traducidos", () => {
    expect(txSheet.sheet).toBe("Movimientos");
    expect(categorySheet.sheet).toBe("Categorías");
    expect(txSheet.stickyRowsCount).toBe(1);
  });

  it("la primera fila son las cabeceras en negrita", () => {
    expect(txSheet.data[0].map((header) => (header as CellLike)?.value)).toEqual([
      "Fecha",
      "Tipo",
      "Categoría",
      "Descripción",
      "Monto",
      "Referencia",
    ]);
    expect(txSheet.data[0][0]).toMatchObject({ fontWeight: "bold" });
  });

  it("fechas y montos van como valores nativos de Excel (se pueden sumar y ordenar)", () => {
    const [, first] = txSheet.data;
    expect(cell(first, 0)).toMatchObject({ value: new Date("2026-09-20T00:00:00.000Z"), type: Date, format: "dd/mm/yyyy" });
    expect(cell(first, 4)).toMatchObject({ value: 1234.5, type: Number, format: "#,##0.00" });
  });

  it("traduce el tipo y deja vacío lo que no existe", () => {
    const [, first, second] = txSheet.data;
    expect(cell(first, 1)?.value).toBe("Gasto");
    expect(cell(second, 1)?.value).toBe("Ingreso");
    expect(cell(second, 3)?.value).toBe("");
    expect(cell(second, 5)?.value).toBe("Planilla");
  });

  it("un texto que parece fórmula se exporta como texto, no como fórmula", () => {
    const description = cell(txSheet.data[1], 3);
    expect(description?.value).toBe("=HYPERLINK(\"http://evil\")");
    expect(description?.type).toBeUndefined(); // sin `type: "Formula"` la librería escribe una cadena
  });

  it("las categorías incluyen su número de movimientos", () => {
    expect(categorySheet.data[1].map((c) => (c as CellLike)?.value)).toEqual([
      "Salud",
      "💊",
      "#D5F0DD",
      "",
      1,
      new Date("2026-07-01T10:00:00.000Z"),
    ]);
  });

  it("genera un .xlsx válido (zip) aunque no haya datos", async () => {
    const empty = buildWorkbook({ transactions: [], categories: [] }, es.export, "dd/mm/yyyy");
    const file = await writeXlsxFile(empty).toBuffer();
    expect(file.subarray(0, 2).toString()).toBe("PK");
    expect(empty[0].data).toHaveLength(1); // sólo cabeceras
  });
});
