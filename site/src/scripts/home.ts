// Home: cajón de casos, revelado, contadores, resplandor y carga diferida de la escena 3D.
import type { SceneApi } from './scene';
import { reduced, intro, reveal, tilt, rail, decode } from './motion';

type CaseData = {
  code: string; title: string; domain: string; summary: string;
  metric: { label: string; value: string; tone: 'ok' | 'wip' | 'none' };
  stack: string[]; status: string; url: string;
};
type PageData = { cases: CaseData[]; strings: { labels: string[] } };

const root = document.documentElement;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const data: PageData = JSON.parse($('nf-data').textContent || '{}');

/* ---------- Cajón de casos ---------- */
const drawer = $('drawer'), veil = $('veil');
let openIdx = -1;
let lastFocus: HTMLElement | null = null;

function fillDrawer(i: number) {
  const c = data.cases[i];
  $('dId').textContent = c.code;
  $('dTitle').textContent = c.title;
  $('dDom').textContent = c.domain;
  $('dML').textContent = c.metric.label;
  const mv = $('dMV');
  mv.textContent = c.metric.value;
  mv.className = 'm' + (c.metric.tone === 'wip' ? ' w' : c.metric.tone === 'none' ? ' n' : '');
  $('dDesc').textContent = c.summary;
  $('dSt').textContent = c.status;
  $<HTMLAnchorElement>('dFull').href = c.url;
  const tags = $('dTags');
  tags.replaceChildren(...c.stack.map((s) => Object.assign(document.createElement('span'), { className: 'chip', textContent: s })));
}

export function openDrawer(i: number) {
  if (!data.cases[i]) return;
  openIdx = i;
  lastFocus = document.activeElement as HTMLElement | null;
  fillDrawer(i);
  drawer.classList.add('on');
  drawer.setAttribute('aria-hidden', 'false');
  veil.classList.add('on');
  // El contenido cambia en cada apertura: se descifra el texto nuevo.
  ['dTitle', 'dMV'].forEach((id, k) => { delete $(id).dataset.final; decode($(id), 600 + k * 100, 200 + k * 150); });
  setTimeout(() => $('dClose').focus(), 60);
}

function closeDrawer() {
  if (openIdx < 0) return;
  openIdx = -1;
  drawer.classList.remove('on');
  drawer.setAttribute('aria-hidden', 'true');
  veil.classList.remove('on');
  lastFocus?.focus();
}

document.querySelectorAll<HTMLAnchorElement>('.case').forEach((a) => {
  a.addEventListener('click', (e) => {
    // Ctrl/Cmd/Shift-clic abre la página completa como enlace normal.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openDrawer(Number(a.dataset.case));
  });
});
$('dClose').addEventListener('click', closeDrawer);
veil.addEventListener('click', closeDrawer);

// Mantiene el foco dentro del cajón abierto.
drawer.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const f = drawer.querySelectorAll<HTMLElement>('button, a[href]');
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ---------- Arranque, revelado, tarjetas y riel ---------- */
intro();
reveal(document.querySelectorAll<HTMLElement>('.rv'));
tilt(document.querySelectorAll<HTMLElement>('.case'));
rail($('rail'), document.querySelectorAll<HTMLAnchorElement>('.nav a'));

/* ---------- Resplandor que sigue al cursor ---------- */
const glow = $('glow');
if (!reduced && matchMedia('(pointer:fine)').matches) {
  glow.classList.add('on');
  addEventListener('pointermove', (e) => { glow.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
}

/* ---------- 3D ---------- */
const b3d = $<HTMLButtonElement>('b3d');
const bExplore = $<HTMLButtonElement>('bExplore');
let on = !root.classList.contains('no3d');
let exploring = false;
let api: SceneApi | null = null;
let loading: Promise<void> | null = null;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
const webgl = hasWebGL();

function save() { try { localStorage.setItem('nf-3d', on ? '1' : '0'); } catch { /* sin almacenamiento */ } }

function paint3d() {
  b3d.setAttribute('aria-pressed', String(on));
  root.classList.toggle('no3d', !on);
}

function fail() {
  on = false;
  paint3d();
  b3d.hidden = true;
  bExplore.hidden = true;
}

function boot(): Promise<void> {
  if (loading) return loading;
  const sceneName = $('gl').dataset.scene;
  loading = (sceneName === 'mesa' ? import('./mesa/mesa') : import('./scene'))
    .then((m) => {
      api = m.initScene({
        canvas: $<HTMLCanvasElement>('gl'),
        labels: $('labels'),
        labelText: data.strings.labels,
        caseCodes: data.cases.map((c) => c.code),
        reduced,
        crt: () => !root.classList.contains('legible'),
        isExploring: () => exploring,
        onPick: openDrawer,
      });
      $('gl').classList.add('on');
      if (on) api.start();
    })
    .catch((err) => { console.error(err); fail(); });
  return loading;
}

function setExplore(v: boolean) {
  if (v && !on) toggle3d();
  exploring = v;
  root.classList.toggle('explore', v);
  api?.explore(v);
  if (v) $('bExit').focus();
  else bExplore.focus();
}

function toggle3d() {
  on = !on;
  save();
  paint3d();
  if (on) { if (api) api.start(); else boot(); }
  else { api?.stop(); if (exploring) setExplore(false); }
}

if (!webgl) {
  fail();
} else {
  bExplore.hidden = false;
  b3d.addEventListener('click', toggle3d);
  bExplore.addEventListener('click', () => setExplore(true));
  $('bExit').addEventListener('click', () => setExplore(false));
  addEventListener('nf:crt', () => { api?.bloom(); api?.kick(); });
  // El contenido ya está pintado: el 3D se carga en tiempo muerto, sin tocar el LCP.
  if (on) {
    const later = () => ('requestIdleCallback' in window ? requestIdleCallback(() => boot(), { timeout: 1500 }) : setTimeout(boot, 400));
    if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
  }
}

addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (openIdx >= 0) closeDrawer();
  else if (exploring) setExplore(false);
});
