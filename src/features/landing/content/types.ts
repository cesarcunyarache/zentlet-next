export type SectionId = "producto" | "funciones" | "como-funciona" | "testimonios" | "preguntas";

export type FeatureId =
  | "natural-input"
  | "ai-category"
  | "budgets"
  | "live-feed"
  | "balance"
  | "categories"
  | "currency";

export interface DemoCategory {
  name: string;
  icon: string;
  color: string;
}

export type MovementType = "expense" | "income";

interface DemoTransaction {
  amount: number;
  type: MovementType;
  category: DemoCategory;
}

export interface DemoMovement extends DemoTransaction {
  id: string;
  description: string;
  when: string;
}

export interface DemoEntry extends DemoTransaction {
  typed: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar?: string;
}

export interface LandingContent {
  locale: string;
  meta: {
    title: string;
    description: string;
    keywords: string[];
    ogImageAlt: string;
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
    dashboard: string;
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
    items: { id: FeatureId; title: string; description: string; badge?: string }[];
    samples: {
      phrases: string[];
      suggestionFrom: string;
      suggestionCategory: DemoCategory;
      categoryIdeas: DemoCategory[];
      budgets: (DemoCategory & { spent: number; budget: number })[];
      budgetLabels: { left: string; over: string };
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
      value: number;
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
    languageTitle: string;
    rights: string;
    privacy: string;
    terms: string;
  };
}
