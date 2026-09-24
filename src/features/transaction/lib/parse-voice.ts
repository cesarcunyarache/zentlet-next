import type { Locale } from "@/i18n/routing";
import type { CategoryLike, TransactionType } from "../types";
import { dayShift, today, toISODate } from "./format";
import { inferType, matchCategory, normalize } from "./parse-description";

/*
 * Interpretación determinística de un dictado, sin red:
 * "ayer gasté 35 soles en almuerzo" → gasto de 35, ayer, "Almuerzo".
 * "spent 12.50 on lunch yesterday" → gasto de 12.50, ayer, "Lunch".
 * La moneda que se nombre se reconoce y se descarta: la app no guarda
 * moneda, sólo muestra el símbolo elegido en Ajustes.
 *
 * Cada idioma aporta sus palabras (monedas, números, fechas, verbos,
 * sinónimos); el procedimiento es el mismo.
 */

export interface VoiceDraft {
  type: TransactionType;
  amount: number | null;
  description: string;
  categoryId: string | null;
  transactionDate: string;
}

interface VoiceLanguage {
  currency: string;
  multiplier: string;
  multipliers: Record<string, number>;
  numberWords: Record<string, number>;
  /** "35 con 50" / "35 and 50 cents". */
  cents: string;
  months: string[];
  days: string[];
  findRelativeDate(clean: string): { isoDate: string; match: string } | null;
  exactDate: RegExp;
  weekday: (days: string) => RegExp;
  incomeVerbs: string[];
  leadingVerbs: RegExp;
  connectors: RegExp;
  trailingConnectors: RegExp;
  synonyms: { words: string[]; categoryStems: string[] }[];
}

// `\b` de JavaScript no reconoce letras con tilde: "gasté" no tendría final de palabra
const WORD_START = String.raw`(?<![\p{L}\d])`;
const WORD_END = String.raw`(?![\p{L}\d])`;

const verbs = (list: string) => new RegExp(String.raw`${WORD_START}(?:${list})${WORD_END}`, "giu");

const ES: VoiceLanguage = {
  currency: String.raw`(?:soles?|s\/\.?|d[oó]lares?|usd|euros?|pesos?|lucas?)`,
  multiplier: String.raw`(?:mil|k|millones?|mill[oó]n)`,
  multipliers: { mil: 1_000, k: 1_000, lucas: 1_000, luca: 1_000, millon: 1_000_000, millones: 1_000_000 },
  numberWords: {
    un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
    nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40,
    cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, mil: 1000,
  },
  cents: String.raw`\s+con\s+(\d{1,2})`,
  months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  days: ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"],
  findRelativeDate(clean) {
    if (/\b(?:anteayer|antes de ayer)\b/.test(clean)) return { isoDate: toISODate(dayShift(2)), match: "" };
    if (/\bayer\b/.test(clean)) return { isoDate: toISODate(dayShift(1)), match: "" };
    return null;
  },
  exactDate: /\b(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)\b/,
  weekday: (days) => new RegExp(String.raw`\b(?:el\s+)?(${days})(?:\s+pasado)?\b`),
  incomeVerbs: ["recibi", "gane", "me transfirieron", "me yapearon", "me plinearon"],
  leadingVerbs: verbs(
    "hoy|ayer|anteayer|antes de ayer|me pagaron|me depositaron|me transfirieron|me yapearon|me plinearon|gast[eé]|pagu[eé]|compr[eé]|cobr[eé]|recib[ií]|gan[eé]|invert[ií]|di|puse|registra|anota|agrega",
  ),
  connectors: /^(?:en|de|del|por|para|un|una|unos|unas|el|la|los|las|mi|mis|y|a|al|con|total)\b\s*/i,
  trailingConnectors: /\s*\b(?:en|de|del|por|para|a|al|con|y)$/i,
  synonyms: [
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
  ],
};

/*
 * En inglés el usuario puede haber nombrado sus categorías en cualquiera de
 * los dos idiomas: los sinónimos buscan raíces de ambos.
 */
const EN: VoiceLanguage = {
  currency: String.raw`(?:dollars?|bucks?|usd|euros?|soles?|pesos?)`,
  multiplier: String.raw`(?:thousand|grand|k|millions?)`,
  multipliers: { thousand: 1_000, grand: 1_000, k: 1_000, million: 1_000_000, millions: 1_000_000 },
  numberWords: {
    a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  },
  cents: String.raw`\s+and\s+(\d{1,2})(?:\s+cents?)?`,
  months: ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
  days: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  findRelativeDate(clean) {
    if (/\bday before yesterday\b/.test(clean)) return { isoDate: toISODate(dayShift(2)), match: "day before yesterday" };
    if (/\byesterday\b/.test(clean)) return { isoDate: toISODate(dayShift(1)), match: "" };
    return null;
  },
  // "on the 5th of september" / "september 5th"
  exactDate: /\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+of\s+([a-z]+)\b|\b(?:on\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/,
  weekday: (days) => new RegExp(String.raw`\b(?:on\s+|last\s+)?(${days})\b`),
  incomeVerbs: ["got paid", "received", "earned", "paid me", "sold", "refund"],
  leadingVerbs: verbs("today|yesterday|got paid|spent|paid|bought|received|earned|got|add|record|log|put"),
  connectors: /^(?:i|we|on|for|at|in|of|the|a|an|my|to|from|and|with|total)\b\s*/i,
  trailingConnectors: /\s*\b(?:on|for|at|in|of|to|from|and|with)$/i,
  synonyms: [
    {
      words: ["lunch", "dinner", "breakfast", "food", "restaurant", "meal", "pizza", "burger", "sandwich", "takeout", "bakery"],
      categoryStems: ["food", "restaur", "meal", "eat", "dining", "comida", "aliment", "almuerzo"],
    },
    { words: ["coffee", "starbucks", "cafe"], categoryStems: ["coffee", "cafe", "food", "comida"] },
    {
      words: ["taxi", "uber", "lyft", "cab", "bus", "subway", "metro", "train", "gas", "fuel", "parking", "toll"],
      categoryStems: ["transport", "travel", "car", "fuel", "movilidad", "auto", "gasolina"],
    },
    {
      words: ["groceries", "grocery", "supermarket", "market", "walmart", "costco"],
      categoryStems: ["grocer", "market", "shopping", "mercado", "super", "compras"],
    },
    { words: ["salary", "paycheck", "payroll", "wage", "wages"], categoryStems: ["salary", "income", "work", "job", "sueldo", "salario", "ingreso"] },
    { words: ["rent", "electricity", "water", "internet", "utilities", "phone"], categoryStems: ["home", "house", "rent", "util", "bill", "hogar", "casa", "servicio"] },
    { words: ["pharmacy", "medicine", "doctor", "clinic", "pills"], categoryStems: ["health", "medic", "pharma", "salud", "farmacia"] },
    { words: ["movie", "movies", "cinema", "netflix", "spotify", "game", "concert", "party", "bar", "beer"], categoryStems: ["entertain", "fun", "leisure", "subscr", "ocio", "entreten", "suscrip"] },
    { words: ["laptop", "phone", "headphones", "keyboard", "mouse", "clothes", "shoes", "gift"], categoryStems: ["shopping", "tech", "cloth", "gift", "compra", "tecnolog", "ropa", "regalo"] },
    { words: ["gym", "workout"], categoryStems: ["gym", "sport", "fitness", "gimnasio", "deporte"] },
    { words: ["course", "book", "books", "tuition", "school", "college"], categoryStems: ["educa", "study", "course", "school", "estudio", "curso"] },
  ],
};

const LANGUAGES: Record<Locale, VoiceLanguage> = { es: ES, en: EN };

function parseNumberToken(token: string) {
  const thousands = /^\d{1,3}(?:[ .,]\d{3})+$/.test(token);
  if (thousands) return Number(token.replace(/[ .,]/g, ""));
  return Number(token.replace(",", "."));
}

/** Monto dicho: "35", "12.50", "2.500", "35 con 50", "3 mil", "cien", "$20", "3 grand". */
function findAmount(text: string, lang: VoiceLanguage): { value: number; match: string } | null {
  const number = String.raw`\$?(\d{1,3}(?:[ .,]\d{3})+|\d+(?:[.,]\d{1,2})?)`;
  const pattern = new RegExp(
    String.raw`${number}(?:${lang.cents})?\s*(${lang.multiplier}|lucas?)?\s*(${lang.currency})?`,
    "gi",
  );

  const candidates: { value: number; match: string; hasCurrency: boolean }[] = [];
  for (const found of text.matchAll(pattern)) {
    const [match, raw, cents, multiplier, currency] = found;
    let value = parseNumberToken(raw);
    if (cents) value += Number(cents.padEnd(2, "0")) / 100;
    if (multiplier) value *= lang.multipliers[normalize(multiplier)] ?? 1;
    if (Number.isFinite(value) && value > 0) {
      candidates.push({ value, match: match.trim(), hasCurrency: Boolean(currency || multiplier || match.startsWith("$")) });
    }
  }

  if (!candidates.length) {
    const word = new RegExp(String.raw`\b(${Object.keys(lang.numberWords).join("|")})\s+(${lang.currency})`, "i").exec(text);
    if (word) return { value: lang.numberWords[normalize(word[1])], match: word[0] };
    return null;
  }

  const best = candidates.find((c) => c.hasCurrency) ?? candidates[candidates.length - 1];
  return { value: Math.round(best.value * 100) / 100, match: best.match };
}

function exactDate(day: number, monthName: string, lang: VoiceLanguage) {
  const month = lang.months.indexOf(monthName === "setiembre" ? "septiembre" : monthName);
  if (month < 0 || day < 1 || day > 31) return null;
  const now = today();
  const date = new Date(now.getFullYear(), month, day, 12);
  if (date > now) date.setFullYear(date.getFullYear() - 1);
  return toISODate(date);
}

/** "hoy", "ayer", "el lunes", "el 5 de septiembre" / "yesterday", "on monday", "september 5th". */
function findDate(text: string, lang: VoiceLanguage): { isoDate: string; match: string } | null {
  const clean = normalize(text);

  const exact = lang.exactDate.exec(clean);
  if (exact) {
    const [match, dayFirst, monthAfter, monthFirst, dayAfter] = exact;
    const isoDate = exactDate(Number(dayFirst ?? dayAfter), monthAfter ?? monthFirst, lang);
    if (isoDate) return { isoDate, match };
  }

  const relative = lang.findRelativeDate(clean);
  if (relative) return relative;

  const weekday = lang.weekday(lang.days.join("|")).exec(clean);
  if (weekday) {
    const target = lang.days.indexOf(weekday[1]);
    const back = (today().getDay() - target + 7) % 7;
    return { isoDate: toISODate(dayShift(back)), match: weekday[0] };
  }

  return null;
}

/** Minúsculas y sin tildes, conservando la longitud (a diferencia de normalize, no recorta). */
function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function stripSpan(text: string, span: string) {
  if (!span) return text;
  const index = fold(text).indexOf(fold(span));
  return index < 0 ? text : text.slice(0, index) + " " + text.slice(index + span.length);
}

function buildDescription(text: string, lang: VoiceLanguage, amountMatch: string | undefined, dateMatch: string | undefined) {
  let rest = stripSpan(stripSpan(text, amountMatch ?? ""), dateMatch ?? "");
  rest = rest
    .replace(lang.leadingVerbs, " ")
    .replace(new RegExp(String.raw`${WORD_START}${lang.currency}${WORD_END}`, "giu"), " ")
    .replace(/[.,;:!?¿¡$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  while (lang.connectors.test(rest)) rest = rest.replace(lang.connectors, "");
  while (lang.trailingConnectors.test(rest)) rest = rest.replace(lang.trailingConnectors, "");

  const description = rest.slice(0, 42).trim();
  return description.charAt(0).toUpperCase() + description.slice(1);
}

function matchBySynonym(text: string, categories: CategoryLike[], lang: VoiceLanguage) {
  const clean = ` ${normalize(text)} `;
  for (const group of lang.synonyms) {
    if (!group.words.some((word) => clean.includes(` ${word} `))) continue;
    const category = categories.find((c) => group.categoryStems.some((stem) => normalize(c.name).includes(stem)));
    if (category) return category.id;
  }
  return null;
}

function inferVoiceType(text: string, lang: VoiceLanguage): TransactionType {
  const clean = normalize(text);
  if (inferType(clean) === "income" || lang.incomeVerbs.some((verb) => clean.includes(verb))) return "income";
  return "expense";
}

export function parseVoiceEntry(transcript: string, categories: CategoryLike[], locale: Locale = "es"): VoiceDraft {
  const lang = LANGUAGES[locale];
  const text = transcript.trim();
  const date = findDate(text, lang);
  const amount = findAmount(date ? stripSpan(text, date.match) : text, lang);
  const description = buildDescription(text, lang, amount?.match, date?.match);

  return {
    type: inferVoiceType(text, lang),
    amount: amount?.value ?? null,
    description,
    categoryId: matchCategory(description, categories) ?? matchBySynonym(text, categories, lang),
    transactionDate: date?.isoDate ?? toISODate(today()),
  };
}
