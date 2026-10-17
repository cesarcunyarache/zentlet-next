import "dotenv/config";
import { userInfo } from "node:os";
import prisma from "@/lib/prisma";
import { FEATURE_TYPES, type FeatureType } from "@/features/feature-flag/server/domain/entities/feature-flag.entity";
import type { FeatureFlagError } from "@/features/feature-flag/server/domain/errors/feature-flag.errors";
import { featureFlagUseCases } from "@/features/feature-flag/server/infrastructure/feature-flag.container";

const USAGE = `Uso: pnpm flags <comando>

  list                                   Lista los flags
  create <slug> [tipo] [descripción]     Crea un flag apagado (tipo: ${FEATURE_TYPES.join(", ")})
  enable <slug>                          Lo enciende (para el porcentaje de "rollout"; por defecto 100 %)
  disable <slug>                         Lo apaga para todos, incluidos los usuarios con grant
  rollout <slug> <0-100>                 Porcentaje de usuarios que lo tienen cuando está encendido
  stale <slug> | fresh <slug>            Marca o desmarca el flag como obsoleto
  grant <email> <slug>                   Lo da a un usuario aunque quede fuera del porcentaje (si el flag está encendido)
  deny <email> <slug>                    Se lo quita a un usuario aunque entre en el porcentaje
  reset <email> <slug>                   Quita la asignación: el usuario vuelve al estado global
  delete <slug>                          Borra el flag y sus asignaciones`;

const ERROR_MESSAGES: Record<FeatureFlagError, string> = {
  flag_not_found: "No existe ese flag.",
  slug_taken: "Ya existe un flag con ese slug.",
  invalid_rollout: "El porcentaje debe ser un entero de 0 a 100.",
  user_not_found: "No hay ningún usuario con ese correo.",
};

const COMMANDS_WITH_SLUG = ["create", "enable", "disable", "stale", "fresh", "delete"];
const COMMANDS_WITH_TWO_ARGS = ["grant", "deny", "reset", "rollout"];

const actor = `cli:${userInfo().username}`;

function parseType(value: string | undefined): FeatureType | undefined {
  if (value === undefined) return undefined;

  const isKnownType = (FEATURE_TYPES as readonly string[]).includes(value);
  if (!isKnownType) throw new Error(`Tipo inválido: ${value}`);

  return value as FeatureType;
}

async function printList() {
  const flags = await featureFlagUseCases.list.execute();
  if (flags.length === 0) {
    console.log("No hay flags.");
    return;
  }

  console.table(
    flags.map((flag) => ({
      slug: flag.slug,
      enabled: flag.enabled,
      rollout: `${flag.rollout}%`,
      type: flag.type,
      stale: flag.stale,
      users: flag.assignedUsers,
      lastUsedAt: flag.lastUsedAt?.toISOString() ?? "—",
      description: flag.description ?? "",
    })),
  );
}

async function run([command, first, second, ...rest]: string[]) {
  const { create, update, delete: remove, assignUser, clearUser } = featureFlagUseCases;

  switch (command) {
    case "list":
      return printList();
    case "create": {
      const description = rest.join(" ") || undefined;
      return create.execute({ slug: first, type: parseType(second), description }, actor);
    }
    case "enable":
    case "disable":
      return update.execute(first, { enabled: command === "enable" }, actor);
    case "rollout":
      return update.execute(first, { rollout: Number(second) }, actor);
    case "stale":
    case "fresh":
      return update.execute(first, { stale: command === "stale" }, actor);
    case "grant":
    case "deny":
      return assignUser.execute(first, second, command === "grant", actor);
    case "reset":
      return clearUser.execute(first, second);
    case "delete":
      return remove.execute(first);
    default:
      console.log(USAGE);
      process.exitCode = command ? 1 : 0;
  }
}

function isFailure(result: unknown): result is { error: FeatureFlagError } {
  return typeof result === "object" && result !== null && "error" in result;
}

function hasRequiredArgs([command, first, second]: string[]) {
  if (COMMANDS_WITH_SLUG.includes(command)) return Boolean(first);
  if (COMMANDS_WITH_TWO_ARGS.includes(command)) return Boolean(first && second);
  return true;
}

async function main(args: string[]) {
  if (!hasRequiredArgs(args)) {
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }

  const result = await run(args);
  if (isFailure(result)) {
    console.error(ERROR_MESSAGES[result.error]);
    process.exitCode = 1;
    return;
  }

  const isWriteCommand = args[0] !== undefined && args[0] !== "list";
  if (isWriteCommand && process.exitCode !== 1) console.log("Listo.");
}

main(process.argv.slice(2))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
