import { randomBytes } from "node:crypto";
import { siteConfig } from "@/lib/site";
import { CreateLinkCodeUseCase } from "../application/use-cases/create-link-code.use-case";
import { GetConnectionUseCase } from "../application/use-cases/get-connection.use-case";
import { HandleMessageUseCase } from "../application/use-cases/handle-message.use-case";
import { UnlinkWhatsappUseCase } from "../application/use-cases/unlink-whatsapp.use-case";
import { WhatsappCloudMessenger } from "./messaging/whatsapp-cloud.messenger";
import { PrismaWhatsappRepository } from "./persistence/prisma/prisma-whatsapp.repository";
import { interpreter, ledger, textsFor, throttle } from "./whatsapp.adapters";
import { readWhatsappConfig } from "./whatsapp.config";

export const whatsappConfig = readWhatsappConfig();

const repository = new PrismaWhatsappRepository();
const businessPhone = whatsappConfig?.businessPhone ?? null;

export const whatsappUseCases = {
  connection: new GetConnectionUseCase(repository, businessPhone),
  createLinkCode: new CreateLinkCodeUseCase(repository, businessPhone, randomBytes),
  unlink: new UnlinkWhatsappUseCase(repository),
  handleMessage: whatsappConfig
    ? new HandleMessageUseCase({
        links: repository,
        messenger: new WhatsappCloudMessenger(whatsappConfig),
        ledger,
        interpreter,
        throttle,
        texts: textsFor,
        appUrl: `${siteConfig.url}${siteConfig.routes.app}`,
      })
    : null,
};
