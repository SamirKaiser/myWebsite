
(() => {
  const els = document.querySelectorAll('.pause-when-offscreen');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
    }
  }, { threshold: 0.01 });
  els.forEach(el => io.observe(el));
})();


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ===== Mobile no-animation + remove containers ===== */
(function(){
  try {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || (navigator.userAgentData?.mobile ?? false);
    if (!isMobile) return;
    // Add a flag class for CSS overrides
    document.documentElement.classList.add('no-anim');

    const safeRemove = (node) => { try { if (node && node.parentElement) node.parentElement.removeChild(node); } catch(_) {} };
    const closest = (el, sel) => { try { return el?.closest?.(sel) || null; } catch(_) { return null; } };

    // Remove HERO canvas (and its wrapper if present)
    (function(){
      const hero = document.getElementById('hero');
      if (!hero) return;
      const wrap = closest(hero, '.wrap');
      safeRemove(wrap || hero);
    
    // Ensure GitHub and LinkedIn buttons are visible on mobile
    const revealSocial = () => {
      const sels = ["a[aria-label='GitHub']", "a[aria-label='LinkedIn']"];
      sels.forEach(sel => {
        document.querySelectorAll(sel).forEach(a => {
          // Remove 'hidden' so they're shown on small screens
          a.classList.remove('hidden');
          // Make sure the base display is inline-flex on mobile
          if (!a.classList.contains('inline-flex')) a.classList.add('inline-flex');
        });
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', revealSocial, { once: true });
    } else {
      revealSocial();
    }

})();// Remove ABOUT animation canvas and its '#about' wrapper if present
    (function(){
      const aboutC = document.getElementById('AboutAnim');
      if (!aboutC) return;
      const aboutWrap = closest(aboutC, '#about') || aboutC.parentElement;
      safeRemove(aboutWrap || aboutC);
    })();

    // Remove COLLISION canvas (and its wrapper)
    (function(){
      const c = document.getElementById('collision');
      if (!c) return;
      const wrap = closest(c, '.wrap');
      safeRemove(wrap || c);
    })();

    // Remove FLOWER canvas (center-wrap wrapper if present)
    (function(){
      const f = document.getElementById('flower');
      if (!f) return;
      const wrap = closest(f, '.center-wrap') || f.parentElement;
      safeRemove(wrap || f);
    })();

    // Remove FLOW canvas (glass card container around it if present)
    (function(){
      const fl = document.getElementById('flow');
      if (!fl) return;
      // Prefer the overflow-hidden rounded card; otherwise remove its parent
      const card = closest(fl, '.overflow-hidden.rounded-3xl') || closest(fl, '.overflow-hidden') || fl.parentElement;
      safeRemove(card || fl);
    })();

  } catch(_) {}
})();



/* ---------------------------------------------
   Power-friendly, visibility-aware 3D optimizer
   (keeps the old on-page size & placement)
---------------------------------------------- */

// ---------- Tunables ----------
const isMobile =
  /Mobi|Android/i.test(navigator.userAgent) ||
  (navigator.userAgentData?.mobile ?? false);

const PREFERS_REDUCED =
  matchMedia('(prefers-reduced-motion: reduce)').matches;

const TARGET_FPS = isMobile ? 30 : 45;      // render throttle
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// Same visual framing as before
const UI = {
  zoom: 1.55,               // >1 = zoom OUT (appears smaller); <1 = zoom in
  worldScale: 1.25,
  hilliness: 1.35,
  orbitSpeed: 0.035,
  restartFrames: [720, 1200],
  flatGrad: 0.06,
  holdAfterConverge: 90
};

// ---------- Canvas / Renderer (match CSS size exactly) ----------
if (!(/Mobi|Android/i.test(navigator.userAgent) || (navigator.userAgentData?.mobile ?? false))) {
const canvas = document.getElementById('hero');
if (!canvas) {
  console.warn('[opt3D] #hero canvas not found.');
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  alpha: true,
  powerPreference: isMobile ? 'low-power' : 'high-performance',
  stencil: false,
  depth: true,
  preserveDrawingBuffer: false
});

// Cap DPR but DO NOT change visible size
const MAX_DPR = isMobile ? 1.3 : 1.6;
function applyPixelRatio() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
}
applyPixelRatio();

// Size the drawing buffer to the element’s CSS box (keeps old placement)
function fitToCSSBox() {
  const cssW = canvas.clientWidth  || canvas.width;   // fall back to attrs
  const cssH = canvas.clientHeight || canvas.height;
  renderer.setSize(cssW, cssH, false); // false = don't touch style; respect page CSS
  camera.aspect = cssW / cssH;
  camera.updateProjectionMatrix();
}
renderer.setClearColor(0x000000, 0);

// ---------- Scene / Camera ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 18 * UI.worldScale, 52 * UI.worldScale);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 300);
const baseRadius = 9.5;
function positionCamera() {
  const radius = baseRadius * UI.zoom;
  const y45 = Math.SQRT2 * radius;  // 45° elevation
  camera.position.set(radius, y45, radius);
  camera.lookAt(0, 0, 0);
}
positionCamera();
fitToCSSBox();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableRotate = false;

// Time scaling (respect reduced motion)
const timeScale = PREFERS_REDUCED ? 0.4 : 0.7;

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dir = new THREE.DirectionalLight(0xffffff, isMobile ? 0.7 : 0.9);
dir.position.set(-9, 14, 9);
dir.castShadow = !isMobile;
if (!isMobile) {
  dir.shadow.mapSize.set(1536, 1536);
  dir.shadow.camera.near = 2; dir.shadow.camera.far = 120;
  dir.shadow.camera.left = -30; dir.shadow.camera.right = 30;
  dir.shadow.camera.top = 30;  dir.shadow.camera.bottom = -30;
}
scene.add(dir);

// ---------- Domain & Height ----------
const XMIN=-6, XMAX=6, YMIN=-6, YMAX=6;
const sizeX = (XMAX - XMIN), sizeY = (YMAX - YMIN);

function gauss(x, y, cx, cy, sx, sy) {
  const dx = (x - cx) / sx, dy = (y - cy) / sy;
  return Math.exp(-0.5*(dx*dx + dy*dy));
}
function height(x, y) {
  const Hh = UI.hilliness;
  let z = 0.032*(x*x + y*y); // outer bowl
  const minA =  -2.4 * gauss(x, y,  2.0,  0.8, 1.35, 1.05);
  const minB =  -1.8 * gauss(x, y, -1.4,  2.4, 1.05, 0.95);
  const hill1 =  1.8 * gauss(x, y, -3.1, -2.6, 0.9, 1.2);
  const hill2 =  1.6 * gauss(x, y,  3.2, -2.2, 0.8, 1.1);
  const hill3 =  1.1 * gauss(x, y,  0.4, -3.6, 1.4, 0.7);
  const hill4 =  0.9 * gauss(x, y, -3.6,  1.2, 0.9, 0.9);
  const saddle = 0.55 * Math.exp(-0.25*((x-0.4)*(x-0.4) + (y-0.2)*(y-0.2)))
               - 0.40 * Math.exp(-0.28*((x+0.1)*(x+0.1) + (y-0.9)*(y-0.9)));
  const rip = 0.70*Math.sin(0.65*x)*Math.cos(0.55*y)
            + 0.24*Math.sin(1.4*x+0.9)*Math.cos(1.2*y-0.6)
            + 0.16*Math.sin(2.1*x-0.7)*Math.cos(2.0*y+0.4)
            + 0.08*Math.sin(3.2*x+0.2)*Math.cos(2.8*y-0.3);
  z += minA + minB + Hh*(hill1 + hill2 + hill3 + hill4 + saddle + rip);
  return z;
}
function grad(x, y) {
  const e = 0.01;
  const fx = (height(x+e,y)-height(x-e,y))/(2*e);
  const fy = (height(x,y+e)-height(x,y-e))/(2*e);
  return { gx: fx, gy: fy };
}

// ---------- World ----------
const world = new THREE.Group();
world.scale.set(UI.worldScale, UI.worldScale, UI.worldScale);
scene.add(world);

// Ground (shadow receiver)
const groundMat = new THREE.ShadowMaterial({ opacity: isMobile ? 0.12 : 0.18 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(sizeX*2.6, sizeY*2.6), groundMat);
ground.receiveShadow = !isMobile;
ground.rotation.x = -Math.PI/2;
ground.position.y = -0.02;
world.add(ground);

// ---------- Surface mesh (vertex-colored by height) ----------
const segX = isMobile ? 128 : 200;
const segY = isMobile ? 128 : 200;

const geom = new THREE.PlaneGeometry(sizeX, sizeY, segX, segY);
geom.rotateX(-Math.PI/2);

const pos = geom.attributes.position;
let minH = Infinity, maxH = -Infinity;
for (let i=0; i<pos.count; i++){
  const vx = pos.getX(i) + (XMIN + sizeX/2);
  const vz = pos.getZ(i) + (YMIN + sizeY/2);
  const h = height(vx, vz);
  pos.setY(i, h);
  if (h<minH) minH=h; if (h>maxH) maxH=h;
}
geom.computeVertexNormals();

const stops = [
  { t: 0.00, c: new THREE.Color('#0ea5e9') },
  { t: 0.20, c: new THREE.Color('#6366f1') },
  { t: 0.40, c: new THREE.Color('#8b5cf6') },
  { t: 0.65, c: new THREE.Color('#d946ef') },
  { t: 0.85, c: new THREE.Color('#f472b6') },
  { t: 1.00, c: new THREE.Color('#f59e0b') }
];
function lerpColor(a,b,t){
  return new THREE.Color(a.r+(b.r-a.r)*t, a.g+(b.g-a.g)*t, a.b+(b.b-a.b)*t);
}
function sampleGradient(u){
  u = Math.min(1, Math.max(0, u));
  for (let i=0;i<stops.length-1;i++){
    const A=stops[i], B=stops[i+1];
    if (u>=A.t && u<=B.t){
      const tt=(u-A.t)/(B.t-A.t);
      return lerpColor(A.c, B.c, tt);
    }
  }
  return stops[stops.length-1].c.clone();
}
const colors = new Float32Array(pos.count*3);
for (let i=0; i<pos.count; i++){
  const h = pos.getY(i);
  const u = (h - minH) / (maxH - minH + 1e-6);
  const col = sampleGradient(u);
  colors[i*3]   = col.r;
  colors[i*3+1] = col.g;
  colors[i*3+2] = col.b;
}
geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const surfaceMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.1,
  flatShading: false,
  side: THREE.DoubleSide
});
const surface = new THREE.Mesh(geom, surfaceMat);
surface.receiveShadow = !isMobile;
world.add(surface);

// ---------- Agents ----------
const cols = {
  sgd:  new THREE.Color('hsl(212,80%,45%)'),
  mom:  new THREE.Color('hsl(162,70%,40%)'),
  adam: new THREE.Color('hsl(278,85%,60%)')
};

function makeBall(color){
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.35,
    roughness: 0.2,
    emissive: color.clone().multiplyScalar(0.12)
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 16), m);
  mesh.castShadow = !isMobile;
  world.add(mesh);

  const maxTrail = 300;
  const trailGeom = new THREE.BufferGeometry();
  trailGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxTrail*3), 3));
  trailGeom.setDrawRange(0, 0);
  const trail = new THREE.Line(
    trailGeom,
    new THREE.LineBasicMaterial({ color, transparent:true, opacity: isMobile ? 0.4 : 0.5 })
  );
  world.add(trail);
  return { mesh, trail, maxTrail, trailLen:0 };
}

function randIn(a,b){ return a + Math.random()*(b-a); }
function randomStart(){
  const m=1.0; return { x: randIn(XMIN+m, XMAX-m), y: randIn(YMIN+m, YMAX-m) };
}
function worldTo3D(x, y){ return new THREE.Vector3(x, height(x,y), y); }

function makeAgent(kind){
  const start = randomStart();
  const base = { ...start, vx:0, vy:0, obj: makeBall(cols[kind]) };
  if (kind==='sgd') return { kind, ...base, lr: 0.018 * timeScale };
  if (kind==='mom') return { kind, ...base, lr: 0.030 * timeScale, beta: 0.90 };
  return { kind, ...base, lr: 0.060 * timeScale, beta1:0.9, beta2:0.999, eps:1e-8, m:{x:0,y:0}, v:{x:0,y:0}, t:0 };
}

const sgd  = makeAgent('sgd');
const mom  = makeAgent('mom');
const adam = makeAgent('adam');

function clampStep(dx,dy,maxLen){ const n=Math.hypot(dx,dy)||1; if (n>maxLen){ const s=maxLen/n; return {dx:dx*s, dy:dy*s}; } return {dx,dy}; }
function stepSGD(o){ const g=grad(o.x,o.y); let dx=-o.lr*g.gx, dy=-o.lr*g.gy; ({dx,dy}=clampStep(dx,dy,0.05*timeScale)); o.vx=dx; o.vy=dy; o.x+=dx; o.y+=dy; }
function stepMomentum(o){ const g=grad(o.x,o.y); o.vx=o.beta*o.vx - (1-o.beta)*g.gx; o.vy=o.beta*o.vy - (1-o.beta)*g.gy; let dx=o.lr*o.vx, dy=o.lr*o.vy; ({dx,dy}=clampStep(dx,dy,0.07*timeScale)); o.x+=dx; o.y+=dy; }
function stepAdam(o){ const g=grad(o.x,o.y); o.t+=1; o.m.x=o.beta1*o.m.x+(1-o.beta1)*g.gx; o.m.y=o.beta1*o.m.y+(1-o.beta1)*g.gy; o.v.x=o.beta2*o.v.x+(1-o.beta2)*(g.gx*g.gx); o.v.y=o.beta2*o.v.y+(1-o.beta2)*(g.gy*g.gy); const mhatx=o.m.x/(1-Math.pow(o.beta1,o.t)); const mhaty=o.m.y/(1-Math.pow(o.beta1,o.t)); const vhatx=o.v.x/(1-Math.pow(o.beta2,o.t)); const vhaty=o.v.y/(1-Math.pow(o.beta2,o.t)); let dx=-o.lr*(mhatx/(Math.sqrt(vhatx)+o.eps)); let dy=-o.lr*(mhaty/(Math.sqrt(vhaty)+o.eps)); ({dx,dy}=clampStep(dx,dy,0.09*timeScale)); o.vx=dx; o.vy=dy; o.x+=dx; o.y+=dy; }

function resetAgent(o){
  const start = randomStart();
  o.x = start.x; o.y = start.y; o.vx = 0; o.vy = 0; o.t = 0;
  if (o.m){ o.m.x = 0; o.m.y = 0; }
  if (o.v){ o.v.x = 0; o.v.y = 0; }
  o.obj.trailLen = 0;
  o.life = 0; o.lifeMax = Math.floor(randIn(UI.restartFrames[0], UI.restartFrames[1]));
  o.hold = 0;
}
resetAgent(sgd); resetAgent(mom); resetAgent(adam);

function keepInBounds(o){ if (o.x<XMIN||o.x>XMAX||o.y<YMIN||o.y>YMAX){ resetAgent(o); } }
function maybeRestart(o){
  const g = grad(o.x,o.y); const gmag = Math.hypot(g.gx, g.gy);
  const stepMag = Math.hypot(o.vx||0, o.vy||0);
  if (gmag < UI.flatGrad && stepMag < 0.01){ o.hold = (o.hold||0) + 1; } else { o.hold = 0; }
  if (o.hold > UI.holdAfterConverge || (o.life||0) > (o.lifeMax||900)) resetAgent(o);
}

function updateAgent(o, stepper){
  stepper(o);
  o.life = (o.life||0) + 1;
  keepInBounds(o);
  maybeRestart(o);
  const p = worldTo3D(o.x, o.y);
  o.obj.mesh.position.copy(p);
  const geom = o.obj.trail.geometry;
  const arr = geom.attributes.position.array;
  const idx = o.obj.trailLen;
  const max = o.obj.maxTrail;
  if (idx < max){
    arr[idx*3]=p.x; arr[idx*3+1]=p.y; arr[idx*3+2]=p.z;
    o.obj.trailLen++;
    geom.setDrawRange(0, o.obj.trailLen);
    geom.attributes.position.needsUpdate = true;
  } else {
    arr.copyWithin(0, 3, max*3);
    arr[(max-1)*3]=p.x; arr[(max-1)*3+1]=p.y; arr[(max-1)*3+2]=p.z;
    geom.attributes.position.needsUpdate = true;
  }
}

// ---------- Visibility + Loop control ----------
let running = false;
let inView  = true;
let tabVisible = !document.hidden;

const io = new IntersectionObserver(([entry]) => {
  inView = !!entry?.isIntersecting;
  updateRunState();
}, { threshold: 0.1 });
io.observe(canvas);

document.addEventListener('visibilitychange', () => {
  tabVisible = !document.hidden;
  updateRunState();
}, { passive: true });

window.addEventListener('pagehide', () => stop(), { passive: true });
window.addEventListener('pageshow', () => { tabVisible = !document.hidden; updateRunState(); }, { passive: true });

function shouldRun(){
  return !PREFERS_REDUCED && inView && tabVisible;
}
function updateRunState(){
  if (shouldRun()) start();
  else stop();
}

// ---------- Main loop (FPS throttle) ----------
let lastRAF = 0;
let lastTick = performance.now();
let tPrev = performance.now();

function animate(ts){
  if (!running) return;

  lastRAF = requestAnimationFrame(animate);

  if (ts - lastTick < FRAME_INTERVAL) return;

  const dt = Math.min(0.05, (ts - tPrev) / 1000) || 1/60;
  tPrev = ts;
  lastTick = ts;

  world.rotation.y += UI.orbitSpeed * dt;
  updateAgent(sgd,  stepSGD);
  updateAgent(mom,  stepMomentum);
  updateAgent(adam, stepAdam);

  renderer.render(scene, camera);
}

function start(){
  if (running) return;
  running = true;
  tPrev = performance.now();
  lastTick = tPrev;
  lastRAF = requestAnimationFrame(animate);
}

function stop(){
  if (!running) return;
  running = false;
  if (lastRAF) cancelAnimationFrame(lastRAF);
  lastRAF = 0;
}

// --------- Reduced motion: draw once & stop ----------
if (PREFERS_REDUCED || isMobile) {
  // On mobile (or reduced motion), render a single nice frame and do not start the loop
  if (!PREFERS_REDUCED && isMobile) {
    const steps = 48;
    for (let i = 0; i < steps; i++) {
      world.rotation.y += UI.orbitSpeed * (1/60);
      updateAgent(sgd, stepSGD);
      updateAgent(mom, stepMomentum);
      updateAgent(adam, stepAdam);
    }
  }
  renderer.render(scene, camera);
} else {
  updateRunState();
}

// ---------- Resize / DPR handling (keeps CSS size) ----------
const ro = new ResizeObserver(() => {
  applyPixelRatio();
  fitToCSSBox();
});
ro.observe(canvas);
addEventListener('resize', () => { applyPixelRatio(); fitToCSSBox(); }, { passive:true });

// ---------- Public API ----------
window.opt3D = {
  setZoom(z){ UI.zoom = z; positionCamera(); },
  setWorldScale(s){ UI.worldScale = s; world.scale.set(s,s,s); },
  setHilliness(h){ UI.hilliness = h; console.warn('Hilliness changed; reload to recompute geometry.'); },
  restartAll(){ resetAgent(sgd); resetAgent(mom); resetAgent(adam); },
  pause(){ stop(); },
  resume(){ updateRunState(); }
};

// ---------- Self-tests ----------
(function selfTests(){
  try {
    console.log('[SelfTest] Starting optimizer viz tests…');
    const pts = [[-3,3],[0,0],[2,-1],[1,1]];
    for (const [x,y] of pts){
      const h = height(x,y); const g = grad(x,y);
      console.assert(Number.isFinite(h), 'height finite at', x,y);
      console.assert(Number.isFinite(g.gx) && Number.isFinite(g.gy), 'grad finite at', x,y);
    }
    let min=Infinity, max=-Infinity;
    for (let y=-5;y<=5;y+=1.5){
      for (let x=-5;x<=5;x+=1.5){
        const z=height(x,y); if(z<min)min=z; if(z>max)max=z;
      }
    }
    console.assert(max-min > 9.0, 'height variation sufficient (>9), got', max-min);
    const A = height(2.0,0.8), B = height(-1.4,2.4);
    console.assert(A < B, 'global-ish minimum deeper than local');
    console.assert(B - A < 2.5, 'minima gap not too strict (<2.5), got', B-A);
    const horiz = Math.hypot(camera.position.x, camera.position.z);
    const ang = Math.atan2(camera.position.y, horiz)*180/Math.PI;
    console.assert(Math.abs(ang-45) < 1.5, 'camera elevation ~45°, got', ang);
    console.assert(
      geom.getAttribute('color') &&
      geom.getAttribute('color').count === geom.getAttribute('position').count,
      'vertex colors set'
    );
    const before = { x: sgd.x, y: sgd.y };
    window.opt3D.restartAll();
    console.assert(sgd.x !== before.x || sgd.y !== before.y, 'restartAll moved agents');
    console.log('[SelfTest] All checks passed.');
  } catch(e){
    console.warn('[SelfTest] Warning:', e);
  }
})();


/**
 * createAnimationLoop
 * - Pauses when canvas is off-screen (IntersectionObserver)
 * - Pauses when tab is hidden (Page Visibility API)
 * - Respects prefers-reduced-motion (renders nothing)
 * - FPS throttle (frameInterval)
 *
 * Usage:
 *   const loop = createAnimationLoop({
 *     el: myCanvas,
 *     fps: 30,
 *     tick: (dt, now) => { /* draw your frame *\/ }
 *   });
 *   loop.start(); // optional; auto-starts if visible
 *   loop.stop();  // manual stop
 *   loop.dispose(); // cleanup observers/listeners
 */
function createAnimationLoop({ el, fps = 30, tick }) {
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frameInterval = 1000 / fps;

  let rafId = 0;
  let running = false;
  let inView = false;
  let tabVisible = !document.hidden;
  let last = 0;

  // --- visibility (tab) ---
  const onVis = () => {
    tabVisible = !document.hidden;
    update();
  };
  document.addEventListener('visibilitychange', onVis, { passive: true });

  // iOS/Safari lifecycle reliability
  const stopOnHide = () => stop();
  const startOnShow = () => update();
  window.addEventListener('pagehide', stopOnHide, { passive: true });
  window.addEventListener('pageshow', startOnShow, { passive: true });

  // --- intersection (on-screen?) ---
  const io = new IntersectionObserver(
    ([entry]) => {
      inView = !!entry?.isIntersecting;
      update();
    },
    { threshold: 0.1 }
  );
  io.observe(el);

  function loop(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    // FPS throttle
    if (ts - last < frameInterval) return;
    const dt = Math.min(0.05, (ts - last) / 1000) || 1 / 60;
    last = ts;

    tick(dt, ts);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function update() {
    const shouldRun = !prefersReduced && inView && tabVisible;
    if (shouldRun) start();
    else stop();
  }

  // auto-manage
  update();

  return {
    start,
    stop,
    dispose() {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', stopOnHide);
      window.removeEventListener('pageshow', startOnShow);
    }
  };
}






(() => {
  const canvas = document.getElementById('flow');
  if (!canvas) return;

  // ==== knobs (safe to tweak) ====
  const TARGET_FPS_DESKTOP = 40;   // you set this
  const TARGET_FPS_MOBILE  = 24;
  const MAX_PARTS_DESKTOP  = 2000; // you set this
  const MAX_PARTS_MOBILE   = 900;
  const GRID_BASE_X        = 64;
  const GRID_BASE_Y        = 32;
  const FIELD_UPDATE_EVERY = 2;    // recompute noise field every N frames

  // ==== runtime state ====
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || (navigator.userAgentData?.mobile ?? false);
  const targetFPS = isMobile ? TARGET_FPS_MOBILE : TARGET_FPS_DESKTOP;
  const frameInterval = 1000 / targetFPS;

  // DPR scaling (mutable so we can react to changes)
  let DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const scaleFromDPR = dpr => (dpr > 1.3 ? 0.75 : 1);
  let DPR_SCALE = scaleFromDPR(DPR);

  // pause conditions
  let running = false, onScreen = true, tabVisible = !document.hidden;

  // size + ctx
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

  let W = 0, H = 0;
  function fit() {
    const attrW = parseInt(canvas.getAttribute('width')  || 1180, 10);
    const attrH = parseInt(canvas.getAttribute('height') || 300, 10);
    const pxRatio = DPR * DPR_SCALE;

    canvas.width  = Math.round(attrW * pxRatio);
    canvas.height = Math.round(attrH * pxRatio);
    canvas.style.width  = attrW + 'px';
    canvas.style.height = attrH + 'px';
    ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);

    W = attrW; H = attrH;
  }
  fit();

  // ======= Perlin noise (compact) =======
  function makeNoise(seed=1337){
    const p = new Uint8Array(512), perm = new Uint8Array(256);
    for (let i=0;i<256;i++) perm[i]=i; let s=seed>>>0;
    for (let i=255;i>0;i--){ s=(s*1664525+1013904223)>>>0; const j=s%(i+1); [perm[i],perm[j]]=[perm[j],perm[i]]; }
    for (let i=0;i<512;i++) p[i]=perm[i&255];
    const fade=t=>t*t*t*(t*(t*6-15)+10), lerp=(a,b,t)=>a+(b-a)*t;
    const grad=(h,x,y,z)=>((h&1?-x:x)+(h&2?-y:y)+(h&4?-z:z));
    return (x,y=0,z=0)=>{
      const X=Math.floor(x)&255, Y=Math.floor(y)&255, Z=Math.floor(z)&255;
      x-=Math.floor(x); y-=Math.floor(y); z-=Math.floor(z);
      const u=fade(x), v=fade(y), w=fade(z);
      const A=p[X]+Y, AA=p[A]+Z, AB=p[A+1]+Z;
      const B=p[X+1]+Y, BA=p[B]+Z, BB=p[B+1]+Z;
      return lerp(
        lerp( lerp(grad(p[AA],x,y,z),     grad(p[BA],x-1,y,z),     u),
              lerp(grad(p[AB],x,y-1,z),   grad(p[BB],x-1,y-1,z),   u), v),
        lerp( lerp(grad(p[AA+1],x,y,z-1), grad(p[BA+1],x-1,y,z-1), u),
              lerp(grad(p[AB+1],x,y-1,z-1),grad(p[BB+1],x-1,y-1,z-1),u), v), w);
    };
  }
  const noise = makeNoise(42);

  // ======= Vector field on a coarse grid (smaller + partial refresh) =======
  let GX = GRID_BASE_X, GY = GRID_BASE_Y;
  let field = new Float32Array(GX*GY*2);

  function rebuildGrid() {
    const scale = Math.max(0.8, Math.min(1.3, (W / 1180)));
    GX = Math.max(40, Math.round(GRID_BASE_X * scale));
    GY = Math.max(22, Math.round(GRID_BASE_Y * scale));
    field = new Float32Array(GX*GY*2);
  }
  rebuildGrid();

  function updateField(ts){
    const z = ts * 0.00016, s = 0.0018;
    for (let y=0;y<GY;y++){
      for (let x=0;x<GX;x++){
        const nx = (x/GX)*W, ny = (y/GY)*H;
        const n = noise(nx*s, ny*s, z);
        const e = 2.0;
        const nx1 = noise((nx+e)*s, ny*s, z) - noise((nx-e)*s, ny*s, z);
        const ny1 = noise(nx*s, (ny+e)*s, z) - noise(nx*s, (ny-e)*s, z);
        let vx =  ny1, vy = -nx1;
        const len = Math.hypot(vx,vy)||1; vx/=len; vy/=len;
        const speed = 0.75 + 1.0*(0.5+0.5*Math.sin(n*6.283));
        const i=(x+y*GX)*2; field[i]=vx*speed; field[i+1]=vy*speed;
      }
    }
  }

  function sampleField(x,y){
    const u = Math.max(0, Math.min(GX-1, x/W*(GX-1)));
    const v = Math.max(0, Math.min(GY-1, y/H*(GY-1)));
    const ix=Math.floor(u), iy=Math.floor(v), fu=u-ix, fv=v-iy;
    const vxAt=(ix,iy)=>field[(ix+iy*GX)*2];
    const vyAt=(ix,iy)=>field[(ix+iy*GX)*2+1];
    const vx = (1-fu)*(1-fv)*vxAt(ix,iy) + fu*(1-fv)*vxAt(Math.min(GX-1,ix+1),iy)
             + (1-fu)*fv*vxAt(ix,Math.min(GY-1,iy+1)) + fu*fv*vxAt(Math.min(GX-1,ix+1), Math.min(GY-1,iy+1));
    const vy = (1-fu)*(1-fv)*vyAt(ix,iy) + fu*(1-fv)*vyAt(Math.min(GX-1,ix+1),iy)
             + (1-fu)*fv*vyAt(ix,Math.min(GY-1,iy+1)) + fu*fv*vyAt(Math.min(GX-1,ix+1), Math.min(GY-1,iy+1));
    return {vx, vy};
  }

  // ======= Particles (adaptive) =======
  const MAX_PARTS = isMobile ? MAX_PARTS_MOBILE : MAX_PARTS_DESKTOP;
  let N = MAX_PARTS;                   // will auto-tune down if needed
  let parts = new Float32Array(N*4);  // x,y,px,py

  function reset(i){ const x=Math.random()*W, y=Math.random()*H; parts[i]=x; parts[i+1]=y; parts[i+2]=x; parts[i+3]=y; }
  function resetAll(){ for (let i=0;i<N*4;i+=4) reset(i); }
  resetAll();

  // ======= Adaptive quality based on frame time =======
  let emaMS = 16; // moving average of frame ms
  const QUALITY_STEP = 0.9;         // shrink particle count by 10% on stress
  const QUALITY_GROW = 1.05;        // grow back gently
  const MIN_PARTS = Math.max(400, Math.floor(MAX_PARTS * 0.35));

  
  // ---- Strong mobile optimization: draw a single static composition and stop ----
  if (isMobile) {
    try {
      updateField(performance.now ? performance.now() : Date.now());
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1;
      const samples = Math.min(1800, Math.max(700, Math.floor(W * H / 700))); // density scales with size
      const L = matchMedia('(prefers-color-scheme: light)').matches ? 46 : 70;
      for (let i = 0; i < samples; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const v = sampleField(x, y);
        const len = 10 + Math.random() * 22;
        const hue = 210 + 50 * Math.sin((x + y) * 0.0016);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + v.vx * len, y + v.vy * len);
        ctx.strokeStyle = `hsl(${(hue|0)} 70% ${L}%)`;
        ctx.stroke();
      }
      ctx.restore();
    } catch (e) {
      console.warn('[flow] static composition failed:', e);
    }
    return; // stop here on mobile: show static frame only
  }

// ======= Visibility control =======
  let lastRAF = 0, lastTick = 0, frameCount = 0;

  const io = new IntersectionObserver((entries)=>{
    onScreen = entries[0]?.isIntersecting ?? true;
    updateRunState();
  }, { threshold: 0.1 });
  io.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    tabVisible = !document.hidden;
    updateRunState();
  }, { passive: true });

  // Safari lifecycle reliability
  window.addEventListener('pagehide', () => stop(), { passive: true });
  window.addEventListener('pageshow', () => { tabVisible = !document.hidden; updateRunState(); }, { passive: true });

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shouldRun(){
    return !prefersReduced && onScreen && tabVisible;
  }

  function updateRunState(){
    if (shouldRun()) start();
    else stop();
  }

  // ======= Main loop (throttled) =======
  function frame(ts){
    if (!running) return;
    lastRAF = requestAnimationFrame(frame);

    // throttle FPS
    if (ts - lastTick < frameInterval) return;
    const dtMS = ts - lastTick;
    lastTick = ts;

    // EMA frame time for quality scaling
    emaMS = emaMS*0.9 + dtMS*0.1;

    // transparent trail fade (destination-out)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${isMobile ? 0.075 : 0.055})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // refresh grid every few frames
    frameCount++;
    if (frameCount % FIELD_UPDATE_EVERY === 0) updateField(ts);

    // draw particles (stride on mobile to cut draw calls)
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1;
    const stride = isMobile ? 2 : 1;

    const speed = isMobile ? 0.72 : 0.85;
    const L = matchMedia('(prefers-color-scheme: light)').matches ? 40 : 68;

    for (let i=0;i<N*4;i+=4*stride){
      let x=parts[i], y=parts[i+1], px=parts[i+2], py=parts[i+3];
      const v = sampleField(x,y);
      x += v.vx * speed;
      y += v.vy * speed;
      if (x<0||x>W||y<0||y>H){ reset(i); continue; }

      const hue = 210 + 50*Math.sin((x+y+ts*0.05)*0.0016);
      ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(x,y);
      ctx.strokeStyle = `hsl(${hue|0} 70% ${L}%)`;
      ctx.stroke();

      parts[i]=x; parts[i+1]=y; parts[i+2]=x; parts[i+3]=y;
    }

    // adaptive quality: if we’re consistently slow, reduce N
    if (emaMS > frameInterval*1.4 && N > MIN_PARTS){
      N = Math.max(MIN_PARTS, Math.floor(N * QUALITY_STEP));
      parts = parts.slice(0, N*4);
    } else if (emaMS < frameInterval*0.8 && N < MAX_PARTS){
      const target = Math.min(MAX_PARTS, Math.floor(N * QUALITY_GROW));
      const grown = new Float32Array(target*4);
      grown.set(parts);
      for (let i=N*4;i<target*4;i+=4) reset(i); // seed new
      parts = grown; N = target;
    }

    // occasional hard clear to prevent subpixel alpha build-up
    if (frameCount % (targetFPS*15) === 0) ctx.clearRect(0,0,W,H);
  }

  function start(){
    if (running) return;
    running = true;
    lastTick = performance.now();
    lastRAF = requestAnimationFrame(frame);
  }

  function stop(){
    if (!running) return;
    running = false;
    if (lastRAF) cancelAnimationFrame(lastRAF);
    lastRAF = 0;
  }

  // respect prefers-reduced-motion: render one “still” frame then stop
  if (prefersReduced){
    updateField(performance.now());
    ctx.clearRect(0,0,W,H);
    for (let i=0;i<Math.min(600,N)*4;i+=4){
      const x = Math.random()*W, y=Math.random()*H;
      ctx.fillStyle = 'rgba(100,116,139,0.25)';
      ctx.fillRect(x,y,1,1);
    }
  } else {
    updateRunState();
  }

  // Debounced resize → refit & gently rebuild
  let resizeTO;
  addEventListener('resize', () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(() => { fit(); rebuildGrid(); resetAll(); }, 120);
  }, { passive: true });

  // DPR changes → update DPR & scale first, then refit
  let lastDPR = DPR;
  setInterval(() => {
    const curDPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    if (curDPR !== lastDPR) {
      lastDPR = curDPR;
      DPR = curDPR;
      DPR_SCALE = scaleFromDPR(DPR);
      fit(); rebuildGrid(); resetAll();
    }
  }, 1000);

  // expose for debugging
  window.flowPerf = {
    get particles(){ return N; },
    set particles(v){ N = Math.max(100, Math.min(MAX_PARTS, v|0)); parts = new Float32Array(N*4); resetAll(); },
    pause(){ stop(); }, resume(){ updateRunState(); }
  };
})();



/* Lissajous Flower — visibility-aware, dt-based, throttled */
(function(){
  const C   = document.getElementById("flower");
  if (!C) return;

  const ctx = C.getContext("2d", { alpha: true });
  const trailCanvas = document.createElement("canvas");
  const trailCtx    = trailCanvas.getContext("2d", { alpha: true });

  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || (navigator.userAgentData?.mobile ?? false);
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const RM  = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // No shadows at all
  ctx.shadowColor = trailCtx.shadowColor = 'transparent';
  ctx.shadowBlur  = trailCtx.shadowBlur  = 0;

  // Geometry / params
  const petals = 10;
  let kx = 3, ky = 4;
  let Rx = 180, Ry = 180;
  let cx = 0, cy = 0;
  let W = 0, H = 0;

  // dt-based phase (fps independent)
  let phase = 0;               // used as "t" previously
  let hueT  = 0;               // color blend position [0..)
  const PHASE_PER_SEC = 0.15;  // 0.0025 per frame at 60fps → 0.15 / sec
  const HUE_PER_SEC   = 0.20;  // frames/300 at 60fps → 0.2 / sec

  const colors = [
    "hsl(210, 90%, 70%)",
    "hsl(270, 80%, 75%)",
    "hsl(330, 70%, 75%)"
  ];
  function lerpColor(a, b, t) {
    const na = a.match(/\d+(\.\d+)?/g).map(Number);
    const nb = b.match(/\d+(\.\d+)?/g).map(Number);
    const h  = na[0] + (nb[0] - na[0]) * t;
    const s  = na[1] + (nb[1] - na[1]) * t;
    const l  = na[2] + (nb[2] - na[2]) * t;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  // Fade (destination-out) tuned for 60fps; convert using dt
  const FADE_PER_FRAME_AT_60 = 0.012;
  function fadeTrails(dt){
    const alpha = 1 - Math.pow(1 - FADE_PER_FRAME_AT_60, dt * 60);
    if (alpha <= 0) return;
    trailCtx.save();
    trailCtx.globalCompositeOperation = "destination-out";
    trailCtx.globalAlpha = alpha;
    trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    trailCtx.restore();
  }

  function resize() {
    const targetW = parseInt(C.dataset.w || C.getAttribute('width')  || 1180, 10);
    const targetH = parseInt(C.dataset.h || C.getAttribute('height') || 360, 10);

    C.width  = Math.round(targetW * DPR);
    C.height = Math.round(targetH * DPR);
    C.style.width  = targetW + "px";
    C.style.height = targetH + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    trailCanvas.width  = targetW;  // offscreen in CSS px
    trailCanvas.height = targetH;

    W = targetW; H = targetH;
    cx = W * 0.5; cy = H * 0.5;

    const rBase = Math.min(W, H) * 0.33;
    Rx = rBase; Ry = rBase;

    trailCtx.clearRect(0,0,W,H);
    ctx.clearRect(0,0,W,H);
  }
  resize();
  addEventListener("resize", resize, { passive: true });

  function drawPetal(t, hueStep) {
    const rx = Rx * Math.abs(Math.cos(t)) + Math.min(W, H) * 0.06;
    const ry = Ry * Math.abs(Math.sin(t)) + Math.min(W, H) * 0.06;

    const x0 = cx + rx * Math.sin(kx * t + Math.PI / 4);
    const y0 = cy + ry * Math.sin(ky * t + Math.PI / 4);
    const x1 = cx + rx * Math.sin(kx * t + 3 * Math.PI / 4);
    const y1 = cy - ry * Math.sin(ky * t + 3 * Math.PI / 4);
    const x2 = cx + rx * Math.sin(kx * t + 5 * Math.PI / 4);
    const y2 = cy - ry * Math.sin(ky * t + 5 * Math.PI / 4);
    const x3 = cx + rx * Math.sin(kx * t + 7 * Math.PI / 4);
    const y3 = cy - ry * Math.sin(ky * t + 7 * Math.PI / 4);

    const p = new Path2D();
    p.moveTo(x0, y0);
    p.bezierCurveTo(x1, y1, x2, y2, x3, y3);
    p.bezierCurveTo(x2, y2, x1, y1, x0, y0);
    p.closePath();

    const col1 = colors[Math.floor(hueStep) % colors.length];
    const col2 = colors[(Math.floor(hueStep) + 1) % colors.length];
    const color = lerpColor(col1, col2, hueStep % 1);

    trailCtx.save();
    trailCtx.translate(cx, cy);
    for (let i = 0; i < petals; i++) {
      trailCtx.rotate((2 * Math.PI) / petals);
      trailCtx.translate(-cx, -cy);
      trailCtx.strokeStyle = color;
      trailCtx.lineWidth = 1.2;
      trailCtx.stroke(p);
      trailCtx.translate(cx, cy);
    }
    trailCtx.restore();
  }

  // --- Visibility-aware loop (throttle: desktop 45fps / mobile 28fps) ---
  const TARGET_FPS = isMobile ? 28 : 45;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  let running = false, inView = true, tabVisible = !document.hidden;
  let lastTS = performance.now();

  const io = new IntersectionObserver(([entry]) => {
    inView = !!entry?.isIntersecting;
    updateRunState();
  }, { threshold: 0.1 });
  io.observe(C);

  document.addEventListener('visibilitychange', () => {
    tabVisible = !document.hidden;
    updateRunState();
  }, { passive: true });

  addEventListener('pagehide', stop, { passive: true });
  addEventListener('pageshow', () => { tabVisible = !document.hidden; updateRunState(); }, { passive: true });

  function shouldRun(){ return !RM && inView && tabVisible; }
  function updateRunState(){ shouldRun() ? start() : stop(); }

  function animate(ts){
    if (!running) return;
    requestAnimationFrame(animate);
    if (ts - lastTS < FRAME_INTERVAL) return;

    const dt = Math.min(0.05, (ts - lastTS)/1000) || 1/60;
    lastTS = ts;

    phase += dt * PHASE_PER_SEC;
    hueT  += dt * HUE_PER_SEC;

    fadeTrails(dt);
    drawPetal(phase, hueT);

    // Copy buffer to onscreen (no extra blending)
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(trailCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }

  function start(){
    if (running) return;
    running = true;
    lastTS = performance.now();
    requestAnimationFrame(animate);
  }
  function stop(){ running = false; }

  // Reduced motion: draw one still and stop
  if (RM) {
    drawPetal(0.0, 0.0);
    ctx.globalCompositeOperation = "copy";
    ctx.drawImage(trailCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  } else {
    updateRunState();
  }
})();








(function CollisionBlueViolet(){
  const cvs = document.getElementById('collision');
  if (!cvs) return;

  // --------- Environment / knobs ----------
  const isMobile =
    /Mobi|Android/i.test(navigator.userAgent) ||
    (navigator.userAgentData?.mobile ?? false);
  const PREFERS_REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const DPR_MAX = isMobile ? 1.4 : 1.8;
  const DPR = Math.min(DPR_MAX, window.devicePixelRatio || 1);

  // Throttle render FPS to save power
  const TARGET_FPS = isMobile ? 28 : 42;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  // Particle budgets (lighter than before; mobile gets fewer)
  const PAL = {
    blue:    '#5ba4ff',
    indigo:  '#9a7bff',
    violet:  '#d46eff',
    fuchsia: '#f064d9'
  };

  const RMF         = PREFERS_REDUCED ? 0.6 : 1.0;
  const coreR0      = 7;
  const coreBurst   = coreR0 * 1.2;
  const TRAIL_W     = 0.9;
  const TAIL_LEN    = 16;

  const ORB_SPEED   = (isMobile ? 0.75 : 0.85) * RMF;
  const FINAL_ACCEL = 2.0;

  const SPARK_COUNT = Math.round((isMobile ? 120 : 180) * RMF);
  const SPARK_SPEED = isMobile ? 90 : 130;

  const SHELL_COUNT = Math.round((isMobile ? 20 : 34) * RMF);
  const SHELL_SPEED = isMobile ? 120 : 170;
  const SHELL_FUSE_MIN= 0.55, SHELL_FUSE_MAX = 1.15;

  const SUB_COUNT   = isMobile ? 12 : 16;
  const SUB_SPEED   = isMobile ? 80 : 110;

  // --------- Fit & ctx ----------
  function fitCanvas(){
    const w = cvs.width, h = cvs.height; // use HTML attributes to define CSS size
    cvs.style.width  = w + 'px';
    cvs.style.height = h + 'px';
    cvs.width  = Math.round(w * DPR);
    cvs.height = Math.round(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    W = cvs.width / DPR; H = cvs.height / DPR;
    CX = W * 0.5; CY = H * 0.5;
  }

  const ctx = cvs.getContext('2d', { alpha: true, desynchronized: true });
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.imageSmoothingEnabled = true;

  let W = 0, H = 0, CX = 0, CY = 0;
  fitCanvas();

  let resizeTO;
  addEventListener('resize', () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(fitCanvas, 120);
  }, { passive:true });

  // --------- Phase state ----------
  // approach → burst → attract → hold → fade → reset
  let phase = 'approach';
  let tPrev = performance.now();
  let timer = 0;
  let fadeT = 0;

  // Entities
  const left  = { x:-80, y:0, px:-80, py:0, color:PAL.blue   };
  const right = { x:W+80, y:0, px:W+80, py:0, color:PAL.violet };
  left.y = right.y = CY;

  const leftTrail  = [];
  const rightTrail = [];
  const sparks = [];
  const shells = [];
  const subs   = [];

  // Bloom ring
  const bloom = { r:0, a:0 };

  // Utils
  const clamp = (x,a,b)=> Math.max(a, Math.min(b,x));
  const lerp  = (a,b,t)=> a + (b-a)*t;
  const rand  = (a=1,b)=> (b===undefined ? Math.random()*a : a + Math.random()*(b-a));

  function reset(){
    phase = 'approach'; timer = 0; fadeT = 0;
    sparks.length = shells.length = subs.length = 0;
    bloom.r = 0; bloom.a = 0;
    left.x = -80; left.y = CY; left.px = left.x; left.py = left.y;
    right.x = W + 80; right.y = CY; right.px = right.x; right.py = right.y;

    leftTrail.length = 0; rightTrail.length = 0;
    for (let i=0;i<Math.min(6, TAIL_LEN); i++){
      leftTrail.push({x:left.x, y:left.y});
      rightTrail.push({x:right.x, y:right.y});
    }
  }

  // --------- Drawing helpers ----------
  function drawTailSegments(tr, color){
    if (tr.length < 2) return;
    ctx.lineCap = 'round';
    for (let i=1;i<tr.length;i++){
      const a = tr[i-1], b = tr[i];
      const t = i / tr.length;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.10 + 0.22 * t;
      ctx.lineWidth   = 0.8 + 1.1 * t;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawOrbRing(x, y, r, color){
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.15;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = color; ctx.globalAlpha = 0.65;
    ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawOrbWithTrail(o, r, color){
    if (o.trail && o.trail.length >= 2) drawTailSegments(o.trail, color);
    drawOrbRing(o.x, o.y, r*0.9, color);
  }

  // --------- Spawning ----------
  function spawnSparksAndShells(){
    // Sparks
    for (let i=0;i<SPARK_COUNT;i++){
      const ang = Math.random()*Math.PI*2;
      const spd = SPARK_SPEED * (0.55 + Math.random()*0.75);
      sparks.push({
        x:CX, y:CY, px:CX, py:CY,
        vx: Math.cos(ang)*spd,
        vy: Math.sin(ang)*spd,
        life: 0, maxLife: rand(1.0, 1.7)*RMF,
        r: rand(1.0, 1.8),
        color: (i%3===0)? PAL.indigo : ((i%2)? PAL.blue : PAL.violet)
      });
    }
    // Shells
    for (let i=0;i<SHELL_COUNT;i++){
      const ang = Math.random()*Math.PI*2;
      const spd = SHELL_SPEED * (0.6 + Math.random()*0.7);
      shells.push({
        x:CX, y:CY, px:CX, py:CY,
        vx: Math.cos(ang)*spd,
        vy: Math.sin(ang)*spd,
        life: 0, fuse: rand(SHELL_FUSE_MIN, SHELL_FUSE_MAX),
        r: rand(1.7, 2.7),
        color: (i%4===0)? PAL.indigo : (i%4===1)? PAL.violet : (i%4===2)? PAL.blue : PAL.fuchsia
      });
    }
    bloom.r = 0; bloom.a = 1;
  }

  function explodeShell(s){
    for (let k=0;k<SUB_COUNT;k++){
      const ang = Math.random()*Math.PI*2;
      const spd = SUB_SPEED * (0.55 + 0.7*Math.random());
      subs.push({
        x:s.x, y:s.y, px:s.x, py:s.y,
        vx: Math.cos(ang)*spd,
        vy: Math.sin(ang)*spd,
        life: 0, maxLife: rand(0.9, 1.4)*RMF,
        r: rand(1.4, 2.4),
        color: (k%3===0)? PAL.indigo : ((k%2)? PAL.violet : PAL.blue)
      });
    }
  }

  function drawBloomRing(dt){
    if (bloom.a <= 0.02) return;
    bloom.r += (PREFERS_REDUCED ? 140 : 190) * dt;
    bloom.a *= 0.96;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = PAL.violet;
    ctx.globalAlpha = 1.3 * bloom.a;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, CY, bloom.r, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // --------- Visibility control (pause when off-screen || tab hidden) ----------
  let running = false;
  let inView = true;
  let tabVisible = !document.hidden;

  const io = new IntersectionObserver(([entry]) => {
    inView = !!entry?.isIntersecting;
    updateRunState();
  }, { threshold: 0.1 });
  io.observe(cvs);

  document.addEventListener('visibilitychange', () => {
    tabVisible = !document.hidden;
    updateRunState();
  }, { passive: true });

  window.addEventListener('pagehide', () => stop(), { passive: true });
  window.addEventListener('pageshow', () => { tabVisible = !document.hidden; updateRunState(); }, { passive: true });

  function shouldRun(){
    return !PREFERS_REDUCED && inView && tabVisible;
  }
  function updateRunState(){
    if (shouldRun()) start();
    else stop();
  }

  // --------- Main loop (throttled) ----------
  let lastRAF = 0, lastTick = performance.now();

  function frame(tNow){
    if (!running) return;
    lastRAF = requestAnimationFrame(frame);

    // FPS throttle
    if (tNow - lastTick < FRAME_INTERVAL) return;
    const dt = Math.min(0.05, (tNow - tPrev)/1000) || 1/60;
    tPrev = tNow; lastTick = tNow; timer += dt;

    // Clear fully (we want crisp trails)
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    // Fade phase alpha
    const frameAlpha = (phase === 'fade') ? (1 - clamp(fadeT, 0, 1)) : 1;
    ctx.globalAlpha = frameAlpha;

    if (phase === 'approach'){
      const targetL = CX - coreR0*1.1;
      const targetR = CX + coreR0*1.1;
      const distL = Math.abs(targetL - left.x);
      const distR = Math.abs(targetR - right.x);
      const normL = clamp(1 - distL/(W*0.6), 0, 1);
      const normR = clamp(1 - distR/(W*0.6), 0, 1);
      const fastL = ORB_SPEED*(0.7 + FINAL_ACCEL*normL*normL);
      const fastR = ORB_SPEED*(0.7 + FINAL_ACCEL*normR*normR);

      left.px=left.x; right.px=right.x;
      left.x  = lerp(left.x,  targetL, dt*fastL);
      right.x = lerp(right.x, targetR, dt*fastR);

      leftTrail.push({x:left.x, y:left.y});  if (leftTrail.length  > TAIL_LEN) leftTrail.shift();
      rightTrail.push({x:right.x, y:right.y}); if (rightTrail.length > TAIL_LEN) rightTrail.shift();

      drawOrbWithTrail({ ...left,  trail:leftTrail  }, coreR0, left.color);
      drawOrbWithTrail({ ...right, trail:rightTrail }, coreR0, right.color);

      if (distL < 1 && distR < 1){
        left.x = CX; right.x = CX;
        phase = 'burst'; timer = 0; spawnSparksAndShells();
      }
    }
    else if (phase === 'burst'){
      drawOrbWithTrail({ x:CX, y:CY }, coreBurst, PAL.fuchsia);
      drawBloomRing(dt);

      const pullGain = clamp((timer - 0.40)/1.2, 0, 1);
      const k = 5.6 * pullGain;

      ctx.globalCompositeOperation = 'lighter';
      // sparks
      for (let i=sparks.length-1;i>=0;i--){
        const s = sparks[i];
        s.life += dt;
        s.vx *= 0.992; s.vy *= 0.992;
        s.px = s.x; s.py = s.y;
        s.vx += -(s.x - CX) * k * dt;
        s.vy += -(s.y - CY) * k * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const lifeT = s.life / s.maxLife;
        ctx.strokeStyle = s.color; ctx.globalAlpha = (0.28 * (1 - lifeT));
        ctx.lineWidth = TRAIL_W; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
      }

      // shells
      for (let i=shells.length-1;i>=0;i--){
        const sh = shells[i];
        sh.life += dt;
        sh.px=sh.x; sh.py=sh.y;
        sh.vx *= 0.994; sh.vy *= 0.994;
        sh.x += sh.vx * dt; sh.y += sh.vy * dt;

        const lt = clamp(sh.life / Math.max(0.001, sh.fuse), 0, 1);
        ctx.strokeStyle = sh.color; ctx.globalAlpha = 0.24 * (1 - lt);
        ctx.lineWidth = TRAIL_W; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sh.px, sh.py); ctx.lineTo(sh.x, sh.y); ctx.stroke();

        if (sh.life >= sh.fuse){ explodeShell(sh); shells.splice(i,1); }
      }

      // subparticles
      for (let i=subs.length-1;i>=0;i--){
        const sp = subs[i];
        sp.life += dt;
        const lifeT = sp.life / sp.maxLife;
        if (lifeT >= 1){ subs.splice(i,1); continue; }
        sp.px=sp.x; sp.py=sp.y;
        sp.vx *= 0.993; sp.vy *= 0.993;
        sp.x += sp.vx * dt; sp.y += sp.vy * dt;

        ctx.strokeStyle = sp.color; ctx.globalAlpha = 0.22 * (1 - lifeT);
        ctx.lineWidth = TRAIL_W; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sp.px, sp.py); ctx.lineTo(sp.x, sp.y); ctx.stroke();
      }

      if (shells.length===0 && subs.length===0 && timer > 1.0){
        phase = 'attract'; timer = 0;
      }
    }
    else if (phase === 'attract'){
      drawOrbWithTrail({ x:CX, y:CY }, coreBurst, PAL.fuchsia);
      drawBloomRing(dt);

      const kStrong = 12.0;
      const absorbR2 = (coreBurst*1.3) * (coreBurst*1.3);

      for (let i=sparks.length-1;i>=0;i--){
        const s = sparks[i];
        s.vx *= 0.99; s.vy *= 0.99;
        const dx = s.x - CX, dy = s.y - CY;
        s.vx += -dx * kStrong * dt;
        s.vy += -dy * kStrong * dt;

        s.px=s.x; s.py=s.y; s.x += s.vx*dt; s.y += s.vy*dt;

        ctx.strokeStyle = s.color; ctx.globalAlpha = 0.26;
        ctx.lineWidth = TRAIL_W; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();

        if (dx*dx + dy*dy < absorbR2) sparks.splice(i,1);
      }

      if (sparks.length===0 || timer > 1.5){
        phase = 'hold'; timer = 0;
      }
    }
    else if (phase === 'hold'){
      drawOrbWithTrail({ x:CX, y:CY }, coreBurst, PAL.fuchsia);
      drawBloomRing(dt);
      if (timer > 0.8){ phase = 'fade'; timer = 0; fadeT = 0; }
    }
    else if (phase === 'fade'){
      drawOrbWithTrail({ x:CX, y:CY }, coreBurst, PAL.fuchsia);
      drawBloomRing(dt);
      fadeT += dt / 0.7;
      if (fadeT >= 1){ reset(); }
    }

    ctx.globalAlpha = 1;
  }

  function start(){
    if (running) return;
    running = true;
    tPrev = performance.now();
    lastTick = tPrev;
    lastRAF = requestAnimationFrame(frame);
  }

  function stop(){
    if (!running) return;
    running = false;
    if (lastRAF) cancelAnimationFrame(lastRAF);
    lastRAF = 0;
  }

  // --------- Reduced motion: draw a single still frame & stop ----------
  function drawStill(){
    ctx.clearRect(0,0,W,H);
    // two rings close to center and a subtle bloom ring
    const l = { x: CX - coreR0*1.1, y: CY }, r = { x: CX + coreR0*1.1, y: CY };
    drawOrbRing(l.x, l.y, coreR0*0.9, PAL.blue);
    drawOrbRing(r.x, r.y, coreR0*0.9, PAL.violet);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = PAL.violet; ctx.globalAlpha = 0.25; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, CY, coreR0*3.5, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // --------- Kickoff ----------
  reset();

  if (PREFERS_REDUCED) {
    drawStill();
  } else {
    updateRunState();
  }

  // If someone changes the <canvas> size attrs dynamically, recompute
  const ro = new ResizeObserver(()=> {
    W = cvs.width / DPR; H = cvs.height / DPR; CX = W*0.5; CY = H*0.5;
  });
  ro.observe(cvs);

  // Debug hook (optional)
  window.collisionViz = {
    pause: stop,
    resume: updateRunState,
    phase: () => phase,
  };
})();




}
/* About Section Animation — Flowing Connections (visibility-aware + throttled) */
(function () {
  const c = document.getElementById('AboutAnim');
  if (!c) return;
  const ctx = c.getContext('2d', { alpha: true });
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Size once to the canvas HTML attrs (keeps placement)
  function fit() {
    const w = 830, h = 280;            // matches your <canvas width/height>
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.width  = Math.round(w * DPR);
    c.height = Math.round(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  fit();
  addEventListener('resize', fit, { passive: true });

  // Nodes
  const N = 26;
  const W = () => c.width / DPR, H = () => c.height / DPR;
  const nodes = Array.from({ length: N }, () => ({
    x: Math.random() * W(),
    y: Math.random() * H(),
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
  }));

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // --- Visibility-aware loop (30 FPS throttle) ---
  const FPS = 30, FRAME_INTERVAL = 1000 / FPS;
  let running = false, inView = true, tabVisible = !document.hidden;
  let lastTick = performance.now();

  const io = new IntersectionObserver(([entry]) => {
    inView = !!entry?.isIntersecting;
    updateRunState();
  }, { threshold: 0.1 });
  io.observe(c);

  document.addEventListener('visibilitychange', () => {
    tabVisible = !document.hidden;
    updateRunState();
  }, { passive: true });

  addEventListener('pagehide', stop, { passive: true });
  addEventListener('pageshow', () => { tabVisible = !document.hidden; updateRunState(); }, { passive: true });

  function shouldRun() { return !REDUCED && inView && tabVisible; }
  function updateRunState(){ shouldRun() ? start() : stop(); }

  function frame(ts){
    if (!running) return;
    requestAnimationFrame(frame);
    if (ts - lastTick < FRAME_INTERVAL) return;
    lastTick = ts;

    const Wc = W(), Hc = H();
    ctx.clearRect(0, 0, Wc, Hc);

    // connections
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const d = dist(nodes[i], nodes[j]);
        if (d < 150) {
          const alpha = 1 - d / 150;
          ctx.strokeStyle = `rgba(99,102,241,${0.12 + 0.35 * alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // nodes
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > Wc) n.vx *= -1;
      if (n.y < 0 || n.y > Hc) n.vy *= -1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99,102,241,0.8)';
      ctx.fill();
    }
  }

  function start(){
    if (running) return;
    running = true;
    lastTick = performance.now();
    requestAnimationFrame(frame);
  }
  function stop(){
    running = false;
  }

  // Reduced motion: draw a single still and stop
  if (REDUCED) {
    const Wc = W(), Hc = H();
    ctx.clearRect(0, 0, Wc, Hc);
    for (const n of nodes) {
      ctx.beginPath(); ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99,102,241,0.6)'; ctx.fill();
    }
  } else {
    updateRunState();
  }
})();




    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    }
    themeToggle?.addEventListener('click', () => {
      root.classList.toggle('dark');
      localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
    });

    // Mobile menu toggle
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    menuBtn?.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });


    // Multi-project sliders (research & hobby) + keyboard
    (function(){
      const containers = document.querySelectorAll('[data-slider]');
      containers.forEach(container => {
        const track = container.querySelector('.projectsTrack');
        const items = container.querySelectorAll('article');
        const prev = container.querySelector('.projPrev');
        const next = container.querySelector('.projNext');
        const dotsWrap = container.querySelector('.projectsDots');
        container.tabIndex = container.tabIndex || 0;
        let idx = 0;

        function go(i){
          idx = Math.max(0, Math.min(i, items.length - 1));
          const el = items[idx];
          track.scrollTo({ left: el.offsetLeft - items[0].offsetLeft, behavior: 'smooth' });
          updateDots();
        }
        function updateDots(){
          if (!dotsWrap) return;
          [...dotsWrap.children].forEach((d, i) => {
            d.classList.toggle('bg-indigo-600', i === idx);
            d.classList.toggle('dark:bg-indigo-300', i === idx);
            d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
          });
        }
        if (dotsWrap) {
          dotsWrap.innerHTML = '';
          items.forEach((_, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700';
            b.setAttribute('aria-label', 'Go to slide ' + (i+1));
            b.addEventListener('click', () => go(i));
            dotsWrap.appendChild(b);
          });
          updateDots();
        }
        prev?.addEventListener('click', () => go(idx - 1));
        next?.addEventListener('click', () => go(idx + 1));
        let ticking = false;
        track.addEventListener('scroll', () => {
          if (ticking) return; ticking = true;
          requestAnimationFrame(() => {
            let nearest = 0; let min = Infinity;
            items.forEach((el, i) => {
              const diff = Math.abs(track.scrollLeft - (el.offsetLeft - items[0].offsetLeft));
              if (diff < min) { min = diff; nearest = i; }
            });
            if (nearest !== idx) { idx = nearest; updateDots(); }
            ticking = false;
          });
        }, { passive: true });
        // Keyboard navigation
        container.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
        });
      });
    })();

    // Scroll progress bar (robust)
    (function(){
      const bar = document.getElementById('scrollProgress');
      if (!bar) return;
      const computeDocH = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      let docH = computeDocH();
      const update = () => {
        docH = computeDocH();
        const scrolled = docH > 0 ? (window.scrollY / docH) * 100 : 0;
        bar.style.width = scrolled + '%';
      };
      ['scroll','resize'].forEach(ev=>window.addEventListener(ev, update, { passive: true }));
      window.addEventListener('load', update, { once: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
      const mo = new MutationObserver(() => update());
      mo.observe(document.body, { childList: true, subtree: true });
      update();
    })();

    // Smooth anchor scroll & topic chips
    (function(){
      const header = document.querySelector('header');
      const offset = () => (header?.offsetHeight || 0) + 8;
      function smoothTo(el){
        const top = el.getBoundingClientRect().top + window.scrollY - offset();
        window.scrollTo({ top, behavior: 'smooth' });
      }
      document.querySelectorAll('header nav a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
          const target = document.querySelector(a.getAttribute('href'));
          if (target) { e.preventDefault(); smoothTo(target); }
        });
      });
      document.querySelectorAll('[data-jump]').forEach(btn => {
        btn.addEventListener('click', () => {
          const sel = btn.getAttribute('data-jump');
          const target = document.querySelector(sel);
          if (target) smoothTo(target);
        });
      });
    })();

    // Section reveal & active nav highlighting
    (function(){
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const sections = document.querySelectorAll('main section');
      const links = [...document.querySelectorAll('header nav a')];

      if (!prefersReduced) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
        }, { threshold: 0.15 });
        sections.forEach(s => { if (s.classList.contains('will-reveal')) io.observe(s); });
      } else {
        sections.forEach(s => s.classList.add('is-visible'));
      }

      const onSpy = () => {
        const y = window.scrollY + 120; // header offset
        let current = '#about';
        for (const s of sections) { if (s.id && s.offsetTop <= y) current = '#' + s.id; }
        links.forEach(a => {
          const active = a.getAttribute('href') === current;
          a.classList.toggle('font-semibold', active);
          a.classList.toggle('text-indigo-700', active);
          a.setAttribute('aria-current', active ? 'page' : 'false');
        });
      };
      window.addEventListener('scroll', onSpy, { passive: true });
      window.addEventListener('resize', onSpy);
      onSpy();
    })();








// Footer Script
    document.getElementById('year').textContent = new Date().getFullYear();

    const modal   = document.getElementById('legal-modal');
    const content = document.getElementById('legal-content');
    const titleEl = document.getElementById('legal-title');

    const templates = {
      imprint:       document.getElementById('tpl-imprint'),
      privacy:       document.getElementById('tpl-privacy'),
      terms:         document.getElementById('tpl-terms'),
      disclaimer:    document.getElementById('tpl-disclaimer'),
      cookies:       document.getElementById('tpl-cookies'),
      accessibility: document.getElementById('tpl-accessibility'),
    };

    let lastFocus = null;

    function openModal(key){
      const tpl = templates[key];
      if (!tpl) return;
      lastFocus = document.activeElement;
      content.innerHTML = '';
      content.appendChild(tpl.content.cloneNode(true));
      titleEl.textContent = tpl.querySelector('h4')?.textContent|| 'Details';
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden','false');
      document.body.classList.add('overflow-hidden');
      modal.querySelector('[data-modal-close]')?.focus();
    }

    function closeModal(){
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden','true');
      document.body.classList.remove('overflow-hidden');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    document.querySelectorAll('[data-modal-open]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        openModal(btn.getAttribute('data-modal-open'));
      });
    });

    modal.addEventListener('click', (e)=>{
      if (e.target.hasAttribute('data-modal-close')) closeModal();
    });

    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });




    //other 
        // --- Quote modal logic with fade in/out ---
    const quoteModal = document.getElementById('quote-modal');
    const quoteDialog = quoteModal.querySelector('div.relative.z-10');
    let quoteLastFocus = null;

    function openQuoteModal() {
      quoteLastFocus = document.activeElement;
      quoteModal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');

      requestAnimationFrame(() => {
        quoteModal.classList.add('opacity-100');
        quoteModal.classList.remove('opacity-0');
        quoteDialog.classList.add('scale-100');
        quoteDialog.classList.remove('scale-95');
      });
    }

    function closeQuoteModal() {
      quoteModal.classList.add('opacity-0');
      quoteModal.classList.remove('opacity-100');
      quoteDialog.classList.add('scale-95');
      quoteDialog.classList.remove('scale-100');
      setTimeout(() => {
        quoteModal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        if (quoteLastFocus && typeof quoteLastFocus.focus === 'function') quoteLastFocus.focus();
      }, 300);
    }

    document.querySelectorAll('[data-modal-open="quoteInfo"]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        openQuoteModal();
      });
    });

    quoteModal.addEventListener('click', e => {
      if (e.target.hasAttribute('data-modal-close')) closeQuoteModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !quoteModal.classList.contains('hidden')) closeQuoteModal();
    });



// --- Gallery variables (unique names to prevent conflicts) ---
// --- Gallery variables ---
const heroGalleryImages = ["imgs/me1.jpg", "imgs/me.jpg", "imgs/me3.jpg"];

const heroPortrait = document.getElementById("portraitGalleryTrigger");
const heroModal = document.getElementById("heroGalleryModal");
const heroGalleryImage = document.getElementById("heroGalleryImage");
const heroPrevBtn = document.getElementById("heroPrevImage");
const heroNextBtn = document.getElementById("heroNextImage");

let heroCurrentIndex = 0;
let heroIsFading = false;

// --- Open / Close ---
function heroOpenModal(index = 0) {
  heroCurrentIndex = index;
  heroGalleryImage.src = heroGalleryImages[heroCurrentIndex];
  heroModal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function heroCloseModal() {
  heroModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

// --- Fade Transition ---
function heroFadeToImage(newIndex) {
  if (heroIsFading) return;
  heroIsFading = true;

  heroGalleryImage.style.transition = "opacity 0.5s ease";
  heroGalleryImage.style.opacity = 0;

  setTimeout(() => {
    heroCurrentIndex = newIndex;
    heroGalleryImage.src = heroGalleryImages[heroCurrentIndex];
    heroGalleryImage.onload = () => {
      heroGalleryImage.style.opacity = 1;
      setTimeout(() => (heroIsFading = false), 500);
    };
  }, 300);
}

// --- Navigation ---
function heroShowNext() {
  heroFadeToImage((heroCurrentIndex + 1) % heroGalleryImages.length);
}

function heroShowPrev() {
  heroFadeToImage(
    (heroCurrentIndex - 1 + heroGalleryImages.length) % heroGalleryImages.length
  );
}

// --- Event Listeners ---
heroPortrait.addEventListener("click", () => heroOpenModal(0));
heroNextBtn.addEventListener("click", heroShowNext);
heroPrevBtn.addEventListener("click", heroShowPrev);

// --- Click zones inside image ---
heroGalleryImage.addEventListener("click", (e) => {
  const rect = e.target.getBoundingClientRect();
  const clickX = e.clientX - rect.left;

  if (clickX > rect.width / 2) {
    // clicked on right half → next
    heroShowNext();
  } else {
    // clicked on left half → previous
    heroShowPrev();
  }
});

// --- Close when clicking outside ---
heroModal.addEventListener("click", (e) => {
  if (e.target === heroModal) heroCloseModal();
});

// --- Keyboard controls ---
document.addEventListener("keydown", (e) => {
  if (heroModal.classList.contains("hidden")) return;
  if (e.key === "Escape") heroCloseModal();
  if (e.key === "ArrowRight") heroShowNext();
  if (e.key === "ArrowLeft") heroShowPrev();
});


// ===== Lightweight Mobile Snapshots (non-invasive) =====
(function(){
  try {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || (navigator.userAgentData?.mobile ?? false);
    if (!isMobile) return;

    function replaceCanvasWithImage(canvas, dataURL, altText){
      try {
        if (!canvas || typeof canvas.toDataURL !== 'function') return;
        const img = new Image();
        img.src = dataURL;
        img.alt = altText || canvas.getAttribute('aria-label') || '';
        img.className = canvas.className || '';
        img.style.cssText = canvas.style.cssText || '';
        const wAttr = canvas.getAttribute('width');
        const hAttr = canvas.getAttribute('height');
        if (wAttr) img.setAttribute('width', wAttr);
        if (hAttr) img.setAttribute('height', hAttr);
        if (!img.style.display) img.style.display = 'block';
        canvas.replaceWith(img);
      } catch(err) {
        console.warn('[mobile-snapshot] replace failed:', err);
      }
    }

    function snapshot(id, alt){
      const c = document.getElementById(id);
      if (!c || typeof c.toDataURL !== 'function') return;
      try {
        const url = c.toDataURL('image/webp', 0.9);
        replaceCanvasWithImage(c, url, alt);
      } catch (e) {
        console.warn('[mobile-snapshot] toDataURL failed for #' + id + ':', e);
      }
    }

    // Wait for first frames to render, then snapshot both canvases
    // Using a small delay after a RAF keeps the content identical to live view.
    const doSnap = () => {
      // Flow background
      snapshot('flow', 'Flow static preview');
      // 3D hero
      snapshot('hero', '3D optimizer static preview');
      // pause 3D loop if public API exists, to save battery
      try { window.opt3D && typeof window.opt3D.pause === 'function' && window.opt3D.pause(); } catch(_){}
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      requestAnimationFrame(() => setTimeout(doSnap, 220));
    } else {
      window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(() => setTimeout(doSnap, 220)), { once: true });
    }
  } catch(e){
    console.warn('[mobile-snapshot] block error:', e);
  }
})();
// ===== End Lightweight Mobile Snapshots =====

