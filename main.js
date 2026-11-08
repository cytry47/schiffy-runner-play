// Schiffy Runner: Chrome's offline dino game in 3D. Schiffy from the Pupkins Whale Hub; sky islands + clouds from the
// Schiffy game's vn kit;
// trees, rocks, props, obstacles and birds = Ruben's own Tripo models (assets/tripo, assets/birds); grass tufts = KayKit (CC0).
// Camera sits behind Schiffy. Schiffy stays at z = 0 and the world scrolls toward +z (Schiffy runs toward -z).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone as skelClone } from 'three/addons/utils/SkeletonUtils.js';
import { createLive } from './audio.js';

// ---- tuning (Chrome dino rules, in metres and seconds) ----
const SPEED0 = 14, SPEED_MID = 26, SPEED_MAX = 40;  // m/s
const ACCEL = 0.40, ACCEL_LATE = 0.12;              // m/s gained per second: 14 -> 26 in ~30 s, then slower climb to 40 (~2 min more)
const GRAVITY = 40, FAST_FALL = 90;
// jump feel (Ruben: fair, not frame-perfect): a held jump is big and forgiving; a quick tap is a small hop.
// hedge = hedge length in seconds of running (with hitbox margins). Live-tunable via window.__runner.tune.
const TUNE = { jumpV: 14, jumpCut: 3, hedge: 0.36 };
const SCORE_PER_M = 0.9;                           // ~10 pts/s at the start, like Chrome
const FLYERS_FROM = 50;                            // birds appear after this score (Ruben: early, ~45 % of spawns)
const LONG_FROM = 100;                             // long hedges (need a held jump) after this score
// forced duck (Ruben 2026-11-07): a branch over the path with a beehive hanging into the middle zone. Hitbox runs from
// the hive bottom (0.9 m) to far above a full jump, so only a duck passes (ducked Schiffy ~0.72 m, upright 1.3 m).
const HIVE_FROM = 150, HIVE_Y0 = 0.9, HIVE_Y1 = 9, HIVE_BRANCH_Y = 2.55;
const HIVE_OAK_YAW = Math.PI, HIVE_X = 0.6, HIVE_BEFORE = 1.0, HIVE_AFTER = 0.8;         // s of running before (landed + ducked) / after (stand up + jump)
const SCHIFFY_H = 1.3, DUCK_SCALE = 0.55;
// flyers (2026-11-08): owl / hummingbird / yellow bird, random per spawn. Hitbox stays the crow's: 0.4 m tall from the
// spawn height, hz 0.35. h = visual height of the scaled model, centred on the hitbox.
const FLYER_H = 0.75, FLYER_BOX = 0.4, FLYER_HZ = 0.35;
// tone < 1 darkens the model a little so it stands out from the bright day / dusk background (tools/progression.py)
const BIRDS = { owl: { h: 0.72, glide: true, tone: 0.5 }, hummingbird: { h: 0.8, glide: false, tone: 0.5 }, yellow_bird: { h: 0.72, glide: true, tone: 1 } };
const SPAWN_Z = -75, DESPAWN_Z = 8;
const HI_KEY = 'schiffy-runner.hi';
// speed tiers: names for the existing ramp (no rule change). A banner shows when one is reached:
// 1 = start 14, 2 = 20 (~15 s), 3 = 26 (SPEED_MID, ~30 s), 4 = 34 (~1:40); cap stays 40.
const SPEED_TIERS = [14, 20, 26, 34], BANNER_T = 1.2;
// touch + pause (job D, 2026-11-07): a swipe = finger moved this far down; a swipe this soon after the same finger's
// tap-jump cancels that jump (no accidental hop into a beehive); timed duck after a lifted swipe; resume countdown.
const SWIPE_EARLY = 0.2, DUCK_TAP_T = 0.7, DUCK_HOLD_T = 0.25, COUNT_T = 1.5;
const swipePx = () => Math.max(18, Math.min(36, innerHeight * 0.06));

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

const hemi = new THREE.HemisphereLight('#ffffff', '#7da35a', 1.5);
scene.add(hemi);
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
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // redrawn by the day/night cycle (applySky)
  t.userData.paint = (top, mid, bot) => {
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, top); grd.addColorStop(0.55, mid); grd.addColorStop(1, bot);
    g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
    t.needsUpdate = true;
  };
  t.userData.paint('#6fb8ec', '#a9daf6', '#cfe9f7');
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
// Tripo models already sit with their base centre at the origin: scale by height only, keep that pivot (trunks stay put)
function fitBase(obj, h) {
  const box = new THREE.Box3().setFromObject(obj);
  obj.scale.multiplyScalar(h / (box.max.y - box.min.y));
  box.setFromObject(obj);
  obj.position.y -= box.min.y;
  return obj;
}
// wrap so the fitted model can be moved by its pivot at its feet
function wrap(model, h, byMax, base) {
  const g = new THREE.Group();
  g.add(base ? fitBase(model, h) : fitHeight(model, h, byMax));
  const box = new THREE.Box3().setFromObject(g);
  g.userData.half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  return g;
}

// Ruben's Tripo models (assets/tripo/MAP.md) + KayKit grass tufts (no Tripo tuft: 20k tris x 36 isn't worth it)
const TRIPO = ['tree_oak', 'tree_round', 'tree_birch', 'tree_pine', 'tree_blossom', 'tree_autumn', 'tree_apple',
  'bush_broadleaf', 'bush_holly', 'hedge_bush', 'hedge_leafy', 'rock_mossy', 'rock_boulders', 'rock_pile', 'fern',
  'mushrooms', 'cactus_barrel', 'cactus_saguaro', 'crate', 'log_branch', 'bench', 'signpost', 'house'];
const PACK_FILES = { forest: ['Grass_1_A', 'Grass_2_A'].map((n) => n + '_Color1') };
const packList = Object.entries(PACK_FILES).flatMap(([dir, names]) => names.map((n) => [dir, n]));
const BIRD_IDS = Object.keys(BIRDS);
const loaded = await Promise.all(
  ['schiffy.glb', 'schiffy-clips.glb', 'schiffy-env/vn_kit.glb', ...BIRD_IDS.map((b) => `birds/${b}.glb`),
    ...TRIPO.map((n) => `tripo/${n}.glb`), ...packList.map(([dir, n]) => `${dir}/${n}.gltf`)].map(load));
const [schiffyGltf, clipsGltf, skyKit] = loaded;
const birdGltfs = loaded.slice(3, 3 + BIRD_IDS.length);
const tripoGltfs = loaded.slice(3 + BIRD_IDS.length, 3 + BIRD_IDS.length + TRIPO.length);
const packGltfs = loaded.slice(3 + BIRD_IDS.length + TRIPO.length);

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

// ---- props by short name: Tripo ids ('tree_oak', 'log_branch', ...) + KayKit grass ('Grass_1_A') ----
const propSrc = {}, isTripo = new Set(TRIPO);
packList.forEach(([, n], i) => { propSrc[n.replace('_Color1', '')] = packGltfs[i].scene; });
TRIPO.forEach((n, i) => { propSrc[n] = tripoGltfs[i].scene; });
function prop(name, h, byMax, cast = true) {
  return shadows(wrap(propSrc[name].clone(true), h, byMax, isTripo.has(name)), cast);
}
// the log's trunk is about half its height (the stub on top reaches the full 0.7 m): measure the trunk top across
// the log's length (median of the per-slice max y) so the obstacle can be scaled until the trunk reads like its hitbox
function trunkTop(obj) {
  const bins = new Array(24).fill(-Infinity), v = new THREE.Vector3();
  const box = new THREE.Box3().setFromObject(obj);
  obj.updateMatrixWorld(true);
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      const b = Math.min(23, Math.floor((v.x - box.min.x) / (box.max.x - box.min.x) * 24));
      if (v.y > bins[b]) bins[b] = v.y;
    }
  });
  const s = bins.slice(3, 21).sort((a, b) => a - b); // skip the ragged ends
  return { top: s[Math.floor(s.length / 2)] - box.min.y, h: box.max.y - box.min.y };
}

// ---- birds: rigged Tripo birds (Fly loop, Glide for owl + yellow bird); face +Z = toward the runner ----
// each pooled bird = SkeletonUtils clone + its own mixer; the model is re-centred on its body (origin sits at the feet)
const birdSrc = BIRD_IDS.map((id, i) => ({ id, gltf: birdGltfs[i], ...BIRDS[id] }));
for (const b of birdSrc) b.gltf.scene.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => m.color.multiplyScalar(b.tone)); });
const birdMats = new Set();
function selfGlow(m) { if (m.map && m.emissiveMap !== m.map) { m.emissiveMap = m.map; m.needsUpdate = true; } return m; }
function makeBird(src) {
  const model = skelClone(src.gltf.scene);
  const box = new THREE.Box3().setFromObject(model);
  const s = src.h / (box.max.y - box.min.y);
  model.scale.setScalar(s);
  const c = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
  model.position.set(-c.x, -c.y + FLYER_BOX / 2, -c.z); // body centre at the middle of the 0.4 m hitbox
  const g = new THREE.Group();
  g.add(model);
  shadows(g);
  model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; [].concat(o.material).forEach((m) => m.emissive && birdMats.add(selfGlow(m))); } });
  const mixer = new THREE.AnimationMixer(model);
  const fly = mixer.clipAction(THREE.AnimationClip.findByName(src.gltf.animations, 'Fly'));
  const glideClip = THREE.AnimationClip.findByName(src.gltf.animations, 'Glide');
  const glide = glideClip ? mixer.clipAction(glideClip) : null;
  g.userData = { mixer, fly, glide, bird: src.id, key: 'bird:' + src.id };
  skyDirty = true; // new materials pick up the current glow
  return g;
}

// ---- sky: floating islands bob far away, clouds drift slowly across (no fog) ----
// placed around the camera's view direction (it looks forward-left, toward -x / -z)
const skyThings = [], clouds = [], skyMats = []; // skyMats: tinted by the day/night cycle
function skyObj(name, h, x, y, z, ry, bob = 0) {
  const g = wrap(skyKit.scene.getObjectByName(name).clone(true), h, true);
  g.traverse((o) => {
    if (o.isMesh) { o.material = o.material.clone(); o.material.fog = false; o.material.userData.base = o.material.color.clone(); skyMats.push(o.material); }
  });
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

// ---- day / night cycle by score (Chrome-like, 2026-11-07): day -> dusk -> night -> dawn, repeating ----
// each change blends over SKY_BLEND s of play. Fairness: night keeps a strong cool key light and darkens the
// ground + sky more than the obstacles, so silhouettes stay as readable as by day (tools/progression.py measures it).
const CYCLE = 1600, SKY_BLEND = 3;
const PHASES = [[700, 'day'], [900, 'dusk'], [1450, 'night'], [1600, 'dawn']]; // [score end in the cycle, phase]
const pal = (o) => {
  const out = {};
  for (const [k, v] of Object.entries(o)) out[k] = typeof v === 'number' ? v : Array.isArray(v) ? new THREE.Vector3(...v) : new THREE.Color(v);
  return out;
};
const PAL = {
  day: pal({ top: '#6fb8ec', mid: '#a9daf6', bot: '#cfe9f7', haze: '#cfe9f7', hemiSky: '#ffffff', hemiGround: '#7da35a',
    hemiI: 1.5, sunC: '#fff4dc', sunI: 2.4, sunPos: [4, 10, 4], grass: '#ffffff', path: '#ffffff', sky: '#ffffff', stars: 0, birdLift: 0, hiveLift: 0 }),
  // warm low sun: longer shadows, orange / pink sky
  dusk: pal({ top: '#5b6db5', mid: '#e98f9c', bot: '#ffb56e', haze: '#f3b48d', hemiSky: '#ffd9c4', hemiGround: '#7b6a48',
    hemiI: 1.25, sunC: '#ffad6a', sunI: 2.6, sunPos: [7, 7, 5], grass: '#ffd9b5', path: '#fff4ea', sky: '#ffc0a2', stars: 0.15, birdLift: 0, hiveLift: 0 }),
  // deep blue, cool moon key light; ground + sky darker than the lit obstacles
  night: pal({ top: '#08122e', mid: '#152756', bot: '#25396b', haze: '#22345f', hemiSky: '#7f97d6', hemiGround: '#1d2838',
    hemiI: 0.85, sunC: '#d4e0ff', sunI: 2.5, sunPos: [3, 9, 6], grass: '#4a5c86', path: '#5d6c96', sky: '#4f5f92', stars: 1, birdLift: 0.4, hiveLift: 0.22 }),
  dawn: pal({ top: '#4b7dc4', mid: '#c9a3cc', bot: '#ffd2aa', haze: '#efc9b9', hemiSky: '#ffe9e2', hemiGround: '#7a8b5a',
    hemiI: 1.35, sunC: '#ffd2a3', sunI: 2.4, sunPos: [6, 7.5, 6], grass: '#f2dcd0', path: '#fff4ee', sky: '#f0c8c0', stars: 0.2, birdLift: 0, hiveLift: 0 }),
};
const clonePal = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, typeof v === 'number' ? v : v.clone()]));
const skyCur = clonePal(PAL.day);
let skyFrom = null, skyTo = 'day', skyK = 1, skyDirty = true;
function phaseAt(sc) { const m = sc % CYCLE; return PHASES.find(([e]) => m < e)[1]; }
function mixPal(out, a, b, t) {
  for (const k in b) out[k] = typeof b[k] === 'number' ? a[k] + (b[k] - a[k]) * t : out[k].copy(a[k]).lerp(b[k], t);
}
function snapSky(name) { skyTo = name; skyK = 1; mixPal(skyCur, PAL[name], PAL[name], 0); skyDirty = true; }
function updateSky(sc, dt) {
  const ph = phaseAt(sc);
  if (ph !== skyTo) { skyFrom = clonePal(skyCur); skyTo = ph; skyK = 0; }
  if (skyK < 1) {
    skyK = Math.min(1, skyK + dt / SKY_BLEND);
    const t = skyK * skyK * (3 - 2 * skyK);
    mixPal(skyCur, skyFrom, PAL[skyTo], t);
    skyDirty = true;
  }
}
// a few stars + a pale moon, in the part of the sky the camera sees (it looks forward-left: -x / -z)
const stars = (() => {
  const pos = [];
  for (let i = 0; i < 90; i++) {
    const a = -Math.PI * 0.95 + Math.random() * Math.PI * 0.8, e = 0.12 + Math.random() * 0.75, r = 300;
    pos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fffbe8', size: 2.2, sizeAttenuation: false,
    transparent: true, opacity: 0, fog: false, depthWrite: false }));
  p.renderOrder = -1;
  scene.add(p);
  return p;
})();
const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: '#f5f1dc', transparent: true, opacity: 0, fog: false, depthWrite: false }));
moon.position.set(-140, 95, -230);
moon.lookAt(CAM_POS);
scene.add(moon);
function applySky() {
  if (!skyDirty) return;
  skyDirty = false;
  const c = skyCur;
  scene.background.userData.paint('#' + c.top.getHexString(), '#' + c.mid.getHexString(), '#' + c.bot.getHexString());
  scene.fog.color.copy(c.haze);
  hemi.color.copy(c.hemiSky); hemi.groundColor.copy(c.hemiGround); hemi.intensity = c.hemiI;
  sun.color.copy(c.sunC); sun.intensity = c.sunI;
  sun.position.copy(c.sunPos);
  grass.material.color.copy(c.grass); path.material.color.copy(c.path);
  for (const m of skyMats) m.color.copy(m.userData.base).multiply(c.sky);
  // birds glow a little in their OWN colours (emissiveMap = map) at dusk / dawn / night, the hive tree at night, so they
  // never sink into the warm or dark background (tools/progression.py: without it night/dusk dE fell to 12-19)
  const glow = (m, k) => (m.emissiveMap ? m.emissive.setScalar(k) : m.emissive.copy(m.color).multiplyScalar(k));
  for (const m of birdMats) glow(m, c.birdLift);
  for (const m of hiveMats.values()) glow(m, c.hiveLift);
  stars.material.opacity = c.stars; stars.visible = c.stars > 0.01;
  moon.material.opacity = Math.max(0, (c.stars - 0.3) / 0.7); moon.visible = moon.material.opacity > 0.01;
}

// ---- roadside scenery: recycled along both sides ----
// [name, height, kind]: tree = stands further out, edge = sits right at the path edge facing it
// (2026-11-08: Tripo models per assets/tripo/MAP.md, old heights kept; signpost stands in for the mailbox)
const SCENERY = [['tree_oak', 5, 'tree'], ['bush_broadleaf', 1.0], ['tree_birch', 4.2, 'tree'], ['signpost', 1.1, 'edge'],
  ['tree_pine', 5.5, 'tree'], ['rock_boulders', 0.8], ['tree_blossom', 4.5, 'tree'], ['bench', 0.9, 'edge'], ['tree_round', 5, 'tree'],
  ['bush_holly', 1.1], ['tree_round', 4.6, 'tree'], ['fern', 0.9], ['tree_birch', 3.8, 'tree'], ['tree_autumn', 4, 'tree'],
  ['hedge_leafy', 0.9], ['tree_apple', 3.6, 'tree'], ['tree_autumn', 5, 'tree'], ['rock_pile', 0.7], ['tree_pine', 4.8, 'tree'],
  ['mushrooms', 0.6]];
const scenery = [];
const SCENERY_SPAN = 96, SCENERY_N = 30;
for (let i = 0; i < SCENERY_N; i++) {
  const [name, h, kind] = SCENERY[(i * 7) % SCENERY.length];
  // camera sits on the right: edge props (bench, mailbox) only on the left, right-side props stand further out
  const side = kind === 'edge' ? -1 : i % 2 ? 1 : -1;
  // shadows: only near things cast (the sun's shadow box is ~20 m wide); trees further than 7 m out skip the shadow pass
  const x = side * (PATH_W / 2 + (kind === 'tree' ? 3.5 : 1.3) + (side > 0 ? 1.5 : 0) + Math.random() * 5);
  const g = prop(name, h * (0.85 + Math.random() * 0.3), false, Math.abs(x) < 7);
  g.position.set(x, 0, DESPAWN_Z - (i / SCENERY_N) * SCENERY_SPAN);
  g.rotation.y = Math.random() * Math.PI * 2;
  if (kind === 'edge') { g.position.x = side * (PATH_W / 2 + 0.8); g.rotation.y = side * -Math.PI / 2; }
  scene.add(g); scenery.push(g);
}
// grass tufts close to the path so the ground reads as moving
for (let i = 0; i < 36; i++) {
  const side = i % 2 ? 1 : -1;
  const g = prop(i % 3 ? 'Grass_1_A' : 'Grass_2_A', 0.35 + Math.random() * 0.2, false, false);
  g.position.set(side * (PATH_W / 2 + 0.2 + Math.random() * 2.5), 0, DESPAWN_Z - (i / 36) * SCENERY_SPAN);
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g); scenery.push(g);
}
// a cottage far off on the left, recycled with the rest
{ const g = prop('house', 6, false, false); g.position.set(-16, 0, -40); g.rotation.y = Math.PI * 0.3; scene.add(g); scenery.push(g); }

// ---- obstacles: cacti (a nod to Chrome), crates, rocks, bushes, log hurdles (jump); flying birds (duck or jump) ----
// Gameplay boxes are FIXED numbers (the old KayKit props' measured boxes, 2026-11-08): y1 = hitbox top, hz = half depth.
// The Tripo model is fitted to y1 and its footprint scaled (0.85-1.15) toward hz so what you see is what kills you.
// yaw: 'rand' | 'fixed' (model's own facing: the log spans the path) | 'z' (saguaro: arms along the run, ~hz deep)
const GROUND_KINDS = [
  { name: 'cactus_barrel', y1: 0.9, hz: 0.408 }, { name: 'cactus_saguaro', y1: 1.1, hz: 0.55, yaw: 'z' },
  { name: 'crate', y1: 0.6, hz: 0.48 }, { name: 'rock_mossy', y1: 0.7, hz: 0.374 }, { name: 'bush_holly', y1: 0.8, hz: 0.4 },
  // log: hitbox = the old fence's (top 0.8, hz 0.094); the model is scaled up until its TRUNK (not the stub) is ~0.62 m,
  // just under the 0.68 m the collision really uses (y1 * 0.85)
  { name: 'log_branch', y1: 0.8, hz: 0.094, yaw: 'fixed', trunk: 0.62 },
];
const pool = new Map();
function obstacleProp(k) {
  if (k.trunk) {
    const probe = prop(k.name, 1);
    const t = trunkTop(probe);
    k.h = k.trunk / (t.top / t.h);
  }
  const g = prop(k.name, k.h || k.y1);
  // centre the footprint on the pivot (the log's origin sits off its middle)
  const c = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
  g.children[0].position.x -= c.x; g.children[0].position.z -= c.z;
  const half = g.userData.half, vis = k.yaw === 'z' ? half.z : k.yaw === 'fixed' ? k.hz : Math.min(half.x, half.z);
  const sxz = THREE.MathUtils.clamp(k.hz / vis, 0.85, 1.15);
  g.children[0].scale.x *= sxz; g.children[0].scale.z *= sxz;
  return g;
}
function take(k) {
  const key = k.name;
  const list = pool.get(key) || [];
  const g = list.pop() || obstacleProp(k);
  g.userData.key = key;
  return g;
}
const HEDGE_KINDS = [{ name: 'hedge_bush', y1: 0.55, hz: 0.55 }, { name: 'hedge_leafy', y1: 0.55, hz: 0.55 }];
function give(g) {
  scene.remove(g);
  const list = pool.get(g.userData.key) || [];
  list.push(g); pool.set(g.userData.key, list);
}
const obstacles = []; // { g, y0, y1, hz }

// first obstacle (Ruben 2026-11-08: ~8 s of nothing was too long): one small ground prop already in view, FIRST_Z ahead,
// so it reaches Schiffy ~2.5 s into the run at 14 m/s. Placed on the first run frame when auto-spawn is on (test hooks
// that turn auto-spawn off right after start() never get it). The normal spawner then starts FIRST_GAP later.
const FIRST_Z = -35, FIRST_GAP = 15, FIRST_KINDS = ['crate', 'rock_mossy', 'cactus_barrel'];
let firstPending = false;
function spawnFirst() {
  const name = FIRST_KINDS[Math.floor(Math.random() * FIRST_KINDS.length)];
  const k = GROUND_KINDS.find((g) => g.name === name);
  const g = take(k);
  g.position.set(0, 0, FIRST_Z);
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g);
  obstacles.push({ g, y0: 0, y1: k.y1, hz: k.hz, spin: 0 });
}
function spawnGround() {
  const k = GROUND_KINDS[Math.floor(Math.random() * GROUND_KINDS.length)];
  // Chrome: bigger cactus groups once the game is faster
  const maxN = speed > 17 ? 3 : speed > 13 ? 2 : 1;
  const n = 1 + Math.floor(Math.random() * maxN);
  let z = SPAWN_Z;
  for (let i = 0; i < n; i++) {
    if (i > 0 && SPAWN_Z - z > speed * 0.18) break; // keep every group jumpable at the current speed
    const g = take(k);
    g.position.set((Math.random() - 0.5) * 0.3, 0, z);
    g.rotation.y = k.yaw === 'fixed' ? 0 : k.yaw === 'z' ? (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.6
      : Math.random() * Math.PI * 2;
    scene.add(g);
    const hz = k.hz;
    obstacles.push({ g, y0: 0, y1: k.y1, hz, spin: 0 });
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
    const g = take(HEDGE_KINDS[i % 2]);
    g.position.set(0, 0, SPAWN_Z - i * (len / (n - 1)));
    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
    obstacles.push({ g, y0: 0, y1: HEDGE_H, hz: 0.55, spin: 0, long: i === 0 });
  }
  return len + 1.1;
}
// ---- beehive branch: a tree at the left path edge reaches a leafy bough across the path, a skep hive hangs from it ----
const HIVE_MAT = new THREE.MeshLambertMaterial({ color: '#f0b437' });
const hiveMats = new Map(); // hive-tree material -> its night-lift copy
const HIVE_HOLE = new THREE.MeshBasicMaterial({ color: '#3a2412' });
const BARK = new THREE.MeshLambertMaterial({ color: '#8a5a36' });
function hiveGeometry() {
  // stacked rounded rings (straw skep), widest in the middle, domed top
  const pts = [new THREE.Vector2(0, 0)];
  const rings = [0.30, 0.37, 0.39, 0.36, 0.30, 0.21];
  const ringH = 0.15;
  rings.forEach((r, i) => {
    for (let k = 0; k <= 6; k++) {
      const a = k / 6;
      pts.push(new THREE.Vector2(r * (0.86 + 0.14 * Math.sin(a * Math.PI)), i * ringH + a * ringH));
    }
  });
  pts.push(new THREE.Vector2(0.09, rings.length * ringH + 0.04), new THREE.Vector2(0, rings.length * ringH + 0.05));
  return new THREE.LatheGeometry(pts, 20);
}
const hiveGeo = hiveGeometry();
function buildHive() {
  const g = new THREE.Group();
  // tree trunk + crown at the left edge (Tripo oak; its crown leans toward the path), the bough reaches across to past the right edge
  const tree = prop('tree_oak', 5.2);
  tree.position.set(-(PATH_W / 2 + 1.0), 0, 0);
  tree.rotation.y = HIVE_OAK_YAW;
  g.add(tree);
  const bx0 = -(PATH_W / 2 + 0.9), bx1 = PATH_W / 2 + 0.6;
  const bough = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.2, bx1 - bx0, 10), BARK);
  bough.rotation.z = Math.PI / 2 + 0.05;
  bough.position.set((bx0 + bx1) / 2, HIVE_BRANCH_Y, 0);
  g.add(bough);
  // leafy clumps along the bough fill the high zone
  [[-1.25, 0.95], [-0.1, 0.85], [1.05, 0.8], [1.75, 0.55]].forEach(([x, h], i) => {
    const b = prop(i % 2 ? 'hedge_leafy' : 'hedge_bush', h);
    b.position.set(x, HIVE_BRANCH_Y - 0.12 - x * 0.025, (i % 2 ? 0.08 : -0.08));
    b.rotation.y = i * 1.7;
    g.add(b);
  });
  // the hive swings a tiny bit from its stem (no bees)
  const sway = new THREE.Group();
  sway.position.set(HIVE_X, HIVE_BRANCH_Y - 0.05, 0); // right of centre: from the 3/4 camera it then hangs over the path
  const stemLen = HIVE_BRANCH_Y - 0.05 - (HIVE_Y0 + 0.95);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, stemLen + 0.05, 6), BARK);
  stem.position.y = -stemLen / 2;
  const hive = new THREE.Mesh(hiveGeo, HIVE_MAT);
  hive.position.y = -(stemLen + 0.95);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), HIVE_HOLE);
  hole.scale.y = 0.75;
  hole.position.set(0, 0.24, 0.375); // dark entrance facing the runner
  hive.add(hole);
  sway.add(stem, hive);
  g.add(sway);
  g.userData.sway = sway;
  g.userData.key = 'hive';
  g.traverse((o) => {
    if (!o.isMesh || o.material === HIVE_MAT || o.material === HIVE_HOLE) return;
    if (!hiveMats.has(o.material)) hiveMats.set(o.material, selfGlow(o.material.clone()));
    o.material = hiveMats.get(o.material);
  });
  skyDirty = true;
  return shadows(g);
}
function spawnHive() {
  const list = pool.get('hive') || [];
  const g = list.pop() || buildHive();
  g.position.set(0, 0, SPAWN_Z);
  scene.add(g);
  obstacles.push({ g, y0: HIVE_Y0, y1: HIVE_Y1, hz: 0.45, spin: 0, hive: true });
  return 1.2;
}
function spawnFlyer(bird) { // bird = optional id (test hook: force one species)
  // three heights like Chrome's pterodactyl: low = jump, mid = duck, high = harmless
  const hi = Math.floor(Math.random() * 3);
  const yBase = [0.25, 0.95, 1.55][hi];
  const src = birdSrc.find((b) => b.id === bird) || birdSrc[Math.floor(Math.random() * birdSrc.length)];
  const list = pool.get('bird:' + src.id) || [];
  const g = list.pop() || makeBird(src);
  g.position.set(0, yBase, SPAWN_Z);
  g.rotation.set(0, 0, 0); // glTF +Z = toward the runner
  // the high, harmless ones may glide; everything you must dodge flaps. Random phase so a flock never syncs.
  const u = g.userData, act = hi === 2 && u.glide && Math.random() < 0.5 ? u.glide : u.fly;
  u.mixer.stopAllAction();
  act.reset().play();
  act.time = Math.random() * act.getClip().duration;
  u.mixer.update(0);
  scene.add(g);
  obstacles.push({ g, y0: yBase, y1: yBase + FLYER_BOX, hz: FLYER_HZ, spin: 0, flyer: true, base: yBase });
  return FLYER_H;
}

// ---- sound: code-made soft cartoon SFX + looping music (audio.js), created on the first real gesture ----
const MUTE_KEY = 'schiffy-runner.mute';
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch {}
let audio = null; // null until a real key / tap (test hooks never make one, so bot runs stay silent)
function ensureAudio() { if (!audio) audio = createLive(muted); }
const sfx = (name) => (audio ? audio.play(name) : null);
let jumpVoice = null, wasDuck = false;
const muteBtn = document.getElementById('muteBtn');
function setMute(m) {
  muted = m; try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch {}
  muteBtn.classList.toggle('off', m); muteBtn.setAttribute('aria-label', m ? 'Sound off' : 'Sound on');
  soundBtn.textContent = m ? 'SOUND: OFF' : 'SOUND: ON';
  audio?.setMuted(m);
}
const soundBtn = document.getElementById('soundBtn');
muteBtn.classList.toggle('off', muted);
soundBtn.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
muteBtn.addEventListener('click', () => { ensureAudio(); setMute(!muted); muteBtn.blur(); });
soundBtn.addEventListener('click', () => { ensureAudio(); setMute(!muted); soundBtn.blur(); });

// ---- game state ----
const scoreEl = document.getElementById('score');
const card = document.getElementById('card');
const bannerEl = document.getElementById('banner');
let state = 'ready'; // ready | run | over
let autoSpawn = true, speedLock = 0; // test hooks
let speed = SPEED0, dist = 0, nextGap = 30, nextKind = 'ground', vy = 0, y = 0;
// ducking = any duck source: Down key held, a swiped finger still down, the timed duck after a lifted swipe, test hook
let keyDuck = false, hookDuck = false, duckTimer = 0;
const fingers = new Map(); // pointerId -> { y0, t0 (runT), jumped, duck, duckT (runT of the swipe) }
let jumpFinger = null;
let pauseOn = false, countT = 0; // game pause (P / Esc / button / tab hidden) + resume countdown
let jumpHeld = false, ducking = false, blinkT = 0, lastMilestone = 0, overT = 0, runT = 0, tier = 1, bannerT = 0;
let hi = 0;
try { hi = +localStorage.getItem(HI_KEY) || 0; } catch {}

const pad = (n) => String(Math.floor(n)).padStart(5, '0');
function score() { return dist * SCORE_PER_M; }
function drawBanner() {
  if (bannerT <= 0) { bannerEl.style.opacity = 0; return; }
  const a = BANNER_T - bannerT; // pop in 0.15 s, hold, fade the last 0.3 s
  bannerEl.style.opacity = Math.min(1, a / 0.15, bannerT / 0.3);
  bannerEl.style.transform = `translateX(-50%) scale(${1 + 0.25 * Math.max(0, 1 - a / 0.15)})`;
}
function drawScore() {
  scoreEl.innerHTML = (hi ? `<span class="hi">HI ${pad(hi)}</span>` : '') + `<span class="cur">${pad(blinkT > 0 ? lastMilestone : score())}</span>`;
  scoreEl.classList.toggle('blink', blinkT > 0 && Math.floor(blinkT * 4) % 2 === 0);
}
function showCard(mode, t, s, k, best = '') {
  card.querySelector('.t').textContent = t;
  card.querySelector('.s').textContent = s;
  card.querySelector('.b').innerHTML = best;
  card.querySelector('.k').textContent = k;
  card.className = 'ui pop ' + mode;
  void card.offsetWidth; // restart the entrance animation
}
const countEl = document.getElementById('count');
const pauseCardS = document.querySelector('#pauseCard .s');
function setUi(mode) { document.body.dataset.ui = mode; }
// controls hint per device: coarse pointer = touch; switches live on the first real touch / key
let touch = matchMedia('(pointer: coarse)').matches;
const hints = () => touch
  ? { run: 'TAP TO RUN', again: 'Tap to run again', resume: 'Tap to resume',
    keys: 'Tap = jump (hold = higher) · swipe down = duck (keep the finger down to stay ducked)' }
  : { run: 'PRESS SPACE TO RUN', again: 'Space to run again', resume: 'Space / P to resume',
    keys: 'Space / Up = jump (hold = higher) · Down = duck · P = pause · M = sound' };
function setTouch(t) {
  if (t === touch) return;
  touch = t;
  const h = hints();
  if (state === 'ready') showTitle();
  else if (state === 'over') card.querySelector('.k').textContent = h.again;
  pauseCardS.textContent = h.resume;
}
function showTitle() {
  const h = hints();
  showCard('title', 'SCHIFFY RUNNER', h.run, h.keys, hi > 0 ? `<div>BEST ${pad(hi)}</div>` : '');
  setUi('title');
}

function reset() {
  for (const o of obstacles) give(o.g);
  obstacles.length = 0;
  speed = SPEED0; dist = 0; nextGap = FIRST_GAP; firstPending = true; nextKind = 'ground'; vy = 0; y = 0; ducking = false; blinkT = 0; lastMilestone = 0; runT = 0;
  keyDuck = hookDuck = false; duckTimer = 0; for (const f of fingers.values()) { f.duck = false; f.jumped = false; } jumpFinger = null;
  pauseOn = false; countT = 0; countEl.classList.remove('on');
  tier = 1; bannerT = 0; snapSky('day');
  schiffy.position.y = 0;
}
function start() {
  reset();
  state = 'run';
  card.classList.add('hide'); setUi('run');
  idleAct.stop(); jumpAct.stop();
  runAct.reset().play();
  sfx('ui'); audio?.musicStart(); wasDuck = false;
}
function gameOver() {
  state = 'over'; overT = 0;
  sfx('over'); audio?.musicStop();
  const s = Math.floor(score());
  const best = s > hi;
  if (best) { hi = s; try { localStorage.setItem(HI_KEY, String(hi)); } catch {} if (audio) setTimeout(() => state === 'over' && sfx('best'), 900); }
  mixer.timeScale = 0; // freeze the pose like Chrome freezes the dino
  countEl.classList.remove('on');
  showCard('over', 'GAME OVER', `SCORE ${pad(s)}`, hints().again,
    (best ? '<div class="nb">NEW BEST!</div>' : '') + `<div>BEST ${pad(hi)}</div>`);
  setUi('over');
}

function pressJump() {
  if (pauseOn) { resumeGame(); return false; } // jump on the pause card resumes, never jumps
  if (countT > 0) return false;
  jumpHeld = true;
  if (state === 'ready') { start(); return false; }
  if (state === 'over') { if (overT > 0.4) { mixer.timeScale = 1; start(); } return false; }
  updDuck();
  if (y <= 0.001 && !ducking) {
    vy = TUNE.jumpV;
    jumpVoice = sfx('jump');
    runAct.stop();
    jumpAct.reset();
    jumpAct.timeScale = jumpClip.duration / (2 * TUNE.jumpV / GRAVITY) * 0.9;
    jumpAct.play();
    return true;
  }
  return false;
}
function releaseJump() {
  jumpHeld = false;
  if (state === 'run' && vy > TUNE.jumpCut) { vy = TUNE.jumpCut; audio?.cut(jumpVoice); } // short hop on a quick tap, like Chrome (the boing tail is cut = smaller sound)
}

// credits panel (start / game-over screens): taps on it never start a run
const creditsEl = document.getElementById('credits');
const creditsOpen = () => !creditsEl.classList.contains('hide');
document.getElementById('creditsBtn').addEventListener('click', () => creditsEl.classList.remove('hide'));
creditsEl.addEventListener('click', () => creditsEl.classList.add('hide'));

function updDuck() {
  let f = false;
  for (const v of fingers.values()) f ||= v.duck;
  ducking = keyDuck || hookDuck || duckTimer > 0 || f;
}

// ---- pause: P / Esc / pause button / tab hidden / window blur. Resume = 3-2-1 countdown (COUNT_T), then play ----
function pauseGame() {
  if (state !== 'run' || pauseOn) return;
  pauseOn = true; countT = 0; countEl.classList.remove('on');
  pauseCardS.textContent = hints().resume;
  setUi('pause');
  audio?.setPaused(true);
}
function resumeGame() {
  if (!pauseOn) return;
  pauseOn = false; countT = COUNT_T; drawCount(true);
  setUi('run');
  audio?.setPaused(false);
}
let countShown = 0;
function drawCount(force) {
  const n = countT > 0 ? Math.ceil(countT / (COUNT_T / 3)) : 0;
  if (n === countShown && !force) return;
  countShown = n;
  countEl.classList.toggle('on', n > 0);
  countEl.innerHTML = n > 0 ? `<span>${n}</span>` : '';
}
const togglePause = () => (pauseOn ? resumeGame() : countT > 0 ? (pauseOn = false, countT = 0, pauseGame()) : pauseGame());
const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.addEventListener('click', () => { ensureAudio(); togglePause(); pauseBtn.blur(); });
// lost focus: inputs may never get their key-up / pointer-up, so drop them, then pause
function dropInputs() { keyDuck = false; fingers.clear(); jumpFinger = null; jumpHeld = false; updDuck(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { dropInputs(); pauseGame(); } });
addEventListener('blur', () => { dropInputs(); pauseGame(); });

addEventListener('keydown', (e) => {
  if (creditsOpen()) { creditsEl.classList.add('hide'); e.preventDefault(); return; }
  if (e.repeat) return;
  ensureAudio(); setTouch(false);
  if (e.code === 'KeyM') { setMute(!muted); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); pressJump(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); if (state === 'run') { keyDuck = true; updDuck(); } }
});
addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') releaseJump();
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { keyDuck = false; updDuck(); }
});
// touch (and mouse): tap = jump, hold = higher (release cuts it, like the keyboard); swipe down = duck / fast fall,
// keep that finger down = stay ducked until it lifts; a quick flick (lift within DUCK_HOLD_T) = duck for DUCK_TAP_T. Every finger is tracked by
// pointerId, only the finger that jumped can cut the jump, and no tap jumps while ducked (multi-touch safe).
addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, #credits')) return;
  ensureAudio(); setTouch(e.pointerType === 'touch');
  const f = { y0: e.clientY, t0: runT, jumped: false, duck: false };
  fingers.set(e.pointerId, f);
  if (state === 'run' && !pauseOn && countT <= 0 && (jumpFinger !== null || ducking)) return; // busy: never an accidental jump
  if (pressJump()) jumpFinger = e.pointerId;
  f.jumped = jumpFinger === e.pointerId;
});
addEventListener('pointermove', (e) => {
  const f = fingers.get(e.pointerId);
  if (!f || f.duck || state !== 'run' || pauseOn || e.clientY - f.y0 < swipePx()) return;
  f.duck = true; f.duckT = runT; duckTimer = DUCK_TAP_T;
  if (f.jumped && runT - f.t0 < SWIPE_EARLY) vy = Math.min(vy, 0); // the swipe began with a tap: cancel that jump
  else if (vy > TUNE.jumpCut) { vy = TUNE.jumpCut; audio?.cut(jumpVoice); }
  if (jumpFinger === e.pointerId) { jumpFinger = null; jumpHeld = false; }
  updDuck(); // in the air: ducking = fast fall
});
function fingerUp(e) {
  const f = fingers.get(e.pointerId);
  if (!f) return;
  fingers.delete(e.pointerId);
  // a held swipe (>= DUCK_HOLD_T) stands up on lift; a quick flick keeps the timed duck
  if (f.duck && runT - f.duckT >= DUCK_HOLD_T) duckTimer = 0;
  if (jumpFinger === e.pointerId) { jumpFinger = null; releaseJump(); }
  updDuck();
}
addEventListener('pointerup', fingerUp);
addEventListener('pointercancel', fingerUp);
// no long-press menu / pinch / double-tap zoom / page scroll (touch-action: none is in index.html)
addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// ---- main loop ----
const clock = new THREE.Clock();
let skyT = 0;
function step(dt) {
  skyT += dt;
  for (const s of skyThings) s.position.y = s.userData.base.y + Math.sin(skyT * 0.5 + s.userData.base.x) * s.userData.bob;
  for (const c of clouds) if ((c.position.x += c.userData.speed * dt) > CLOUD_X1) c.position.x = CLOUD_X0;

  if (state === 'over') { overT += dt; card.classList.toggle('armed', overT > 0.4); return; }
  if (state === 'run' && pauseOn) return;
  if (state === 'run' && countT > 0) { countT -= dt; drawCount(); if (countT > 0) return; countT = 0; drawCount(); }
  if (state === 'ready') { mixer.update(dt); return; }

  runT += dt;
  if (firstPending) { firstPending = false; if (autoSpawn) spawnFirst(); }
  speed = speedLock || Math.min(SPEED_MAX, speed + (speed < SPEED_MID ? ACCEL : ACCEL_LATE) * dt);
  const tierNow = SPEED_TIERS.filter((v) => speed >= v - 1e-6).length;
  if (tierNow > tier) { tier = tierNow; bannerT = BANNER_T; bannerEl.textContent = 'SPEED ' + tier; sfx('tier'); }
  if (bannerT > 0) bannerT -= dt;
  updateSky(score(), dt);
  audio?.setNight(skyTo === 'night'); // music: same tune, softer + low-passed at night
  const dz = speed * dt;
  dist += dz;

  // milestone every 100 points: blink + chime
  const m = Math.floor(score() / 100) * 100;
  if (m > lastMilestone) { lastMilestone = m; blinkT = 1; sfx('point'); }
  if (blinkT > 0) blinkT -= dt;

  // Schiffy vertical motion
  if (duckTimer > 0) duckTimer = Math.max(0, duckTimer - dt);
  updDuck();
  if (y > 0 || vy > 0) {
    vy -= (ducking ? FAST_FALL : GRAVITY) * dt;
    y += vy * dt;
    if (y <= 0) { y = 0; vy = 0; jumpAct.stop(); runAct.reset().play(); sfx('land'); }
  }
  schiffy.position.y = y;
  // camera rises with half the jump height so a full jump stays on screen (same for every screen size)
  camera.position.y = CAM_POS.y + y * 0.5;
  camLook.set(CAM_LOOK.x, CAM_LOOK.y + y * 0.5, CAM_LOOK.z);
  camera.lookAt(camLook);
  const duckNow = ducking && y === 0;
  if (duckNow && !wasDuck) sfx('duck');
  wasDuck = duckNow;
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
      o.g.rotation.z = Math.sin(runT * 3 + i) * 0.1; // a little bank
      o.g.position.y = o.base + Math.sin(runT * 6 + i) * 0.06;
      o.g.userData.mixer.update(dt);
    }
    if (o.hive) o.g.userData.sway.rotation.z = Math.sin(runT * 2.2) * 0.05; // tiny sway
    if (o.g.position.z > DESPAWN_Z) { give(o.g); obstacles.splice(i, 1); }
  }

  // spawn: gap scales with speed so every gap is jumpable, random extra like Chrome
  nextGap -= dz;
  if (autoSpawn && nextGap <= 0) {
    const prev = nextKind;
    const len = prev === 'fly' ? spawnFlyer() : prev === 'long' ? spawnLong() : prev === 'hive' ? spawnHive() : spawnGround();
    // pick the NEXT kind now: ground can come back-to-back (0.65 s), but a bird keeps 0.95 s so you have
    // landed from the last jump before you must duck / jump it (no bird hits mid-air you couldn't avoid)
    const r = Math.random(), sc = score();
    nextKind = sc > FLYERS_FROM && r < 0.45 ? 'fly' : sc > HIVE_FROM && r < 0.62 ? 'hive'
      : sc > LONG_FROM && r > 0.8 ? 'long' : 'ground';
    // hive: ~17 % of spawns from score 150, never next to a bird; 1.0 s before it (landed and ducked), 0.8 s after
    if ((prev === 'fly' && nextKind === 'hive') || (prev === 'hive' && nextKind === 'fly')) nextKind = 'ground';
    const before = nextKind === 'fly' ? 0.95 : nextKind === 'hive' ? HIVE_BEFORE : 0.65;
    const minGap = speed * Math.max(before, prev === 'hive' ? HIVE_AFTER : 0) + len + 3;
    nextGap = minGap * (1 + Math.random() * 0.5);
  }

  // collision: Schiffy's box (forgiving, like Chrome's hit boxes)
  const sh = SCHIFFY_H * schiffyBody.scale.y * 0.88, sz = 0.28;
  for (const o of obstacles) {
    const oz = o.g.position.z, oy0 = o.flyer ? o.g.position.y : o.y0,
      oy1 = o.flyer ? oy0 + (o.y1 - o.y0) : o.hive ? o.y1 : o.y1 * 0.85;
    if (Math.abs(oz) < o.hz * 0.8 + sz && y < oy1 && y + sh > oy0 + 0.05) { gameOver(); break; }
  }
}

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  if (!window.__runner.paused) step(dt);
  drawScore(); drawBanner(); applySky();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.__runner = {
  tune: TUNE,
  setCam(p, l) { camera.position.set(...p); camera.lookAt(...l); },
  paused: false,
  get state() { return state; }, get audio() { return audio; }, get muted() { return muted; }, get tier() { return tier; }, get skyPhase() { return skyTo; }, get skyBlend() { return skyK; },
  get dist() { return dist; }, set dist(v) { dist = v; lastMilestone = Math.floor(score() / 100) * 100; }, get speed() { return speed; }, get score() { return score(); }, get y() { return y; },
  obstacles, start, pressJump, releaseJump,
  setDuck(v) { hookDuck = v; updDuck(); },
  get ducking() { return ducking; }, get pauseOn() { return pauseOn; }, get countT() { return countT; },
  pauseGame, resumeGame, get fingerCount() { return fingers.size; },
  get cam() { return { fov: camera.fov, aspect: camera.aspect, w: renderer.domElement.clientWidth, h: renderer.domElement.clientHeight }; },
  get vy() { return vy; }, get duckScale() { return schiffyBody.scale.y; },
  get autoSpawn() { return autoSpawn; }, set autoSpawn(v) { autoSpawn = v; },
  get speedLock() { return speedLock; }, set speedLock(v) { speedLock = v; },
  spawnHive, spawnFlyer, spawnGround, spawnLong,
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt); },
  // perf probe: render n frames synchronously (1-px readback forces the GPU to finish), ms per frame + last frame's info
  perf(n = 30) {
    const gl = renderer.getContext(), px = new Uint8Array(4);
    renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    const ms = (performance.now() - t0) / n, r = renderer.info.render;
    return { ms: +ms.toFixed(2), calls: r.calls, tris: r.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures };
  },
};

showTitle();
frame();
