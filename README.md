# Sebastián Pinzón · Portafolio (Neo-Fósforo)

**En línea:** https://neo-fosforo-portfolio.vercel.app/es/ · [English](https://neo-fosforo-portfolio.vercel.app/en/)

Portafolio personal de **Sebastián Pinzón, Data Engineer junior**. Sitio estático bilingüe (ES/EN) con una escena 3D que explica un pipeline de datos medallion (Bronze → Silver → Gold) sobre una mesa táctica holográfica.

> **EN** — Personal portfolio of Sebastián Pinzón, junior Data Engineer. Static bilingual site (Spanish/English) built with Astro, MDX and Three.js. Every figure on the site links to a public repository; anything unverified is left out.

## Qué hay en el sitio
- **Home**: credencial con foto, prueba de proceso verificable (377 tests en 9 de 12 repos, CI en 6, Docker en 4, una API desplegada), recorrido Bronze/Silver/Gold con la arquitectura real de SparkFlow, 4 casos de estudio, 8 proyectos más, trayectoria, formación y contacto.
- **Casos de estudio** (`/es/work/…`, `/en/work/…`): ficha técnica, arquitectura, decisiones, resultados, limitaciones y enlace al repositorio.
- **CV** descargable en español e inglés.

## Principios
1. **Honestidad de datos**: ninguna cifra sin repositorio que la respalde; cada métrica lleva su advertencia (sesgo de selección, métricas optimistas, datos sintéticos…).
2. **El contenido va primero**: todo el texto está en el HTML; el 3D se carga después y nunca bloquea la lectura.
3. **Fluido en cualquier equipo**: un regulador mide el rendimiento y baja la calidad del 3D por escalones (hasta una imagen fija) en PCs modestos, sin aceleración gráfica o en celulares.
4. **Accesibilidad AA**: contraste, foco visible, objetivos táctiles de 44 px; botón **MOV** para apagar las animaciones y modo **LEGIBLE** sin efectos CRT.

## Estructura
```
site/                         sitio Astro (código fuente; ver site/README.md)
  src/components/Home.astro   home
  src/content/cases/          casos de estudio en MDX (esquema Zod)
  src/data/profile.ts         proyectos, trayectoria, formación y totales verificados
  src/i18n/ui.ts              textos ES/EN
  src/scripts/mesa/mesa.ts    escena 3D (mesa táctica) y regulador de rendimiento
  public/cv/                  CV en PDF (ES y EN)
design-system/                tokens y brand book del estilo Neo-Fósforo
prototype/                    prototipo original de una sola página (referencia histórica)
reference/design-canvas/      pantallas de diseño de referencia
docs/                         decisiones, plan de contenido, principios y hoja de ruta
```

## Ejecutar en local
Requiere Node.js 20 o superior.
```bash
cd site
npm install
npm run dev      # desarrollo en http://localhost:4322
npm run build    # sitio estático en site/dist/
```

## Despliegue
Publicado en **Vercel** (plan gratuito): cada push a `main` se despliega solo. Configuración: directorio raíz `site`, comando `npm run build`, salida `dist`. Si cambia el dominio, actualiza `site` en `site/astro.config.mjs` (lo usan canonical, hreflang y la vista previa al compartir).

## Stack
Astro 7 · MDX · TypeScript · Zod · Three.js · CSS propio (JetBrains Mono).

## Enlaces
- GitHub: [Ares-Infenus](https://github.com/Ares-Infenus)
- LinkedIn: [sebastiandpinzon](https://www.linkedin.com/in/sebastiandpinzon)
- Email: spinzonzambrano@gmail.com
