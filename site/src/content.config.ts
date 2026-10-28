import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Esquema de casos de estudio. Regla de honestidad: si no hay métrica verificada,
 * metric.tone = 'none' y metric.value = 'SIN DATOS' / 'NO DATA'. Nunca inventar cifras.
 */
const cases = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/cases' }),
  schema: z.object({
    lang: z.enum(['es', 'en']),
    permalink: z.string().regex(/^[a-z0-9-]+$/),
    code: z.string().regex(/^EXP-\d{2}$/),
    order: z.number().int().min(0),
    title: z.string(),
    domain: z.string(),
    summary: z.string(),
    metric: z.object({
      label: z.string(),
      value: z.string(),
      /** ok = cifra verificada · wip = en construcción · none = sin datos */
      tone: z.enum(['ok', 'wip', 'none']),
      /** Animación del contador (opcional). Debe coincidir con value. */
      count: z
        .object({ to: z.number(), dec: z.number().int().min(0).default(0), suf: z.string().default('') })
        .optional(),
    }),
    stack: z.array(z.string()).min(1),
    status: z.string(),
    /** Fecha del proyecto, tal como figura en el perfil (p. ej. "mar. 2026"). */
    date: z.string(),
    /** Repositorio público: toda cifra del caso debe poder comprobarse ahí. */
    repo: z.url(),
    demo: z.url().optional(),
    /** Número de funciones de test en el repo (verificado). */
    tests: z.number().int().min(0).optional(),
  }),
});

export const collections = { cases };
