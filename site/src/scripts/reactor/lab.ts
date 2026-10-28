// HUD de la maqueta: arranque automático, telemetría real de la escena, retícula y objetivos.
import { createReactor, type CoreState } from './reactor';
import { reduced, decode } from '../motion';
import * as M from '../motion';

const root = document.documentElement;
root.classList.add('lab-page');
const $ = (id: string) => document.getElementById(id)!;
const hud = $('coreHud'), hint = $('dockHint');
const reticle = $('reticle'), retText = $('retText');
const bootPct = $('bootPct'), bootFill = $('bootFill'), flash = $('ignFlash');

const STATE_TXT: Record<CoreState, string> = { dormant: 'LATENTE', igniting: 'ENCENDIDO…', active: 'EN LÍNEA' };
const fmt = (t: number) => { const m = Math.floor(t / 60), s = t % 60; return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`; };

let last = { fps: '', pts: '', t: '', pct: '' };
createReactor({
  canvas: $('core-gl') as HTMLCanvasElement,
  reduced,
  labelLayer: $('core-labels'),
  nodeLabels: Array.from(document.querySelectorAll<HTMLElement>('[data-core-node] b'), (b) => b.textContent || ''),
  onFrame: (s) => {
    hud.style.transform = `translate(${s.core.x.toFixed(1)}px,${s.core.y.toFixed(1)}px)`;
    hud.style.setProperty('--r', `${s.core.r.toFixed(1)}px`);
    // Telemetría real de la escena (no son métricas del portafolio).
    const fps = String(s.fps), pts = s.particles.toLocaleString('es'), t = fmt(s.t), pct = `${Math.round(s.boot * 100)}%`;
    if (fps !== last.fps) $('hFps').textContent = last.fps = fps;
    if (pts !== last.pts) $('hPts').textContent = last.pts = pts;
    if (t !== last.t) $('hT').textContent = last.t = t;
    if (pct !== last.pct) { bootPct.textContent = last.pct = pct; bootFill.style.setProperty('--p', s.boot.toFixed(3)); }
    if (s.ignition) {
      flash.style.setProperty('--fx', `${s.core.x}px`); flash.style.setProperty('--fy', `${s.core.y}px`);
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      root.classList.add('core-on');
      hint.textContent = 'IGNICIÓN';
    }
  },
  onState: (s) => {
    const st = $('hState'); delete st.dataset.final; st.textContent = STATE_TXT[s]; decode(st, 500);
    if (s === 'igniting') { hint.textContent = 'CARGANDO NÚCLEO…'; }
    if (s === 'active') {
      root.classList.add('core-on', 'core-live');
      const bt = $('bootTxt'); bt.textContent = 'NÚCLEO EN LÍNEA'; delete bt.dataset.final; decode(bt, 600);
      bootPct.textContent = '';
      hint.textContent = 'MUEVE EL CURSOR · PASA POR LOS BOTONES · CLIC PARA PULSO';
      delete hint.dataset.final; M.type(hint, 16);
    }
  },
}).then((api) => {
  api.start();

  // Arranque automático: un instante de núcleo latente y empieza la secuencia.
  const go = () => setTimeout(() => api.activate(), reduced ? 0 : 450);
  if (document.fonts) document.fonts.ready.then(go); else go();

  $('core-gl').addEventListener('click', () => api.pulse());
  addEventListener('nf:crt', (e) => api.setCrt((e as CustomEvent<boolean>).detail));

  /* Objetivos: botones (rayo al botón) y casos (rayo al nodo en órbita) */
  let lockLabel = '';
  const setLock = (label: string) => {
    lockLabel = label;
    reticle.classList.toggle('lock', !!label);
    retText.textContent = label ? `BLOQUEO // ${label}` : '';
  };
  const bind = (el: HTMLElement, on: () => void) => {
    const off = () => { api.target(null); setLock(''); };
    el.addEventListener('pointerenter', on); el.addEventListener('focus', on);
    el.addEventListener('pointerleave', off); el.addEventListener('blur', off);
  };
  document.querySelectorAll<HTMLElement>('[data-core-target]').forEach((el) => bind(el, () => {
    const r = el.getBoundingClientRect();
    api.target({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); setLock(el.dataset.coreTarget!);
  }));
  document.querySelectorAll<HTMLElement>('[data-core-node]').forEach((el) => bind(el, () => {
    api.target({ node: Number(el.dataset.coreNode) }); setLock(el.querySelector('b')?.textContent || '');
  }));

  /* Retícula que sigue al cursor, con coordenadas reales del puntero */
  if (matchMedia('(pointer:fine)').matches) {
    let x = innerWidth / 2, y = innerHeight / 2, sx = x, sy = y, raf = 0;
    const loop = () => {
      sx += (x - sx) * (reduced ? 1 : 0.28); sy += (y - sy) * (reduced ? 1 : 0.28);
      reticle.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
      if (!lockLabel) retText.textContent = `X ${(x / innerWidth * 2 - 1).toFixed(2)}  Y ${(1 - y / innerHeight * 2).toFixed(2)}`;
      raf = Math.abs(x - sx) + Math.abs(y - sy) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; reticle.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    document.addEventListener('pointerleave', () => reticle.classList.remove('on'));
  }
}).catch((err) => { console.error(err); root.classList.add('no3d'); });
