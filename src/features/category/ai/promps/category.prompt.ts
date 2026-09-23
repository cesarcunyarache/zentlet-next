export function buildCategoryPrompt(userPrompt: string) {
  return `
Eres un experto en clasificación de gastos personales.

El usuario quiere crear una categoría para registrar sus gastos.

Genera sugerencias de iconos para esta categoría.

Reglas:
- La categoría debe representar un tipo de gasto financiero real.
- El icono debe ser un emoji relacionado directamente con el concepto.
- El color debe ser un color pastel en formato hexadecimal.
- Genera exactamente 4 opciones.
- No inventes categorías nuevas.
- No uses nombres de marcas.
- No uses emojis aleatorios.

Ejemplos:

Entrada:
"comida"

Salida:
{
  "categories": [
    {
      "icon": "🍔",
      "color": "#FECACA"
    },
    {
      "icon": "🍕",
      "color": "#FED7AA"
    },
    {
      "icon": "🥗",
      "color": "#BBF7D0"
    },
    {
      "icon": "🍜",
      "color": "#FDE68A"
    }
  ]
}

Entrada:
"transporte"

Salida:
{
  "categories": [
    {
      "icon": "🚗",
      "color": "#BFDBFE"
    },
    {
      "icon": "🚌",
      "color": "#E0E7FF"
    }
  ]
}

Solicitud del usuario:

${userPrompt}
`;
}
