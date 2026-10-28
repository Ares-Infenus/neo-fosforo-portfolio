# Hoja de ruta

## Fase 0 · Contenido (antes de pulir efectos)
- Completar 3–4 casos con arquitectura, decisiones, métricas con línea base, limitaciones y reproducibilidad.
- Alinear CV, LinkedIn y README de GitHub con el mismo titular.
- Aceptación: 5 personas identifican rol y especialidad en ≤ 10 s (prueba de 5 segundos).

## Fase 1 · Sistema de diseño en código
- Tokens como variables CSS (y Tailwind si se usa), tema de tres canales, modo LEGIBLE.
- Componentes: panel con cabecera, tabla, medidor, badge de estado, pie de teclas, cajón de caso.
- Aceptación: todo el texto ≥ 4.5:1.

## Fase 2 · Sitio base (publicar aquí)
- Astro + MDX + i18n ES/EN, SEO, JSON-LD (Person / ProfilePage con `sameAs`), Open Graph.
- Lighthouse CI en cada PR, axe en cada ruta, Playwright e2e (CV se descarga, enlaces del hero, navegación por teclado).
- Aceptación: CWV "bueno" en laboratorio, 0 violaciones críticas de axe, e2e en verde.

## Fase 3 · Escena 3D como isla
- Portar el prototipo: partículas en shader, placas, cristales de casos, etiquetas, modo explorar.
- Carga diferida, detección de capacidades, fallback SVG estático, pruebas con reduced-motion y sin WebGL.
- Aceptación: LCP sin cambios frente a la versión sin 3D; alternativa funcional; INP ≤ 200 ms durante la interacción.

## Fase 4 · Contenido continuo
- Un artículo técnico cada 6–8 semanas; actualizar casos; monitorizar enlaces rotos.

## Primeras tareas para Claude Code
1. `npm create astro@latest` en `site/` con TypeScript estricto; añadir MDX y Zod para el esquema de casos.
2. Portar tokens y layout del prototipo con el contenido en HTML (sin 3D todavía).
3. Aislar el 3D en un componente de cliente cargado con `client:visible`, con fallback y `prefers-reduced-motion`.
4. Montar i18n por rutas con `hreflang`.
5. Añadir Lighthouse CI, axe y Playwright.
6. Rellenar los placeholders con datos reales, caso por caso.

## Ideas posteriores
- Pipeline animado en SVG como alternativa estática numerada.
- Generador de imágenes Open Graph con la plantilla del sitio.
- Página `/colophon` con stack, rendimiento y declaración del uso de IA.
