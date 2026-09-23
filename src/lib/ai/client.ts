import { generateText, Output } from "ai";
import { ZodTypeAny } from "zod";

import { AI_MODEL } from "./models";

interface GenerateObjectParams<T extends ZodTypeAny> {
  prompt: string;
  schema: T;
}

export async function generateObject<T extends ZodTypeAny>({
  prompt,
  schema,
}: GenerateObjectParams<T>) {
  const { output } = await generateText({
    model: AI_MODEL,
    prompt,
    output: Output.object({
      schema,
    }),
  });

  return output;
}
