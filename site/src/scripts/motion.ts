// Utilidades de movimiento. Todo se desactiva con html.rm (preferencia del sistema o botón MOV)
// y el texto real siempre está en el HTML: las animaciones solo lo "descifran" o lo teclean encima.
export const reduced = document.documentElement.classList.contains('rm');
const finePointer = matchMedia('(pointer:fine)').matches;
const GLYPHS = '█▓▒░<>/\\[]{}#$%&*+=01ABCDEFXZ';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Tareas en curso que se pueden terminar de golpe (al saltar el arranque). */
const live = new Set<() => void>();
export function finishAll() { live.forEach((f) => f()); live.clear(); }

/** Descifra el texto del elemento: glifos aleatorios que se fijan de izquierda a derecha. */
export function decode(el: HTMLElement, duration = 700, delay = 0): Promise<void> {
  const final = el.dataset.final ?? el.textContent ?? '';
  el.dataset.final = final;
  if (reduced || !final.trim()) { el.textContent = final; return Promise.resolve(); }
  const chars = [...final];
  const lockAt = chars.map((_, i) => delay + (i / chars.length) * duration * 0.75 + Math.random() * duration * 0.25);
  const labelled = el.hasAttribute('aria-label');
  if (!labelled) el.setAttribute('aria-label', final);
  return new Promise((resolve) => {
    let t0 = 0, lastPaint = 0, raf = 0;
    const done = () => {
      cancelAnimationFrame(raf);
      el.textContent = final;
      if (!labelled) el.removeAttribute('aria-label');
      live.delete(done);
      resolve();
    };
    live.add(done);
    const step = (now: number) => {
      if (!t0) t0 = now;
      const t = now - t0;
      if (t >= delay + duration) return done();
      if (now - lastPaint > 45) {
        lastPaint = now;
        el.textContent = t < delay
          ? el.textContent!
          : chars.map((c, i) => (c === ' ' || t >= lockAt[i] ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
}

/** Teclea el texto dentro del elemento (el texto original se guarda primero). */
export function type(el: HTMLElement, msPerChar = 18): Promise<void> {
  const final = el.dataset.final ?? el.textContent ?? '';
  el.dataset.final = final;
  if (reduced) { el.textContent = final; return Promise.resolve(); }
  return new Promise((resolve) => {
    let i = 0, timer = 0;
    const done = () => { clearTimeout(timer); el.textContent = final; live.delete(done); resolve(); };
    live.add(done);
    const tick = () => {
      i++;
      el.textContent = final.slice(0, i);
      if (i >= final.length) return done();
      timer = window.setTimeout(tick, msPerChar);
    };
    el.textContent = '';
    tick();
  });
}

/** Contador numérico con salida suave. */
export function count(el: HTMLElement, delay = 0) {
  if (reduced) return;
  const to = parseFloat(el.dataset.to || '0'), dec = Number(el.dataset.dec || 0), suf = el.dataset.suf || '';
  el.textContent = (0).toFixed(dec) + suf;
  setTimeout(() => {
    let t0: number | null = null;
    const step = (t: number) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, delay);
}

// Retardo de entrada (--d) leído del estilo en línea: getComputedStyle forzaría un recálculo de
// estilos de toda la página por cada elemento revelado. La credencial del hero lo toma de la intro.
const delayOf = (el: HTMLElement) => {
  if (el.id === 'proof') return document.documentElement.classList.contains('intro') && !document.documentElement.classList.contains('skip') ? 1500 : 0;
  return (parseFloat(el.style.getPropertyValue('--d')) || 0) * 1000;
};

/** Revelado al entrar en pantalla: paneles, títulos descifrados y contadores. */
export function reveal(els: Iterable<HTMLElement>) {
  const run = (el: HTMLElement) => {
    el.classList.add('in');
    const base = delayOf(el) + (el.classList.contains('pn') ? 450 : 100);
    const targets = el.matches('[data-decode]') ? [el] : Array.from(el.querySelectorAll<HTMLElement>('[data-decode], .case .t'));
    targets.forEach((t) => decode(t, 650, base));
    el.querySelectorAll<HTMLElement>('.cnt').forEach((c) => count(c, base + 150));
  };
  const list = Array.from(els);
  if (!('IntersectionObserver' in window)) { list.forEach((el) => el.classList.add('in')); return; }
  // Un panel recortado con clip-path cuenta como invisible para IntersectionObserver:
  // se observa su contenedor y se revelan los paneles que tiene dentro.
  const groups = new Map<Element, HTMLElement[]>();
  list.forEach((el) => {
    const target = el.classList.contains('pn') && el.parentElement ? el.parentElement : el;
    groups.set(target, [...(groups.get(target) ?? []), el]);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      groups.get(en.target)?.forEach(run);
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  groups.forEach((_, target) => io.observe(target));
}

/** Inclinación 3D y brillo que sigue al puntero en las tarjetas. */
export function tilt(els: Iterable<HTMLElement>) {
  if (reduced || !finePointer) return;
  for (const el of els) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.classList.add('tilting');
      el.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('tilting');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    });
  }
}

/** Barra de progreso de lectura (páginas de caso). */
export function readProgress(bar: HTMLElement) {
  let raf = 0;
  const paint = () => {
    raf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', String(max > 0 ? Math.min(1, scrollY / max) : 1));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
  addEventListener('resize', paint);
  paint();
}

/** Riel lateral: marca el tramo actual del pipeline y rellena según el scroll. */
export function rail(railEl: HTMLElement, navLinks: NodeListOf<HTMLAnchorElement>) {
  const links = Array.from(railEl.querySelectorAll<HTMLAnchorElement>('a[data-rail]'));
  const fill = railEl.querySelector<HTMLElement>('.rail-fill')!;
  const secs = links.map((a) => document.getElementById(a.dataset.rail!)!);
  // Enlaces de la barra: Pipeline cubre bronze/silver/gold.
  const navFor = (id: string) => (['bronze', 'silver', 'gold'].includes(id) ? '#bronze' : `#${id}`);
  let mids: number[] = [], raf = 0, current = -1;
  const measure = () => { mids = secs.map((s) => { const r = s.getBoundingClientRect(); return r.top + scrollY + r.height / 2; }); };
  const paint = () => {
    raf = 0;
    const y = scrollY + innerHeight / 2, n = mids.length;
    let t = 0;
    if (y >= mids[n - 1]) t = n - 1;
    else for (let j = 0; j < n - 1; j++) if (y < mids[j + 1]) { t = j + Math.max(0, (y - mids[j]) / (mids[j + 1] - mids[j])); break; }
    fill.style.setProperty('--p', (t / (n - 1)).toFixed(4));
    const idx = Math.round(t);
    if (idx === current) return;
    current = idx;
    links.forEach((a, i) => { a.classList.toggle('on', i === idx); if (i === idx) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
    const target = idx === 0 ? '' : navFor(secs[idx].id);
    navLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === target));
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { measure(); schedule(); });
  addEventListener('load', () => { measure(); schedule(); });
  document.fonts?.ready.then(() => { measure(); schedule(); });
  measure(); paint();
}

/** Secuencia de arranque de la home. Cualquier tecla, clic o rueda la salta. */
export async function intro() {
  const root = document.documentElement;
  if (!root.classList.contains('intro')) return;
  const boot = document.getElementById('boot')!;
  const name = document.getElementById('name')!;
  const role = document.getElementById('role')!;
  let skipped = false;

  const skip = () => {
    if (skipped) return;
    skipped = true;
    root.classList.add('skip');
    finishAll();
    boot.querySelectorAll('.meter').forEach((m) => { m.classList.remove('pending'); m.classList.add('go'); });
    boot.querySelectorAll<HTMLElement>('[data-type]').forEach((b) => { b.style.visibility = ''; });
    role.classList.remove('tw');
    off();
  };
  const evs = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
  const off = () => evs.forEach((e) => removeEventListener(e, skip));
  evs.forEach((e) => addEventListener(e, skip, { passive: true }));

  // Prepara el log: vacía los textos y el medidor.
  const items = Array.from(boot.querySelectorAll<HTMLElement>('[data-type], .meter'));
  items.forEach((it) => {
    if (it.classList.contains('meter')) it.classList.add('pending');
    else { it.dataset.final = it.textContent || ''; it.textContent = ''; it.style.visibility = 'hidden'; }
  });

  // El nombre se descifra y el rol se teclea mientras corre el log.
  decode(name, 1100, 350);
  wait(1050).then(() => {
    if (skipped) return;
    role.classList.add('tw');
    return type(role, 55).then(() => wait(900)).then(() => role.classList.remove('tw'));
  });

  await wait(250);
  for (const it of items) {
    if (skipped) break;
    if (it.classList.contains('meter')) {
      it.classList.remove('pending'); it.classList.add('go');
      await wait(720);
    } else {
      it.style.visibility = '';
      await type(it, 14);
    }
  }
  await wait(1400);
  off();
}
