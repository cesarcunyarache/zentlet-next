/*
 * Datos del responsable que aparecen en la Política de privacidad y en los
 * Términos. ANTES DE LANZAR: sustituir todos los valores entre corchetes y
 * hacer revisar ambos textos por un abogado.
 *
 * Obligaciones fuera del código (Perú), ver docs/legal.md:
 * - inscribir el banco de datos de usuarios en el Registro Nacional de
 *   Protección de Datos Personales y poner aquí su código;
 * - comunicar a la Autoridad el flujo transfronterizo de datos;
 * - habilitar el Libro de Reclamaciones virtual si corresponde.
 */
export const legalConfig = {
  /** Persona o empresa responsable del tratamiento de los datos. */
  controller: "[NOMBRE O RAZÓN SOCIAL]",
  /** Documento de identidad fiscal del responsable (RUC en Perú). */
  taxId: "RUC [NÚMERO]",
  /** Domicilio del responsable. */
  address: "[DIRECCIÓN, DISTRITO, CIUDAD], Perú",
  /** Correo para ejercer derechos y consultas legales. */
  contactEmail: "[CORREO DE CONTACTO]",
  /** Código de inscripción del banco de datos en el Registro Nacional de Protección de Datos Personales. */
  databaseRegistration: "[CÓDIGO DE INSCRIPCIÓN]",
  /** Enlace al Libro de Reclamaciones virtual. */
  complaintsBookUrl: "[ENLACE AL LIBRO DE RECLAMACIONES]",
  /** Ciudad de los juzgados competentes. */
  jurisdiction: "Lima",
  /** Proveedores de infraestructura (p. ej. Vercel, Supabase) y su región. */
  hosting: "[PROVEEDOR DE HOSTING Y REGIÓN]",
  database: "[PROVEEDOR DE BASE DE DATOS Y REGIÓN]",
  /** Cuánto conserva el proveedor las copias de seguridad de la base de datos. */
  backupRetention: "[N] días",
  /** Fecha de la última actualización de los textos (AAAA-MM-DD). */
  updatedAt: "2026-09-24",
};

/** Versión de los textos que acepta quien se registra (se guarda con su cuenta). */
export const LEGAL_VERSION = legalConfig.updatedAt;

/** Cabecera con la que el registro declara qué versión aceptó el usuario. */
export const LEGAL_CONSENT_HEADER = "x-legal-consent";
