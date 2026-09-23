/*
 * Forma del contenido de la landing. Cada idioma implementa `LandingContent`
 * completo; así una traducción a medias no compila. Los componentes sólo
 * reciben texto y datos serializables: ni JSX ni iconos viven aquí.
 */

/** Anclas de las secciones; el menú y los CTA enlazan a ellas. */
export type SectionId = "producto" | "funciones" | "como-funciona" | "testimonios" | "preguntas";

export type FeatureId = "natural-input" | "ai-category" | "live-feed" | "balance" | "categories" | "currency";

export interface DemoCategory {
  name: string;
  icon: string;
  color: string;
}

export interface DemoMovement {
  id: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  category: DemoCategory;
  /** Texto relativo ya traducido: "Hoy", "Ayer"… */
  when: string;
}

/** Un ejemplo de la demo: lo que se escribe y lo que Zentlet deduce. */
export interface DemoEntry {
  typed: string;
  amount: number;
  type: "expense" | "income";
  category: DemoCategory;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  /** Ruta en /public o URL permitida en next.config; opcional. */
  avatar?: string;
}

export interface LandingContent {
  /** Etiqueta BCP 47 para <html lang>, Intl y Open Graph. */
  locale: string;
  meta: {
    title: string;
    description: string;
    keywords: string[];
    ogImageAlt: string;
    /** Frase corta bajo el titular en la imagen para redes. */
    ogSubtitle: string;
  };
  common: {
    currency: string;
    expense: string;
    income: string;
    balance: string;
  };
  nav: {
    links: { label: string; section: SectionId }[];
    signIn: string;
    cta: string;
    openMenu: string;
    closeMenu: string;
    home: string;
    label: string;
  };
  hero: {
    badge: string;
    titleLead: string;
    titleWords: string[];
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    note: string;
    demo: {
      label: string;
      reading: string;
      suggestion: string;
      save: string;
      entries: DemoEntry[];
    };
  };
  showcase: {
    eyebrow: string;
    title: string;
    subtitle: string;
    dashboard: {
      greeting: string;
      period: string;
      byCategory: string;
      recent: string;
      totals: { balance: number; income: number; expense: number };
      categories: (DemoCategory & { total: number })[];
    };
  };
  manifesto: string;
  features: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: { id: FeatureId; title: string; description: string }[];
    samples: {
      phrases: string[];
      suggestionFrom: string;
      suggestionCategory: DemoCategory;
      categoryIdeas: DemoCategory[];
      currencies: { symbol: string; label: string }[];
    };
  };
  movements: DemoMovement[];
  steps: {
    eyebrow: string;
    title: string;
    items: { title: string; description: string }[];
    preview: {
      signUpProviders: string[];
      signUpLabel: string;
      savedLabel: string;
    };
  };
  stats: {
    eyebrow: string;
    title: string;
    items: {
      /** Cifra final que se lee. */
      value: number;
      /** Desde dónde cuenta; 0 por defecto. Mayor que `value` = cuenta hacia atrás. */
      from?: number;
      prefix?: string;
      suffix?: string;
      label: string;
    }[];
  };
  testimonials: {
    eyebrow: string;
    title: string;
    subtitle: string;
    /** Vacío = se muestra la invitación `empty` en lugar del carrusel. */
    items: Testimonial[];
    empty: { title: string; body: string; cta: string };
  };
  faq: {
    eyebrow: string;
    title: string;
    items: { question: string; answer: string }[];
  };
  cta: {
    title: string;
    subtitle: string;
    primary: string;
    secondary: string;
  };
  footer: {
    tagline: string;
    productTitle: string;
    accountTitle: string;
    rights: string;
  };
}
