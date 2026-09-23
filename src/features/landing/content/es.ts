import type { DemoCategory, LandingContent } from "./types";

/*
 * Textos de la landing en español. Único lugar con copy de la página:
 * para traducir, copia este archivo (p. ej. en.ts), tradúcelo y regístralo
 * en ./index.ts. Los montos son de ejemplo y se muestran en la demo.
 */

const CATEGORIES = {
  transport: { name: "Transporte", icon: "🚕", color: "oklch(0.92 0.05 230)" },
  market: { name: "Mercado", icon: "🛒", color: "oklch(0.93 0.06 75)" },
  home: { name: "Alquiler", icon: "🏠", color: "oklch(0.92 0.05 300)" },
  salary: { name: "Sueldo", icon: "💼", color: "oklch(0.93 0.06 150)" },
  food: { name: "Comida", icon: "🍜", color: "oklch(0.93 0.05 30)" },
  coffee: { name: "Café", icon: "☕", color: "oklch(0.91 0.04 60)" },
  health: { name: "Salud", icon: "💊", color: "oklch(0.93 0.05 180)" },
  fun: { name: "Ocio", icon: "🎬", color: "oklch(0.92 0.05 330)" },
} satisfies Record<string, DemoCategory>;

export const es: LandingContent = {
  locale: "es-PE",
  meta: {
    title: "Zentlet · Registra tus gastos en segundos",
    description:
      "Zentlet es la forma más rápida de llevar tus finanzas personales: escribe «taxi 12.50» y la app entiende el monto, el tipo y la categoría. Balance del mes al instante, sin hojas de cálculo.",
    keywords: [
      "control de gastos",
      "finanzas personales",
      "app de gastos",
      "presupuesto personal",
      "registro de ingresos y gastos",
      "gastos con IA",
    ],
    ogImageAlt: "Zentlet: registra tus gastos en segundos",
    ogSubtitle: "Escribe «taxi 12.50» y Zentlet hace el resto.",
  },
  common: {
    currency: "S/",
    expense: "Gasto",
    income: "Ingreso",
    balance: "Balance",
  },
  nav: {
    links: [
      { label: "Producto", section: "producto" },
      { label: "Funciones", section: "funciones" },
      { label: "Cómo funciona", section: "como-funciona" },
      { label: "Preguntas", section: "preguntas" },
    ],
    signIn: "Iniciar sesión",
    cta: "Crear cuenta",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    home: "Zentlet, inicio",
  },
  hero: {
    badge: "Con sugerencias de IA para cada movimiento",
    titleLead: "Tus gastos, claros",
    titleWords: ["en segundos.", "sin fórmulas.", "sin esfuerzo."],
    subtitle:
      "Escribe «taxi 12.50» y Zentlet entiende el monto, si es gasto o ingreso y en qué categoría va. Tu balance del mes se actualiza al momento.",
    primaryCta: "Crear mi cuenta",
    secondaryCta: "Ver cómo funciona",
    note: "Regístrate en un minuto con tu correo, Google o GitHub",
    demo: {
      label: "Nuevo movimiento",
      reading: "Leyendo…",
      suggestion: "Sugerido",
      save: "Guardar",
      entries: [
        { typed: "taxi al trabajo 12.50", amount: 12.5, type: "expense", category: CATEGORIES.transport },
        { typed: "sueldo 3 lucas", amount: 3000, type: "income", category: CATEGORIES.salary },
        { typed: "mercado 84.30", amount: 84.3, type: "expense", category: CATEGORIES.market },
        { typed: "café con Ana 9", amount: 9, type: "expense", category: CATEGORIES.coffee },
      ],
    },
  },
  showcase: {
    eyebrow: "Tu mes, de un vistazo",
    title: "Todo lo que entra y sale, en una sola pantalla",
    subtitle:
      "Balance, ingresos, gastos y el reparto por categoría. Sin fórmulas, sin pestañas, sin exportar nada.",
    dashboard: {
      greeting: "Hola, Ana",
      period: "Septiembre",
      byCategory: "Por categoría",
      recent: "Últimos movimientos",
      totals: { balance: 1185.7, income: 3000, expense: 1814.3 },
      categories: [
        { ...CATEGORIES.home, total: 650 },
        { ...CATEGORIES.market, total: 412.8 },
        { ...CATEGORIES.food, total: 298.5 },
        { ...CATEGORIES.transport, total: 186 },
        { ...CATEGORIES.fun, total: 142 },
        { ...CATEGORIES.coffee, total: 125 },
      ],
    },
  },
  manifesto:
    "Las hojas de cálculo se abandonan en la segunda semana. Zentlet está hecho para que anotar un gasto sea más rápido que olvidarlo.",
  features: {
    eyebrow: "Funciones",
    title: "Pensado para anotar, no para administrar",
    subtitle: "Cada detalle quita un paso entre gastar y saber en qué se te fue el dinero.",
    items: [
      {
        id: "natural-input",
        title: "Escribe como hablas",
        description:
          "«almuerzo 18», «sueldo 3 lucas», «taxi 12.50». Zentlet lee el monto y si es gasto o ingreso mientras escribes, sin esperar a nadie.",
      },
      {
        id: "ai-category",
        title: "La IA elige la categoría",
        description:
          "Cuando el texto no basta, una IA propone la categoría entre las tuyas. Es una ayuda: tú decides y nunca bloquea el registro.",
      },
      {
        id: "live-feed",
        title: "Cada movimiento, en su sitio",
        description: "Tu historial ordenado por día, con el color y el emoji de su categoría.",
      },
      {
        id: "balance",
        title: "Balance siempre al día",
        description: "Ingresos menos gastos del periodo, en una sola cifra que se mueve contigo.",
      },
      {
        id: "categories",
        title: "Categorías con cara propia",
        description: "Crea las tuyas con emoji y color. Escribe el nombre y la IA te propone cuatro opciones.",
      },
      {
        id: "currency",
        title: "En tu moneda",
        description: "Soles, dólares o euros: eliges el símbolo una vez y toda la app lo usa.",
      },
    ],
    samples: {
      phrases: ["almuerzo 18", "sueldo 3 lucas", "taxi 12.50", "netflix 44.90"],
      suggestionFrom: "uber a casa",
      suggestionCategory: CATEGORIES.transport,
      categoryIdeas: [CATEGORIES.food, CATEGORIES.coffee, CATEGORIES.health, CATEGORIES.fun],
      currencies: [
        { symbol: "S/", label: "Sol" },
        { symbol: "$", label: "Dólar" },
        { symbol: "€", label: "Euro" },
      ],
    },
  },
  movements: [
    { id: "1", description: "Nómina de septiembre", amount: 3000, type: "income", category: CATEGORIES.salary, when: "Hoy" },
    { id: "2", description: "Mercado del sábado", amount: 84.3, type: "expense", category: CATEGORIES.market, when: "Hoy" },
    { id: "3", description: "Taxi al trabajo", amount: 12.5, type: "expense", category: CATEGORIES.transport, when: "Ayer" },
    { id: "4", description: "Alquiler", amount: 650, type: "expense", category: CATEGORIES.home, when: "Ayer" },
    { id: "5", description: "Ramen con amigos", amount: 38, type: "expense", category: CATEGORIES.food, when: "Lunes" },
    { id: "6", description: "Cine", amount: 24, type: "expense", category: CATEGORIES.fun, when: "Domingo" },
  ],
  steps: {
    eyebrow: "Cómo funciona",
    title: "Tres pasos y ya sabes en qué se va tu dinero",
    items: [
      {
        title: "Crea tu cuenta",
        description: "Entra con tu correo, Google o GitHub. Sin formularios eternos ni configuraciones previas.",
      },
      {
        title: "Anota como hablas",
        description:
          "Escribe el movimiento tal como lo dirías. El monto, el tipo y la categoría se completan solos; tú sólo confirmas.",
      },
      {
        title: "Mira tu mes",
        description:
          "Balance, ingresos, gastos y reparto por categoría se actualizan en cuanto guardas. Toca una categoría y filtra al instante.",
      },
    ],
    preview: {
      signUpProviders: ["Correo", "Google", "GitHub"],
      signUpLabel: "Crear cuenta con",
      savedLabel: "Guardado",
    },
  },
  stats: {
    eyebrow: "En números",
    title: "Menos fricción, más claridad",
    items: [
      { value: 3, prefix: "≈", suffix: " s", label: "para anotar un gasto" },
      { value: 4, label: "propuestas de icono y color por categoría" },
      { value: 3, label: "monedas para elegir" },
      { value: 0, from: 12, label: "fórmulas que mantener" },
    ],
  },
  testimonials: {
    eyebrow: "Testimonios",
    title: "Lo que dicen quienes ya anotan con Zentlet",
    subtitle: "Historias reales de personas que dejaron la hoja de cálculo.",
    // Añade aquí las opiniones reales; con 1 o más se muestra el carrusel:
    // { name: "Ana Torres", role: "Diseñadora, Lima", quote: "…", avatar: "/testimonials/ana.jpg" },
    items: [],
    empty: {
      title: "Tu historia puede ser la primera",
      body: "Estamos reuniendo las primeras opiniones. Pruébalo, anota tu mes y cuéntanos qué cambió.",
      cta: "Empezar ahora",
    },
  },
  faq: {
    eyebrow: "Preguntas frecuentes",
    title: "Lo que suelen preguntarnos",
    items: [
      {
        question: "¿Qué es Zentlet?",
        answer:
          "Una app web de finanzas personales para registrar ingresos y gastos en segundos y ver tu balance del mes, sin hojas de cálculo.",
      },
      {
        question: "¿Cómo sabe en qué categoría va cada gasto?",
        answer:
          "Mientras escribes, Zentlet reconoce el monto, el tipo y las categorías cuyo nombre aparece en el texto. Si no alcanza, una IA sugiere la categoría entre las que tú creaste. Siempre puedes cambiarla.",
      },
      {
        question: "¿Puedo usar mi moneda?",
        answer: "Sí. Puedes elegir soles (S/), dólares ($) o euros (€) desde los ajustes, y toda la app mostrará ese símbolo.",
      },
      {
        question: "¿Necesito instalar algo?",
        answer: "No. Zentlet funciona en el navegador del móvil o del ordenador; sólo necesitas iniciar sesión.",
      },
      {
        question: "¿Quién puede ver mis movimientos?",
        answer:
          "Sólo tú. Cada consulta exige tu sesión y devuelve únicamente los movimientos y categorías de tu cuenta.",
      },
    ],
  },
  cta: {
    title: "Tu próximo gasto puede ser el primero que anotas bien",
    subtitle: "Crea tu cuenta y registra tu primer movimiento hoy. Toma menos de un minuto.",
    primary: "Crear mi cuenta",
    secondary: "Ya tengo cuenta",
  },
  footer: {
    tagline: "Tus gastos, claros en segundos.",
    productTitle: "Producto",
    accountTitle: "Cuenta",
    rights: "Todos los derechos reservados.",
  },
};
