// VRM-Unterstützung (VRM 0.x und 1.0) über @pixiv/three-vrm
import * as THREE from 'three';
import { VRMLoaderPlugin, VRMUtils } from 'three-vrm';

// VRM-Ausdruck -> Morph-Name beim Übernehmen (passend zu face.js / Companion-Apps)
const BAKE_NAMES = {
  aa: 'viseme_aa', ih: 'viseme_I', ou: 'viseme_U', ee: 'viseme_E', oh: 'viseme_O',
  blinkLeft: 'eyeBlinkLeft', blinkRight: 'eyeBlinkRight',
};
const ORDER = ['blink', 'blinkLeft', 'blinkRight', 'aa', 'ih', 'ou', 'ee', 'oh', 'happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral', 'lookUp', 'lookDown', 'lookLeft', 'lookRight'];
const LABELS = { blink: 'Blinzeln', blinkLeft: 'Blinzeln L', blinkRight: 'Blinzeln R', happy: 'Froh', angry: 'Wütend', sad: 'Traurig', relaxed: 'Entspannt', surprised: 'Überrascht', neutral: 'Neutral', lookUp: 'Blick hoch', lookDown: 'Blick runter', lookLeft: 'Blick links', lookRight: 'Blick rechts' };

export function initVrm(ctx) {
  const { $, makeLoader, showToast, showError } = ctx;
  const loader = makeLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  let vrm = null;
  const S = { open: false, autoBlink: false, blinkT: 0, springs: true };

  // ---------------------------------------------------------------- Laden
  async function parse(buffer) {
    const gltf = await new Promise((resolve, reject) => loader.parse(buffer, '', resolve, reject));
    const v = gltf.userData.vrm;
    if (!v) return { gltf, vrm: null };
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(v); // VRM 0.x schaut nach -Z -> zur Kamera drehen
    // Rohe Knochen direkt nutzen (Gelenk-Editor, Animationen, Gesichtsknochen); normalisiertes Rig nicht ins Bild/Export
    if (v.humanoid) {
      v.humanoid.autoUpdateHumanBones = false;
      const nr = v.humanoid.normalizedHumanBonesRoot;
      if (nr && nr.parent) nr.parent.remove(nr);
      for (const [name, hb] of Object.entries(v.humanoid.humanBones || {})) if (hb && hb.node) hb.node.userData.vrmHuman = name;
    }
    // Metadaten als einfache Werte (werden beim GLB-Export als extras mitgeschrieben)
    const m = v.meta || {};
    const ver = m.metaVersion === '0' ? '0.x' : '1.0';
    const info = {
      version: ver,
      name: m.name || m.title || '',
      authors: (m.authors || (m.author ? [m.author] : [])).join(', '),
      license: m.licenseUrl || m.licenseName || m.otherPermissionUrl || '',
      humanBones: Object.fromEntries(Object.entries(v.humanoid?.humanBones || {}).filter(([, hb]) => hb?.node).map(([k, hb]) => [k, hb.node.name])),
      expressions: (v.expressionManager?.expressions || []).map((e) => e.expressionName),
    };
    gltf.scene.userData.vrm = info;
    return { gltf, vrm: v };
  }

  function onModel(v) {
    vrm = v || null;
    S.autoBlink = false;
    $('#vrm-tool').classList.toggle('hidden', !vrm);
    close();
  }
  function afterFrame() { try { vrm?.springBoneManager?.reset(); } catch (e) { /* ignore */ } }
  function dispose(model) { if (vrm && model) { try { VRMUtils.deepDispose(model); } catch (e) { /* ignore */ } } vrm = null; }

  function update(dt, paused) {
    if (!vrm) return;
    if (S.autoBlink && vrm.expressionManager) {
      S.blinkT += dt;
      const period = 3.2, p = S.blinkT % period, d = 0.16;
      const w = p < d ? Math.sin((p / d) * Math.PI) : 0;
      vrm.expressionManager.setValue('blink', w);
    }
    if (!S.springs || paused) { vrm.expressionManager?.update(); vrm.lookAt?.update?.(dt); vrm.nodeConstraintManager?.update(); return; }
    vrm.update(dt);
  }

  // ---------------------------------------------------------------- Panel: Ausdrücke testen
  function names() {
    const ex = (vrm?.expressionManager?.expressions || []).map((e) => e.expressionName);
    return ex.sort((a, b) => ((ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99)) || a.localeCompare(b));
  }
  const fmt2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function build() {
    const box = $('#vrm-list');
    box.innerHTML = '';
    const list = names();
    if (!list.length) { box.textContent = 'Dieses VRM hat keine Ausdrücke.'; return; }
    for (const n of list) {
      const row = document.createElement('label'); row.className = 'ed-row ed-slider f-srow';
      const lab = document.createElement('span'); lab.className = 'f-sname'; lab.textContent = LABELS[n] ? `${LABELS[n]} (${n})` : n;
      const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.01; r.value = vrm.expressionManager.getValue(n) || 0; r.dataset.name = n;
      const val = document.createElement('span'); val.className = 'time'; val.textContent = fmt2.format(+r.value);
      r.addEventListener('input', () => { if (n === 'blink') setAutoBlink(false); vrm.expressionManager.setValue(n, +r.value); val.textContent = fmt2.format(+r.value); });
      row.append(lab, r, val);
      box.append(row);
    }
    const info = ctx.getModel()?.userData.vrm;
    $('#vrm-meta').textContent = info ? `VRM ${info.version}${info.name ? ' – ' + info.name : ''} · ${Object.keys(info.humanBones).length} Humanoid-Knochen · ${list.length} Ausdrücke` : '';
  }
  function setAutoBlink(on) {
    S.autoBlink = on; S.blinkT = 0;
    if (!on) vrm?.expressionManager?.setValue('blink', 0);
    $('#vrm-blink').classList.toggle('active', on);
  }
  function open() {
    if (!vrm) return;
    ctx.closeOthers();
    S.open = true;
    $('#vrm-panel').classList.remove('hidden');
    ctx.setToolActive('vrm', true);
    build();
  }
  function close() {
    S.open = false;
    $('#vrm-panel').classList.add('hidden');
    ctx.setToolActive('vrm', false);
  }
  function zero() { for (const n of names()) vrm.expressionManager.setValue(n, 0); setAutoBlink(false); build(); }

  // ---------------------------------------------------------------- Ausdrücke als Morph-Targets übernehmen (bleiben im GLB-Export erhalten)
  function meshesOf(model) { const out = []; model.traverse((o) => { if (o.isMesh && o.morphTargetInfluences && o.geometry.morphAttributes.position) out.push(o); }); return out; }
  function bake() {
    const model = ctx.getModel();
    const em = vrm?.expressionManager;
    if (!model || !em) return null;
    const list = names();
    const saved = Object.fromEntries(list.map((n) => [n, em.getValue(n) || 0]));
    const blinkWas = S.autoBlink; S.autoBlink = false;
    const meshes = meshesOf(model);
    const read = () => meshes.map((m) => Array.from(m.morphTargetInfluences));
    for (const n of list) em.setValue(n, 0);
    em.update();
    const base = read();
    const made = [], skipped = [];
    // Ausdrücke einzeln auswerten (öffentliche API), Gewichte je Mesh lesen
    const plans = [];
    for (const n of list) {
      if (n === 'neutral') continue;
      const target = BAKE_NAMES[n] || `vrm_${n}`;
      if (meshes.some((m) => m.morphTargetDictionary && target in m.morphTargetDictionary)) { skipped.push(target); continue; }
      em.setValue(n, 1); em.update();
      const w = read().map((arr, k) => arr.map((x, i) => x - base[k][i]));
      em.setValue(n, 0); em.update();
      if (!w.some((arr) => arr.some((x) => Math.abs(x) > 1e-4))) { skipped.push(target + ' (nur Material/Blick)'); continue; }
      plans.push([target, w]);
    }
    const geoDone = new Map();
    for (const [target, w] of plans) {
      meshes.forEach((m, k) => {
        const g = m.geometry, ws = w[k];
        const P = g.morphAttributes.position, N = g.morphAttributes.normal;
        const key = g.uuid + '|' + target;
        if (!geoDone.has(key)) {
          const n = g.attributes.position.count;
          const pos = new Float32Array(n * 3), nor = N ? new Float32Array(n * 3) : null;
          ws.forEach((x, i) => {
            if (Math.abs(x) < 1e-4 || !P[i]) return;
            const a = P[i];
            for (let v = 0; v < n; v++) { pos[v * 3] += a.getX(v) * x; pos[v * 3 + 1] += a.getY(v) * x; pos[v * 3 + 2] += a.getZ(v) * x; }
            if (nor && N[i]) { const b = N[i]; for (let v = 0; v < n; v++) { nor[v * 3] += b.getX(v) * x; nor[v * 3 + 1] += b.getY(v) * x; nor[v * 3 + 2] += b.getZ(v) * x; } }
          });
          const pa = new THREE.Float32BufferAttribute(pos, 3); pa.name = target; P.push(pa);
          if (N) { const na = new THREE.Float32BufferAttribute(nor, 3); na.name = target; N.push(na); }
          geoDone.set(key, P.length - 1);
        }
        const idx = geoDone.get(key);
        m.morphTargetDictionary[target] = idx;
        while (m.morphTargetInfluences.length <= idx) m.morphTargetInfluences.push(0);
      });
      made.push(target);
    }
    // Morph-Textur neu aufbauen lassen
    for (const g of new Set(meshes.map((m) => m.geometry))) g.dispose();
    for (const n of list) em.setValue(n, saved[n]);
    S.autoBlink = blinkWas;
    em.update();
    const info = model.userData.vrm;
    if (info) info.bakedMorphs = Object.fromEntries(list.map((n) => [n, BAKE_NAMES[n] || `vrm_${n}`]).filter(([, t]) => made.includes(t) || skipped.includes(t)));
    ctx.onMorphsChanged?.();
    showToast(made.length ? `${made.length} Ausdrücke als Morphs übernommen (${made.slice(0, 6).join(', ')}${made.length > 6 ? ' …' : ''}).` : 'Keine neuen Morphs nötig – schon vorhanden.');
    return { made, skipped };
  }

  // ---------------------------------------------------------------- Gesichtspunkte aus VRM-Ausdrücken (für den Gesicht-Modus)
  // blinkLeft/blinkRight -> Lider + Augen, aa -> Mundlinie + Mundwinkel. Liefert Weltpunkte (Bindungspose).
  function exprWeights(name) {
    const em = vrm.expressionManager, model = ctx.getModel();
    const meshes = meshesOf(model);
    const list = names();
    const saved = Object.fromEntries(list.map((n) => [n, em.getValue(n) || 0]));
    for (const n of list) em.setValue(n, 0);
    em.update();
    const base = meshes.map((m) => Array.from(m.morphTargetInfluences));
    em.setValue(name, 1); em.update();
    const out = [];
    meshes.forEach((m, k) => { const w = Array.from(m.morphTargetInfluences).map((x, i) => x - base[k][i]); if (w.some((x) => Math.abs(x) > 1e-4)) out.push([m, w]); });
    em.setValue(name, 0);
    for (const n of list) em.setValue(n, saved[n]);
    em.update();
    return out;
  }
  function moved(name) {
    // Verschobene Vertices: Basis-Weltposition, Weltverschiebung, Betrag
    const pts = [];
    const v = new THREE.Vector3(), d = new THREE.Vector3(), n3 = new THREE.Matrix3();
    for (const [m, w] of exprWeights(name)) {
      const P = m.geometry.morphAttributes.position, cnt = m.geometry.attributes.position.count;
      const inf = m.morphTargetInfluences.slice(); m.morphTargetInfluences.fill(0);
      m.updateMatrixWorld(true); n3.setFromMatrix4(m.matrixWorld);
      for (let i = 0; i < cnt; i++) {
        d.set(0, 0, 0);
        w.forEach((x, k) => { if (Math.abs(x) > 1e-4 && P[k]) d.x += P[k].getX(i) * x, d.y += P[k].getY(i) * x, d.z += P[k].getZ(i) * x; });
        if (d.lengthSq() < 1e-14) continue;
        m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
        const dw = d.clone().applyMatrix3(n3);
        pts.push({ p: v.clone(), d: dw, a: dw.length(), mesh: m });
      }
      inf.forEach((x, i) => { m.morphTargetInfluences[i] = x; });
    }
    return pts;
  }
  function faceHints() {
    if (!vrm?.expressionManager) return null;
    const has = new Set(names());
    const out = { meshes: new Set() };
    const lid = (name, side) => {
      if (!has.has(name)) return false;
      const pts = moved(name); if (!pts.length) return false;
      const amax = Math.max(...pts.map((q) => q.a));
      const top = pts.filter((q) => q.a > 0.85 * amax);
      const c = new THREE.Vector3(), cd = new THREE.Vector3();
      top.forEach((q) => { c.add(q.p); cd.add(q.d); }); c.divideScalar(top.length); cd.divideScalar(top.length);
      out['lidUp' + side] = c.clone();
      out['lidLo' + side] = c.clone().add(cd);
      out['eye' + side] = c.clone().addScaledVector(cd, 0.5);
      top.forEach((q) => out.meshes.add(q.mesh));
      return true;
    };
    const okL = lid('blinkLeft', 'L'), okR = lid('blinkRight', 'R');
    if (!(okL && okR)) { delete out.eyeL; delete out.eyeR; delete out.lidUpL; delete out.lidUpR; delete out.lidLoL; delete out.lidLoR; }
    const mouthExpr = ['aa', 'oh', 'ih'].find((n) => has.has(n));
    if (mouthExpr) {
      const pts = moved(mouthExpr);
      if (pts.length) {
        const amax = Math.max(...pts.map((q) => q.a));
        const sig = pts.filter((q) => q.a > 0.2 * amax);
        let L = sig[0], R = sig[0];
        for (const q of sig) { if (q.p.x > L.p.x) L = q; if (q.p.x < R.p.x) R = q; }
        out.mouthL = L.p.clone(); out.mouthR = R.p.clone();
        out.mouthY = (L.p.y + R.p.y) / 2;
        const best = sig.reduce((a, b) => (b.a > a.a ? b : a));
        out.lipLo = best.p.clone();
        sig.forEach((q) => out.meshes.add(q.mesh));
      }
    }
    out.meshes = [...out.meshes];
    return Object.keys(out).length > 1 ? out : null;
  }

  // ---------------------------------------------------------------- Export: MToon -> Unlit, Outline-Gruppen weglassen
  function beforeExport(model) {
    if (!model) return () => {};
    const undo = [];
    model.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      if (!arr.some((m) => m && (m.isMToonMaterial || m.isShaderMaterial))) return;
      const g = o.geometry;
      const oldMat = o.material, oldGroups = g.groups.map((x) => ({ ...x }));
      const keep = arr.map((m) => !(m && m.isOutline));
      const remap = []; let j = 0;
      keep.forEach((k, i) => { remap[i] = k ? j++ : -1; });
      const conv = arr.filter((_, i) => keep[i]).map((m) => {
        if (!(m && (m.isMToonMaterial || m.isShaderMaterial))) return m;
        const b = new THREE.MeshBasicMaterial({
          name: m.name, color: m.color ? m.color.clone() : new THREE.Color(1, 1, 1), map: m.map || null,
          transparent: !!m.transparent, opacity: m.opacity ?? 1, alphaTest: m.alphaTest || 0, side: m.side, depthWrite: m.depthWrite,
        });
        b.userData.converted = true;
        return b;
      });
      if (Array.isArray(oldMat)) {
        g.groups = oldGroups.filter((x) => remap[x.materialIndex] >= 0).map((x) => ({ ...x, materialIndex: remap[x.materialIndex] }));
        o.material = conv.length === 1 && !g.groups.length ? conv[0] : conv;
      } else o.material = conv[0];
      undo.push(() => { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.userData.converted) m.dispose(); }); o.material = oldMat; g.groups = oldGroups; });
    });
    return () => undo.forEach((f) => f());
  }

  $('#vrm-zero').addEventListener('click', zero);
  $('#vrm-blink').addEventListener('click', () => setAutoBlink(!S.autoBlink));
  $('#vrm-springs').addEventListener('click', () => { S.springs = !S.springs; $('#vrm-springs').classList.toggle('active', S.springs); if (S.springs) afterFrame(); });
  $('#vrm-bake').addEventListener('click', () => { const r = bake(); if (r) build(); });
  $('#vrm-close').addEventListener('click', close);

  return {
    parse, onModel, afterFrame, faceHints, dispose, update, beforeExport, bake, open, close,
    toggle() { S.open ? close() : open(); },
    get vrm() { return vrm; }, get active() { return S.open; },
    names, setValue: (n, v) => vrm?.expressionManager?.setValue(n, v), getValue: (n) => vrm?.expressionManager?.getValue(n) || 0,
    setAutoBlink,
  };
}
