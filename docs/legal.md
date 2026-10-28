# Cumplimiento legal

Qué cubre el código y qué tiene que hacer el responsable de Zentlet antes de lanzar. **Esto no es asesoría legal**: los textos se redactaron a partir de lo que la app hace de verdad y de la normativa citada, y deben revisarlos un abogado.

## Normativa

| Norma | Qué exige a Zentlet |
|---|---|
| Ley N.° 29733, Protección de Datos Personales, y su Reglamento (D.S. 016-2024-JUS) | Política de privacidad; consentimiento libre, previo, expreso e informado; **consentimiento por escrito para datos sensibles** (los ingresos económicos lo son, art. 2); derechos ARCO; inscripción del banco de datos; comunicar el flujo transfronterizo; medidas de seguridad y comunicación de incidentes |
| Código de Protección y Defensa del Consumidor (Ley N.° 29571) | Información clara, términos no abusivos, Libro de Reclamaciones |
| D. Leg. N.° 822, Ley sobre el Derecho de Autor | Protección del software (licencia de uso en los Términos) |
| RGPD (UE), si hay usuarios en la UE | Base legal por finalidad, consentimiento previo para analítica, derechos (incluidas portabilidad y limitación), cláusulas contractuales tipo para transferencias |
| Leyes de privacidad de EE. UU. (p. ej. California) | Derecho a saber y a borrar; declarar que no se venden ni comparten datos |

## Qué hace el código

| Obligación | Dónde |
|---|---|
| Política de privacidad y Términos (es/en) | `/legal/privacy`, `/legal/terms` — [content.ts](../src/features/legal/content.ts) |
| Consentimiento expreso para crear la cuenta (casilla sin marcar por defecto) | Registro — `LegalConsent` en [auth-form.tsx](../src/core/components/auth-form.tsx) |
| El servidor rechaza altas sin consentimiento (correo y Google/GitHub) | `hooks.before` en [auth.ts](../src/lib/auth.ts) (`LEGAL_CONSENT_REQUIRED`) |
| Prueba del consentimiento (fecha y versión) | Columnas `legalAcceptedAt` y `legalVersion` del usuario |
| Google/GitHub no crean cuentas desde el login (sólo desde el registro, con consentimiento) | `disableImplicitSignUp` |
| Analítica sólo con consentimiento, revocable | Aviso de primera visita y Ajustes → Estadísticas de uso |
| Acceso y portabilidad | Ajustes → Datos → Exportar (Excel) |
| Cancelación | Ajustes → Eliminar cuenta (borrado en cascada) |
| Seguridad | HTTPS/HSTS, verificación de correo, límites de intentos y de escritura en base de datos, CAPTCHA, borrado de datos locales |

## Qué falta y no es código (responsable de Zentlet)

1. **Completar [config.ts](../src/features/legal/config.ts)**: responsable, RUC, domicilio, correo, código de inscripción, enlace al Libro de Reclamaciones, proveedores y plazo de copias de seguridad. Todo lo que está entre `[corchetes]` se ve tal cual en las páginas.
2. **Inscribir el banco de datos** "Usuarios de Zentlet" en el Registro Nacional de Protección de Datos Personales (Autoridad Nacional de Protección de Datos Personales, MINJUSDH).
3. **Comunicar el flujo transfronterizo** a la Autoridad (proveedores en EE. UU.: Google, Cloudflare, Resend, Sentry, PostHog y los de hosting/base de datos si aplica).
4. **Libro de Reclamaciones virtual**: evaluar con el abogado si aplica a un servicio gratuito y, si aplica, habilitarlo y enlazarlo.
5. **Contratos de encargo de tratamiento (DPA)** con cada proveedor: la mayoría los ofrecen en su panel (Google Cloud, Cloudflare, Resend, Sentry, PostHog, Vercel, Supabase).
6. **Evaluar si se requiere Oficial de Datos Personales** según el volumen y la sensibilidad (el Reglamento lo exige en algunos supuestos).
7. **Procedimiento interno** para atender solicitudes ARCO por correo y para comunicar incidentes de seguridad a la Autoridad y a los usuarios.
8. **Usuarios anteriores al consentimiento**: las cuentas creadas antes de esta versión no tienen `legalAcceptedAt`. Pedirles la aceptación en su próximo acceso.

## Al cambiar el tratamiento de datos

Actualizar [content.ts](../src/features/legal/content.ts) y subir `updatedAt` en [config.ts](../src/features/legal/config.ts): es la versión que se guarda con cada consentimiento y la que exige el servidor en las altas.
