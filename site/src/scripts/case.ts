// Página de caso: barra de lectura, título descifrado y secciones que entran al hacer scroll.
import { decode, reveal, readProgress } from './motion';

const bar = document.getElementById('readbar');
if (bar) readProgress(bar);

const title = document.querySelector<HTMLElement>('.casepage h1');
if (title) decode(title, 800, 250);

// Cada bloque del MDX entra por separado.
const prose = document.querySelectorAll<HTMLElement>('.prose > *');
prose.forEach((el) => {
  el.classList.add('rv');
  if (el.tagName === 'H2') el.setAttribute('data-decode', '');
});
reveal([...document.querySelectorAll<HTMLElement>('.casepage .rv')]);
