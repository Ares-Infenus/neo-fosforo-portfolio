# Portafolio de Sebastián Pinzón — Neo-Fósforo

Sitio web público de portafolio para **Data Engineer** (objetivo: empleo remoto internacional, vacantes junior de data engineering). Estilo visual propio llamado **Neo-Fósforo**: terminal CRT/militar suavizada, con una escena 3D que explica un pipeline de datos.

## Estado actual
- `site/`: **el sitio real** (Astro 7 + MDX + TypeScript + Three.js). Home con la mesa táctica holográfica como fondo 3D, 4 casos de estudio en MDX, otros proyectos, perfil, contacto y CV en PDF (ES/EN). Contenido sacado del perfil de LinkedIn auditado contra GitHub (26-oct-2026) y alineado con el CV.
- Datos del contenido: `site/src/data/profile.ts` (proyectos, trayectoria, formación, totales verificados) y `site/src/content/cases/`.
- `prototype/portafolio-3d.html`: prototipo original de una sola página; ya migrado, queda como referencia histórica.
- `design-system/`: tokens (`tokens.json`), brand book (`README.md`) y previews de componentes en HTML. Los previews son de la versión anterior (CRT más fuerte, 2.5D); el prototipo 3D es más suave y es el que manda.
- `reference/design-canvas/`: dos pantallas de diseño (home y plantilla de caso de estudio) hechas en un lienzo propietario (`.dc.html`). Úsalas **solo como referencia de contenido y estructura**; no se ejecutan fuera del lienzo.
- `docs/`: decisiones, plan de contenido, principios de investigación y hoja de ruta.

## Objetivo técnico
- **Astro + MDX + TypeScript**, una sola isla interactiva para el 3D (Three.js, carga diferida). Alternativa aceptable: Next.js con exportación estática.
- Bilingüe **ES/EN** con rutas `/es` y `/en` y `hreflang`. El español es el idioma base.
- Contenido en MDX con esquema validado (Zod) para los casos de estudio.
- Despliegue estático (Vercel, Netlify o Cloudflare Pages).

## Reglas que no se negocian
1. **El contenido va primero.** Nombre, rol y CTA existen en el HTML desde el primer byte. El 3D nunca bloquea el LCP ni el acceso a la evidencia.
2. **Honestidad de datos.** Nada de métricas inventadas. Un dato que falta se escribe `SIN DATOS`; un texto pendiente, `[ASÍ]` en ámbar. Nunca rellenar con cifras plausibles.
3. **Degradación progresiva:** sin JavaScript o sin WebGL, la página sigue completa y legible. Interruptor visible para apagar el 3D.
   **Animación activa por defecto**, aunque el sistema pida `prefers-reduced-motion` (decisión del titular, 2026-10-26). La única forma de apagarla es el botón **MOV** de la barra, que se recuerda (`localStorage nf-motion`) y activa `html.rm`. Con `html.rm` todo se detiene y la página sigue completa.
4. **Accesibilidad AA:** contraste 4.5:1 en texto, foco visible, objetivos táctiles ≥ 44 px, HTML semántico. Lo que se puede hacer con el 3D (abrir un caso) también se puede hacer con teclado en HTML.
5. **Dos modos de lectura:** CRT (suave) y LEGIBLE (sin scanlines ni resplandor). Dentro de los casos de estudio el modo legible se activa solo, con interruptor para volver al CRT.
6. **Sin scrolljacking, sin pantallas de carga que oculten contenido, sin grano animado ni parpadeo en texto largo.**
7. **Privacidad:** no publicar teléfono ni detalles operativos del servicio militar. Email solo como contacto.

## Estilo (resumen)
- Tipografía: JetBrains Mono (una sola familia).
- Paleta: fondo `#050809`, menta `#7CF5B0` (Gold / canal Fósforo), ámbar `#E8B04A` (Bronze / canal Ámbar), hielo `#E6EFEA` (Silver / canal Hielo), crítico `#FF6B5C` solo para alertas reales.
- Bronze, Silver y Gold usan los tres canales del sistema. El estado de cada capa es: Bronze = desordenado, Silver = alineado, Gold = estructura.
- Paneles de vidrio esmerilado con radio de 12 px, cabecera en bloque menta, líneas de 1 px, etiquetas en mayúsculas con 0.1em de tracking.
- Movimiento con propósito: encendido de pantalla, arranque de diagnóstico, barrido y pulso de placas, contadores, cámara con inercia. Todo se detiene con el botón MOV (`html.rm`).
- Escena 3D de referencia: el **núcleo de datos** de `site/src/pages/lab/nucleo.astro` (HUD táctico/holograma, arranque automático con carga, implosión e ignición). Es el nivel de acabado que se busca.

## Flujo de trabajo local
- El titular mira el sitio en `http://localhost:4321` (`npm run stable`, sirve `site/.stable/`). No romper esa vista con cambios a medias.
- Probar en `npm run dev` (puerto 4322) o con `node scripts/serve-test.mjs` (4323) y publicar con `npm run publish:local` solo cuando funcione.

## Primeras tareas sugeridas
Ver `docs/roadmap.md`. Orden: (1) inicializar Astro y portar tokens y layout; (2) migrar el 3D a una isla con carga diferida y fallback; (3) contenido en MDX con el esquema de casos; (4) i18n; (5) Lighthouse CI, axe y Playwright; (6) completar los placeholders con datos reales.

## Datos del titular
- Nombre público: Sebastián Pinzón. GitHub: `Ares-Infenus`. LinkedIn: `linkedin.com/in/sebastiandpinzon`.
- Stack base del autor: Python, FastAPI, Next.js, Docker; PostgreSQL, Qdrant, Neo4j.
- Hablo en español informal y prefiero respuestas directas, sin relleno.
