export const legalConfig = {
  controller: "[NOMBRE O RAZÓN SOCIAL]",
  taxId: "RUC [NÚMERO]",
  address: "[DIRECCIÓN, DISTRITO, CIUDAD], Perú",
  contactEmail: "[CORREO DE CONTACTO]",
  databaseRegistration: "[CÓDIGO DE INSCRIPCIÓN]",
  complaintsBookUrl: "[ENLACE AL LIBRO DE RECLAMACIONES]",
  jurisdiction: "Lima",
  hosting: "[PROVEEDOR DE HOSTING Y REGIÓN]",
  database: "[PROVEEDOR DE BASE DE DATOS Y REGIÓN]",
  backupRetention: "[N] días",
  updatedAt: "2026-09-26",
};

export const LEGAL_VERSION = legalConfig.updatedAt;

export const LEGAL_CONSENT_HEADER = "x-legal-consent";

export const LEGAL_DOCUMENTS = ["terms", "privacy"] as const;

export type LegalDocumentId = (typeof LEGAL_DOCUMENTS)[number];
