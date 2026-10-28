// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // Cambia esto por el dominio real antes de publicar (se usa en canonical y hreflang).
  site: 'https://example.com',
  trailingSlash: 'ignore',
  // La copia estable (la que sirve `npm run stable`) vive en .stable/; los builds normales van a dist/.
  outDir: process.env.NF_STABLE ? './.stable' : './dist',
  integrations: [mdx()],
  vite: {
    // Pre-optimiza three y sus módulos de postproceso al arrancar el servidor de desarrollo.
    // Sin esto, el primer import dinámico obliga a Vite a re-optimizar y las pestañas abiertas
    // reciben un 504 ("Outdated Optimize Dep") y el 3D no carga.
    optimizeDeps: {
      include: [
        'three',
        'three/examples/jsm/postprocessing/EffectComposer.js',
        'three/examples/jsm/postprocessing/RenderPass.js',
        'three/examples/jsm/postprocessing/UnrealBloomPass.js',
        'three/examples/jsm/postprocessing/ShaderPass.js',
      ],
    },
  },
});
