import type { CategoryLike, TransactionType } from "../types";
import { DAYS, MONTHS, dayShift, today, toISODate } from "./format";
import { inferType, matchCategory, normalize } from "./parse-description";

/*
 * Interpretación determinística de un dictado, sin red:
 * "ayer gasté 35 soles en almuerzo" → gasto de 35, ayer, "Almuerzo".
 * La moneda que se nombre se reconoce y se descarta: la app no guarda
 * moneda, sólo muestra el símbolo elegido en Ajustes.
 */

export interface VoiceDraft {
  type: TransactionType;
  amount: number | null;
  description: string;
  categoryId: string | null;
  transactionDate: string;
}

const CURRENCY = String.raw`(?:soles?|s\/\.?|d[oó]lares?|usd|euros?|pesos?|lucas?)`;
const MULTIPLIER = String.raw`(?:mil|k|millones?|mill[oó]n)`;

const NUMBER_WORDS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40,
  cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, mil: 1000,
};

const MULTIPLIERS: Record<string, number> = {
  mil: 1_000, k: 1_000, lucas: 1_000, luca: 1_000, millon: 1_000_000, millones: 1_000_000,
};

const INCOME_VERBS = ["recibi", "gane", "me transfirieron", "me yapearon", "me plinearon"];

// `\b` de JavaScript no reconoce letras con tilde: "gasté" no tendría final de palabra
const WORD_START = String.raw`(?<![\p{L}\d])`;
const WORD_END = String.raw`(?![\p{L}\d])`;

const LEADING_VERBS = new RegExp(
  String.raw`${WORD_START}(?:hoy|ayer|anteayer|antes de ayer|me pagaron|me depositaron|me transfirieron|me yapearon|me plinearon|gast[eé]|pagu[eé]|compr[eé]|cobr[eé]|recib[ií]|gan[eé]|invert[ií]|di|puse|registra|anota|agrega)${WORD_END}`,
  "giu",
);

const CONNECTORS = /^(?:en|de|del|por|para|un|una|unos|unas|el|la|los|las|mi|mis|y|a|al|con|total)\b\s*/i;
const TRAILING_CONNECTORS = /\s*\b(?:en|de|del|por|para|a|al|con|y)$/i;

/** Palabras habituales → raíces de nombres de categoría que suelen corresponder. */
const SYNONYMS: { words: string[]; categoryStems: string[] }[] = [
  {
    words: ["almuerzo", "cena", "desayuno", "comida", "restaurante", "menu", "pollo", "pizza", "hamburguesa", "chifa", "ceviche", "lonche", "pan", "panaderia"],
    categoryStems: ["comida", "aliment", "restaur", "comer", "almuerzo"],
  },
  { words: ["cafe", "starbucks"], categoryStems: ["cafe", "comida", "aliment"] },
  {
    words: ["taxi", "uber", "cabify", "didi", "bus", "micro", "combi", "pasaje", "metro", "gasolina", "combustible", "grifo", "peaje", "estacionamiento"],
    categoryStems: ["transport", "movilidad", "auto", "carro", "gasolina", "combustible"],
  },
  {
    words: ["mercado", "supermercado", "super", "plaza vea", "tottus", "wong", "metro", "bodega", "viveres"],
    categoryStems: ["mercado", "super", "compras", "aliment", "despensa"],
  },
  { words: ["sueldo", "salario", "quincena", "nomina", "planilla"], categoryStems: ["sueldo", "salario", "ingreso", "trabajo", "nomina"] },
  { words: ["alquiler", "renta", "luz", "agua", "internet", "gas", "cable"], categoryStems: ["hogar", "casa", "alquiler", "servicio", "vivienda"] },
  { words: ["farmacia", "medicina", "doctor", "clinica", "consulta", "pastillas"], categoryStems: ["salud", "medic", "farmacia"] },
  { words: ["cine", "netflix", "spotify", "juego", "concierto", "fiesta", "bar", "cerveza"], categoryStems: ["ocio", "entreten", "diversion", "salida", "suscrip"] },
  { words: ["mouse", "laptop", "celular", "audifonos", "teclado", "ropa", "zapatillas", "polo", "regalo"], categoryStems: ["compra", "tecnolog", "ropa", "regalo", "shopping"] },
  { words: ["gimnasio", "gym"], categoryStems: ["gimnasio", "deporte", "salud"] },
  { words: ["curso", "libro", "universidad", "colegio", "matricula"], categoryStems: ["educa", "estudio", "curso"] },
];

function parseNumberToken(token: string) {
  const thousands = /^\d{1,3}(?:[ .,]\d{3})+$/.test(token);
  if (thousands) return Number(token.replace(/[ .,]/g, ""));
  return Number(token.replace(",", "."));
}

/** Monto dicho: "35", "12.50", "2.500", "35 con 50", "3 mil", "3 lucas", "cien". */
function findAmount(text: string): { value: number; match: string } | null {
  const number = String.raw`(\d{1,3}(?:[ .,]\d{3})+|\d+(?:[.,]\d{1,2})?)`;
  const pattern = new RegExp(
    String.raw`${number}(?:\s+con\s+(\d{1,2}))?\s*(${MULTIPLIER}|lucas?)?\s*(${CURRENCY})?`,
    "gi",
  );

  const candidates: { value: number; match: string; hasCurrency: boolean }[] = [];
  for (const found of text.matchAll(pattern)) {
    const [match, raw, cents, multiplier, currency] = found;
    let value = parseNumberToken(raw);
    if (cents) value += Number(cents.padEnd(2, "0")) / 100;
    if (multiplier) value *= MULTIPLIERS[normalize(multiplier)] ?? 1;
    if (Number.isFinite(value) && value > 0) {
      candidates.push({ value, match: match.trim(), hasCurrency: Boolean(currency || multiplier) });
    }
  }

  if (!candidates.length) {
    const word = new RegExp(String.raw`\b(${Object.keys(NUMBER_WORDS).join("|")})\s+(${CURRENCY})`, "i").exec(text);
    if (word) return { value: NUMBER_WORDS[normalize(word[1])], match: word[0] };
    return null;
  }

  const best = candidates.find((c) => c.hasCurrency) ?? candidates[candidates.length - 1];
  return { value: Math.round(best.value * 100) / 100, match: best.match };
}

/** "hoy", "ayer", "anteayer", "el lunes", "el 5 de septiembre". */
function findDate(text: string): { isoDate: string; match: string } | null {
  const clean = normalize(text);

  const exact = /\b(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)\b/.exec(clean);
  if (exact) {
    const month = MONTHS.indexOf(exact[2] === "setiembre" ? "septiembre" : exact[2]);
    const day = Number(exact[1]);
    if (month >= 0 && day >= 1 && day <= 31) {
      const now = today();
      const date = new Date(now.getFullYear(), month, day, 12);
      if (date > now) date.setFullYear(date.getFullYear() - 1);
      return { isoDate: toISODate(date), match: exact[0] };
    }
  }

  if (/\b(?:anteayer|antes de ayer)\b/.test(clean)) return { isoDate: toISODate(dayShift(2)), match: "" };
  if (/\bayer\b/.test(clean)) return { isoDate: toISODate(dayShift(1)), match: "" };

  const weekday = new RegExp(String.raw`\b(?:el\s+)?(${DAYS.map(normalize).join("|")})(?:\s+pasado)?\b`).exec(clean);
  if (weekday) {
    const target = DAYS.map(normalize).indexOf(weekday[1]);
    const back = (today().getDay() - target + 7) % 7;
    return { isoDate: toISODate(dayShift(back)), match: weekday[0] };
  }

  return null;
}

/** Minúsculas y sin tildes, conservando la longitud (a diferencia de normalize, no recorta). */
function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function stripSpan(text: string, span: string) {
  if (!span) return text;
  const index = fold(text).indexOf(fold(span));
  return index < 0 ? text : text.slice(0, index) + " " + text.slice(index + span.length);
}

function buildDescription(text: string, amountMatch: string | undefined, dateMatch: string | undefined) {
  let rest = stripSpan(stripSpan(text, amountMatch ?? ""), dateMatch ?? "");
  rest = rest
    .replace(LEADING_VERBS, " ")
    .replace(new RegExp(String.raw`${WORD_START}${CURRENCY}${WORD_END}`, "giu"), " ")
    .replace(/[.,;:!?¿¡]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  while (CONNECTORS.test(rest)) rest = rest.replace(CONNECTORS, "");
  while (TRAILING_CONNECTORS.test(rest)) rest = rest.replace(TRAILING_CONNECTORS, "");

  const description = rest.slice(0, 42).trim();
  return description.charAt(0).toUpperCase() + description.slice(1);
}

function matchBySynonym(text: string, categories: CategoryLike[]) {
  const clean = ` ${normalize(text)} `;
  for (const group of SYNONYMS) {
    if (!group.words.some((word) => clean.includes(` ${word} `))) continue;
    const category = categories.find((c) => group.categoryStems.some((stem) => normalize(c.name).includes(stem)));
    if (category) return category.id;
  }
  return null;
}

function inferVoiceType(text: string): TransactionType {
  const clean = normalize(text);
  if (inferType(clean) === "income" || INCOME_VERBS.some((verb) => clean.includes(verb))) return "income";
  return "expense";
}

export function parseVoiceEntry(transcript: string, categories: CategoryLike[]): VoiceDraft {
  const text = transcript.trim();
  const date = findDate(text);
  const amount = findAmount(date ? stripSpan(text, date.match) : text);
  const description = buildDescription(text, amount?.match, date?.match);

  return {
    type: inferVoiceType(text),
    amount: amount?.value ?? null,
    description,
    categoryId: matchCategory(description, categories) ?? matchBySynonym(text, categories),
    transactionDate: date?.isoDate ?? toISODate(today()),
  };
}
