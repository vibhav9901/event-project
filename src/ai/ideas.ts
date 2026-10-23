import { z } from 'zod';
import { sanitizeModelText } from '../security/guardrails';

/** Model text is cleaned of markup and must still be non-empty afterwards. */
const modelText = (maxLength: number) =>
  z.string().max(maxLength).transform(sanitizeModelText).pipe(z.string().min(1));

/** Shape we accept back from the model. Anything else is rejected, never trusted. */
export const aiIdeasSchema = z.object({
  summary: modelText(800),
  ideas: z
    .array(
      z.object({
        title: modelText(100),
        description: modelText(400),
        costLevel: z.enum(['low', 'medium', 'high']),
      }),
    )
    .min(3)
    .max(6),
});

export type AiIdeas = z.infer<typeof aiIdeasSchema>;

/**
 * JSON Schema sent to Gemini to constrain its output. Written by hand to avoid a
 * schema-converter dependency; `aiIdeasSchema` remains the authoritative check.
 */
export const IDEAS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Two or three sentences describing the overall vibe.' },
    ideas: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          costLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['title', 'description', 'costLevel'],
      },
    },
  },
  required: ['summary', 'ideas'],
} as const;
