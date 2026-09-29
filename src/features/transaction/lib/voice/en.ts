import { defineLanguage, wordList } from "./language";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const EN = defineLanguage({
  currency: String.raw`(?:dollars?|bucks?|usd|euros?|soles?|pesos?)`,
  multiplier: String.raw`(?:thousand|grand|millions?)`,
  multipliers: { thousand: 1_000, grand: 1_000, million: 1_000_000, millions: 1_000_000 },
  numberWords: {
    a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  },
  cents: String.raw`\s+and\s+(\d{1,2})(?:\s+cents?)?`,
  months: ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
  days: DAYS,
  relativeDates: [
    { pattern: /\bday before yesterday\b/, daysAgo: 2, match: "day before yesterday" },
    { pattern: /\byesterday\b/, daysAgo: 1, match: "" },
  ],
  exactDate: /\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+of\s+([a-z]+)\b|\b(?:on\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/,
  weekday: new RegExp(String.raw`\b(?:on\s+|last\s+)?(${DAYS.join("|")})\b`),
  incomeVerbs: ["got paid", "received", "earned", "paid me", "sold", "refund"],
  leadingVerbs: wordList("today|yesterday|got paid|spent|paid|bought|received|earned|got|add|record|log|put"),
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
});
