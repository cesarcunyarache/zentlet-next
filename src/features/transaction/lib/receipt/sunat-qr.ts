export interface SunatQr {
  ruc: string;
  documentType: string;
  series: string;
  number: string;
  total: number;
  date: string | null;
}

const RUC = /^\d{11}$/;
const DOCUMENT_TYPE = /^\d{2}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MIN_FIELDS = 7;

export const SUNAT_DOCUMENT_LABELS: Record<string, string> = {
  "01": "Factura",
  "03": "Boleta",
  "07": "Nota de crédito",
  "08": "Nota de débito",
  "12": "Ticket",
};

function toIsoDate(value: string) {
  const iso = ISO_DATE.exec(value);
  if (iso) return value;
  const local = LOCAL_DATE.exec(value);
  return local ? `${local[3]}-${local[2]}-${local[1]}` : null;
}

export function parseSunatQr(raw: string | null): SunatQr | null {
  if (!raw) return null;
  const fields = raw.split("|").map((field) => field.trim());
  if (fields.length < MIN_FIELDS) return null;

  const [ruc, documentType, series, number, , totalText, dateText] = fields;
  const total = Number(totalText.replace(",", "."));
  if (!RUC.test(ruc) || !DOCUMENT_TYPE.test(documentType) || !Number.isFinite(total) || total <= 0) return null;

  return { ruc, documentType, series, number, total, date: toIsoDate(dateText) };
}

export function sunatSummary(qr: SunatQr) {
  const label = SUNAT_DOCUMENT_LABELS[qr.documentType] ?? "Comprobante";
  return `${label} ${qr.series}-${qr.number}`;
}
