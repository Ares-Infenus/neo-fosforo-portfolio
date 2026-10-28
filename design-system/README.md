# Neo-Fósforo

Aura militar ultracompleja sobre monitores CRT de verdad: fósforo, scanlines, bloom, ruido y encendido de pantalla; datos densos, siempre vivos, con visualizaciones en 2.5D. La firma visual de los proyectos hechos por mí, para mí.

## Principios (contenido y voz)

- **Consola de mando, no póster.** Cada pantalla muestra varias lecturas a la vez: coordenadas, rumbos, timestamps, IDs, estados, registros que se actualizan solos.
- **Banner de clasificación.** Toda pantalla seria abre con una franja de nivel de acceso: `NIVEL DE ACCESO: Ω // USO INTERNO`.
- **Estados como texto.** `OK`, `ATENCIÓN`, `CRÍTICO`, `SIN DATOS`. Mensajes cortos en mayúsculas estilo protocolo: `ENLACE ESTABLECIDO`, `OBJETIVO FIJADO`.
- **Honestidad de datos.** Si falta un dato se escribe `SIN DATOS` en `fg-dim`. Nunca se inventa un valor para rellenar, aunque la pantalla se vea mejor llena.
- **IDs cortos:** `SYS-04 // CENTRO DE MANDO`, `BGY-03`, `ENL-02`, `TGT-01`.
- Español por defecto; códigos y claves técnicas pueden ir en inglés.

## Fundamentos visuales

**Un canal de fósforo por pantalla.** El color cambia con el tema, no se mezcla:

| Canal | Primario | Uso sugerido |
|---|---|---|
| Fósforo | `fg` verde | sistemas, infra, ML |
| Ámbar | `fg` ámbar | finanzas, quant, datos |
| Hielo | `fg` blanco verdoso | proyectos de conocimiento y OS personal |

Los tres comparten `state-ok`, `state-warn` y `state-crit`. El rojo es solo para lo crítico real.

**Pantalla CRT real.** Toda pantalla va dentro de una capa CRT: scanlines visibles (`scanline-opacity`), bloom de fósforo (`glow-soft`), aberración cromática en el texto, parpadeo irregular, grano animado, barra de refresco que baja despacio y viñeta (`vignette-opacity`) con esquinas de cristal redondeadas. La intensidad se puede subir o bajar, pero la capa existe siempre.

**Estructura.** Líneas de 1px en `line`, cero esquinas redondeadas dentro de la pantalla (`radius-none`). Paneles con cabecera invertida y corchetes de esquina. La fila o botón activo se invierte igual que la cabecera. Retículas, anillos y marcas de escala por todas partes.

**Profundidad 2.5D.** Lo espacial no se dibuja plano: se proyecta inclinado con ejes, alturas, líneas de caída al suelo, estelas, cubos de alambre y un terreno de rejilla. Debe ser interactivo: arrastrar para rotar, rueda para zoom, clic para fijar un objetivo, y alternar entre vista 2D, 2.5D y lateral.

**Tipografía.** Una sola familia monoespaciada (JetBrains Mono, con IBM Plex Mono y las del sistema de respaldo), etiquetas en MAYÚSCULAS con `letter-spacing` de 0.08em y números tabulares. Carga JetBrains Mono desde Google Fonts: el sistema no incluye el archivo.

**Layout.** Navegación a la izquierda y dos columnas en proporción áurea (1.618 : 1) cuando hay acción y análisis. Toda pantalla cierra con ticker y pie de teclas de función.

## Movimiento

Cada animación sale de una máquina de los 80, nunca de una web moderna:

- **Encendido:** la imagen colapsa a una línea, se expande y baja el brillo (`reiniciar sistema`).
- **Arranque:** líneas de diagnóstico que aparecen una a una con `OK`.
- **Barrido de radar:** el contacto se ilumina al paso del haz y se apaga con persistencia de fósforo.
- **Datos en vivo:** valores que oscilan, volcado hexadecimal que cambia byte a byte, ticker que corre, onda de señal.
- **Cursor `█`** parpadeante y la fila nueva del registro en inversión durante un instante.
- Prohibido: rebotes, fades largos, easing suave de app. Todo se detiene con `prefers-reduced-motion`.

## Iconografía

Sin iconos de color ni emojis. Vocabulario de terminal: box-drawing (`┌ ─ ┐ │ └ ┘`), corchetes, cursor `█`, flechas `▸ ▶`, cuadros `■`, símbolos `Ω`, retículas y puntos de estado.

## Reglas de uso

1. Fondo `bg`; texto principal `fg`; secundario `fg-dim`; marcos `line`.
2. Resalta con inversión (`invert-bg` + `invert-fg`), no con color extra.
3. Un canal más los tres estados por pantalla.
4. Evita: gradientes decorativos, glassmorphism, tarjetas redondeadas, tipografías display "cyberpunk" y animaciones de app moderna.

## Portafolio público

- **Dos modos de lectura.** CRT completo o LEGIBLE (sin scanlines, bloom, aberración, parpadeo, grano ni viñeta, con texto más grande). El visitante elige; el modo CRT es el predeterminado.
- **Bilingüe.** Interruptor ES/EN; el idioma inicial sale del navegador. Todo el texto visible, incluido el arranque, existe en ambos.
- **Arranque como hero.** Líneas de diagnóstico, luego nombre y rol escritos letra a letra. Con `prefers-reduced-motion` todo aparece de golpe.
- **Expedientes.** Cada proyecto lleva ID, dominio, una métrica real, descripción corta y stack. Sin métrica, `SIN DATOS`.
- **Rendimiento.** Sin imágenes ni librerías externas: solo CSS, canvas y una fuente.

## Cómo consumirlo

Importa `tokens.css` y usa `var(--fg)`, `var(--line)`, `var(--font-mono)`. Cambia de canal con `data-theme="ambar"` o `data-theme="hielo"` en `<html>`. La capa CRT y el radar 2.5D están en los previews de `CrtScreen`, `RadarScope`, `Screen` y `Portfolio`: copia su CSS y JS.
