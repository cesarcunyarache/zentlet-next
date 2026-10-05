# Feature flags

Permiten encender funcionalidades para todos, para algunos usuarios o apagarlas sin desplegar.

## Modelo

| Tabla | Qué guarda |
|---|---|
| `feature` | El flag: `slug`, estado global `enabled`, porcentaje `rollout` (0–100, por defecto 100), `type` (`RELEASE`, `EXPERIMENT`, `OPERATIONAL`, `KILL_SWITCH`, `PERMISSION`), `stale`, `lastUsedAt`, `updatedBy` |
| `user_feature` | La asignación de un flag a un usuario (`enabled`, `assignedBy`). Se borra en cascada con el usuario o el flag |

**Resolución**, en este orden:

1. **Apagado (`enabled = false`) → apagado para todos**, incluidos los usuarios con `grant`. Es el interruptor de emergencia.
2. Encendido y el usuario tiene asignación (`grant` / `deny`) → manda la asignación.
3. Si no, entra el **porcentaje**: cada usuario cae en un grupo del 0 al 99 calculado con un hash de `slug:userId`. Lo tiene si su grupo es menor que `rollout`. El mismo usuario siempre cae en el mismo grupo, subir del 5 % al 20 % conserva a los que ya lo tenían, y cada flag reparte de forma distinta.

Un slug que no existe está **apagado**, así que el código puede preguntar por un flag antes de crearlo.

## Usarlo en el código

Servidor (route handlers, Server Components):

```ts
import { isFlagEnabled } from "@/features/feature-flag/server/flags";

if (!(await isFlagEnabled(userId, "new-home"))) return notFound();
```

Cliente:

```tsx
import { useFeatureFlag } from "@/features/feature-flag/stores/feature-flag.store";

const hasNewHome = useFeatureFlag("new-home");
```

El hook lee `GET /api/account/features` (los slugs activos para la sesión), la da por vigente 1 minuto, vuelve a pedirla al regresar a la pestaña y devuelve `false` mientras carga. Un usuario sin conexión conserva los últimos flags hasta que vuelve la red. Para algo que deba estar protegido de verdad, comprueba también en el servidor: el cliente sólo decide qué se muestra.

**Sentry:** cada evaluación (`isFlagEnabled` en el servidor, `useFeatureFlag` en el cliente) se adjunta a los errores que ocurran después, en la sección *Feature Flags* del evento. Así puedes filtrar los errores por `flags.new-home:true` y ver si los provoca la feature nueva.

`lastUsedAt` se actualiza en las comprobaciones de servidor (`isFlagEnabled`), como mucho una vez al día por flag. La lectura en bloque del cliente no lo toca.

## Gestionarlos

Lanzamiento gradual:

```bash
pnpm flags create new-home RELEASE Inicio rediseñado
pnpm flags rollout new-home 0 && pnpm flags enable new-home   # encendido, pero para nadie
pnpm flags grant tu@correo.com new-home                        # lo pruebas tú
pnpm flags rollout new-home 5                                  # 5 % de usuarios
pnpm flags rollout new-home 50                                 # si Sentry no muestra errores, subes
pnpm flags rollout new-home 100                                # todos
pnpm flags disable new-home                                    # si falla: apagado para todos al instante
```

Otros: `pnpm flags list`, `deny <email> <slug>` (excluir a alguien), `reset <email> <slug>` (volver al porcentaje), `stale <slug>`, `delete <slug>`.

`enable` sin `rollout` previo lo enciende para el 100 %.

Usa la base de `DATABASE_URL` del `.env` (en producción, ejecútalo con las variables de producción). Registra `cli:<usuario del sistema>` en `updatedBy` / `assignedBy`.
