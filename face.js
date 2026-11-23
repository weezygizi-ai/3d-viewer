// Gesichts-Modus: Gesichts-Rig (Landmarken + Knochen), Morph-Editor mit Pinsel,
// ARKit-Generator, Visemes, Emotionen und Sprechtest.
import * as THREE from 'three';

export const ARKIT_NAMES = [
  'eyeBlinkLeft', 'eyeLookDownLeft', 'eyeLookInLeft', 'eyeLookOutLeft', 'eyeLookUpLeft', 'eyeSquintLeft', 'eyeWideLeft',
  'eyeBlinkRight', 'eyeLookDownRight', 'eyeLookInRight', 'eyeLookOutRight', 'eyeLookUpRight', 'eyeSquintRight', 'eyeWideRight',
  'jawForward', 'jawLeft', 'jawRight', 'jawOpen',
  'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthLeft', 'mouthRight',
  'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight', 'mouthDimpleLeft', 'mouthDimpleRight',
  'mouthStretchLeft', 'mouthStretchRight', 'mouthRollLower', 'mouthRollUpper', 'mouthShrugLower', 'mouthShrugUpper',
  'mouthPressLeft', 'mouthPressRight', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight', 'noseSneerLeft', 'noseSneerRight', 'tongueOut',
];
export const VISEMES = ['viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk', 'viseme_CH',
  'viseme_SS', 'viseme_nn', 'viseme_RR', 'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U'];

// Viseme = Kombination aus ARKit-Formen (editierbar, wird in extras gespeichert)
export const DEFAULT_VISEME_MAP = {
  viseme_sil: {},
  viseme_PP: { mouthPressLeft: 0.55, mouthPressRight: 0.55, mouthRollLower: 0.3, mouthRollUpper: 0.2, jawOpen: 0.04 },
  viseme_FF: { mouthRollLower: 0.65, mouthUpperUpLeft: 0.3, mouthUpperUpRight: 0.3, jawOpen: 0.08, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  viseme_TH: { jawOpen: 0.15, tongueOut: 0.45, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
  viseme_DD: { jawOpen: 0.22, mouthShrugUpper: 0.2, mouthStretchLeft: 0.15, mouthStretchRight: 0.15 },
  viseme_kk: { jawOpen: 0.28, mouthStretchLeft: 0.3, mouthStretchRight: 0.3 },
  viseme_CH: { mouthFunnel: 0.55, mouthPucker: 0.2, jawOpen: 0.15, mouthShrugUpper: 0.2 },
  viseme_SS: { mouthStretchLeft: 0.45, mouthStretchRight: 0.45, mouthSmileLeft: 0.15, mouthSmileRight: 0.15, jawOpen: 0.07 },
  viseme_nn: { jawOpen: 0.18, mouthUpperUpLeft: 0.15, mouthUpperUpRight: 0.15, mouthStretchLeft: 0.1, mouthStretchRight: 0.1 },
  viseme_RR: { mouthPucker: 0.4, mouthFunnel: 0.3, jawOpen: 0.15 },
  viseme_aa: { jawOpen: 0.62, mouthLowerDownLeft: 0.2, mouthLowerDownRight: 0.2, mouthUpperUpLeft: 0.1, mouthUpperUpRight: 0.1 },
  viseme_E: { jawOpen: 0.32, mouthStretchLeft: 0.45, mouthStretchRight: 0.45, mouthSmileLeft: 0.15, mouthSmileRight: 0.15 },
  viseme_I: { jawOpen: 0.18, mouthStretchLeft: 0.55, mouthStretchRight: 0.55, mouthSmileLeft: 0.35, mouthSmileRight: 0.35 },
  viseme_O: { jawOpen: 0.42, mouthFunnel: 0.6, mouthPucker: 0.2 },
  viseme_U: { jawOpen: 0.14, mouthPucker: 0.85, mouthFunnel: 0.3 },
};
export const DEFAULT_EMOTIONS = {
  neutral: {},
  froh: { mouthSmileLeft: 0.8, mouthSmileRight: 0.8, cheekSquintLeft: 0.5, cheekSquintRight: 0.5, eyeSquintLeft: 0.3, eyeSquintRight: 0.3, mouthDimpleLeft: 0.2, mouthDimpleRight: 0.2, jawOpen: 0.05 },
  traurig: { browInnerUp: 0.8, mouthFrownLeft: 0.6, mouthFrownRight: 0.6, mouthShrugLower: 0.3, eyeLookDownLeft: 0.2, eyeLookDownRight: 0.2, eyeSquintLeft: 0.1, eyeSquintRight: 0.1 },
  'wütend': { browDownLeft: 0.9, browDownRight: 0.9, eyeSquintLeft: 0.4, eyeSquintRight: 0.4, noseSneerLeft: 0.5, noseSneerRight: 0.5, mouthPressLeft: 0.4, mouthPressRight: 0.4, mouthFrownLeft: 0.3, mouthFrownRight: 0.3 },
  'überrascht': { browInnerUp: 0.9, browOuterUpLeft: 0.9, browOuterUpRight: 0.9, eyeWideLeft: 0.8, eyeWideRight: 0.8, jawOpen: 0.45, mouthFunnel: 0.2 },
  'ängstlich': { browInnerUp: 0.9, browOuterUpLeft: 0.3, browOuterUpRight: 0.3, eyeWideLeft: 0.7, eyeWideRight: 0.7, mouthStretchLeft: 0.6, mouthStretchRight: 0.6, jawOpen: 0.15, mouthFrownLeft: 0.2, mouthFrownRight: 0.2 },
  angeekelt: { noseSneerLeft: 0.9, noseSneerRight: 0.9, mouthUpperUpLeft: 0.6, mouthUpperUpRight: 0.6, browDownLeft: 0.5, browDownRight: 0.5, eyeSquintLeft: 0.5, eyeSquintRight: 0.5, mouthShrugLower: 0.3 },
};

const ARK_LC = new Map(ARKIT_NAMES.map((n) => [n.toLowerCase(), n]));
const VIS_LC = new Map(VISEMES.map((n) => [n.toLowerCase().replace(/[_\s-]/g, ''), n]));
// Morph-Namen auf ARKit-Standardnamen abbilden (eyeBlink_L, EyeBlinkLeft, blendShape.eyeBlinkLeft …)
export function arkitCanon(name) {
  if (!name) return null;
  let n = String(name).replace(/^.*[.:|]/, '');
  n = n.replace(/^(arkit|blendshape\d*|bs)[_\-]?/i, '');
  n = n.replace(/[_.\- ]L$/, 'Left').replace(/[_.\- ]R$/, 'Right').replace(/([a-z])L$/, '$1Left').replace(/([a-z])R$/, '$1Right');
  n = n.replace(/[_\-\s]/g, '');
  return ARK_LC.get(n.toLowerCase()) || null;
}
export function visemeCanon(name) {
  if (!name) return null;
  const n = String(name).replace(/^.*[.:|]/, '').toLowerCase().replace(/[_\s-]/g, '');
  return VIS_LC.get(n) || null;
}

// Landmarken (L = linke Seite der Figur)
const LM = [
  { id: 'eyeL', pair: 'eyeR', label: 'Auge', hint: 'Mitte der Pupille' },
  { id: 'lidUpL', pair: 'lidUpR', label: 'Oberlid', hint: 'Mitte der oberen Lidkante' },
  { id: 'lidLoL', pair: 'lidLoR', label: 'Unterlid', hint: 'Mitte der unteren Lidkante' },
  { id: 'browInL', pair: 'browInR', label: 'Augenbraue innen', hint: 'inneres Ende der Braue' },
  { id: 'browOutL', pair: 'browOutR', label: 'Augenbraue außen', hint: 'äußeres Ende der Braue' },
  { id: 'mouthL', pair: 'mouthR', label: 'Mundwinkel', hint: 'Ecke des Mundes' },
  { id: 'lipUp', label: 'Oberlippe', hint: 'Mitte der Oberlippe (Lippenrot)' },
  { id: 'lipLo', label: 'Unterlippe', hint: 'Mitte der Unterlippe (Lippenrot)' },
  { id: 'chin', label: 'Kinn', hint: 'Kinnspitze' },
  { id: 'jawL', pair: 'jawR', label: 'Kiefergelenk', hint: 'kurz vor dem Ohr (Seitenansicht)', side: true },
  { id: 'tongue', label: 'Zunge (optional)', hint: 'Zungenspitze – überspringen, wenn es keine Zunge gibt', optional: true },
];
const LM_ALL = [];
for (const l of LM) {
  LM_ALL.push({ ...l, sideName: l.pair ? 'L' : '' });
  if (l.pair) LM_ALL.push({ ...l, id: l.pair, pair: l.id, sideName: 'R' });
}
const LM_BY = Object.fromEntries(LM_ALL.map((l) => [l.id, l]));
const REQUIRED = LM_ALL.filter((l) => !l.optional).map((l) => l.id);

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const fall = (t) => (t <= 0 ? 1 : t >= 1 ? 0 : 1 - t * t * (3 - 2 * t));
const ss = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const ell = (q, c, rx, ry, rz) => fall(Math.hypot((q[0] - c[0]) / rx, (q[1] - c[1]) / ry, (q[2] - c[2]) / rz));
const mirrorName = (n) => {
  if (/Left$/.test(n)) return n.replace(/Left$/, 'Right');
  if (/Right$/.test(n)) return n.replace(/Right$/, 'Left');
  if (/[_.\- ]L$/.test(n)) return n.replace(/L$/, 'R');
  if (/[_.\- ]R$/.test(n)) return n.replace(/R$/, 'L');
  if (/_l$/.test(n)) return n.replace(/_l$/, '_r');
  if (/_r$/.test(n)) return n.replace(/_r$/, '_l');
  return null;
};

export function initFace(ctx) {
  const { scene, camera, canvas, controls, editor, $, showToast, showError } = ctx;
  const fmt2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const model = () => ctx.getModel();

  const S = {
    active: false, tab: 'rig', avatar: null, host: null,
    ref: null, points: {}, step: 0, mirror: true, facing: 0,
    undo: [], target: null, caches: new Map(), faceSet: null, mirrorReady: false,
    brush: { on: false, tool: 'grab', radius: 12, strength: 50, sym: true, mesh: 'all' },
    boneScale: 1, blink: true, speak: null, tween: null, nextBlink: 2, blinkT: -1, lastEmotion: 'froh',
  };
  const editableGeoms = new WeakSet();

  // ---------------------------------------------------------------- Meshes / Morphs
  function allMeshes() {
    const out = [];
    model()?.traverse((o) => { if (o.isMesh && o.geometry?.attributes?.position) out.push(o); });
    return out;
  }
  function visibleMeshes() {
    return allMeshes().filter((m) => { for (let o = m; o; o = o.parent) if (!o.visible) return false; return true; });
  }
  function meshesUsing(g) { return allMeshes().filter((m) => m.geometry === g); }
  function toFloatAttr(a) {
    if (!a) return a;
    if (!a.isInterleavedBufferAttribute && a.array instanceof Float32Array && !a.normalized) return a;
    const k = a.itemSize, out = new THREE.Float32BufferAttribute(new Float32Array(a.count * k), k);
    for (let v = 0; v < a.count; v++) for (let j = 0; j < k; j++) out.array[v * k + j] = a.getComponent(v, j);
    out.name = a.name;
    return out;
  }
  // Geometrie bearbeitbar machen: Float32, relative Morphs, Namen aus dem Mesh-Wörterbuch
  function ensureEditable(g) {
    if (editableGeoms.has(g)) return;
    for (const m of meshesUsing(g)) {
      const d = m.morphTargetDictionary;
      if (!d || !g.morphAttributes.position) continue;
      for (const k in d) {
        const i = d[k];
        if (g.morphAttributes.position[i]) g.morphAttributes.position[i].name = k;
        if (g.morphAttributes.normal?.[i]) g.morphAttributes.normal[i].name = k;
      }
    }
    g.setAttribute('position', toFloatAttr(g.attributes.position));
    if (g.attributes.normal) g.setAttribute('normal', toFloatAttr(g.attributes.normal));
    for (const key of ['position', 'normal']) {
      const arr = g.morphAttributes[key];
      if (!arr) continue;
      g.morphAttributes[key] = arr.map(toFloatAttr);
      if (!g.morphTargetsRelative && g.attributes[key]) {
        const base = g.attributes[key].array;
        for (const a of g.morphAttributes[key]) for (let i = 0; i < a.array.length; i++) a.array[i] -= base[i];
      }
    }
    if (g.morphAttributes.color) delete g.morphAttributes.color;
    g.morphTargetsRelative = true;
    editableGeoms.add(g);
  }
  function syncMorph(g) {
    const pm = g.morphAttributes.position;
    for (const m of meshesUsing(g)) {
      const old = {};
      if (m.morphTargetDictionary && m.morphTargetInfluences) for (const k in m.morphTargetDictionary) old[k] = m.morphTargetInfluences[m.morphTargetDictionary[k]] || 0;
      if (!pm || !pm.length) {
        delete g.morphAttributes.position; delete g.morphAttributes.normal;
        m.morphTargetInfluences = undefined; m.morphTargetDictionary = undefined;
        continue;
      }
      m.updateMorphTargets();
      for (const k in old) if (k in m.morphTargetDictionary) m.morphTargetInfluences[m.morphTargetDictionary[k]] = old[k];
    }
    g.dispose(); // Morph-Textur neu aufbauen
    ctx.markAnimDirty?.();
  }
  function refreshGPU(g) { g.dispose(); }
  function targetIndex(g, name) { const pm = g.morphAttributes.position; return pm ? pm.findIndex((a) => a.name === name) : -1; }
  function addTargetRaw(g, name) {
    ensureEditable(g);
    let i = targetIndex(g, name);
    if (i >= 0) return { i, created: false };
    const n = g.attributes.position.count;
    const hadAny = !!(g.morphAttributes.position && g.morphAttributes.position.length);
    const p = new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3); p.name = name;
    (g.morphAttributes.position ||= []).push(p);
    if (g.attributes.normal && (g.morphAttributes.normal || !hadAny)) {
      const a = new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3); a.name = name;
      (g.morphAttributes.normal ||= []).push(a);
    }
    return { i: g.morphAttributes.position.length - 1, created: true };
  }
  function geomsOf(meshes) { return [...new Set(meshes.map((m) => m.geometry))]; }
  function targetNames() {
    const seen = new Set(), out = [];
    for (const m of allMeshes()) if (m.morphTargetDictionary) {
      const arr = Object.entries(m.morphTargetDictionary).sort((a, b) => a[1] - b[1]);
      for (const [k] of arr) if (!seen.has(k)) { seen.add(k); out.push(k); }
    }
    return out;
  }
  function setInfluence(name, v) {
    for (const m of allMeshes()) { const i = m.morphTargetDictionary?.[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; }
  }
  function getInfluence(name) {
    for (const m of allMeshes()) { const i = m.morphTargetDictionary?.[name]; if (i !== undefined) return m.morphTargetInfluences[i] || 0; }
    return 0;
  }
  function detectArkit() {
    const map = {};
    for (const n of targetNames()) { const c = arkitCanon(n); if (c && !map[c]) map[c] = n; }
    return map;
  }
  function detectVisemes() {
    const map = {};
    for (const n of targetNames()) { const c = visemeCanon(n); if (c && !map[c]) map[c] = n; }
    return map;
  }
  function resolveArkit(canon) { return detectArkit()[canon] || null; }

  // ---------------------------------------------------------------- Avatar-Daten (extras)
  function defaultAvatar() {
    return {
      version: 1, generator: '3D Viewer',
      arkit: { status: {} }, visemes: { map: JSON.parse(JSON.stringify(DEFAULT_VISEME_MAP)), baked: [] },
      emotions: JSON.parse(JSON.stringify(DEFAULT_EMOTIONS)), faceRig: null,
    };
  }
  function onModel() {
    exit(true);
    S.avatar = null; S.host = null; S.ref = null; S.points = {}; S.undo = []; S.target = null;
    S.caches.clear(); S.faceSet = null; S.mirrorReady = false; S.facing = 0; S.step = 0; S.head = null;
    const m = model();
    if (!m) return;
    m.traverse((o) => { if (!S.host && o.userData && o.userData.avatar && typeof o.userData.avatar === 'object') S.host = o; });
    const base = defaultAvatar();
    if (S.host) {
      const a = S.host.userData.avatar;
      S.avatar = { ...base, ...a, arkit: { ...base.arkit, ...(a.arkit || {}) }, visemes: { ...base.visemes, ...(a.visemes || {}) }, emotions: { ...base.emotions, ...(a.emotions || {}) } };
    } else { S.avatar = base; S.host = m; }
    // Rig wiederherstellen
    const fr = S.avatar.faceRig;
    if (fr && fr.points && fr.ref) {
      let obj = null;
      m.traverse((o) => { if (!obj && o.name === fr.ref.name && (fr.ref.type === 'bone' ? o.isBone : o.isMesh)) obj = o; });
      if (obj) {
        S.ref = { type: fr.ref.type, obj, name: obj.name };
        for (const k in fr.points) S.points[k] = new THREE.Vector3().fromArray(fr.points[k]);
        S.facing = fr.facing || 0;
      }
    }
  }
  function serialize() {
    const a = S.avatar || defaultAvatar();
    const det = detectArkit(), vis = detectVisemes();
    a.arkit.names = det;
    a.arkit.count = Object.keys(det).length;
    a.visemes.names = vis;
    if (S.ref && Object.keys(S.points).length) {
      a.faceRig = { ref: { type: S.ref.type, name: S.ref.obj.name }, facing: S.facing, points: Object.fromEntries(Object.entries(S.points).map(([k, v]) => [k, v.toArray().map((x) => +x.toFixed(6))])), bones: faceBones().map((b) => b.name) };
    }
    a.morphTargets = targetNames();
    return JSON.parse(JSON.stringify(a));
  }
  function beforeExport() {
    if (!model()) return;
    stopSpeech();
    const hasFaceData = targetNames().length || (S.ref && Object.keys(S.points).length);
    if (!hasFaceData) return;
    (S.host || model()).userData.avatar = serialize();
  }

  // ---------------------------------------------------------------- Vertex-Caches (Weltkoordinaten)
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  function cache(m) {
    let c = S.caches.get(m);
    if (!c || c.geom !== m.geometry || c.n !== m.geometry.attributes.position.count) {
      c = { mesh: m, geom: m.geometry, n: m.geometry.attributes.position.count, world: null, base: null, dirty: true, inv: new Map(), box: new THREE.Box3() };
      S.caches.set(m, c);
    }
    if (c.dirty || !c.world) {
      c.world = computeWorld(m, true, c.world);
      c.box.makeEmpty();
      for (let i = 0; i < c.n; i++) c.box.expandByPoint(_v.fromArray(c.world, i * 3));
      c.dirty = false;
    }
    return c;
  }
  function baseWorld(c) { if (!c.base) c.base = computeWorld(c.mesh, false); return c.base; }
  function computeWorld(m, withMorph, out) {
    const n = m.geometry.attributes.position.count;
    const arr = out && out.length === n * 3 ? out : new Float32Array(n * 3);
    const infl = m.morphTargetInfluences;
    const saved = !withMorph && infl ? infl.slice() : null;
    if (saved) infl.fill(0);
    m.updateMatrixWorld(true);
    for (let i = 0; i < n; i++) { m.getVertexPosition(i, _v).applyMatrix4(m.matrixWorld); arr[i * 3] = _v.x; arr[i * 3 + 1] = _v.y; arr[i * 3 + 2] = _v.z; }
    if (saved) for (let i = 0; i < saved.length; i++) infl[i] = saved[i];
    return arr;
  }
  function invalidate(all) {
    for (const c of S.caches.values()) { c.dirty = true; c.inv = new Map(); c.prep = null; if (all) c.base = null; }
    if (all) { S.mirrorReady = false; S.head = null; S.faceSet = null; }
  }
  // inverse lineare Abbildung (Welt -> Mesh lokal vor dem Skinning) pro Vertex
  const _S = new THREE.Matrix4(), _A = new THREE.Matrix4();
  function prepSkin(c) {
    if (c.prep) return;
    const m = c.mesh;
    m.updateMatrixWorld(true);
    c.W3 = new THREE.Matrix3().setFromMatrix4(m.matrixWorld).invert();
    if (m.isSkinnedMesh && m.skeleton && m.geometry.attributes.skinIndex) {
      const sk = m.skeleton;
      c.bm = sk.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]).elements.slice());
      c.L = new THREE.Matrix4().multiplyMatrices(m.matrixWorld, m.bindMatrixInverse);
      c.R = m.bindMatrix.clone();
      c.skinned = true;
    } else c.skinned = false;
    c.inv = new Map();
    c.prep = true;
  }
  function invLin(c, i) {
    prepSkin(c);
    if (!c.skinned) return c.W3;
    let r = c.inv.get(i);
    if (r) return r;
    const si = c.geom.attributes.skinIndex, sw = c.geom.attributes.skinWeight;
    const e = _S.elements; e.fill(0);
    let tw = 0;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (!w) continue;
      const b = c.bm[si.getComponent(i, k)];
      if (!b) continue;
      tw += w;
      for (let j = 0; j < 16; j++) e[j] += w * b[j];
    }
    if (tw < 1e-6) return c.W3;
    _A.multiplyMatrices(c.L, _S).multiply(c.R);
    r = new THREE.Matrix3().setFromMatrix4(_A);
    if (Math.abs(r.determinant()) < 1e-12) return c.W3;
    r.invert();
    c.inv.set(i, r);
    return r;
  }
  function fwdLin(c, i) { return invLin(c, i).clone().invert(); }

  // gleiche Position = ein "Vertex" (UV-Nähte), Nachbarschaft für Glätten
  const weldCache = new WeakMap();
  function weld(g) {
    let w = weldCache.get(g);
    if (w) return w;
    const p = g.attributes.position, n = p.count;
    g.computeBoundingBox();
    const size = g.boundingBox.getSize(new THREE.Vector3()).length() || 1;
    const q = size * 1e-6;
    const map = new Map(), rep = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const key = `${Math.round(p.getX(i) / q)}_${Math.round(p.getY(i) / q)}_${Math.round(p.getZ(i) / q)}`;
      const r = map.get(key);
      if (r === undefined) { map.set(key, i); rep[i] = i; } else rep[i] = r;
    }
    const members = new Map();
    for (let i = 0; i < n; i++) { if (rep[i] !== i) { const r = rep[i]; if (!members.has(r)) members.set(r, [r]); members.get(r).push(i); } }
    w = { rep, members, adj: null };
    weldCache.set(g, w);
    return w;
  }
  function adjacency(g) {
    const w = weld(g);
    if (w.adj) return w.adj;
    const n = g.attributes.position.count;
    const sets = new Map();
    const idx = g.index ? g.index.array : null;
    const tri = idx ? idx.length / 3 : n / 3;
    const add = (a, b) => { if (a === b) return; let s = sets.get(a); if (!s) sets.set(a, s = new Set()); s.add(b); };
    for (let t = 0; t < tri; t++) {
      const a = w.rep[idx ? idx[t * 3] : t * 3], b = w.rep[idx ? idx[t * 3 + 1] : t * 3 + 1], c = w.rep[idx ? idx[t * 3 + 2] : t * 3 + 2];
      add(a, b); add(b, a); add(b, c); add(c, b); add(c, a); add(a, c);
    }
    w.adj = new Map([...sets].map(([k, s]) => [k, Int32Array.from(s)]));
    return w.adj;
  }
  // Normalen-Deltas für Morph i neu berechnen (wenn die Geometrie Normalen-Morphs hat)
  const baseNormalCache = new WeakMap();
  function vertexNormals(g, pos) {
    const n = g.attributes.position.count, w = weld(g);
    const acc = new Float32Array(n * 3);
    const idx = g.index ? g.index.array : null;
    const tri = idx ? idx.length / 3 : n / 3;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    for (let t = 0; t < tri; t++) {
      const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
      a.fromArray(pos, i0 * 3); b.fromArray(pos, i1 * 3); c.fromArray(pos, i2 * 3);
      e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
      for (const i of [i0, i1, i2]) { const r = w.rep[i] * 3; acc[r] += e1.x; acc[r + 1] += e1.y; acc[r + 2] += e1.z; }
    }
    for (let i = 0; i < n; i++) {
      const r = w.rep[i] * 3;
      const x = acc[r], y = acc[r + 1], z = acc[r + 2], l = Math.hypot(x, y, z) || 1;
      acc[i * 3] = x / l; acc[i * 3 + 1] = y / l; acc[i * 3 + 2] = z / l;
    }
    return acc;
  }
  function updateNormals(g, i) {
    const nm = g.morphAttributes.normal;
    if (!nm || !nm[i] || !g.attributes.normal) return;
    const base = g.attributes.position.array, d = g.morphAttributes.position[i].array;
    let n0 = baseNormalCache.get(g);
    if (!n0) { n0 = vertexNormals(g, base); baseNormalCache.set(g, n0); }
    let any = false;
    for (let k = 0; k < d.length; k++) if (d[k] !== 0) { any = true; break; }
    const out = nm[i].array;
    if (!any) { out.fill(0); return; }
    const moved = new Float32Array(base.length);
    for (let k = 0; k < base.length; k++) moved[k] = base[k] + d[k];
    const n1 = vertexNormals(g, moved);
    for (let k = 0; k < out.length; k++) out[k] = n1[k] - n0[k];
  }

  // Strahl gegen die (verformten) Gesichts-Meshes
  function raycast(ray, meshes) {
    let best = null;
    const o = ray.origin, d = ray.direction;
    const ox = o.x, oy = o.y, oz = o.z, dx = d.x, dy = d.y, dz = d.z;
    for (const m of meshes) {
      const c = cache(m);
      if (!ray.intersectsBox(c.box)) continue;
      const P = c.world, idx = c.geom.index ? c.geom.index.array : null;
      const tri = idx ? idx.length / 3 : c.n / 3;
      for (let t = 0; t < tri; t++) {
        const a = (idx ? idx[t * 3] : t * 3) * 3, b = (idx ? idx[t * 3 + 1] : t * 3 + 1) * 3, cc = (idx ? idx[t * 3 + 2] : t * 3 + 2) * 3;
        const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
        const e2x = P[cc] - P[a], e2y = P[cc + 1] - P[a + 1], e2z = P[cc + 2] - P[a + 2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-14) continue;
        const inv = 1 / det;
        const tx = ox - P[a], ty = oy - P[a + 1], tz = oz - P[a + 2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const dist = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (dist <= 1e-9 || (best && dist >= best.dist)) continue;
        const nrm = new THREE.Vector3(e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x).normalize();
        if (nrm.dot(d) > 0) nrm.negate();
        best = { dist, mesh: m, c, normal: nrm };
      }
    }
    if (best) best.point = ray.at(best.dist, new THREE.Vector3());
    return best;
  }
  const raycaster = new THREE.Raycaster();
  function pointerRay(e) {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray;
  }

  // ---------------------------------------------------------------- Kopf / Rahmen
  function findHeadBone() {
    const bones = [];
    model()?.traverse((o) => { if (o.isBone) bones.push(o); });
    const depth = (b) => { let d = 0; for (let o = b; o; o = o.parent) d++; return d; };
    const cand = bones.filter((b) => {
      const n = b.name.replace(/mixamorig\d*[:_]?/i, '');
      return /(^|[^a-z])(head|kopf)($|[^a-z])/i.test(n) && !/top|end|nub|tip|_end/i.test(n) && !b.userData.viewerAdded;
    });
    return cand.sort((a, b) => depth(a) - depth(b))[0] || null;
  }
  // Basisrahmen aus den Modellachsen (für Vorlage und Spiegelung vor dem Platzieren)
  function baseAxes() {
    const m = model();
    m.updateMatrixWorld(true);
    const e = m.matrixWorld.elements;
    const X = new THREE.Vector3(e[0], e[1], e[2]).normalize();
    const Y = new THREE.Vector3(e[4], e[5], e[6]).normalize();
    const Z = new THREE.Vector3(e[8], e[9], e[10]).normalize();
    // VRM 0.x: Wurzel wurde beim Laden um 180° gedreht (Figur schaut entlang −Z der Wurzel)
    if (m.userData.vrm && m.userData.vrm.version === '0.x') { X.negate(); Z.negate(); }
    for (let k = 0; k < (S.facing % 4 + 4) % 4; k++) { const nx = Z.clone(), nz = X.clone().negate(); X.copy(nx); Z.copy(nz); }
    return { X, Y, Z };
  }
  function headInfo() { return S.head || (S.head = headInfoRaw()); }
  function headInfoRaw() {
    const hb = findHeadBone();
    const { X, Y, Z } = baseAxes();
    const pts = [];
    for (const m of visibleMeshes()) {
      const c = cache(m), B = baseWorld(c);
      let keep = null;
      if (hb && m.isSkinnedMesh && m.skeleton && m.geometry.attributes.skinIndex) {
        const set = new Set();
        m.skeleton.bones.forEach((b, i) => { for (let o = b; o; o = o.parent) if (o === hb) { set.add(i); break; } });
        if (set.size) {
          const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
          keep = (i) => { let w = 0; for (let k = 0; k < 4; k++) if (set.has(si.getComponent(i, k))) w += sw.getComponent(i, k); return w > 0.5; };
        }
      } else if (hb && !m.isSkinnedMesh) {
        let under = false; for (let o = m; o; o = o.parent) if (o === hb) under = true;
        if (!under) continue;
      }
      const step = Math.max(1, Math.floor(c.n / 30000));
      for (let i = 0; i < c.n; i += step) if (!keep || keep(i)) pts.push(B[i * 3], B[i * 3 + 1], B[i * 3 + 2]);
    }
    if (!pts.length) for (const m of visibleMeshes()) { const B = baseWorld(cache(m)); for (let i = 0; i < B.length; i += 3) pts.push(B[i], B[i + 1], B[i + 2]); }
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pts.length; i += 3) {
      _v.set(pts[i], pts[i + 1], pts[i + 2]);
      const a = [_v.dot(X), _v.dot(Y), _v.dot(Z)];
      for (let k = 0; k < 3; k++) { if (a[k] < mn[k]) mn[k] = a[k]; if (a[k] > mx[k]) mx[k] = a[k]; }
    }
    const W = mx[0] - mn[0] || 1;
    const toWorld = (x, y, z) => X.clone().multiplyScalar(x).addScaledVector(Y, y).addScaledVector(Z, z);
    const center = toWorld((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2);
    return { hb, X, Y, Z, mn, mx, W, toWorld, center, size: Math.max(W, mx[1] - mn[1], mx[2] - mn[2]) };
  }
  function ensureRef() {
    if (S.ref) return S.ref;
    const hb = findHeadBone();
    if (hb) S.ref = { type: 'bone', obj: hb, name: hb.name };
    else {
      const ms = visibleMeshes().sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count);
      if (!ms.length) return null;
      S.ref = { type: 'mesh', obj: ms[0], name: ms[0].name };
    }
    return S.ref;
  }
  function pointWorld(id) {
    const p = S.points[id];
    if (!p || !S.ref) return null;
    S.ref.obj.updateMatrixWorld(true);
    return S.ref.obj.localToWorld(p.clone());
  }
  function setPointWorld(id, w) {
    ensureRef();
    S.ref.obj.updateMatrixWorld(true);
    S.points[id] = S.ref.obj.worldToLocal(w.clone());
  }
  function rigComplete() { return REQUIRED.every((id) => S.points[id]); }
  // Gesichtsrahmen aus den Landmarken: X = links der Figur, Y = oben, Z = vorne; Einheit = Augenabstand
  function faceFrame() {
    if (!rigComplete()) return null;
    const P = {};
    for (const l of LM_ALL) { const w = pointWorld(l.id); if (w) P[l.id] = w; }
    // Querachse robust: Mittel aller L/R-Paare; nahe der Kopf-Querachse -> diese (saubere Symmetrie)
    const X = new THREE.Vector3();
    for (const [l, r] of [['eyeL', 'eyeR'], ['lidUpL', 'lidUpR'], ['lidLoL', 'lidLoR'], ['browInL', 'browInR'], ['browOutL', 'browOutR'], ['mouthL', 'mouthR'], ['jawL', 'jawR']]) {
      if (!P[l] || !P[r]) continue;
      const d = P[l].clone().sub(P[r]); const len = d.length();
      if (len > 1e-9) X.addScaledVector(d, 1 / len);
    }
    if (X.lengthSq() < 1e-12) return null;
    X.normalize();
    try { const hx = headInfo()?.X; if (hx && X.angleTo(hx) < 0.2) X.copy(hx).normalize(); } catch (e) { /* ohne Kopf-Info */ }
    const s = Math.abs(P.eyeL.clone().sub(P.eyeR).dot(X));
    if (s < 1e-9) return null;
    const eyesC = P.eyeL.clone().add(P.eyeR).multiplyScalar(0.5);
    const mouthC = P.mouthL.clone().add(P.mouthR).multiplyScalar(0.5);
    const Y = eyesC.clone().sub(mouthC);
    Y.addScaledVector(X, -Y.dot(X)).normalize();
    const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
    const O = eyesC;
    const toF = (w) => { _w.copy(w).sub(O); return [_w.dot(X) / s, _w.dot(Y) / s, _w.dot(Z) / s]; };
    const L = {};
    for (const k in P) L[k] = toF(P[k]);
    const F = { X, Y, Z, O, s, P, L, toF };
    F.toW = (d) => new THREE.Vector3().addScaledVector(X, d[0] * s).addScaledVector(Y, d[1] * s).addScaledVector(Z, d[2] * s);
    // abgeleitete Größen
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    F.mc = mid(L.mouthL, L.mouthR);
    F.ySplit = (L.lipUp[1] + L.lipLo[1]) / 2;
    F.mouthHalfW = Math.max(0.15, Math.abs(L.mouthL[0] - L.mouthR[0]) / 2);
    F.J = L.jawL && L.jawR ? mid(L.jawL, L.jawR) : [0, F.mc[1] + 0.5, F.mc[2] - 1.35];
    F.jawHalfW = L.jawL && L.jawR ? Math.max(0.6, Math.abs(L.jawL[0] - L.jawR[0]) / 2) : 1.1;
    F.pivot = { L: [L.eyeL[0], L.eyeL[1], L.eyeL[2] - 0.2], R: [L.eyeR[0], L.eyeR[1], L.eyeR[2] - 0.2] };
    return F;
  }
  function faceSize() {
    const F = faceFrame();
    if (F) return F.s * 3;
    return headInfo().size;
  }
  function mirrorPlane() {
    const F = faceFrame();
    if (F) return { O: F.O.clone(), N: F.X.clone() };
    const h = headInfo();
    return { O: h.center, N: h.X.clone() };
  }
  const reflectP = (p, pl) => p.clone().addScaledVector(pl.N, -2 * p.clone().sub(pl.O).dot(pl.N));
  const reflectD = (d, pl) => d.clone().addScaledVector(pl.N, -2 * d.dot(pl.N));

  // ---------------------------------------------------------------- Gesichts-Meshes und Rollen
  function faceSet() {
    if (S.faceSet) return S.faceSet;
    const F = faceFrame();
    const ms = visibleMeshes();
    if (!F) return (S.faceSet = ms);
    const r2 = (2.8 * F.s) ** 2;
    S.faceSet = ms.filter((m) => {
      const c = cache(m), B = baseWorld(c);
      for (let i = 0; i < c.n; i++) {
        const dx = B[i * 3] - F.O.x, dy = B[i * 3 + 1] - F.O.y, dz = B[i * 3 + 2] - F.O.z;
        if (dx * dx + dy * dy + dz * dz < r2) return true;
      }
      return false;
    });
    return S.faceSet;
  }
  function namesOf(m) { let s = ''; for (let o = m; o && o !== model()?.parent; o = o.parent) s += ' ' + (o.name || ''); return s + ' ' + (Array.isArray(m.material) ? '' : m.material?.name || ''); }
  function classify(F) {
    const roles = new Map();
    const set = faceSet();
    let main = null, best = -1;
    const stats = new Map();
    for (const m of set) {
      const c = cache(m), B = baseWorld(c);
      let near = 0;
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < c.n; i++) {
        const q = F.toF(_v.fromArray(B, i * 3));
        if (Math.hypot(q[0], q[1] + 0.8, q[2]) < 1.6) near++;
        for (let k = 0; k < 3; k++) { if (q[k] < mn[k]) mn[k] = q[k]; if (q[k] > mx[k]) mx[k] = q[k]; }
      }
      stats.set(m, { near, mn, mx });
      if (near > best) { best = near; main = m; }
    }
    for (const m of set) {
      const nm = namesOf(m);
      const st = stats.get(m);
      const cen = [(st.mn[0] + st.mx[0]) / 2, (st.mn[1] + st.mx[1]) / 2, (st.mn[2] + st.mx[2]) / 2];
      const size = Math.max(st.mx[0] - st.mn[0], st.mx[1] - st.mn[1], st.mx[2] - st.mn[2]);
      const nearEye = ['L', 'R'].some((s) => Math.hypot(cen[0] - F.pivot[s][0], cen[1] - F.pivot[s][1], cen[2] - F.pivot[s][2]) < 0.3) && size < 0.8;
      const nearMouth = Math.abs(cen[0] - F.mc[0]) < F.mouthHalfW * 1.4 && Math.abs(cen[1] - F.ySplit) < 0.45 && cen[2] < F.mc[2] + 0.05 && cen[2] > F.mc[2] - 1.1 && size < 1.5;
      let role = 'other';
      if (m === main) role = 'main';
      else if (/tongue|zunge/i.test(nm)) role = 'tongue';
      else if (/teeth|tooth|zahn|z[äa]hne|gum/i.test(nm)) role = 'mouth';
      else if (/(eye(?!lash|brow|lid)|auge|cornea|iris|pupil)/i.test(nm) && !/lash|brow|wimper|braue|lid/i.test(nm)) role = 'eye';
      else if (nearEye) role = 'eye';
      else if (nearMouth) role = 'mouth';
      roles.set(m, role);
    }
    return roles;
  }

  // ---------------------------------------------------------------- Ruhepose (Bindungspose) für die Bearbeitung
  let savedPose = null;
  function applyBindPose() {
    const m = model();
    if (!m) return;
    const done = new Set();
    savedPose = [];
    m.traverse((o) => { if (o.isBone) savedPose.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
    m.updateMatrixWorld(true);
    const depth = (b) => { let d = 0; for (let o = b; o; o = o.parent) d++; return d; };
    const jobs = [];
    for (const mesh of allMeshes()) {
      if (!mesh.isSkinnedMesh || !mesh.skeleton) continue;
      mesh.skeleton.bones.forEach((b, i) => { if (b && !done.has(b)) { done.add(b); jobs.push([b, mesh, i]); } });
    }
    jobs.sort((a, b) => depth(a[0]) - depth(b[0]));
    const W = new THREE.Matrix4(), P = new THREE.Matrix4();
    for (const [b, mesh, i] of jobs) {
      mesh.updateMatrixWorld(true);
      // Ruhe: bindMatrixInverse · W · boneInverse · bindMatrix = I  ->  W = inv(bindMatrixInverse) · inv(bindMatrix) · inv(boneInverse)
      W.copy(mesh.bindMatrixInverse).invert().multiply(new THREE.Matrix4().copy(mesh.bindMatrix).invert()).multiply(new THREE.Matrix4().copy(mesh.skeleton.boneInverses[i]).invert());
      b.parent.updateMatrixWorld(true);
      P.copy(b.parent.matrixWorld).invert().multiply(W);
      P.decompose(b.position, b.quaternion, b.scale);
      b.updateMatrixWorld(true);
    }
    m.updateMatrixWorld(true);
  }
  function restorePose() {
    if (!savedPose) return;
    for (const [b, p, q, s] of savedPose) if (b.parent) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(s); }
    savedPose = null;
    model()?.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- Landmarken platzieren
  // Profil der Gesichtsmitte (Strahlen von vorne) -> Nasenspitze, Nasenwurzel, Mund, Kinn
  function analyseProfile(h, ms) {
    const { mn, mx } = h;
    const cx = (mn[0] + mx[0]) / 2, front = mx[2];
    // Bereich auf den Kopf begrenzen (lange Haare/Zöpfe hängen am Kopf-Knochen und vergrößern die Box nach unten)
    let bottom = mn[1];
    if (h.hb) { const hy = h.hb.getWorldPosition(new THREE.Vector3()).dot(h.Y); if (hy < mx[1] && hy > mn[1]) bottom = Math.max(mn[1], hy - 0.6 * (mx[1] - hy)); }
    const H = mx[1] - bottom;
    const N = 140, ys = [], zs = [];
    const ray = new THREE.Ray();
    for (let k = 0; k < N; k++) {
      const y = mx[1] - (k + 0.5) / N * H;
      ray.origin.copy(h.toWorld(cx, y, front + H)); ray.direction.copy(h.Z).negate();
      const hit = raycast(ray, ms);
      ys.push(y); zs.push(hit ? hit.point.dot(h.Z) : NaN);
    }
    S.lastProfile = { ys, zs };
    const ok = zs.filter((z) => !isNaN(z)).length;
    if (ok < N * 0.3) return null;
    // Nasenspitze: vorderster Punkt im mittleren Bereich
    let ni = -1;
    for (let k = Math.floor(N * 0.12); k < Math.floor(N * 0.88); k++) if (!isNaN(zs[k]) && (ni < 0 || zs[k] > zs[ni])) ni = k;
    if (ni < 0) return null;
    // Extrema mit Hysterese entlang des Profils (ab der Nasenspitze nach oben bzw. unten)
    const eps = 0.003 * H;
    const walk = (dirK) => {
      const out = [];
      let lookMin = true, ext = zs[ni], ei = ni;
      for (let k = ni + dirK; k >= 0 && k < N; k += dirK) {
        const z = zs[k];
        if (isNaN(z)) break;
        if (lookMin) { if (z < ext) { ext = z; ei = k; } else if (z > ext + eps) { out.push(ei); lookMin = false; ext = z; ei = k; } }
        else { if (z > ext) { ext = z; ei = k; } else if (z < ext - eps) { out.push(ei); lookMin = true; ext = z; ei = k; } }
        if (out.length >= 6) break;
      }
      return out;
    };
    const upE = walk(-1), dnE = walk(1);
    const yN = ys[ni];
    // Kinn über den Abbruch zum Hals (großer Sprung nach hinten oder kein Treffer)
    let kc = -1;
    for (let k = ni + 2; k < N; k++) {
      if (isNaN(zs[k]) || zs[k] < zs[k - 2] - 0.06 * H) { kc = k - 1; break; }
    }
    const yChinDrop = kc > 0 ? ys[kc] : NaN;
    const nas = upE.length ? upE[0] : -1;
    let yNas = nas >= 0 ? ys[nas] : NaN;
    let ySplit, yUL, yLL, yChin;
    if (dnE.length >= 6) { yUL = ys[dnE[1]]; ySplit = ys[dnE[2]]; yLL = ys[dnE[3]]; yChin = ys[dnE[5]]; }
    // Plausibilität: Proportionen (Drittel-Regel) statt winziger Mesh-Wellen
    const dRef = !isNaN(yChinDrop) ? yN - yChinDrop : NaN;
    const dRefOk = !isNaN(dRef) && dRef > 0.08 * H && dRef < 0.45 * H;
    const okWalk = dnE.length >= 6 && yN - yChin > 0.08 * H && yN - yChin < 0.5 * H && (!dRefOk || Math.abs((yN - yChin) - dRef) < 0.35 * dRef) && (yUL - yLL) > 0.015 * H;
    let ok4 = false;
    if (!okWalk && dnE.length >= 4) {
      const sp = ys[dnE[2]], dn = yN - sp, lipH = ys[dnE[1]] - ys[dnE[3]];
      const dEst = dRefOk ? dRef : (isNaN(yNas) ? 0.25 * H : (yNas - yN) * 1.8);
      if (dn > 0.3 * dEst && dn < 0.75 * dEst && lipH > 0.015 * H) {
        ok4 = true; yUL = ys[dnE[1]]; ySplit = sp; yLL = ys[dnE[3]];
        yChin = dnE.length >= 6 ? ys[dnE[5]] : (dRefOk ? yChinDrop : sp - 0.9 * dn);
      }
    }
    if (!okWalk && !ok4) {
      const d = dRefOk ? dRef : (isNaN(yNas) ? 0.25 * H : (yNas - yN) * 1.8);
      yChin = yN - d; ySplit = yN - 0.5 * d; yUL = ySplit + 0.12 * d; yLL = ySplit - 0.1 * d;
    }
    const dd = yN - yChin;
    if (isNaN(yNas) || yNas - yN < 0.3 * dd || yNas - yN > 0.9 * dd) yNas = yN + 0.56 * dd;
    S.lastProfileResult = { ni, yN, yNas, yChin, yChinDrop, okWalk, ok4, dnE: dnE.map((k) => ys[k]) };
    // Augenabstand: aus Gesichtshöhe und Breite des vorderen Kopfes auf Augenhöhe
    const dnc = yNas - yChin;
    let wmin = Infinity, wmax = -Infinity;
    for (const m of ms) {
      const B = baseWorld(cache(m));
      for (let i = 0; i < B.length; i += 3) {
        _v.set(B[i], B[i + 1], B[i + 2]);
        const y = _v.dot(h.Y), z = _v.dot(h.Z);
        if (Math.abs(y - yNas) < 0.04 * dnc && z > zs[ni] - 0.8 * dnc) { const x = _v.dot(h.X) - cx; if (x < wmin) wmin = x; if (x > wmax) wmax = x; }
      }
    }
    const fw = wmax > wmin ? wmax - wmin : 0;
    const ipd = fw > 0 ? (0.6 * dnc + 0.3 * fw) / 2 : 0.6 * dnc;
    return { cx, yN, zN: zs[ni], yEye: yNas - 0.22 * (yNas - yN), ipd, ySplit, yUL, yLL, yChin };
  }
  function autoPlace(silent) {
    if (!ensureRef()) return;
    const h = headInfo();
    const { mn, mx, W } = h;
    const ms = visibleMeshes();
    const before = snapshotPoints();
    const ray = new THREE.Ray();
    const pr = analyseProfile(h, ms);
    let T, cx, frontZ, jawY, jawZ, jawX;
    if (pr) {
      const u = pr.ipd, e = pr.yEye, sp = pr.ySplit;
      cx = pr.cx; frontZ = pr.zN + u;
      T = { eyeL: [0.5 * u, e], lidUpL: [0.5 * u, e + 0.09 * u], lidLoL: [0.5 * u, e - 0.085 * u], browInL: [0.2 * u, e + 0.32 * u], browOutL: [0.75 * u, e + 0.3 * u],
        mouthL: [0.4 * u, sp + 0.01 * u], lipUp: [0, (sp + pr.yUL) / 2], lipLo: [0, (sp + pr.yLL) / 2], chin: [0, pr.yChin] };
      jawY = e - 0.5 * u; jawZ = pr.zN - 1.75 * u; jawX = 2 * u;
    } else {
      cx = (mn[0] + mx[0]) / 2; frontZ = mx[2] + W;
      const top = mx[1];
      const r = { eyeL: [0.2, -0.72], lidUpL: [0.2, -0.665], lidLoL: [0.2, -0.775], browInL: [0.09, -0.6], browOutL: [0.32, -0.61], mouthL: [0.16, -1.22], lipUp: [0, -1.17], lipLo: [0, -1.27], chin: [0, -1.46] };
      T = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, [v[0] * W, top + v[1] * W]]));
      jawY = top - 0.8 * W; jawZ = mx[2] - 0.72 * W; jawX = W;
    }
    const place = (id, x, y) => {
      ray.origin.copy(h.toWorld(cx + x, y, frontZ));
      ray.direction.copy(h.Z).negate();
      const hit = raycast(ray, ms);
      setPointWorld(id, hit ? hit.point : h.toWorld(cx + x, y, frontZ - W * 0.5));
    };
    // Hinweise aus dem Modell (z. B. VRM-Ausdrücke: Blinzeln -> Lider/Augen, aa -> Mund) haben Vorrang
    let hint = null;
    try { hint = ctx.landmarkHints?.() || null; } catch (e) { hint = null; }
    const hx = (p) => p.dot(h.X), hy = (p) => p.dot(h.Y);
    if (hint && hint.eyeL && hint.eyeR) {
      cx = (hx(hint.eyeL) + hx(hint.eyeR)) / 2;
      const u = Math.abs(hx(hint.eyeL) - hx(hint.eyeR));
      const e = (hy(hint.eyeL) + hy(hint.eyeR)) / 2, lu = (hy(hint.lidUpL) + hy(hint.lidUpR)) / 2;
      T.browInL = [0.22 * u, lu + 0.22 * u]; T.browOutL = [0.72 * u, lu + 0.19 * u];
      if (!hint.mouthL) { T.mouthL = [0.35 * u, e - 1.1 * u]; T.lipUp = [0, e - 1.05 * u]; T.lipLo = [0, e - 1.15 * u]; T.chin = [0, e - 1.75 * u]; }
      for (const k of ['eyeL', 'lidUpL', 'lidLoL']) delete T[k];
      jawY = e - 0.6 * u; jawX = 2 * u;
    }
    if (hint && hint.mouthL && hint.mouthR) {
      const my = hint.mouthY, mw = Math.abs(hx(hint.mouthL) - hx(hint.mouthR));
      const u = hint.eyeL ? Math.abs(hx(hint.eyeL) - hx(hint.eyeR)) : mw * 1.4;
      if (!hint.eyeL) cx = (hx(hint.mouthL) + hx(hint.mouthR)) / 2;
      T.lipUp = [0, my + 0.05 * u];
      T.lipLo = [0, Math.min(my - 0.05 * u, hint.lipLo ? hy(hint.lipLo) : my - 0.08 * u)];
      T.chin = [0, my - 0.42 * u];
      delete T.mouthL;
    }
    const hintMs = hint && hint.meshes && hint.meshes.length ? hint.meshes : null;
    const placeH = (id, x, y) => {
      // Treffer bevorzugt auf dem Gesichts-Mesh (Pony/Haare verdecken sonst Brauen und Lippen)
      ray.origin.copy(h.toWorld(cx + x, y, frontZ)); ray.direction.copy(h.Z).negate();
      const hit = (hintMs && raycast(ray, hintMs)) || raycast(ray, ms);
      setPointWorld(id, hit ? hit.point : h.toWorld(cx + x, y, frontZ - W * 0.5));
    };
    const P = hint ? placeH : place;
    for (const id in T) {
      P(id, T[id][0], T[id][1]);
      const l = LM_BY[id];
      if (l.pair) P(l.pair, -T[id][0], T[id][1]);
    }
    if (hint) for (const id of ['eyeL', 'eyeR', 'lidUpL', 'lidUpR', 'lidLoL', 'lidLoR', 'mouthL', 'mouthR']) if (hint[id] && !(id.startsWith('mouth') && !hint.mouthR)) setPointWorld(id, hint[id]);
    for (const [id, sgn] of [['jawL', 1], ['jawR', -1]]) {
      ray.origin.copy(h.toWorld(cx + sgn * jawX * 1.5, jawY, jawZ));
      ray.direction.copy(h.X).multiplyScalar(-sgn);
      const hit = raycast(ray, ms);
      setPointWorld(id, hit ? hit.point : h.toWorld(cx + sgn * jawX * 0.45, jawY, jawZ));
    }
    delete S.points.tongue;
    rigChanged();
    pushUndo('Auto-Platzierung', () => { restorePoints(before); rigChanged(); });
    if (!silent) showToast(pr ? 'Punkte automatisch gesetzt – bitte Schritt für Schritt prüfen.' : 'Grob geschätzt – bitte alle Punkte prüfen und verschieben.');
    return !!pr;
  }
  function snapshotPoints() { return Object.fromEntries(Object.entries(S.points).map(([k, v]) => [k, v.clone()])); }
  function restorePoints(s) { S.points = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.clone()])); }
  function rigChanged() {
    S.faceSet = null; S.mirrorReady = false;
    updateMarkers(true);
    updateRigUI();
  }
  // Punkt setzen (+ gespiegelten Partner)
  function placePoint(id, world, normal) {
    setPointWorld(id, world);
    const l = LM_BY[id];
    if (S.mirror && l.pair) {
      const h = headInfo();
      const pl = { O: h.center, N: h.X };
      const r = reflectP(world, pl);
      const n = normal ? reflectD(normal, pl) : h.Z.clone();
      const size = h.size;
      const ray = new THREE.Ray(r.clone().addScaledVector(n, size * 0.3), n.clone().negate());
      const hit = raycast(ray, faceSet().length ? visibleMeshes() : []);
      setPointWorld(l.pair, hit && hit.point.distanceTo(r) < size * 0.3 ? hit.point : r);
    }
  }
  function steps() { return S.mirror ? LM : LM_ALL; }
  function currentStep() { const st = steps(); S.step = clamp(S.step, 0, st.length - 1); return LM_BY[st[S.step].id] || st[S.step]; }

  // Marker
  const markerGroup = new THREE.Group();
  markerGroup.renderOrder = 999;
  scene.add(markerGroup);
  const mGeo = new THREE.SphereGeometry(1, 14, 10);
  const mMat = {
    L: new THREE.MeshBasicMaterial({ color: 0x4f8cff, depthTest: false, transparent: true, opacity: 0.95 }),
    R: new THREE.MeshBasicMaterial({ color: 0xc061ff, depthTest: false, transparent: true, opacity: 0.95 }),
    C: new THREE.MeshBasicMaterial({ color: 0x2bd4c4, depthTest: false, transparent: true, opacity: 0.95 }),
    cur: new THREE.MeshBasicMaterial({ color: 0xffb020, depthTest: false, transparent: true, opacity: 1 }),
  };
  const markers = new Map();
  let markerSize = 0.01;
  function updateMarkers(rebuild) {
    if (rebuild) {
      for (const mk of markers.values()) markerGroup.remove(mk);
      markers.clear();
      const F = faceFrame();
      markerSize = F ? F.s * 0.055 : (model() ? headInfo().size * 0.012 : 0.01);
      for (const id in S.points) {
        const mk = new THREE.Mesh(mGeo, mMat.C);
        mk.renderOrder = 999;
        mk.userData.id = id;
        markers.set(id, mk);
        markerGroup.add(mk);
      }
    }
    const cur = S.active && S.tab === 'rig' ? currentStep().id : null;
    for (const [id, mk] of markers) {
      const w = pointWorld(id);
      if (!w) { mk.visible = false; continue; }
      mk.position.copy(w);
      const side = LM_BY[id]?.sideName;
      mk.material = id === cur ? mMat.cur : side === 'L' ? mMat.L : side === 'R' ? mMat.R : mMat.C;
      mk.scale.setScalar(markerSize * (id === cur ? 1.5 : 1));
      mk.visible = true;
    }
    markerGroup.visible = S.active && S.tab === 'rig';
  }

  // Kamera auf das Gesicht
  function frameFace(view = 'front') {
    let center, size, fwd, up, side;
    const F = faceFrame();
    if (F) {
      center = F.toW([0, -0.8, 0]).add(F.O); size = F.s * 4.2; fwd = F.Z; up = F.Y; side = F.X;
    } else {
      const h = headInfo();
      center = h.toWorld((h.mn[0] + h.mx[0]) / 2, h.mx[1] - h.W * 0.95, h.mx[2]); size = h.W * 1.7; fwd = h.Z; up = h.Y; side = h.X;
    }
    const dir = view === 'side' ? side.clone().multiplyScalar(0.92).addScaledVector(fwd, 0.4).normalize() : fwd.clone().addScaledVector(side, 0.08).normalize();
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const dist = (size / 2) / Math.tan(fov / 2) * 1.25;
    const lift = (size / 2) * 0.42; // Panel unten: Gesicht nach oben schieben
    controls.target.copy(center).addScaledVector(up, -lift);
    camera.position.copy(center).addScaledVector(dir, dist).addScaledVector(up, -lift);
    camera.near = Math.max(dist / 200, 1e-4); camera.far = dist * 200;
    camera.updateProjectionMatrix();
    controls.update();
    S.view = view;
  }

  // ---------------------------------------------------------------- Regionen (Gesichtseinheiten)
  function regions(F) {
    const L = F.L, J = F.J, mc = F.mc, yS = F.ySplit, hw = F.mouthHalfW;
    const lipC = [mc[0], yS, mc[2] - 0.05];
    const G = { F, L, J };
    G.lipMask = (q) => ell(q, lipC, hw + 0.18, 0.32, 0.42);
    G.upper = (q) => ss(yS - 0.02, yS + 0.03, q[1]);
    G.lower = (q) => 1 - G.upper(q);
    G.sideW = (q, s) => (s > 0 ? ss(-0.05, 0.12, q[0] - mc[0]) : ss(0.05, -0.12, q[0] - mc[0]));
    G.wJaw = (q, role) => {
      if (role === 'eye') return 0;
      const zM = mc[2];
      const t = clamp((zM - q[2]) / Math.max(0.3, zM - J[2]), 0, 1);
      const ys = yS + (J[1] - yS) * t;
      const width = role === 'mouth' || role === 'tongue' ? 0.03 : 0.1 + 0.35 * t;
      let w = ss(ys + width / 2, ys - width / 2, q[1]);
      w *= ss(J[2] - 0.15, J[2] + 0.2, q[2]);
      w *= ss(L.chin[1] - 0.75, L.chin[1] - 0.2, q[1]);
      w *= fall(Math.max(0, Math.abs(q[0] - mc[0]) - F.jawHalfW) / 0.3);
      return w;
    };
    G.jawRot = (q, a) => {
      const ry = q[1] - J[1], rz = q[2] - J[2], c = Math.cos(a), s = Math.sin(a);
      return [0, ry * c - rz * s - ry, ry * s + rz * c - rz];
    };
    G.jawOpen = (q, role) => { const w = G.wJaw(q, role); return w > 1e-4 ? G.jawRot(q, 0.3 * w) : null; };
    G.eye = {};
    for (const s of ['L', 'R']) {
      const P = F.pivot[s], U = L['lidUp' + s], D = L['lidLo' + s];
      const phi = (q) => Math.atan2(q[1] - P[1], q[2] - P[2]);
      const pU = phi(U), pL = phi(D), ap = Math.max(0.08, pU - pL);
      const e = { P, pU, pL, ap, phi, sign: s === 'L' ? 1 : -1 };
      e.wx = (q) => fall(Math.max(0, Math.abs(q[0] - P[0]) - 0.12) / 0.25);
      e.r = (q) => Math.hypot(q[1] - P[1], q[2] - P[2]);
      e.wr = (q) => fall(Math.max(0, e.r(q) - 0.3) / 0.3);
      e.front = (q) => ss(P[2] - 0.3, P[2] + 0.05, q[2]);
      e.rotTo = (q, pn) => { const r = e.r(q); return [0, P[1] + r * Math.sin(pn) - q[1], P[2] + r * Math.cos(pn) - q[2]]; };
      e.reg = (q) => e.wx(q) * e.wr(q) * e.front(q);
      e.wUp = (q, p) => fall(Math.max(0, p - pU - 0.04) / 0.6);
      e.wLo = (q, p) => fall(Math.max(0, pL - p - 0.04) / 0.5);
      G.eye[s] = e;
    }
    G.brow = (q, s) => {
      const A = L['browIn' + s], B = L['browOut' + s];
      const ax = B[0] - A[0], ay = B[1] - A[1], l2 = ax * ax + ay * ay || 1;
      const t = clamp(((q[0] - A[0]) * ax + (q[1] - A[1]) * ay) / l2, 0, 1);
      const px = A[0] + ax * t, py = A[1] + ay * t, pz = A[2] + (B[2] - A[2]) * t;
      const d = Math.hypot(q[0] - px, (q[1] - py) * (q[1] > py ? 0.8 : 1.3));
      return { m: fall(d / 0.28) * fall(Math.abs(q[2] - pz) / 0.45), t };
    };
    return G;
  }
  const add3 = (a, b, k = 1) => (b ? [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k] : a);
  const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

  // ARKit-Generatoren: (q, role, G) -> Verschiebung in Gesichtseinheiten
  const MAIN = (r) => r === 'main';
  const SKIN = (r) => r === 'main' || r === 'other';
  function makeGenerators(G) {
    const { F, L } = G;
    const gen = {};
    const sides = [['Left', 1, 'L'], ['Right', -1, 'R']];
    gen.jawOpen = (q, r) => G.jawOpen(q, r);
    gen.jawForward = (q, r) => { const w = G.wJaw(q, r); return w > 1e-4 ? [0, 0, 0.12 * w] : null; };
    gen.jawLeft = (q, r) => { const w = G.wJaw(q, r); return w > 1e-4 ? [0.12 * w, 0, 0] : null; };
    gen.jawRight = (q, r) => { const w = G.wJaw(q, r); return w > 1e-4 ? [-0.12 * w, 0, 0] : null; };
    gen.mouthClose = (q, r) => {
      if (!MAIN(r)) return null;
      const m = G.lipMask(q);
      if (m < 1e-4) return null;
      const jo = G.jawOpen(q, r) || [0, 0, 0];
      const lo = G.lower(q), up = G.upper(q);
      const openAmt = Math.abs((G.jawOpen(L.lipLo, 'main') || [0, 0, 0])[1]);
      return [-jo[0] * 0.75 * m * lo, -jo[1] * 0.75 * m * lo - 0.25 * openAmt * m * up, -jo[2] * 0.75 * m * lo];
    };
    gen.mouthFunnel = (q, r) => {
      if (!MAIN(r)) return null;
      const m = G.lipMask(q); if (m < 1e-4) return null;
      const cw = fall(Math.abs(q[0] - F.mc[0]) / (F.mouthHalfW + 0.05));
      return mul3([-(q[0] - F.mc[0]) * 0.3, (G.upper(q) - G.lower(q)) * 0.07 * cw, 0.1], m);
    };
    gen.mouthPucker = (q, r) => {
      if (!MAIN(r)) return null;
      const m = G.lipMask(q); if (m < 1e-4) return null;
      return mul3([-(q[0] - F.mc[0]) * 0.55, -(q[1] - F.ySplit) * 0.3, 0.16], m);
    };
    gen.mouthRollUpper = (q, r) => { if (!MAIN(r)) return null; const m = ell(q, [F.mc[0], L.lipUp[1], L.lipUp[2]], F.mouthHalfW + 0.1, 0.16, 0.3) * G.upper(q); return m > 1e-4 ? [0, -0.04 * m, -0.08 * m] : null; };
    gen.mouthRollLower = (q, r) => { if (!MAIN(r)) return null; const m = ell(q, [F.mc[0], L.lipLo[1], L.lipLo[2]], F.mouthHalfW + 0.1, 0.18, 0.3) * G.lower(q); return m > 1e-4 ? [0, 0.04 * m, -0.08 * m] : null; };
    gen.mouthShrugUpper = (q, r) => { if (!MAIN(r)) return null; const m = ell(q, L.lipUp, F.mouthHalfW + 0.05, 0.2, 0.35) * G.upper(q); return m > 1e-4 ? [0, 0.06 * m, 0.02 * m] : null; };
    gen.mouthShrugLower = (q, r) => {
      if (!MAIN(r)) return null;
      const c = [(L.lipLo[0] + L.chin[0]) / 2, (L.lipLo[1] + L.chin[1]) / 2, (L.lipLo[2] + L.chin[2]) / 2];
      const m = ell(q, c, F.mouthHalfW + 0.15, 0.45, 0.45) * G.lower(q);
      return m > 1e-4 ? [0, 0.07 * m, 0.03 * m] : null;
    };
    gen.cheekPuff = (q, r) => {
      if (!SKIN(r)) return null;
      let d = [0, 0, 0];
      for (const [, s, k] of sides) {
        const M = L['mouth' + k];
        const m = ell(q, [M[0] + 0.25 * s, M[1] + 0.15, M[2] - 0.35], 0.4, 0.42, 0.55);
        d = add3(d, [0.1 * s, 0, 0.05], m);
      }
      if (MAIN(r)) d = add3(d, [0, 0, 0.03], G.lipMask(q));
      return Math.abs(d[0]) + Math.abs(d[2]) > 1e-5 ? d : null;
    };
    gen.browInnerUp = (q, r) => {
      if (!SKIN(r)) return null;
      const a = L.browInL, b = L.browInR;
      const m = Math.max(ell(q, add3(a, [0, 0.05, 0]), 0.3, 0.32, 0.45), ell(q, add3(b, [0, 0.05, 0]), 0.3, 0.32, 0.45),
        ell(q, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.05, (a[2] + b[2]) / 2], 0.25, 0.3, 0.45));
      return m > 1e-4 ? [0, 0.13 * m, 0] : null;
    };
    for (const [N, s, k] of sides) {
      const M = L['mouth' + k], E = L['eye' + k], e = G.eye[k];
      gen['mouthSmile' + N] = (q, r) => { if (!SKIN(r)) return null; const m = ell(q, add3(M, [0, 0.06, -0.05]), 0.5, 0.42, 0.55) * ss(-0.25, F.mouthHalfW * 0.9, s * (q[0] - F.mc[0])); return m > 1e-4 ? mul3([0.09 * s, 0.14, -0.05], m) : null; };
      gen['mouthFrown' + N] = (q, r) => { if (!SKIN(r)) return null; const m = ell(q, add3(M, [0, -0.08, -0.03]), 0.45, 0.42, 0.55) * ss(-0.25, F.mouthHalfW * 0.9, s * (q[0] - F.mc[0])); return m > 1e-4 ? mul3([0.03 * s, -0.12, 0], m) : null; };
      gen['mouthDimple' + N] = (q, r) => { if (!SKIN(r)) return null; const m = ell(q, add3(M, [0.05 * s, 0, -0.05]), 0.3, 0.3, 0.45); return m > 1e-4 ? mul3([0.04 * s, 0, -0.07], m) : null; };
      gen['mouthStretch' + N] = (q, r) => { if (!SKIN(r)) return null; const m = ell(q, add3(M, [0.03 * s, -0.03, -0.05]), 0.48, 0.38, 0.55); return m > 1e-4 ? mul3([0.12 * s, -0.04, -0.02], m) : null; };
      gen['mouthPress' + N] = (q, r) => {
        if (!MAIN(r)) return null;
        const m = G.lipMask(q) * G.sideW(q, s); if (m < 1e-4) return null;
        return [0, clamp((F.ySplit - q[1]) * 0.6, -0.05, 0.05) * m, -0.02 * m];
      };
      gen['mouthLowerDown' + N] = (q, r) => { if (!MAIN(r)) return null; const m = G.lipMask(q) * G.lower(q) * G.sideW(q, s); return m > 1e-4 ? [0, -0.1 * m, 0.015 * m] : null; };
      gen['mouthUpperUp' + N] = (q, r) => { if (!MAIN(r)) return null; const m = G.lipMask(q) * G.upper(q) * G.sideW(q, s); return m > 1e-4 ? [0, 0.1 * m, 0.015 * m] : null; };
      gen['mouth' + N] = (q, r) => { if (!MAIN(r)) return null; const m = ell(q, [F.mc[0], F.ySplit, F.mc[2] - 0.05], F.mouthHalfW + 0.35, 0.45, 0.5); return m > 1e-4 ? [0.13 * s * m, 0, 0] : null; };
      gen['cheekSquint' + N] = (q, r) => { if (!SKIN(r)) return null; const m = ell(q, [E[0], E[1] - 0.5, E[2] - 0.1], 0.38, 0.28, 0.5); return m > 1e-4 ? [0, 0.07 * m, 0.01 * m] : null; };
      gen['noseSneer' + N] = (q, r) => {
        if (!SKIN(r)) return null;
        const c = [0.18 * s, E[1] + 0.68 * (L.lipUp[1] - E[1]), 0.1];
        const m = ell(q, c, 0.2, 0.32, 0.6) * ss(F.J[2] + 0.6, F.J[2] + 1.0, q[2]);
        return m > 1e-4 ? [0.01 * s * m, 0.06 * m, -0.01 * m] : null;
      };
      gen['browDown' + N] = (q, r) => { if (!SKIN(r)) return null; const b = G.brow(q, k); return b.m > 1e-4 ? [-0.04 * s * (1 - b.t) * b.m, -0.09 * b.m, 0] : null; };
      gen['browOuterUp' + N] = (q, r) => { if (!SKIN(r)) return null; const m = ell(q, add3(L['browOut' + k], [0, 0.05, 0]), 0.32, 0.32, 0.45); return m > 1e-4 ? [0, 0.12 * m, 0] : null; };
      // Lider: Drehung um den Augenmittelpunkt
      gen['eyeBlink' + N] = (q, r) => {
        if (!SKIN(r)) return null;
        const reg = e.reg(q); if (reg < 1e-4) return null;
        const p = e.phi(q), pc = e.pL + 0.22 * e.ap;
        let pn;
        if (p >= pc) pn = Math.max(pc, p - (e.pU - pc) * e.wUp(q, p) * reg);
        else pn = Math.min(pc, p + (pc - e.pL) * e.wLo(q, p) * reg);
        return Math.abs(pn - p) > 1e-6 ? e.rotTo(q, pn) : null;
      };
      gen['eyeSquint' + N] = (q, r) => {
        if (!SKIN(r)) return null;
        const reg = e.reg(q);
        let d = null;
        if (reg > 1e-4) {
          const p = e.phi(q);
          const w = p <= e.pL ? e.wLo(q, p) : fall((p - e.pL) / (0.3 * e.ap));
          const pn = p + 0.28 * e.ap * w * reg;
          if (Math.abs(pn - p) > 1e-6) d = e.rotTo(q, pn);
        }
        const cs = gen['cheekSquint' + N](q, r);
        return cs ? add3(d || [0, 0, 0], cs, 0.5) : d;
      };
      gen['eyeWide' + N] = (q, r) => {
        if (!SKIN(r)) return null;
        const reg = e.reg(q); if (reg < 1e-4) return null;
        const p = e.phi(q);
        const w = p >= e.pU ? e.wUp(q, p) : fall((e.pU - p) / (0.3 * e.ap));
        const pn = p + 0.25 * e.ap * w * reg;
        return Math.abs(pn - p) > 1e-6 ? e.rotTo(q, pn) : null;
      };
      // Blickrichtung: nur separate Augen-Meshes drehen (+ Oberlid folgt leicht)
      const look = (ax, ang, lid) => (q, r) => {
        if (r === 'eye') {
          const d = Math.hypot(q[0] - e.P[0], q[1] - e.P[1], q[2] - e.P[2]);
          const w = fall(Math.max(0, d - 0.3) / 0.1);
          if (w < 1e-4) return null;
          const x = q[0] - e.P[0], y = q[1] - e.P[1], z = q[2] - e.P[2], a = ang * w, c = Math.cos(a), sn = Math.sin(a);
          if (ax === 'x') return [0, y * c - z * sn - y, y * sn + z * c - z];
          return [x * c + z * sn - x, 0, -x * sn + z * c - z];
        }
        if (lid && SKIN(r)) {
          const reg = e.reg(q); if (reg < 1e-4) return null;
          const p = e.phi(q);
          if (p < e.pU - 0.3 * e.ap) return null;
          const pn = p + lid * e.ap * e.wUp(q, p) * reg * fall((e.pU - p) / (0.3 * e.ap));
          return Math.abs(pn - p) > 1e-6 ? e.rotTo(q, pn) : null;
        }
        return null;
      };
      gen['eyeLookUp' + N] = look('x', -0.26, 0.15);
      gen['eyeLookDown' + N] = look('x', 0.26, -0.3);
      gen['eyeLookIn' + N] = look('y', -0.32 * s, 0);
      gen['eyeLookOut' + N] = look('y', 0.32 * s, 0);
    }
    gen.tongueOut = (q, r) => {
      if (r !== 'tongue') return null;
      const w = ss(F.mc[2] - 1.0, F.mc[2] - 0.3, q[2]);
      return w > 1e-4 ? [0, -0.08 * w, 0.35 * w] : null;
    };
    return gen;
  }

  // ---------------------------------------------------------------- Undo
  function pushUndo(label, fn) {
    S.undo.push({ label, fn });
    if (S.undo.length > 40) S.undo.shift();
    updateUndoBtn();
  }
  function undo() {
    const e = S.undo.pop();
    if (!e) return;
    e.fn();
    invalidate(false);
    updateUndoBtn();
    refreshUI();
    showToast(`Rückgängig: ${e.label}`, 1600);
  }
  function snapTarget(geoms, name) {
    return geoms.map((g) => {
      const i = targetIndex(g, name);
      if (i < 0) return { g, missing: true };
      return { g, pos: g.morphAttributes.position[i].array.slice(), nrm: g.morphAttributes.normal?.[i]?.array.slice() };
    });
  }
  function restoreTarget(snaps, name) {
    const touched = new Set();
    for (const s of snaps) {
      const i = targetIndex(s.g, name);
      if (s.missing) { if (i >= 0) { removeTargetRaw(s.g, i); touched.add(s.g); } continue; }
      if (i < 0) continue;
      s.g.morphAttributes.position[i].array.set(s.pos);
      if (s.nrm && s.g.morphAttributes.normal?.[i]) s.g.morphAttributes.normal[i].array.set(s.nrm);
      touched.add(s.g);
    }
    touched.forEach(syncMorph);
  }
  function removeTargetRaw(g, i) {
    const p = g.morphAttributes.position.splice(i, 1)[0];
    const n = g.morphAttributes.normal ? g.morphAttributes.normal.splice(i, 1)[0] : null;
    return { p, n, i };
  }

  // ---------------------------------------------------------------- Morph-Verwaltung
  function shapeMeshes() { return faceSet(); }
  function createTarget(name, silent) {
    name = String(name || '').trim();
    if (!name) return false;
    if (targetNames().includes(name)) { if (!silent) showError(`„${name}“ gibt es schon.`, 2500); return false; }
    const geoms = geomsOf(shapeMeshes());
    if (!geoms.length) { showError('Keine Meshes gefunden.', 2500); return false; }
    for (const g of geoms) addTargetRaw(g, name);
    geoms.forEach(syncMorph);
    pushUndo(`Form „${name}“ erstellt`, () => { for (const g of geoms) { const i = targetIndex(g, name); if (i >= 0) removeTargetRaw(g, i); } geoms.forEach(syncMorph); });
    selectTarget(name);
    return true;
  }
  function deleteTarget(name) {
    const recs = [];
    for (const g of geomsOf(allMeshes())) {
      ensureEditable(g);
      const i = targetIndex(g, name);
      if (i >= 0) recs.push({ g, ...removeTargetRaw(g, i) });
    }
    if (!recs.length) return false;
    recs.forEach((r) => syncMorph(r.g));
    pushUndo(`Form „${name}“ gelöscht`, () => {
      for (const r of recs) {
        r.g.morphAttributes.position.splice(r.i, 0, r.p);
        if (r.n) (r.g.morphAttributes.normal ||= []).splice(r.i, 0, r.n);
        syncMorph(r.g);
      }
    });
    if (S.target === name) S.target = null;
    return true;
  }
  function renameTarget(oldN, newN) {
    newN = String(newN || '').trim();
    if (!newN || newN === oldN) return false;
    if (targetNames().includes(newN)) { showError(`„${newN}“ gibt es schon.`, 2500); return false; }
    const geoms = [];
    for (const g of geomsOf(allMeshes())) { ensureEditable(g); if (targetIndex(g, oldN) >= 0) geoms.push(g); }
    const ren = (a, b) => {
      for (const g of geoms) {
        const i = targetIndex(g, a);
        if (i < 0) continue;
        g.morphAttributes.position[i].name = b;
        if (g.morphAttributes.normal?.[i]) g.morphAttributes.normal[i].name = b;
      }
      for (const m of allMeshes()) if (geoms.includes(m.geometry) && m.morphTargetDictionary && a in m.morphTargetDictionary) {
        const i = m.morphTargetDictionary[a]; delete m.morphTargetDictionary[a]; m.morphTargetDictionary[b] = i;
      }
      ctx.markAnimDirty?.();
    };
    ren(oldN, newN);
    if (S.avatar.arkit.status[oldN]) { S.avatar.arkit.status[newN] = S.avatar.arkit.status[oldN]; delete S.avatar.arkit.status[oldN]; }
    pushUndo(`Umbenannt in „${newN}“`, () => ren(newN, oldN));
    if (S.target === oldN) S.target = newN;
    return true;
  }
  function clearTarget(name) {
    const geoms = geomsOf(allMeshes()).filter((g) => targetIndex(g, name) >= 0);
    const snaps = snapTarget(geoms, name);
    for (const g of geoms) { const i = targetIndex(g, name); g.morphAttributes.position[i].array.fill(0); if (g.morphAttributes.normal?.[i]) g.morphAttributes.normal[i].array.fill(0); refreshGPU(g); }
    invalidate(false);
    pushUndo(`Form „${name}“ geleert`, () => restoreTarget(snaps, name));
  }

  // ---------------------------------------------------------------- Spiegel-Map (Vertex-Zuordnung über die x-Ebene)
  function buildMirror() {
    if (S.mirrorReady) return;
    const pl = mirrorPlane();
    const ms = faceSet();
    const tol = Math.max(1e-6, faceSize() * 0.012);
    const cell = tol;
    const grid = new Map();
    const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    ms.forEach((m, mi) => {
      const B = baseWorld(cache(m));
      for (let i = 0; i < B.length / 3; i++) {
        const k = key(B[i * 3], B[i * 3 + 1], B[i * 3 + 2]);
        let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(mi, i);
      }
    });
    const r = new THREE.Vector3();
    // Symmetrie-Ebene verfeinern (unsymmetrische Scans / außermittige Punkte): Versatz entlang N iterativ schätzen
    {
      const F0 = faceFrame(), R0 = faceSize() * 0.9;
      const samples = [];
      ms.forEach((m, mi) => { const B = baseWorld(cache(m)); const step = Math.max(1, Math.floor(B.length / 3 / 3000)); for (let i = 0; i < B.length / 3; i += step) { r.fromArray(B, i * 3); if (!F0 || r.distanceTo(F0.O) < R0) samples.push(B[i * 3], B[i * 3 + 1], B[i * 3 + 2]); } });
      const near = (q, rad) => {
        const cx = Math.floor(q.x / cell), cy = Math.floor(q.y / cell), cz = Math.floor(q.z / cell), rc = Math.ceil(rad / cell);
        let best = rad * rad, out = null;
        for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) for (let e = -rc; e <= rc; e++) {
          const list = grid.get(`${cx + a},${cy + b},${cz + e}`); if (!list) continue;
          for (let j = 0; j < list.length; j += 2) { const P = baseWorld(cache(ms[list[j]])), v = list[j + 1]; const dx = P[v * 3] - q.x, dy = P[v * 3 + 1] - q.y, dz = P[v * 3 + 2] - q.z, dd = dx * dx + dy * dy + dz * dz; if (dd < best) { best = dd; out = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]; } }
        }
        return out;
      };
      for (let it = 0; it < 4 && samples.length; it++) {
        let sum = 0, cnt = 0;
        for (let k = 0; k < samples.length; k += 3 * Math.max(1, Math.floor(samples.length / 3 / 800))) {
          r.set(samples[k], samples[k + 1], samples[k + 2]);
          const d = r.clone().sub(pl.O).dot(pl.N);
          if (Math.abs(d) < tol) continue;
          r.addScaledVector(pl.N, -2 * d);
          const q = near(r, tol * 4); if (!q) continue;
          sum += (q[0] - r.x) * pl.N.x + (q[1] - r.y) * pl.N.y + (q[2] - r.z) * pl.N.z; cnt++;
        }
        if (!cnt) break;
        // Spiegelpunkt liegt um 'mean' daneben -> Ebene um mean/2·sign verschieben (Mittel über beide Seiten -> 0 bei Symmetrie)
        const mean = sum / cnt;
        if (Math.abs(mean) < tol * 0.05) break;
        // Für Punkte links (+N) und rechts (−N) wirkt ein Versatz gleich: q - r = 2·δ  -> δ = mean/2
        pl.O.addScaledVector(pl.N, mean / 2);
      }
    }
    ms.forEach((m) => {
      const c = cache(m), B = baseWorld(c);
      c.pm = new Int32Array(c.n).fill(-1); c.pv = new Int32Array(c.n);
      for (let i = 0; i < c.n; i++) {
        r.fromArray(B, i * 3);
        const d = r.clone().sub(pl.O).dot(pl.N);
        r.addScaledVector(pl.N, -2 * d);
        const cx = Math.floor(r.x / cell), cy = Math.floor(r.y / cell), cz = Math.floor(r.z / cell);
        let best = tol * tol, bm = -1, bv = 0;
        for (const rc of [1, 4]) {
        if (bm >= 0) break;
        best = (tol * rc) * (tol * rc);
        for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) for (let e = -rc; e <= rc; e++) {
          const list = grid.get(`${cx + a},${cy + b},${cz + e}`);
          if (!list) continue;
          for (let j = 0; j < list.length; j += 2) {
            const P = baseWorld(cache(ms[list[j]])), v = list[j + 1];
            const dx = P[v * 3] - r.x, dy = P[v * 3 + 1] - r.y, dz = P[v * 3 + 2] - r.z, dd = dx * dx + dy * dy + dz * dz;
            if (dd < best) { best = dd; bm = list[j]; bv = v; }
          }
        }
        }
        c.pm[i] = bm; c.pv[i] = bv;
      }
    });
    S.mirrorMeshes = ms; S.mirrorPlane = pl; S.mirrorReady = true;
  }
  function partnerOf(c, i) {
    if (!c.pm || c.pm[i] < 0) return null;
    return { c: cache(S.mirrorMeshes[c.pm[i]]), i: c.pv[i] };
  }
  // Form spiegeln: Left -> Right (neue/überschriebene Form) bzw. ohne Seite: symmetrisch machen
  function mirrorTarget(name) {
    buildMirror();
    const other = mirrorName(name);
    const ms = S.mirrorMeshes;
    const geoms = geomsOf(ms);
    const dst = other || name;
    const snaps = snapTarget(geoms, dst);
    for (const g of geoms) { addTargetRaw(g, name); addTargetRaw(g, dst); }
    const src = new Map(ms.map((m) => [m, m.geometry.morphAttributes.position[targetIndex(m.geometry, name)].array.slice()]));
    const pl = S.mirrorPlane;
    const d = new THREE.Vector3();
    const out = new Map(ms.map((m) => [m, other ? new Float32Array(src.get(m).length) : src.get(m).slice()]));
    for (const m of ms) prepSkin(cache(m));
    // pro Ziel-Vertex: Wert vom gespiegelten Partner holen (deckt auch unsymmetrische Meshes ab)
    for (const m of ms) {
      const c = cache(m), o = out.get(m);
      for (let i = 0; i < c.n; i++) {
        const p = partnerOf(c, i);
        if (!p) continue;
        const sp = src.get(p.c.mesh);
        if (!sp[p.i * 3] && !sp[p.i * 3 + 1] && !sp[p.i * 3 + 2]) { if (!other) { o[i * 3] /= 2; o[i * 3 + 1] /= 2; o[i * 3 + 2] /= 2; } continue; }
        d.fromArray(sp, p.i * 3).applyMatrix3(fwdLin(p.c, p.i));
        d.copy(reflectD(d, pl)).applyMatrix3(invLin(c, i));
        if (other) { o[i * 3] = d.x; o[i * 3 + 1] = d.y; o[i * 3 + 2] = d.z; }
        else { const so = src.get(m); o[i * 3] = (so[i * 3] + d.x) / 2; o[i * 3 + 1] = (so[i * 3 + 1] + d.y) / 2; o[i * 3 + 2] = (so[i * 3 + 2] + d.z) / 2; }
      }
    }
    for (const m of ms) {
      const g = m.geometry, i = targetIndex(g, dst);
      g.morphAttributes.position[i].array.set(out.get(m));
      updateNormals(g, i);
    }
    geoms.forEach(syncMorph);
    invalidate(false);
    pushUndo(other ? `Gespiegelt nach „${other}“` : `„${name}“ symmetrisch`, () => restoreTarget(snaps, dst));
    return dst;
  }

  // ---------------------------------------------------------------- ARKit-Generator
  function generateArkit(opts = {}) {
    const F = faceFrame();
    if (!F) { showError('Bitte zuerst im Tab „Rig“ alle Gesichtspunkte setzen.', 3500); return null; }
    const G = regions(F), GEN = makeGenerators(G), roles = classify(F);
    const meshes = [...roles.keys()];
    const det = detectArkit();
    const status = { ...(S.avatar.arkit.status || {}) };
    const undoOps = [];
    const near = new Map(), Q = new Map();
    for (const m of meshes) {
      const c = cache(m); prepSkin(c);
      const B = baseWorld(c), q = new Float32Array(c.n * 3), nr = new Uint8Array(c.n);
      for (let i = 0; i < c.n; i++) {
        const f = F.toF(_v.fromArray(B, i * 3));
        q[i * 3] = f[0]; q[i * 3 + 1] = f[1]; q[i * 3 + 2] = f[2];
        nr[i] = Math.abs(f[0]) < 2.6 && f[1] > -3.6 && f[1] < 1.8 && f[2] > F.J[2] - 0.8 ? 1 : 0;
      }
      Q.set(m, q); near.set(m, nr);
    }
    const hasEye = [...roles.values()].includes('eye'), hasTongue = [...roles.values()].includes('tongue');
    const touched = new Set();
    const qq = [0, 0, 0], wv = new THREE.Vector3();
    let made = 0, manual = 0, skipped = 0;
    for (const name of ARKIT_NAMES) {
      const regen = opts.regen && status[name] === 'auto' && det[name] === name;
      if (det[name] && !regen) { if (!status[name] || status[name] === 'fehlt') status[name] = 'vorhanden'; skipped++; continue; }
      const geoms = geomsOf(meshes);
      if (regen) undoOps.push({ type: 'restore', name, snaps: snapTarget(geoms, name) });
      for (const g of geoms) { const r = addTargetRaw(g, name); if (r.created) undoOps.push({ type: 'remove', g, name }); }
      let fn = GEN[name];
      if (/^eyeLook/.test(name) && !hasEye) fn = null;
      if (name === 'tongueOut' && !hasTongue) fn = null;
      let moved = 0;
      for (const m of meshes) {
        const g = m.geometry, ti = targetIndex(g, name), t = g.morphAttributes.position[ti].array;
        if (regen) t.fill(0);
        touched.add(g);
        if (!fn) continue;
        const c = cache(m), q = Q.get(m), nr = near.get(m), role = roles.get(m);
        for (let i = 0; i < c.n; i++) {
          if (!nr[i]) continue;
          qq[0] = q[i * 3]; qq[1] = q[i * 3 + 1]; qq[2] = q[i * 3 + 2];
          const d = fn(qq, role);
          if (!d) continue;
          wv.set(0, 0, 0).addScaledVector(F.X, d[0] * F.s).addScaledVector(F.Y, d[1] * F.s).addScaledVector(F.Z, d[2] * F.s);
          if (wv.lengthSq() < 1e-16) continue;
          wv.applyMatrix3(invLin(c, i));
          t[i * 3] = wv.x; t[i * 3 + 1] = wv.y; t[i * 3 + 2] = wv.z;
          moved++;
        }
      }
      if (moved) { status[name] = 'auto'; made++; } else { status[name] = 'manuell'; manual++; }
      for (const g of geoms) updateNormals(g, targetIndex(g, name));
    }
    touched.forEach(syncMorph);
    const oldStatus = S.avatar.arkit.status;
    S.avatar.arkit.status = status;
    invalidate(false);
    pushUndo('ARKit-Formen erzeugt', () => {
      const geoms = new Set();
      for (const op of undoOps.slice().reverse()) {
        if (op.type === 'remove') { const i = targetIndex(op.g, op.name); if (i >= 0) removeTargetRaw(op.g, i); geoms.add(op.g); }
        else restoreTarget(op.snaps, op.name);
      }
      geoms.forEach(syncMorph);
      S.avatar.arkit.status = oldStatus;
    });
    const res = { made, manual, skipped, status };
    showToast(`ARKit: ${made} erzeugt, ${skipped} vorhanden, ${manual} leer (manuell nacharbeiten).`, 4000);
    refreshUI();
    return res;
  }

  // ---------------------------------------------------------------- Visemes (aus ARKit kombiniert)
  function bakeVisemes(list = VISEMES) {
    const det = detectArkit();
    if (!Object.keys(det).length) { showError('Zuerst ARKit-Formen erzeugen (Visemes werden daraus kombiniert).', 3500); return null; }
    const vis = detectVisemes();
    const baked = new Set(S.avatar.visemes.baked || []);
    const geoms = geomsOf(allMeshes().filter((m) => m.morphTargetDictionary && Object.keys(m.morphTargetDictionary).some((k) => arkitCanon(k))));
    geoms.forEach(ensureEditable);
    const undoOps = [];
    const res = { baked: [], existing: [] };
    for (const v of list) {
      if (vis[v] && !baked.has(v)) { res.existing.push(v); continue; }
      const map = S.avatar.visemes.map[v] || {};
      for (const g of geoms) {
        const r = addTargetRaw(g, v);
        if (r.created) undoOps.push({ type: 'remove', g, name: v });
        else undoOps.push({ type: 'restore', name: v, snaps: snapTarget([g], v) });
        const i = targetIndex(g, v);
        const out = g.morphAttributes.position[i].array, outN = g.morphAttributes.normal?.[i]?.array;
        out.fill(0); if (outN) outN.fill(0);
        for (const [shape, w] of Object.entries(map)) {
          const j = targetIndex(g, det[shape]);
          if (j < 0 || !w) continue;
          const src = g.morphAttributes.position[j].array;
          for (let k = 0; k < out.length; k++) out[k] += w * src[k];
          const sn = g.morphAttributes.normal?.[j]?.array;
          if (outN && sn) for (let k = 0; k < outN.length; k++) outN[k] += w * sn[k];
        }
      }
      baked.add(v);
      res.baked.push(v);
    }
    geoms.forEach(syncMorph);
    const oldBaked = S.avatar.visemes.baked;
    S.avatar.visemes.baked = [...baked];
    invalidate(false);
    pushUndo('Visemes erzeugt', () => {
      const gs = new Set();
      for (const op of undoOps.slice().reverse()) {
        if (op.type === 'remove') { const i = targetIndex(op.g, op.name); if (i >= 0) removeTargetRaw(op.g, i); gs.add(op.g); }
        else restoreTarget(op.snaps, op.name);
      }
      gs.forEach(syncMorph);
      S.avatar.visemes.baked = oldBaked;
    });
    showToast(res.baked.length ? `${res.baked.length} Visemes erzeugt${res.existing.length ? `, ${res.existing.length} vorhanden` : ''}.` : 'Alle Visemes sind schon vorhanden.');
    refreshUI();
    return res;
  }

  // ---------------------------------------------------------------- Pinsel
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffb020, depthTest: false, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.renderOrder = 999; ring.visible = false;
  scene.add(ring);
  function showRing(hit, R) {
    if (!hit) { ring.visible = false; return; }
    ring.position.copy(hit.point);
    ring.lookAt(hit.point.clone().add(hit.normal));
    ring.scale.setScalar(R);
    ring.visible = true;
  }
  function brushMeshes() {
    const all = shapeMeshes();
    return S.brush.mesh === 'all' ? all : all.filter((m) => m.uuid === S.brush.mesh);
  }
  let stroke = null;
  function targetArr(c) {
    const i = targetIndex(c.geom, stroke.name);
    return i >= 0 ? c.geom.morphAttributes.position[i].array : null;
  }
  function affected(center, R, meshes) {
    const out = [], R2 = R * R;
    for (const m of meshes) {
      const c = cache(m);
      if (c.box.distanceToPoint(center) > R) continue;
      const P = c.world;
      for (let i = 0; i < c.n; i++) {
        const dx = P[i * 3] - center.x, dy = P[i * 3 + 1] - center.y, dz = P[i * 3 + 2] - center.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < R2) out.push({ c, i, f: fall(Math.sqrt(d2) / R) });
      }
    }
    return out;
  }
  // Beiträge sammeln (mit Symmetrie über die Vertex-Spiegel-Map)
  function contributions(list, dispFn, list2) {
    const acc = new Map();
    const put = (c, i, x, y, z) => {
      let m = acc.get(c); if (!m) acc.set(c, m = new Map());
      const a = m.get(i);
      if (a) { a[0] += x; a[1] += y; a[2] += z; a[3]++; } else m.set(i, [x, y, z, 1]);
    };
    const d = new THREE.Vector3();
    for (const e of list) {
      dispFn(e, d);
      put(e.c, e.i, d.x, d.y, d.z);
    }
    // Symmetrie: gespiegelte Pinselstelle bekommt die gespiegelte Verschiebung (lückenlos, auch bei unsymmetrischen Meshes)
    if (S.brush.sym && list2) for (const e of list2) { dispFn(e, d); const r = reflectD(d, S.mirrorPlane); put(e.c, e.i, r.x, r.y, r.z); }
    return acc;
  }
  function startStroke(hit, e) {
    const name = S.target;
    if (!name) return false;
    const meshes = S.brush.sym ? faceSet() : brushMeshes();
    const geoms = geomsOf(meshes);
    const created = geoms.filter((g) => addTargetRaw(g, name).created);
    created.forEach(syncMorph);
    setInfluence(name, 1);
    syncValueSlider();
    if (S.brush.sym) buildMirror();
    for (const m of meshes) prepSkin(cache(m));
    stroke = {
      name, geoms, snaps: snapTarget(geoms, name), created, R: S.brush.radius / 100 * faceSize(), tool: S.brush.tool,
      meshes: brushMeshes(), start: hit.point.clone(), normal: hit.normal.clone(), last: null, pending: null, pointerId: e.pointerId, touched: new Set(),
    };
    if (stroke.tool === 'grab') {
      const list = affected(hit.point, stroke.R, stroke.meshes);
      const list2 = S.brush.sym ? affected(reflectP(hit.point, S.mirrorPlane), stroke.R, meshes) : null;
      // Ausgangswerte merken (auch für Spiegel-Partner)
      const base = new Map();
      const keep = (c, i) => { let m = base.get(c); if (!m) base.set(c, m = new Map()); if (!m.has(i)) { const t = targetArr(c); m.set(i, [t[i * 3], t[i * 3 + 1], t[i * 3 + 2], c.world[i * 3], c.world[i * 3 + 1], c.world[i * 3 + 2]]); } };
      for (const e2 of list) keep(e2.c, e2.i);
      if (list2) for (const e2 of list2) keep(e2.c, e2.i);
      stroke.list = list; stroke.list2 = list2; stroke.base = base;
      stroke.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point);
    } else dab(hit);
    return true;
  }
  function dab(hit) {
    const st = stroke, R = st.R, s01 = S.brush.strength / 100;
    if (st.tool === 'inflate' || st.tool === 'deflate') {
      const list = affected(hit.point, R, st.meshes);
      const amt = (st.tool === 'inflate' ? 1 : -1) * s01 * R * 0.06;
      const n = hit.normal;
      const list2 = S.brush.sym ? affected(reflectP(hit.point, S.mirrorPlane), R, faceSet()) : null;
      applyAcc(contributions(list, (e, d) => d.copy(n).multiplyScalar(amt * e.f), list2), false);
    } else if (st.tool === 'smooth' || st.tool === 'erase') {
      const centers = [hit.point];
      if (S.brush.sym) centers.push(reflectP(hit.point, S.mirrorPlane));
      for (const ctr of centers) {
        const list = affected(ctr, R, S.brush.sym ? faceSet() : st.meshes);
        const byC = new Map();
        for (const e of list) { let a = byC.get(e.c); if (!a) byC.set(e.c, a = []); a.push(e); }
        for (const [c, arr] of byC) {
          const t = targetArr(c); if (!t) continue;
          const k = st.tool === 'erase' ? s01 * 0.5 : s01 * 0.6;
          if (st.tool === 'erase') for (const e of arr) { const f = 1 - k * e.f; t[e.i * 3] *= f; t[e.i * 3 + 1] *= f; t[e.i * 3 + 2] *= f; }
          else {
            const w = weld(c.geom), adj = adjacency(c.geom);
            const upd = [];
            for (const e of arr) {
              const r = w.rep[e.i], nb = adj.get(r);
              if (!nb || !nb.length) continue;
              let ax = 0, ay = 0, az = 0;
              for (const j of nb) { ax += t[j * 3]; ay += t[j * 3 + 1]; az += t[j * 3 + 2]; }
              const inv = 1 / nb.length, f = k * e.f;
              upd.push([r, t[r * 3] + (ax * inv - t[r * 3]) * f, t[r * 3 + 1] + (ay * inv - t[r * 3 + 1]) * f, t[r * 3 + 2] + (az * inv - t[r * 3 + 2]) * f]);
            }
            for (const [r, x, y, z] of upd) {
              const mem = w.members.get(r) || [r];
              for (const i of mem) { t[i * 3] = x; t[i * 3 + 1] = y; t[i * 3 + 2] = z; }
            }
          }
          st.touched.add(c.geom); c.staleWorld = true;
        }
      }
    }
  }
  function applyAcc(acc, absolute) {
    const d = new THREE.Vector3();
    for (const [c, m] of acc) {
      const t = targetArr(c); if (!t) continue;
      const base = absolute ? stroke.base.get(c) : null;
      for (const [i, a] of m) {
        d.set(a[0] / a[3], a[1] / a[3], a[2] / a[3]);
        const wx = d.x, wy = d.y, wz = d.z;
        d.applyMatrix3(invLin(c, i));
        if (absolute) {
          const b = base?.get(i); if (!b) continue;
          t[i * 3] = b[0] + d.x; t[i * 3 + 1] = b[1] + d.y; t[i * 3 + 2] = b[2] + d.z;
          c.world[i * 3] = b[3] + wx; c.world[i * 3 + 1] = b[4] + wy; c.world[i * 3 + 2] = b[5] + wz;
        } else {
          t[i * 3] += d.x; t[i * 3 + 1] += d.y; t[i * 3 + 2] += d.z;
          c.world[i * 3] += wx; c.world[i * 3 + 1] += wy; c.world[i * 3 + 2] += wz;
        }
      }
      stroke.touched.add(c.geom);
    }
  }
  function moveStroke(e) {
    const st = stroke;
    const ray = pointerRay(e);
    if (st.tool === 'grab') {
      const p = ray.intersectPlane(st.plane, new THREE.Vector3());
      if (!p) return;
      const D = p.sub(st.start);
      applyAcc(contributions(st.list, (en, d) => d.copy(D).multiplyScalar(en.f), st.list2), true);
      showRing({ point: st.start.clone().add(D), normal: st.normal }, st.R);
    } else {
      const hit = raycast(ray, st.meshes);
      if (!hit) return;
      if (st.last && st.last.distanceTo(hit.point) < st.R * 0.12) return;
      st.last = hit.point.clone();
      dab(hit);
      showRing(hit, st.R);
    }
    for (const g of st.touched) refreshGPU(g);
  }
  function endStroke() {
    const st = stroke;
    stroke = null;
    if (!st) return;
    for (const g of st.geoms) { const i = targetIndex(g, st.name); if (i >= 0) updateNormals(g, i); refreshGPU(g); }
    invalidate(false);
    const snaps = st.snaps, name = st.name;
    pushUndo('Pinselstrich', () => restoreTarget(snaps, name));
    ring.visible = false;
  }
  // für Tests: Strich programmgesteuert (Weltpunkte)
  function strokeAt(points, tool) {
    const prevTool = S.brush.tool;
    if (tool) S.brush.tool = tool;
    const ms = brushMeshes();
    const toHit = (p) => {
      const dirToCam = camera.position.clone().sub(p).normalize();
      return raycast(new THREE.Ray(p.clone().addScaledVector(dirToCam, faceSize()), dirToCam.clone().negate()), ms);
    };
    const h0 = toHit(points[0]);
    if (!h0) { S.brush.tool = prevTool; return false; }
    startStroke(h0, { pointerId: -1 });
    if (stroke.tool === 'grab') {
      const end = points[points.length - 1];
      const D = end.clone().sub(points[0]);
      applyAcc(contributions(stroke.list, (en, d) => d.copy(D).multiplyScalar(en.f), stroke.list2), true);
    } else for (const p of points.slice(1)) { const h = toHit(p); if (h) dab(h); }
    endStroke();
    S.brush.tool = prevTool;
    return true;
  }

  // ---------------------------------------------------------------- Gesichtsknochen
  function faceBones() { const out = []; model()?.traverse((o) => { if (o.isBone && o.userData.faceBone) out.push(o); }); return out; }
  function createFaceBones() {
    const F = faceFrame();
    if (!F) { showError('Bitte zuerst alle Gesichtspunkte setzen.', 3000); return null; }
    const hb = findHeadBone() || (S.ref?.type === 'bone' ? S.ref.obj : null);
    if (!hb || !allMeshes().some((m) => m.isSkinnedMesh && m.skeleton?.bones.includes(hb))) { showError('Kein Kopf-Knochen in einem geskinnten Mesh gefunden – Gesichtsknochen brauchen ein Skelett. Morphs funktionieren trotzdem.', 4500); return null; }
    if (faceBones().length) { showError('Gesichtsknochen gibt es schon. Zum Neu-Erzeugen erst „Entfernen“.', 3500); return null; }
    const G = regions(F), roles = classify(F), L = F.L;
    const W = (f) => F.toW(f).add(F.O);
    const off = (p, d) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
    const k = S.boneScale;
    const R = (r) => r * F.s * k;
    const lidFn = (s, upper) => (q, r) => {
      if (!SKIN(r)) return 0;
      const e = G.eye[s], reg = e.reg(q); if (reg < 1e-4) return 0;
      const p = e.phi(q), pc = e.pL + 0.22 * e.ap;
      return upper ? (p >= pc ? e.wUp(q, p) * reg : 0) : (p < pc ? e.wLo(q, p) * reg : 0);
    };
    const defs = [
      { name: 'Face_Jaw', pos: F.J, tail: L.chin, fn: (q, r) => G.wJaw(q, r) },
    ];
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1, P = F.pivot[s];
      defs.push(
        { name: `Face_Eye_${s}`, pos: P, tail: L['eye' + s], fn: (q, r) => (r === 'eye' && Math.hypot(q[0] - P[0], q[1] - P[1], q[2] - P[2]) < 0.35 ? 1 : 0) },
        { name: `Face_UpperLid_${s}`, pos: P, tail: L['lidUp' + s], fn: lidFn(s, true) },
        { name: `Face_LowerLid_${s}`, pos: P, tail: L['lidLo' + s], fn: lidFn(s, false) },
        { name: `Face_BrowIn_${s}`, pos: off(L['browIn' + s], [0, 0, -0.04]), tail: off(L['browIn' + s], [(L['browOut' + s][0] - L['browIn' + s][0]) * 0.4, 0, -0.04]), radius: R(0.24) },
        { name: `Face_BrowOut_${s}`, pos: off(L['browOut' + s], [0, 0, -0.04]), tail: off(L['browOut' + s], [0.08 * sg, -0.02, -0.06]), radius: R(0.24) },
        { name: `Face_MouthCorner_${s}`, pos: off(L['mouth' + s], [0, 0, -0.05]), tail: off(L['mouth' + s], [0.12 * sg, 0, -0.07]), radius: R(0.22) },
      );
    }
    defs.push(
      { name: 'Face_UpperLip', pos: off(L.lipUp, [0, 0, -0.05]), tail: off(L.lipUp, [0, 0.1, -0.05]), fn: (q, r) => (MAIN(r) ? ell(q, L.lipUp, F.mouthHalfW * 0.85, 0.2, 0.35) * G.upper(q) : 0) },
      { name: 'Face_LowerLip', parent: 'Face_Jaw', pos: off(L.lipLo, [0, 0, -0.05]), tail: off(L.lipLo, [0, -0.1, -0.05]), fn: (q, r) => (MAIN(r) ? ell(q, L.lipLo, F.mouthHalfW * 0.85, 0.22, 0.35) * G.lower(q) : 0) },
    );
    if (L.tongue) defs.push({ name: 'Face_Tongue', parent: 'Face_Jaw', pos: L.tongue, tail: off(L.tongue, [0, 0, -0.3]), fn: (q, r) => (r === 'tongue' ? 1 : 0) });
    const made = new Map();
    const fns = new Map(), radii = new Map();
    for (const d of defs) {
      const parent = d.parent ? made.get(d.parent) : hb;
      const b = editor.addBoneAt(parent, W(d.pos), d.name, { tail: W(d.tail), face: true });
      made.set(d.name, b);
      if (d.fn) fns.set(b, (v, mesh) => clamp(d.fn(F.toF(v), roles.get(mesh) || 'other'), 0, 1));
      if (d.radius) radii.set(b, d.radius);
    }
    editor.structureChanged();
    const bones = [...made.values()];
    editor.computeWeights(bones, { silent: true, fnFor: (b) => fns.get(b), radiusFor: (b) => radii.get(b) });
    invalidate(true);
    showToast(`${bones.length} Gesichtsknochen erzeugt und gewichtet.`);
    updateRigUI();
    return bones.map((b) => b.name);
  }
  function removeFaceBones() {
    const tops = faceBones().filter((b) => !b.parent?.userData?.faceBone);
    for (const b of tops) editor.deleteBoneRef(b);
    editor.structureChanged();
    invalidate(true);
    updateRigUI();
  }

  // ---------------------------------------------------------------- Emotionen / Werte
  function arkitTargets() { return detectArkit(); }
  function applyValues(vals, tween = true) {
    const det = arkitTargets();
    const to = {};
    for (const n of targetNames()) if (arkitCanon(n) || visemeCanon(n)) to[n] = 0;
    for (const [k, v] of Object.entries(vals)) { const n = det[k] || (targetNames().includes(k) ? k : null); if (n) to[n] = v; }
    if (!tween) { for (const n in to) setInfluence(n, to[n]); syncSliders(); return; }
    const from = {};
    for (const n in to) from[n] = getInfluence(n);
    S.tween = { from, to, t: 0, dur: 0.25 };
  }
  function applyEmotion(name) {
    const e = S.avatar.emotions[name];
    if (!e) return false;
    S.lastEmotion = name;
    applyValues(e, true);
    return true;
  }
  function saveEmotion(name) {
    const det = arkitTargets(), vals = {};
    for (const [canon, n] of Object.entries(det)) { const v = getInfluence(n); if (v > 0.005) vals[canon] = +v.toFixed(3); }
    S.avatar.emotions[name] = vals;
    showToast(`Emotion „${name}“ gespeichert (${Object.keys(vals).length} Werte).`);
  }

  // ---------------------------------------------------------------- Sprechtest (Lippen-Sync aus Audio)
  function audioCtx() {
    if (!S.ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; S.ac = new AC(); }
    if (S.ac.state === 'suspended') S.ac.resume().catch(() => {});
    return S.ac;
  }
  async function startSpeech(file) {
    const ac = audioCtx();
    if (!ac) { showError('Audio wird von diesem Browser nicht unterstützt.', 3000); return false; }
    let buf;
    try { buf = await ac.decodeAudioData(await file.arrayBuffer()); } catch (e) { showError('Audiodatei konnte nicht gelesen werden.', 3000); return false; }
    stopSpeech();
    const src = ac.createBufferSource(); src.buffer = buf;
    const an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.35;
    src.connect(an); an.connect(ac.destination);
    const names = targetNames();
    const vis = detectVisemes(), det = detectArkit();
    const saved = Object.fromEntries(names.map((n) => [n, getInfluence(n)]));
    S.speak = { src, an, freq: new Float32Array(an.frequencyBinCount), time: new Float32Array(an.fftSize), peak: 0.05, cur: {}, prevLevel: 0, vis, det, saved, useVis: Object.keys(vis).length >= 10, frames: 0, maxOut: 0 };
    src.onended = () => { if (S.speak && S.speak.src === src) stopSpeech(); };
    src.start();
    $('#f-speak-stop').disabled = false;
    return true;
  }
  function stopSpeech() {
    const sp = S.speak;
    if (!sp) return;
    S.speak = null;
    try { sp.src.onended = null; sp.src.stop(); } catch (e) { /* schon beendet */ }
    try { sp.src.disconnect(); sp.an.disconnect(); } catch (e) { /* ignore */ }
    for (const [n, v] of Object.entries(sp.saved)) setInfluence(n, v);
    window.__faceSpeechStats = { frames: sp.frames, maxOut: sp.maxOut };
    const b = $('#f-speak-stop'); if (b) b.disabled = true;
    syncSliders();
  }
  function speechFrame() {
    const sp = S.speak;
    const ac = S.ac;
    sp.an.getFloatTimeDomainData(sp.time);
    let rms = 0; for (let i = 0; i < sp.time.length; i++) rms += sp.time[i] * sp.time[i];
    rms = Math.sqrt(rms / sp.time.length);
    sp.an.getFloatFrequencyData(sp.freq);
    const hz = ac.sampleRate / sp.an.fftSize;
    const band = (lo, hi) => { let s = 0; for (let i = Math.max(1, Math.floor(lo / hz)); i < Math.min(sp.freq.length, Math.ceil(hi / hz)); i++) s += Math.pow(10, sp.freq[i] / 10); return s; };
    const b1 = band(80, 300), b2 = band(300, 1000), b3 = band(1000, 2500), b4 = band(2500, 4500), b5 = band(4500, 9000);
    const tot = b1 + b2 + b3 + b4 + b5 + 1e-12;
    sp.peak = Math.max(rms, sp.peak * 0.997, 0.02);
    const level = rms < 0.008 ? 0 : clamp(rms / (sp.peak * 0.75), 0, 1);
    const tgt = {};
    if (level > 0.1) {
      const sib = (b4 * 0.5 + b5) / tot;
      if (sib > 0.45) { if (b4 > b5 * 1.2) tgt.viseme_CH = level * 0.8; else tgt.viseme_SS = level * 0.85; }
      else {
        const open = b2 / (b1 + b2 + b3 + 1e-12), front = b3 / (b2 + b3 + 1e-12);
        const sc = { viseme_aa: open * (1 - Math.abs(front - 0.4) * 1.4), viseme_O: open * (1 - front), viseme_U: (1 - open) * (1 - front) * 0.8, viseme_E: front * (0.4 + 0.6 * open), viseme_I: front * (1 - open) };
        let sum = 0; for (const k in sc) { sc[k] = Math.max(0, sc[k]) ** 2; sum += sc[k]; }
        for (const k in sc) tgt[k] = (sc[k] / (sum || 1)) * level;
        if ((b4 + b5) / tot > 0.22 && open < 0.35) tgt.viseme_FF = level * 0.35;
      }
    }
    if (sp.prevLevel - level > 0.3) tgt.viseme_PP = 0.8;
    sp.prevLevel = level;
    for (const v of VISEMES) {
      const cur = sp.cur[v] || 0, t = tgt[v] || 0;
      sp.cur[v] = cur + (t - cur) * (t > cur ? 0.55 : 0.22);
    }
    sp.frames++;
    if (sp.useVis) {
      for (const v of VISEMES) if (sp.vis[v]) { setInfluence(sp.vis[v], sp.cur[v]); sp.maxOut = Math.max(sp.maxOut, sp.cur[v]); }
    } else {
      const outA = {};
      for (const v of VISEMES) {
        const w = sp.cur[v]; if (w < 1e-3) continue;
        for (const [shape, k] of Object.entries(S.avatar.visemes.map[v] || {})) outA[shape] = (outA[shape] || 0) + w * k;
      }
      for (const shape of ['jawOpen', 'mouthFunnel', 'mouthPucker', 'mouthStretchLeft', 'mouthStretchRight', 'mouthSmileLeft', 'mouthSmileRight', 'mouthPressLeft', 'mouthPressRight', 'mouthRollLower', 'mouthRollUpper', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthShrugUpper', 'tongueOut']) {
        if (sp.det[shape]) { const v = clamp(outA[shape] || 0, 0, 1); setInfluence(sp.det[shape], v); sp.maxOut = Math.max(sp.maxOut, v); }
      }
    }
  }
  function blinkFrame(dt) {
    const det = S.speak?.det || detectArkit();
    const l = det.eyeBlinkLeft, r = det.eyeBlinkRight;
    if (!l && !r) return;
    if (S.blinkT < 0) {
      S.nextBlink -= dt;
      if (S.nextBlink <= 0) { S.blinkT = 0; S.nextBlink = 2 + Math.random() * 4; }
      return;
    }
    S.blinkT += dt;
    const d = 0.18, x = S.blinkT / d;
    const v = x >= 1 ? 0 : Math.sin(Math.PI * x);
    if (l) setInfluence(l, v);
    if (r) setInfluence(r, v);
    if (x >= 1) S.blinkT = -1;
  }

  // ---------------------------------------------------------------- UI
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  function updateUndoBtn() { const b = $('#f-undo'); if (b) b.disabled = !S.undo.length; }
  function setTab(t) {
    S.tab = t;
    document.querySelectorAll('[data-ftab]').forEach((b) => b.classList.toggle('active', b.dataset.ftab === t));
    document.querySelectorAll('[data-fpane]').forEach((p) => p.classList.toggle('hidden', p.dataset.fpane !== t));
    if (t !== 'shape') ring.visible = false;
    if (t === 'test') syncSliders(true);
    refreshUI();
  }
  function updateRigUI() {
    if (!S.active) return;
    const st = steps(), l = currentStep();
    const side = l.sideName === 'L' ? ' – links (Figur), im Bild rechts' : l.sideName === 'R' ? ' – rechts (Figur), im Bild links' : '';
    $('#f-step').innerHTML = '';
    $('#f-step').append(el('b', '', `Schritt ${S.step + 1}/${st.length}: ${l.label}${side}`), el('div', 'small', `${l.hint}. Tippe auf die Stelle oder ziehe den orangen Punkt.${S.points[l.id] ? '' : ' (noch nicht gesetzt)'}`));
    $('#f-prev').disabled = S.step === 0;
    $('#f-next').textContent = S.step >= st.length - 1 ? 'Fertig ✓' : 'Weiter ›';
    $('#f-mirror').classList.toggle('active', S.mirror);
    const hb = findHeadBone();
    const skinned = hb && allMeshes().some((m) => m.isSkinnedMesh && m.skeleton?.bones.includes(hb));
    const nb = faceBones().length;
    $('#f-bones').disabled = !skinned || !rigComplete() || nb > 0;
    $('#f-bones-del').disabled = !nb;
    $('#f-rig-hint').textContent = !rigComplete() ? 'Noch nicht alle Pflicht-Punkte gesetzt.'
      : nb ? `${nb} Gesichtsknochen vorhanden (unter „${hb ? hb.name : 'Kopf'}“). Nach Punkt-Änderungen: Entfernen und neu erzeugen.`
        : skinned ? 'Rig vollständig. Weiter mit „Erzeugen“ oder Gesichtsknochen anlegen.' : 'Rig vollständig. Kein Skelett: Knochen nicht möglich, Morphs schon.';
    updateMarkers(false);
  }
  function selectTarget(name) {
    S.target = name || null;
    if (name) setInfluence(name, Math.max(getInfluence(name), 1));
    refreshShapeUI();
  }
  function syncValueSlider() {
    const v = S.target ? getInfluence(S.target) : 0;
    $('#f-value').value = v;
    $('#f-value-val').textContent = fmt2.format(v);
  }
  function refreshShapeUI() {
    const sel = $('#f-target');
    const names = targetNames();
    sel.innerHTML = '';
    if (!names.length) sel.append(new Option('– keine Formen –', ''));
    for (const n of names) sel.append(new Option(n + (S.avatar?.arkit?.status?.[n] === 'manuell' ? ' ⚠' : ''), n));
    if (S.target && !names.includes(S.target)) S.target = null;
    sel.value = S.target || '';
    ['#f-rename', '#f-mirror-shape', '#f-delete', '#f-zero'].forEach((id) => { $(id).disabled = !S.target; });
    $('#f-mirror-shape').textContent = S.target && mirrorName(S.target) ? `Spiegeln → ${mirrorName(S.target).replace(/^(.{14}).+$/, '$1…')}` : 'Symmetrisch';
    syncValueSlider();
    const ms = $('#f-mesh');
    const list = shapeMeshes();
    ms.innerHTML = '';
    ms.append(new Option(`Alle Meshes (${list.length})`, 'all'));
    list.forEach((m, i) => ms.append(new Option(m.name || `Mesh ${i + 1}`, m.uuid)));
    if (![...ms.options].some((o) => o.value === S.brush.mesh)) S.brush.mesh = 'all';
    ms.value = S.brush.mesh;
    $('#f-brush').classList.toggle('active', S.brush.on);
    $('#f-sym').classList.toggle('active', S.brush.sym);
    document.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === S.brush.tool));
    $('#f-shape-hint').textContent = !S.target ? 'Form wählen oder „Neu“ – dann Pinsel aktivieren und auf dem Gesicht malen.'
      : S.brush.on ? 'Mit einem Finger malen. Neben das Modell tippen/ziehen dreht die Ansicht.' : 'Pinsel aktivieren, um die Form zu bearbeiten.';
  }
  const STATUS_TXT = { vorhanden: 'vorhanden', auto: 'erzeugt', manuell: 'manuell nacharbeiten', fehlt: 'fehlt' };
  function refreshGenUI() {
    const det = detectArkit();
    const st = S.avatar?.arkit?.status || {};
    const list = $('#f-arkit-list');
    list.innerHTML = '';
    let have = 0, man = 0;
    for (const n of ARKIT_NAMES) {
      let s = det[n] ? (st[n] === 'auto' || st[n] === 'manuell' ? st[n] : 'vorhanden') : 'fehlt';
      if (det[n]) have++;
      if (s === 'manuell') man++;
      const b = el('button', `chip ${s}`, n);
      b.title = STATUS_TXT[s];
      b.addEventListener('click', () => { if (det[n]) { setTab('shape'); selectTarget(det[n]); } });
      list.append(b);
    }
    $('#f-arkit-status').textContent = `ARKit: ${have}/52 vorhanden${man ? ` · ${man} leer (⚠ manuell nacharbeiten)` : ''}${rigComplete() ? '' : ' · Rig fehlt (Tab „Rig“)'}`;
    $('#f-arkit').disabled = !rigComplete() || have === 52;
    $('#f-arkit-regen').disabled = !rigComplete() || !Object.values(st).includes('auto');
    const vis = detectVisemes();
    $('#f-vis-status').textContent = `Visemes: ${Object.keys(vis).length}/15 vorhanden`;
    $('#f-visemes').disabled = !have;
    const vs = $('#f-vis-sel');
    const cur = vs.value || 'viseme_aa';
    vs.innerHTML = '';
    for (const v of VISEMES) vs.append(new Option(v + (vis[v] ? ' ✓' : ''), v));
    vs.value = cur;
    renderVisMap();
  }
  function renderVisMap() {
    const v = $('#f-vis-sel').value;
    const box = $('#f-vis-map');
    box.innerHTML = '';
    const map = S.avatar.visemes.map[v] ||= {};
    for (const [shape, w] of Object.entries(map)) {
      const row = el('div', 'ed-row f-maprow');
      const s = el('select', 'f-select sm');
      for (const n of ARKIT_NAMES) s.append(new Option(n, n));
      s.value = shape;
      const r = el('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.01; r.value = w;
      const val = el('span', 'time', fmt2.format(w));
      const del = el('button', 'ed-btn sm2 danger', '×');
      s.addEventListener('change', () => { const ww = map[shape]; delete map[shape]; map[s.value] = ww; renderVisMap(); });
      r.addEventListener('input', () => { map[shape] = +r.value; val.textContent = fmt2.format(+r.value); });
      del.addEventListener('click', () => { delete map[shape]; renderVisMap(); });
      row.append(s, r, val, del);
      box.append(row);
    }
    if (!Object.keys(map).length) box.append(el('div', 'small', v === 'viseme_sil' ? 'Ruhe-Visem: bleibt leer (neutral).' : 'Keine Formen – „+ Form“ hinzufügen.'));
  }
  function groupOf(n) {
    if (visemeCanon(n)) return 'Visemes';
    const c = arkitCanon(n) || n;
    if (/^eye/i.test(c)) return 'Augen';
    if (/^brow/i.test(c)) return 'Brauen';
    if (/^(cheek|nose)/i.test(c)) return 'Wangen & Nase';
    if (/^tongue/i.test(c)) return 'Zunge';
    if (/^(mouth|jaw)/i.test(c)) return 'Mund & Kiefer';
    return 'Sonstige';
  }
  const GROUPS = ['Augen', 'Mund & Kiefer', 'Brauen', 'Wangen & Nase', 'Zunge', 'Visemes', 'Sonstige'];
  function buildSliders() {
    const box = $('#f-sliders');
    const open = new Set([...box.querySelectorAll('details[open]')].map((d) => d.dataset.g));
    box.innerHTML = '';
    const names = targetNames();
    if (!names.length) { box.append(el('div', 'small', 'Dieses Modell hat noch keine Morph-Formen. Im Tab „Erzeugen“ ARKit-Formen anlegen.')); return; }
    const by = new Map(GROUPS.map((g) => [g, []]));
    for (const n of names) by.get(groupOf(n)).push(n);
    for (const g of GROUPS) {
      const arr = by.get(g);
      if (!arr.length) continue;
      const d = el('details', 'f-group');
      d.dataset.g = g;
      if (open.has(g)) d.open = true;
      d.append(el('summary', '', `${g} (${arr.length})`));
      for (const n of arr) {
        const row = el('label', 'ed-row ed-slider f-srow');
        const lab = el('span', 'f-sname', n);
        const r = el('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.01; r.value = getInfluence(n); r.dataset.name = n;
        const val = el('span', 'time', fmt2.format(+r.value));
        r.addEventListener('input', () => { S.tween = null; setInfluence(n, +r.value); val.textContent = fmt2.format(+r.value); if (n === S.target) syncValueSlider(); });
        row.append(lab, r, val);
        d.append(row);
      }
      box.append(d);
    }
    S.sliderNames = names.join('|');
  }
  function syncSliders(rebuild) {
    if (!S.active) return;
    if (rebuild || S.sliderNames !== targetNames().join('|')) buildSliders();
    for (const r of document.querySelectorAll('#f-sliders input[type=range]')) {
      const v = getInfluence(r.dataset.name);
      r.value = v;
      r.nextElementSibling.textContent = fmt2.format(v);
    }
  }
  function buildEmotionButtons() {
    const box = $('#f-emotions');
    box.innerHTML = '';
    for (const n of Object.keys(S.avatar.emotions)) {
      const b = el('button', 'chip emo', n);
      b.addEventListener('click', () => applyEmotion(n));
      box.append(b);
    }
  }
  function refreshUI() {
    ctx.refreshInfo?.();
    if (!S.active) return;
    updateRigUI();
    refreshShapeUI();
    refreshGenUI();
    buildEmotionButtons();
    syncSliders();
    updateUndoBtn();
  }

  // ---------------------------------------------------------------- Zeiger (Punkte ziehen, tippen, malen)
  let drag = null, tap = null;
  function nearestMarker(e) {
    const r = canvas.getBoundingClientRect();
    let best = null, bd = 34;
    for (const [id, mk] of markers) {
      if (!mk.visible) continue;
      const v = mk.position.clone().project(camera);
      if (v.z > 1) continue;
      const d = Math.hypot(r.left + (v.x + 1) / 2 * r.width - e.clientX, r.top + (1 - v.y) / 2 * r.height - e.clientY);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }
  function stepIndexOf(id) {
    const st = steps();
    let i = st.findIndex((l) => l.id === id);
    if (i < 0 && LM_BY[id]?.pair) i = st.findIndex((l) => l.id === LM_BY[id].pair);
    return i;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!S.active || !e.isPrimary || e.button > 0) return;
    if (S.tab === 'rig') {
      const id = nearestMarker(e);
      if (id) {
        e.stopImmediatePropagation(); e.preventDefault();
        controls.enabled = false;
        canvas.setPointerCapture?.(e.pointerId);
        const i = stepIndexOf(id); if (i >= 0) S.step = i;
        drag = { id, before: snapshotPoints(), moved: false };
        updateRigUI();
        return;
      }
      tap = { x: e.clientX, y: e.clientY, t: performance.now() };
    } else if (S.tab === 'shape' && S.brush.on && S.target) {
      const hit = raycast(pointerRay(e), brushMeshes());
      if (!hit) return;
      e.stopImmediatePropagation(); e.preventDefault();
      controls.enabled = false;
      canvas.setPointerCapture?.(e.pointerId);
      startStroke(hit, e);
    }
  }, true);
  let pendingMove = null;
  canvas.addEventListener('pointermove', (e) => {
    if (!S.active) return;
    if (drag) {
      const hit = raycast(pointerRay(e), visibleMeshes());
      if (hit) { placePoint(drag.id, hit.point, hit.normal); drag.moved = true; updateMarkers(false); }
      return;
    }
    if (stroke) {
      if (!pendingMove) requestAnimationFrame(() => { const ev = pendingMove; pendingMove = null; if (stroke && ev) moveStroke(ev); });
      pendingMove = e;
      return;
    }
    if (S.tab === 'shape' && S.brush.on && e.pointerType === 'mouse') {
      showRing(raycast(pointerRay(e), brushMeshes()), S.brush.radius / 100 * faceSize());
    }
  });
  const up = (e) => {
    if (drag) {
      const d = drag; drag = null; controls.enabled = true;
      if (d.moved) { const before = d.before; pushUndo('Punkt verschoben', () => { restorePoints(before); rigChanged(); }); rigChanged(); }
      return;
    }
    if (stroke) { if (pendingMove) { moveStroke(pendingMove); pendingMove = null; } endStroke(); controls.enabled = true; return; }
    if (tap && S.tab === 'rig' && e.type === 'pointerup') {
      const t = tap; tap = null;
      if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 8 || performance.now() - t.t > 500) return;
      const hit = raycast(pointerRay(e), visibleMeshes());
      if (!hit) return;
      const id = currentStep().id;
      const before = snapshotPoints();
      placePoint(id, hit.point, hit.normal);
      pushUndo('Punkt gesetzt', () => { restorePoints(before); rigChanged(); });
      rigChanged();
    }
    tap = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  // ---------------------------------------------------------------- Modus
  function enter() {
    const m = model();
    if (!m) { showError('Bitte zuerst ein Modell öffnen.', 2500); return; }
    if (!visibleMeshes().length) { showError('Dieses Modell hat keine Meshes.', 2500); return; }
    editor.exit();
    ctx.restPose(true);
    applyBindPose();
    invalidate(true);
    S.active = true;
    S.faceSet = null;
    ensureRef();
    if (!Object.keys(S.points).length) autoPlace(true), (S.undo = []);
    document.body.classList.add('editing', 'face-mode');
    $('#face').classList.remove('hidden');
    $('#anim').classList.add('hidden');
    ctx.setToolActive('face', true);
    updateMarkers(true);
    setTab(S.tab);
    frameFace(currentStep().side ? 'side' : 'front');
    const n = Object.keys(detectArkit()).length;
    if (n) showToast(`${n} ARKit-Formen erkannt.`, 2500);
  }
  function exit(silent) {
    if (!S.active && !silent) return;
    const was = S.active;
    stopSpeech();
    S.tween = null;
    if (stroke) endStroke();
    S.active = false;
    drag = null; tap = null;
    controls.enabled = true;
    ring.visible = false;
    markerGroup.visible = false;
    document.body.classList.remove('face-mode');
    if (!editor.active) document.body.classList.remove('editing');
    $('#face')?.classList.add('hidden');
    ctx.setToolActive('face', false);
    if (was) {
      ctx.refreshInfo?.();
      restorePose();
      invalidate(true);
      ctx.restPose(false);
    }
  }
  function update(dt) {
    if (!S.active) return;
    if (S.tween) {
      const tw = S.tween;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur), e = k * k * (3 - 2 * k);
      for (const n in tw.to) setInfluence(n, tw.from[n] + (tw.to[n] - tw.from[n]) * e);
      if (k >= 1) S.tween = null;
      syncSliders();
    }
    if (S.speak) speechFrame();
    if (S.tab === 'test' && S.blink) blinkFrame(dt);
    if (S.tab === 'rig') updateMarkers(false);
  }

  // ---------------------------------------------------------------- Bedienelemente verdrahten
  document.querySelectorAll('[data-ftab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.ftab)));
  $('#face-close').addEventListener('click', () => exit());
  $('#f-undo').addEventListener('click', undo);
  $('#f-prev').addEventListener('click', () => { const was = currentStep().side; S.step--; updateRigUI(); if (!!currentStep().side !== !!was) frameFace(currentStep().side ? 'side' : 'front'); });
  $('#f-next').addEventListener('click', () => {
    const st = steps();
    if (S.step >= st.length - 1) { if (rigComplete()) { showToast('Rig fertig! Weiter im Tab „Erzeugen“.'); setTab('gen'); } else showError('Es fehlen noch Punkte.', 2500); return; }
    const was = currentStep().side; S.step++; updateRigUI();
    if (!!currentStep().side !== !!was) frameFace(currentStep().side ? 'side' : 'front');
  });
  $('#f-mirror').addEventListener('click', () => { S.mirror = !S.mirror; S.step = 0; updateRigUI(); });
  $('#f-auto').addEventListener('click', () => autoPlace());
  $('#f-view').addEventListener('click', () => frameFace(currentStep().side ? 'side' : 'front'));
  $('#f-turn').addEventListener('click', () => { S.facing = (S.facing + 1) % 4; S.head = null; S.points = {}; autoPlace(); frameFace('front'); });
  $('#f-bones').addEventListener('click', () => createFaceBones());
  $('#f-bones-del').addEventListener('click', () => removeFaceBones());
  const br = $('#f-bradius');
  br.addEventListener('input', () => { S.boneScale = +br.value / 100; $('#f-bradius-val').textContent = `${br.value} %`; });
  $('#f-target').addEventListener('change', (e) => selectTarget(e.target.value));
  $('#f-new').addEventListener('click', () => { const n = window.prompt('Name der neuen Form (z. B. mouthSmileLeft):', ''); if (n) { createTarget(n); refreshUI(); } });
  $('#f-rename').addEventListener('click', () => { if (!S.target) return; const n = window.prompt('Neuer Name:', S.target); if (n && renameTarget(S.target, n)) refreshUI(); });
  $('#f-delete').addEventListener('click', () => { if (S.target && window.confirm(`Form „${S.target}“ löschen?`)) { deleteTarget(S.target); refreshUI(); } });
  $('#f-mirror-shape').addEventListener('click', () => { if (!S.target) return; const d = mirrorTarget(S.target); showToast(d === S.target ? 'Form symmetrisch gemacht.' : `Nach „${d}“ gespiegelt.`); refreshUI(); });
  $('#f-zero').addEventListener('click', () => { if (S.target) { clearTarget(S.target); refreshUI(); } });
  $('#f-value').addEventListener('input', (e) => { if (!S.target) return; setInfluence(S.target, +e.target.value); $('#f-value-val').textContent = fmt2.format(+e.target.value); });
  $('#f-brush').addEventListener('click', () => { S.brush.on = !S.brush.on; if (!S.brush.on) ring.visible = false; refreshShapeUI(); });
  $('#f-sym').addEventListener('click', () => { S.brush.sym = !S.brush.sym; refreshShapeUI(); });
  $('#f-mesh').addEventListener('change', (e) => { S.brush.mesh = e.target.value; });
  document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => { S.brush.tool = b.dataset.tool; refreshShapeUI(); }));
  const bR = $('#f-radius'), bS = $('#f-strength');
  bR.addEventListener('input', () => { S.brush.radius = +bR.value; $('#f-radius-val').textContent = `${bR.value} %`; });
  bS.addEventListener('input', () => { S.brush.strength = +bS.value; $('#f-strength-val').textContent = `${bS.value} %`; });
  $('#f-arkit').addEventListener('click', () => generateArkit());
  $('#f-arkit-regen').addEventListener('click', () => generateArkit({ regen: true }));
  $('#f-visemes').addEventListener('click', () => bakeVisemes());
  $('#f-vis-sel').addEventListener('change', renderVisMap);
  $('#f-vis-bake').addEventListener('click', () => bakeVisemes([$('#f-vis-sel').value]));
  $('#f-vis-add').addEventListener('click', () => {
    const map = S.avatar.visemes.map[$('#f-vis-sel').value] ||= {};
    const free = ARKIT_NAMES.find((n) => !(n in map));
    if (free) { map[free] = 0.3; renderVisMap(); }
  });
  $('#f-vis-reset').addEventListener('click', () => { const v = $('#f-vis-sel').value; S.avatar.visemes.map[v] = { ...DEFAULT_VISEME_MAP[v] }; renderVisMap(); });
  $('#f-vis-test').addEventListener('click', () => {
    const v = $('#f-vis-sel').value, vis = detectVisemes();
    if (vis[v]) applyValues({ [vis[v]]: 1 }); else applyValues(S.avatar.visemes.map[v] || {});
  });
  $('#f-speak').addEventListener('click', () => { audioCtx(); $('#f-audio').click(); });
  $('#f-audio').addEventListener('change', async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) await startSpeech(f); });
  $('#f-speak-stop').addEventListener('click', () => stopSpeech());
  $('#f-blink').addEventListener('click', () => { S.blink = !S.blink; $('#f-blink').classList.toggle('active', S.blink); });
  $('#f-emo-save').addEventListener('click', () => {
    const names = Object.keys(S.avatar.emotions).join(', ');
    const n = window.prompt(`Aktuelle Werte speichern als Emotion (${names} oder neuer Name):`, S.lastEmotion || 'froh');
    if (n && n.trim()) { saveEmotion(n.trim()); buildEmotionButtons(); }
  });
  $('#f-all-zero').addEventListener('click', () => { S.tween = null; for (const n of targetNames()) setInfluence(n, 0); syncSliders(); syncValueSlider(); });

  return {
    get active() { return S.active; },
    get avatar() { return S.avatar; },
    get points() { return Object.fromEntries(Object.keys(S.points).map((k) => [k, pointWorld(k).toArray()])); },
    get target() { return S.target; },
    get brush() { return S.brush; },
    get tab() { return S.tab; },
    get undoCount() { return S.undo.length; },
    get speaking() { return !!S.speak; },
    onModel, enter, exit, update, beforeExport, serialize, setTab, toggle() { S.active ? exit() : enter(); },
    autoPlace, faceFrame: () => { const F = faceFrame(); return F && { s: F.s, X: F.X.toArray(), Y: F.Y.toArray(), Z: F.Z.toArray(), O: F.O.toArray(), L: F.L }; },
    setPoint(id, xyz) { placePoint(id, new THREE.Vector3(...xyz)); rigChanged(); },
    setPointFace(id, f) { const F = faceFrame(); const w = F.toW(f).add(F.O); setPointWorld(id, w); rigChanged(); },
    snapPoint(id, from, dir) {
      const hit = raycast(new THREE.Ray(new THREE.Vector3(...from), new THREE.Vector3(...dir).normalize()), visibleMeshes());
      if (hit) { setPointWorld(id, hit.point); rigChanged(); }
      return !!hit;
    },
    set mirror(v) { S.mirror = !!v; updateRigUI(); },
    rigComplete, generateArkit, bakeVisemes, createTarget, deleteTarget, renameTarget, mirrorTarget, clearTarget, selectTarget,
    strokeAt: (pts, tool) => strokeAt(pts.map((p) => new THREE.Vector3(...p)), tool),
    setInfluence, getInfluence, targetNames, detectArkit, detectVisemes, applyEmotion, applyValues, saveEmotion,
    createFaceBones, removeFaceBones, faceBones: () => faceBones().map((b) => b.name), undo, frameFace,
    classify: () => { const F = faceFrame(); return F ? [...classify(F)].map(([m, r]) => [m.name, r]) : []; },
    _mirror: () => { buildMirror(); return S.mirrorMeshes.map((m) => { const c = cache(m); let k = 0; for (let i = 0; i < c.n; i++) if (c.pm[i] >= 0) k++; return [m.name, c.n, k, faceSize()]; }); },
    _profile: () => S.lastProfile, _profileResult: () => S.lastProfileResult, _head: () => { const h = headInfo(); return { mn: h.mn, mx: h.mx, W: h.W }; },
    startSpeech, stopSpeech, headBone: () => findHeadBone()?.name || null,
    targetDelta(name, meshName) {
      for (const m of allMeshes()) { if (meshName && m.name !== meshName) continue; const g = m.geometry; ensureEditable(g); const i = targetIndex(g, name); if (i >= 0) return Array.from(g.morphAttributes.position[i].array); }
      return null;
    },
  };
}
