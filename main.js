// Schiffy Runner: Chrome's offline dino game in 3D. Schiffy from the Pupkins Whale Hub; sky islands + clouds from the
// Schiffy game's vn kit;
// trees, rocks and obstacles from KayKit (Forest Nature, Furniture Bits) and Tiny Treats (Homely House), all CC0.
// Camera sits behind Schiffy. Schiffy stays at z = 0 and the world scrolls toward +z (Schiffy runs toward -z).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ---- tuning (Chrome dino rules, in metres and seconds) ----
const SPEED0 = 14, SPEED_MID = 26, SPEED_MAX = 40;  // m/s
const ACCEL = 0.40, ACCEL_LATE = 0.12;              // m/s gained per second: 14 -> 26 in ~30 s, then slower climb to 40 (~2 min more)
const GRAVITY = 40, FAST_FALL = 90;
// jump feel (Ruben: fair, not frame-perfect): a held jump is big and forgiving; a quick tap is a small hop.
// hedge = hedge length in seconds of running (with hitbox margins). Live-tunable via window.__runner.tune.
const TUNE = { jumpV: 14, jumpCut: 3, hedge: 0.36 };
const SCORE_PER_M = 0.9;                           // ~10 pts/s at the start, like Chrome
const FLYERS_FROM = 50;                            // crows appear after this score (Ruben: early, ~45 % of spawns)
const LONG_FROM = 100;                             // long hedges (need a held jump) after this score
const SCHIFFY_H = 1.3, DUCK_SCALE = 0.55;
const FLYER_H = 0.75, CROW_SPAN = 1.3, CROW_FACING = Math.PI;
const SPAWN_Z = -75, DESPAWN_Z = 8;
const HI_KEY = 'schiffy-runner.hi';

// ---- renderer / scene ----
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const HAZE = new THREE.Color('#cfe9f7');
scene.background = skyTexture();
scene.fog = new THREE.Fog(HAZE, 35, 80);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
// 3/4 side view (Ruben's pick 'D'): right of and a little behind Schiffy, path runs up to the right
const CAM_POS = new THREE.Vector3(3.4, 1.6, 2.4), CAM_LOOK = new THREE.Vector3(-0.8, 0.9, -4);
const camLook = CAM_LOOK.clone();
camera.position.copy(CAM_POS);
camera.lookAt(CAM_LOOK);
// Fair view on every screen (Ruben): same camera spot for all, and every screen shows at least the same
// reference frame (55 deg vertical at 16:10). Narrow/tall screens zoom out to fit it, never move the camera.
const REF_FOV = 55, REF_ASPECT = 1.6;
const REF_TAN = Math.tan(THREE.MathUtils.degToRad(REF_FOV / 2));

scene.add(new THREE.HemisphereLight('#ffffff', '#7da35a', 1.5));
const sun = new THREE.DirectionalLight('#fff4dc', 2.4);
sun.position.set(4, 10, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -22, near: 1, far: 40 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
sun.target.position.set(0, 0, -6);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // narrower than the reference: widen the vertical FOV until the reference width fits
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(REF_TAN * Math.max(1, REF_ASPECT / camera.aspect)));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#6fb8ec');
  grd.addColorStop(0.55, '#a9daf6');
  grd.addColorStop(1, '#cfe9f7');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- ground: grass field + dirt path; textures scroll with distance so speed reads ----
function noiseTex(base, dots, n, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = dots[i % dots.length];
    const r = 1.5 + Math.random() * 4;
    g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, r * 1.4, r, 0, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
const PATH_W = 3.2;
const grassTex = noiseTex('#86c25a', ['#79b54f', '#94cf66', '#6faa48'], 500);
grassTex.repeat.set(30, 30);
const grass = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ map: grassTex }));
grass.rotation.x = -Math.PI / 2;
grass.position.z = -40;
grass.receiveShadow = true;
scene.add(grass);
const pathTex = noiseTex('#d9b98a', ['#c9a676', '#e6c99d', '#bf9c6b', '#b08d5f'], 260);
pathTex.repeat.set(1, 30);
const path = new THREE.Mesh(new THREE.PlaneGeometry(PATH_W, 120), new THREE.MeshLambertMaterial({ map: pathTex }));
path.rotation.x = -Math.PI / 2;
path.position.set(0, 0.01, -40);
path.receiveShadow = true;
scene.add(path);

// ---- loading ----
const draco = new DRACOLoader().setDecoderPath('./vendor/three/addons/libs/draco/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const load = (f) => loader.loadAsync('./assets/' + f);

function fitHeight(obj, h, byMax = false) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = h / (byMax ? Math.max(size.x, size.y, size.z) : size.y);
  obj.scale.multiplyScalar(s);
  box.setFromObject(obj);
  obj.position.y -= box.min.y; // stand on y = 0
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z;
  return obj;
}
function shadows(obj, cast = true) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = true; } });
  return obj;
}
// wrap so the fitted model can be moved by its pivot at its feet
function wrap(model, h, byMax) {
  const g = new THREE.Group();
  g.add(fitHeight(model, h, byMax));
  const box = new THREE.Box3().setFromObject(g);
  g.userData.half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  return g;
}

const PACK_FILES = {
  forest: ['Tree_1_A', 'Tree_1_B', 'Tree_1_C', 'Tree_2_A', 'Tree_2_C', 'Tree_2_E', 'Tree_3_A', 'Tree_3_B', 'Tree_4_A',
    'Tree_4_B', 'Tree_Bare_1_A', 'Bush_1_A', 'Bush_2_A', 'Bush_2_C', 'Bush_3_A', 'Bush_4_A', 'Rock_1_A', 'Rock_1_D',
    'Rock_2_A', 'Rock_3_A', 'Grass_1_A', 'Grass_2_A'].map((n) => n + '_Color1'),
  house: ['fence_straight', 'mailbox', 'bench_A', 'package', 'tree', 'tree_large', 'foliage_A', 'house'],
  furniture: ['cactus_small_A', 'cactus_medium_A'],
};
const packList = Object.entries(PACK_FILES).flatMap(([dir, names]) => names.map((n) => [dir, n]));
const [schiffyGltf, clipsGltf, skyKit, crowGltf, ...packGltfs] = await Promise.all(
  ['schiffy.glb', 'schiffy-clips.glb', 'schiffy-env/vn_kit.glb', 'crow.glb',
    ...packList.map(([dir, n]) => `${dir}/${n}.gltf`)].map(load));

// ---- Schiffy ----
const schiffy = new THREE.Group();
const schiffyBody = new THREE.Group();          // squashed for ducking
schiffy.add(schiffyBody);
const schiffyModel = schiffyGltf.scene;
schiffyBody.add(fitHeight(schiffyModel, SCHIFFY_H));
schiffyModel.rotation.y = Math.PI;               // back to the camera, facing the run direction
shadows(schiffyModel);
scene.add(schiffy);
const mixer = new THREE.AnimationMixer(schiffyModel);
const clips = [...schiffyGltf.animations, ...clipsGltf.animations];
const clip = (n) => clips.find((c) => c.name === n);
const runAct = mixer.clipAction(clip('PSPS_Run'));
const idleAct = mixer.clipAction(clip('PSPS_Idle'));
const jumpClip = clip('PSPS_Jump');
const jumpAct = mixer.clipAction(jumpClip);
jumpAct.setLoop(THREE.LoopOnce, 1);
jumpAct.clampWhenFinished = true;
idleAct.play();

// ---- props (KayKit + Tiny Treats packs), by short name: 'Tree_1_A', 'fence_straight', ... ----
const propSrc = {};
packList.forEach(([, n], i) => { propSrc[n.replace('_Color1', '')] = packGltfs[i].scene; });
// "Bird" by Poly by Google, CC-BY (credit in the Credits panel). The model is z-up and wings along y:
// lay it flat (wings across x) and point the body along z, toward the runner.
crowGltf.scene.rotation.x = -Math.PI / 2;
propSrc.crow = new THREE.Group().add(crowGltf.scene);
propSrc.crow.rotation.y = Math.PI / 2;
function prop(name, h, byMax) {
  return shadows(wrap(propSrc[name].clone(true), h, byMax));
}

// ---- sky: floating islands bob far away, clouds drift slowly across (no fog) ----
// placed around the camera's view direction (it looks forward-left, toward -x / -z)
const skyThings = [], clouds = [];
function skyObj(name, h, x, y, z, ry, bob = 0) {
  const g = wrap(skyKit.scene.getObjectByName(name).clone(true), h, true);
  g.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.fog = false; } });
  g.position.set(x, y, z); g.rotation.y = ry;
  g.userData.base = new THREE.Vector3(x, y, z); g.userData.bob = bob;
  scene.add(g);
  return g;
}
skyThings.push(skyObj('isle_float', 22, -95, 26, -150, 0.4, 1.2));
skyThings.push(skyObj('isle_castle', 26, -20, 34, -190, -0.3, 0.9));
skyThings.push(skyObj('isle_float', 14, -150, 38, -70, 1.6, 0.7));
skyThings.push(skyObj('isle_float', 10, 30, 24, -160, 2.4, 0.6));
const CLOUD_X0 = -220, CLOUD_X1 = 120;
for (let i = 0; i < 16; i++) {
  const z = -60 - Math.random() * 180;
  const c = skyObj(i % 4 ? 'cloud_day' : 'cloud_bank', 12 + Math.random() * 16,
    CLOUD_X0 + Math.random() * (CLOUD_X1 - CLOUD_X0), 14 + Math.random() * 30, z, Math.random() * 0.6 - 0.3);
  c.userData.speed = 1 + Math.random() * 1.5;
  clouds.push(c);
}

// ---- roadside scenery: recycled along both sides ----
// [name, height, kind]: tree = stands further out, edge = sits right at the path edge facing it
const SCENERY = [['Tree_1_A', 5, 'tree'], ['Bush_1_A', 1.0], ['Tree_2_A', 4.2, 'tree'], ['mailbox', 1.1, 'edge'],
  ['Tree_3_A', 5.5, 'tree'], ['Rock_2_A', 0.8], ['Tree_4_A', 4.5, 'tree'], ['bench_A', 0.9, 'edge'], ['tree_large', 5, 'tree'],
  ['Bush_3_A', 1.1], ['Tree_1_B', 4.6, 'tree'], ['foliage_A', 0.9], ['Tree_2_C', 3.8, 'tree'], ['Tree_Bare_1_A', 4, 'tree'],
  ['Bush_4_A', 0.9], ['tree', 3.6, 'tree'], ['Tree_4_B', 5, 'tree'], ['Rock_3_A', 0.7], ['Tree_3_B', 4.8, 'tree']];
const scenery = [];
const SCENERY_SPAN = 96, SCENERY_N = 30;
for (let i = 0; i < SCENERY_N; i++) {
  const [name, h, kind] = SCENERY[(i * 7) % SCENERY.length];
  // camera sits on the right: edge props (bench, mailbox) only on the left, right-side props stand further out
  const side = kind === 'edge' ? -1 : i % 2 ? 1 : -1;
  const g = prop(name, h * (0.85 + Math.random() * 0.3));
  g.position.set(side * (PATH_W / 2 + (kind === 'tree' ? 3.5 : 1.3) + (side > 0 ? 1.5 : 0) + Math.random() * 5), 0, DESPAWN_Z - (i / SCENERY_N) * SCENERY_SPAN);
  g.rotation.y = Math.random() * Math.PI * 2;
  if (kind === 'edge') { g.position.x = side * (PATH_W / 2 + 0.8); g.rotation.y = side * -Math.PI / 2; }
  scene.add(g); scenery.push(g);
}
// grass tufts close to the path so the ground reads as moving
for (let i = 0; i < 36; i++) {
  const side = i % 2 ? 1 : -1;
  const g = prop(i % 3 ? 'Grass_1_A' : 'Grass_2_A', 0.35 + Math.random() * 0.2);
  g.position.set(side * (PATH_W / 2 + 0.2 + Math.random() * 2.5), 0, DESPAWN_Z - (i / 36) * SCENERY_SPAN);
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g); scenery.push(g);
}
// a cottage far off on the left, recycled with the rest
{ const g = prop('house', 6); g.position.set(-16, 0, -40); g.rotation.y = Math.PI * 0.3; scene.add(g); scenery.push(g); }

// ---- obstacles: potted cacti (a nod to Chrome), parcels, rocks, bushes, fence hurdles (jump); flying crows (duck or jump) ----
// [name, height, fixed]: fixed = keep the model's own facing (the fence spans the path)
const GROUND_KINDS = [['cactus_small_A', 0.9], ['cactus_medium_A', 1.1], ['package', 0.6], ['Rock_1_A', 0.7],
  ['Bush_2_A', 0.8], ['fence_straight', 0.8, true]];
const pool = new Map();
function take(name, h, byMax) {
  const key = name + h;
  const list = pool.get(key) || [];
  const g = list.pop() || prop(name, h, byMax);
  g.userData.key = key;
  return g;
}
function give(g) {
  scene.remove(g);
  const list = pool.get(g.userData.key) || [];
  list.push(g); pool.set(g.userData.key, list);
}
const obstacles = []; // { g, y0, y1, hz }

function spawnGround() {
  const [name, h, fixed] = GROUND_KINDS[Math.floor(Math.random() * GROUND_KINDS.length)];
  // Chrome: bigger cactus groups once the game is faster
  const maxN = speed > 17 ? 3 : speed > 13 ? 2 : 1;
  const n = 1 + Math.floor(Math.random() * maxN);
  let z = SPAWN_Z;
  for (let i = 0; i < n; i++) {
    if (i > 0 && SPAWN_Z - z > speed * 0.18) break; // keep every group jumpable at the current speed
    const g = take(name, h);
    g.position.set((Math.random() - 0.5) * 0.3, 0, z);
    g.rotation.y = fixed ? 0 : Math.random() * Math.PI * 2;
    scene.add(g);
    const hz = fixed ? g.userData.half.z : Math.min(g.userData.half.z, g.userData.half.x, 0.55); // round props: forgiving footprint
    obstacles.push({ g, y0: 0, y1: g.userData.half.y * 2, hz, spin: 0 });
    z -= hz * 2 + 0.1;
  }
  return SPAWN_Z - z;
}
// a long low hedge: a quick tap's short hop lands in it, a held full jump clears it. Its length scales with speed:
// it covers TUNE.hedge s of running: a held jump has ~0.27 s of timing slack, an 80 ms tap hop falls ~0.06 s short.
const HEDGE_H = 0.55, HEDGE_STEP = 0.8, HEDGE_EDGE = 0.72; // HEDGE_EDGE = hitbox margin per end (hz * 0.8 + Schiffy)
function spawnLong() {
  const len = Math.max(HEDGE_STEP, speed * TUNE.hedge - 2 * HEDGE_EDGE);
  const n = Math.max(2, Math.round(len / HEDGE_STEP) + 1);
  for (let i = 0; i < n; i++) {
    const g = take(i % 2 ? 'Bush_1_A' : 'Bush_2_A', HEDGE_H);
    g.position.set(0, 0, SPAWN_Z - i * (len / (n - 1)));
    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
    obstacles.push({ g, y0: 0, y1: HEDGE_H, hz: 0.55, spin: 0, long: i === 0 });
  }
  return len + 1.1;
}
function spawnFlyer() {
  // three heights like Chrome's pterodactyl: low = jump, mid = duck, high = harmless
  const yBase = [0.25, 0.95, 1.55][Math.floor(Math.random() * 3)];
  const g = take('crow', CROW_SPAN, true);
  g.position.set(0, yBase, SPAWN_Z);
  g.rotation.y = CROW_FACING; // head toward the runner
  scene.add(g);
  // the crow is flat (wings spread), so its hitbox gets a minimum height to stay fair to read
  obstacles.push({ g, y0: yBase, y1: yBase + Math.max(g.userData.half.y * 2, 0.4), hz: 0.35, spin: 0, flyer: true, base: yBase });
  return FLYER_H;
}

// ---- sound (tiny WebAudio beeps, Chrome-style) ----
let actx = null;
function beep(freq, dur, type = 'square', vol = 0.06, slide = 0) {
  if (!actx) return;
  const t = actx.currentTime, o = actx.createOscillator(), v = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(v).connect(actx.destination); o.start(t); o.stop(t + dur);
}
const sfx = {
  jump: () => beep(520, 0.12, 'square', 0.05, 260),
  point: () => { beep(880, 0.08); setTimeout(() => beep(1320, 0.12), 90); },
  die: () => { beep(220, 0.25, 'sawtooth', 0.07, -120); setTimeout(() => beep(150, 0.3, 'sawtooth', 0.06, -60), 120); },
};

// ---- game state ----
const scoreEl = document.getElementById('score');
const card = document.getElementById('card');
let state = 'ready'; // ready | run | over
let speed = SPEED0, dist = 0, nextGap = 30, nextKind = 'ground', vy = 0, y = 0;
let jumpHeld = false, ducking = false, blinkT = 0, lastMilestone = 0, overT = 0, runT = 0;
let hi = 0;
try { hi = +localStorage.getItem(HI_KEY) || 0; } catch {}

const pad = (n) => String(Math.floor(n)).padStart(5, '0');
function score() { return dist * SCORE_PER_M; }
function drawScore() {
  scoreEl.innerHTML = (hi ? `<span class="hi">HI ${pad(hi)}</span>` : '') + `<span class="cur">${pad(blinkT > 0 ? lastMilestone : score())}</span>`;
  scoreEl.classList.toggle('blink', blinkT > 0 && Math.floor(blinkT * 4) % 2 === 0);
}
function showCard(t, s, k) {
  card.querySelector('.t').textContent = t;
  card.querySelector('.s').textContent = s;
  card.querySelector('.k').textContent = k;
  card.classList.remove('hide');
}
const touch = matchMedia('(pointer: coarse)').matches;
const KEYS_HINT = touch ? 'Tap to jump · swipe down to duck' : 'Space / Up to jump · Down to duck';

function reset() {
  for (const o of obstacles) give(o.g);
  obstacles.length = 0;
  speed = SPEED0; dist = 0; nextGap = 30; nextKind = 'ground'; vy = 0; y = 0; ducking = false; blinkT = 0; lastMilestone = 0; runT = 0;
  schiffy.position.y = 0;
}
function start() {
  reset();
  state = 'run';
  card.classList.add('hide');
  idleAct.stop(); jumpAct.stop();
  runAct.reset().play();
}
function gameOver() {
  state = 'over'; overT = 0;
  sfx.die();
  const s = Math.floor(score());
  const best = s > hi;
  if (best) { hi = s; try { localStorage.setItem(HI_KEY, String(hi)); } catch {} }
  mixer.timeScale = 0; // freeze the pose like Chrome freezes the dino
  showCard('GAME OVER', `${best ? 'NEW BEST ' : 'SCORE '}${pad(s)}`, touch ? 'Tap to run again' : 'Space to run again');
}

function pressJump() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
  jumpHeld = true;
  if (state === 'ready') { start(); return; }
  if (state === 'over') { if (overT > 0.4) { mixer.timeScale = 1; start(); } return; }
  if (y <= 0.001 && !ducking) {
    vy = TUNE.jumpV;
    sfx.jump();
    runAct.stop();
    jumpAct.reset();
    jumpAct.timeScale = jumpClip.duration / (2 * TUNE.jumpV / GRAVITY) * 0.9;
    jumpAct.play();
  }
}
function releaseJump() {
  jumpHeld = false;
  if (state === 'run' && vy > TUNE.jumpCut) vy = TUNE.jumpCut; // short hop on a quick tap, like Chrome
}

// credits panel (start / game-over screens): taps on it never start a run
const creditsEl = document.getElementById('credits');
const creditsOpen = () => !creditsEl.classList.contains('hide');
document.getElementById('creditsBtn').addEventListener('click', () => creditsEl.classList.remove('hide'));
creditsEl.addEventListener('click', () => creditsEl.classList.add('hide'));

addEventListener('keydown', (e) => {
  if (creditsOpen()) { creditsEl.classList.add('hide'); e.preventDefault(); return; }
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); pressJump(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); if (state === 'run') ducking = true; }
});
addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') releaseJump();
  if (e.code === 'ArrowDown' || e.code === 'KeyS') ducking = false;
});
let touchY = null, duckTimer = 0;
addEventListener('pointerdown', (e) => {
  if (e.target.closest('#creditsBtn, #credits')) return;
  touchY = e.clientY; pressJump();
});
addEventListener('pointermove', (e) => {
  if (touchY !== null && e.clientY - touchY > 40 && state === 'run') { ducking = true; duckTimer = 0.7; releaseJump(); touchY = null; }
});
addEventListener('pointerup', () => { touchY = null; releaseJump(); });

// ---- main loop ----
const clock = new THREE.Clock();
let skyT = 0;
function step(dt) {
  skyT += dt;
  for (const s of skyThings) s.position.y = s.userData.base.y + Math.sin(skyT * 0.5 + s.userData.base.x) * s.userData.bob;
  for (const c of clouds) if ((c.position.x += c.userData.speed * dt) > CLOUD_X1) c.position.x = CLOUD_X0;

  if (state === 'over') { overT += dt; return; }
  if (state === 'ready') { mixer.update(dt); return; }

  runT += dt;
  speed = Math.min(SPEED_MAX, speed + (speed < SPEED_MID ? ACCEL : ACCEL_LATE) * dt);
  const dz = speed * dt;
  dist += dz;

  // milestone every 100 points: blink + chime
  const m = Math.floor(score() / 100) * 100;
  if (m > lastMilestone) { lastMilestone = m; blinkT = 1; sfx.point(); }
  if (blinkT > 0) blinkT -= dt;

  // Schiffy vertical motion
  if (duckTimer > 0) { duckTimer -= dt; if (duckTimer <= 0) ducking = false; }
  if (y > 0 || vy > 0) {
    vy -= (ducking ? FAST_FALL : GRAVITY) * dt;
    y += vy * dt;
    if (y <= 0) { y = 0; vy = 0; jumpAct.stop(); runAct.reset().play(); }
  }
  schiffy.position.y = y;
  // camera rises with half the jump height so a full jump stays on screen (same for every screen size)
  camera.position.y = CAM_POS.y + y * 0.5;
  camLook.set(CAM_LOOK.x, CAM_LOOK.y + y * 0.5, CAM_LOOK.z);
  camera.lookAt(camLook);
  const duckNow = ducking && y === 0;
  schiffyBody.scale.y += ((duckNow ? DUCK_SCALE : 1) - schiffyBody.scale.y) * Math.min(1, dt * 20);
  schiffyBody.scale.x = schiffyBody.scale.z = 1 + (1 - schiffyBody.scale.y) * 0.35;
  runAct.timeScale = 0.8 + (speed - SPEED0) / (SPEED_MID - SPEED0) * 0.8;
  mixer.update(dt);

  // scroll the world
  pathTex.offset.y += dz / (120 / 30);
  grassTex.offset.y += dz / (120 / 30);
  // right-side props recycle early: the camera sits on that side and they would clip through it
  for (const s of scenery) if ((s.position.z += dz) > (s.position.x > 0 ? -1.5 : DESPAWN_Z)) s.position.z -= SCENERY_SPAN;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.g.position.z += dz;
    if (o.flyer) {
      o.g.position.z += speed * 0.15 * dt; // flyers come at you a bit faster, like Chrome's pterodactyls
      o.g.rotation.z = Math.sin(runT * 3 + i) * 0.25; // no flap clip: glide and bank
      o.g.position.y = o.base + Math.sin(runT * 6 + i) * 0.06;
    }
    if (o.g.position.z > DESPAWN_Z) { give(o.g); obstacles.splice(i, 1); }
  }

  // spawn: gap scales with speed so every gap is jumpable, random extra like Chrome
  nextGap -= dz;
  if (nextGap <= 0) {
    const len = nextKind === 'fly' ? spawnFlyer() : nextKind === 'long' ? spawnLong() : spawnGround();
    // pick the NEXT kind now: ground can come back-to-back (0.65 s), but a crow keeps 0.95 s so you have
    // landed from the last jump before you must duck / jump it (no crow hits mid-air you couldn't avoid)
    const r = Math.random(), sc = score();
    nextKind = sc > FLYERS_FROM && r < 0.45 ? 'fly' : sc > LONG_FROM && r > 0.8 ? 'long' : 'ground';
    const minGap = speed * (nextKind === 'fly' ? 0.95 : 0.65) + len + 3;
    nextGap = minGap * (1 + Math.random() * 0.5);
  }

  // collision: Schiffy's box (forgiving, like Chrome's hit boxes)
  const sh = SCHIFFY_H * schiffyBody.scale.y * 0.88, sz = 0.28;
  for (const o of obstacles) {
    const oz = o.g.position.z, oy0 = o.flyer ? o.g.position.y : 0, oy1 = o.flyer ? oy0 + (o.y1 - o.y0) : o.y1 * 0.85;
    if (Math.abs(oz) < o.hz * 0.8 + sz && y < oy1 && y + sh > oy0 + 0.05) { gameOver(); break; }
  }
}

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (!window.__runner.paused) step(dt);
  drawScore();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.__runner = {
  tune: TUNE,
  setCam(p, l) { camera.position.set(...p); camera.lookAt(...l); },
  paused: false,
  get state() { return state; }, get speed() { return speed; }, get score() { return score(); }, get y() { return y; },
  obstacles, start, pressJump, releaseJump,
  setDuck(v) { ducking = v; },
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt); },
};

showCard('SCHIFFY RUNNER', touch ? 'TAP TO RUN' : 'PRESS SPACE TO RUN', KEYS_HINT);
frame();
