# Sitio · Astro

Requiere Node.js 20+ (probado con 24 LTS).

```bash
npm install            # una vez
npm run dev            # desarrollo en http://localhost:4322 (recarga en caliente)
npm run build          # sitio estático en dist/
npm run check          # tipos y esquema de contenido
npm run publish:local  # compila y copia a .stable/ (vista estable local)
npm run stable         # sirve .stable/ en http://localhost:4321
node scripts/serve-test.mjs 4323   # sirve dist/ para pruebas sin tocar la vista estable
```

## Estructura
```
src/pages/index.astro              raíz → /es/ (o /en/ si el navegador está en inglés)
src/pages/[lang]/index.astro       home en /es/ y /en/
src/pages/[lang]/work/[slug].astro página de cada caso (modo LEGIBLE por defecto)
src/pages/lab/                     maquetas (no indexadas): núcleo y mesa
src/components/Home.astro          contenido de la home, todo en HTML estático
src/content/cases/{es,en}/*.mdx    casos de estudio (esquema Zod en src/content.config.ts)
src/data/profile.ts                otros proyectos, trayectoria, formación, stack y totales
src/i18n/ui.ts                     textos de interfaz ES/EN
src/assets/perfil.png              foto de la credencial (se optimiza a WebP al compilar)
src/scripts/home.ts                cajón de casos, interruptores y carga diferida del 3D
src/scripts/motion.ts              arranque, revelado, contadores, riel de progreso
src/scripts/mesa/mesa.ts           escena 3D (mesa táctica) + regulador de rendimiento
src/scripts/reactor/               núcleo de datos (maqueta /lab/nucleo/)
src/styles/global.css              tokens y estilos Neo-Fósforo
public/cv/                         CV en PDF (ES y EN)
```

## Contenido
- Las cifras salen del perfil auditado contra los repositorios. Si una métrica no se puede comprobar, no se publica.
- `<Todo>TEXTO</Todo>` en el MDX se pinta como `[TEXTO]` en ámbar (texto pendiente).
- La foto se cambia reemplazando `src/assets/perfil.png`; el CV, reemplazando los dos PDF de `public/cv/` con los mismos nombres.

## Rendimiento
La escena mide su propio rendimiento y baja de escalón cuando el equipo no aguanta:
0 calidad del equipo · 1 sin bloom · 2 resolución 0,5 y 30 fps · 3 casi fija · 4 imagen fija sin WebGL activo.
El escalón se recuerda 7 días por equipo (`localStorage nf-lvl`). `?q=low|mid|high` fuerza un nivel de calidad y `?perf=1` expone tiempos en `window.__mesaPerf` para diagnóstico.

## Despliegue
Estático: cualquier hosting sirve `dist/`. En Vercel, Netlify o Cloudflare Pages: directorio raíz `site`, comando `npm run build`, salida `dist`. Cambia `site` en `astro.config.mjs` por el dominio real antes de publicar.
