'use strict';
// PROTOTYPE - NOT FOR PRODUCTION
// Question: Một game bắn súng góc nhìn thứ nhất sinh tồn (battle royale) chơi trên web có vui không?
// Date: 2026-11-26
// core.js: tuning, random, screens (3D + interface), input (keys, mouse, touch) and sound.

// ---- Built to be checked ----------------------------------------------------------------
const params = new URLSearchParams(location.search);
const tune = new Proxy({}, { get: (_, k) => CONFIG[k].value }); // live: tune.x is CONFIG.x.value
const STEP = 1 / 60;            // simulation step in seconds; motion is per second, never per frame
const FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, "DejaVu Sans", sans-serif';
const TITLE = 'Đảo Sinh Tồn';
const clock = window.GAME_CLOCK || { now: () => performance.now() / 1000 }; // a check may inject one
const CHEAP = params.get('render') === 'cheap';
let seed = 1;
function rng() { // mulberry32; every gameplay random call reads this, never Math.random
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const events = [];
function vhash(x, y) { // a fixed hash for looks only: never gameplay
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const pick = arr => arr[Math.floor(rng() * arr.length)];
const gauss = () => (rng() + rng() + rng() - 1.5) / 1.5; // about -1..1, centred
function angDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ---- Screens: the 3D canvas underneath, the interface canvas on top ----------------------
const glCanvas = document.getElementById('gl');
const hud = document.getElementById('hud');
const ctx = hud.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: !CHEAP, powerPreference: 'high-performance' });
renderer.autoClear = false;
const scene3 = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(78, 1, 0.08, 1700);
camera.rotation.order = 'YXZ';
const vmScene = new THREE.Scene();                       // the hands and gun, drawn on top
const vmCam = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
let VW = 0, VH = 0, DPR = 1, U = 1;
function fit() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = window.innerWidth; VH = window.innerHeight;
  hud.width = Math.round(VW * DPR); hud.height = Math.round(VH * DPR);
  hud.style.width = VW + 'px'; hud.style.height = VH + 'px';
  renderer.setPixelRatio(CHEAP ? 0.5 : Math.min(DPR, 1.5));
  renderer.setSize(VW, VH, false);
  glCanvas.style.width = VW + 'px'; glCanvas.style.height = VH + 'px';
  camera.aspect = vmCam.aspect = VW / VH;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  U = clamp(Math.min(VW / 1100, VH / 620), 0.72, 1.7);
}
addEventListener('resize', fit); fit();
function screenSpace() { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
function text(s, x, y, size, color, align = 'center', weight = 'bold') {
  size = Math.round(size);
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2, size * 0.2); ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function textW(s, size, weight = 'bold') { ctx.font = `${weight} ${Math.round(size)}px ${FONT}`; return ctx.measureText(s).width; }
function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function panel(x, y, w, h, alpha = 0.55) { ctx.fillStyle = `rgba(8,10,16,${alpha})`; rrect(ctx, x, y, w, h, 6 * U); ctx.fill(); }
function circle(g, x, y, r, fill, stroke, lw = 1) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

// ---- Input: keys by position (event.code), mouse buttons as Mouse0/Mouse2 ---------------
const down = new Set(), hit = new Set();
const pressed = code => hit.has(code);
const ACTIONS = {
  fwd: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  lookL: ['ArrowLeft'], lookR: ['ArrowRight'], lookU: ['ArrowUp'], lookD: ['ArrowDown'],
  sprint: ['ShiftLeft', 'ShiftRight'], jump: ['Space'], crouch: ['KeyC', 'ControlLeft'],
  reload: ['KeyR'], use: ['KeyE', 'KeyF'], slot1: ['Digit1'], slot2: ['Digit2'], swap: ['KeyX', 'Wheel'],
  heal: ['KeyQ'], map: ['KeyM', 'Tab'], fire: ['Mouse0', 'KeyJ'], aim: ['Mouse2', 'KeyK'], aimT: ['TouchAim'],
  ok: ['Enter', 'NumpadEnter'], pause: ['KeyP'], mute: ['KeyN'],
};
const held = a => ACTIONS[a].some(c => down.has(c));
const tapped = a => ACTIONS[a].some(c => hit.has(c));
const look = { dx: 0, dy: 0 };          // mouse or finger movement since the last step, in pixels
const stick = { x: 0, y: 0, m: 0 };
let locked = false, wasLocked = false;
addEventListener('keydown', e => {
  startAudio();
  if (!e.repeat) { down.add(e.code); hit.add(e.code); }
  if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => down.delete(e.code));
addEventListener('blur', () => down.clear());
addEventListener('contextmenu', e => e.preventDefault());
glCanvas.addEventListener('mousedown', e => {
  startAudio();
  if (touchOn) return;
  if (scene === 'play' && !locked && wantLock) lockPointer();
  if (scene !== 'play') { hit.add('Enter'); return; }
  down.add('Mouse' + e.button); hit.add('Mouse' + e.button);
});
addEventListener('mouseup', e => down.delete('Mouse' + e.button));
addEventListener('mousemove', e => { if (locked) { look.dx += e.movementX; look.dy += e.movementY; } });
addEventListener('wheel', e => { if (scene === 'play') hit.add('Wheel'); }, { passive: true });
let wantLock = false;
function lockPointer() {
  if (touchOn || !glCanvas.requestPointerLock) return;
  wantLock = true;
  try { const p = glCanvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed here */ }
}
function unlockPointer() { wantLock = false; if (document.pointerLockElement) document.exitPointerLock(); }
document.addEventListener('pointerlockchange', () => {
  locked = !!document.pointerLockElement;
  if (!locked) { down.delete('Mouse0'); down.delete('Mouse2'); }
  if (!locked && wasLocked && scene === 'play') scene = 'pause';
  wasLocked = locked;
});

// Touch: a stick on the left, drag anywhere else on the right to look, buttons on the right
const touchUI = document.getElementById('touch');
let touchOn = false;
addEventListener('touchstart', () => { touchOn = true; }, { passive: true });
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) touchOn = true;
glCanvas.addEventListener('touchstart', () => { startAudio(); if (scene !== 'play') hit.add('Enter'); }, { passive: true });
const stickZone = document.getElementById('stickzone'), stickBase = document.getElementById('stickbase'), knob = document.getElementById('knob');
let stickId = null, sx0 = 0, sy0 = 0;
function moveStick(e) {
  let dx = (e.clientX - sx0) / 50, dy = (e.clientY - sy0) / 50;
  const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }
  stick.x = dx; stick.y = dy; stick.m = Math.min(1, m);
  knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
}
stickZone.addEventListener('pointerdown', e => {
  e.preventDefault(); startAudio(); stickId = e.pointerId; stickZone.setPointerCapture(e.pointerId);
  sx0 = e.clientX; sy0 = e.clientY;
  stickBase.style.left = sx0 - 60 + 'px'; stickBase.style.top = sy0 - 60 + 'px'; stickBase.style.display = 'block';
  moveStick(e);
});
stickZone.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
const endStick = e => {
  if (e.pointerId !== stickId) return;
  stickId = null; stick.x = stick.y = stick.m = 0; stickBase.style.display = 'none'; knob.style.transform = '';
};
stickZone.addEventListener('pointerup', endStick); stickZone.addEventListener('pointercancel', endStick);
const lookZone = document.getElementById('lookzone'), lookIds = new Map();
lookZone.addEventListener('pointerdown', e => { e.preventDefault(); startAudio(); lookZone.setPointerCapture(e.pointerId); lookIds.set(e.pointerId, [e.clientX, e.clientY]); });
lookZone.addEventListener('pointermove', e => {
  const p = lookIds.get(e.pointerId); if (!p) return;
  const k = tune.touch_sens / tune.mouse_sens;
  look.dx += (e.clientX - p[0]) * k; look.dy += (e.clientY - p[1]) * k; p[0] = e.clientX; p[1] = e.clientY;
});
const endLook = e => lookIds.delete(e.pointerId);
lookZone.addEventListener('pointerup', endLook); lookZone.addEventListener('pointercancel', endLook);
for (const b of document.querySelectorAll('#touch [data-code]')) {
  const code = b.dataset.code;
  let last = null;
  const off = () => { down.delete(code); b.classList.remove('on'); last = null; };
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); startAudio(); b.setPointerCapture(e.pointerId);
    down.add(code); hit.add(code); b.classList.add('on'); last = [e.clientX, e.clientY];
  });
  b.addEventListener('pointermove', e => { // the fire button also turns the view, like a look pad
    if (!last || code !== 'Mouse0') return;
    const k = tune.touch_sens / tune.mouse_sens;
    look.dx += (e.clientX - last[0]) * k; look.dy += (e.clientY - last[1]) * k; last = [e.clientX, e.clientY];
  });
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
  b.addEventListener('lostpointercapture', off);
}

// ---- Sound: synthesised; started on first input; N mutes ----------------------------------
let audio = null, muted = false, sfxN = 0;
function startAudio() {
  if (!audio) {
    const ac = window.GAME_AUDIO || new (window.AudioContext || window.webkitAudioContext)();
    const out = ac.createGain(); out.gain.value = muted ? 0 : tune.volume; out.connect(ac.destination);
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = vhash(i, 7) * 2 - 1;
    audio = { ac, out, noise: nb };
    // held sounds: the plane's drone and the wind of a fall
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    const dg = ac.createGain(); dg.gain.value = 0; o.connect(lp); lp.connect(dg); dg.connect(out); o.start();
    const ws = ac.createBufferSource(); ws.buffer = nb; ws.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    const wg = ac.createGain(); wg.gain.value = 0; ws.connect(bp); bp.connect(wg); wg.connect(out); ws.start();
    audio.drone = dg; audio.wind = wg; audio.windF = bp.frequency;
  }
  if (audio.ac.state === 'suspended') audio.ac.resume();
}
function setMuted(m) { muted = m; if (audio) audio.out.gain.setTargetAtTime(m ? 0 : tune.volume, audio.ac.currentTime, 0.02); }
addEventListener('tune', () => setMuted(muted));
function level(param, v, tc = 0.05) { if (audio) param.setTargetAtTime(v, audio.ac.currentTime, tc); }
function tone(freq, dur, type = 'square', vol = 0.2, delay = 0, slide = 0) {
  if (!audio || muted || vol < 0.003) return;
  const ac = audio.ac, t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(audio.out); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.3, freq = 1200, delay = 0) {
  if (!audio || muted || vol < 0.003) return;
  const ac = audio.ac, t = ac.currentTime + delay, s = ac.createBufferSource();
  s.buffer = audio.noise;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(audio.out);
  s.start(t, vhash(sfxN++, 3) * 1.5); s.stop(t + dur + 0.02);
}
const GUNSOUND = { // noise length, loudness, brightness, thump pitch
  pistol: [0.16, 0.5, 2600, 150], rifle: [0.2, 0.55, 2000, 110], shotgun: [0.38, 0.75, 1300, 70], sniper: [0.6, 0.8, 1700, 60],
};
const sfx = {
  shot(kind, dist) { // dist 0 is your own gun; far shots are quieter and duller
    const [d, v, f, th] = GUNSOUND[kind], k = dist ? clamp(1 - dist / 320, 0, 1) ** 1.5 * 0.7 : 1;
    if (k <= 0.01) return;
    noise(d * (dist ? 1.4 : 1), v * k, dist > 60 ? f * 0.35 : f); tone(th, 0.12, 'sine', 0.5 * k, 0, -30);
  },
  hit: () => tone(1500, 0.05, 'square', 0.12),
  head: () => { tone(1900, 0.05, 'square', 0.14); tone(2500, 0.07, 'square', 0.1, 0.04); },
  kill: () => [880, 1320].forEach((f, i) => tone(f, 0.12, 'triangle', 0.25, i * 0.08)),
  hurt: () => { tone(160, 0.15, 'sawtooth', 0.22, 0, -60); noise(0.08, 0.2, 600); },
  armor: () => noise(0.07, 0.25, 4000),
  empty: () => tone(900, 0.03, 'square', 0.12),
  reload: () => { noise(0.05, 0.25, 3000); noise(0.05, 0.25, 2500, 0.35); tone(400, 0.04, 'square', 0.1, 0.4); },
  pick: () => { tone(660, 0.05, 'triangle', 0.18); tone(990, 0.07, 'triangle', 0.18, 0.05); },
  heal: () => [523, 659, 784].forEach((f, i) => tone(f, 0.1, 'triangle', 0.18, i * 0.08)),
  land: () => { noise(0.15, 0.4, 500); tone(70, 0.15, 'sine', 0.35); },
  chute: () => { noise(0.4, 0.4, 900); tone(200, 0.3, 'sine', 0.15, 0, -80); },
  jump: () => noise(0.06, 0.12, 1500),
  step: () => noise(0.04, 0.07, 700),
  zone: () => [440, 330].forEach((f, i) => tone(f, 0.25, 'square', 0.12, i * 0.25)),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.17, i * 0.11)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, 'square', 0.17, i * 0.15)),
  start: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.1, 'square', 0.16, i * 0.08)),
};
