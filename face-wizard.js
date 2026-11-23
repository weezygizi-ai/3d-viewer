// Vereinfachtes 3-Schritte-Gesichtsrig-Menü (UI). Kernlogik liegt in face.js.
const $ = (s, r = document) => r.querySelector(s);

function viewer() { return window.__viewer; }
function face() { return viewer()?.face; }
function THREE() { return viewer().THREE; }

const OFFSET1 = { eyeL: [28, -36], eyeR: [-28, -36], mouthC: [0, 28] };
const OFFSET2 = {
  eyeL: [22, -16], eyeR: [-22, -16], browL: [18, -22], browR: [-18, -22],
  browInL: [8, -24], browInR: [-8, -24], browOutL: [22, -22], browOutR: [-22, -22],
  lidUpL: [26, -8], lidUpR: [-26, -8], lidLoL: [26, 10], lidLoR: [-26, 10],
  mouthL: [28, 8], mouthR: [-28, 8], lipUp: [0, -18], lipLo: [0, 20],
  jaw: [0, 26], nose: [36, 0], cheekL: [28, 8], cheekR: [-28, 8], jawL: [26, 14], jawR: [-26, 14],
};

let templates = [];
let drag = null;

function wiz() { return face()?.wiz || { step: 1, preset: 'basis', current: 'eyeL', sliders: {}, selected: null, created: false }; }

function toScreen(world) {
  const v = viewer();
  const cam = v.camera;
  const canvas = v.canvas || $('#view');
  const t = world.clone().project(cam);
  const r = canvas.getBoundingClientRect();
  return { x: (t.x * 0.5 + 0.5) * r.width + r.left, y: (-t.y * 0.5 + 0.5) * r.height + r.top, ok: t.z > -1 && t.z < 1 && Math.abs(t.x) < 1.2 && Math.abs(t.y) < 1.2 };
}

function worldOf(id, f) {
  const V = THREE();
  if (id === 'mouthC') {
    const w = f.mouthCenterWorld?.();
    if (w) return new V.Vector3(...(w.toArray ? w.toArray() : w));
  }
  const pts = f.points;
  if (id === 'browL' && pts.browL) return new V.Vector3(...pts.browL);
  if (id === 'browR' && pts.browR) return new V.Vector3(...pts.browR);
  if (id === 'browL' && pts.browInL && pts.browOutL) {
    return new V.Vector3(...pts.browInL).add(new V.Vector3(...pts.browOutL)).multiplyScalar(0.5);
  }
  if (id === 'browR' && pts.browInR && pts.browOutR) {
    return new V.Vector3(...pts.browInR).add(new V.Vector3(...pts.browOutR)).multiplyScalar(0.5);
  }
  if (pts[id]) return new V.Vector3(...pts[id]);
  return null;
}

function setStep(n) {
  const f = face(), w = wiz();
  n = Math.max(1, Math.min(3, n));
  if (n >= 2 && !f.anchorsComplete()) return;
  if (n === 2 && w.step === 1) f.deriveLandmarksFromAnchors();
  if (n === 3 && !w.created) {
    const names = f.createFaceBones(w.preset);
    if (!names) return;
    f.setWiz({ step: 3, created: true });
    f.frameFace('front');
    render();
    return;
  }
  f.setWiz({ step: n });
  if (n < 3) { /* sliders stay, poses reset only when leaving 3 via back is handled in render */ }
  f.frameFace('front');
  render();
}

function renderStep1() {
  const f = face(), w = wiz();
  const set = (id) => !!(id === 'mouthC' ? f.mouthCenterWorld() : f.points[id]);
  const html = `
    <div class="wiz-kicker">Schritt 1 von 3: 3 Punkte tippen
      <span class="small">Tippe nacheinander linkes Auge, rechtes Auge und die Mundmitte. Vorschläge liegen schon auf dem Gesicht – du kannst sie auch nur verschieben.</span>
    </div>
    <div class="wiz-plist">
      ${f.ANCHORS.map((a) => {
        const done = set(a.id);
        const current = a.id === w.current && !done;
        const st = done ? 'gesetzt' : current ? 'jetzt tippen' : 'offen';
        return `<button type="button" class="wiz-pi${current ? ' current' : ''}${done ? ' done' : ''}" data-anchor="${a.id}">
          <span class="wiz-n">${done ? '✓' : a.n}</span>
          <span class="wiz-pi-lab">${a.label}</span>
          <span class="wiz-pi-st">${st}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="ed-row">
      <button id="wiz-auto" class="ed-btn sm2">Auto-Erkennen</button>
      <button id="wiz-view" class="ed-btn sm2">Ansicht zentrieren</button>
    </div>
    <div class="ed-row">
      <button id="wiz-next1" class="ed-btn wide primary-outline" ${f.anchorsComplete() ? '' : 'disabled'}>Weiter ›</button>
    </div>`;
  $('#wiz-s1').innerHTML = html;
  $('#wiz-s1').querySelectorAll('[data-anchor]').forEach((b) => b.addEventListener('click', () => { f.setWiz({ current: b.dataset.anchor }); render(); }));
  $('#wiz-auto')?.addEventListener('click', () => { f.autoDetectAnchors(false); render(); });
  $('#wiz-view')?.addEventListener('click', () => f.frameFace('front'));
  $('#wiz-next1')?.addEventListener('click', () => setStep(2));
}

async function refreshTemplates() {
  try { templates = await face().listTemplates(); } catch (e) { templates = []; }
}

function renderStep2() {
  const f = face(), w = wiz();
  const n = f.bonesOfPreset(w.preset).length;
  const opts = templates.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
  const html = `
    <div class="wiz-kicker">Schritt 2 von 3: Knochen prüfen
      <span class="small">Alle Knochen liegen auf dem Gesicht. Ziehe an einem Griff – bei Spiegeln folgt die andere Seite automatisch.</span>
    </div>
    <div class="ed-row">
      <div class="seg" id="wiz-preset">
        <button type="button" data-preset="basis" class="${w.preset === 'basis' ? 'active' : ''}">Basis · 10</button>
        <button type="button" data-preset="erweitert" class="${w.preset === 'erweitert' ? 'active' : ''}">Erweitert · 20</button>
      </div>
    </div>
    <div class="ed-row">
      <button id="wiz-mirror" class="ed-btn toggle sm2${f /* mirror */} ${''}" title="Linke und rechte Knochen gemeinsam verschieben"><span class="dot"></span>Spiegeln L/R</button>
      <div class="small" style="flex:1;padding:0 4px">${n} Knochen platziert</div>
    </div>
    <div class="ed-row">
      <select id="f-tpl" class="f-select" aria-label="Vorlage">${opts || '<option value="">Keine Vorlage</option>'}</select>
      <button id="wiz-tpl-apply" class="ed-btn sm2 grow0" ${templates.length ? '' : 'disabled'}>Anwenden</button>
      <button id="wiz-tpl-save" class="ed-btn sm2 grow0">Vorlage speichern</button>
    </div>
    <div class="ed-row">
      <button id="wiz-back2" class="ed-btn">‹ Zurück</button>
      <button id="wiz-make" class="ed-btn wide primary-outline">Knochen erstellen</button>
    </div>`;
  $('#wiz-s2').innerHTML = html;
  const mir = $('#wiz-mirror');
  // f.mirror is a setter in the API; we need a getter. Use button state from DOM default active.
  // We'll read from a data attr we keep on body or from the button after sync.
  mir.classList.toggle('active', mir.dataset.on !== '0');
  // Default on. Sync from last known:
  if (window.__faceMirror === false) mir.classList.remove('active');
  else mir.classList.add('active');
  $('#wiz-preset')?.querySelectorAll('[data-preset]').forEach((b) => {
    b.addEventListener('click', () => {
      if (f.wiz.created && b.dataset.preset !== w.preset) f.removeFaceBones();
      f.setWiz({ preset: b.dataset.preset, created: false });
      render();
    });
  });
  mir.addEventListener('click', () => {
    window.__faceMirror = !mir.classList.contains('active');
    f.mirror = window.__faceMirror;
    render();
  });
  $('#wiz-back2')?.addEventListener('click', () => setStep(1));
  $('#wiz-make')?.addEventListener('click', () => setStep(3));
  $('#wiz-tpl-save')?.addEventListener('click', async () => {
    const name = window.prompt('Name der Rig-Vorlage:', 'Mein Gesichtsrig');
    if (!name) return;
    await f.saveTemplate(name);
    await refreshTemplates();
    render();
  });
  $('#wiz-tpl-apply')?.addEventListener('click', () => {
    const id = +$('#f-tpl').value;
    const rec = templates.find((t) => t.id === id);
    if (rec) f.applyTemplate(rec);
    render();
  });
}

function renderStep3() {
  const f = face(), w = wiz();
  const bones = f.bonesOfPreset(w.preset);
  const rows = bones.map((b) => {
    const val = w.sliders[b.id] || 0;
    const active = b.id === w.selected ? ' active' : '';
    return `<label class="wiz-srow${active}" data-sid="${b.id}">
      <span class="wiz-sname">${b.label}</span>
      <input type="range" min="0" max="100" step="1" value="${Math.round(val * 100)}" aria-label="${b.label}">
      <span class="time">${val.toFixed(2).replace('.', ',')}</span>
    </label>`;
  }).join('');
  const html = `
    <div class="wiz-kicker">Schritt 3 von 3: Testen
      <span class="small">Gewichte sind berechnet (nur im Kopfbereich). Bewege einen Schieberegler, um den Knochen zu prüfen.</span>
    </div>
    <div class="wiz-sliders">${rows}</div>
    <div class="ed-row">
      <button id="wiz-heat" class="ed-btn toggle sm2"><span class="dot"></span>Einfluss zeigen</button>
      <button id="wiz-zero" class="ed-btn sm2">Alle auf 0</button>
    </div>
    <div class="ed-row">
      <button id="wiz-back3" class="ed-btn">‹ Zurück</button>
      <button id="wiz-done" class="ed-btn wide primary-outline">Fertig ✓</button>
    </div>`;
  $('#wiz-s3').innerHTML = html;
  $('#wiz-s3').querySelectorAll('.wiz-srow').forEach((row) => {
    const id = row.dataset.sid;
    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      const v = +input.value / 100;
      const before = { ...w.sliders };
      f.slider(id, v);
      f.setWiz({ selected: id });
      row.querySelector('.time').textContent = v.toFixed(2).replace('.', ',');
      $('#wiz-s3').querySelectorAll('.wiz-srow').forEach((r) => r.classList.toggle('active', r === row));
    });
    input.addEventListener('change', () => {
      const v = +input.value / 100;
      const after = { ...face().wiz.sliders };
      // undo one slider change on release
      const prev = window.__lastSliders || {};
      f.pushHist?.('Regler', () => { f.setWiz({ sliders: { ...prev } }); f.applyBoneSliders(); render(); }, () => { f.setWiz({ sliders: after }); f.applyBoneSliders(); render(); });
      window.__lastSliders = { ...after };
    });
  });
  window.__lastSliders = { ...w.sliders };
  $('#wiz-zero')?.addEventListener('click', () => {
    const before = { ...w.sliders };
    const after = {};
    f.setWiz({ sliders: after });
    f.applyBoneSliders();
    f.pushHist?.('Alle auf 0', () => { f.setWiz({ sliders: before }); f.applyBoneSliders(); render(); }, () => { f.setWiz({ sliders: after }); f.applyBoneSliders(); render(); });
    render();
  });
  $('#wiz-back3')?.addEventListener('click', () => {
    // Knochen bleiben, zurück zum Prüfen
    f.setWiz({ sliders: {} });
    f.applyBoneSliders();
    f.setWiz({ step: 2 });
    f.frameFace('front');
    render();
  });
  $('#wiz-done')?.addEventListener('click', () => {
    $('#face')?.classList.add('collapsed');
    $('#face')?.querySelector('.collapse-btn')?.setAttribute('aria-expanded', 'false');
    render();
  });
  $('#wiz-heat')?.addEventListener('click', (e) => {
    const on = e.currentTarget.classList.toggle('active');
    const ed = viewer().editor;
    if (!ed) return;
    const def = bones.find((b) => b.id === (wiz().selected || 'jaw'));
    if (def) ed.selectByName?.(def.name);
    ed.setHeat?.(on);
  });
}

function renderPips() {
  const w = wiz();
  document.querySelectorAll('#face .wiz-pip').forEach((p) => {
    const n = +p.dataset.goto;
    p.classList.toggle('active', w.step === n);
    p.classList.toggle('done', w.step > n);
  });
  document.querySelectorAll('#face .wiz-rail').forEach((r) => r.classList.toggle('on', w.step > +r.dataset.rail));
  $('#wiz-s1')?.classList.toggle('hidden', w.step !== 1);
  $('#wiz-s2')?.classList.toggle('hidden', w.step !== 2);
  $('#wiz-s3')?.classList.toggle('hidden', w.step !== 3);
}

function render() {
  const f = face();
  if (!f || !f.active || f.SHOW_MORPH_UI) {
    $('#wiz-layer')?.classList.add('hidden');
    return;
  }
  renderPips();
  if (wiz().step === 1) renderStep1();
  if (wiz().step === 2) renderStep2();
  if (wiz().step === 3) renderStep3();
  updateHandles();
}

function updateHandles() {
  const f = face();
  const layer = $('#wiz-layer'), box = $('#wiz-handles'), svg = $('#wiz-lines');
  if (!f || !f.active || f.SHOW_MORPH_UI || !box) { layer?.classList.add('hidden'); return; }
  layer.classList.remove('hidden');
  const w = wiz();
  box.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  svg.style.width = '100%'; svg.style.height = '100%';
  svg.innerHTML = '';
  if (w.step === 1) {
    for (const a of f.ANCHORS) {
      const world = worldOf(a.id, f);
      if (!world) continue;
      const s = toScreen(world);
      if (!s.ok) continue;
      const done = !!(a.id === 'mouthC' ? f.mouthCenterWorld() : f.points[a.id]);
      const current = a.id === w.current && !done;
      const cls = current ? 'current' : done ? 'done' : 'pending';
      const off = OFFSET1[a.id] || [0, 18];
      const el = document.createElement('div');
      el.className = `wiz-h ${cls}`;
      el.dataset.id = a.id;
      el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
      el.innerHTML = `<span class="wiz-dot">${done ? '✓' : a.n}</span><span class="wiz-lab" style="transform:translate(${off[0]}px,${off[1] - 22}px)">${a.label}</span>`;
      box.appendChild(el);
    }
    return;
  }
  const bones = f.bonesOfPreset(w.preset);
  const pts = [];
  for (const b of bones) {
    const world = worldOf(b.src || b.id, f);
    if (!world) continue;
    const s = toScreen(world);
    if (!s.ok) continue;
    pts.push({ b, s });
    const current = b.id === w.selected;
    const pairOn = window.__faceMirror !== false && w.selected && (b.id === w.selected || b.pair === w.selected);
    const off = OFFSET2[b.id] || [0, 18];
    const showLab = w.step === 2 || current;
    const el = document.createElement('div');
    el.className = `wiz-h bone${current ? ' current' : ''}${pairOn ? ' pair-on' : ''}`;
    el.dataset.id = b.src || b.id;
    el.dataset.bone = b.id;
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
    el.innerHTML = `<span class="wiz-dot" style="background:${b.color}"></span>${showLab ? `<span class="wiz-lab" style="transform:translate(${off[0]}px,${off[1] - 14}px)">${b.label}</span>` : ''}`;
    box.appendChild(el);
  }
  if (window.__faceMirror !== false && w.step === 2) {
    const seen = new Set();
    for (const { b, s } of pts) {
      if (!b.pair || seen.has(b.id)) continue;
      const other = pts.find((p) => p.b.id === b.pair);
      if (!other) continue;
      seen.add(b.id); seen.add(b.pair);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', s.x); line.setAttribute('y1', s.y);
      line.setAttribute('x2', other.s.x); line.setAttribute('y2', other.s.y);
      line.setAttribute('stroke', 'rgba(91,124,255,.55)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '4 4');
      svg.appendChild(line);
    }
  }
}

function bindPointers() {
  const canvas = $('#view');
  const layer = $('#wiz-layer');
  const startDrag = (id, e, boneId) => {
    const f = face();
    if (!f?.active) return;
    e.preventDefault(); e.stopPropagation();
    const before = f.snapshotPoints();
    drag = { id, boneId, before, moved: false, pointerId: e.pointerId };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (err) { /* ok */ }
    viewer().controls && (viewer().controls.enabled = false);
  };
  layer.addEventListener('pointerdown', (e) => {
    const h = e.target.closest?.('.wiz-h');
    if (!h) return;
    startDrag(h.dataset.id, e, h.dataset.bone);
    const f = face();
    if (h.dataset.bone) f.setWiz({ selected: h.dataset.bone, current: h.dataset.id });
    else f.setWiz({ current: h.dataset.id });
  });
  const move = (e) => {
    if (!drag) return;
    const f = face();
    const hit = f.pick(e);
    if (hit) { f.placePoint(drag.id, hit.point, hit.normal); drag.moved = true; updateHandles(); }
  };
  const up = (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (viewer().controls) viewer().controls.enabled = true;
    const f = face();
    if (d.moved) {
      const after = f.snapshotPoints();
      f.pushHist('Punkt verschoben', () => { f.restorePoints(d.before); f.rigChanged(); render(); }, () => { f.restorePoints(after); f.rigChanged(); render(); });
      f.rigChanged();
    }
    render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerdown', (e) => {
    const f = face();
    if (!f?.active || f.SHOW_MORPH_UI || wiz().step !== 1) return;
    if (e.button > 0 || !e.isPrimary) return;
    // Start a potential tap; commit on pointerup if little movement
    const t = { x: e.clientX, y: e.clientY, t: performance.now() };
    const upTap = (ev) => {
      canvas.removeEventListener('pointerup', upTap);
      if (Math.hypot(ev.clientX - t.x, ev.clientY - t.y) > 8 || performance.now() - t.t > 500) return;
      const hit = f.pick(ev);
      if (!hit) return;
      ev.preventDefault(); ev.stopPropagation();
      const id = wiz().current || 'eyeL';
      const before = f.snapshotPoints();
      f.placePoint(id, hit.point, hit.normal);
      const after = f.snapshotPoints();
      f.pushHist('Punkt gesetzt', () => { f.restorePoints(before); f.rigChanged(); render(); }, () => { f.restorePoints(after); f.rigChanged(); render(); });
      // advance current to next unset
      const order = f.ANCHORS.map((a) => a.id);
      const next = order.find((k) => k !== id && !(k === 'mouthC' ? f.mouthCenterWorld() : f.points[k])) || id;
      f.setWiz({ current: next });
      f.rigChanged();
      render();
    };
    canvas.addEventListener('pointerup', upTap);
  }, true);
}

function bindChrome() {
  document.querySelectorAll('#face .wiz-pip').forEach((b) => {
    b.addEventListener('click', () => setStep(+b.dataset.goto));
  });
}

async function boot() {
  const wait = () => new Promise((r) => {
    const t = setInterval(() => { if (window.__viewer?.face?.setWizardHooks) { clearInterval(t); r(); } }, 40);
  });
  await wait();
  const f = face();
  if (f.SHOW_MORPH_UI) return;
  window.__faceMirror = true;
  f.setWizardHooks({ render, updateHandles });
  bindChrome();
  bindPointers();
  await refreshTemplates();
  // If already active (hot reload), paint
  window.__renderWizard = render;
  if (f.active) render();
}

boot();
