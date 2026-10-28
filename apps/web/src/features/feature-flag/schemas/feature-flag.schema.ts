import { z } from "zod";

export const featureFlagsSchema = z.object({ enabled: z.array(z.string()) });

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
