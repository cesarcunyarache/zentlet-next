import { z } from "zod";
import { LEGAL_DOCUMENTS } from "../config";

export const legalDocumentSchema = z.enum(LEGAL_DOCUMENTS);

export const acceptedDocumentsSchema = z.array(legalDocumentSchema).min(1);
