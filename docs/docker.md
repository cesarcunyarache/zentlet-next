# Desarrollo con Docker

Sólo necesitas [Docker](https://docs.docker.com/get-docker/) (Docker Desktop en macOS y Windows). No hace falta instalar Node, pnpm ni PostgreSQL.

```bash
git clone https://github.com/cesarcunyarache/zentlet-next.git
cd zentlet-next
docker compose up
```

Abre **http://localhost:3000**. La primera vez tarda unos minutos (descarga imágenes e instala dependencias); después arranca en segundos.

## Qué levanta

| Servicio | Qué es | Puerto en tu máquina |
|---|---|---|
| `app` | Next.js en modo desarrollo, con recarga al guardar | `3000` |
| `db` | PostgreSQL 17 con los datos en un volumen | `5433` (para no chocar con un Postgres local en 5432) |
| `mercadopago` | Mercado Pago simulado ([e2e/mock-mercadopago.mjs](../e2e/mock-mercadopago.mjs)): puedes suscribirte a Pro, pagar y cancelar sin credenciales | `4010` |

Al arrancar, `app` instala dependencias si cambió `pnpm-lock.yaml`, aplica las migraciones y genera el cliente de Prisma.

## Configuración

Funciona sin `.env`. Si tienes uno, `app` toma de él las claves opcionales (Gemini para la IA, Google/GitHub, Sentry, Resend…). Estas las fija siempre `docker-compose.yml`, aunque estén en tu `.env`:

`DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `BILLING_PROVIDER` y las de `MERCADOPAGO_*` (apuntan al simulado).

Si tu `.env` define `NEXT_PUBLIC_BETTER_AUTH_URL` (por ejemplo, un túnel), vacíala para usar Docker: la app debe llamarse a sí misma en `localhost`.

Puertos y secreto se cambian con variables al lanzar:

```bash
APP_PORT=3001 DB_PORT=5434 docker compose up
```

## Tareas habituales

| Quiero… | Comando |
|---|---|
| Arrancar en segundo plano | `docker compose up -d` y ver logs con `docker compose logs -f app` |
| Parar | `docker compose down` |
| Ejecutar un comando en la app | `docker compose exec app pnpm test` · `pnpm lint` · `pnpm flags list` |
| Crear una migración | `docker compose exec app pnpm prisma migrate dev --name <nombre>` |
| Abrir la base de datos | `docker compose exec db psql -U postgres zentlet`, o cualquier cliente en `localhost:5433` (usuario y contraseña `postgres`) |
| Añadir una dependencia | `docker compose exec app pnpm add <paquete>` |
| Borrar la caché de Next (p. ej. todo da 404) | `docker compose down && docker volume rm zentlet_next-cache` |
| Empezar de cero, **borrando los datos** | `docker compose down -v` |

`node_modules` y `.next` viven en volúmenes de Docker, no en tu carpeta: los binarios de Linux del contenedor no se mezclan con los de tu sistema, y puedes seguir usando `pnpm dev` fuera de Docker con tu propio `node_modules`.

## Límites

- Es un entorno de **desarrollo**. Producción sigue en Vercel ([README](../README.md#-desplegar-a-producción)).
- Los tests E2E (`pnpm test:e2e`) se ejecutan fuera de Docker: necesitan el navegador de Playwright.
- `.next` en modo desarrollo crece con el uso (varios GB). Si Docker se queda sin espacio, borra el volumen `zentlet_next-cache`.
