import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#view');
const fileInput = $('#file');
const fmt = new Intl.NumberFormat('de-DE');
const fmt1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// ---------- Renderer / Szene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const BG = { dark: new THREE.Color(0x16181d), light: new THREE.Color(0xeceef2) };
scene.background = BG.dark.clone();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(2, 1.5, 3);

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

let grid = makeGrid(true);
scene.add(grid);
const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.25 }));
shadowFloor.rotation.x = -Math.PI / 2;
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

function makeGrid(dark) {
  const g = new THREE.GridHelper(10, 20, dark ? 0x5a5f6b : 0x9aa0ab, dark ? 0x2c3038 : 0xcfd3da);
  g.material.transparent = true;
  g.material.opacity = 0.8;
  g.material.depthWrite = false;
  return g;
}

// ---------- Loader ----------
const manager = new THREE.LoadingManager();
let fileMap = new Map(); // Dateiname (klein) -> blob URL
manager.setURLModifier((url) => {
  if (/^(blob:|data:)/.test(url)) return url;
  let clean = url;
  try { clean = decodeURIComponent(url); } catch (e) { /* ignore */ }
  clean = clean.replace(/[?#].*$/, '');
  const base = clean.split(/[\\/]/).pop().toLowerCase();
  if (fileMap.has(base)) return fileMap.get(base);
  return url;
});

const draco = new DRACOLoader();
draco.setDecoderPath('./vendor/three/jsm/libs/draco/');
draco.setDecoderConfig({ type: 'js' }); // reine JS-Variante: funktioniert offline ohne .wasm

// KTX2: Die .wasm liegt als Base64-Text im Repo und wird zur Laufzeit dekodiert.
const ktx2Manager = new THREE.LoadingManager();
let basisWasmUrl = null;
ktx2Manager.setURLModifier((url) => (url.endsWith('basis_transcoder.wasm') && basisWasmUrl) ? basisWasmUrl : url);
const ktx2 = new KTX2Loader(ktx2Manager);
ktx2.setTranscoderPath('./vendor/three/jsm/libs/basis/');
ktx2.detectSupport(renderer);
async function prepareBasis() {
  if (basisWasmUrl) return;
  const res = await fetch('./vendor/three/jsm/libs/basis/basis_transcoder.wasm.b64');
  if (!res.ok) throw new Error('Basis-Transcoder nicht gefunden');
  const b64 = (await res.text()).trim();
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  basisWasmUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/wasm' }));
}

const gltfLoader = new GLTFLoader(manager);
gltfLoader.setDRACOLoader(draco);
gltfLoader.setKTX2Loader(ktx2);
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
const fbxLoader = new FBXLoader(manager);

// ---------- Zustand ----------
let model = null;
let mixer = null;
let clips = [];
let action = null;
let skeletonHelper = null;
let paused = false;
let speed = 1;
let homeView = null;
let wireframe = false;
let scrubbing = false;
const clock = new THREE.Clock();

// ---------- Datei laden ----------
const MODEL_EXT = ['glb', 'gltf', 'fbx'];
const extOf = (name) => (name.split('.').pop() || '').toLowerCase();

async function openFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const main = files.find((f) => MODEL_EXT.includes(extOf(f.name)));
  if (!main) {
    showError(`Dieses Dateiformat wird nicht unterstützt: „${files[0].name}“.\nBitte eine .glb-, .gltf- oder .fbx-Datei wählen.`);
    return;
  }
  // Begleitdateien (Texturen, .bin) als Blob-URLs bereitstellen
  for (const u of fileMap.values()) URL.revokeObjectURL(u);
  fileMap = new Map();
  for (const f of files) if (f !== main) fileMap.set(f.name.toLowerCase(), URL.createObjectURL(f));

  setLoading(true, `Lade „${main.name}“ …`);
  hideError();
  try {
    const buffer = await main.arrayBuffer();
    const ext = extOf(main.name);
    let root, animations = [];
    if (ext === 'fbx') {
      const obj = fbxLoader.parse(buffer, '');
      root = obj; animations = obj.animations || [];
    } else {
      if (needsBasis(buffer, ext)) await prepareBasis().catch(() => {});
      const gltf = await new Promise((resolve, reject) => gltfLoader.parse(buffer, '', resolve, reject));
      root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      animations = gltf.animations || [];
      if (!root) throw new Error('Die Datei enthält keine Szene.');
    }
    setModel(root, animations, main.name);
  } catch (err) {
    console.warn(err);
    showError(germanError(err, main.name));
  } finally {
    setLoading(false);
    fileInput.value = '';
  }
}

function needsBasis(buffer, ext) {
  try {
    let text;
    if (ext === 'glb') {
      const dv = new DataView(buffer);
      const jsonLen = dv.getUint32(12, true);
      text = new TextDecoder().decode(new Uint8Array(buffer, 20, Math.min(jsonLen, buffer.byteLength - 20)));
    } else text = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 2e6)));
    return text.includes('KHR_texture_basisu');
  } catch (e) { return false; }
}

function germanError(err, name) {
  const msg = String((err && err.message) || err || '');
  if (/version|FBX version/i.test(msg)) return `„${name}“ konnte nicht geöffnet werden: Diese FBX-Version wird nicht unterstützt (benötigt FBX 7.0 oder neuer). Tipp: In Blender importieren und als GLB exportieren.`;
  if (/Unexpected token|JSON|magic|Invalid typed array|out of bounds|offset/i.test(msg)) return `„${name}“ konnte nicht gelesen werden. Die Datei ist beschädigt oder kein gültiges 3D-Modell.`;
  if (/Failed to fetch|404|load/i.test(msg)) return `„${name}“ verweist auf externe Dateien (z. B. .bin oder Texturen), die fehlen. Bitte alle zugehörigen Dateien gemeinsam auswählen oder als GLB speichern.`;
  if (/draco|meshopt|ktx|basis/i.test(msg)) return `„${name}“ nutzt eine Komprimierung, die nicht dekodiert werden konnte (${msg}).`;
  return `„${name}“ konnte nicht geöffnet werden.\nFehler: ${msg || 'unbekannt'}`;
}

// ---------- Modell anzeigen ----------
function disposeModel() {
  if (!model) return;
  scene.remove(model);
  model.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); }
      m.dispose();
    }
  });
  if (skeletonHelper) { scene.remove(skeletonHelper); skeletonHelper.dispose(); skeletonHelper = null; }
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); }
  mixer = null; action = null; clips = []; model = null;
}

function setModel(root, animations, name) {
  disposeModel();
  model = root;
  clips = animations;

  model.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // animierte/geskinnte Meshes nicht fälschlich ausblenden
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        for (const k in m) { const v = m[k]; if (v && v.isTexture) v.anisotropy = renderer.capabilities.getMaxAnisotropy(); }
        m.wireframe = wireframe;
        m.needsUpdate = true;
      }
    }
  });

  scene.add(model);

  if (clips.length) {
    mixer = new THREE.AnimationMixer(model);
    // Pose des ersten Frames anwenden, damit die Bounding-Box stimmt
    playClip(0);
    mixer.update(0);
  }
  model.updateMatrixWorld(true);

  frameModel(true);
  buildAnimUI();
  buildInfo(name);
  $('#filename').textContent = name;
  $('#welcome').classList.add('hidden');
  if (toolState.skeleton) toggleSkeleton(true);
}

function computeBox(obj) {
  let verts = 0;
  obj.traverse((o) => { if (o.isMesh && o.geometry?.attributes?.position) verts += o.geometry.attributes.position.count; });
  const box = new THREE.Box3();
  try { box.setFromObject(obj, verts < 400000); } catch (e) { box.setFromObject(obj, false); }
  if (box.isEmpty() || !isFinite(box.min.x)) box.setFromObject(obj, false);
  return box;
}

function frameModel(store) {
  if (!model) return;
  // Größe normalisieren: Modell zentrieren und auf ca. 2 Einheiten skalieren
  model.position.set(0, 0, 0);
  model.scale.setScalar(1);
  model.updateMatrixWorld(true);
  let box = computeBox(model);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = 2 / maxDim;
  model.scale.setScalar(s);
  model.updateMatrixWorld(true);
  box = computeBox(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y; // auf den Boden stellen
  model.updateMatrixWorld(true);
  box = computeBox(model);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = sphere.radius || 1;

  const fov = THREE.MathUtils.degToRad(camera.fov);
  const fitH = r / Math.sin(fov / 2);
  const fitW = r / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect));
  const dist = Math.max(fitH, fitW) * 0.8;
  const dir = new THREE.Vector3(0.6, 0.35, 1).normalize();
  camera.position.copy(sphere.center).addScaledVector(dir, dist);
  camera.near = dist / 100; camera.far = dist * 100;
  camera.updateProjectionMatrix();
  controls.target.copy(sphere.center);
  controls.minDistance = r * 0.05;
  controls.maxDistance = dist * 10;
  controls.update();

  // Boden, Schatten, Licht anpassen
  const g = Math.max(4, Math.ceil(r * 4));
  scene.remove(grid); grid.geometry.dispose(); grid.material.dispose();
  grid = makeGrid(!document.body.classList.contains('light'));
  grid.scale.setScalar(g / 10);
  grid.visible = toolState.grid;
  scene.add(grid);
  shadowFloor.scale.setScalar(g);
  shadowFloor.visible = toolState.grid;
  sun.position.copy(sphere.center).add(new THREE.Vector3(r * 2, r * 4, r * 3));
  sun.target.position.copy(sphere.center);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -r * 2; sc.right = sc.top = r * 2; sc.near = 0.01; sc.far = r * 12;
  sc.updateProjectionMatrix();

  if (store) homeView = { pos: camera.position.clone(), target: controls.target.clone() };
}

function resetView() {
  if (!homeView) return;
  camera.position.copy(homeView.pos);
  controls.target.copy(homeView.target);
  controls.update();
}

// ---------- Animation ----------
function playClip(i) {
  if (!mixer || !clips[i]) return;
  if (action) action.stop();
  action = mixer.clipAction(clips[i]);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();
  action.paused = paused;
  mixer.timeScale = speed;
}

function buildAnimUI() {
  const box = $('#anim');
  const sel = $('#clip');
  sel.innerHTML = '';
  if (!clips.length) { box.classList.add('hidden'); return; }
  clips.forEach((c, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${c.name || 'Animation ' + (i + 1)} (${fmt1.format(c.duration)} s)`;
    sel.appendChild(o);
  });
  box.classList.remove('hidden');
  paused = false;
  $('#play').classList.remove('paused');
}

$('#clip').addEventListener('change', (e) => playClip(+e.target.value));
$('#speed').addEventListener('change', (e) => { speed = +e.target.value; if (mixer) mixer.timeScale = speed; });
$('#play').addEventListener('click', () => {
  paused = !paused;
  if (action) action.paused = paused;
  $('#play').classList.toggle('paused', paused);
});
const scrub = $('#scrub');
const startScrub = () => { scrubbing = true; };
const endScrub = () => { scrubbing = false; };
scrub.addEventListener('pointerdown', startScrub);
scrub.addEventListener('touchstart', startScrub, { passive: true });
scrub.addEventListener('pointerup', endScrub);
scrub.addEventListener('touchend', endScrub);
scrub.addEventListener('change', endScrub);
scrub.addEventListener('input', () => {
  if (!action) return;
  const d = action.getClip().duration || 0;
  action.time = (scrub.value / 1000) * d;
  const wasPaused = action.paused;
  action.paused = false;
  mixer.update(0);
  action.paused = wasPaused;
});

function updateTimeUI() {
  if (!action) return;
  const d = action.getClip().duration || 0;
  const t = d ? action.time % d : 0;
  if (!scrubbing) scrub.value = d ? Math.round((t / d) * 1000) : 0;
  $('#time').textContent = `${fmt1.format(t)} / ${fmt1.format(d)} s`;
}

// ---------- Infos ----------
function buildInfo(name) {
  let meshes = 0, verts = 0, tris = 0, skinned = 0, morphs = 0;
  const mats = new Set(), texs = new Set(), bones = new Set();
  model.traverse((o) => {
    if (o.isBone) bones.add(o);
    if (o.isMesh) {
      meshes++;
      if (o.isSkinnedMesh) { skinned++; o.skeleton?.bones.forEach((b) => bones.add(b)); }
      const g = o.geometry;
      if (g?.attributes?.position) {
        verts += g.attributes.position.count;
        tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      }
      if (g?.morphAttributes?.position) morphs += g.morphAttributes.position.length;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (!m) return; mats.add(m);
        for (const k in m) { const v = m[k]; if (v && v.isTexture) texs.add(v); }
      });
    }
  });
  const rows = [
    ['Datei', name], ['Meshes', fmt.format(meshes)], ['Vertices', fmt.format(verts)],
    ['Dreiecke', fmt.format(Math.round(tris))], ['Materialien', fmt.format(mats.size)],
    ['Texturen', fmt.format(texs.size)], ['Knochen', fmt.format(bones.size)],
    ['Geskinnte Meshes', fmt.format(skinned)], ['Morph-Targets', fmt.format(morphs)],
    ['Animationen', fmt.format(clips.length)],
  ];
  const dl = $('#info-list');
  dl.innerHTML = '';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  }
  window.__modelInfo = Object.fromEntries(rows);
}

// ---------- Werkzeuge ----------
const toolState = { wireframe: false, skeleton: false, grid: true };
function setToolActive(name, on) {
  toolState[name] = on;
  document.querySelector(`.tool[data-action="${name}"]`)?.classList.toggle('active', on);
}
function toggleSkeleton(on) {
  if (skeletonHelper) { scene.remove(skeletonHelper); skeletonHelper.dispose(); skeletonHelper = null; }
  if (on && model) {
    skeletonHelper = new THREE.SkeletonHelper(model);
    skeletonHelper.material.depthTest = false;
    skeletonHelper.material.linewidth = 2;
    skeletonHelper.renderOrder = 999;
    scene.add(skeletonHelper);
    if (!skeletonHelper.bones.length) showError('Dieses Modell hat kein Skelett.', 2500);
  }
}

const actions = {
  open: () => fileInput.click(),
  info: () => $('#info').classList.toggle('hidden'),
  reset: () => resetView(),
  wireframe: () => {
    wireframe = !wireframe; setToolActive('wireframe', wireframe);
    model?.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m) m.wireframe = wireframe; }); });
  },
  skeleton: () => { const on = !toolState.skeleton; setToolActive('skeleton', on); toggleSkeleton(on); },
  grid: () => { const on = !toolState.grid; setToolActive('grid', on); grid.visible = on; shadowFloor.visible = on; },
  bg: () => {
    const light = document.body.classList.toggle('light');
    document.body.classList.toggle('dark', !light);
    scene.background = (light ? BG.light : BG.dark).clone();
    const vis = grid.visible, sc = grid.scale.x;
    scene.remove(grid); grid.geometry.dispose(); grid.material.dispose();
    grid = makeGrid(!light); grid.scale.setScalar(sc); grid.visible = vis; scene.add(grid);
    document.querySelector('meta[name="theme-color"]').content = light ? '#eceef2' : '#16181d';
  },
  fullscreen: () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
      try { const p = req.call(el); if (p && p.catch) p.catch(() => {}); } catch (e) { /* iPhone: nicht verfügbar */ }
    }
    document.body.classList.add('ui-hidden');
    $('#show-ui').classList.remove('hidden');
  },
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (b && actions[b.dataset.action]) actions[b.dataset.action]();
});
$('#show-ui').addEventListener('click', () => {
  document.body.classList.remove('ui-hidden');
  $('#show-ui').classList.add('hidden');
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
});
fileInput.addEventListener('change', () => openFiles(fileInput.files));

// ---------- Drag & Drop ----------
let dragDepth = 0;
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; $('#drop-hint').classList.remove('hidden'); });
window.addEventListener('dragover', (e) => { e.preventDefault(); });
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#drop-hint').classList.add('hidden'); } });
window.addEventListener('drop', (e) => {
  e.preventDefault(); dragDepth = 0; $('#drop-hint').classList.add('hidden');
  if (e.dataTransfer?.files?.length) openFiles(e.dataTransfer.files);
});

// ---------- iOS: Seiten-Zoom / Bounce verhindern ----------
['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', (e) => {
  if (!e.target.closest('.panel, select, input[type=range]')) e.preventDefault();
}, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd < 300 && e.target === canvas) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
canvas.addEventListener('dblclick', () => resetView());

// ---------- UI-Helfer ----------
let errTimer;
function showError(msg, ms = 7000) {
  const el = $('#error');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(errTimer);
  errTimer = setTimeout(hideError, ms);
}
function hideError() { $('#error').classList.add('hidden'); }
$('#error').addEventListener('click', hideError);
function setLoading(on, text) {
  $('#loading').classList.toggle('hidden', !on);
  if (text) $('#loading-text').textContent = text;
}

// ---------- Render-Schleife ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (mixer) mixer.update(dt);
  updateTimeUI();
  controls.update();
  renderer.render(scene, camera);
});

window.addEventListener('error', (e) => console.error('Fehler:', e.message));

// ---------- Offline (Service Worker) ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// Für Tests
window.__viewer = { get clips() { return clips.map((c) => c.name); }, get model() { return model; }, openFiles };
