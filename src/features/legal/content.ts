import type { Locale } from "@/i18n/routing";
import { legalConfig as c } from "./config";

/*
 * Textos legales. Describen lo que la app hace de verdad con los datos:
 * si cambia el código (un proveedor nuevo, otro dato recogido), hay que
 * actualizarlos aquí y subir `updatedAt` en config.ts (es la versión que
 * aceptan los usuarios al registrarse).
 *
 * Marco: Ley 29733 de Protección de Datos Personales y su Reglamento
 * (D.S. 016-2024-JUS); Código de Protección y Defensa del Consumidor
 * (Ley 29571); Ley sobre el Derecho de Autor (D. Leg. 822). Para usuarios
 * de otros países: RGPD (UE) y leyes de privacidad de EE. UU.
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
  description: "Cómo trata Zentlet tus datos personales, con qué base legal, con quién los comparte y cómo ejercer tus derechos.",
  updated: `Última actualización: ${c.updatedAt}`,
  sections: [
    {
      title: "1. Responsable del tratamiento",
      blocks: [
        `El responsable del tratamiento de tus datos personales es ${c.controller}, con ${c.taxId} y domicilio en ${c.address} ("Zentlet", "nosotros"). Contacto para asuntos de privacidad: ${c.contactEmail}.`,
        `Los datos de los usuarios forman parte del banco de datos personales "Usuarios de Zentlet", inscrito en el Registro Nacional de Protección de Datos Personales con el código ${c.databaseRegistration}.`,
      ],
    },
    {
      title: "2. Marco legal",
      blocks: [
        "Tratamos tus datos conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su Reglamento aprobado por Decreto Supremo N.° 016-2024-JUS. Si resides en la Unión Europea, también te amparan el Reglamento (UE) 2016/679 (RGPD) y los derechos adicionales que se describen abajo; si resides en otro país, los que te reconozca su legislación.",
      ],
    },
    {
      title: "3. Qué datos tratamos",
      blocks: [
        {
          list: [
            "Datos de cuenta: nombre, correo electrónico y contraseña (guardada sólo como hash, nunca legible). Si te registras con Google o GitHub, recibimos de ellos tu nombre, correo y foto de perfil.",
            "Datos financieros que registras: movimientos (descripción, monto, tipo de ingreso o gasto, fecha, categoría y referencia) y categorías (nombre, icono, color y descripción).",
            "Prueba de tu consentimiento: fecha en que aceptaste estos textos y su versión.",
            "Datos de seguridad: dirección IP y navegador de cada sesión abierta, e información técnica que usa la verificación anti-robots al registrarte o iniciar sesión.",
            "Datos en tu dispositivo: una copia de tus datos y de los cambios pendientes para usar la app sin conexión, y tus preferencias (moneda, tema, idioma y elección sobre estadísticas).",
            "Estadísticas de uso, sólo si las aceptas: qué funciones usas (por ejemplo, que registraste un movimiento o usaste el dictado), asociadas a un identificador interno. Nunca incluyen montos, descripciones, nombres de categorías, tu nombre ni tu correo.",
            "Informes de errores técnicos de la app, sin el contenido de tus movimientos.",
          ],
        },
      ],
    },
    {
      title: "4. Datos sensibles",
      blocks: [
        "Tus ingresos económicos son datos sensibles según el artículo 2 de la Ley N.° 29733. Por eso sólo los tratamos con tu consentimiento expreso y por escrito, que otorgas al marcar la casilla de aceptación al crear tu cuenta (guardamos la fecha y la versión aceptada). Sin ese consentimiento no se puede crear la cuenta, porque registrar ingresos y gastos es la función de la app.",
      ],
    },
    {
      title: "5. Finalidades y base legal",
      blocks: [
        {
          list: [
            "Prestarte el servicio (guardar tus movimientos, calcular totales, sincronizar tus dispositivos, exportar tus datos): tu consentimiento y la ejecución del contrato que aceptas al registrarte.",
            "Sugerirte la categoría de un movimiento o los iconos de una categoría con inteligencia artificial: parte del servicio, con los datos mínimos descritos en la sección 7.",
            "Proteger tu cuenta y el servicio (verificar tu correo, recuperar tu contraseña, límites de intentos, verificación anti-robots, detectar abusos): nuestro interés legítimo en la seguridad y el cumplimiento de obligaciones legales.",
            "Corregir errores técnicos: nuestro interés legítimo en que la app funcione.",
            "Estadísticas de uso para mejorar la app: sólo tu consentimiento, que puedes negar o retirar sin consecuencias.",
            "Enviarte correos necesarios de la cuenta (verificación, contraseña). No enviamos publicidad.",
          ],
        },
        "No vendemos ni cedemos tus datos con fines comerciales, no los usamos para publicidad, no elaboramos perfiles y no tomamos decisiones automatizadas que produzcan efectos jurídicos sobre ti: las sugerencias de la inteligencia artificial son sólo propuestas que tú confirmas.",
      ],
    },
    {
      title: "6. Consentimiento y cómo retirarlo",
      blocks: [
        "Puedes retirar tu consentimiento en cualquier momento, sin efecto retroactivo: las estadísticas de uso desde Ajustes → Estadísticas de uso, y el tratamiento de tus datos financieros eliminando tu cuenta desde Ajustes → Eliminar cuenta, o escribiéndonos.",
      ],
    },
    {
      title: "7. Encargados de tratamiento y destinatarios",
      blocks: [
        "Compartimos datos sólo con proveedores que los tratan por encargo nuestro, para las finalidades anteriores y bajo obligaciones de confidencialidad y seguridad:",
        {
          list: [
            `${c.hosting} y ${c.database}: alojan la app y la base de datos.`,
            "Google (API de Gemini): cuando escribes o dictas un movimiento, la descripción (hasta 80 caracteres) y los nombres de tus categorías, para sugerir la categoría; al crear una categoría, su nombre. Nunca los montos.",
            "Tu navegador: el dictado usa su reconocimiento de voz. Algunos navegadores (como Chrome) envían el audio a servidores de su fabricante para transcribirlo, bajo la política de privacidad de ese fabricante.",
            "Google y GitHub: si eliges acceder con ellos.",
            "Cloudflare (Turnstile): verificación anti-robots en el registro y el inicio de sesión.",
            "Resend: envío de los correos de la cuenta.",
            "Sentry: informes de errores técnicos. PostHog: estadísticas de uso, sólo con tu consentimiento.",
          ],
        },
        "También podemos comunicar datos a autoridades cuando una ley o una orden judicial lo exija.",
      ],
    },
    {
      title: "8. Transferencias internacionales",
      blocks: [
        "Varios de estos proveedores tratan los datos en Estados Unidos u otros países. Estas transferencias (flujo transfronterizo) se realizan conforme al artículo 15 de la Ley N.° 29733 y su Reglamento, con proveedores que ofrecen niveles adecuados de protección o garantías contractuales equivalentes. Para usuarios de la UE, se amparan en las cláusulas contractuales tipo de la Comisión Europea u otros mecanismos previstos en el RGPD.",
      ],
    },
    {
      title: "9. Cuánto tiempo conservamos tus datos",
      blocks: [
        `Mientras tengas tu cuenta. Si la eliminas, borramos al instante tu cuenta, movimientos, categorías, sesiones y la prueba de tu consentimiento. Pueden permanecer en copias de seguridad cifradas del proveedor hasta ${c.backupRetention}, y en registros técnicos durante el plazo que fija cada proveedor, sin volver a usarse. Las estadísticas de uso y los informes de errores quedan asociados a un identificador interno que, borrada la cuenta, ya no identifica a nadie.`,
      ],
    },
    {
      title: "10. Tus derechos",
      blocks: [
        "Puedes ejercer en cualquier momento tus derechos de información, acceso, rectificación, cancelación, oposición y portabilidad:",
        {
          list: [
            "Acceso y portabilidad: en Ajustes → Datos → Exportar descargas todos tus movimientos y categorías en Excel.",
            "Rectificación: editas tus datos desde la app.",
            "Cancelación: en Ajustes → Eliminar cuenta borras tu cuenta y todos tus datos.",
            `Oposición, información o cualquier otra solicitud: escríbenos a ${c.contactEmail} desde el correo de tu cuenta. Responderemos en los plazos que fija el Reglamento de la Ley N.° 29733.`,
          ],
        },
        "Si no atendemos tu solicitud, puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos del Perú. Si resides en la UE, también tienes derecho a la limitación del tratamiento y a reclamar ante la autoridad de control de tu país. Si resides en California u otros estados de EE. UU. con leyes de privacidad, tienes derecho a saber qué datos tratamos y a pedir su eliminación; no vendemos ni compartimos tus datos para publicidad.",
      ],
    },
    {
      title: "11. Cookies y almacenamiento en tu dispositivo",
      blocks: [
        {
          list: [
            "Esenciales (siempre): cookies de sesión que mantienen tu cuenta abierta, y el almacenamiento local de la app (copia sin conexión y preferencias). Sin ellas la app no funciona.",
            "Seguridad: la verificación anti-robots de Cloudflare puede usar almacenamiento técnico propio mientras resuelve el reto.",
            "Estadísticas (sólo con tu consentimiento): un identificador de PostHog en el almacenamiento del navegador. Puedes aceptarlas o rechazarlas en el aviso de tu primera visita y cambiar de opinión en Ajustes.",
          ],
        },
        "No usamos cookies publicitarias ni de terceros para seguimiento.",
      ],
    },
    {
      title: "12. Seguridad",
      blocks: [
        "Aplicamos medidas técnicas y organizativas proporcionales a la sensibilidad de los datos: comunicación cifrada (HTTPS con HSTS), contraseñas con hash, verificación del correo, límites de intentos, acceso restringido a los datos de cada usuario, y borrado de los datos del dispositivo al cerrar sesión o al caducar la sesión. Si ocurre un incidente de seguridad que afecte tus datos, lo comunicaremos a la Autoridad y a ti conforme a la normativa aplicable.",
        "Si usas un dispositivo compartido, cierra sesión al terminar.",
      ],
    },
    {
      title: "13. Menores de edad",
      blocks: ["Zentlet está dirigido a mayores de 18 años. No tratamos a sabiendas datos de menores; si detectamos una cuenta de un menor, la eliminaremos."],
    },
    {
      title: "14. Cambios en esta política",
      blocks: [
        "Si cambiamos cómo tratamos tus datos, actualizaremos esta página y su fecha. Si el cambio requiere un nuevo consentimiento, te lo pediremos antes de aplicarlo.",
      ],
    },
  ],
};

const privacyEn: LegalDocument = {
  title: "Privacy Policy",
  description: "How Zentlet processes your personal data, on what legal basis, who it is shared with and how to exercise your rights.",
  updated: `Last updated: ${c.updatedAt}`,
  sections: [
    {
      title: "1. Data controller",
      blocks: [
        `The controller of your personal data is ${c.controller}, ${c.taxId}, with registered address at ${c.address} ("Zentlet", "we"). Privacy contact: ${c.contactEmail}.`,
        `User data is part of the personal data bank "Zentlet users", registered with Peru's National Registry of Personal Data Protection under code ${c.databaseRegistration}.`,
      ],
    },
    {
      title: "2. Legal framework",
      blocks: [
        "We process your data under Peru's Law No. 29733 on Personal Data Protection and its Regulation approved by Supreme Decree No. 016-2024-JUS. If you live in the European Union, you are also protected by Regulation (EU) 2016/679 (GDPR) and the additional rights described below; if you live elsewhere, by those granted by your local laws.",
      ],
    },
    {
      title: "3. What data we process",
      blocks: [
        {
          list: [
            "Account data: name, email address and password (stored only as a hash, never readable). If you sign up with Google or GitHub, we receive your name, email and profile picture from them.",
            "Financial data you record: transactions (description, amount, income or expense type, date, category and reference) and categories (name, icon, color and description).",
            "Proof of your consent: the date you accepted these texts and their version.",
            "Security data: IP address and browser of each open session, and technical information used by the anti-bot check when you sign up or sign in.",
            "Data on your device: a copy of your data and pending changes so the app works offline, and your preferences (currency, theme, language and your choice about statistics).",
            "Usage statistics, only if you accept them: which features you use (for example, that you recorded a transaction or used voice entry), linked to an internal identifier. They never include amounts, descriptions, category names, your name or your email.",
            "Technical error reports from the app, without the content of your transactions.",
          ],
        },
      ],
    },
    {
      title: "4. Sensitive data",
      blocks: [
        "Your income is sensitive data under article 2 of Peru's Law No. 29733. We therefore process it only with your express written consent, which you give by ticking the acceptance box when creating your account (we store the date and the accepted version). Without that consent an account cannot be created, because recording income and expenses is what the app does.",
      ],
    },
    {
      title: "5. Purposes and legal basis",
      blocks: [
        {
          list: [
            "Providing the service (storing your transactions, computing totals, syncing your devices, exporting your data): your consent and the performance of the contract you accept when signing up.",
            "Suggesting a transaction's category or a category's icons with artificial intelligence: part of the service, with the minimal data described in section 7.",
            "Protecting your account and the service (email verification, password recovery, attempt limits, anti-bot checks, abuse detection): our legitimate interest in security and compliance with legal obligations.",
            "Fixing technical errors: our legitimate interest in keeping the app working.",
            "Usage statistics to improve the app: only your consent, which you can refuse or withdraw without consequences.",
            "Sending necessary account emails (verification, password). We don't send advertising.",
          ],
        },
        "We don't sell or transfer your data for commercial purposes, don't use it for advertising, don't build profiles and don't make automated decisions with legal effects on you: artificial intelligence suggestions are only proposals you confirm.",
      ],
    },
    {
      title: "6. Consent and how to withdraw it",
      blocks: [
        "You can withdraw your consent at any time, without retroactive effect: usage statistics from Settings → Usage statistics, and the processing of your financial data by deleting your account from Settings → Delete account, or by writing to us.",
      ],
    },
    {
      title: "7. Processors and recipients",
      blocks: [
        "We share data only with providers that process it on our behalf, for the purposes above and under confidentiality and security obligations:",
        {
          list: [
            `${c.hosting} and ${c.database}: host the app and the database.`,
            "Google (Gemini API): when you type or dictate a transaction, its description (up to 80 characters) and your category names, to suggest the category; when you create a category, its name. Never amounts.",
            "Your browser: voice entry uses its speech recognition. Some browsers (such as Chrome) send the audio to their vendor's servers to transcribe it, under that vendor's privacy policy.",
            "Google and GitHub: if you choose to sign in with them.",
            "Cloudflare (Turnstile): anti-bot check on sign-up and sign-in.",
            "Resend: sending account emails.",
            "Sentry: technical error reports. PostHog: usage statistics, only with your consent.",
          ],
        },
        "We may also disclose data to authorities when required by law or court order.",
      ],
    },
    {
      title: "8. International transfers",
      blocks: [
        "Several of these providers process data in the United States or other countries. These transfers are made under article 15 of Peru's Law No. 29733 and its Regulation, with providers offering adequate protection or equivalent contractual safeguards. For EU users, they rely on the European Commission's standard contractual clauses or other GDPR mechanisms.",
      ],
    },
    {
      title: "9. How long we keep your data",
      blocks: [
        `For as long as you have an account. If you delete it, we immediately delete your account, transactions, categories, sessions and the proof of your consent. They may remain in the provider's encrypted backups for up to ${c.backupRetention}, and in technical logs for the period each provider sets, without being used again. Usage statistics and error reports remain linked to an internal identifier that, once the account is deleted, no longer identifies anyone.`,
      ],
    },
    {
      title: "10. Your rights",
      blocks: [
        "You can exercise your rights of information, access, rectification, erasure, objection and portability at any time:",
        {
          list: [
            "Access and portability: in Settings → Data → Export you download all your transactions and categories as an Excel file.",
            "Rectification: you edit your data in the app.",
            "Erasure: in Settings → Delete account you delete your account and all your data.",
            `Objection, information or any other request: write to ${c.contactEmail} from your account's email. We will respond within the time limits set by the Regulation of Law No. 29733.`,
          ],
        },
        "If we don't handle your request, you can file a complaint with the National Authority for Personal Data Protection of Peru's Ministry of Justice and Human Rights. If you live in the EU, you also have the right to restriction of processing and to lodge a complaint with your country's supervisory authority. If you live in California or other US states with privacy laws, you have the right to know what data we process and to request its deletion; we don't sell or share your data for advertising.",
      ],
    },
    {
      title: "11. Cookies and storage on your device",
      blocks: [
        {
          list: [
            "Essential (always): session cookies that keep you signed in, and the app's local storage (offline copy and preferences). The app doesn't work without them.",
            "Security: Cloudflare's anti-bot check may use its own technical storage while solving the challenge.",
            "Statistics (only with your consent): a PostHog identifier in the browser's storage. You can accept or reject them in the notice on your first visit and change your mind in Settings.",
          ],
        },
        "We don't use advertising cookies or third-party tracking cookies.",
      ],
    },
    {
      title: "12. Security",
      blocks: [
        "We apply technical and organizational measures proportionate to the sensitivity of the data: encrypted communication (HTTPS with HSTS), hashed passwords, email verification, attempt limits, access restricted to each user's own data, and deletion of on-device data when you sign out or your session expires. If a security incident affects your data, we will notify the Authority and you as required by applicable law.",
        "On a shared device, sign out when you're done.",
      ],
    },
    {
      title: "13. Minors",
      blocks: ["Zentlet is intended for people over 18. We don't knowingly process minors' data; if we detect a minor's account, we will delete it."],
    },
    {
      title: "14. Changes to this policy",
      blocks: [
        "If we change how we process your data, we'll update this page and its date. If a change requires new consent, we'll ask for it before applying it.",
      ],
    },
  ],
};

const termsEs: LegalDocument = {
  title: "Términos de servicio",
  description: "Las condiciones de uso de Zentlet y de su software.",
  updated: `Última actualización: ${c.updatedAt}`,
  sections: [
    {
      title: "1. Objeto y aceptación",
      blocks: [
        `Estos términos regulan el uso de Zentlet, una aplicación para registrar ingresos y gastos personales, ofrecida por ${c.controller}, con ${c.taxId} y domicilio en ${c.address}. Al crear una cuenta y marcar la casilla de aceptación, aceptas estos términos y la Política de privacidad. Esta aceptación electrónica tiene plena validez legal. Si no estás de acuerdo, no uses la app.`,
      ],
    },
    {
      title: "2. Qué es y qué no es Zentlet",
      blocks: [
        "Zentlet es una herramienta de registro personal. No es una entidad financiera, no custodia ni mueve dinero, no se conecta con tus cuentas bancarias y no ofrece asesoría financiera, contable, tributaria ni de inversión. Los totales y resúmenes se calculan sólo con los datos que tú registras.",
      ],
    },
    {
      title: "3. Tu cuenta",
      blocks: [
        {
          list: [
            "Debes ser mayor de 18 años y dar datos verdaderos, incluido un correo que te pertenezca.",
            "La cuenta es personal e intransferible. Mantén tu contraseña en secreto; eres responsable de lo que se haga desde tu cuenta.",
            "Si sospechas un acceso no autorizado, cambia tu contraseña y avísanos.",
          ],
        },
      ],
    },
    {
      title: "4. Licencia de uso del software",
      blocks: [
        "Te otorgamos una licencia personal, limitada, no exclusiva, intransferible y revocable para usar Zentlet con fines personales mientras cumplas estos términos. El software, su código, diseño, marca y contenidos están protegidos por el Decreto Legislativo N.° 822, Ley sobre el Derecho de Autor, y demás normas de propiedad intelectual, y pertenecen a su titular o a sus licenciantes. Los componentes de código abierto se rigen por sus propias licencias.",
        "No está permitido:",
        {
          list: [
            "copiar, modificar, distribuir, vender o sublicenciar el software;",
            "descompilar o hacer ingeniería inversa, salvo en lo que la ley lo permita expresamente;",
            "eludir la verificación anti-robots, los límites de uso u otras medidas de seguridad;",
            "extraer datos de forma automatizada o usar la app de forma que sobrecargue el servicio (por ejemplo, para consumir la inteligencia artificial de forma masiva);",
            "acceder o intentar acceder a datos de otros usuarios;",
            "usar la app para actividades ilegales.",
          ],
        },
      ],
    },
    {
      title: "5. Tus datos y tu contenido",
      blocks: [
        "Lo que registras es tuyo. Nos autorizas a guardarlo y procesarlo sólo para prestarte el servicio, como describe la Política de privacidad. Eres responsable de la legalidad de lo que registras. Puedes exportar o eliminar tus datos en cualquier momento desde Ajustes.",
      ],
    },
    {
      title: "6. Inteligencia artificial",
      blocks: [
        "Las sugerencias de categoría e iconos, y la interpretación de lo que escribes o dictas, se generan automáticamente y pueden equivocarse: revísalas antes de guardar. Son propuestas, no decisiones.",
      ],
    },
    {
      title: "7. Disponibilidad y límites de uso",
      blocks: [
        "Hacemos lo posible por que el servicio esté disponible y sin errores, pero no podemos garantizarlo de forma ininterrumpida. Podemos hacer mantenimiento, cambiar o retirar funciones y aplicar límites técnicos razonables (por ejemplo, de intentos, de escrituras por minuto o de número de categorías) para proteger el servicio.",
        "Los cambios que haces sin conexión se guardan en tu dispositivo hasta que se sincronizan; si borras los datos del navegador antes, se pierden. Te recomendamos exportar tus datos periódicamente.",
      ],
    },
    {
      title: "8. Precio",
      blocks: [
        "El uso de Zentlet es gratuito. Si en el futuro ofrecemos funciones de pago, te informaremos de sus condiciones y precio antes de que puedas contratarlas; nunca se cobrará sin tu aceptación expresa.",
      ],
    },
    {
      title: "9. Responsabilidad",
      blocks: [
        "Ofrecemos el servicio tal cual y según esté disponible. En la medida en que lo permita la ley, no respondemos por daños indirectos, lucro cesante ni por decisiones que tomes a partir de la información de la app. Nada en estos términos limita los derechos que te reconoce el Código de Protección y Defensa del Consumidor (Ley N.° 29571) ni otras normas imperativas.",
      ],
    },
    {
      title: "10. Suspensión y terminación",
      blocks: [
        "Puedes dejar de usar Zentlet y eliminar tu cuenta cuando quieras. Podemos suspender o cerrar cuentas que incumplan gravemente estos términos, avisándote cuando sea posible. Si decidiéramos cerrar el servicio, te avisaríamos con al menos 30 días de antelación para que puedas exportar tus datos.",
      ],
    },
    {
      title: "11. Reclamos y protección al consumidor",
      blocks: [
        `Puedes presentar consultas o reclamos a ${c.contactEmail} o en nuestro Libro de Reclamaciones virtual: ${c.complaintsBookUrl}. También puedes acudir al INDECOPI.`,
      ],
    },
    {
      title: "12. Cambios en los términos",
      blocks: [
        "Si cambiamos estos términos, publicaremos la nueva versión con su fecha. Si el cambio es importante, te avisaremos antes de que entre en vigor y, cuando corresponda, te pediremos que lo aceptes de nuevo.",
      ],
    },
    {
      title: "13. Ley aplicable y jurisdicción",
      blocks: [
        `Estos términos se rigen por las leyes de la República del Perú. Cualquier controversia se someterá a los jueces y tribunales de ${c.jurisdiction}, sin perjuicio de las vías de protección al consumidor y de los derechos que te reconozca la ley de tu país de residencia.`,
        `Contacto: ${c.contactEmail}.`,
      ],
    },
  ],
};

const termsEn: LegalDocument = {
  title: "Terms of Service",
  description: "The conditions for using Zentlet and its software.",
  updated: `Last updated: ${c.updatedAt}`,
  sections: [
    {
      title: "1. Purpose and acceptance",
      blocks: [
        `These terms govern the use of Zentlet, an app to record personal income and expenses, provided by ${c.controller}, ${c.taxId}, with registered address at ${c.address}. By creating an account and ticking the acceptance box, you accept these terms and the Privacy Policy. This electronic acceptance is fully legally valid. If you don't agree, don't use the app.`,
      ],
    },
    {
      title: "2. What Zentlet is and isn't",
      blocks: [
        "Zentlet is a personal record-keeping tool. It is not a financial institution, doesn't hold or move money, doesn't connect to your bank accounts and doesn't provide financial, accounting, tax or investment advice. Totals and summaries are computed only from the data you record.",
      ],
    },
    {
      title: "3. Your account",
      blocks: [
        {
          list: [
            "You must be over 18 and provide truthful information, including an email address you own.",
            "Your account is personal and non-transferable. Keep your password secret; you are responsible for what happens under your account.",
            "If you suspect unauthorized access, change your password and let us know.",
          ],
        },
      ],
    },
    {
      title: "4. Software license",
      blocks: [
        "We grant you a personal, limited, non-exclusive, non-transferable and revocable license to use Zentlet for personal purposes as long as you comply with these terms. The software, its code, design, brand and content are protected by Peru's Legislative Decree No. 822 on Copyright and other intellectual property laws, and belong to their owner or licensors. Open-source components are governed by their own licenses.",
        "You may not:",
        {
          list: [
            "copy, modify, distribute, sell or sublicense the software;",
            "decompile or reverse engineer it, except where expressly permitted by law;",
            "bypass the anti-bot check, usage limits or other security measures;",
            "extract data in an automated way or use the app in a way that overloads the service (for example, to consume the artificial intelligence at scale);",
            "access or attempt to access other users' data;",
            "use the app for illegal activities.",
          ],
        },
      ],
    },
    {
      title: "5. Your data and content",
      blocks: [
        "What you record is yours. You allow us to store and process it only to provide the service, as described in the Privacy Policy. You are responsible for the legality of what you record. You can export or delete your data at any time from Settings.",
      ],
    },
    {
      title: "6. Artificial intelligence",
      blocks: [
        "Category and icon suggestions, and the interpretation of what you type or dictate, are generated automatically and can be wrong: review them before saving. They are proposals, not decisions.",
      ],
    },
    {
      title: "7. Availability and usage limits",
      blocks: [
        "We do our best to keep the service available and error-free, but can't guarantee uninterrupted operation. We may perform maintenance, change or remove features and apply reasonable technical limits (for example, on attempts, writes per minute or number of categories) to protect the service.",
        "Changes you make offline are stored on your device until they sync; if you clear your browser data before that, they are lost. We recommend exporting your data periodically.",
      ],
    },
    {
      title: "8. Price",
      blocks: [
        "Using Zentlet is free. If we offer paid features in the future, we'll inform you of their terms and price before you can purchase them; you will never be charged without your express acceptance.",
      ],
    },
    {
      title: "9. Liability",
      blocks: [
        "We provide the service as is and as available. To the extent permitted by law, we are not liable for indirect damages, loss of profits or decisions you make based on the app's information. Nothing in these terms limits your rights under Peru's Consumer Protection and Defense Code (Law No. 29571) or other mandatory laws.",
      ],
    },
    {
      title: "10. Suspension and termination",
      blocks: [
        "You can stop using Zentlet and delete your account whenever you want. We may suspend or close accounts that seriously breach these terms, notifying you when possible. If we decide to shut down the service, we'll give you at least 30 days' notice so you can export your data.",
      ],
    },
    {
      title: "11. Complaints and consumer protection",
      blocks: [
        `You can send questions or complaints to ${c.contactEmail} or through our online Complaints Book: ${c.complaintsBookUrl}. You can also contact INDECOPI, Peru's consumer protection authority.`,
      ],
    },
    {
      title: "12. Changes to the terms",
      blocks: [
        "If we change these terms, we'll publish the new version with its date. For important changes, we'll notify you before they take effect and, where appropriate, ask you to accept them again.",
      ],
    },
    {
      title: "13. Governing law and jurisdiction",
      blocks: [
        `These terms are governed by the laws of the Republic of Peru. Any dispute will be submitted to the courts of ${c.jurisdiction}, without prejudice to consumer protection remedies and to the rights granted by the law of your country of residence.`,
        `Contact: ${c.contactEmail}.`,
      ],
    },
  ],
};

export const legalDocuments: Record<LegalDocumentId, Record<Locale, LegalDocument>> = {
  privacy: { es: privacyEs, en: privacyEn },
  terms: { es: termsEs, en: termsEn },
};
