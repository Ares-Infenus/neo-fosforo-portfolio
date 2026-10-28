// Escena 3D del pipeline (Bronze → Silver → Gold → casos). Portada del prototipo r128 a three moderno.
// Este módulo solo se descarga después de pintar el contenido (import dinámico desde home.ts).
import * as THREE from 'three';

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  labels: HTMLElement;
  labelText: string[];
  caseCodes: string[];
  reduced: boolean;
  crt: () => boolean;
  isExploring: () => boolean;
  onPick: (i: number) => void;
}

export interface SceneApi {
  start(): void;
  stop(): void;
  kick(): void;
  explore(v: boolean): void;
  bloom(): void;
}

type Composer = { render(): void; setSize(w: number, h: number): void };

export function initScene(o: SceneOptions): SceneApi {
  const { canvas, reduced } = o;
  const isMobile = innerWidth < 760 || ((navigator as any).deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2;

  // El prototipo se diseñó sin gestión de color (r128): se desactiva para conservar los tonos exactos.
  THREE.ColorManagement.enabled = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const dpr = Math.min(devicePixelRatio || 1, isMobile ? 1.25 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x050809, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050809, 0.011);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

  const C_RAW = new THREE.Color('#7E9189'), C_BRONZE = new THREE.Color('#E8B04A'), C_SILVER = new THREE.Color('#E6EFEA'), C_GOLD = new THREE.Color('#7CF5B0');
  const PZ = [20, 60, 100], PCOL = [C_BRONZE, C_SILVER, C_GOLD];

  /* Partículas: el dato pasa de caos a retícula a estructura */
  const N = isMobile ? 3800 : 9000;
  const pos = new Float32Array(N * 3), raw = new Float32Array(N * 2), lat = new Float32Array(N * 2), seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const x = (Math.random() * 2 - 1) * 19, y = (Math.random() * 2 - 1) * 11.5;
    raw[i * 2] = x; raw[i * 2 + 1] = y;
    lat[i * 2] = Math.round(x / 2.5) * 2.5; lat[i * 2 + 1] = Math.round(y / 2.5) * 2.5;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('aRaw', new THREE.BufferAttribute(raw, 2));
  pg.setAttribute('aLat', new THREE.BufferAttribute(lat, 2));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const uni = {
    uTime: { value: 0 }, uPR: { value: dpr }, uSize: { value: 2.3 },
    uRaw: { value: C_RAW }, uBronze: { value: C_BRONZE }, uSilver: { value: C_SILVER }, uGold: { value: C_GOLD },
  };
  const pm = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPR; uniform float uSize;
      uniform vec3 uRaw; uniform vec3 uBronze; uniform vec3 uSilver; uniform vec3 uGold;
      attribute vec2 aRaw; attribute vec2 aLat; attribute vec4 aSeed;
      varying vec3 vC; varying float vA;
      void main(){
        float spd = 2.4 + aSeed.w * 1.4;
        float z = mod(aSeed.z * 180.0 + uTime * spd, 180.0) - 40.0;
        float o = smoothstep(17.0, 24.0, z) * 0.34 + smoothstep(57.0, 64.0, z) * 0.36 + smoothstep(97.0, 104.0, z) * 0.30;
        vec2 wob = vec2(sin(uTime * 0.8 + aSeed.x * 40.0), cos(uTime * 0.7 + aSeed.y * 40.0)) * (2.2 * (1.0 - o) + 0.12);
        vec2 p = mix(aRaw + wob, aLat, smoothstep(0.30, 0.72, o));
        p *= 1.0 - 0.40 * smoothstep(0.80, 1.0, o);
        vec3 c = mix(uRaw, uBronze, smoothstep(0.0, 0.30, o));
        c = mix(c, uSilver, smoothstep(0.30, 0.66, o)); c = mix(c, uGold, smoothstep(0.66, 1.0, o));
        vC = c;
        vA = smoothstep(-40.0, -28.0, z) * (1.0 - smoothstep(128.0, 140.0, z)) * (0.30 + 0.70 * aSeed.w);
        vec4 mv = modelViewMatrix * vec4(p, z, 1.0);
        gl_PointSize = clamp(uSize * (0.6 + aSeed.w) * uPR * (60.0 / max(0.1, -mv.z)), 1.0, 40.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC, a * a * vA); }`,
  });
  const points = new THREE.Points(pg, pm);
  points.frustumCulled = false;
  scene.add(points);

  /* Placas: Bronze, Silver, Gold */
  const W = 44, H = 28;
  const lineMat = (c: THREE.ColorRepresentation, op: number) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: op });
  const plates = PZ.map((z, idx) => {
    const g = new THREE.Group(); g.position.z = z; const col = PCOL[idx];
    const frame = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-W / 2, -H / 2, 0), new THREE.Vector3(W / 2, -H / 2, 0), new THREE.Vector3(W / 2, H / 2, 0), new THREE.Vector3(-W / 2, H / 2, 0),
    ]), lineMat(col, 0.4));
    const gp: number[] = [];
    for (let a = -W / 2 + 4; a < W / 2; a += 4) gp.push(a, -H / 2, 0, a, H / 2, 0);
    for (let b = -H / 2 + 4; b < H / 2; b += 4) gp.push(-W / 2, b, 0, W / 2, b, 0);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    const grid = new THREE.LineSegments(gg, lineMat(col, 0.12));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    const br: number[] = [], k = 4.5, sx = [-1, 1, 1, -1], sy = [-1, -1, 1, 1];
    for (let q = 0; q < 4; q++) { const cx = sx[q] * W / 2, cy = sy[q] * H / 2; br.push(cx, cy, 0, cx - sx[q] * k, cy, 0, cx, cy, 0, cx, cy - sy[q] * k, 0); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(br, 3));
    const brackets = new THREE.LineSegments(bg, lineMat(col, 0.95));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 72), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(frame, grid, fill, brackets, ring); scene.add(g);
    return { g, frame, fill, ring, brackets };
  });

  /* Túnel de aristas y suelo */
  const tp: number[] = [];
  [-W / 2, W / 2].forEach((px) => [-H / 2, H / 2].forEach((py) => tp.push(px, py, -40, px, py, 140)));
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  scene.add(new THREE.LineSegments(tg, lineMat(0x7cf5b0, 0.09)));
  const floor = new THREE.GridHelper(260, 52, 0x1f3f32, 0x12261e);
  floor.position.set(0, -17, 50);
  (floor.material as THREE.Material).transparent = true;
  (floor.material as THREE.Material).opacity = 0.55;
  scene.add(floor);

  /* Cristales: los casos de estudio */
  const CZ = 140, CR = 13, ringG = new THREE.Group(); ringG.position.set(0, 3, CZ); scene.add(ringG);
  const GEO = [new THREE.IcosahedronGeometry(3.2, 0), new THREE.OctahedronGeometry(3.5, 0), new THREE.DodecahedronGeometry(3.1, 0), new THREE.TetrahedronGeometry(3.9, 0)];
  const CCOL = [C_GOLD, C_BRONZE, C_SILVER, C_GOLD];
  const solids: THREE.Mesh[] = [];
  const crystals = GEO.slice(0, o.caseCodes.length).map((geo, n) => {
    const grp = new THREE.Group(), ang = (n / 4) * Math.PI * 2;
    grp.position.set(Math.cos(ang) * CR, 0, Math.sin(ang) * CR * 0.7);
    const solid = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: CCOL[n], transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    // EXP-02 está en construcción: aristas discontinuas.
    const em = n === 1
      ? new THREE.LineDashedMaterial({ color: CCOL[n], transparent: true, opacity: 0.95, dashSize: 0.55, gapSize: 0.4 })
      : lineMat(CCOL[n], 0.95);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), em);
    if (n === 1) edges.computeLineDistances();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: CCOL[n], transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    solid.userData.idx = n;
    grp.add(solid, edges, core); ringG.add(grp); solids.push(solid);
    return { g: grp, solid, core, h: 0, ph: n * 1.7 };
  });

  /* Etiquetas HTML ancladas a puntos 3D */
  type Lab = { el: HTMLSpanElement; v: THREE.Vector3; crystal?: number };
  const labs: Lab[] = [];
  const addLab = (txt: string, v: THREE.Vector3, color: string, crystal?: number) => {
    const el = document.createElement('span');
    el.className = 'lab'; el.style.setProperty('--c', color); el.textContent = txt;
    o.labels.appendChild(el); labs.push({ el, v, crystal });
  };
  const PHEX = ['#E8B04A', '#E6EFEA', '#7CF5B0'];
  o.labelText.forEach((txt, i) => addLab(txt, new THREE.Vector3(-W / 2, H / 2 + 1.5, PZ[i]), PHEX[i]));
  o.caseCodes.forEach((code, n) => addLab(code, new THREE.Vector3(0, 5.6, 0), '#' + CCOL[n].getHexString(), n));

  /* Cámara: trayecto con el scroll */
  const v3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
  const KP = [[0, 7, -36], [18, 8, 3], [-18, 8, 43], [18, 8, 83], [0, 10, 121], [0, 24, 158]].map(v3);
  const KL = [[0, 0, 12], [0, 0, 20], [0, 0, 60], [0, 0, 100], [0, 4, 140], [0, 2, 140]].map(v3);
  const curveP = new THREE.CatmullRomCurve3(KP, false, 'catmullrom', 0.5), curveL = new THREE.CatmullRomCurve3(KL, false, 'catmullrom', 0.5);
  const vp = new THREE.Vector3(), vl = new THREE.Vector3(), ep = new THREE.Vector3(), ET = new THREE.Vector3(0, 0, 60), tmp = new THREE.Vector3();
  let secs: number[] = [], ts = 0, intro = reduced ? 1 : 0, time = reduced ? 30 : 0, px = 0, py = 0, tx = 0, ty = 0, eb = 0;
  const exo = { yaw: 2.6, pitch: 0.32, dist: 74, drag: false, lx: 0, ly: 0, idle: 0 };

  const measure = () => {
    secs = Array.from(document.querySelectorAll('[data-k]'), (el) => { const r = el.getBoundingClientRect(); return r.top + scrollY + r.height / 2; });
  };

  /* Bloom suave (solo escritorio; se descarga aparte) */
  let composer: Composer | null = null;
  let bloomPass: { strength: number } | null = null;
  const applyBloom = () => { if (bloomPass) bloomPass.strength = o.crt() ? 0.55 : 0.22; };
  if (!isMobile) {
    Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }]) => {
      const c = new EffectComposer(renderer);
      c.addPass(new RenderPass(scene, camera));
      const b = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.85, 0.12);
      c.addPass(b);
      composer = c; bloomPass = b;
      resize(); applyBloom(); kick();
    }).catch(() => { /* sin bloom: se sigue renderizando sin postproceso */ });
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    composer?.setSize(w, h);
    measure();
  }

  /* Puntero y selección de cristales */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = -1, moved = false;
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; ndc.set(tx, -ty); moved = true;
    if (exo.drag) {
      exo.yaw -= (e.clientX - exo.lx) * 0.006;
      exo.pitch = Math.max(-0.2, Math.min(1.25, exo.pitch + (e.clientY - exo.ly) * 0.005));
      exo.lx = e.clientX; exo.ly = e.clientY; exo.idle = 0;
      if (reduced) kick();
    }
  }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => {
    if (!o.isExploring()) return;
    exo.drag = true; exo.lx = e.clientX; exo.ly = e.clientY;
    document.documentElement.classList.add('dragging');
  });
  addEventListener('pointerup', () => { exo.drag = false; document.documentElement.classList.remove('dragging'); });
  canvas.addEventListener('click', () => { if (hover >= 0 && !o.isExploring()) o.onPick(hover); });
  addEventListener('wheel', (e) => {
    if (!o.isExploring()) return;
    exo.dist = Math.max(28, Math.min(130, exo.dist * Math.exp(e.deltaY * 0.001)));
    e.preventDefault();
    if (reduced) kick();
  }, { passive: false });

  function update(dt: number) {
    const exploring = o.isExploring();
    time += reduced ? 0 : dt; uni.uTime.value = time;
    const y = scrollY + innerHeight * 0.5, n = secs.length;
    let t = 0;
    if (n) {
      if (y <= secs[0]) t = 0;
      else if (y >= secs[n - 1]) t = n - 1;
      else for (let j = 0; j < n - 1; j++) if (y < secs[j + 1]) { t = j + (y - secs[j]) / (secs[j + 1] - secs[j]); break; }
    }
    ts = reduced ? t : ts + (t - ts) * (1 - Math.exp(-dt * 3.2));
    const u = Math.max(0, Math.min(1, ts / 5));
    curveP.getPoint(u, vp); curveL.getPoint(u, vl);
    if (intro < 1) { intro = Math.min(1, intro + dt / 3.8); const e = 1 - Math.pow(1 - intro, 3); vp.y += (1 - e) * 16; vp.z -= (1 - e) * 55; }
    px += (tx - px) * (1 - Math.exp(-dt * 4)); py += (ty - py) * (1 - Math.exp(-dt * 4));
    if (!reduced) { vp.x += px * 1.8; vp.y -= py * 1.1; }
    eb = reduced ? (exploring ? 1 : 0) : eb + ((exploring ? 1 : 0) - eb) * (1 - Math.exp(-dt * 3.2));
    if (eb > 0.002) {
      if (!exo.drag && !reduced) { exo.idle += dt; if (exo.idle > 1.5) exo.yaw += dt * 0.09; }
      const cp = Math.cos(exo.pitch);
      ep.set(ET.x + Math.sin(exo.yaw) * cp * exo.dist, ET.y + Math.sin(exo.pitch) * exo.dist, ET.z + Math.cos(exo.yaw) * cp * exo.dist);
      vp.lerp(ep, eb); vl.lerp(ET, eb);
    }
    camera.position.copy(vp); camera.lookAt(vl);

    plates.forEach((p, i) => {
      const act = Math.max(0, 1 - Math.abs(ts - (i + 1))), ph = (time * 0.32 + i * 0.34) % 1;
      (p.frame.material as THREE.LineBasicMaterial).opacity = 0.3 + 0.55 * act;
      (p.fill.material as THREE.MeshBasicMaterial).opacity = 0.03 + 0.08 * act;
      (p.brackets.material as THREE.LineBasicMaterial).opacity = 0.6 + 0.4 * act;
      p.ring.scale.setScalar(2 + ph * 26);
      (p.ring.material as THREE.MeshBasicMaterial).opacity = reduced ? 0 : (1 - ph) * (1 - ph) * 0.35;
      p.g.rotation.z = reduced ? 0 : Math.sin(time * 0.2 + i) * 0.02;
    });

    if (moved && !exploring) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(solids, false);
      hover = hit.length ? (hit[0].object.userData.idx as number) : -1;
      canvas.style.cursor = hover >= 0 ? 'pointer' : '';
      moved = false;
    }
    if (exploring) hover = -1;
    ringG.rotation.y += reduced ? 0 : dt * 0.09;
    crystals.forEach((c, i) => {
      c.h += ((hover === i ? 1 : 0) - c.h) * (reduced ? 1 : 1 - Math.exp(-dt * 8));
      c.g.rotation.y += reduced ? 0 : dt * (0.35 + i * 0.07);
      c.g.rotation.x += reduced ? 0 : dt * 0.12;
      c.g.position.y = reduced ? 0 : Math.sin(time * 0.9 + c.ph) * 0.7;
      c.g.scale.setScalar(1 + c.h * 0.22);
      (c.solid.material as THREE.MeshBasicMaterial).opacity = 0.1 + c.h * 0.22;
      c.core.scale.setScalar(1 + c.h * 1.4 + (reduced ? 0 : Math.sin(time * 2 + c.ph) * 0.15));
    });

    labs.forEach((lb) => {
      if (lb.crystal !== undefined) { crystals[lb.crystal].g.getWorldPosition(tmp); tmp.y += 5.2; } else tmp.copy(lb.v);
      const d = camera.position.distanceTo(tmp); tmp.project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      let a = Math.max(0, Math.min(1, 1.15 - (d - 14) / 62));
      if (exploring) a = vis ? Math.min(1, a + 0.35) : 0;
      lb.el.style.opacity = vis ? a.toFixed(2) : '0';
      if (vis) lb.el.style.transform = `translate(${((tmp.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px,${((-tmp.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%,-120%)`;
    });
  }

  const render = () => { if (composer) composer.render(); else renderer.render(scene, camera); };

  let raf = 0, running = false, active = false, last = 0;
  function frame(now: number) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); render();
  }
  // Con reduced-motion no hay bucle: se pinta un fotograma estático por evento.
  function kick() { if (active && reduced) { update(1); render(); } }
  function start() {
    active = true;
    if (running) return;
    last = performance.now();
    if (reduced) { kick(); return; }
    running = true; raf = requestAnimationFrame(frame);
  }
  function stop() { active = false; running = false; cancelAnimationFrame(raf); }

  addEventListener('resize', () => { resize(); kick(); });
  addEventListener('scroll', () => { if (reduced) kick(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (active) { active = false; start(); }
  });
  document.fonts?.ready.then(measure);
  resize();

  return {
    start, stop, kick,
    explore: () => { exo.idle = 0; kick(); },
    bloom: applyBloom,
  };
}
