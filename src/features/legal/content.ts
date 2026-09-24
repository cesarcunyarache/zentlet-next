import type { Locale } from "@/i18n/routing";
import { legalConfig as c } from "./config";

/*
 * Textos legales. Describen lo que la app hace de verdad con los datos:
 * si cambia el código (un proveedor nuevo, otro dato recogido), hay que
 * actualizarlos aquí.
 */

export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}

export type LegalDocumentId = "privacy" | "terms";

const privacyEs: LegalDocument = {
  title: "Política de privacidad",
  description: "Qué datos trata Zentlet, para qué, con quién los comparte y cómo ejercer tus derechos.",
  updated: `Última actualización: ${c.updatedAt}`,
  sections: [
    {
      title: "Quién es el responsable",
      blocks: [
        `El responsable del tratamiento de tus datos es ${c.controller} (${c.taxId}). Para cualquier consulta sobre tus datos escríbenos a ${c.contactEmail}.`,
      ],
    },
    {
      title: "Qué datos tratamos",
      blocks: [
        {
          list: [
            "Cuenta: tu nombre, tu correo y tu contraseña (guardada sólo como hash, nunca en texto legible). Si entras con Google o GitHub, recibimos de ellos tu nombre, tu correo y tu foto de perfil.",
            "Tus finanzas: los movimientos que registras (descripción, monto, tipo, fecha, categoría y referencia) y tus categorías (nombre, icono, color y descripción).",
            "Seguridad: la dirección IP y el navegador desde los que inicias sesión, asociados a cada sesión abierta.",
            "En tu dispositivo: una copia de tus datos y de los cambios pendientes de sincronizar, para que la app funcione sin conexión, y tus preferencias (moneda y tema). Al cerrar sesión o eliminar tu cuenta se borran del dispositivo.",
            "Uso y errores: qué funciones usas (por ejemplo, que registraste un movimiento o usaste el dictado) y los errores técnicos de la app. Nunca incluyen montos, descripciones, nombres de categorías, tu nombre ni tu correo: se asocian sólo a un identificador interno.",
          ],
        },
      ],
    },
    {
      title: "Para qué los usamos",
      blocks: [
        {
          list: [
            "Darte el servicio: guardar tus movimientos, calcular tus totales y sincronizar tus dispositivos. Es necesario para ejecutar el contrato que aceptas al registrarte.",
            "Sugerir la categoría de un movimiento o los iconos de una categoría con inteligencia artificial.",
            "Proteger tu cuenta: verificar tu correo, permitirte recuperar la contraseña y detectar accesos sospechosos o abusos.",
            "Mejorar la app: entender qué funciones se usan y corregir errores.",
          ],
        },
        "No vendemos tus datos, no los usamos para publicidad y no tomamos decisiones automatizadas que te afecten.",
      ],
    },
    {
      title: "Con quién los compartimos",
      blocks: [
        "Sólo con proveedores que los tratan por encargo nuestro y para los fines de arriba:",
        {
          list: [
            "Google (Gemini API): cuando escribes o dictas un movimiento, la descripción (hasta 80 caracteres) y los nombres de tus categorías, para sugerir la categoría; al crear una categoría, su nombre. Nunca los montos.",
            "Tu navegador: el dictado usa el reconocimiento de voz del propio navegador. Algunos (como Chrome) envían el audio a servidores de su fabricante para transcribirlo.",
            "Google y GitHub: si eliges entrar con ellos.",
            "Resend: para enviarte los correos de verificación y de recuperación de contraseña.",
            "PostHog (analítica de uso) y Sentry (informes de errores), con los límites descritos arriba.",
            `Infraestructura: ${c.hosting} (servidores) y ${c.database} (base de datos).`,
          ],
        },
        "Varios de estos proveedores están en Estados Unidos, por lo que tus datos pueden transferirse fuera de tu país. Sólo trabajamos con proveedores que ofrecen garantías adecuadas de protección.",
      ],
    },
    {
      title: "Cuánto tiempo los conservamos",
      blocks: [
        `Mientras tengas tu cuenta. Si la eliminas, borramos al instante tu cuenta, tus movimientos, tus categorías y tus sesiones de nuestra base de datos. Pueden permanecer en las copias de seguridad del proveedor hasta ${c.backupRetention}, y los registros técnicos durante el plazo que fija cada proveedor.`,
      ],
    },
    {
      title: "Tus derechos",
      blocks: [
        "Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, cancelación y oposición:",
        {
          list: [
            "Acceso y portabilidad: en Ajustes → Datos → Exportar descargas todos tus movimientos y categorías en Excel.",
            "Rectificación: puedes editar tus datos desde la app.",
            "Cancelación: en Ajustes → Eliminar cuenta borras tu cuenta y todos tus datos.",
            `Oposición y cualquier otra solicitud: escríbenos a ${c.contactEmail}.`,
          ],
        },
        "Si consideras que no atendimos tu solicitud, puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales del Perú o ante la autoridad de tu país.",
      ],
    },
    {
      title: "Seguridad",
      blocks: [
        "Toda la comunicación viaja cifrada (HTTPS), las contraseñas se guardan como hash y cada consulta exige tu sesión y sólo devuelve tus datos. Si usas un dispositivo compartido, cierra sesión al terminar: así se borra la copia local de tus datos.",
      ],
    },
    {
      title: "Menores de edad",
      blocks: ["Zentlet no está dirigido a menores de 18 años."],
    },
    {
      title: "Cambios en esta política",
      blocks: [
        "Si cambiamos cómo tratamos tus datos, actualizaremos esta página y, si el cambio es importante, te avisaremos por correo o en la app antes de que entre en vigor.",
      ],
    },
  ],
};

const privacyEn: LegalDocument = {
  title: "Privacy Policy",
  description: "What data Zentlet processes, why, who it is shared with and how to exercise your rights.",
  updated: `Last updated: ${c.updatedAt}`,
  sections: [
    {
      title: "Who is responsible",
      blocks: [
        `The controller of your data is ${c.controller} (${c.taxId}). For any question about your data, write to ${c.contactEmail}.`,
      ],
    },
    {
      title: "What data we process",
      blocks: [
        {
          list: [
            "Account: your name, your email and your password (stored only as a hash, never readable). If you sign in with Google or GitHub, we receive your name, email and profile picture from them.",
            "Your finances: the transactions you record (description, amount, type, date, category and reference) and your categories (name, icon, color and description).",
            "Security: the IP address and browser you sign in from, linked to each open session.",
            "On your device: a copy of your data and of changes pending sync, so the app works offline, and your preferences (currency and theme). Signing out or deleting your account removes them from the device.",
            "Usage and errors: which features you use (for example, that you recorded a transaction or used voice entry) and the app's technical errors. They never include amounts, descriptions, category names, your name or your email: they are linked only to an internal identifier.",
          ],
        },
      ],
    },
    {
      title: "Why we use it",
      blocks: [
        {
          list: [
            "To provide the service: store your transactions, compute your totals and sync your devices. This is necessary to perform the contract you accept when signing up.",
            "To suggest a transaction's category or a category's icons using artificial intelligence.",
            "To protect your account: verify your email, let you recover your password and detect suspicious access or abuse.",
            "To improve the app: understand which features are used and fix errors.",
          ],
        },
        "We don't sell your data, don't use it for advertising and don't make automated decisions that affect you.",
      ],
    },
    {
      title: "Who we share it with",
      blocks: [
        "Only with providers that process it on our behalf and for the purposes above:",
        {
          list: [
            "Google (Gemini API): when you type or dictate a transaction, its description (up to 80 characters) and your category names, to suggest the category; when you create a category, its name. Never amounts.",
            "Your browser: voice entry uses the browser's own speech recognition. Some browsers (such as Chrome) send the audio to their vendor's servers to transcribe it.",
            "Google and GitHub: if you choose to sign in with them.",
            "Resend: to send you verification and password recovery emails.",
            "PostHog (usage analytics) and Sentry (error reports), within the limits described above.",
            `Infrastructure: ${c.hosting} (servers) and ${c.database} (database).`,
          ],
        },
        "Several of these providers are in the United States, so your data may be transferred outside your country. We only work with providers that offer adequate protection safeguards.",
      ],
    },
    {
      title: "How long we keep it",
      blocks: [
        `For as long as you have an account. If you delete it, we immediately delete your account, transactions, categories and sessions from our database. They may remain in the provider's backups for up to ${c.backupRetention}, and technical logs for the period each provider sets.`,
      ],
    },
    {
      title: "Your rights",
      blocks: [
        "You can exercise your rights of access, rectification, erasure and objection at any time:",
        {
          list: [
            "Access and portability: in Settings → Data → Export you download all your transactions and categories as an Excel file.",
            "Rectification: you can edit your data in the app.",
            "Erasure: in Settings → Delete account you delete your account and all your data.",
            `Objection and any other request: write to ${c.contactEmail}.`,
          ],
        },
        "If you believe we didn't handle your request properly, you can file a complaint with Peru's National Authority for Personal Data Protection or with the authority in your country.",
      ],
    },
    {
      title: "Security",
      blocks: [
        "All communication is encrypted (HTTPS), passwords are stored as hashes and every request requires your session and only returns your data. On a shared device, sign out when you're done: that deletes the local copy of your data.",
      ],
    },
    {
      title: "Minors",
      blocks: ["Zentlet is not intended for people under 18."],
    },
    {
      title: "Changes to this policy",
      blocks: [
        "If we change how we process your data, we'll update this page and, for important changes, notify you by email or in the app before they take effect.",
      ],
    },
  ],
};

const termsEs: LegalDocument = {
  title: "Términos de servicio",
  description: "Las condiciones para usar Zentlet.",
  updated: `Última actualización: ${c.updatedAt}`,
  sections: [
    {
      title: "El servicio",
      blocks: [
        `Zentlet es una aplicación para registrar tus ingresos y gastos personales, ofrecida por ${c.controller} (${c.taxId}). Al crear una cuenta aceptas estos términos y nuestra Política de privacidad.`,
      ],
    },
    {
      title: "Tu cuenta",
      blocks: [
        "Debes ser mayor de 18 años, dar un correo que te pertenezca y mantener tu contraseña en secreto. Eres responsable de lo que se haga desde tu cuenta; si sospechas que alguien más accedió, cambia tu contraseña.",
      ],
    },
    {
      title: "Tus datos",
      blocks: [
        "Los datos que registras son tuyos. Nos autorizas a guardarlos y procesarlos sólo para darte el servicio. Puedes exportarlos o eliminarlos en cualquier momento desde Ajustes.",
      ],
    },
    {
      title: "Uso aceptable",
      blocks: [
        "No puedes usar Zentlet para actividades ilegales, intentar acceder a datos de otros usuarios, interferir con el funcionamiento del servicio ni automatizar su uso de forma abusiva (por ejemplo, para consumir la inteligencia artificial de forma masiva).",
      ],
    },
    {
      title: "Sugerencias, totales y asesoría",
      blocks: [
        "Las sugerencias de la inteligencia artificial y la interpretación de lo que escribes o dictas pueden equivocarse: revísalas antes de guardar. Los totales se calculan con los datos que registras. Zentlet es una herramienta de registro y no ofrece asesoría financiera, contable ni tributaria.",
      ],
    },
    {
      title: "Disponibilidad",
      blocks: [
        "Ofrecemos el servicio tal cual y hacemos lo posible por que esté disponible y sin errores, pero no podemos garantizarlo. Los cambios hechos sin conexión se guardan en tu dispositivo hasta que se sincronizan: si borras los datos del navegador antes, se pierden. Te recomendamos exportar tus datos de vez en cuando.",
      ],
    },
    {
      title: "Responsabilidad",
      blocks: [
        "En la medida en que lo permita la ley, no somos responsables de pérdidas indirectas ni de decisiones que tomes a partir de la información de la app.",
      ],
    },
    {
      title: "Fin del servicio",
      blocks: [
        "Puedes dejar de usar Zentlet y eliminar tu cuenta cuando quieras. Podemos suspender cuentas que incumplan estos términos. Si decidiéramos cerrar el servicio, te avisaríamos con antelación para que puedas exportar tus datos.",
      ],
    },
    {
      title: "Cambios y ley aplicable",
      blocks: [
        "Si cambiamos estos términos te avisaremos antes de que entren en vigor. Se rigen por las leyes del Perú.",
        `Contacto: ${c.contactEmail}.`,
      ],
    },
  ],
};

const termsEn: LegalDocument = {
  title: "Terms of Service",
  description: "The conditions for using Zentlet.",
  updated: `Last updated: ${c.updatedAt}`,
  sections: [
    {
      title: "The service",
      blocks: [
        `Zentlet is an app to record your personal income and expenses, provided by ${c.controller} (${c.taxId}). By creating an account you accept these terms and our Privacy Policy.`,
      ],
    },
    {
      title: "Your account",
      blocks: [
        "You must be over 18, use an email address you own and keep your password secret. You are responsible for what happens under your account; if you suspect someone else accessed it, change your password.",
      ],
    },
    {
      title: "Your data",
      blocks: [
        "The data you record is yours. You allow us to store and process it only to provide the service. You can export or delete it at any time from Settings.",
      ],
    },
    {
      title: "Acceptable use",
      blocks: [
        "You may not use Zentlet for illegal activities, try to access other users' data, interfere with the service or automate its use abusively (for example, to consume the artificial intelligence at scale).",
      ],
    },
    {
      title: "Suggestions, totals and advice",
      blocks: [
        "Artificial intelligence suggestions and the interpretation of what you type or dictate can be wrong: review them before saving. Totals are computed from the data you record. Zentlet is a record-keeping tool and does not provide financial, accounting or tax advice.",
      ],
    },
    {
      title: "Availability",
      blocks: [
        "We provide the service as is and do our best to keep it available and error-free, but we can't guarantee it. Changes made offline are stored on your device until they sync: if you clear your browser data before that, they are lost. We recommend exporting your data from time to time.",
      ],
    },
    {
      title: "Liability",
      blocks: [
        "To the extent permitted by law, we are not liable for indirect losses or for decisions you make based on the app's information.",
      ],
    },
    {
      title: "Ending the service",
      blocks: [
        "You can stop using Zentlet and delete your account whenever you want. We may suspend accounts that breach these terms. If we ever decide to shut down the service, we'll give you advance notice so you can export your data.",
      ],
    },
    {
      title: "Changes and governing law",
      blocks: [
        "If we change these terms, we'll notify you before they take effect. They are governed by the laws of Peru.",
        `Contact: ${c.contactEmail}.`,
      ],
    },
  ],
};

export const legalDocuments: Record<LegalDocumentId, Record<Locale, LegalDocument>> = {
  privacy: { es: privacyEs, en: privacyEn },
  terms: { es: termsEs, en: termsEn },
};
