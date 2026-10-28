# Principios de la investigación (condensado)

Fuente: informe sobre portafolios de alto impacto para Data Engineering, Data Science e IA. Aquí solo van los criterios accionables.

## Qué dice la evidencia
- La criba inicial es corta: 7,4 s de media en currículums (Ladders 2018, sin revisión por pares) y 10–20 s en páginas web (NN/g 2011). Esas cifras miden la primera decisión "encaja / no encaja", no el tiempo total.
- Los evaluadores técnicos prefieren señales verificables y baratas de comprobar: historial sostenido, repositorios, proyectos (Marlow y Dabbish, CSCW 2013). El currículum sigue siendo el primer filtro para la mayoría (HackerRank 2018).
- Los efectos visuales pueden gustar sin mejorar la eficacia: en un estudio de parallax (HCII 2024) los participantes fueron más rápidos sin él, aunque preferían la versión con él.
- No hay evidencia de que el 3D aumente las contrataciones. Por eso el 3D solo se justifica si **explica** un sistema.
- Para datos e IA, la reputación sale de artefactos reutilizables (repos, plantillas, escritura, visualizaciones explicativas), no de la estética del sitio.

## Reglas derivadas
1. Primera pantalla: nombre, rol, especialidad, una línea de prueba verificable y un CTA.
2. 3–4 casos de estudio profundos antes que 10 tarjetas.
3. Cada afirmación importante enlaza a código, demo o informe.
4. CV en PDF a un clic.
5. Core Web Vitals en "bueno": LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
6. WCAG AA; `prefers-reduced-motion` respetado más un interruptor propio.
7. Una sola pieza 3D, cargada de forma diferida, con alternativa estática.
8. Evitar: scrolljacking, pantallas de carga que retrasan el contenido, barras de porcentaje de habilidades, métricas sin contexto, clonar plantillas icónicas.
9. Declaración de autoría y uso de IA por proyecto.
10. Medir resultados (contactos cualificados, entrevistas), no visitas.

## Presupuesto orientativo para el 3D (por validar)
- Menos de 250 KB de JavaScript comprimido propio para el módulo 3D (más Three.js).
- Limitar DPR a 1,5–2, pausar el render fuera de la pestaña visible.
- Móviles de gama baja: menos partículas y sin bloom (ya implementado en el prototipo).
- Medir INP durante la interacción con la escena.

## Caveats
Hay poca evidencia científica específica sobre portafolios web de perfiles de datos; muchas cifras se extrapolan de currículums, GitHub o páginas en general. Las estadísticas virales sin fuente primaria se excluyeron a propósito.
