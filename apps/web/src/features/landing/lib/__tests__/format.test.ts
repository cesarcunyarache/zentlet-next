import { describe, expect, it } from "vitest";
import {
  amountSign,
  fillTemplate,
  formatAmount,
  formatSigned,
  sectionHref,
  sectionTitleId,
  vivid,
} from "../format";

describe("formatAmount", () => {
  it("usa dos decimales y el separador del idioma", () => {
    expect(formatAmount(3000, "es-PE")).toBe("3,000.00");
    expect(formatAmount(12.5, "en-US")).toBe("12.50");
    expect(formatAmount(1185.7, "de-DE")).toBe("1.185,70");
  });

  it("descarta el signo", () => {
    expect(formatAmount(-84.3, "en-US")).toBe("84.30");
  });
});

describe("formatSigned", () => {
  it("antepone el signo según el tipo", () => {
    expect(formatSigned(12.5, "expense", "S/", "en-US")).toBe("− S/ 12.50");
    expect(formatSigned(3000, "income", "S/", "en-US")).toBe("+ S/ 3,000.00");
  });
});

describe("vivid", () => {
  it("devuelve la versión intensa en color relativo oklch", () => {
    expect(vivid("oklch(0.92 0.05 230)")).toBe("oklch(from oklch(0.92 0.05 230) calc(l - 0.22) calc(c * 2.4) h)");
  });
});

describe("sectionHref", () => {
  it("devuelve el ancla de la sección", () => {
    expect(sectionHref("como-funciona")).toBe("#como-funciona");
  });
});

describe("amountSign", () => {
  it("usa el signo menos tipográfico para gastos", () => {
    expect(amountSign("expense")).toBe("−");
    expect(amountSign("income")).toBe("+");
  });
});

describe("sectionTitleId", () => {
  it("devuelve el id del título de la sección", () => {
    expect(sectionTitleId("preguntas")).toBe("preguntas-title");
  });
});

describe("fillTemplate", () => {
  it("reemplaza los marcadores conocidos y deja los desconocidos", () => {
    expect(fillTemplate("Prueba {days} días por {price}", { days: 15, price: "S/ 14.90" })).toBe(
      "Prueba 15 días por S/ 14.90",
    );
    expect(fillTemplate("Hola {name}", {})).toBe("Hola {name}");
  });

  it("ignora claves heredadas del prototipo", () => {
    expect(fillTemplate("{constructor} {toString}", {})).toBe("{constructor} {toString}");
  });
});
