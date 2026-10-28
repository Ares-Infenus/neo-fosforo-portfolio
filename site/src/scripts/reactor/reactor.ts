// Núcleo de datos: reactor holográfico con anillos HUD, plasma de partículas, columna de energía,
// nodos de casos en órbita y rayos hacia los elementos de la interfaz.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export type CoreState = 'dormant' | 'igniting' | 'active';
export interface FrameStats { fps: number; particles: number; t: number; state: CoreState; boot: number; ignition: boolean; core: { x: number; y: number; r: number } }
export interface ReactorOptions {
  canvas: HTMLCanvasElement;
  reduced: boolean;
  nodeLabels: string[];
  labelLayer: HTMLElement;
  onFrame?: (s: FrameStats) => void;
  onState?: (s: CoreState) => void;
}
export interface ReactorApi {
  activate(): void;
  pulse(): void;
  /** Rayo hacia un punto de pantalla (px) o hacia un nodo de caso. null = sin objetivo. */
  target(t: { x: number; y: number } | { node: number } | null): void;
  setCrt(on: boolean): void;
  stop(): void;
  start(): void;
}

const MINT = new THREE.Color('#7CF5B0'), ICE = new THREE.Color('#E6EFEA'), AMB = new THREE.Color('#E8B04A');
const DEEP = new THREE.Color('#06231A');

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => { const t = clamp01(v); return 1 - Math.pow(1 - t, 3); };
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(184,255,215,.85)');
  grd.addColorStop(0.45, 'rgba(124,245,176,.22)');
  grd.addColorStop(1, 'rgba(124,245,176,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); return t;
}

function textRingTexture(text: string) {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.translate(S / 2, S / 2);
  g.font = '600 38px "JetBrains Mono", monospace';
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const chars = [...text], R = 900, step = (Math.PI * 2) / chars.length;
  chars.forEach((ch, i) => {
    g.save(); g.rotate(i * step); g.translate(0, -R); g.fillText(ch, 0, 0); g.restore();
  });
  // marcas finas por fuera
  g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, r1 = 960, r2 = i % 15 === 0 ? 1010 : 980;
    g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

export async function createReactor(o: ReactorOptions): Promise<ReactorApi> {
  const { canvas, reduced } = o;
  const mobile = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
  THREE.ColorManagement.enabled = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x050809, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050809, 0.035);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const camBase = new THREE.Vector3(0, 1.1, 10.5);
  camera.position.copy(camBase);

  const reactor = new THREE.Group(); scene.add(reactor);
  const tilt = new THREE.Group(); reactor.add(tilt);

  const U = {
    uTime: { value: 0 }, uAct: { value: 0 }, uCharge: { value: 0 }, uBurst: { value: 0 }, uImplode: { value: 0 },
    uPointer: { value: new THREE.Vector3(0, 0, 1) }, uFocus: { value: 0 }, uPR: { value: dpr },
  };

  /* ---------- Núcleo: esfera de plasma con ruido y fresnel ---------- */
  const coreMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uMint: { value: MINT }, uIce: { value: ICE }, uDeep: { value: DEEP } },
    transparent: true,
    vertexShader: NOISE + /* glsl */ `
      uniform float uTime, uAct, uCharge, uFocus; uniform vec3 uPointer;
      varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        vec3 n = normalize(position);
        float e = .25 + uAct * .75;
        float d = snoise(n * 1.7 + uTime * .32) * .5 + snoise(n * 4.2 - uTime * .55) * .22;
        d *= (.05 + .17 * e);
        float f = max(0., dot(n, normalize(uPointer)));
        d += pow(f, 8.) * (.10 + .25 * uFocus) * uAct;
        vD = d;
        vec3 p = position + n * d;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAct, uCharge; uniform vec3 uMint, uIce, uDeep;
      varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        float fr = pow(1. - max(0., dot(vN, vV)), 2.2);
        float e = max(uCharge * .45, uAct);
        float bands = .5 + .5 * sin(vD * 70. - uTime * 3.);
        vec3 c = uDeep * (.5 + .5 * e);
        c += uMint * fr * (.2 + 1.1 * e);
        c += uMint * bands * .10 * e;
        c += uIce * pow(fr, 5.) * .8 * e;
        c += uMint * smoothstep(.12, .3, vD) * .5 * e;
        gl_FragColor = vec4(c, .55 + .45 * fr);
      }`,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, mobile ? 24 : 64), coreMat);
  tilt.add(core);

  const glowTex = glowTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: MINT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(5.5); tilt.add(glow);
  const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  heart.scale.setScalar(1.6); tilt.add(heart);

  /* ---------- Coraza geodésica ---------- */
  const shellGeo = new THREE.IcosahedronGeometry(1.75, 2);
  const shell = new THREE.Group(); tilt.add(shell);
  const shellLines = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo, 1), new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  const shellDots = new THREE.Points(shellGeo, new THREE.PointsMaterial({ color: ICE, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  shell.add(shellLines, shellDots);

  /* ---------- Plasma de partículas en órbita ---------- */
  const N = mobile ? 2600 : 7000;
  const aP0 = new Float32Array(N * 3), aAxis = new Float32Array(N * 3), aMisc = new Float32Array(N * 4);
  const v = new THREE.Vector3(), ax = new THREE.Vector3(), tmpV = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    ax.randomDirection();
    // eje sesgado hacia "arriba" para que el plasma forme bandas, no una nube
    if (i % 3 !== 0) ax.lerp(new THREE.Vector3(0, 1, 0), 0.65).normalize();
    v.randomDirection(); tmpV.copy(ax).multiplyScalar(v.dot(ax)); v.sub(tmpV).normalize();
    aP0.set([v.x, v.y, v.z], i * 3); aAxis.set([ax.x, ax.y, ax.z], i * 3);
    const band = Math.random();
    const r = band < 0.55 ? 1.35 + Math.random() * 0.5 : band < 0.9 ? 2.0 + Math.random() * 0.9 : 3.0 + Math.random() * 2.2;
    aMisc.set([r, (0.15 + Math.random() * 0.5) * (Math.random() < 0.5 ? -1 : 1) / Math.sqrt(r), Math.random() * 6.283, Math.random()], i * 4);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(aP0, 3));
  pg.setAttribute('aAxis', new THREE.BufferAttribute(aAxis, 3));
  pg.setAttribute('aMisc', new THREE.BufferAttribute(aMisc, 4));
  const plasma = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: { ...U, uMint: { value: MINT }, uIce: { value: ICE }, uAmb: { value: AMB } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uAct, uBurst, uPR, uCharge, uImplode; uniform vec3 uMint, uIce, uAmb;
      attribute vec3 aAxis; attribute vec4 aMisc; varying vec3 vC; varying float vA;
      vec3 rot(vec3 p, vec3 a, float t){ float c = cos(t), s = sin(t); return p * c + cross(a, p) * s + a * dot(a, p) * (1. - c); }
      void main(){
        float e = max(uCharge * .3, uAct);
        float spd = aMisc.y * (.35 + 1.4 * e);
        vec3 p = rot(position, aAxis, aMisc.z + uTime * spd + uImplode * uImplode * aMisc.y * 14.);
        float r = aMisc.x * mix(.55, 1., e) * (1. + uBurst * (1.5 + 2.5 * aMisc.w));
        r *= mix(1., .16 + .1 * aMisc.w, uImplode);
        r += sin(uTime * 1.3 + aMisc.z * 3.) * .04;
        p *= r;
        vC = aMisc.w < .08 ? uAmb : (aMisc.w < .33 ? uIce : uMint);
        vA = (.1 + .6 * e + uImplode * .5) * (.35 + .65 * aMisc.w) * (aMisc.x > 3. ? .45 : 1.);
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = clamp((1.2 + aMisc.w * 2.2) * uPR * (9. / -mv.z), 1., 18.);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vC, a * a * vA); }`,
  }));
  plasma.frustumCulled = false; tilt.add(plasma);

  /* ---------- Anillos HUD (giroscopio) ---------- */
  type Ring = { m: THREE.Mesh; mat: THREE.ShaderMaterial; spin: number; delay: number; base: THREE.Euler };
  const ringMatFor = (r0: number, r1: number, color: THREE.Color, opts: { count: number; duty: number; arcs?: number; arcDuty?: number; op: number }) =>
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: U.uTime, uR0: { value: r0 }, uR1: { value: r1 }, uColor: { value: color },
        uCount: { value: opts.count }, uDuty: { value: opts.duty }, uArcs: { value: opts.arcs ?? 0 }, uArcDuty: { value: opts.arcDuty ?? 1 },
        uFill: { value: 0 }, uOp: { value: opts.op }, uLive: { value: 0 },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uR0, uR1, uCount, uDuty, uArcs, uArcDuty, uFill, uOp, uLive; uniform vec3 uColor; varying vec2 vP;
        void main(){
          float a = atan(vP.y, vP.x) / 6.28318 + .5;
          float r = (length(vP) - uR0) / (uR1 - uR0);
          float m = step(fract(a * uCount), uDuty);
          if (uArcs > 0.) m *= step(fract(a * uArcs + .13), uArcDuty);
          m *= step(a, uFill);
          float scan = smoothstep(.06, 0., abs(fract(a - uTime * .08) - .5) - .44);
          float edge = smoothstep(0., .2, r) * smoothstep(1., .8, r);
          float al = m * edge * uOp * (.6 + .4 * uLive + scan * 1.2 * uLive);
          gl_FragColor = vec4(uColor * (1. + scan * uLive), al);
        }`,
    });
  const ringDefs = [
    { r: 2.35, w: 0.035, c: MINT, count: 1, duty: 1, op: 0.9, rot: [1.35, 0, 0], spin: 0.25 },
    { r: 2.5, w: 0.11, c: MINT, count: 140, duty: 0.35, op: 0.7, rot: [1.35, 0, 0], spin: -0.12 },
    { r: 2.85, w: 0.07, c: AMB, count: 36, duty: 0.75, arcs: 3, arcDuty: 0.42, op: 0.85, rot: [1.1, 0.35, 0], spin: 0.4 },
    { r: 3.25, w: 0.025, c: ICE, count: 1, duty: 1, arcs: 5, arcDuty: 0.7, op: 0.55, rot: [1.6, -0.25, 0.2], spin: -0.22 },
    { r: 3.6, w: 0.16, c: MINT, count: 360, duty: 0.18, op: 0.45, rot: [1.42, 0.05, 0], spin: 0.06 },
    { r: 2.1, w: 0.05, c: ICE, count: 8, duty: 0.6, op: 0.6, rot: [0.2, 1.2, 0], spin: 0.6 },
  ];
  const rings: Ring[] = ringDefs.map((d, i) => {
    const mat = ringMatFor(d.r, d.r + d.w, d.c, d);
    const m = new THREE.Mesh(new THREE.RingGeometry(d.r, d.r + d.w, 256, 1), mat);
    const base = new THREE.Euler(d.rot[0], d.rot[1], d.rot[2]);
    m.rotation.copy(base);
    tilt.add(m);
    return { m, mat, spin: d.spin, delay: i * 0.18, base };
  });

  // Anillo de texto
  await document.fonts?.load('600 38px "JetBrains Mono"').catch(() => undefined);
  const txt = ' SYS-04 // NÚCLEO DE DATOS // BRONZE · SILVER · GOLD // PIPELINE EN LÍNEA // INGESTA · LIMPIEZA · ESTRUCTURA //';
  const textRing = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 8.6), new THREE.MeshBasicMaterial({ map: textRingTexture(txt), color: MINT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  textRing.rotation.x = -Math.PI / 2 + 0.22; textRing.position.y = -0.35; tilt.add(textRing);

  /* ---------- Columna de energía ---------- */
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uA: { value: 0 }, uColor: { value: MINT } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying float vF; void main(){ vUv = uv; vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vF = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime, uA; uniform vec3 uColor; varying vec2 vUv; varying float vF;
      void main(){ float y = abs(vUv.y - .5) * 2.; float fade = pow(1. - y, 2.2); float bands = .55 + .45 * sin(vUv.y * 90. - uTime * 9.);
      gl_FragColor = vec4(uColor * (1. + vF), fade * pow(vF, 1.5) * bands * uA); }`,
  });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 18, 32, 1, true), beamMat);
  column.scale.y = 0.001; reactor.add(column);

  /* ---------- Suelo polar con onda expansiva ---------- */
  const groundMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uAct: U.uAct, uWave: { value: 0 }, uWaveA: { value: 0 }, uColor: { value: MINT }, uAmb: { value: AMB } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uAct, uWave, uWaveA; uniform vec3 uColor, uAmb; varying vec2 vP;
      float line(float f, float w){ float d = abs(fract(f) - .5); float fw = fwidth(f); return 1. - smoothstep(w * fw, (w + 1.5) * fw, .5 - d); }
      void main(){
        float r = length(vP); float a = atan(vP.y, vP.x) / 6.28318;
        float rings = line(r * 1.25, 0.);
        float radial = line(a * 48., 0.) * smoothstep(1.2, 2.5, r);
        float fade = exp(-r * .16) * smoothstep(.6, 1.8, r);
        float sweep = smoothstep(.08, 0., abs(fract(a - uTime * .05) - .5) - .41) * smoothstep(9., 2., r);
        float wave = exp(-pow((r - uWave) * 1.6, 2.)) * uWaveA;
        float al = (rings * .3 + radial * .12) * fade * (.3 + .7 * uAct) + sweep * .1 * uAct + wave * .45 * fade * 4.;
        gl_FragColor = vec4(mix(uColor, uAmb, wave * .35), al);
      }`,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -2.7; reactor.add(ground);

  /* ---------- Polvo de fondo ---------- */
  const DN = mobile ? 500 : 1400, dpos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) dpos.set([(Math.random() - 0.5) * 60, (Math.random() - 0.3) * 30, -Math.random() * 50 + 6], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x9fd8bb, size: 0.06, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- Nodos de casos en órbita ---------- */
  const NODE_COL = [MINT, AMB, ICE, MINT];
  const nodes = o.nodeLabels.map((label, i) => {
    const g = new THREE.Group();
    const geo = [new THREE.IcosahedronGeometry(0.26, 0), new THREE.OctahedronGeometry(0.3, 0), new THREE.DodecahedronGeometry(0.25, 0), new THREE.TetrahedronGeometry(0.34, 0)][i % 4];
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: NODE_COL[i % 4], transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: NODE_COL[i % 4], transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(0.9); g.add(s);
    tilt.add(g);
    const el = document.createElement('span'); el.className = 'core-lab'; el.textContent = label; el.style.setProperty('--c', '#' + NODE_COL[i % 4].getHexString());
    o.labelLayer.appendChild(el);
    return { g, s, el, r: 3.9 + (i % 2) * 0.45, inc: 0.32 - i * 0.16, ph: (i / 4) * Math.PI * 2, h: 0 };
  });

  /* ---------- Rayo hacia objetivos ---------- */
  const rayMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uA: { value: 0 }, uColor: { value: MINT } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uTime, uA; uniform vec3 uColor; varying vec2 vUv;
      void main(){ float p = smoothstep(.75, 1., fract(vUv.x * 4. - uTime * 2.2)); float ends = smoothstep(0., .08, vUv.x) * smoothstep(1., .9, vUv.x);
      gl_FragColor = vec4(uColor * (1.2 + p * 2.), (.35 + p) * ends * uA); }`,
  });
  let ray: THREE.Mesh | null = null;
  const rayEnd = new THREE.Vector3();
  const impact = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: MINT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(impact);
  let targetNode = -1, targetScreen: { x: number; y: number } | null = null, rayA = 0;
  const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(), ndc = new THREE.Vector2();
  const screenToWorld = (x: number, y: number, out: THREE.Vector3) => {
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const coreW = reactor.getWorldPosition(tmpV);
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), coreW);
    raycaster.ray.intersectPlane(plane, out);
    return out;
  };
  const buildRay = (from: THREE.Vector3, to: THREE.Vector3) => {
    const mid = from.clone().lerp(to, 0.5); mid.y += from.distanceTo(to) * 0.22;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    ray?.geometry.dispose();
    const geo = new THREE.TubeGeometry(curve, 64, 0.022, 6, false);
    if (!ray) { ray = new THREE.Mesh(geo, rayMat); ray.frustumCulled = false; scene.add(ray); } else ray.geometry = geo;
  };

  /* ---------- Postproceso ---------- */
  let composer: EffectComposer | null = null, bloom: UnrealBloomPass | null = null, finalPass: ShaderPass | null = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.55, 0.32);
    composer.addPass(bloom);
    finalPass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uCA: { value: 0.0012 }, uVig: { value: 0.9 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uCA, uVig; varying vec2 vUv;
        void main(){ vec2 d = vUv - .5; float k = dot(d, d);
          vec3 c = vec3(texture2D(tDiffuse, vUv + d * uCA * 4.).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * uCA * 4.).b);
          c *= 1. - k * uVig; gl_FragColor = vec4(c, 1.); }`,
    });
    composer.addPass(finalPass);
  }

  /* ---------- Arcos eléctricos (carga) ---------- */
  const ARC_PTS = 14;
  const arcs = Array.from({ length: mobile ? 4 : 8 }, (_, i) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_PTS * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: i % 3 === 0 ? ICE : MINT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    l.frustumCulled = false; tilt.add(l);
    return l;
  });
  const arcA = new THREE.Vector3(), arcB = new THREE.Vector3(), arcP = new THREE.Vector3(), arcJ = new THREE.Vector3();
  const zap = (l: THREE.Line, r0: number, r1: number) => {
    arcA.randomDirection().multiplyScalar(r0);
    arcB.copy(arcA).normalize().add(arcJ.randomDirection().multiplyScalar(0.7)).normalize().multiplyScalar(r1);
    const pos = l.geometry.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < ARC_PTS; k++) {
      const t = k / (ARC_PTS - 1);
      arcP.lerpVectors(arcA, arcB, t);
      const j = Math.sin(t * Math.PI) * 0.22;
      arcP.add(arcJ.randomDirection().multiplyScalar(j * Math.random()));
      pos.setXYZ(k, arcP.x, arcP.y, arcP.z);
    }
    pos.needsUpdate = true;
  };

  /* ---------- Esfera de choque (ignición) ---------- */
  const shockMat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uColor: { value: ICE } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying float vF; void main(){ vec3 n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vF = 1. - abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; uniform vec3 uColor; varying float vF; void main(){ gl_FragColor = vec4(uColor, pow(vF, 3.) * uA); }`,
  });
  const shock = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), shockMat);
  shock.visible = false; tilt.add(shock);

  /* ---------- Estado, puntero y tiempo ---------- */
  let state: CoreState = 'dormant', tA = 0, time = 0, wave = -1, waveA = 0, shake = 0, crt = true;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const ptrWorld = new THREE.Vector3();
  addEventListener('pointermove', (e) => { ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = -(e.clientY / innerHeight) * 2 + 1; screenToWorld(e.clientX, e.clientY, ptrWorld); }, { passive: true });

  const setState = (s: CoreState) => { if (state !== s) { state = s; o.onState?.(s); } };

  function layout() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    renderer.setSize(w, h, false); camera.aspect = aspect; camera.updateProjectionMatrix();
    composer?.setSize(w, h); bloom?.setSize(w, h);
    // En pantallas anchas el núcleo va a la derecha; en estrechas, arriba.
    if (aspect > 1.15) { reactor.position.set(Math.min(3.6, 1.6 + aspect * 1.1), 0, 0); camBase.set(0, 1.1, 10.5); }
    else { reactor.position.set(0, 1.9, 0); camBase.set(0, 1.4, 13.5); }
  }

  let fpsAcc = 0, fpsN = 0, fps = 60;
  function update(dt: number) {
    time += dt; U.uTime.value = time;
    if (state !== 'dormant') tA += dt;
    const IGN = 2.0, END = IGN + 3;
    if (state === 'igniting' && tA > END) setState('active');
    const on = state !== 'dormant';

    // 1) Carga: todo se comprime hacia el centro y se acelera
    const c = on ? clamp01(tA / IGN) : 0;
    const before = on && tA < IGN;
    const charge = !on ? 0.12 + 0.1 * Math.sin(time * 1.7) : before ? 0.15 + 0.85 * c * c * (0.88 + 0.12 * Math.random()) : 1;
    const act = on ? smooth(IGN - 0.05, IGN + 1.0, tA) : 0;
    U.uCharge.value = charge; U.uAct.value = act;
    // justo antes de estallar, todo se apaga un instante (contraste)
    const suck = before ? smooth(IGN - 0.35, IGN - 0.02, tA) : 0;
    const implode = before ? smooth(0.1, 1, c) : U.uImplode.value * Math.exp(-dt * 14);
    U.uImplode.value = implode;

    // 2) Ignición
    const ignited = on && tA - dt < IGN && tA >= IGN;
    if (ignited) { U.uBurst.value = 1.15; wave = 0; waveA = 1.2; shake = 1.6; shock.visible = true; }
    U.uBurst.value *= Math.exp(-dt * 1.5);
    if (wave >= 0) { wave += dt * 10; waveA *= Math.exp(-dt * 1.1); if (wave > 26) wave = -1; }
    groundMat.uniforms.uWave.value = wave; groundMat.uniforms.uWaveA.value = wave >= 0 ? waveA : 0;
    const ts = tA - IGN;
    if (shock.visible) {
      const k = clamp01(ts / 1.3);
      shock.scale.setScalar(1 + ease(k) * 13);
      shockMat.uniforms.uA.value = (1 - k) * (1 - k) * 1.4;
      if (k >= 1) shock.visible = false;
    }

    // núcleo y brillo
    const flare = on ? Math.exp(-Math.pow(ts * 5, 2)) : 0;
    glow.material.opacity = (0.05 + charge * 0.18 + act * 0.22) * (1 - suck * 0.85) + flare * 0.7;
    glow.scale.setScalar((before ? 2.4 + c * 1.4 : 3.6 + act * 0.9) * (1 - suck * 0.4) + flare * 2.6 + Math.sin(time * 2.4) * 0.12 * act);
    heart.material.opacity = before ? 0.1 + c * c * 0.9 : 0.1 + act * 0.35 + flare * 0.9;
    heart.scale.setScalar(before ? 0.6 + c * 1.3 - suck * 0.5 : 1.6 + flare * 2.2);
    core.scale.setScalar(before ? 0.8 - c * 0.12 - suck * 0.1 : 0.8 + 0.2 * act + flare * 0.2);
    shell.rotation.y += dt * (0.05 + 0.15 * act + implode * 1.2); shell.rotation.x += dt * (0.03 + implode * 0.4);
    const shellOut = on && !before ? ease(ts / 0.9) : 0;
    shell.scale.setScalar(before ? 0.82 - c * 0.14 : 0.68 + 0.32 * shellOut + Math.sin(clamp01(ts / 0.9) * Math.PI) * 0.12);
    (shellLines.material as THREE.LineBasicMaterial).opacity = 0.07 + 0.2 * act + c * 0.12 * (before ? 1 : 0);
    (shellDots.material as THREE.PointsMaterial).opacity = 0.2 + 0.6 * act;

    // arcos: crecen con la carga, se apagan tras la ignición, chispas sueltas después
    const arcI = before ? smooth(0.2, 0.95, c) * (1 - suck * 0.7) : on ? Math.max(Math.exp(-ts * 3), 0.12) : 0;
    arcs.forEach((l, i) => {
      const m = l.material as THREE.LineBasicMaterial;
      const chance = before ? 0.35 : 0.04;
      if (arcI > 0.01 && Math.random() < chance) { zap(l, before ? 1.7 : 1.75, before ? 0.95 : 2.6 + Math.random()); m.opacity = arcI * (0.6 + 0.4 * Math.random()); }
      else m.opacity *= Math.exp(-dt * (before ? 18 : 10));
      l.visible = m.opacity > 0.01 && (i < 3 || before || ts < 1);
    });

    // anillos: calibración con parpadeo durante la carga, despliegue escalonado tras la ignición
    rings.forEach((r, i) => {
      let k: number, flick = 1;
      if (!on) k = i === 0 ? 0.18 : 0;
      else if (before) { k = c * (0.25 + 0.1 * i) ; flick = c > 0.25 && Math.random() < 0.25 ? 0.15 : 1; }
      else k = ease((ts - 0.12 - r.delay) / 0.7);
      r.mat.uniforms.uFill.value = k; r.mat.uniforms.uLive.value = act;
      r.mat.uniforms.uOp.value = ringDefs[i].op * flick * (1 - suck * 0.6);
      const over = !before && on ? Math.sin(clamp01((ts - 0.12 - r.delay) / 0.7) * Math.PI) * 0.09 : 0;
      r.m.scale.setScalar((before ? 0.62 - c * 0.08 : 0.62 + 0.38 * k) + over);
      r.m.rotation.z += dt * r.spin * (0.3 + 0.7 * act + implode * 3);
    });
    (textRing.material as THREE.MeshBasicMaterial).opacity = 0.55 * ease((ts - 0.9) / 1);
    textRing.rotation.z -= dt * 0.04;

    const beamK = ease((ts - 0.3) / 0.6);
    column.scale.y = Math.max(0.001, beamK); beamMat.uniforms.uA.value = beamK * 0.45 + flare * 0.5;

    // inclinación hacia el puntero (inercia)
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 3)); ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 3));
    tilt.rotation.y = ptr.sx * 0.45; tilt.rotation.x = -ptr.sy * 0.28;
    const coreW = reactor.getWorldPosition(new THREE.Vector3());
    U.uPointer.value.copy(ptrWorld).sub(coreW).normalize();
    tilt.updateMatrixWorld();
    U.uPointer.value.applyQuaternion(tilt.getWorldQuaternion(new THREE.Quaternion()).invert());

    // nodos
    const nodeK = on ? ease((tA - IGN - 1.1) / 1.0) : 0;
    nodes.forEach((n, i) => {
      const a = n.ph + time * (0.18 + i * 0.03);
      n.g.position.set(Math.cos(a) * n.r * nodeK, Math.sin(a * 1.0) * n.inc * n.r * 0.4 * nodeK + Math.sin(a) * n.inc, Math.sin(a) * n.r * 0.55 * nodeK);
      n.g.rotation.x += dt * 0.6; n.g.rotation.y += dt * (0.8 + i * 0.1);
      n.h += ((targetNode === i ? 1 : 0) - n.h) * (1 - Math.exp(-dt * 8));
      n.g.scale.setScalar((0.001 + nodeK) * (1 + n.h * 0.7));
      n.s.material.opacity = (0.5 + n.h * 0.5) * nodeK;
      n.g.getWorldPosition(tmpV); tmpV.y += 0.55; tmpV.project(camera);
      const vis = nodeK > 0.05 && tmpV.z < 1;
      n.el.style.opacity = vis ? String(Math.min(1, nodeK) * (0.65 + n.h * 0.35)) : '0';
      n.el.classList.toggle('on', n.h > 0.5);
      if (vis) n.el.style.transform = `translate(${((tmpV.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px,${((-tmpV.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translate(-50%,-100%)`;
    });

    // rayo
    const wantRay = act > 0.5 && (targetNode >= 0 || targetScreen);
    rayA += ((wantRay ? 1 : 0) - rayA) * (1 - Math.exp(-dt * 10));
    rayMat.uniforms.uA.value = rayA;
    if (wantRay) {
      if (targetNode >= 0) nodes[targetNode].g.getWorldPosition(rayEnd);
      else if (targetScreen) screenToWorld(targetScreen.x, targetScreen.y, rayEnd);
      buildRay(coreW, rayEnd);
      impact.position.copy(rayEnd);
    }
    impact.material.opacity = rayA * (0.7 + 0.3 * Math.sin(time * 14));
    impact.scale.setScalar(0.9 + rayA * 0.6);
    U.uFocus.value += (((targetNode >= 0 || targetScreen) ? 1 : 0) - U.uFocus.value) * (1 - Math.exp(-dt * 6));

    // cámara
    shake *= Math.exp(-dt * 4.5);
    const dolly = reduced ? 1 : on ? ease(tA / (IGN + 1.8)) : 0;
    const far = 1 - dolly;
    camera.position.set(
      camBase.x + ptr.sx * 0.35 - far * 2.6 + (Math.random() - 0.5) * 0.14 * shake,
      camBase.y + ptr.sy * 0.2 + far * 2.2 + (Math.random() - 0.5) * 0.14 * shake,
      camBase.z + far * 7);
    camera.lookAt(reactor.position.x * 0.55, reactor.position.y * 0.8, 0);
    dust.rotation.y += dt * 0.004;

    if (bloom) bloom.strength = ((crt ? 0.42 : 0.3) + act * (crt ? 0.2 : 0.12) + charge * 0.15 * (before ? 1 : 0)) * (1 - suck * 0.5) + flare * 0.95 + U.uBurst.value * 0.25;
    if (finalPass) finalPass.uniforms.uCA.value = (crt ? 0.0012 : 0.0004) + flare * 0.006;

    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    // posición del núcleo en pantalla (para anclar el HUD de la página)
    const sc = coreW.clone().project(camera);
    const edge = coreW.clone().add(new THREE.Vector3(0, 2.6, 0)).project(camera);
    const cx = (sc.x * 0.5 + 0.5) * innerWidth, cy = (-sc.y * 0.5 + 0.5) * innerHeight;
    const cr = Math.abs((-edge.y * 0.5 + 0.5) * innerHeight - cy);
    o.onFrame?.({ fps, particles: N, t: on && !reduced ? tA : 0, state, boot: on ? clamp01(tA / END) : 0, ignition: ignited, core: { x: cx, y: cy, r: cr } });
  }

  const render = () => (composer ? composer.render() : renderer.render(scene, camera));
  let raf = 0, running = false, last = 0;
  const frame = (now: number) => {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render();
  };
  // Con reduced-motion: sin bucle, un fotograma fijo por evento.
  const still = () => { update(0); render(); };
  function start() {
    if (reduced) { still(); return; }
    if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  addEventListener('resize', () => { layout(); if (reduced) still(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  layout();

  return {
    activate() {
      if (state !== 'dormant') return;
      tA = reduced ? 99 : 0; setState(reduced ? 'active' : 'igniting');
      if (reduced) still();
    },
    pulse() {
      if (state === 'dormant' || reduced) return;
      wave = 0; waveA = 0.7; U.uBurst.value = Math.max(U.uBurst.value, 0.35);
    },
    target(t) {
      if (t && 'node' in t) { targetNode = t.node; targetScreen = null; }
      else { targetNode = -1; targetScreen = t; }
      if (reduced) still();
    },
    setCrt(on) { crt = on; if (reduced) still(); },
    start, stop,
  };
}
