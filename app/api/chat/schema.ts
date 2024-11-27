import { z } from "zod";

export const ResponseFormatter = z.object({
  answer: z.string().describe("The answer to the user's question"),
  sources: z.array(
    z.object({
      href: z.string().describe("The URL of the source"),
      text: z.string().describe("The text of the source"),
    })
  ),
});
