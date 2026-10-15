# WhatsApp

Los usuarios registran gastos e ingresos escribiéndole a un número de WhatsApp: texto libre, notas de voz o fotos de boletas. Si falta el monto o la categoría, el asistente lo pregunta. También responde «¿cuánto gasté esta semana?» y permite deshacer lo último que registró.

Es opcional: sin las variables `WHATSAPP_*` la fila no aparece en Ajustes y el webhook responde 404.

## Configuración en Meta

1. En [developers.facebook.com](https://developers.facebook.com) crea una app de tipo *Business* y añade el producto **WhatsApp**.
2. En **WhatsApp → API Setup** registra el número del asistente. Copia el *Phone number ID* en `WHATSAPP_PHONE_NUMBER_ID` y el número (solo dígitos, con código de país) en `WHATSAPP_BUSINESS_PHONE`.
3. Crea un token permanente: **Business settings → Users → System users**, añade un usuario del sistema con acceso a la app y a la cuenta de WhatsApp, y genera un token con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Va en `WHATSAPP_ACCESS_TOKEN`. El token temporal del panel caduca en 24 horas.
4. En **App settings → Basic** copia el *App secret* en `WHATSAPP_APP_SECRET`.
5. Elige un texto aleatorio para `WHATSAPP_VERIFY_TOKEN` (`openssl rand -hex 16`) y despliega con todas las variables.
6. En **WhatsApp → Configuration → Webhook** registra:
   - Callback URL: `https://<tu-dominio>/api/whatsapp/webhook`
   - Verify token: el mismo valor de `WHATSAPP_VERIFY_TOKEN`
   
   Luego suscríbete al campo **messages**.

Para probar en local, expón el puerto con un túnel (`cloudflared tunnel --url http://localhost:3000` o `ngrok http 3000`) y usa esa URL como callback.

## Cómo funciona

```
Usuario → WhatsApp → Meta → POST /api/whatsapp/webhook
  1. valida X-Hub-Signature-256 (HMAC del cuerpo con WHATSAPP_APP_SECRET); sin firma válida → 401
  2. responde 200 de inmediato y procesa en segundo plano (runInBackground)
  3. por cada mensaje: HandleMessageUseCase
     - descarta duplicados (tabla whatsapp_message, por el id del mensaje)
     - «vincular <código>» → vincula el número; número desconocido → enlace a la app
     - comandos fijos: cancelar, deshacer, ayuda, desvincular
     - si hay un dato pendiente y el mensaje lo responde («18», «comida») → sin IA
     - si no, Gemini interpreta (intent + movimientos) con las categorías y la conversación reciente
     - el código decide: registra los completos y pregunta lo que falte (botones / lista de categorías)
```

La IA solo interpreta. Qué falta, qué se registra y qué categorías son válidas lo decide el código; un id de categoría inventado se descarta y se vuelve a preguntar. Sin IA configurada, o si falla, los textos se interpretan con el parser local de la entrada por voz.

Cada movimiento se crea con un id derivado del id del mensaje de WhatsApp, así un reintento nunca lo duplica.

## Vinculación

1. En la app, **Ajustes → WhatsApp → Conectar** genera un código de 8 caracteres, de un solo uso y válido 10 minutos. Solo se guarda su hash (`whatsapp_link_code`).
2. El botón abre `wa.me/<número>?text=vincular <código>`, y el usuario solo pulsa enviar.
3. El webhook valida el código y crea `whatsapp_link (userId, phone)`.

El código prueba que quien escribe controla la cuenta de la app, y el mensaje prueba que controla el número; WhatsApp ya verificó ese número y Meta firma el webhook. Hay un número por cuenta y una cuenta por número: vincular de nuevo reemplaza el vínculo anterior.

## Límites

| Qué | Límite |
|---|---|
| Mensajes por número | 20 por minuto (el resto se ignora) |
| Intentos de código por número | 5 por hora |
| Respuestas a números no vinculados | 3 por día |
| Llamadas a la IA | el cupo compartido de `lib/ai/quota.ts` |
| Conversación pendiente | caduca a los 30 minutos sin mensajes |

El cron de limpieza borra los ids de mensajes procesados con más de 7 días y los códigos vencidos.

## Ventana de 24 horas

WhatsApp solo permite responder con texto libre y botones dentro de las 24 horas posteriores al último mensaje del usuario. El asistente siempre responde a un mensaje recién recibido, así que no necesita plantillas. Enviar algo por iniciativa propia (recordatorios, avisos de presupuesto) requeriría plantillas aprobadas por Meta.
