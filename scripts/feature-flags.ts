import "dotenv/config";
import { userInfo } from "node:os";
import { FeatureType } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";
import {
  clearUserFlag,
  createFlag,
  deleteFlag,
  listFlags,
  setFlagEnabled,
  setFlagRollout,
  setFlagStale,
  setUserFlag,
} from "@/features/feature-flag/server/admin";

const USAGE = `Uso: pnpm flags <comando>

  list                                   Lista los flags
  create <slug> [tipo] [descripción]     Crea un flag apagado (tipo: ${Object.values(FeatureType).join(", ")})
  enable <slug>                          Lo enciende (para el porcentaje de "rollout"; por defecto 100 %)
  disable <slug>                         Lo apaga para todos, incluidos los usuarios con grant
  rollout <slug> <0-100>                 Porcentaje de usuarios que lo tienen cuando está encendido
  stale <slug> | fresh <slug>            Marca o desmarca el flag como obsoleto
  grant <email> <slug>                   Lo da a un usuario aunque quede fuera del porcentaje (si el flag está encendido)
  deny <email> <slug>                    Se lo quita a un usuario aunque entre en el porcentaje
  reset <email> <slug>                   Quita la asignación: el usuario vuelve al estado global
  delete <slug>                          Borra el flag y sus asignaciones`;

const actor = `cli:${userInfo().username}`;

function parseType(value: string | undefined) {
  if (value === undefined) return undefined;
  if (!(value in FeatureType)) throw new Error(`Tipo inválido: ${value}`);
  return value as FeatureType;
}

async function printList() {
  const flags = await listFlags();
  if (flags.length === 0) return console.log("No hay flags.");
  console.table(
    flags.map((flag) => ({
      slug: flag.slug,
      enabled: flag.enabled,
      rollout: `${flag.rollout}%`,
      type: flag.type,
      stale: flag.stale,
      users: flag._count.users,
      lastUsedAt: flag.lastUsedAt?.toISOString() ?? "—",
      description: flag.description ?? "",
    })),
  );
}

async function run([command, first, second, ...rest]: string[]) {
  switch (command) {
    case "list":
      return printList();
    case "create":
      return createFlag({ slug: first, type: parseType(second), description: rest.join(" ") || undefined }, actor);
    case "enable":
    case "disable":
      return setFlagEnabled(first, command === "enable", actor);
    case "rollout":
      return setFlagRollout(first, Number(second), actor);
    case "stale":
    case "fresh":
      return setFlagStale(first, command === "stale", actor);
    case "grant":
    case "deny":
      return setUserFlag(first, second, command === "grant", actor);
    case "reset":
      return clearUserFlag(first, second);
    case "delete":
      return deleteFlag(first);
    default:
      console.log(USAGE);
      process.exitCode = command ? 1 : 0;
  }
}

const args = process.argv.slice(2);
const needsSlug = ["create", "enable", "disable", "stale", "fresh", "delete"].includes(args[0]);
const needsTwo = ["grant", "deny", "reset", "rollout"].includes(args[0]);

if ((needsSlug && !args[1]) || (needsTwo && (!args[1] || !args[2]))) {
  console.log(USAGE);
  process.exitCode = 1;
} else {
  run(args)
    .then(() => {
      if (args[0] !== "list" && args[0] && process.exitCode !== 1) console.log("Listo.");
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
