import { z } from "zod";

export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  modelId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;


