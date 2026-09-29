import { defineLanguage, wordList } from "./language";

const DAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export const ES = defineLanguage({
  currency: String.raw`(?:soles?|s\/\.?|d[oó]lares?|usd|euros?|pesos?|lucas?)`,
  multiplier: String.raw`(?:millones?|mill[oó]n|mil|k)`,
  multipliers: { mil: 1_000, k: 1_000, lucas: 1_000, luca: 1_000, millon: 1_000_000, millones: 1_000_000 },
  numberWords: {
    un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
    nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40,
    cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, mil: 1000,
  },
  cents: String.raw`\s+con\s+(\d{1,2})`,
  months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  days: DAYS,
  relativeDates: [
    { pattern: /\b(?:anteayer|antes de ayer)\b/, daysAgo: 2, match: "" },
    { pattern: /\bayer\b/, daysAgo: 1, match: "" },
  ],
  exactDate: /\b(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)\b/,
  weekday: new RegExp(String.raw`\b(?:el\s+)?(${DAYS.join("|")})(?:\s+pasado)?\b`),
  incomeVerbs: ["recibi", "gane", "me transfirieron", "me yapearon", "me plinearon"],
  leadingVerbs: wordList(
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
});
