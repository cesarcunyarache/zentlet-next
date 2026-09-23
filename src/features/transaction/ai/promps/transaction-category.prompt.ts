interface PromptCategory {
  id: string;
  name: string;
}

export function buildTransactionCategoryPrompt(
  description: string,
  categories: PromptCategory[],
) {
  const list = categories.map((c) => `- ${c.id}: ${c.name}`).join("\n");

  return `
Eres un experto en finanzas personales que clasifica movimientos.

El usuario está registrando un movimiento con esta descripción:
"${description}"

Sus categorías (id: nombre):
${list}

Reglas:
- Elige la única categoría que mejor describe el movimiento y devuelve su id exacto.
- Si ninguna categoría encaja razonablemente, devuelve categoryId null.
- No inventes ids ni categorías nuevas.
- amount es el monto mencionado en el texto como número, interpretando palabras ("3 millones" = 3000000, "20 mil" = 20000, "20k" = 20000, "12,50" = 12.5). Si no se menciona un monto, amount es null.
- type es "income" solo si el movimiento es dinero que entra (sueldo, nómina, venta, reembolso, devolución, transferencia recibida). En cualquier otro caso es "expense".

Ejemplos:

Descripción: "almuerzo con el equipo" y existe "Comer afuera"
Salida: { "categoryId": "<id de Comer afuera>", "type": "expense", "amount": null }

Descripción: "salario 3 millones" y no existe una categoría de ingresos
Salida: { "categoryId": null, "type": "income", "amount": 3000000 }

Descripción: "gasolina 50" y existe "Auto"
Salida: { "categoryId": "<id de Auto>", "type": "expense", "amount": 50 }
`;
}
