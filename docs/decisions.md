# Decisiones de diseño y producto

Formato breve tipo ADR. Cada una indica qué se decidió y el motivo.

## D1. Estilo Neo-Fósforo (terminal CRT/militar neo-retro)
Huella visual para proyectos personales. Referencias mezcladas: Alien/Fallout (terminal industrial), radar táctico tipo Ace Combat, HUD de ficción. Tres canales de color: Fósforo, Ámbar, Hielo.

## D2. Efecto CRT "marcado", después "suavizado"
Primera versión con efecto fuerte (scanlines, bloom, aberración, grano, parpadeo). Tras verla, se pidió algo más suave: se bajan scanlines y resplandor, se redondean los paneles y se suavizan las transiciones. El efecto sigue existiendo, pero el modo LEGIBLE lo apaga por completo.

## D3. De 2.5D a 3D real
El radar 2.5D se sustituyó por una escena Three.js: partículas en shader que pasan de caos a retícula a estructura a través de tres placas (Bronze, Silver, Gold). Debe **explicar** un sistema de datos, no decorar.

## D4. Hero = secuencia de arranque con nombre y rol
Las líneas de arranque son decorativas y breves. El nombre, el rol y los CTA están en el HTML desde el primer instante (regla del informe: la primera pantalla debe resolver "quién es y qué hace" en segundos).

## D5. Dos modos de lectura
CRT completo o LEGIBLE, con interruptor. Dentro de los casos de estudio, LEGIBLE automático con opción de volver al CRT.

## D6. Bilingüe ES/EN con interruptor
El español vive en el HTML; el inglés en atributos `data-en` en el prototipo. En el proyecto real: rutas `/es` y `/en`.

## D7. Posicionamiento: Data Engineer
Titular: "Data Engineer · pipelines y plataformas de datos para ML". ML, visión y análisis cuantitativo son pruebas de amplitud, no identidades paralelas.

## D8. Cuatro casos de estudio
1. SparkFlow Delta Pipeline (caso estrella).
2. Pipeline Airflow + dbt sobre datos de Binance, presupuesto cero. **Se publica como "en construcción".**
3. ML API productiva (FastAPI, Pydantic, Docker, CI).
4. BTC/USDT Price Direction Predictor (caso de rigor: ROC-AUC 0.5431 con walk-forward, resultado modesto documentado).
Los demás proyectos entran al índice `/work` como expedientes cortos.

## D9. Stack objetivo
Astro + MDX + una isla 3D. El 3D del prototipo usa Canvas/WebGL directo con Three.js, sin React Three Fiber, así que Astro encaja y envía menos JavaScript. Next.js estático es la alternativa si se prefiere quedarse en el stack habitual.

## D10. Interacciones 3D
Cámara que viaja con el scroll nativo (sin secuestrarlo), parallax leve con el cursor, cristales por caso con hover y clic que abre el caso, y modo "Explorar en 3D" con órbita libre y zoom.

## Pendiente de decidir
- Actualizar el sistema Neo-Fósforo oficial con la versión suave (tokens y componentes).
- Dominio y nombre del sitio.
- Qué proyectos adicionales entran al índice `/work` y en qué orden.
- Si cada expediente tendrá demo, capturas o enlace a repositorio.
