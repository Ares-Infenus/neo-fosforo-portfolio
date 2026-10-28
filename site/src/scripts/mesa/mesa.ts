// Mesa táctica holográfica: fondo 3D de la home.
// Vidrio oscuro con un terreno de datos en puntos que cuenta el pipeline de izquierda a derecha
// (Bronze caótico → Silver alineado → Gold estructurado), tres estructuras, un río de luz,
// radar, sonar y cono de luz volumétrica. Arranque automático y cámara guiada por el scroll.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { SceneApi, SceneOptions } from '../scene';
import { NOISE, RING_FRAG, RING_VERT } from '../glsl';

const MINT = new THREE.Color('#7CF5B0'), ICE = new THREE.Color('#E6EFEA'), AMB = new THREE.Color('#E8B04A');
const DEEP = new THREE.Color('#0B3A2A');

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => { const t = clamp01(v); return 1 - Math.pow(1 - t, 3); };
const easeIO = (v: number) => { const t = clamp01(v); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const W = 30, D = 18;                      // tamaño de la mesa
const SX = [-9.5, 0, 9.5];                 // x de Bronze, Silver, Gold
const riverZ = (x: number) => Math.sin(x * 0.35) * 1.6;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(184,255,215,.6)'); grd.addColorStop(1, 'rgba(124,245,176,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function stripTexture(text: string) {
  const c = document.createElement('canvas'); c.width = 4096; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.font = '600 30px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
  let x = 0; while (x < c.width) { g.fillText(text, x, 34); x += g.measureText(text).width + 60; }
  for (let i = 0; i < c.width; i += 32) g.fillRect(i, 0, 2, i % 160 === 0 ? 14 : 7);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

export function initScene(o: SceneOptions): SceneApi {
  const { canvas, reduced } = o;
  // Nivel de calidad: celulares y tablets bajan geometría, partículas, postproceso y resolución.
  const coarse = matchMedia('(pointer:coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const forced = new URLSearchParams(location.search).get('q');
  const gpuName = (() => {
    try {
      const g = document.createElement('canvas').getContext('webgl2') as WebGL2RenderingContext | null;
      if (!g) return '';
      const e = g.getExtension('WEBGL_debug_renderer_info');
      const name = e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)) : '';
      g.getExtension('WEBGL_lose_context')?.loseContext();
      return name;
    } catch { return ''; }
  })();
  const integrated = /intel|uhd|iris|radeon\(tm\) graphics|vega|mali|adreno|apple gpu|swiftshader|llvmpipe/i.test(gpuName)
    && !/nvidia|geforce|rtx|gtx|quadro|radeon rx|arc\(tm\) a|arc a/i.test(gpuName);
  const tier: 'low' | 'mid' | 'high' = forced === 'low' || forced === 'mid' || forced === 'high' ? forced
    : small ? 'low' : coarse ? (mem >= 6 && cores >= 8 ? 'mid' : 'low') : cores <= 4 || integrated ? 'mid' : 'high';
  const Q = {
    low: { dpr: 1.25, nx: 90, nz: 52, bronze: 50, pkt: 90, dust: 160, bloom: false },
    mid: { dpr: 1.25, nx: 120, nz: 70, bronze: 70, pkt: 160, dust: 400, bloom: true },
    high: { dpr: 2, nx: 170, nz: 100, bronze: 90, pkt: 260, dust: 800, bloom: true },
  }[tier];
  const mobile = tier !== 'high';
  document.documentElement.dataset.q = tier;
  THREE.ColorManagement.enabled = false;

  // Con postproceso el antialias del canvas no se usa (se renderiza a texturas); sin él, en móvil sale caro.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  // En gráficas integradas de escritorio se renderiza a 1× (la pantalla sigue nítida para el texto, que es HTML).
  const dprMax = Math.min(devicePixelRatio || 1, integrated && !coarse && !forced ? 1 : Q.dpr);
  let dpr = dprMax;
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x050809, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050809, 0.026);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  const T = { value: 0 };
  const glowTex = glowTexture();
  const add = THREE.AdditiveBlending;

  /* ---------- Vidrio de la mesa ---------- */
  const tableU = {
    uTime: T, uReveal: { value: -20 }, uMint: { value: MINT }, uAmb: { value: AMB }, uIce: { value: ICE },
    uMouse: { value: new THREE.Vector2(99, 99) }, uMouseA: { value: 0 },
  };
  const table = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, D + 2), new THREE.ShaderMaterial({
    uniforms: tableU, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vP; void main(){ vP = vec2(position.x, -position.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uReveal, uMouseA; uniform vec3 uMint, uAmb, uIce; uniform vec2 uMouse; varying vec2 vP;
      float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - .5) - .5) / fwidth(p / s); return 1. - min(min(g.x, g.y), 1.); }
      void main(){
        float shown = smoothstep(.0, .6, uReveal - vP.x);
        vec2 e = abs(vP) - vec2(${(W / 2).toFixed(1)}, ${(D / 2).toFixed(1)});
        float inside = step(max(e.x, e.y), 0.);
        float g1 = grid(vP, 1.) * .05, g5 = grid(vP, 5.) * .12;
        float edgeD = -max(e.x, e.y);
        float bevel = exp(-edgeD * 2.6) * inside;
        vec3 c = vec3(.012, .035, .028);
        float pools = 0.; vec3 pc = vec3(0.);
        float b = exp(-dot(vP - vec2(-9.5, 0.), vP - vec2(-9.5, 0.)) * .09); pc += uAmb * b;
        float s = exp(-dot(vP, vP) * .09); pc += uIce * s * .7;
        float gd = exp(-dot(vP - vec2(9.5, 0.), vP - vec2(9.5, 0.)) * .09); pc += uMint * gd;
        float m = exp(-dot(vP - uMouse, vP - uMouse) * .6) * uMouseA;
        float ring = smoothstep(.06, 0., abs(length(vP - uMouse) - .9)) * uMouseA;
        vec3 col = c + mix(uMint, uIce, .35) * (g1 + g5) * inside + pc * .16 + uMint * (m * .25 + ring * .9) + uIce * bevel * .07;
        float scan = exp(-pow((vP.x - uReveal) * 2.5, 2.)) * step(uReveal, 18.);
        col += uMint * scan * 1.4;
        float a = (.82 * inside + scan * .6) * max(shown, scan);
        gl_FragColor = vec4(col, a);
      }`,
  }));
  table.rotation.x = -Math.PI / 2; scene.add(table);

  /* ---------- Marco de la mesa: filete fino, estilo instrumento de precisión ---------- */
  // Un hilo color hielo que brilla en las esquinas y se desvanece hacia el centro de cada lado,
  // un segundo filete interior más tenue (bisel) y escuadras menta en las esquinas como único acento.
  const hw = W / 2, hd = D / 2;
  const perimeter = (inset: number, gain: number) => {
    const w = hw - inset, d = hd - inset, r = 0.8;
    const sh = new THREE.Shape();
    sh.moveTo(-w + r, -d); sh.lineTo(w - r, -d); sh.absarc(w - r, -d + r, r, -Math.PI / 2, 0, false);
    sh.lineTo(w, d - r); sh.absarc(w - r, d - r, r, 0, Math.PI / 2, false);
    sh.lineTo(-w + r, d); sh.absarc(-w + r, d - r, r, Math.PI / 2, Math.PI, false);
    sh.lineTo(-w, -d + r); sh.absarc(-w + r, -d + r, r, Math.PI, Math.PI * 1.5, false);
    const pts = sh.getSpacedPoints(480);
    const pos = new Float32Array(pts.length * 3), col = new Float32Array(pts.length * 3);
    pts.forEach((pt, i) => {
      pos.set([pt.x, 0.02, pt.y], i * 3);
      const dist = Math.max(w - Math.abs(pt.x), d - Math.abs(pt.y));      // distancia a la esquina más cercana
      const k = (0.1 + 0.9 * Math.exp(-dist * 0.32)) * gain;
      col.set([ICE.r * k, ICE.g * k, ICE.b * k], i * 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  const hairMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: add, depthWrite: false });
  const frameGeo = perimeter(0, 1), bevelGeo = perimeter(0.38, 0.38);
  const frameCount = frameGeo.attributes.position.count;
  scene.add(new THREE.Line(frameGeo, hairMat), new THREE.Line(bevelGeo, hairMat));

  // Escuadras de esquina (menta)
  const br: number[] = [], o2 = 0.32, arm = 1.5;
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
    const cx = sx * (hw + o2), cz = sz * (hd + o2);
    br.push(cx, 0.02, cz, cx - sx * arm, 0.02, cz, cx, 0.02, cz, cx, 0.02, cz - sz * arm);
  });
  const bracketGeo = new THREE.BufferGeometry(); bracketGeo.setAttribute('position', new THREE.Float32BufferAttribute(br, 3));
  const bracketMat = new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: 0, blending: add, depthWrite: false });
  scene.add(new THREE.LineSegments(bracketGeo, bracketMat));

  // Marcas de escala, finas como la esfera de un reloj (mayores cada 5 unidades)
  const ticks: number[] = [];
  for (let x = -hw + 1; x < hw; x += 1) {
    const L = x % 5 === 0 ? 0.42 : 0.16, z0 = hd + 0.6;
    ticks.push(x, 0.02, z0, x, 0.02, z0 + L, x, 0.02, -z0, x, 0.02, -z0 - L);
  }
  const tickGeo = new THREE.BufferGeometry(); tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
  const tickMat = new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0, blending: add, depthWrite: false });
  scene.add(new THREE.LineSegments(tickGeo, tickMat));
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.62, 0.26), new THREE.MeshBasicMaterial({ map: stripTexture('SYS-04  ·  MESA TÁCTICA  ·  INGESTA  →  LIMPIEZA  →  ESTRUCTURA  ·'), color: ICE, transparent: true, opacity: 0, blending: add, depthWrite: false }));
  strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.02, hd + 1.45); scene.add(strip);

  /* ---------- Terreno holográfico de datos ---------- */
  const NX = Q.nx, NZ = Q.nz;
  const tp = new Float32Array(NX * NZ * 3), tr = new Float32Array(NX * NZ * 2);
  let k = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++, k++) {
    tp[k * 3] = -13.4 + (i / (NX - 1)) * 26.8; tp[k * 3 + 1] = 0; tp[k * 3 + 2] = -7.8 + (j / (NZ - 1)) * 15.6;
    tr[k * 2] = Math.random(); tr[k * 2 + 1] = Math.random();
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.BufferAttribute(tp, 3));
  tg.setAttribute('aRnd', new THREE.BufferAttribute(tr, 2));
  const terrU = {
    uTime: T, uReveal: tableU.uReveal, uRise: { value: 0 }, uPing: { value: -5 }, uPingA: { value: 0 },
    uMouse: tableU.uMouse, uMouseA: tableU.uMouseA, uPR: { value: dpr }, uRadar: { value: 0 },
    uAmb: { value: AMB }, uIce: { value: ICE }, uMint: { value: MINT }, uDeep: { value: DEEP },
  };
  const terrain = new THREE.Points(tg, new THREE.ShaderMaterial({
    uniforms: terrU, transparent: true, depthWrite: false, blending: add,
    vertexShader: NOISE + /* glsl */ `
      uniform float uTime, uReveal, uRise, uPing, uPingA, uMouseA, uPR, uRadar; uniform vec2 uMouse;
      uniform vec3 uAmb, uIce, uMint, uDeep;
      attribute vec2 aRnd; varying vec3 vC; varying float vA;
      void main(){
        vec2 p = position.xz;
        float chaos = smoothstep(-3.5, -9., p.x);
        float order = 1. - smoothstep(2.5, 5.5, abs(p.x));
        float n = snoise(vec3(p * .16, uTime * .04)) * .6 + snoise(vec3(p * .45, uTime * .07 + 3.)) * .25 * (1. - order);
        float hg = n * .5 + .5;
        hg = mix(hg, floor(hg * 5.) / 5., order);                     // Silver: escalonado
        p += ((aRnd - .5) * .4 + vec2(sin(uTime * 1.7 + aRnd.x * 30.), cos(uTime * 1.3 + aRnd.y * 30.)) * .07) * chaos; // Bronze: desorden
        float cl = min(min(length(p - vec2(-9.5, 0.)), length(p)), length(p - vec2(9.5, 0.)));
        float rz = sin(p.x * .35) * 1.6;
        float flatten = smoothstep(1.6, 3.4, cl) * smoothstep(.5, 1.7, abs(p.y - rz));
        float edge = smoothstep(13.4, 11.5, abs(p.x)) * smoothstep(7.8, 6.2, abs(p.y));
        float rise = uRise * smoothstep(0., 3., uReveal - p.x);
        float md = length(p - uMouse); float lift = exp(-md * md * .35) * uMouseA;
        float h = hg * 2.3 * flatten * rise * edge + lift * .6 * rise;
        float r = length(p);
        float ping = exp(-pow((r - uPing) * 1.3, 2.)) * uPingA;
        float d = mod(uRadar - atan(p.y, p.x), 6.28318);
        float radar = exp(-d * 3.) * .9 * rise;
        vec3 zc = mix(uAmb, uIce, smoothstep(-6.5, -1.5, p.x)); zc = mix(zc, uMint, smoothstep(1.5, 6.5, p.x));
        vec3 c = mix(uDeep, zc, clamp(.3 + hg * .9, 0., 1.));
        vC = c * (.75 + h * .45 + ping * 1.6 + radar * .8 + lift * 1.3);
        vA = edge * step(p.x, uReveal) * (.45 + .55 * hg) * (.55 + .45 * flatten);
        vec4 mv = modelViewMatrix * vec4(p.x, .05 + h, p.y, 1.);
        gl_PointSize = clamp((1.4 + hg * 1.6 + ping * 2.) * uPR * (26. / -mv.z), 1.5, 9.);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vC, smoothstep(.5, .1, d) * vA); }`,
  }));
  terrain.frustumCulled = false; scene.add(terrain);

  /* ---------- Estructuras ---------- */
  const boxShader = (color: THREE.Color) => new THREE.ShaderMaterial({
    uniforms: { uTime: T, uBuild: { value: 0 }, uColor: { value: color }, uWave: { value: 0 }, uGain: { value: 1 } },
    transparent: true, depthWrite: false, blending: add, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; varying vec2 vUv; varying float vS; varying float vY;
      void main(){ vUv = uv; vS = aSeed.x; vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uBuild, uWave, uGain; uniform vec3 uColor; varying vec2 vUv; varying float vS; varying float vY;
      void main(){
        if (vS > uBuild) discard;
        float e = max(abs(vUv.x - .5), abs(vUv.y - .5)) * 2.;
        float edge = smoothstep(.8, .97, e);
        float flick = uBuild < 1. ? step(.3, fract(sin(vS * 91. + floor(uTime * 24.)) * 43758.)) : 1.;
        float wave = exp(-pow(vY - mod(uTime * 1.4, 5.) , 2.) * 3.) * uWave;
        gl_FragColor = vec4(uColor * (1. + wave * 1.2), (edge * .85 + .015 + wave * .12) * flick * uGain);
      }`,
  });
  const seeded = (geo: THREE.BufferGeometry, n: number) => { const s = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) s[i] = Math.random(); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(s, 4)); return geo; };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();

  // Bronze: cubos desordenados
  const BN = Q.bronze;
  const bronzeMat = boxShader(AMB);
  bronzeMat.uniforms.uGain.value = 0.55;
  const bronze = new THREE.InstancedMesh(seeded(new THREE.BoxGeometry(1, 1, 1), BN), bronzeMat, BN);
  const bData = Array.from({ length: BN }, () => ({
    p: new THREE.Vector3(SX[0] + (Math.random() - 0.5) * 3, 0.25 + Math.random() * 3.4, (Math.random() - 0.5) * 3),
    r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), s: 0.22 + Math.random() * 0.38,
    w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6),
  }));
  bronze.frustumCulled = false; scene.add(bronze);

  // Silver: retícula perfecta 5×5×5
  const SN = 125, silverMat = boxShader(ICE);
  silverMat.uniforms.uWave.value = 1;
  silverMat.uniforms.uGain.value = 0.28;
  const silver = new THREE.InstancedMesh(seeded(new THREE.BoxGeometry(1, 1, 1), SN), silverMat, SN);
  let si = 0;
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) for (let c = 0; c < 5; c++, si++) {
    m4.compose(v3.set(SX[1] + (a - 2) * 0.55, 0.4 + b * 0.62, (c - 2) * 0.55), q.identity(), s3.setScalar(0.3));
    silver.setMatrixAt(si, m4);
  }
  silver.frustumCulled = false; scene.add(silver);

  // Gold: tablas apiladas (estructura) con anillos HUD y cristal
  const gold = new THREE.Group(); gold.position.set(SX[2], 0, 0); scene.add(gold);
  const discMat = new THREE.ShaderMaterial({
    uniforms: { uTime: T, uA: { value: 0 }, uColor: { value: MINT } },
    transparent: true, depthWrite: false, blending: add, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime, uA; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){ float fr = pow(1. - abs(dot(vN, vV)), 2.); float rows = step(.92, fract(vUv.x * 48.)) * .4;
      gl_FragColor = vec4(uColor * (1. + fr * .6), (.03 + fr * .45 + rows * .2) * uA); }`,
  });
  const discs = Array.from({ length: 5 }, (_, i) => {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - i * 0.12, 1.5 - i * 0.12, 0.16, 64, 1, false), discMat);
    d.position.y = 0.45 + i * 0.62; gold.add(d); return d;
  });
  const crystal = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.55, 0)), new THREE.LineBasicMaterial({ color: ICE, transparent: true, opacity: 0, blending: add }));
  crystal.position.y = 4.1; gold.add(crystal);

  // Anillos de base para las tres estructuras
  const ringMats: THREE.ShaderMaterial[] = [];
  const baseRing = (x: number, color: THREE.Color, r0: number, count: number, duty: number, arcs = 0, op = 0.85) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: T, uR0: { value: r0 }, uR1: { value: r0 + 0.14 }, uCount: { value: count }, uDuty: { value: duty }, uArcs: { value: arcs }, uArcDuty: { value: 0.6 }, uFill: { value: 0 }, uOp: { value: op }, uLive: { value: 1 }, uColor: { value: color } },
      transparent: true, depthWrite: false, blending: add, side: THREE.DoubleSide, vertexShader: RING_VERT, fragmentShader: RING_FRAG,
    });
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + 0.14, 128, 1), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, 0); scene.add(m); ringMats.push(mat);
    return m;
  };
  const rings = [
    baseRing(SX[0], AMB, 2.3, 48, 0.55, 3), baseRing(SX[0], AMB, 2.7, 160, 0.3),
    baseRing(SX[1], ICE, 2.3, 1, 1, 0, 0.35), baseRing(SX[1], ICE, 2.7, 120, 0.4, 0, 0.4),
    baseRing(SX[2], MINT, 2.3, 24, 0.7), baseRing(SX[2], MINT, 2.7, 1, 1, 4),
  ];

  /* ---------- Río de luz ---------- */
  const rPts = Array.from({ length: 48 }, (_, i) => { const x = SX[0] + 1.6 + (i / 47) * (SX[2] - SX[0] - 3.2); return new THREE.Vector3(x, 0.08, riverZ(x)); });
  const curve = new THREE.CatmullRomCurve3(rPts);
  const flowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: T, uReveal: { value: 0 }, uAmb: { value: AMB }, uIce: { value: ICE }, uMint: { value: MINT } },
    transparent: true, depthWrite: false, blending: add,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uTime, uReveal; uniform vec3 uAmb, uIce, uMint; varying vec2 vUv;
      void main(){ vec3 c = mix(uAmb, uIce, smoothstep(.15, .5, vUv.x)); c = mix(c, uMint, smoothstep(.55, .9, vUv.x));
      float p = smoothstep(.8, 1., fract(vUv.x * 6. - uTime * .9)); float head = exp(-pow((vUv.x - uReveal) * 18., 2.)) * step(uReveal, .999);
      gl_FragColor = vec4(c * (1. + p * 1.5 + head * 3.), (.3 + p * .9 + head) * step(vUv.x, uReveal)); }`,
  });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.05, 6, false), flowMat));
  const PN = Q.pkt, pT = new Float32Array(PN * 2);
  for (let i = 0; i < PN; i++) { pT[i * 2] = Math.random(); pT[i * 2 + 1] = 0.05 + Math.random() * 0.08; }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PN * 3), 3));
  pg.setAttribute('aT', new THREE.BufferAttribute(pT, 2));
  const samples = curve.getSpacedPoints(63);
  const pktU = { uTime: T, uReveal: flowMat.uniforms.uReveal, uPts: { value: samples }, uPR: { value: dpr }, uAmb: { value: AMB }, uIce: { value: ICE }, uMint: { value: MINT } };
  const packets = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: pktU,
    transparent: true, depthWrite: false, blending: add,
    vertexShader: /* glsl */ `
      uniform float uTime, uReveal, uPR; uniform vec3 uPts[64]; uniform vec3 uAmb, uIce, uMint;
      attribute vec2 aT; varying vec3 vC; varying float vA;
      void main(){
        float t = fract(aT.x + uTime * aT.y); float f = t * 63.; int i = int(floor(f));
        vec3 p = mix(uPts[i], uPts[min(i + 1, 63)], fract(f)); p.y += .06 + sin(t * 40. + aT.x * 20.) * .03;
        vC = mix(uAmb, uIce, smoothstep(.15, .5, t)); vC = mix(vC, uMint, smoothstep(.55, .9, t));
        vA = step(t, uReveal);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = clamp(3.2 * uPR * (14. / -mv.z), 1.5, 10.); gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vC * 1.6, smoothstep(.5, 0., d) * vA); }`,
  }));
  packets.frustumCulled = false; scene.add(packets);

  /* ---------- Cono de luz volumétrica y polvo ---------- */
  const coneMat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uColor: { value: MINT } },
    transparent: true, depthWrite: false, blending: add, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying float vF; void main(){ vUv = uv; vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; uniform vec3 uColor; varying vec2 vUv; varying float vF; void main(){ float h = 1. - vUv.y; gl_FragColor = vec4(uColor, pow(vF, 2.) * pow(h, 1.6) * uA); }`,
  });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 13, 22, 64, 1, true), coneMat);
  cone.position.set(0, 11, 0); scene.add(cone);
  const DN = Q.dust, dp = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) { const r = Math.sqrt(Math.random()) * 11, a = Math.random() * 6.283; dp.set([Math.cos(a) * r, Math.random() * 14, Math.sin(a) * r * 0.7], i * 3); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xbfeedd, size: 0.05, transparent: true, opacity: 0, depthWrite: false, blending: add });
  const dust = new THREE.Points(dg, dustMat); scene.add(dust);

  /* ---------- Pines de casos ---------- */
  const PIN_COL = [MINT, AMB, ICE, MINT];
  const pickers: THREE.Mesh[] = [];
  const pins = o.caseCodes.map((code, i) => {
    const g = new THREE.Group(); g.position.set(-6 + i * 4, 0, 5.4); scene.add(g);
    const col = PIN_COL[i % 4];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.2, 0)]), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0, blending: add }));
    const gem = new THREE.LineSegments(new THREE.EdgesGeometry([new THREE.IcosahedronGeometry(0.32, 0), new THREE.OctahedronGeometry(0.36, 0), new THREE.DodecahedronGeometry(0.3, 0), new THREE.TetrahedronGeometry(0.42, 0)][i % 4]), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0, blending: add }));
    gem.position.y = 2.5;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: 0, blending: add, depthWrite: false }));
    glow.position.y = 2.5; glow.scale.setScalar(1.3);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 2.3; hit.userData.idx = i; pickers.push(hit);
    g.add(line, gem, glow, hit);
    return { g, line, gem, glow, code, h: 0 };
  });

  /* ---------- Etiquetas HTML ---------- */
  type Lab = { el: HTMLSpanElement; v: THREE.Vector3; pin?: number; a: number; op?: string; tf?: string };
  const labs: Lab[] = [];
  const addLab = (txt: string, v: THREE.Vector3, color: string, pin?: number) => {
    const el = document.createElement('span'); el.className = 'lab'; el.style.setProperty('--c', color); el.textContent = txt;
    o.labels.appendChild(el); labs.push({ el, v, pin, a: 0 });
  };
  ['#E8B04A', '#E6EFEA', '#7CF5B0'].forEach((c, i) => addLab(o.labelText[i], new THREE.Vector3(SX[i], 4.6, 0), c));
  pins.forEach((p, i) => addLab(p.code, new THREE.Vector3(p.g.position.x, 3.25, p.g.position.z), '#' + PIN_COL[i % 4].getHexString(), i));

  /* ---------- Cámara por secciones ---------- */
  const V = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
  const LAND = {
    p: [[-3.5, 13.5, 24], [-15, 5.5, 8.5], [5, 5.5, 9.5], [14, 6.5, 9], [0, 15, 15], [0, 23, 7]],
    l: [[-6.5, -0.5, 0.5], [-12, 1.6, 0], [2.6, 1.6, 0], [7.2, 1.8, 0], [0, 0, 2.6], [0, 0, 0.5]],
    ip: [2, 1.6, 27], il: [0, 0.6, 0], dist: 30,
  };
  // Vertical: la mesa centrada y más abajo, para que el texto del hero quede sobre fondo tranquilo.
  const PORT = {
    p: [[0, 17, 25], [-11.5, 7.5, 12], [0, 7.5, 12.5], [11.5, 8, 12], [0, 19, 19], [0, 25, 9]],
    l: [[0, 5, 0], [-9.5, 3, 0], [0, 3, 0], [9.5, 3, 0], [0, 0, 2], [0, 0, 0.5]],
    ip: [0, 2.2, 34], il: [0, 1.5, 0], dist: 44,
  };
  let curveP = new THREE.CatmullRomCurve3(LAND.p.map(V)), curveL = new THREE.CatmullRomCurve3(LAND.l.map(V));
  const INTRO_P = V(LAND.ip), INTRO_L = V(LAND.il);
  let portrait: boolean | null = null, labsHidden = false;
  const frameFor = (port: boolean) => {
    if (port === portrait) return;
    portrait = port;
    const K = port ? PORT : LAND;
    curveP = new THREE.CatmullRomCurve3(K.p.map(V), false, 'catmullrom', 0.5);
    curveL = new THREE.CatmullRomCurve3(K.l.map(V), false, 'catmullrom', 0.5);
    INTRO_P.fromArray(K.ip); INTRO_L.fromArray(K.il); exo.dist = K.dist;
  };
  const vp = new THREE.Vector3(), vl = new THREE.Vector3(), ep = new THREE.Vector3(), ET = new THREE.Vector3(0, 0, 0), tmp = new THREE.Vector3();
  let secs: number[] = [], ts = 0, px = 0, py = 0, tx = 0, ty = 0, eb = 0;
  const exo = { yaw: 0.5, pitch: 0.75, dist: 30, drag: false, lx: 0, ly: 0, idle: 0 };
  const measure = () => { secs = Array.from(document.querySelectorAll('[data-k]'), (el) => { const r = el.getBoundingClientRect(); return r.top + scrollY + r.height / 2; }); };

  /* ---------- Postproceso ---------- */
  let composer: EffectComposer | null = null, bloom: UnrealBloomPass | null = null, finalPass: ShaderPass | null = null;
  if (Q.bloom) {
    const rt = new THREE.WebGLRenderTarget(innerWidth * dpr, innerHeight * dpr, { type: THREE.HalfFloatType, samples: tier === 'high' && !integrated ? 4 : 0 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(dpr);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.5, 0.6, 0.25);
    // El resplandor no necesita resolución completa: a la mitad cuesta ~4 veces menos y se ve igual.
    const bloomSize = bloom.setSize.bind(bloom);
    bloom.setSize = (w: number, h: number) => bloomSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    composer.addPass(bloom);
    finalPass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uCA: { value: 0 }, uVig: { value: 0.75 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uCA, uVig; varying vec2 vUv;
        void main(){ vec2 d = vUv - .5; float k = dot(d, d);
          vec3 c = vec3(texture2D(tDiffuse, vUv + d * uCA * 4.).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * uCA * 4.).b);
          // Fundido lateral suave: nada aparece cortado de golpe en los bordes de la pantalla.
          float side = smoothstep(0., .14, vUv.x) * smoothstep(1., .86, vUv.x);
          gl_FragColor = vec4(c * (1. - k * uVig) * mix(.12, 1., side), 1.); }`,
    });
    composer.addPass(finalPass);
  }
  const applyBloom = () => { /* el brillo se recalcula cada fotograma según CRT/LEGIBLE */ };

  function resize() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    labsHidden = w < 760;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    // En vertical se abre el campo de visión para que la mesa no quede cortada.
    camera.fov = aspect < 0.9 ? Math.min(62, 40 / aspect * 0.55) : 40;
    camera.updateProjectionMatrix();
    composer?.setSize(w, h);
    frameFor(aspect < 0.9);
    measure();
  }
  const setDpr = (v: number) => {
    dpr = v; renderer.setPixelRatio(v); composer?.setPixelRatio(v);
    renderer.setSize(innerWidth, innerHeight, false); composer?.setSize(innerWidth, innerHeight);
    terrU.uPR.value = v; pktU.uPR.value = v;
  };
  // Apaga el postproceso (bloom) cuando el regulador lo pide.
  const dropBloom = () => { composer?.dispose(); composer = null; bloom = null; finalPass = null; };

  /* ---------- Puntero ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const mouseW = new THREE.Vector3();
  let hover = -1, moved = false, onTable = false;
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; ndc.set(tx, -ty); moved = true;
    if (exo.drag) { exo.yaw -= (e.clientX - exo.lx) * 0.006; exo.pitch = Math.max(0.15, Math.min(1.35, exo.pitch + (e.clientY - exo.ly) * 0.005)); exo.lx = e.clientX; exo.ly = e.clientY; exo.idle = 0; }
  }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { if (o.isExploring()) { exo.drag = true; exo.lx = e.clientX; exo.ly = e.clientY; document.documentElement.classList.add('dragging'); } });
  addEventListener('pointerup', () => { exo.drag = false; document.documentElement.classList.remove('dragging'); });
  canvas.addEventListener('click', () => { if (hover >= 0) o.onPick(hover); else if (onTable) { ping = 0; pingA = 0.8; } });
  addEventListener('wheel', (e) => { if (o.isExploring()) { exo.dist = Math.max(14, Math.min(48, exo.dist * Math.exp(e.deltaY * 0.001))); e.preventDefault(); } }, { passive: false });

  /* ---------- Bucle ---------- */
  let bTick = 0;
  let time = 0, tI = reduced ? 99 : 0, ping = -5, pingA = 0, pinged = false, dimLast = -1;

  function update(dt: number) {
    const exploring = o.isExploring();
    time += reduced ? 0 : dt; T.value = time; tI += dt;

    // Arranque
    const lock = ease((tI - 0.05) / 0.45);
    bracketMat.opacity = 0.9 * lock * (tI < 0.5 ? 0.5 + 0.5 * Math.random() : 1);
    const frameK = ease((tI - 0.25) / 1.1);
    frameGeo.setDrawRange(0, Math.max(2, Math.floor(frameCount * frameK)));
    bevelGeo.setDrawRange(0, Math.max(2, Math.floor(frameCount * ease((tI - 0.45) / 1.1))));
    hairMat.opacity = 0.9 * Math.min(1, frameK * 3);
    tickMat.opacity = 0.22 * ease((tI - 0.9) / 0.8);
    (strip.material as THREE.MeshBasicMaterial).opacity = 0.16 * ease((tI - 1.2) / 1);
    tableU.uReveal.value = tI > 2.6 ? 99 : -17 + 34 * easeIO((tI - 0.6) / 1.8);
    terrU.uRise.value = ease((tI - 1.0) / 1.8);
    const light = ease((tI - 1.5) / 0.7) * (tI < 2.2 ? 0.6 + 0.4 * Math.random() : 1);
    coneMat.uniforms.uA.value = 0.07 * light; dustMat.opacity = 0.45 * light;
    cone.visible = light > 0.01; dust.visible = light > 0.01;
    const build = [0, 1, 2].map((i) => ease((tI - 1.7 - i * 0.3) / 0.9));
    bronzeMat.uniforms.uBuild.value = build[0]; silverMat.uniforms.uBuild.value = build[1];
    discMat.uniforms.uA.value = build[2]; discs.forEach((d, i) => (d.scale.y = Math.max(0.001, ease((tI - 1.9 - i * 0.12) / 0.5))));
    (crystal.material as THREE.LineBasicMaterial).opacity = build[2] * 0.9;
    ringMats.forEach((m, i) => (m.uniforms.uFill.value = ease((tI - 1.6 - (i >> 1) * 0.3 - (i & 1) * 0.15) / 0.8)));
    flowMat.uniforms.uReveal.value = ease((tI - 2.5) / 1.3);
    if (!pinged && tI > 3.1) { pinged = true; ping = 0; pingA = 1.2; }
    terrU.uRadar.value = time * 0.55;
    if (ping >= 0) { ping += dt * 8; pingA *= Math.exp(-dt * 0.9); if (ping > 30) ping = -5; }
    terrU.uPing.value = ping; terrU.uPingA.value = ping >= 0 ? pingA : 0;

    // Animación viva
    bTick = (bTick + 1) % (tier === 'low' ? 3 : 1);
    const bdt = tier === 'low' ? dt * 3 : dt;
    if (bTick === 0) bData.forEach((b, i) => {
      if (!reduced) { b.r.x += b.w.x * bdt; b.r.y += b.w.y * bdt; b.r.z += b.w.z * bdt; }
      const bob = reduced ? 0 : Math.sin(time * 0.8 + i) * 0.06;
      m4.compose(v3.set(b.p.x, b.p.y + bob, b.p.z), q.setFromEuler(e3.copy(b.r)), s3.setScalar(b.s));
      bronze.setMatrixAt(i, m4);
    });
    if (bTick === 0) bronze.instanceMatrix.needsUpdate = true;
    if (!reduced) {
      discs.forEach((d, i) => (d.rotation.y += dt * (0.15 + i * 0.05) * (i % 2 ? -1 : 1)));
      crystal.rotation.y += dt * 0.8; crystal.position.y = 4.1 + Math.sin(time * 1.2) * 0.12;
      rings.forEach((r, i) => (r.rotation.z += dt * (i % 2 ? -0.12 : 0.2)));
      dust.rotation.y += dt * 0.01;
    }

    // Scroll → cámara
    const y = scrollY + innerHeight * 0.5, n = secs.length;
    let t = 0;
    if (n) { if (y <= secs[0]) t = 0; else if (y >= secs[n - 1]) t = n - 1; else for (let j = 0; j < n - 1; j++) if (y < secs[j + 1]) { t = j + (y - secs[j]) / (secs[j + 1] - secs[j]); break; } }
    ts = reduced ? t : ts + (t - ts) * (1 - Math.exp(-dt * 3));
    const u = Math.max(0, Math.min(1, ts / 5));
    curveP.getPoint(u, vp); curveL.getPoint(u, vl);
    const crane = easeIO(tI / 3.8);
    vp.lerpVectors(INTRO_P, vp, crane); vl.lerpVectors(INTRO_L, vl, crane);
    px += (tx - px) * (1 - Math.exp(-dt * 3)); py += (ty - py) * (1 - Math.exp(-dt * 3));
    if (!reduced) { vp.x += px * 1.2; vp.y -= py * 0.7; }
    eb = reduced ? (exploring ? 1 : 0) : eb + ((exploring ? 1 : 0) - eb) * (1 - Math.exp(-dt * 3));
    if (eb > 0.002) {
      if (!exo.drag && !reduced) { exo.idle += dt; if (exo.idle > 1.5) exo.yaw += dt * 0.07; }
      const cp = Math.cos(exo.pitch);
      ep.set(ET.x + Math.sin(exo.yaw) * cp * exo.dist, ET.y + Math.sin(exo.pitch) * exo.dist, ET.z + Math.cos(exo.yaw) * cp * exo.dist);
      vp.lerp(ep, eb); vl.lerp(ET, eb);
    }
    camera.position.copy(vp); camera.lookAt(vl);

    const pinK = exploring ? 1 : smooth(3.2, 3.9, ts);

    // Puntero sobre la mesa y pines
    if (moved) {
      ray.setFromCamera(ndc, camera);
      onTable = !!ray.ray.intersectPlane(tablePlane, mouseW) && Math.abs(mouseW.x) < W / 2 && Math.abs(mouseW.z) < D / 2;
      const hit = ray.intersectObjects(pickers, false);
      hover = hit.length && pinK > 0.3 ? (hit[0].object.userData.idx as number) : -1;
      canvas.style.cursor = hover >= 0 ? 'pointer' : '';
      moved = false;
    }
    if (onTable) tableU.uMouse.value.set(mouseW.x, mouseW.z);
    tableU.uMouseA.value += ((onTable && !reduced ? 1 : 0) - tableU.uMouseA.value) * (1 - Math.exp(-dt * 6));

    // Pines (aparecen al llegar a Casos)
    pins.forEach((p, i) => {
      p.h += ((hover === i ? 1 : 0) - p.h) * (1 - Math.exp(-dt * 8));
      (p.line.material as THREE.LineBasicMaterial).opacity = pinK * (0.5 + p.h * 0.5);
      (p.gem.material as THREE.LineBasicMaterial).opacity = pinK;
      p.glow.material.opacity = pinK * (0.45 + p.h * 0.55);
      p.gem.rotation.y += reduced ? 0 : dt * (0.8 + i * 0.1);
      p.gem.position.y = 2.5 + (reduced ? 0 : Math.sin(time * 1.4 + i) * 0.1);
      p.g.scale.setScalar(0.001 + pinK * (1 + p.h * 0.25));
      p.g.visible = pinK > 0.01;
    });

    // Etiquetas (se apagan cuando la escena pasa a segundo plano)
    const dimNow = exploring ? 0 : smooth(0.35, 1.05, ts);
    const labK = ease((tI - 2.6) / 0.8) * (1 - dimNow);
    if (!labsHidden) labs.forEach((lb) => {
      tmp.copy(lb.v); const d = camera.position.distanceTo(tmp); tmp.project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      let a = labK * Math.max(0, Math.min(1, 1.3 - (d - 8) / 30));
      if (lb.pin !== undefined) a *= pinK;
      const op = vis ? a.toFixed(2) : '0';
      if (op !== lb.op) { lb.op = op; lb.el.style.opacity = op; }
      if (vis && a > 0.01) {
        const tf = `translate(${((tmp.x * 0.5 + 0.5) * innerWidth).toFixed(0)}px,${((-tmp.y * 0.5 + 0.5) * innerHeight).toFixed(0)}px) translate(-50%,-120%)`;
        if (tf !== lb.tf) { lb.tf = tf; lb.el.style.transform = tf; }
      }
    });

    // Protagonista en el hero, discreto después: se oscurece y desenfoca con el scroll
    const dim = exploring ? 0 : smooth(0.35, 1.05, ts);
    const dq = Math.round(dim * 40) / 40;
    if (dq !== dimLast) {
      dimLast = dq;
      canvas.style.opacity = dq > 0 ? (1 - dq * 0.5).toFixed(3) : '';
    }

    const crt = o.crt(), flare = pinged ? Math.exp(-Math.pow((tI - 3.15) * 4, 2)) : 0;
    if (bloom) bloom.strength = (crt ? 0.5 : 0.32) * (1 - dim * 0.4) + flare * 0.5;
    if (finalPass) finalPass.uniforms.uCA.value = flare * 0.0025;
  }

  const render = () => (composer ? composer.render() : renderer.render(scene, camera));
  let raf = 0, running = false, active = false, last = 0, acc = 0;
  // ?perf=1: mide cuánto tarda cada fotograma en calcular y en dibujar (solo para diagnóstico).
  const perf = new URLSearchParams(location.search).has('perf') ? ((window as unknown as { __mesaPerf: { u: number; r: number; n: number } }).__mesaPerf = { u: 0, r: 0, n: 0 }) : null;
  let bg = false;

  /* ---------- Regulador de rendimiento ----------
     Mide el propio rendimiento mientras corre y baja de escalón si el equipo no aguanta:
       0 calidad del equipo · 1 sin bloom, resolución 0,75 · 2 resolución 0,5 y 30 fps
       3 casi fija (≤12 fps) · 4 sin 3D activo: queda de fondo una captura del último fotograma.
     Un tirón pasajero no debe castigar al equipo: el escalón guardado solo sirve de punto de partida
     (siempre uno por encima y como mucho el 2), se sube de nuevo cuando el rendimiento se recupera
     y la imagen fija (4) queda reservada a navegadores sin aceleración gráfica o a un 3D casi detenido. */
  const LVL_KEY = 'nf-lvl2';
  const soft = /swiftshader|llvmpipe|basic render|software/i.test(gpuName);
  let lvl = 0;
  try {
    localStorage.removeItem('nf-lvl'); // versión anterior del regulador, demasiado agresiva
    const saved = JSON.parse(localStorage.getItem(LVL_KEY) || 'null');
    if (saved && saved.gpu === gpuName && Date.now() - saved.t < 7 * 864e5) lvl = Math.max(0, Math.min(2, saved.l - 1));
  } catch { /* sin almacenamiento */ }
  if (soft) lvl = 4;
  else if (cores <= 2) lvl = Math.max(lvl, 2);
  if (forced) lvl = 0;
  const saveLvl = () => { try { localStorage.setItem(LVL_KEY, JSON.stringify({ l: lvl, t: Date.now(), gpu: gpuName })); } catch { /* sin almacenamiento */ } };
  const root = document.documentElement;
  // El modo ligero puede venir del hardware (lo pone el <head>); en ese caso se mantiene al subir de escalón.
  const lowfxByHw = root.classList.contains('lowfx');
  const applyLvl = () => {
    root.dataset.lvl = String(lvl);
    if (lvl >= 1 && composer) dropBloom();
    if (lvl === 1) { if (dpr !== Math.min(0.75, dprMax)) setDpr(Math.min(0.75, dprMax)); if (!lowfxByHw) root.classList.remove('lowfx'); }
    if (lvl >= 2) { if (dpr > 0.5) setDpr(0.5); root.classList.add('lowfx'); }
  };
  // Intervalo mínimo entre fotogramas y fps esperados para cada escalón (primer plano / segundo plano).
  // Los celulares de gama baja van a 30 fps desde el principio (batería y temperatura).
  const half = () => lvl === 2 || (tier === 'low' && lvl < 2);
  const minStep = () => (lvl >= 3 ? (bg ? 1 / 8 : 1 / 12) : half() ? (bg ? 1 / 20 : 1 / 40) : bg ? 1 / 40 : 1 / 75);
  const expected = () => (lvl >= 3 ? 9 : half() ? (bg ? 17 : 27) : bg ? 27 : 52);

  // Escalón 4: una captura fija sustituye al canvas (coste cero de GPU).
  const still = document.createElement('div');
  still.id = 'glStill'; still.hidden = true; still.setAttribute('aria-hidden', 'true');
  canvas.after(still);
  let frozen = false;
  const onStillScroll = () => {
    const d = smooth(0.35, 1.05, scrollY / Math.max(1, innerHeight));
    still.style.opacity = (1 - d * 0.5).toFixed(2);
  };
  function freeze() {
    if (frozen) return;
    frozen = true;
    try {
      update(0); render();
      still.style.backgroundImage = `url(${canvas.toDataURL('image/jpeg', 0.85)})`;
    } catch { /* sin captura: queda el fondo oscuro */ }
    running = false; cancelAnimationFrame(raf);
    still.hidden = false;
    canvas.style.visibility = 'hidden';
    o.labels.style.display = 'none';
    root.classList.add('still3d', 'lowfx');
    addEventListener('scroll', onStillScroll, { passive: true });
    onStillScroll();
  }

  let winStart = 0, winN = 0, winW = 0, bad = 0, good = 0, settle = 4, lastFrameAt = 0;
  // Fluidez de toda la página (no solo del 3D): intervalos entre requestAnimationFrame.
  let prevRaf = 0, rafN = 0, rafLong = 0;
  function trackPage(now: number) {
    const d = now - prevRaf; prevRaf = now;
    if (d > 0 && d < 1500) { rafN++; if (d > 34) rafLong++; }
  }
  function govern(now: number, work: number) {
    // Se ignoran las pausas (pestaña oculta) y el arranque, donde se compilan shaders.
    if (now - lastFrameAt > 1500) { winStart = now; winN = 0; winW = 0; }
    lastFrameAt = now;
    winN++; winW += work;
    const el = now - winStart;
    if (el < 1000) return;
    const fps = (winN * 1000) / el, avgWork = winW / winN;
    const jank = rafN > 10 ? rafLong / rafN : 0;
    winStart = now; winN = 0; winW = 0; rafN = 0; rafLong = 0;
    if (settle > 0) { settle -= el / 1000; return; }
    // Con la ventana sin foco el equipo atiende otras cosas: no se juzga.
    if (!document.hasFocus()) { bad = 0; good = 0; return; }
    const exp = expected();
    // El 3D es lento si no llega a su ritmo o si su cálculo se come el hilo principal.
    const slow3d = fps < exp * 0.7 || avgWork > (1000 / exp) * 0.6;
    // La página pierde fotogramas a menudo (más del 20 % por encima de 34 ms).
    const jankPage = jank > 0.2;
    bad = slow3d || jankPage ? bad + 1 : 0;
    good = !slow3d && !jankPage && fps >= exp * 0.9 && jank < 0.05 ? good + 1 : 0;
    // Bajar: 3 segundos seguidos malos. Los tirones de la página solo bajan hasta el 2;
    // la imagen fija solo llega si el 3D, ya casi fijo, no alcanza ni 5 fps.
    const ceiling = slow3d ? (lvl === 3 && fps < 5 ? 4 : 3) : 2;
    if (bad >= 3 && lvl < ceiling) {
      lvl++; bad = 0; good = 0; settle = 3;
      saveLvl();
      if (lvl === 4) freeze(); else applyLvl();
      return;
    }
    // Subir: 6 segundos seguidos holgados (sin volver al bloom, que ya se liberó).
    if (good >= 6 && lvl >= 2 && lvl <= 3) {
      lvl--; good = 0; settle = 3;
      saveLvl(); applyLvl();
    }
  }

  function frame(now: number) {
    if (!running) return; raf = requestAnimationFrame(frame);
    trackPage(now);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // Segundo plano (escena oscurecida bajo el hero): menos fps. Con histéresis.
    const exploring = o.isExploring();
    const wantBg = !exploring && tI > 5 && (bg ? dimLast > 0.85 : dimLast > 0.95);
    if (wantBg !== bg) { bg = wantBg; root.classList.toggle('scene-bg', bg); }
    acc += dt;
    if (acc < minStep()) return;
    const step = Math.min(0.05, acc); acc = 0;
    const a = performance.now();
    update(step); render();
    const work = performance.now() - a;
    if (perf) { perf.u += work; perf.n++; }
    govern(now, work);
  }
  function kick() { if (active && reduced && !frozen) { update(0); render(); } }
  // Los shaders se compilan sin bloquear la página (KHR_parallel_shader_compile cuando existe).
  const warm: Promise<unknown> = (renderer as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> })
    .compileAsync?.(scene, camera).catch(() => undefined) ?? Promise.resolve();
  function start() {
    active = true;
    if (running || frozen) return;
    warm.then(() => {
      if (!active || running || frozen) return;
      if (lvl >= 4) { tI = 99; freeze(); return; }
      applyLvl();
      last = performance.now();
      if (reduced) { kick(); return; }
      running = true; raf = requestAnimationFrame(frame);
    });
  }
  function stop() { active = false; running = false; cancelAnimationFrame(raf); }

  addEventListener('resize', () => { resize(); kick(); });
  addEventListener('scroll', () => { if (reduced) kick(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (frozen) return; if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (active) { active = false; start(); } });
  addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  resize();

  return { start, stop, kick, explore: () => { exo.idle = 0; kick(); }, bloom: applyBloom };
}
