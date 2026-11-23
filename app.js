import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as WebGLTextureUtils from 'three/addons/utils/WebGLTextureUtils.js';
import { initFace, arkitCanon } from './face.js';
import { initVrm } from './vrm.js';

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

const holder = new THREE.Group(); // trägt Zentrierung/Skalierung, Modell selbst bleibt unverändert
holder.name = '__viewer_holder';
scene.add(holder);

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
function makeGltfLoader() {
  const l = new GLTFLoader(manager);
  l.setDRACOLoader(draco); l.setKTX2Loader(ktx2); l.setMeshoptDecoder(MeshoptDecoder);
  return l;
}

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
const MODEL_EXT = ['glb', 'gltf', 'fbx', 'vrm'];
const extOf = (name) => (name.split('.').pop() || '').toLowerCase();

async function openFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const main = files.find((f) => MODEL_EXT.includes(extOf(f.name)));
  if (!main) {
    showError(`Dieses Dateiformat wird nicht unterstützt: „${files[0].name}“.\nBitte eine .glb-, .gltf-, .fbx- oder .vrm-Datei wählen.`);
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
    let root, animations = [], vrmObj = null;
    if (ext === 'vrm') {
      if (needsBasis(buffer, 'glb')) await prepareBasis().catch(() => {});
      const r = await vrmMod.parse(buffer);
      root = r.gltf.scene || (r.gltf.scenes && r.gltf.scenes[0]);
      animations = r.gltf.animations || [];
      vrmObj = r.vrm;
      if (!root) throw new Error('Die Datei enthält keine Szene.');
    } else if (ext === 'fbx') {
      const obj = fbxLoader.parse(buffer, '');
      root = obj; animations = obj.animations || [];
    } else {
      if (needsBasis(buffer, ext)) await prepareBasis().catch(() => {});
      const gltf = await new Promise((resolve, reject) => gltfLoader.parse(buffer, '', resolve, reject));
      root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      animations = gltf.animations || [];
      if (!root) throw new Error('Die Datei enthält keine Szene.');
    }
    setModel(root, animations, main.name, vrmObj);
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
  editor.exit(true);
  face?.exit(true);
  vrmMod?.dispose(model);
  holder.remove(model);
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

function setModel(root, animations, name, vrmObj = null) {
  disposeModel();
  vrmMod?.onModel(vrmObj);
  model = root;
  clips = animations;
  baseClips = animations;
  rigDirty = false;
  animFrozen = false;

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

  holder.add(model);
  model.updateMatrixWorld(true);
  editor.capture(); // Originalpose der Knochen merken (vor der Animation)
  face?.onModel();

  if (clips.length) {
    mixer = new THREE.AnimationMixer(model);
    // Pose des ersten Frames anwenden, damit die Bounding-Box stimmt
    playClip(0);
    mixer.update(0);
  }
  model.updateMatrixWorld(true);

  frameModel(true);
  vrmMod?.afterFrame();
  buildAnimUI();
  buildInfo(name);
  $('#filename').textContent = name;
  currentName = name.replace(/\.[^.]+$/, '').replace(/-bearbeitet$/, '') || 'modell';
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
  holder.position.set(0, 0, 0);
  holder.scale.setScalar(1);
  holder.updateMatrixWorld(true);
  let box = computeBox(model);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = 2 / maxDim;
  holder.scale.setScalar(s);
  holder.updateMatrixWorld(true);
  box = computeBox(model);
  const center = box.getCenter(new THREE.Vector3());
  holder.position.x -= center.x;
  holder.position.z -= center.z;
  holder.position.y -= box.min.y; // auf den Boden stellen
  holder.updateMatrixWorld(true);
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
function arkitCount() {
  const set = new Set();
  model?.traverse((o) => { if (o.morphTargetDictionary) for (const k in o.morphTargetDictionary) { const c = arkitCanon(k); if (c) set.add(c); } });
  return set.size;
}
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
        if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k]?.value; if (v && v.isTexture) texs.add(v); } // MToon (VRM)
      });
    }
  });
  const rows = [
    ['Datei', name], ['Meshes', fmt.format(meshes)], ['Vertices', fmt.format(verts)],
    ['Dreiecke', fmt.format(Math.round(tris))], ['Materialien', fmt.format(mats.size)],
    ['Texturen', fmt.format(texs.size)], ['Knochen', fmt.format(bones.size)],
    ['Geskinnte Meshes', fmt.format(skinned)], ['Morph-Targets', fmt.format(morphs)],
    ['ARKit-Formen', `${arkitCount()} / 52`],
    ...(model.userData.vrm ? [['VRM', `${model.userData.vrm.version} · ${Object.keys(model.userData.vrm.humanBones || {}).length} Humanoid-Knochen · ${(model.userData.vrm.expressions || []).length} Ausdrücke`]] : []),
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
  edit: () => { vrmMod.close(); editor.toggle(); },
  face: () => { vrmMod.close(); face.toggle(); },
  vrm: () => vrmMod.toggle(),
  export: () => exportGLB(),
  library: () => library.show(),
  save: () => library.saveCurrent(),
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
// Panels minimieren (kleine Bildschirme: Modell bleibt sichtbar)
document.addEventListener('click', (e) => {
  const b = e.target.closest('.collapse-btn');
  if (!b) return;
  const p = b.closest('.editor');
  const c = p.classList.toggle('collapsed');
  b.setAttribute('aria-expanded', String(!c));
  b.title = c ? 'Aufklappen' : 'Minimieren';
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
  if (!e.target.closest('.panel, .bone-list, .sheet, .editor, select, input[type=range]')) e.preventDefault();
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
  if (mixer && !animFrozen) mixer.update(dt);
  editor.update();
  face?.update(dt);
  if (!face?.active) vrmMod?.update(dt);
  updateTimeUI();
  controls.update();
  renderer.render(scene, camera);
});

window.addEventListener('error', (e) => console.error('Fehler:', e.message));

// ---------- Offline (Service Worker) ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// ---------- Gelenk-Editor ----------
let animFrozen = false; // true = Animation angehalten, damit bearbeitete Pose sichtbar bleibt
let baseClips = [];     // Clips wie geladen; `clips` = ggf. an das bearbeitete Rig angepasst
let rigDirty = false;   // Rig wurde geändert -> Clips beim nächsten Abspielen neu aufbauen
let face = null, vrmMod = null;        // Gesichts-Modus (face.js)
const editor = (() => {
  const st = {
    active: false, bones: [], editable: [], original: new Map(), origInverses: new Map(),
    selected: null, undo: [], mode: 'rotate', rigOnly: false, radius: 0.02, rigOps: [], addCount: 0,
  };
  const tc = new TransformControls(camera, canvas);
  tc.setMode('rotate');
  tc.setSpace('local');
  tc.setSize(1.25);
  tc.enabled = false;
  const tcHelper = tc.getHelper();
  scene.add(tcHelper);
  tc.addEventListener('dragging-changed', (e) => { controls.enabled = !e.value; });
  tc.addEventListener('mouseDown', () => { if (st.selected) beginTransform(); });
  tc.addEventListener('objectChange', () => { if (rigOp) updateRig(); });
  tc.addEventListener('mouseUp', () => endTransform());

  const jointsGroup = new THREE.Group();
  scene.add(jointsGroup);
  const jointGeo = new THREE.SphereGeometry(1, 12, 8);
  const jointMat = new THREE.MeshBasicMaterial({ color: 0x5b7cff, depthTest: false, transparent: true, opacity: 0.9 });
  const jointAddMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71, depthTest: false, transparent: true, opacity: 0.95 });
  const jointSelMat = new THREE.MeshBasicMaterial({ color: 0xffb020, depthTest: false, transparent: true, opacity: 1 });
  let jointMeshes = [];
  let ownSkeleton = null;

  const list = $('#bone-list');
  const search = $('#bone-search');
  const label = $('#bone-current');
  const boneName = (b, i) => (b.name || `Knochen ${i + 1}`) + (b.userData.vrmHuman ? ` · ${b.userData.vrmHuman}` : '');
  const isAdded = (b) => !!(b && b.userData && b.userData.viewerAdded);

  // ---- Hilfen: Skelette ----
  function skeletons() {
    const set = new Set();
    model?.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) set.add(o.skeleton); });
    return [...set];
  }
  function resizeSkeleton(sk) {
    sk.boneMatrices = new Float32Array(sk.bones.length * 16);
    if (sk.boneTexture) { sk.boneTexture.dispose(); sk.boneTexture = null; }
  }
  function isDescendantOrSelf(b, root) { for (let o = b; o; o = o.parent) if (o === root) return true; return false; }

  function collectBones() {
    const set = new Set();
    model.traverse((o) => {
      if (o.isBone) set.add(o);
      if (o.isSkinnedMesh && o.skeleton) o.skeleton.bones.forEach((b) => b && set.add(b));
    });
    return [...set];
  }
  function refreshBoneLists() {
    st.bones = collectBones();
    // FBX-Eigenheit: gleichnamige Kind-Knochen (zweites Mesh) nicht doppelt anzeigen
    st.editable = st.bones.filter((b) => !(b.name && b.parent && b.parent.isBone && b.parent.name === b.name));
  }

  // ---- Snapshots / Undo ----
  function snap(b) { return { b, p: b.position.clone(), q: b.quaternion.clone(), s: b.scale.clone() }; }
  function restore(r) { r.b.position.copy(r.p); r.b.quaternion.copy(r.q); r.b.scale.copy(r.s); r.b.updateMatrixWorld(true); }
  function fullState() {
    return {
      type: 'state',
      bones: st.bones.map(snap),
      inverses: skeletons().map((sk) => [sk, sk.boneInverses.map((m) => m.clone())]),
      rigOps: st.rigOps.slice(),
    };
  }
  function applyState(s) {
    s.bones.forEach(restore);
    for (const [sk, inv] of s.inverses) if (sk.boneInverses.length === inv.length) inv.forEach((m, i) => sk.boneInverses[i].copy(m));
    st.rigOps = s.rigOps.slice();
    rigDirty = true;
  }
  function capture() {
    refreshBoneLists();
    st.original = new Map(st.bones.map((b) => [b, snap(b)]));
    st.origInverses = new Map(skeletons().map((sk) => [sk, sk.boneInverses.map((m) => m.clone())]));
    st.undo = [];
    st.selected = null;
    st.rigOps = [];
    st.rigOnly = false; // bei jedem neuen Modell sicherheitshalber aus
    st.addCount = st.bones.filter(isAdded).length;
    updateButtons();
  }
  function pushUndo(entry) {
    st.undo.push(entry || fullState());
    if (st.undo.length > 60) st.undo.shift();
    updateButtons();
  }
  function undo() {
    const e = st.undo.pop();
    if (!e) return;
    if (e.type === 'state') applyState(e);
    else if (e.type === 'add') removeBoneInternal(e.bone);
    else if (e.type === 'weights') { restoreWeights(e.changes); applyState(e.state); }
    else if (e.type === 'delete') e.records.slice().reverse().forEach(reinsertBone);
    afterStructureChange(st.selected && st.selected.parent ? st.selected : null);
    updateButtons();
  }

  // ---- Transformieren (Gizmo und Code nutzen denselben Pfad) ----
  let rigOp = null; // { bone, p0, q0, entries: [{ sk, i, W0, I0 }] }
  function beginTransform() {
    pushUndo();
    if (!st.rigOnly) return;
    const bone = st.selected;
    model.updateMatrixWorld(true);
    const entries = [];
    for (const sk of skeletons()) {
      sk.bones.forEach((b, i) => {
        if (b && isDescendantOrSelf(b, bone)) entries.push({ sk, i, W0: b.matrixWorld.clone(), I0: sk.boneInverses[i].clone() });
      });
    }
    rigOp = { bone, p0: bone.position.clone(), q0: bone.quaternion.clone(), entries };
  }
  const _m = new THREE.Matrix4();
  function updateRig() {
    if (!rigOp) return;
    rigOp.bone.updateMatrixWorld(true);
    // neue inverse Bindmatrix: inv(W_neu) * W_alt * Inv_alt  -> Mesh bleibt unverändert
    for (const e of rigOp.entries) {
      const b = e.sk.bones[e.i];
      _m.copy(b.matrixWorld).invert().multiply(e.W0).multiply(e.I0);
      e.sk.boneInverses[e.i].copy(_m);
    }
  }
  function endTransform() {
    if (!rigOp) return;
    updateRig();
    const b = rigOp.bone;
    const dp = b.position.clone().sub(rigOp.p0);
    const dq = rigOp.q0.clone().invert().multiply(b.quaternion).normalize();
    if (dp.lengthSq() > 1e-14 || Math.abs(dq.w) < 0.999999999) {
      // F = L1^-1 * L0 (lokale Änderung des Knochen-Rahmens)
      const L0 = new THREE.Matrix4().compose(rigOp.p0, rigOp.q0, new THREE.Vector3(1, 1, 1));
      const L1 = new THREE.Matrix4().compose(b.position, b.quaternion, new THREE.Vector3(1, 1, 1));
      const F = L1.clone().invert().multiply(L0);
      const Finv = F.clone().invert();
      model.updateMatrixWorld(true);
      const WBinv = b.matrixWorld.clone().invert();
      const desc = new Map();
      b.traverse((x) => {
        if (x === b || !x.isBone) return;
        const R = WBinv.clone().multiply(x.matrixWorld); // Kette B -> X
        const K = R.clone().invert().multiply(F).multiply(R);
        desc.set(x, { parent: x.parent, K, Kinv: R.clone().invert().multiply(Finv).multiply(R), restP: x.position.clone(), restQ: x.quaternion.clone() });
      });
      st.rigOps.push({ bone: b, dp, dq, F, identityF: false, desc });
      rigDirty = true;
      scheduleAuto(addedInSubtree(b));
    }
    rigOp = null;
  }
  function transformSelected(fn) {
    if (!st.selected) return false;
    beginTransform();
    fn(st.selected);
    st.selected.updateMatrixWorld(true);
    if (rigOp) updateRig();
    endTransform();
    return true;
  }
  function rotateSelected(axis, degrees) {
    return transformSelected((b) => b.rotateOnAxis(new THREE.Vector3(...axis).normalize(), THREE.MathUtils.degToRad(degrees)));
  }
  function translateSelected(vec) {
    return transformSelected((b) => b.position.add(new THREE.Vector3(...vec)));
  }

  function resetJoint() {
    const b = st.selected;
    if (!b) { showError('Bitte zuerst ein Gelenk auswählen.', 2500); return; }
    const o = st.original.get(b);
    if (!o) return;
    transformSelected(() => { b.position.copy(o.p); b.quaternion.copy(o.q); b.scale.copy(o.s); });
  }
  function resetPose() {
    if (!st.bones.length) return;
    pushUndo();
    st.original.forEach(restore);
    if (st.rigOnly) {
      // komplettes Rig zurücksetzen (Bindmatrizen + Anpassungen)
      for (const [sk, inv] of st.origInverses) inv.forEach((m, i) => sk.boneInverses[i] && sk.boneInverses[i].copy(m));
      st.rigOps = [];
      rigDirty = true;
    }
  }

  // ---- Skin-Gewichte für hinzugefügte Knochen ----
  const W = { auto: true, radiusPct: 6, heat: false, heatSaved: new Map(), timer: null };
  const heatMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  function skinnedMeshes() { const out = []; model?.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) out.push(o); }); return out; }
  // Quell-Knochen im Skelett: das Eltern-Gelenk selbst oder (FBX) sein gleichnamiges Duplikat
  function srcBoneIn(sk, P) {
    if (!P) return null;
    if (sk.bones.includes(P)) return P;
    return P.children.find((c) => c.isBone && c.name === P.name && sk.bones.includes(c)) || null;
  }
  function ensureSkinAttrs(m) {
    const g = m.geometry;
    let si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
    if (!si || !sw || si.itemSize !== 4 || sw.itemSize !== 4) return false;
    // auch verschachtelte (interleaved) Attribute in eigene Arrays umwandeln
    if (si.isInterleavedBufferAttribute || !(si.array instanceof Uint16Array) || si.array.length !== si.count * 4) {
      const a = new Uint16Array(si.count * 4);
      for (let v = 0; v < si.count; v++) for (let k = 0; k < 4; k++) a[v * 4 + k] = si.getComponent(v, k);
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(a, 4));
    }
    if (sw.isInterleavedBufferAttribute || !(sw.array instanceof Float32Array) || sw.normalized || sw.array.length !== sw.count * 4) {
      const a = new Float32Array(sw.count * 4);
      for (let v = 0; v < sw.count; v++) for (let k = 0; k < 4; k++) a[v * 4 + k] = sw.getComponent(v, k);
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(a, 4));
    }
    return true;
  }
  // Änderungen an Gewichten aufzeichnen (nur geänderte Vertices -> Undo)
  function weightTxn(meshes, fn) {
    const ok = meshes.filter(ensureSkinAttrs);
    const before = ok.map((m) => [m.geometry.attributes.skinIndex.array.slice(), m.geometry.attributes.skinWeight.array.slice()]);
    fn(ok);
    const changes = [];
    ok.forEach((m, mi) => {
      const I = m.geometry.attributes.skinIndex.array, Wt = m.geometry.attributes.skinWeight.array;
      const [I0, W0] = before[mi];
      const idx = [];
      for (let v = 0, n = I.length / 4; v < n; v++) {
        const o = v * 4;
        if (I[o] !== I0[o] || I[o + 1] !== I0[o + 1] || I[o + 2] !== I0[o + 2] || I[o + 3] !== I0[o + 3] ||
          Wt[o] !== W0[o] || Wt[o + 1] !== W0[o + 1] || Wt[o + 2] !== W0[o + 2] || Wt[o + 3] !== W0[o + 3]) idx.push(v);
      }
      if (!idx.length) return;
      const oldI = new Uint16Array(idx.length * 4), oldW = new Float32Array(idx.length * 4);
      idx.forEach((v, k) => { for (let j = 0; j < 4; j++) { oldI[k * 4 + j] = I0[v * 4 + j]; oldW[k * 4 + j] = W0[v * 4 + j]; } });
      changes.push({ mesh: m, idx: Uint32Array.from(idx), oldI, oldW });
      m.geometry.attributes.skinIndex.needsUpdate = true;
      m.geometry.attributes.skinWeight.needsUpdate = true;
    });
    return changes;
  }
  function restoreWeights(changes) {
    for (const c of changes) {
      const g = c.mesh.geometry;
      const I = g.attributes.skinIndex.array, Wt = g.attributes.skinWeight.array;
      c.idx.forEach((v, k) => { for (let j = 0; j < 4; j++) { I[v * 4 + j] = c.oldI[k * 4 + j]; Wt[v * 4 + j] = c.oldW[k * 4 + j]; } });
      g.attributes.skinIndex.needsUpdate = true; g.attributes.skinWeight.needsUpdate = true;
    }
    updateHeat();
  }
  // Gewichte eines Knochens an seine Quelle zurückgeben und Indizes > i verschieben (beim Entfernen)
  function releaseBoneWeights(sk, i, srcIdx) {
    for (const m of skinnedMeshes()) {
      if (m.skeleton !== sk || !ensureSkinAttrs(m)) continue;
      const I = m.geometry.attributes.skinIndex.array, Wt = m.geometry.attributes.skinWeight.array;
      for (let o = 0; o < I.length; o += 4) {
        for (let k = 0; k < 4; k++) {
          if (I[o + k] === i) {
            const w = Wt[o + k];
            let s = -1;
            for (let j = 0; j < 4; j++) if (j !== k && I[o + j] === srcIdx && Wt[o + j] > 0) s = j;
            if (s >= 0) { Wt[o + s] += w; Wt[o + k] = 0; I[o + k] = 0; } else { I[o + k] = srcIdx; }
          }
        }
        for (let k = 0; k < 4; k++) if (I[o + k] > i) I[o + k]--;
      }
      m.geometry.attributes.skinIndex.needsUpdate = true; m.geometry.attributes.skinWeight.needsUpdate = true;
    }
  }
  function modelSize() {
    const s = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    return Math.max(s.x, s.y, s.z) || 1;
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _v = new THREE.Vector3(), _seg = new THREE.Line3();
  function boneSegment(N) {
    const head = N.getWorldPosition(new THREE.Vector3());
    if (Array.isArray(N.userData.tail)) return new THREE.Line3(head, N.localToWorld(new THREE.Vector3().fromArray(N.userData.tail)));
    let tail = null;
    for (const c of N.children) {
      if (!c.isBone) continue;
      const p = c.getWorldPosition(new THREE.Vector3());
      if (p.distanceToSquared(head) > 1e-12) { tail = p; break; }
    }
    if (!tail || tail.distanceToSquared(head) < 1e-12) {
      const pw = N.parent ? N.parent.getWorldPosition(new THREE.Vector3()) : head.clone().sub(new THREE.Vector3(0, 0.1, 0));
      const d = head.clone().sub(pw);
      if (d.lengthSq() < 1e-12) d.set(0, 0.1, 0);
      tail = head.clone().add(d);
    }
    return new THREE.Line3(head, tail);
  }
  // Kern: Gewichte für Knochen N berechnen (sprungfrei: N wird so gebunden, dass S_N = S_Quelle)
  function assignWeights(N, meshes, R, fn) {
    const seg = boneSegment(N);
    for (const m of meshes) {
      const sk = m.skeleton;
      const ni = sk.bones.indexOf(N);
      const src = srcBoneIn(sk, N.parent);
      if (ni < 0 || !src) continue;
      const si = sk.bones.indexOf(src);
      // Neu binden: S_N := S_src
      sk.boneInverses[ni].copy(N.matrixWorld).invert().multiply(src.matrixWorld).multiply(sk.boneInverses[si]);
      // Knochen mit identischer Skin-Matrix dürfen sprungfrei Gewicht abgeben
      const Ssrc = src.matrixWorld.clone().multiply(sk.boneInverses[si]).elements;
      const tol = 1e-5 * Math.max(1, Math.abs(Ssrc[12]) + Math.abs(Ssrc[13]) + Math.abs(Ssrc[14]));
      const qual = new Uint8Array(sk.bones.length);
      sk.bones.forEach((b, j) => {
        if (j === ni) return;
        const e = b.matrixWorld.clone().multiply(sk.boneInverses[j]).elements;
        let ok = true;
        for (let k = 0; k < 16 && ok; k++) if (Math.abs(e[k] - Ssrc[k]) > (k >= 12 ? tol : 1e-5)) ok = false;
        if (ok && (b === src || b.parent === N.parent || b.parent === src || isDescendantOrSelf(b, N.parent))) qual[j] = 1;
      });
      const I = m.geometry.attributes.skinIndex.array, Wt = m.geometry.attributes.skinWeight.array;
      const count = I.length / 4;
      for (let v = 0; v < count; v++) {
        const o = v * 4;
        // 1) bisheriges Gewicht von N an die Quelle zurück
        for (let k = 0; k < 4; k++) {
          if (I[o + k] === ni && Wt[o + k] > 0) {
            let s = -1;
            for (let j = 0; j < 4; j++) if (j !== k && I[o + j] === si && Wt[o + j] > 0) s = j;
            if (s >= 0) { Wt[o + s] += Wt[o + k]; Wt[o + k] = 0; I[o + k] = 0; } else I[o + k] = si;
          } else if (I[o + k] === ni) { I[o + k] = 0; }
        }
        // 2) Gewicht von qualifizierten Knochen in der Nähe übertragen
        let wq = 0;
        for (let k = 0; k < 4; k++) if (Wt[o + k] > 0 && qual[I[o + k]]) wq += Wt[o + k];
        if (wq < 1e-6) continue;
        m.getVertexPosition(v, _v).applyMatrix4(m.matrixWorld);
        let f;
        if (fn) f = fn(_v, m);
        else {
          seg.closestPointToPoint(_v, true, _a);
          const t = Math.min(1, _a.distanceTo(_v) / R);
          f = 1 - t * t * (3 - 2 * t);
        }
        if (f < 1e-4) continue;
        let transfer = 0, minK = -1;
        for (let k = 0; k < 4; k++) {
          if (Wt[o + k] > 0 && qual[I[o + k]]) {
            const d = Wt[o + k] * f; transfer += d; Wt[o + k] -= d;
            if (minK < 0 || Wt[o + k] < Wt[o + minK]) minK = k;
          }
        }
        let slot = -1;
        for (let k = 0; k < 4; k++) if (Wt[o + k] <= 1e-7) { slot = k; break; }
        if (slot >= 0) { I[o + slot] = ni; Wt[o + slot] = transfer; }
        else { I[o + minK] = ni; Wt[o + minK] += transfer; } // max. 4 Einflüsse
        let sum = Wt[o] + Wt[o + 1] + Wt[o + 2] + Wt[o + 3];
        if (sum > 0) for (let k = 0; k < 4; k++) Wt[o + k] /= sum;
      }
    }
  }
  function computeWeights(bones, opts = {}) {
    const list = (bones || []).filter(isAdded);
    if (!list.length) { if (!opts.silent) showError('Gewichte können nur für selbst hinzugefügte Knochen berechnet werden.', 3000); return 0; }
    model.updateMatrixWorld(true);
    // Eltern zuerst
    list.sort((a, b) => depth(a) - depth(b));
    const R = Math.max(1e-6, (W.radiusPct / 100) * modelSize());
    const state = fullState();
    const meshes = skinnedMeshes().filter((m) => list.some((b) => m.skeleton.bones.includes(b)));
    const changes = weightTxn(meshes, (ok) => {
      for (const b of list) assignWeights(b, ok.filter((m) => m.skeleton.bones.includes(b)), opts.radiusFor?.(b) || R, opts.fnFor?.(b));
    });
    pushUndo({ type: 'weights', state, changes });
    updateHeat();
    let n = 0;
    for (const m of meshes) {
      const I = m.geometry.attributes.skinIndex.array, Wt = m.geometry.attributes.skinWeight.array;
      const ids = new Set(list.map((b) => m.skeleton.bones.indexOf(b)));
      for (let o = 0; o < I.length; o += 4) for (let k = 0; k < 4; k++) if (Wt[o + k] > 0 && ids.has(I[o + k])) { n++; break; }
    }
    if (!opts.silent) showToast(n ? `Gewichte berechnet: ${fmt.format(n)} Vertices beeinflusst.` : 'Keine Vertices im Einflussradius – Radius vergrößern.');
    return n;
  }
  const depth = (b) => { let d = 0; for (let o = b; o; o = o.parent) d++; return d; };
  function scheduleAuto(bones) {
    if (!W.auto) return;
    const list = bones.filter(isAdded);
    if (!list.length) return;
    clearTimeout(W.timer);
    W.timer = setTimeout(() => computeWeights(list, { silent: true }), 300);
  }
  function addedInSubtree(b) { const out = []; b?.traverse((o) => { if (o.isBone && isAdded(o)) out.push(o); }); return out; }

  // Heatmap
  function heatColor(w, out, o) {
    // blau (0) -> grün -> gelb -> rot (1)
    const c = new THREE.Color().setHSL((1 - w) * 0.66, 1, 0.5);
    out[o] = c.r; out[o + 1] = c.g; out[o + 2] = c.b;
  }
  function updateHeat() {
    if (!W.heat) return;
    const b = st.selected;
    for (const m of skinnedMeshes()) {
      const g = m.geometry;
      const n = g.attributes.position.count;
      let attr = W.heatSaved.get(m)?.attr;
      if (!attr || attr.count !== n) { attr = new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3); W.heatSaved.get(m).attr = attr; }
      const out = attr.array;
      const i = b ? m.skeleton.bones.indexOf(b) : -1;
      if (!ensureSkinAttrs(m)) continue;
      const I = g.attributes.skinIndex.array, Wt = g.attributes.skinWeight.array;
      for (let v = 0; v < n; v++) {
        let w = 0;
        if (i >= 0) for (let k = 0; k < 4; k++) if (I[v * 4 + k] === i) w += Wt[v * 4 + k];
        heatColor(Math.min(1, w), out, v * 3);
      }
      g.setAttribute('color', attr);
      attr.needsUpdate = true;
    }
  }
  function setHeat(on) {
    if (on === W.heat) return;
    if (on) {
      if (!skinnedMeshes().length) { showError('Dieses Modell hat keine geskinnten Meshes.', 2500); return; }
      W.heat = true;
      for (const m of skinnedMeshes()) W.heatSaved.set(m, { material: m.material, color: m.geometry.getAttribute('color') || null, attr: null });
      for (const m of skinnedMeshes()) m.material = heatMat;
      updateHeat();
    } else {
      W.heat = false;
      for (const [m, s] of W.heatSaved) {
        m.material = s.material;
        if (s.color) m.geometry.setAttribute('color', s.color); else m.geometry.deleteAttribute('color');
      }
      W.heatSaved.clear();
    }
    $('#ed-heat')?.classList.toggle('active', W.heat);
  }

  // ---- Knochen hinzufügen / löschen ----
  function addBone() {
    const parent = st.selected;
    if (!parent) { showError('Bitte zuerst das Eltern-Gelenk auswählen.', 2500); return null; }
    model.updateMatrixWorld(true);
    const pw = parent.getWorldPosition(new THREE.Vector3());
    // Richtung: zum entferntesten Kind-Knochen (FBX-Duplikate ohne Abstand ignorieren), sonst vom Großeltern-Gelenk weg
    let dir = null;
    for (const c of parent.children) {
      if (!c.isBone || isAdded(c)) continue;
      const d = c.getWorldPosition(new THREE.Vector3()).sub(pw);
      if (d.lengthSq() > 1e-12 && (!dir || d.lengthSq() > dir.lengthSq())) dir = d;
    }
    if (!dir && parent.parent && parent.parent.isBone) dir = pw.clone().sub(parent.parent.getWorldPosition(new THREE.Vector3()));
    if (!dir || dir.lengthSq() < 1e-12) dir = new THREE.Vector3(0, 1, 0);
    dir.normalize();
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const len = Math.max(size.x, size.y, size.z) * 0.08 || 0.1;
    const bone = new THREE.Bone();
    st.addCount++;
    bone.name = `Neuer_Knochen_${st.addCount}`;
    bone.userData.viewerAdded = true;
    bone.position.copy(parent.worldToLocal(pw.clone().addScaledVector(dir, len)));
    parent.add(bone);
    bone.updateMatrixWorld(true);
    // in alle Skelette aufnehmen, die das Eltern-Gelenk enthalten; Bindung relativ zum Eltern-Gelenk
    const targets = skeletons().filter((sk) => srcBoneIn(sk, parent));
    const fallback = targets.length ? targets : skeletons().slice(0, 1);
    for (const sk of fallback) {
      const src = srcBoneIn(sk, parent);
      const pi = src ? sk.bones.indexOf(src) : -1;
      const inv = new THREE.Matrix4();
      if (pi >= 0) inv.copy(bone.matrixWorld).invert().multiply(src.matrixWorld).multiply(sk.boneInverses[pi]);
      else inv.copy(bone.matrixWorld).invert();
      sk.bones.push(bone);
      sk.boneInverses.push(inv);
      resizeSkeleton(sk);
    }
    st.original.set(bone, snap(bone));
    pushUndo({ type: 'add', bone });
    afterStructureChange(bone);
    if (W.auto) computeWeights([bone], { silent: true });
    return bone;
  }
  // Knochen an Weltposition anlegen (z. B. Gesichtsknochen); Gewichte separat
  function addBoneAt(parent, worldPos, name, opts = {}) {
    model.updateMatrixWorld(true);
    const bone = new THREE.Bone();
    bone.name = name;
    bone.userData.viewerAdded = true;
    if (opts.face) bone.userData.faceBone = true;
    bone.position.copy(parent.worldToLocal(worldPos.clone()));
    parent.add(bone);
    bone.updateMatrixWorld(true);
    if (opts.tail) bone.userData.tail = bone.worldToLocal(opts.tail.clone()).toArray();
    const targets = skeletons().filter((sk) => srcBoneIn(sk, parent));
    for (const sk of targets) {
      const src = srcBoneIn(sk, parent);
      const pi = sk.bones.indexOf(src);
      sk.bones.push(bone);
      sk.boneInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(src.matrixWorld).multiply(sk.boneInverses[pi]));
      resizeSkeleton(sk);
    }
    st.original.set(bone, snap(bone));
    st.addCount++;
    pushUndo({ type: 'add', bone });
    return bone;
  }
  function deleteBoneRef(b) { const prev = st.selected; st.selected = b; deleteBone(); if (prev !== b && prev?.parent) st.selected = prev; }
  function removeBoneInternal(bone) {
    const record = { bone, parent: bone.parent, skels: [], weights: [] };
    for (const sk of skeletons()) {
      const i = sk.bones.indexOf(bone);
      if (i >= 0) {
        const src = srcBoneIn(sk, bone.parent);
        const si = src ? sk.bones.indexOf(src) : 0;
        record.weights.push(...weightTxn(skinnedMeshes().filter((m) => m.skeleton === sk), () => releaseBoneWeights(sk, i, si)));
        record.skels.push({ sk, i, inv: sk.boneInverses[i].clone() });
        sk.bones.splice(i, 1); sk.boneInverses.splice(i, 1);
        resizeSkeleton(sk);
      }
    }
    bone.parent && bone.parent.remove(bone);
    st.rigOps = st.rigOps.filter((op) => op.bone !== bone);
    if (st.selected === bone) select(null);
    return record;
  }
  function reinsertBone(r) {
    r.parent.add(r.bone);
    for (const { sk, i, inv } of r.skels) {
      sk.bones.splice(i, 0, r.bone); sk.boneInverses.splice(i, 0, inv);
      resizeSkeleton(sk);
    }
    if (r.weights) restoreWeights(r.weights);
  }
  function deleteBone() {
    const b = st.selected;
    if (!isAdded(b)) { showError('Nur selbst hinzugefügte Knochen können gelöscht werden.', 3000); return; }
    let ok = true;
    b.traverse((o) => { if (o !== b && o.isBone && !isAdded(o)) ok = false; });
    if (!ok) { showError('Dieser Knochen hat Original-Knochen als Kinder und kann nicht gelöscht werden.', 3500); return; }
    // Kinder (auch hinzugefügte) zuerst entfernen – von unten nach oben
    const chain = [];
    b.traverse((o) => { if (o.isBone) chain.push(o); });
    const parent = b.parent;
    const records = chain.reverse().map(removeBoneInternal);
    // Undo: in umgekehrter Reihenfolge wieder einfügen
    pushUndo({ type: 'delete', records });
    afterStructureChange(parent && parent.isBone ? parent : null);
  }

  function afterStructureChange(selectBone) {
    refreshBoneLists();
    rigDirty = true;
    if (st.active) { buildJoints(); buildList(); select(selectBone && st.editable.includes(selectBone) ? selectBone : null); }
    if (skeletonHelper) { toggleSkeleton(false); toggleSkeleton(true); }
    if (model) buildInfo($('#filename').textContent);
  }

  // ---- Anzeige ----
  function buildJoints() {
    clearJoints();
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    st.radius = Math.max(size.x, size.y, size.z) * 0.012 || 0.02;
    jointMeshes = st.editable.map((b) => {
      const m = new THREE.Mesh(jointGeo, isAdded(b) ? jointAddMat : jointMat);
      m.scale.setScalar(st.radius);
      m.renderOrder = 998;
      m.userData.bone = b;
      jointsGroup.add(m);
      return m;
    });
    if (!skeletonHelper) {
      ownSkeleton = new THREE.SkeletonHelper(model);
      ownSkeleton.material.depthTest = false;
      ownSkeleton.renderOrder = 997;
      scene.add(ownSkeleton);
    }
  }
  function clearJoints() {
    jointMeshes.forEach((m) => jointsGroup.remove(m));
    jointMeshes = [];
    if (ownSkeleton) { scene.remove(ownSkeleton); ownSkeleton.dispose(); ownSkeleton = null; }
  }
  function buildList() {
    list.innerHTML = '';
    st.editable.forEach((b, i) => {
      const li = document.createElement('button');
      li.className = 'bone-item' + (isAdded(b) ? ' added' : '');
      li.textContent = boneName(b, i);
      li.dataset.index = i;
      li.addEventListener('click', () => { select(b); $('#bone-picker').classList.add('hidden'); });
      list.appendChild(li);
    });
    filterList();
  }
  function filterList() {
    const q = search.value.trim().toLowerCase();
    for (const el of list.children) el.classList.toggle('hidden', !!q && !el.textContent.toLowerCase().includes(q));
  }
  search.addEventListener('input', filterList);

  function select(b) {
    st.selected = b;
    if (b) tc.attach(b); else tc.detach();
    jointMeshes.forEach((m) => {
      const sel = m.userData.bone === b;
      m.material = sel ? jointSelMat : isAdded(m.userData.bone) ? jointAddMat : jointMat;
      m.scale.setScalar(st.radius * (sel ? 1.5 : 1));
    });
    const i = st.editable.indexOf(b);
    label.textContent = b ? boneName(b, i) : 'Gelenk wählen …';
    for (const el of list.children) el.classList.toggle('selected', +el.dataset.index === i);
    updateButtons();
    updateHeat();
  }
  function weightCount(b) {
    let n = 0;
    for (const m of skinnedMeshes()) {
      const i = m.skeleton.bones.indexOf(b);
      if (i < 0) continue;
      if (!ensureSkinAttrs(m)) continue;
      const I = m.geometry.attributes.skinIndex.array, Wt = m.geometry.attributes.skinWeight.array;
      for (let o = 0; o < I.length; o += 4) for (let k = 0; k < 4; k++) if (I[o + k] === i && Wt[o + k] > 0) { n++; break; }
    }
    return n;
  }
  function updateButtons() {
    const u = $('#ed-undo'); if (u) u.disabled = !st.undo.length;
    const d = $('#ed-del-bone'); if (d) d.disabled = !isAdded(st.selected);
    const anyAdded = st.bones.some(isAdded);
    $('#ed-weights-box')?.classList.toggle('hidden', !anyAdded);
    const wb = $('#ed-weights'); if (wb) wb.disabled = !isAdded(st.selected);
    $('#ed-auto')?.classList.toggle('active', W.auto);
    $('#ed-heat')?.classList.toggle('active', W.heat);
    const hint = $('#ed-hint');
    if (hint) {
      let t = '';
      if (isAdded(st.selected)) {
        const n = weightCount(st.selected);
        t = n ? `Neuer Knochen: beeinflusst ${fmt.format(n)} Vertices.` : 'Neuer Knochen: noch ohne Gewichtung – er bewegt das Mesh nicht.';
      }
      else if (st.rigOnly) t = 'Nur Rig: Gelenke bewegen, das Mesh bleibt stehen.';
      hint.textContent = t;
      hint.classList.toggle('hidden', !t);
    }
  }
  function setMode(mode) {
    st.mode = mode;
    tc.setMode(mode);
    $('#ed-rotate').classList.toggle('active', mode === 'rotate');
    $('#ed-translate').classList.toggle('active', mode === 'translate');
  }
  function setRigOnly(on) {
    st.rigOnly = !!on;
    $('#ed-rig').classList.toggle('active', st.rigOnly);
    $('#ed-rig').setAttribute('aria-pressed', st.rigOnly);
    updateButtons();
  }

  function enter() {
    if (!model) { showError('Bitte zuerst ein Modell öffnen.', 2500); return; }
    face?.exit();
    if (!st.bones.length) { showError('Dieses Modell hat keine Knochen/Gelenke zum Bearbeiten.', 3500); return; }
    st.active = true;
    animFrozen = true;
    paused = true;
    if (action) action.paused = true;
    $('#play').classList.add('paused');
    tc.enabled = true;
    buildJoints();
    buildList();
    select(null);
    setMode(st.mode);
    setRigOnly(st.rigOnly);
    $('#editor').classList.remove('hidden');
    $('#anim').classList.add('hidden');
    document.body.classList.add('editing');
    setToolActive('edit', true);
  }
  function exit(silent) {
    if (!st.active && !silent) return;
    setHeat(false);
    clearTimeout(W.timer);
    st.active = false;
    rigOp = null;
    tc.detach();
    tc.enabled = false;
    controls.enabled = true;
    clearJoints();
    $('#editor').classList.add('hidden');
    $('#bone-picker').classList.add('hidden');
    document.body.classList.remove('editing');
    if (clips.length && model) $('#anim').classList.remove('hidden');
    setToolActive('edit', false);
  }

  // Tippen auf Gelenkpunkte (Bildschirm-Abstand, fingerfreundlich)
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!st.active) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now(), gizmo: tc.axis !== null || tc.dragging };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!st.active || !down) return;
    const d = down; down = null;
    if (d.gizmo || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 600) return;
    const rect = canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    let best = null, bestD = 30;
    for (const m of jointMeshes) {
      v.copy(m.position).project(camera);
      if (v.z > 1) continue;
      const sx = rect.left + (v.x + 1) / 2 * rect.width, sy = rect.top + (1 - v.y) / 2 * rect.height;
      const dist = Math.hypot(sx - e.clientX, sy - e.clientY);
      if (dist < bestD) { bestD = dist; best = m.userData.bone; }
    }
    if (best) select(best);
  });

  function update() {
    if (!st.active) return;
    for (const m of jointMeshes) m.userData.bone.getWorldPosition(m.position);
  }

  // ---- Animation an das bearbeitete Rig anpassen ----
  // Jede "Nur Rig"-Operation an Knochen B wird gespeichert. Beim Abspielen/Export:
  //  - B behält seine Rotationen (plus Rig-Drehung) und nutzt den neuen Drehpunkt (Positions-Offset)
  //  - alle Nachkommen X: L_X'(t) = K_parent * L_X(t) * K_X^-1, damit ihre Segmente starr der neuen
  //    Bewegung von B folgen (K_B = F = L1^-1 * L0, K_X = R_X^-1 * F * R_X; R_X = Kette B -> X)
  function adaptClips(base) {
    if (!st.rigOps.length || !model) return base;
    let out = base;
    for (const op of st.rigOps) out = out.map((clip) => applyOp(clip, op));
    return out;
  }
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
  const _M = new THREE.Matrix4(), _L = new THREE.Matrix4();
  function applyOp(clip, op) {
    const byNode = new Map(); // node -> { position, quaternion } (Index der Tracks)
    clip.tracks.forEach((tr, i) => {
      const pb = THREE.PropertyBinding.parseTrackName(tr.name);
      if (pb.propertyName !== 'position' && pb.propertyName !== 'quaternion') return;
      const node = THREE.PropertyBinding.findNode(model, pb.nodeName);
      if (!node) return;
      const e = byNode.get(node) || { nodeName: pb.nodeName };
      e[pb.propertyName] = i;
      byNode.set(node, e);
    });
    const tracks = clip.tracks.slice();
    let changed = false;
    // 1) B selbst
    const eb = byNode.get(op.bone);
    if (eb) {
      if (eb.position !== undefined && op.dp.lengthSq() > 1e-14) {
        const tr = tracks[eb.position].clone();
        const perKey = tr.values.length / tr.times.length, cubic = perKey === 9;
        for (let k = 0; k < tr.times.length; k++) {
          const o = k * perKey + (cubic ? 3 : 0);
          tr.values[o] += op.dp.x; tr.values[o + 1] += op.dp.y; tr.values[o + 2] += op.dp.z;
        }
        tracks[eb.position] = tr; changed = true;
      }
      if (eb.quaternion !== undefined && Math.abs(op.dq.w) < 0.999999999) {
        const tr = tracks[eb.quaternion].clone();
        for (let o = 0; o < tr.values.length; o += 4) { _q.fromArray(tr.values, o).multiply(op.dq); _q.toArray(tr.values, o); }
        tracks[eb.quaternion] = tr; changed = true;
      }
    }
    // 2) Nachkommen
    if (!op.identityF) {
      const extra = [];
      for (const [x, info] of op.desc) {
        const e = byNode.get(x);
        if (!e || e.quaternion === undefined && e.position === undefined) continue;
        const Kp = info.parent === op.bone ? op.F : op.desc.get(info.parent)?.K;
        if (!Kp) continue;
        const pTr = e.position !== undefined ? tracks[e.position] : null;
        const qTr = e.quaternion !== undefined ? tracks[e.quaternion] : null;
        const tset = new Set();
        if (pTr) pTr.times.forEach((t) => tset.add(t));
        if (qTr) qTr.times.forEach((t) => tset.add(t));
        const times = Float32Array.from([...tset].sort((a, b) => a - b));
        const pI = pTr && pTr.createInterpolant(), qI = qTr && qTr.createInterpolant();
        const pv = new Float32Array(times.length * 3), qv = new Float32Array(times.length * 4);
        const Kinv = info.Kinv;
        let prev = null;
        for (let k = 0; k < times.length; k++) {
          const t = times[k];
          if (pI) _p.fromArray(pI.evaluate(t)); else _p.copy(info.restP);
          if (qI) _q.fromArray(qI.evaluate(t)).normalize(); else _q.copy(info.restQ);
          _L.compose(_p, _q, _one);
          _M.copy(Kp).multiply(_L).multiply(Kinv);
          _M.decompose(_p, _q, _s);
          if (prev && prev.dot(_q) < 0) _q.set(-_q.x, -_q.y, -_q.z, -_q.w); // stetige Quaternionen
          prev = (prev || new THREE.Quaternion()).copy(_q);
          _p.toArray(pv, k * 3); _q.toArray(qv, k * 4);
        }
        const nm = e.nodeName;
        const newP = new THREE.VectorKeyframeTrack(`${nm}.position`, times, pv);
        const newQ = new THREE.QuaternionKeyframeTrack(`${nm}.quaternion`, times, qv);
        if (pTr) tracks[e.position] = newP; else extra.push(newP);
        if (qTr) tracks[e.quaternion] = newQ; else extra.push(newQ);
        changed = true;
      }
      tracks.push(...extra);
    }
    return changed ? new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode) : clip;
  }

  $('#ed-rotate').addEventListener('click', () => setMode('rotate'));
  $('#ed-translate').addEventListener('click', () => setMode('translate'));
  $('#ed-rig').addEventListener('click', () => setRigOnly(!st.rigOnly));
  $('#ed-add-bone').addEventListener('click', addBone);
  $('#ed-del-bone').addEventListener('click', deleteBone);
  $('#ed-undo').addEventListener('click', undo);
  $('#ed-reset-joint').addEventListener('click', resetJoint);
  $('#ed-reset-pose').addEventListener('click', resetPose);
  $('#bone-current').addEventListener('click', () => {
    const p = $('#bone-picker');
    const edTop = $('#editor').getBoundingClientRect().top;
    const barBottom = $('#topbar').getBoundingClientRect().bottom;
    p.style.bottom = `${window.innerHeight - edTop + 8}px`;
    p.style.maxHeight = `${Math.max(160, edTop - barBottom - 16)}px`;
    p.classList.toggle('hidden');
    if (!p.classList.contains('hidden')) { const sel = list.querySelector('.selected'); if (sel) sel.scrollIntoView({ block: 'center' }); }
  });
  $('#ed-close').addEventListener('click', () => exit());
  $('#ed-weights').addEventListener('click', () => { computeWeights([st.selected]); updateButtons(); });
  $('#ed-weights-all').addEventListener('click', () => { computeWeights(st.bones.filter(isAdded)); updateButtons(); });
  $('#ed-auto').addEventListener('click', () => { W.auto = !W.auto; updateButtons(); });
  $('#ed-heat').addEventListener('click', () => setHeat(!W.heat));
  const radius = $('#ed-radius');
  radius.addEventListener('input', () => {
    W.radiusPct = +radius.value;
    $('#ed-radius-val').textContent = `${fmt.format(W.radiusPct)} %`;
    if (W.auto && isAdded(st.selected)) scheduleAuto([st.selected]);
  });

  return {
    get active() { return st.active; },
    get bones() { return st.editable.map((b, i) => boneName(b, i)); },
    get selected() { return st.selected; },
    get rigOnly() { return st.rigOnly; },
    capture, enter, exit, update, undo, resetJoint, resetPose, select, setMode, setRigOnly,
    computeWeights, setHeat, weightCount, skinnedMeshes,
    setAuto(v) { W.auto = !!v; updateButtons(); },
    setRadius(p) { W.radiusPct = p; radius.value = p; $('#ed-radius-val').textContent = `${fmt.format(p)} %`; },
    get heat() { return W.heat; },
    suspendHeat() { const was = W.heat; if (was) setHeat(false); return was; },
    resumeHeat(was) { if (was) setHeat(true); },
    rotateSelected, translateSelected, addBone, deleteBone, adaptClips, skeletons, addBoneAt, deleteBoneRef,
    structureChanged() { afterStructureChange(null); },
    toggle() { st.active ? exit() : enter(); },
    selectByName(name) { const b = st.editable.find((x) => x.name === name); if (b) select(b); return !!b; },
    findBone(name) { return st.editable.find((x) => x.name === name); },
  };
})();

// ---------- Gesicht ----------
let faceAnim = null;
function restPose(on) {
  if (on) {
    const wasPlaying = !!action && !paused && !animFrozen;
    animFrozen = true; paused = true;
    $('#play').classList.add('paused');
    faceAnim = { idx: Math.max(0, +$('#clip').value || 0), t: action ? action.time : 0, playing: wasPlaying };
    if (mixer) { mixer.stopAllAction(); action = null; }
  } else if (mixer && clips.length && model) {
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    clips = editor.adaptClips(baseClips);
    rigDirty = false;
    playClip(faceAnim ? faceAnim.idx : 0);
    if (action) { action.time = faceAnim ? faceAnim.t : 0; action.paused = true; }
    if (action && faceAnim?.playing) { paused = false; animFrozen = false; action.paused = false; $('#play').classList.remove('paused'); }
    mixer.update(0);
    $('#anim').classList.remove('hidden');
  }
}
vrmMod = initVrm({
  $, makeLoader: makeGltfLoader, showToast: (...a) => showToast(...a), showError, getModel: () => model, setToolActive,
  closeOthers: () => { editor.exit(); face?.exit(); },
  onMorphsChanged: () => { if (model) buildInfo($('#filename').textContent); },
});
face = initFace({
  scene, camera, canvas, controls, editor, $, showToast: (...a) => showToast(...a), showError,
  getModel: () => model, restPose, setToolActive, markAnimDirty: () => { rigDirty = true; },
  refreshInfo: () => { if (model) buildInfo($('#filename').textContent); },
  landmarkHints: () => vrmMod?.faceHints(),
});

function rebuildAnimation() {
  if (!mixer || !model) { rigDirty = false; return; }
  const idx = Math.max(0, +$('#clip').value || 0);
  const t = action ? action.time : 0;
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  action = null;
  clips = editor.adaptClips(baseClips);
  playClip(idx);
  if (action) action.time = t;
  rigDirty = false;
}
function unfreezeAnim() {
  animFrozen = false;
  if (rigDirty) rebuildAnimation();
}
$('#play').addEventListener('click', () => { if (!paused) unfreezeAnim(); });
$('#clip').addEventListener('change', unfreezeAnim);
scrub.addEventListener('input', unfreezeAnim);

// ---------- Export als GLB ----------
let currentName = 'modell';
function toStandardMaterial(m) {
  if (!m || m.isMeshStandardMaterial || m.isMeshBasicMaterial) return null;
  const n = new THREE.MeshStandardMaterial({
    name: m.name,
    color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
    map: m.map || null,
    normalMap: m.normalMap || null,
    emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0x000000),
    emissiveMap: m.emissiveMap || null,
    emissiveIntensity: m.emissiveIntensity ?? 1,
    aoMap: m.aoMap || null,
    alphaMap: m.alphaMap || null,
    opacity: m.opacity,
    transparent: m.transparent,
    alphaTest: m.alphaTest,
    side: m.side,
    vertexColors: m.vertexColors,
    metalness: 0,
    roughness: m.shininess !== undefined ? THREE.MathUtils.clamp(1 - m.shininess / 100, 0.35, 1) : 1,
  });
  if (m.normalScale) n.normalScale.copy(m.normalScale);
  return n;
}

async function exportGLB(opts = {}) {
  if (!model) { showError('Bitte zuerst ein Modell öffnen.', 2500); return null; }
  setLoading(true, 'Erstelle GLB …');
  const heatWas = editor.suspendHeat();
  const swaps = [];
  const wireMats = [];
  let vrmRestore = null;
  try {
    vrmRestore = vrmMod.beforeExport(model); // MToon -> Unlit, Outlines weglassen
    // FBX/Phong-Materialien für glTF in PBR umwandeln, Drahtgitter-Ansicht nicht mit exportieren
    model.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      let changed = false;
      const out = arr.map((m) => { const n = toStandardMaterial(m); if (n) changed = true; return n || m; });
      out.forEach((m) => { if (m.wireframe) { wireMats.push(m); m.wireframe = false; } });
      if (changed) { swaps.push([o, o.material]); o.material = Array.isArray(o.material) ? out : out[0]; }
    });
    face?.beforeExport();
    model.updateMatrixWorld(true);
    const exporter = new GLTFExporter();
    exporter.setTextureUtils({ decompress: (t, max) => WebGLTextureUtils.decompress(t, max) });
    const result = await exporter.parseAsync(model, {
      binary: true, trs: true, onlyVisible: true, animations: editor.adaptClips(baseClips), maxTextureSize: 4096,
    });
    const file = new File([result], `${currentName}-bearbeitet.glb`, { type: 'model/gltf-binary' });
    window.__lastExport = file;
    if (opts.dialog !== false) showExportDialog(file);
    return file;
  } catch (err) {
    console.warn(err);
    showError(`GLB-Export fehlgeschlagen.\nFehler: ${(err && err.message) || err}`);
    return null;
  } finally {
    for (const [o, mat] of swaps) {
      const now = Array.isArray(o.material) ? o.material : [o.material];
      const old = Array.isArray(mat) ? mat : [mat];
      now.forEach((m) => { if (!old.includes(m)) m.dispose(); });
      o.material = mat;
    }
    wireMats.forEach((m) => { m.wireframe = true; });
    vrmRestore?.();
    editor.resumeHeat(heatWas);
    setLoading(false);
  }
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function showExportDialog(file) {
  const dlg = $('#export-dialog');
  $('#export-name').textContent = file.name;
  $('#export-size').textContent = file.size < 1048576 ? `${fmt.format(Math.ceil(file.size / 1024))} KB` : `${fmt1.format(file.size / 1048576)} MB`;
  const canShare = !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
  $('#export-share').classList.toggle('hidden', !canShare);
  $('#export-share').onclick = async () => {
    try { await navigator.share({ files: [file], title: file.name }); dlg.classList.add('hidden'); }
    catch (e) { if (e && e.name !== 'AbortError') downloadFile(file); }
  };
  $('#export-download').onclick = () => { downloadFile(file); dlg.classList.add('hidden'); };
  $('#export-close').onclick = () => dlg.classList.add('hidden');
  dlg.classList.remove('hidden');
}

// ---------- Meine Modelle (IndexedDB) ----------
const library = (() => {
  const DB = '3d-viewer', STORE = 'models';
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB nicht verfügbar')); return; }
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { const s = r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }); s.createIndex('date', 'date'); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const s = t.objectStore(STORE);
      let result;
      Promise.resolve(fn(s)).then((r) => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Abgebrochen'));
    });
  }
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  async function list() {
    return tx('readonly', async (s) => {
      const all = await req(s.getAll());
      return all.map(({ data, ...meta }) => meta).sort((a, b) => b.date - a.date);
    });
  }
  async function get(id) { return tx('readonly', (s) => req(s.get(id))); }
  async function put(rec) { return tx('readwrite', (s) => req(s.put(rec))); }
  async function remove(id) { return tx('readwrite', (s) => req(s.delete(id))); }

  function thumbnail() {
    const hw = editor.suspendHeat();
    const hide = [];
    scene.traverse((o) => { if ((o.isTransformControlsRoot || o.isSkeletonHelper || o.type === 'SkeletonHelper' || o.renderOrder >= 997) && o.visible) { hide.push(o); } });
    hide.forEach((o) => { o.visible = false; });
    renderer.render(scene, camera);
    const src = renderer.domElement;
    const c = document.createElement('canvas');
    const S = 256; c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const side = Math.min(src.width, src.height);
    ctx.drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, S, S);
    hide.forEach((o) => { o.visible = true; });
    editor.resumeHeat(hw);
    return c.toDataURL('image/jpeg', 0.8);
  }

  function germanStorageError(err) {
    const n = err && (err.name || '');
    if (n === 'QuotaExceededError' || /quota/i.test(String(err && err.message))) return 'Nicht genug Speicherplatz: Bitte ältere Modelle in „Meine Modelle“ löschen und erneut versuchen.';
    return `Speichern fehlgeschlagen.\nFehler: ${(err && err.message) || err}`;
  }

  async function saveCurrent(nameArg) {
    if (!model) { showError('Bitte zuerst ein Modell öffnen.', 2500); return null; }
    let name = nameArg;
    if (name === undefined) {
      name = window.prompt('Name für das Modell:', currentName);
      if (name === null) return null;
    }
    name = (name || '').trim() || currentName;
    const thumb = thumbnail();
    const file = await exportGLB({ dialog: false });
    if (!file) return null;
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
      const data = await file.arrayBuffer();
      const id = await put({ name, date: Date.now(), size: data.byteLength, thumb, data });
      showToast(`„${name}“ in „Meine Modelle“ gespeichert.`);
      if (!$('#library').classList.contains('hidden')) render();
      return id;
    } catch (err) {
      console.warn(err);
      showError(germanStorageError(err));
      return null;
    }
  }

  async function open(id) {
    const rec = await get(id);
    if (!rec) { showError('Modell nicht gefunden.'); return; }
    hide();
    await openFiles([new File([rec.data], `${rec.name.replace(/\.glb$/i, '')}.glb`, { type: 'model/gltf-binary' })]);
  }

  async function rename(id) {
    const rec = await get(id);
    if (!rec) return;
    const n = window.prompt('Neuer Name:', rec.name);
    if (n === null || !n.trim()) return;
    rec.name = n.trim();
    try { await put(rec); } catch (err) { showError(germanStorageError(err)); }
    render();
  }
  async function del(id, name) {
    if (!window.confirm(`„${name}“ wirklich löschen?`)) return;
    await remove(id);
    render();
  }

  async function usage() {
    try {
      if (!navigator.storage || !navigator.storage.estimate) return '';
      const { usage: u = 0, quota: q = 0 } = await navigator.storage.estimate();
      const mb = (x) => fmt1.format(x / 1048576);
      return q ? `Speicher: ${mb(u)} MB von ca. ${fmt.format(Math.round(q / 1048576))} MB belegt` : `Speicher: ${mb(u)} MB belegt`;
    } catch (e) { return ''; }
  }

  async function render() {
    const ul = $('#lib-list');
    let items = [];
    try { items = await list(); } catch (err) { showError(`„Meine Modelle“ konnte nicht geladen werden.\n${err.message || err}`); }
    ul.innerHTML = '';
    $('#lib-empty').classList.toggle('hidden', items.length > 0);
    const dtf = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'lib-item';
      const img = document.createElement('img'); img.src = it.thumb || 'icons/icon.svg'; img.alt = '';
      const meta = document.createElement('div'); meta.className = 'lib-meta';
      const nm = document.createElement('div'); nm.className = 'lib-name'; nm.textContent = it.name;
      const sub = document.createElement('div'); sub.className = 'small';
      sub.textContent = `${dtf.format(new Date(it.date))} · ${fmt1.format(it.size / 1048576)} MB`;
      meta.append(nm, sub);
      const btns = document.createElement('div'); btns.className = 'lib-btns';
      const mk = (txt, cls, fn) => { const b = document.createElement('button'); b.textContent = txt; b.className = cls; b.addEventListener('click', fn); return b; };
      btns.append(
        mk('Öffnen', 'primary sm', () => open(it.id)),
        mk('Umbenennen', 'ed-btn sm', () => rename(it.id)),
        mk('Löschen', 'ed-btn sm danger', () => del(it.id, it.name)),
      );
      row.append(img, meta, btns);
      ul.appendChild(row);
    }
    $('#lib-usage').textContent = await usage();
    $('#lib-save').disabled = !model;
  }
  function show() { $('#library').classList.remove('hidden'); render(); }
  function hide() { $('#library').classList.add('hidden'); }
  $('#lib-close').addEventListener('click', hide);
  $('#lib-save').addEventListener('click', () => saveCurrent());
  return { show, hide, saveCurrent, list, open, render };
})();

let toastTimer;
function showToast(msg, ms = 2500) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

// Für Tests
window.__viewer = { get vrm() { return vrmMod; }, camera, controls, get clips() { return clips.map((c) => c.name); }, get model() { return model; }, openFiles, editor, face, exportGLB, library, THREE, GLTFLoader, get mixer() { return mixer; }, get action() { return action; }, get rawClips() { return clips; }, get baseClips() { return baseClips; } };
