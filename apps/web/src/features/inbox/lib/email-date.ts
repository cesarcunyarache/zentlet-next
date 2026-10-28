const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const NAMED = /(\d{1,2})\s+(?:de\s+)?([a-zA-ZáéíóúÁÉÍÓÚ]{3})[a-zA-ZáéíóúÁÉÍÓÚ]*\.?\s+(?:de\s+|del\s+)?(\d{4})/;
const NUMERIC = /(?<!\d)(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?!\d)/;
const ISO = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/;

function toIso(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function findEmailDate(text: string) {
  const named = NAMED.exec(text);
  const month = named && MONTHS[named[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")];
  if (named && month) return toIso(Number(named[3]), month, Number(named[1]));
  const numeric = NUMERIC.exec(text);
  if (numeric) return toIso(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
  const iso = ISO.exec(text);
  return iso ? toIso(Number(iso[1]), Number(iso[2]), Number(iso[3])) : null;
}
