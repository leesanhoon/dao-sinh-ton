'use strict';
// game.js: guns, characters, bots, loot, the zone, the plane, drawing, HUD, scenes and the loop.

let S = null, scene = 'title', uid = 0;
const R = 0.35;                                                  // character radius
const GUNS = {
  fist: { name: 'Tay không', ammo: null, dmg: 15, rate: 0.45, auto: false, mag: 0, reload: 0, spread: 0, aimSpread: 0, pellets: 1, range: 1.9, recoil: 0.01, zoom: 1, melee: true },
  pistol: { name: 'Súng lục', ammo: '9mm', dmg: 24, rate: 0.2, auto: false, mag: 12, reload: 1.5, spread: 0.014, aimSpread: 0.004, pellets: 1, range: 60, recoil: 0.022, zoom: 1.25 },
  rifle: { name: 'Súng trường', ammo: '5.56', dmg: 21, rate: 0.095, auto: true, mag: 30, reload: 2.3, spread: 0.028, aimSpread: 0.006, pellets: 1, range: 140, recoil: 0.013, zoom: 1.6 },
  shotgun: { name: 'Súng săn', ammo: '12', dmg: 13, rate: 0.85, auto: false, mag: 5, reload: 2.6, spread: 0.065, aimSpread: 0.05, pellets: 9, range: 22, recoil: 0.07, zoom: 1.2 },
  sniper: { name: 'Súng bắn tỉa', ammo: '7.62', dmg: 90, rate: 1.35, auto: false, mag: 5, reload: 3, spread: 0.06, aimSpread: 0.0005, pellets: 1, range: 400, recoil: 0.08, zoom: 4, scope: true },
};
const AMMO_NAME = { '9mm': 'Đạn 9mm', '5.56': 'Đạn 5.56', '12': 'Đạn ghém', '7.62': 'Đạn 7.62' };
const AMMO_PILE = { '9mm': 24, '5.56': 45, '12': 10, '7.62': 10 };
const BOT_PREF = { fist: 0, pistol: 1, sniper: 2, shotgun: 3, rifle: 4 };
const NAMES = ['Tèo', 'Tí', 'Sửu', 'Dần', 'Mẹo', 'Bin', 'Bo', 'Cò', 'Lụa', 'Mít', 'Na', 'Ổi', 'Bưởi', 'Cam', 'Quýt', 'Mận', 'Sầu', 'Lựu', 'Khế', 'Me', 'Chôm', 'Nhãn', 'Vải', 'Xoài', 'Dừa', 'Đào', 'Hồng', 'Lê', 'Táo', 'Sung', 'Su', 'Cốm', 'Gạo', 'Bắp', 'Đậu', 'Mè', 'Kem', 'Kẹo', 'Bánh', 'Chè'];
const SHIRTS = ['#d64541', '#2e86de', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#e84393', '#34495e', '#c0392b', '#7f8c8d', '#d35400', '#1abc9c'];
const PANTS = ['#2c3e50', '#3d4f5c', '#4a3b2c', '#2d3a2a', '#555b66'];
const SKINS = ['#e8b48a', '#d9a173', '#c68b5e', '#f0c7a0'];
const ZONE_R = [1, 0.62, 0.38, 0.22, 0.12, 0.05, 0];
const ZONE_DMG = [1, 1.5, 2.5, 4, 6, 9, 12];

// ---- Models: merged boxes and cylinders with vertex colours ------------------------------------
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const lamV = new THREE.MeshLambertMaterial({ vertexColors: true });
const B = (x, y, z, sx, sy, sz, hex, rx = 0, ry = 0, rz = 0) => [BOX, hex, M4(x, y, z, rx, ry, rz, sx, sy, sz)];
const C = (x, y, z, d, len, hex) => [CYL, hex, M4(x, y, z, Math.PI / 2, 0, 0, d, len, d)]; // along Z
const MET = '#2a2d31', MET2 = '#41464d', WOOD = '#8a5a32';
const GUN_PARTS = { // origin at the grip, barrel toward -Z, metres
  pistol: [B(0, 0.04, -0.07, 0.035, 0.045, 0.2, MET2), B(0, -0.03, 0.0, 0.032, 0.11, 0.05, MET, 0.25), B(0, 0.07, -0.16, 0.008, 0.012, 0.01, MET)],
  rifle: [B(0, 0.03, -0.12, 0.055, 0.08, 0.42, MET), C(0, 0.045, -0.55, 0.025, 0.36, MET2), B(0, 0.03, -0.38, 0.065, 0.065, 0.2, WOOD), B(0, 0.0, 0.22, 0.05, 0.1, 0.26, WOOD), B(0, -0.08, -0.14, 0.04, 0.15, 0.06, MET2, -0.3), B(0, -0.04, 0.0, 0.035, 0.1, 0.05, MET, 0.3), B(0, 0.09, -0.1, 0.02, 0.04, 0.05, MET), B(0, 0.085, -0.5, 0.012, 0.04, 0.012, MET)],
  shotgun: [B(0, 0.03, -0.1, 0.06, 0.08, 0.32, MET), C(0, 0.055, -0.5, 0.03, 0.56, MET2), C(0, 0.015, -0.42, 0.028, 0.4, MET), B(0, 0.01, -0.38, 0.065, 0.06, 0.18, WOOD), B(0, -0.01, 0.23, 0.05, 0.11, 0.3, WOOD), B(0, -0.04, 0.0, 0.035, 0.1, 0.05, WOOD, 0.3)],
  sniper: [B(0, 0.03, -0.1, 0.055, 0.075, 0.4, MET), C(0, 0.04, -0.68, 0.024, 0.66, MET2), B(0, 0.0, 0.25, 0.055, 0.11, 0.32, '#5a6b3a'), B(0, 0.02, -0.3, 0.06, 0.06, 0.25, '#5a6b3a'), C(0, 0.12, -0.12, 0.05, 0.32, '#1c1e21'), B(0, 0.09, -0.12, 0.02, 0.04, 0.12, MET), B(0, -0.04, 0.0, 0.035, 0.1, 0.05, MET, 0.3), B(0.05, 0.04, 0.02, 0.06, 0.015, 0.015, MET2)],
};
const GEO = {};
function buildModels() {
  for (const k in GUN_PARTS) GEO[k] = mergeParts(GUN_PARTS[k]);
  GEO.ammo = mergeParts([B(0, 0.1, 0, 0.36, 0.2, 0.24, '#5a6b3a'), B(0, 0.205, 0, 0.3, 0.01, 0.18, '#e0c341')]);
  GEO.armor = mergeParts([B(0, 0.08, 0, 0.5, 0.16, 0.42, '#4b5a33'), B(0, 0.17, 0, 0.3, 0.03, 0.28, '#3b4728')]);
  GEO.band = mergeParts([B(0, 0.06, 0, 0.26, 0.12, 0.18, '#f4f4f4'), B(0, 0.121, 0, 0.12, 0.005, 0.04, '#d63031'), B(0, 0.121, 0, 0.04, 0.005, 0.12, '#d63031')]);
  GEO.vest = mergeParts([B(0, 1.15, 0, 0.56, 0.48, 0.34, '#4b5a33')]);
  GEO.leg = mergeParts([B(0, -0.42, 0, 0.19, 0.86, 0.21, '#ffffff'), B(0, -0.82, -0.04, 0.2, 0.08, 0.28, '#2b2118')]);
  GEO.canopy = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2.4);
  GEO.plane = mergeParts([C(0, 0, 0, 3.2, 22, '#d9dde2'), B(0, 0.3, -0.5, 26, 0.35, 3.2, '#c9ced4'), B(0, 1.8, 9.5, 0.3, 3.4, 2.6, '#c0392b'), B(0, 0.6, 10, 8, 0.25, 1.8, '#c9ced4'), B(0, 0.2, -11.3, 1.6, 1.6, 0.8, '#2a2d31'), B(6.5, -0.6, -1.5, 1.2, 1.2, 3, '#7f8c8d'), B(-6.5, -0.6, -1.5, 1.2, 1.2, 3, '#7f8c8d'), B(0, 0.6, -7, 2.2, 0.8, 2.4, '#253a4f')]);
}
function bodyGeo(c) {
  return mergeParts([
    B(0, 1.15, 0, 0.5, 0.6, 0.28, c.shirt), B(0, 1.6, 0, 0.26, 0.28, 0.26, c.skin), B(0, 1.75, 0.01, 0.28, 0.08, 0.28, c.hat),
    B(0, 1.62, -0.135, 0.18, 0.04, 0.01, '#1b1b1b'), B(0, 1.12, 0.22, 0.36, 0.44, 0.16, '#6b5233'),
    B(0.22, 1.25, -0.2, 0.12, 0.12, 0.46, c.shirt), B(-0.1, 1.24, -0.3, 0.12, 0.12, 0.5, c.shirt, 0, -0.5),
    B(0.14, 1.25, -0.45, 0.09, 0.09, 0.09, c.skin), B(-0.02, 1.27, -0.6, 0.09, 0.09, 0.09, c.skin),
  ]);
}
function charMesh(c) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const upper = new THREE.Group();
  upper.add(new THREE.Mesh(bodyGeo(c), lamV));
  c.vestM = new THREE.Mesh(GEO.vest, lamV); upper.add(c.vestM);
  c.gunM = new THREE.Mesh(GEO.rifle, lamV); c.gunM.position.set(0.14, 1.3, -0.46); upper.add(c.gunM);
  c.flashM = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: '#ffe38a' })); c.flashM.scale.set(0.12, 0.12, 0.2); upper.add(c.flashM);
  const legMat = new THREE.MeshLambertMaterial({ color: c.pants });
  c.legs = [0.12, -0.12].map(x => { const l = new THREE.Mesh(GEO.leg, legMat); l.position.set(x, 0.86, 0); g.add(l); return l; });
  g.add(upper); c.upper = upper;
  c.canopyM = new THREE.Mesh(GEO.canopy, new THREE.MeshLambertMaterial({ color: c.chute, side: THREE.DoubleSide }));
  c.canopyM.scale.set(3.2, 1.6, 2.6); c.canopyM.position.y = 6; g.add(c.canopyM);
  scene3.add(g);
  return g;
}

// ---- Characters --------------------------------------------------------------------------------
function makeChar(isPlayer, name) {
  return {
    id: ++uid, isPlayer, name, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0,
    hp: tune.player_hp, armor: 0, guns: [null, null], cur: 0, ammo: { '9mm': 0, '5.56': 0, '12': 0, '7.62': 0 }, bands: 0,
    alive: true, phase: 'plane', ground: false, crouch: false, swim: false, kills: 0, fireT: 0, reloadT: 0, healT: 0,
    aim: false, recoil: 0, walk: 0, flashT: 0, deadT: 0, killer: null, stepT: 0,
    shirt: isPlayer ? '#ff8c1a' : pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hat: rng() < 0.5 ? '#1b1410' : pick(['#2d3a2a', '#c0392b', '#2e86de', '#e9d39a']),
    chute: pick(['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6', '#ff7f50', '#ecf0f1']),
  };
}
const gunOf = c => c.guns[c.cur];
const gunType = c => (c.guns[c.cur] ? c.guns[c.cur].type : 'fist');
const eyeY = c => c.y + (c.crouch ? 1.12 : 1.62);
const heightOf = c => (c.crouch ? 1.25 : 1.8);
function viewDir(yaw, pitch) { const cp = Math.cos(pitch); return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]; }
function collideXZ(c) {
  const hgt = heightOf(c);
  for (let it = 0; it < 2; it++) boxesNear(c.x, c.z, 1, b => {
    if (c.y + 0.45 >= b[4] || c.y + hgt <= b[1]) return;
    const px = clamp(c.x, b[0], b[3]), pz = clamp(c.z, b[2], b[5]);
    const dx = c.x - px, dz = c.z - pz, d = Math.hypot(dx, dz);
    if (d >= R) return;
    if (d < 1e-4) {
      const l = c.x - b[0], r = b[3] - c.x, u = c.z - b[2], w = b[5] - c.z, m = Math.min(l, r, u, w);
      if (m === l) c.x = b[0] - R; else if (m === r) c.x = b[3] + R; else if (m === u) c.z = b[2] - R; else c.z = b[5] + R;
      return;
    }
    const nx = dx / d, nz = dz / d;
    c.x += nx * (R - d); c.z += nz * (R - d);
    const vn = c.vx * nx + c.vz * nz; if (vn < 0) { c.vx -= vn * nx; c.vz -= vn * nz; }
  });
  c.x = clamp(c.x, -HALF + 5, HALF - 5); c.z = clamp(c.z, -HALF + 5, HALF - 5);
}
function floorAt(c) {
  let f = groundH(c.x, c.z);
  c.swim = f < WATER_STAND; if (c.swim) f = WATER_STAND;
  const r = R * 0.7;
  boxesNear(c.x, c.z, 0.5, b => {
    if (c.x + r < b[0] || c.x - r > b[3] || c.z + r < b[2] || c.z - r > b[5]) return;
    if (b[4] <= c.y + 0.46 && b[4] > f) f = b[4];
  });
  return f;
}
function moveChar(c, dt, wx, wz) {
  const k = c.ground ? 12 : 2.5;
  c.vx += (wx - c.vx) * Math.min(1, k * dt); c.vz += (wz - c.vz) * Math.min(1, k * dt);
  c.vy -= tune.gravity * dt;
  c.x += c.vx * dt; c.z += c.vz * dt;
  collideXZ(c);
  c.y += c.vy * dt;
  const f = floorAt(c);
  if (c.y <= f) { c.y = f; c.vy = 0; c.ground = true; }
  else if (c.ground && c.y - f < 0.5 && c.vy <= 0) { c.y = f; c.vy = 0; }
  else c.ground = false;
  if (c.swim) c.crouch = false;
}
function airMove(c, dt, wx, wz) { // free fall and parachute
  const chute = c.phase === 'chute', top = chute ? tune.chute_glide : tune.fall_glide;
  const m = Math.hypot(wx, wz); if (m > top) { wx *= top / m; wz *= top / m; }
  c.vx += (wx - c.vx) * Math.min(1, dt * (chute ? 1.5 : 1)); c.vz += (wz - c.vz) * Math.min(1, dt * (chute ? 1.5 : 1));
  const want = chute ? -tune.chute_speed : -tune.fall_speed * (c.dive || 1);
  c.vy += (want - c.vy) * Math.min(1, dt * (chute ? 2 : 1.2));
  c.x = clamp(c.x + c.vx * dt, -HALF + 5, HALF - 5); c.z = clamp(c.z + c.vz * dt, -HALF + 5, HALF - 5); c.y += c.vy * dt;
  const g = groundH(c.x, c.z);
  if (!chute && c.y - g <= tune.chute_height) { c.phase = 'chute'; if (c.isPlayer) sfx.chute(); }
  if (chute) {
    const f = floorAt(c);
    if (c.y <= f + 0.02) {
      c.y = f; c.vy = 0; c.phase = 'ground'; c.ground = true; c.vx *= 0.3; c.vz *= 0.3;
      if (c.isPlayer) { sfx.land(); events.push({ type: 'land', x: Math.round(c.x), z: Math.round(c.z) }); }
    }
  }
}

// ---- Loot ----------------------------------------------------------------------------------------
function addLoot(kind, type, n, x, y, z) {
  const it = { id: ++uid, kind, type, n, x, y, z, claim: 0 };
  const geo = kind === 'gun' ? GEO[type] : GEO[kind];
  it.mesh = new THREE.Mesh(geo, lamV);
  it.mesh.position.set(x, y + (kind === 'gun' ? 0.06 : 0.01), z);
  it.mesh.rotation.set(kind === 'gun' ? Math.PI / 2 : 0, vhash(it.id, 5) * 6.28, 0, 'YXZ');
  if (kind === 'gun') it.mesh.rotation.set(0, vhash(it.id, 5) * 6.28, Math.PI / 2, 'YXZ');
  scene3.add(it.mesh);
  S.loot.push(it);
  return it;
}
function removeLoot(it) { scene3.remove(it.mesh); S.loot.splice(S.loot.indexOf(it), 1); }
function lootName(it) {
  if (it.kind === 'gun') return GUNS[it.type].name;
  if (it.kind === 'ammo') return AMMO_NAME[it.type] + ' x' + it.n;
  if (it.kind === 'armor') return 'Áo giáp (' + it.n + ')';
  return 'Băng cứu thương x' + it.n;
}
function spawnLoot() {
  const gunOdds = [['pistol', 0.36], ['rifle', 0.32], ['shotgun', 0.2], ['sniper', 0.12]];
  const rollGun = () => { let r = rng(); for (const [t, p] of gunOdds) { if ((r -= p) < 0) return t; } return 'pistol'; };
  const perHouse = new Map();
  for (const s of spots) {
    if (s.house) { const n = perHouse.get(s.house) || 0; if (n >= tune.loot_per_house + (s.house.big ? 2 : 0)) continue; perHouse.set(s.house, n + 1); }
    const r = rng();
    if (r < 0.3) {
      const t = rollGun(); addLoot('gun', t, GUNS[t].mag, s.x, s.y, s.z);
      const am = GUNS[t].ammo; addLoot('ammo', am, Math.round(AMMO_PILE[am] * tune.ammo_per_pile), s.x + 0.5, s.y, s.z + 0.3);
    } else if (r < 0.62) { const am = pick(['9mm', '5.56', '5.56', '12', '7.62']); addLoot('ammo', am, Math.round(AMMO_PILE[am] * tune.ammo_per_pile), s.x, s.y, s.z); }
    else if (r < 0.75) addLoot('armor', 'vest', rng() < 0.7 ? 50 : 100, s.x, s.y, s.z);
    else addLoot('band', 'band', 2 + Math.floor(rng() * 2), s.x, s.y, s.z);
  }
}
function takeLoot(c, it) { // returns true when taken
  if (it.kind === 'gun') {
    let slot = c.guns[0] ? (c.guns[1] ? c.cur : 1) : 0;
    if (c.guns[slot]) { const old = c.guns[slot]; addLoot('gun', old.type, old.mag, c.x + 0.4, c.y, c.z + 0.4); }
    c.guns[slot] = { type: it.type, mag: it.n }; c.cur = slot; c.reloadT = 0;
  } else if (it.kind === 'ammo') c.ammo[it.type] += it.n;
  else if (it.kind === 'armor') { if (it.n <= c.armor) return false; if (c.armor > 0) addLoot('armor', 'vest', Math.round(c.armor), c.x + 0.4, c.y, c.z); c.armor = it.n; }
  else c.bands += it.n;
  removeLoot(it);
  if (c.isPlayer) { sfx.pick(); events.push({ type: 'pickup', kind: it.kind, item: it.type }); }
  return true;
}
function dropAll(c) {
  const at = (k) => { const a = k * 1.3; return [c.x + Math.cos(a) * 0.9, c.z + Math.sin(a) * 0.9]; };
  let k = 0;
  const y = c.swim ? WATER_STAND : c.y;
  for (const g of c.guns) if (g) { const [x, z] = at(k++); addLoot('gun', g.type, g.mag, x, y, z); }
  for (const a in c.ammo) if (c.ammo[a] > 0) { const [x, z] = at(k++); addLoot('ammo', a, c.ammo[a], x, y, z); }
  if (c.armor > 5) { const [x, z] = at(k++); addLoot('armor', 'vest', Math.round(c.armor), x, y, z); }
  if (c.bands > 0) { const [x, z] = at(k++); addLoot('band', 'band', c.bands, x, y, z); }
}

// ---- Shooting --------------------------------------------------------------------------------------
const tracers = [];
let tracerMesh = null, sparkMesh = null;
const sparks = [];
function perturb(d, s) {
  if (s <= 0) return d;
  const up = Math.abs(d[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  let ax = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
  const al = Math.hypot(...ax); ax = ax.map(v => v / al);
  const bx = [d[1] * ax[2] - d[2] * ax[1], d[2] * ax[0] - d[0] * ax[2], d[0] * ax[1] - d[1] * ax[0]];
  const a = gauss() * s, b = gauss() * s;
  const r = [d[0] + ax[0] * a + bx[0] * b, d[1] + ax[1] * a + bx[1] * b, d[2] + ax[2] * a + bx[2] * b], l = Math.hypot(...r);
  return r.map(v => v / l);
}
function hitBoxes(c) {
  const h = heightOf(c), hy = h - 0.36;
  return [[c.x - 0.3, c.y, c.z - 0.3, c.x + 0.3, c.y + hy, c.z + 0.3], [c.x - 0.17, c.y + hy, c.z - 0.17, c.x + 0.17, c.y + h, c.z + 0.17]];
}
function trace(c, o, d, maxT, G, type) {
  const tw = G.melee ? maxT : rayWorld(o[0], o[1], o[2], d[0], d[1], d[2], maxT);
  let best = tw, who = null, head = false;
  for (const t of S.chars) {
    if (t === c || !t.alive || t.phase === 'plane') continue;
    const rx = t.x - o[0], ry = t.y + 1 - o[1], rz = t.z - o[2], along = rx * d[0] + ry * d[1] + rz * d[2];
    if (along < -1 || along > best + 1) continue;
    if (Math.hypot(rx - d[0] * along, ry - d[1] * along, rz - d[2] * along) > 1.6) continue;
    const hb = hitBoxes(t);
    for (let k = 0; k < 2; k++) { const tt = slab(o[0], o[1], o[2], d[0], d[1], d[2], hb[k], best); if (tt >= 0 && tt < best) { best = tt; who = t; head = k === 1; } }
  }
  const hx = o[0] + d[0] * best, hy = o[1] + d[1] * best, hz = o[2] + d[2] * best;
  if (who) {
    const fall = best > G.range ? Math.max(0.45, 1 - (best - G.range) / G.range * 0.6) : 1;
    hurt(who, G.dmg * fall * (head ? tune.headshot : 1) * (c.isPlayer ? 1 : tune.bot_damage), c, type, head, [hx, hy, hz]);
  } else if (best < maxT - 0.01 && !G.melee) spark(hx, hy, hz, '#f3e1b0');
  return [hx, hy, hz];
}
function shoot(c, dir, spread) {
  const type = gunType(c), G = GUNS[type], g = gunOf(c);
  c.fireT = G.rate; c.flashT = G.melee ? 0 : 0.05;
  if (g) g.mag--;
  const right = [Math.cos(c.yaw), 0, -Math.sin(c.yaw)];
  const o = [c.x, eyeY(c), c.z];
  const muzzle = c.isPlayer ? [o[0] + right[0] * 0.16 + dir[0] * 0.7, o[1] - 0.12 + dir[1] * 0.7, o[2] + right[2] * 0.16 + dir[2] * 0.7] : [c.x + right[0] * 0.14 + dir[0] * 0.9, c.y + (c.crouch ? 0.85 : 1.3), c.z + right[2] * 0.14 + dir[2] * 0.9];
  for (let p = 0; p < G.pellets; p++) {
    const d = perturb(dir, spread), end = trace(c, o, d, G.melee ? G.range : 450, G, type);
    if (!G.melee && (p < 3)) tracers.push({ a: muzzle, b: end, t: 0.06 });
  }
  if (G.melee) { if (c.isPlayer) noise(0.06, 0.15, 900); }
  else {
    const P = S.player, d = c.isPlayer ? 0 : Math.hypot(c.x - P.x, c.y - P.y, c.z - P.z);
    sfx.shot(type, d);
    if (!c.isPlayer && d < 260) S.heard.push({ x: c.x, z: c.z, t: 1.2 });
  }
  c.recoil += G.recoil;
  if (c.isPlayer) events.push({ type: 'shot', gun: type });
}
function hurt(t, n, by, type, head, at) {
  if (!t.alive || n <= 0) return;
  if (at) spark(at[0], at[1], at[2], t.armor > 0 && !head ? '#cfd8dc' : '#ffcf5a');
  if (t.armor > 0) { const a = Math.min(t.armor, n * tune.armor_absorb); t.armor -= a; n -= a; if (t.isPlayer) sfx.armor(); }
  t.hp -= n; t.lastBy = by; t.healT = 0;
  if (t.ai && by) { t.ai.attacker = by; t.ai.attT = 6; }
  if (t.isPlayer) {
    sfx.hurt(); S.hurtFlash = 0.35;
    if (by) S.dmgDirs.push({ a: Math.atan2(by.x - t.x, by.z - t.z), t: 1.2 });
  }
  if (by && by.isPlayer) {
    S.hitT = 0.18; S.hitHead = head; head ? sfx.head() : sfx.hit();
    if (at) S.nums.push({ x: at[0], y: at[1], z: at[2], n: Math.max(1, Math.round(n)), head, t: 0.8 });
  }
  if (t.hp <= 0) kill(t, by, type);
}
function kill(t, by, type) {
  t.alive = false; t.hp = 0; t.deadT = 0; t.killer = by; t.killGun = type;
  if (by && by !== t) by.kills++;
  dropAll(t); t.guns = [null, null]; t.ammo = { '9mm': 0, '5.56': 0, '12': 0, '7.62': 0 }; t.bands = 0; t.armor = 0;
  const gn = GUNS[type || 'fist'].name;
  S.feed.push({ s: by && by !== t ? `${by.name} hạ ${t.name} · ${gn}` : `${t.name} chết trong bo`, mine: (by && by.isPlayer) || t.isPlayer, t: 7 });
  if (S.feed.length > 5) S.feed.shift();
  events.push({ type: 'kill', by: by ? by.name : 'zone', victim: t.name, gun: type || 'zone' });
  if (by && by.isPlayer) { sfx.kill(); S.msgs.push({ s: 'Hạ gục ' + t.name, c: '#ff5a4a', t: 2 }); }
  const alive = S.chars.filter(c => c.alive).length;
  if (t.isPlayer) { S.rank = alive + 1; sfx.lose(); events.push({ type: 'death', rank: S.rank }); }
  else if (S.player.alive && alive === 1) { S.won = true; S.rank = 1; S.endT = 2.5; sfx.win(); events.push({ type: 'win' }); }
}
function spark(x, y, z, c) { sparks.push({ x, y, z, c, t: 0.25 }); if (sparks.length > 60) sparks.shift(); }

// ---- The zone --------------------------------------------------------------------------------------
function initZone() {
  const z = { k: 0, cx: 0, cz: 0, r: tune.zone_start_r, state: 'wait', t: tune.zone_first_wait };
  nextZone(z); S.zone = z;
}
function nextZone(z) {
  const k = z.k + 1;
  if (k >= ZONE_R.length) { z.nr = 0; z.nx = z.cx; z.nz = z.cz; return; }
  const nr = tune.zone_start_r * ZONE_R[k];
  let bx = z.cx, bz = z.cz;
  for (let i = 0; i < 300; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * Math.max(0, z.r - nr) * 0.9, x = z.cx + Math.cos(a) * d, y = z.cz + Math.sin(a) * d;
    if (groundH(x, y) > 2 && Math.hypot(x, y) < ISLAND_R * 0.85) { bx = x; bz = y; break; }
  }
  z.nx = bx; z.nz = bz; z.nr = nr; z.fx = z.cx; z.fz = z.cz; z.fr = z.r;
}
function updateZone(dt) {
  const z = S.zone;
  z.t -= dt;
  if (z.state === 'wait' && z.t <= 0) {
    if (z.k >= ZONE_R.length - 1) { z.t = 1e9; return; }
    z.state = 'shrink'; z.t = tune.zone_shrink; z.fx = z.cx; z.fz = z.cz; z.fr = z.r;
    S.msgs.push({ s: 'Bo đang thu hẹp!', c: '#7ab8ff', t: 3 }); sfx.zone(); events.push({ type: 'zone', k: z.k });
  } else if (z.state === 'shrink') {
    const f = 1 - Math.max(0, z.t) / tune.zone_shrink;
    z.cx = lerp(z.fx, z.nx, f); z.cz = lerp(z.fz, z.nz, f); z.r = lerp(z.fr, z.nr, f);
    if (z.t <= 0) {
      z.k++; z.state = 'wait'; z.t = Math.max(15, tune.zone_wait * (1 - z.k * 0.08));
      nextZone(z);
      if (z.k < ZONE_R.length - 1) S.msgs.push({ s: 'Vòng bo mới đã hiện trên bản đồ', c: '#ffffff', t: 3 });
    }
  }
  const dmg = tune.zone_dmg * ZONE_DMG[Math.min(z.k, ZONE_DMG.length - 1)];
  for (const c of S.chars) {
    if (!c.alive || c.phase === 'plane') continue;
    c.outside = Math.hypot(c.x - z.cx, c.z - z.cz) > z.r;
    if (c.outside && c.phase === 'ground') {
      c.hp -= dmg * dt; if (c.isPlayer) S.zoneHurt = 0.3;
      if (c.hp <= 0) kill(c, null, null);
    }
  }
}
const inNext = (x, z, m = 0) => Math.hypot(x - S.zone.nx, z - S.zone.nz) < S.zone.nr - m;

// ---- The plane -------------------------------------------------------------------------------------
function initPlane() {
  const a = rng() * Math.PI * 2, off = (rng() - 0.5) * 300;
  const dx = Math.cos(a), dz = Math.sin(a), px = -dz * off, pz = dx * off;
  S.plane = { x0: px - dx * 680, z0: pz - dz * 680, dx, dz, len: 1360, d: 0, gone: false };
}
function planePos(d = S.plane.d) { const p = S.plane; return [p.x0 + p.dx * d, tune.plane_height, p.z0 + p.dz * d]; }
function jumpOut(c) {
  const [x, y, z] = planePos();
  c.x = x; c.y = y - 4; c.z = z; c.vx = S.plane.dx * tune.plane_speed * 0.4; c.vz = S.plane.dz * tune.plane_speed * 0.4; c.vy = 0;
  c.phase = 'fall';
  if (c.isPlayer) { sfx.jump(); events.push({ type: 'jump', d: Math.round(S.plane.d) }); }
}

// ---- Bots --------------------------------------------------------------------------------------------
function initBot(c) {
  const p = S.plane, d = (0.12 + rng() * 0.76) * p.len, [jx, , jz] = planePos(d);
  let land = null, bd = 1e9;
  for (let i = 0; i < 40; i++) {
    const s = pick(spots), dd = Math.hypot(s.x - jx, s.z - jz);
    if (dd < 230 && dd + rng() * 120 < bd) { bd = dd + rng() * 120; land = s; }
  }
  if (!land) land = pick(spots);
  c.ai = { jumpD: d, land: { x: land.x + (rng() - 0.5) * 30, z: land.z + (rng() - 0.5) * 30 }, mode: 'loot', route: [], item: null,
    think: rng() * 0.3, target: null, react: 0, burst: 0, pause: 0, strafe: rng() < 0.5 ? 1 : -1, strafeT: 0, stuckT: 0, sideT: 0, side: 1,
    lastX: 0, lastZ: 0, lootUntil: 50 + rng() * 70, attacker: null, attT: 0, roam: null, calmT: 0, seen: 0 };
}
function routeTo(c, x, z, house) {
  const pts = [], from = houseAt(c.x, c.z);
  const door = (h, px, pz) => h.doors.reduce((a, b) => (Math.hypot(a.x - px, a.z - pz) < Math.hypot(b.x - px, b.z - pz) ? a : b));
  if (from && from !== house) { const d = door(from, x, z); pts.push(d.in, d.out); }
  if (house && house !== from) { const d = door(house, c.x, c.z); pts.push(d.out, d.in); }
  pts.push({ x, z });
  c.ai.route = pts;
}
function canSee(c, t, range) {
  const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz);
  if (d > range) return false;
  return clearLine(c.x, eyeY(c), c.z, t.x, t.y + (t.crouch ? 0.9 : 1.4), t.z);
}
function bestGunSlot(c) {
  let best = -1, bp = -1;
  c.guns.forEach((g, i) => { if (g && (g.mag > 0 || c.ammo[GUNS[g.type].ammo] > 0) && BOT_PREF[g.type] > bp) { bp = BOT_PREF[g.type]; best = i; } });
  return best;
}
function botWants(c, it) {
  if (it.kind === 'gun') { const have = c.guns.map(g => (g ? BOT_PREF[g.type] : -1)); return BOT_PREF[it.type] > Math.min(...have); }
  if (it.kind === 'ammo') return c.guns.some(g => g && GUNS[g.type].ammo === it.type) || c.guns.every(g => !g) && rng() < 0.3;
  if (it.kind === 'armor') return it.n > c.armor;
  return c.bands < 4;
}
function botThink(c) {
  const ai = c.ai, z = S.zone;
  // enemies
  if (ai.attT > 0 && ai.attacker && !ai.attacker.alive) ai.attacker = null;
  let tgt = null;
  const sight = tune.bot_sight * (gunType(c) === 'sniper' ? 1.8 : 1);
  if (ai.attacker && ai.attacker.alive && canSee(c, ai.attacker, sight * 1.8)) tgt = ai.attacker;
  if (!tgt && ai.target && ai.target.alive && ai.target.phase !== 'plane' && canSee(c, ai.target, sight * 1.2)) tgt = ai.target;
  if (!tgt) {
    let cands = [];
    for (const t of S.chars) if (t !== c && t.alive && t.phase !== 'plane') { const d = Math.hypot(t.x - c.x, t.z - c.z); if (d < sight) cands.push([d, t]); }
    cands.sort((a, b) => a[0] - b[0]);
    for (const [, t] of cands.slice(0, 3)) {
      // what a bot notices: in front of it, or close, or shooting
      const fa = Math.abs(angDiff(c.yaw, Math.atan2(-(t.x - c.x), -(t.z - c.z))));
      if ((fa < 1.4 || Math.hypot(t.x - c.x, t.z - c.z) < 18) && canSee(c, t, sight)) { tgt = t; break; }
    }
  }
  if (tgt !== ai.target) { ai.target = tgt; ai.react = tune.bot_react * (0.7 + rng() * 0.8); }
  const slot = bestGunSlot(c);
  if (slot >= 0 && slot !== c.cur && c.reloadT <= 0) c.cur = slot;
  const armed = slot >= 0;
  if (tgt && armed) { ai.mode = 'fight'; ai.calmT = 0; return; }
  if (tgt && !armed && Math.hypot(tgt.x - c.x, tgt.z - c.z) < 4) { ai.mode = 'fight'; return; } // fists
  ai.calmT += 0.3;
  // heal when it is quiet
  if (c.hp < 65 && c.bands > 0 && ai.calmT > 2 && c.healT <= 0 && c.reloadT <= 0) { c.healT = tune.bandage_time; }
  // reload when quiet
  const g = gunOf(c);
  if (g && g.mag < GUNS[g.type].mag * 0.5 && c.ammo[GUNS[g.type].ammo] > 0 && c.reloadT <= 0) c.reloadT = GUNS[g.type].reload;
  const outside = Math.hypot(c.x - z.cx, c.z - z.cz) > z.r - 10;
  const urgent = outside || (z.state === 'shrink' && !inNext(c.x, c.z, 5)) || (z.state === 'wait' && z.t < 25 && !inNext(c.x, c.z, 10));
  if (!urgent && S.t < ai.lootUntil || (!armed && !urgent)) {
    if (ai.mode !== 'loot' || !ai.item || !S.loot.includes(ai.item)) {
      let best = null, bd = 120;
      for (const it of S.loot) {
        if (it.claim && it.claim !== c.id) continue;
        const d = Math.hypot(it.x - c.x, it.z - c.z) + Math.abs(it.y - c.y) * 2;
        if (d < bd && botWants(c, it)) { bd = d; best = it; }
      }
      if (best) {
        if (ai.item) ai.item.claim = 0;
        ai.item = best; best.claim = c.id; ai.mode = 'loot';
        routeTo(c, best.x, best.z, houseAt(best.x, best.z));
        return;
      }
      ai.lootUntil = Math.min(ai.lootUntil, S.t);
    } else return;
  }
  if (ai.item) { ai.item.claim = 0; ai.item = null; }
  // go into the next circle and wander there
  if (ai.mode !== 'zone' || !ai.roam || !inNext(ai.roam.x, ai.roam.z, 3) || Math.hypot(ai.roam.x - c.x, ai.roam.z - c.z) < 3) {
    let x = z.nx, y = z.nz;
    for (let i = 0; i < 30; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * z.nr * 0.75;
      const px = z.nx + Math.cos(a) * d, pz = z.nz + Math.sin(a) * d;
      if (groundH(px, pz) > 0.5) { x = px; y = pz; break; }
    }
    ai.roam = { x, z: y }; ai.mode = 'zone'; ai.idle = urgent ? 0 : 2 + rng() * 8;
    routeTo(c, x, y, houseAt(x, y));
  }
}
function botUpdate(c, dt) {
  const ai = c.ai;
  if (c.phase === 'plane') { if (S.plane.d >= ai.jumpD) jumpOut(c); return; }
  if (c.phase === 'fall' || c.phase === 'chute') {
    const dx = ai.land.x - c.x, dz = ai.land.z - c.z, d = Math.hypot(dx, dz) || 1;
    const sp = Math.min(c.phase === 'chute' ? tune.chute_glide : tune.fall_glide, d);
    c.yaw = Math.atan2(-dx, -dz);
    c.dive = d < 60 ? 1.4 : 1;
    airMove(c, dt, dx / d * sp, dz / d * sp);
    if (c.phase === 'ground') { ai.think = 0; ai.lastX = c.x; ai.lastZ = c.z; }
    return;
  }
  if (c.fireT > 0) c.fireT -= dt;
  if (c.flashT > 0) c.flashT -= dt;
  c.recoil *= Math.exp(-6 * dt);
  if (ai.attT > 0) ai.attT -= dt;
  if (c.reloadT > 0) { c.reloadT -= dt; if (c.reloadT <= 0) finishReload(c); }
  if (c.healT > 0) { c.healT -= dt; if (c.healT <= 0 && c.bands > 0) { c.bands--; c.hp = Math.min(tune.player_hp, c.hp + tune.bandage_heal); } }
  if ((ai.think -= dt) <= 0) { ai.think = 0.3; botThink(c); }
  let wx = 0, wz = 0, sp = tune.bot_speed, faceMove = true;
  const t = ai.target;
  if (ai.mode === 'fight' && t && t.alive) {
    faceMove = false;
    const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(-dx, -dz);
    c.yaw += clamp(angDiff(c.yaw, want), -5 * dt, 5 * dt);
    const ty = t.y + (t.crouch ? 0.85 : 1.25) - eyeY(c);
    c.pitch = Math.atan2(ty, d);
    const type = gunType(c), G = GUNS[type];
    // keep a good distance, strafe
    if ((ai.strafeT -= dt) <= 0) { ai.strafeT = 0.6 + rng() * 1.4; ai.strafe = rng() < 0.5 ? 1 : -1; c.crouch = !c.swim && rng() < (type === 'sniper' ? 0.6 : 0.25); }
    const ideal = G.melee ? 1.2 : type === 'shotgun' ? 8 : type === 'pistol' ? 18 : type === 'sniper' ? 60 : 30;
    const fx = dx / d, fz = dz / d, push = d > ideal * 1.4 ? 1 : d < ideal * 0.5 ? -0.6 : 0;
    wx = fx * push + -fz * ai.strafe * 0.8; wz = fz * push + fx * ai.strafe * 0.8;
    sp = c.crouch ? tune.crouch_speed : tune.bot_speed * 0.8;
    // fire
    if (ai.react > 0) ai.react -= dt;
    const g = gunOf(c);
    if (g && g.mag <= 0 && c.reloadT <= 0) { if (c.ammo[G.ammo] > 0) c.reloadT = G.reload; else { const s = bestGunSlot(c); if (s >= 0 && s !== c.cur) c.cur = s; } }
    if (ai.pause > 0) ai.pause -= dt;
    const aimed = Math.abs(angDiff(c.yaw, want)) < 0.12;
    if (ai.react <= 0 && ai.pause <= 0 && aimed && c.fireT <= 0 && c.reloadT <= 0 && c.healT <= 0 && (G.melee ? d < 2 : g && g.mag > 0) && d < (G.melee ? 2 : G.range * 2.2)) {
      const tv = Math.hypot(t.vx, t.vz), err = tune.bot_aim_error * (1 + tv / 5) * (Math.hypot(c.vx, c.vz) > 1 ? 1.4 : 1) * (1 + d / 120);
      const aimX = t.x + t.vx * 0.05, aimY = t.y + (t.crouch ? 0.8 : 1.2), aimZ = t.z + t.vz * 0.05;
      const ox = c.x, oy = eyeY(c), oz = c.z, L = Math.hypot(aimX - ox, aimY - oy, aimZ - oz);
      shoot(c, [(aimX - ox) / L, (aimY - oy) / L, (aimZ - oz) / L], err + (G.melee ? 0 : G.spread * 0.5));
      if (G.auto) { ai.burst++; if (ai.burst >= 3 + Math.floor(rng() * 4)) { ai.burst = 0; ai.pause = 0.35 + rng() * 0.5; } }
      else ai.pause = rng() * 0.3;
    }
  } else {
    c.crouch = false;
    if (ai.mode === 'fight') ai.mode = 'loot';
    const p = ai.route[0];
    if (ai.mode === 'zone' && !ai.route.length && ai.idle > 0) { ai.idle -= dt; c.crouch = true; }
    if (p) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d < 0.7) ai.route.shift();
      else { wx = dx / d; wz = dz / d; }
    } else if (ai.mode === 'loot' && ai.item) {
      if (S.loot.includes(ai.item) && Math.hypot(ai.item.x - c.x, ai.item.z - c.z) < 1.6 && Math.abs(ai.item.y - c.y) < 1.2) takeLoot(c, ai.item);
      ai.item = null; ai.think = Math.min(ai.think, 0.1);
    }
    // pick up whatever good lies right at its feet
    for (const it of S.loot) if (Math.hypot(it.x - c.x, it.z - c.z) < 1.2 && Math.abs(it.y - c.y) < 1 && (!it.claim || it.claim === c.id) && botWants(c, it)) { takeLoot(c, it); break; }
    const z = S.zone;
    if (Math.hypot(c.x - z.cx, c.z - z.cz) > z.r - 20 || (z.state === 'shrink')) sp = tune.bot_speed * 1.45;
    // a shot heard nearby: look toward it
    for (const h of S.heard) if (Math.hypot(h.x - c.x, h.z - c.z) < 90 && rng() < 0.02) c.yaw = Math.atan2(-(h.x - c.x), -(h.z - c.z));
  }
  // stuck: sidestep and hop
  if (ai.sideT > 0) { ai.sideT -= dt; const nx = -wz * ai.side, nz = wx * ai.side; wx = wx * 0.3 + nx; wz = wz * 0.3 + nz; }
  const m = Math.hypot(wx, wz);
  if (m > 0.01) {
    wx /= m; wz /= m;
    if (faceMove) c.yaw += clamp(angDiff(c.yaw, Math.atan2(-wx, -wz)), -6 * dt, 6 * dt);
    if (faceMove) c.pitch *= 0.9;
  }
  if (c.healT > 0) sp *= 0.4;
  if (c.swim) sp *= 0.55;
  moveChar(c, dt, wx * sp, wz * sp);
  ai.stuckT += dt;
  if (ai.stuckT > 0.8) {
    const moved = Math.hypot(c.x - ai.lastX, c.z - ai.lastZ);
    if (m > 0.01 && moved < sp * 0.8 * 0.25 && ai.mode !== 'fight') {
      ai.sideT = 0.9; ai.side = rng() < 0.5 ? 1 : -1;
      if (c.ground) c.vy = tune.jump_speed;
      ai.stuck = (ai.stuck || 0) + 1;
      if (ai.stuck > 5) { ai.route = []; ai.roam = null; if (ai.item) { ai.item.claim = -1; ai.item = null; } ai.stuck = 0; }
    } else ai.stuck = 0;
    ai.stuckT = 0; ai.lastX = c.x; ai.lastZ = c.z;
  }
  if (Math.hypot(c.vx, c.vz) > 0.5) c.walk += dt * Math.hypot(c.vx, c.vz) * 1.6;
}
function finishReload(c) {
  const g = gunOf(c); if (!g) return;
  const G = GUNS[g.type], need = G.mag - g.mag, take = Math.min(need, c.ammo[G.ammo]);
  g.mag += take; c.ammo[G.ammo] -= take;
}

// ---- The player --------------------------------------------------------------------------------------
function nearestLoot() {
  const p = S.player, d = viewDir(p.yaw, p.pitch), ey = eyeY(p);
  let best = null, bs = -1;
  for (const it of S.loot) {
    const dx = it.x - p.x, dy = it.y + 0.1 - ey, dz = it.z - p.z, dist = Math.hypot(dx, dy, dz);
    if (dist > 2.6 || Math.abs(it.y - p.y) > 1.3) continue;
    const dot = (dx * d[0] + dy * d[1] + dz * d[2]) / dist, s = dot * 2 - dist * 0.3;
    if ((dot > 0.4 || Math.hypot(dx, dz) < 1.1) && s > bs) { bs = s; best = it; }
  }
  return best;
}
function playerControl(dt) {
  const p = S.player;
  // looking
  const G = GUNS[gunType(p)], aimZoom = p.aim ? G.zoom : 1;
  const sens = tune.mouse_sens / aimZoom;
  p.yaw -= look.dx * sens; p.pitch -= look.dy * sens;
  const kl = 2.2 * dt / aimZoom;
  if (held('lookL')) p.yaw += kl; if (held('lookR')) p.yaw -= kl; if (held('lookU')) p.pitch += kl; if (held('lookD')) p.pitch -= kl;
  look.dx = look.dy = 0;
  p.pitch = clamp(p.pitch, -1.5, 1.45);
  if (tapped('map')) S.bigMap = !S.bigMap;
  let f = (held('fwd') ? 1 : 0) - (held('back') ? 1 : 0), s = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
  if (stick.m > 0.15) { f = -stick.y; s = stick.x; }
  const fw = [-Math.sin(p.yaw), -Math.cos(p.yaw)], rt = [Math.cos(p.yaw), -Math.sin(p.yaw)];
  let wx = fw[0] * f + rt[0] * s, wz = fw[1] * f + rt[1] * s;
  const m = Math.hypot(wx, wz); if (m > 1) { wx /= m; wz /= m; }
  if (p.phase !== 'ground') S.fov = tune.fov;
  if (p.phase === 'plane') {
    const [x, y, z] = planePos(); p.x = x; p.y = y; p.z = z;
    if (tapped('jump') || S.plane.d > S.plane.len - 40) jumpOut(p);
    return;
  }
  if (p.phase === 'fall' || p.phase === 'chute') {
    p.dive = p.phase === 'fall' && f > 0 && p.pitch < -0.5 ? 1 + Math.min(0.6, -p.pitch - 0.5) : 1;
    const top = p.phase === 'chute' ? tune.chute_glide : tune.fall_glide * (p.dive > 1 ? 0.6 : 1);
    airMove(p, dt, wx * top, wz * top);
    return;
  }
  // on the ground
  if (tapped('crouch') && !p.swim) p.crouch = !p.crouch;
  if (tapped('jump') && p.ground && !p.swim) { p.vy = tune.jump_speed; p.crouch = false; sfx.jump(); }
  if (tapped('aimT')) S.aimToggle = !S.aimToggle;
  p.aim = (held('aim') || S.aimToggle) && p.reloadT <= 0 && p.healT <= 0 && !G.melee;
  const sprint = (held('sprint') || stick.m > 0.95) && f > 0 && !p.aim && !p.crouch && p.healT <= 0;
  if (sprint) p.crouch = false;
  let sp = sprint ? tune.sprint_speed : p.crouch ? tune.crouch_speed : tune.walk_speed;
  if (p.aim) sp *= 0.6; if (p.swim) sp *= 0.55; if (p.healT > 0) sp *= 0.4;
  moveChar(p, dt, wx * sp, wz * sp);
  const hs = Math.hypot(p.vx, p.vz);
  if (hs > 0.5 && p.ground) { p.walk += dt * hs * 1.7; if ((p.stepT -= dt * hs) <= 0) { p.stepT = 2.2; sfx.step(); } }
  // items
  if (tapped('use')) { const it = nearestLoot(); if (it) { if (!takeLoot(p, it)) S.msgs.push({ s: 'Áo giáp đang mặc tốt hơn', c: '#ffffff', t: 1.5 }); } }
  for (const it of S.loot) if ((it.kind === 'ammo' || it.kind === 'band') && Math.hypot(it.x - p.x, it.z - p.z) < 0.9 && Math.abs(it.y - p.y) < 1) { takeLoot(p, it); break; }
  // weapons
  if (p.fireT > 0) p.fireT -= dt;
  if (p.flashT > 0) p.flashT -= dt;
  const sw = tapped('slot1') ? 0 : tapped('slot2') ? 1 : tapped('swap') ? 1 - p.cur : -1;
  if (sw >= 0 && sw !== p.cur) { p.cur = sw; p.reloadT = 0; p.fireT = Math.max(p.fireT, 0.35); p.healT = 0; S.aimToggle = false; }
  const g = gunOf(p);
  if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) finishReload(p); }
  if (tapped('reload') && g && g.mag < GUNS[g.type].mag && p.ammo[GUNS[g.type].ammo] > 0 && p.reloadT <= 0) { p.reloadT = GUNS[g.type].reload; p.healT = 0; sfx.reload(); }
  if (tapped('heal') && p.bands > 0 && p.hp < tune.player_hp && p.healT <= 0) { p.healT = tune.bandage_time; p.reloadT = 0; }
  if (p.healT > 0) { p.healT -= dt; if (p.healT <= 0) { p.bands--; p.hp = Math.min(tune.player_hp, p.hp + tune.bandage_heal); sfx.heal(); events.push({ type: 'heal' }); } }
  const want = G.auto ? held('fire') : tapped('fire');
  if (want && p.fireT <= 0 && p.reloadT <= 0 && p.healT <= 0 && !p.swim) {
    if (g && g.mag <= 0) {
      if (p.ammo[G.ammo] > 0) { p.reloadT = G.reload; sfx.reload(); } else { sfx.empty(); p.fireT = 0.25; S.msgs.push({ s: 'Hết đạn ' + AMMO_NAME[G.ammo].slice(4), c: '#ff8a7a', t: 1.2 }); }
    } else {
      const moving = Math.min(1, hs / tune.walk_speed);
      let spread = (p.aim ? G.aimSpread : G.spread) * (1 + moving * 1.2) * (p.crouch ? 0.7 : 1) * (p.ground ? 1 : 2.5);
      if (G.scope && !p.aim) spread = G.spread * 1.4;
      shoot(p, viewDir(p.yaw, p.pitch), spread);
      const kickUp = G.recoil * (p.crouch ? 0.7 : 1); p.pitch += kickUp; p.kickAcc = (p.kickAcc || 0) + kickUp; p.yaw += (rng() - 0.5) * G.recoil * 0.6;
      S.kick = 1;
    }
  }
  p.recoil *= Math.exp(-8 * dt);
  let fov = tune.fov; // zoom eases in the step, so it never depends on the frame rate
  if (p.aim) fov = tune.fov / G.zoom;
  else if (Math.hypot(p.vx, p.vz) > tune.walk_speed + 0.5) fov += 4;
  S.fov = lerp(S.fov || tune.fov, fov, Math.min(1, dt * 18));
  if (p.kickAcc > 0 && p.fireT < G.rate * 0.6) { const back = p.kickAcc * Math.min(1, 7 * dt); p.pitch -= back; p.kickAcc -= back; } // the sight settles back
}

// ---- Setup -----------------------------------------------------------------------------------------
let worldMade = false;
function clearMatch() {
  if (!S) return;
  for (const it of S.loot) scene3.remove(it.mesh);
  for (const c of S.chars) if (c.mesh) scene3.remove(c.mesh);
}
function reset() {
  if (!worldMade) { genWorld(); buildModels(); setupFx(); worldMade = true; }
  clearMatch();
  seed = (Number(params.get('seed')) || CONFIG.seed) * 7919 + (S ? S.match + 1 : 0);
  S = {
    match: S ? S.match + 1 : 0, t: 0, chars: [], loot: [], feed: [], msgs: [], nums: [], dmgDirs: [], heard: [],
    hitT: 0, hitHead: false, hurtFlash: 0, zoneHurt: 0, kick: 0, bigMap: false, aimToggle: false, rank: 0, won: false, endT: 0,
  };
  spawnLoot();
  initPlane(); initZone();
  const p = makeChar(true, 'Bạn'); S.player = p; S.chars.push(p);
  const names = NAMES.slice(); for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
  for (let i = 0; i < tune.bots; i++) { const c = makeChar(false, names[i % names.length]); initBot(c); c.mesh = charMesh(c); S.chars.push(c); }
  p.yaw = Math.atan2(-S.plane.dx, -S.plane.dz);
  if (params.get('start') === 'ground') { // a dev shortcut: start on the ground in the first village
    const s = sites.find(q => q.type === 'village') || sites[0];
    p.phase = 'ground'; p.x = s.x; p.z = s.z + 30; p.y = groundH(p.x, p.z) + 1; p.yaw = 0; p.ground = false;
  }
  planeMesh.visible = true;
}
let planeMesh = null, zoneMesh = null, vm = null, myCanopy = null;
function setupFx() {
  planeMesh = new THREE.Mesh(GEO.plane, lamV); scene3.add(planeMesh);
  zoneMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true), new THREE.MeshBasicMaterial({ color: '#3a7bff', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  scene3.add(zoneMesh);
  tracerMesh = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.9, fog: false }));
  tracerMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(64 * 6), 3));
  tracerMesh.frustumCulled = false; scene3.add(tracerMesh);
  sparkMesh = new THREE.InstancedMesh(BOX, new THREE.MeshBasicMaterial({ color: '#ffffff' }), 60);
  sparkMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(60 * 3), 3);
  sparkMesh.frustumCulled = false; scene3.add(sparkMesh);
  myCanopy = new THREE.Mesh(GEO.canopy, new THREE.MeshLambertMaterial({ color: '#ff8c1a', side: THREE.DoubleSide }));
  myCanopy.scale.set(3.4, 1.7, 2.8); scene3.add(myCanopy);
  // the hands and guns in front of the camera
  vm = { group: new THREE.Group(), guns: {} };
  const arms = mergeParts([B(0.0, -0.03, 0.02, 0.06, 0.07, 0.08, '#e8b48a'), B(0.02, -0.1, 0.22, 0.09, 0.1, 0.4, '#ff8c1a', 0.4)]);
  const leftArm = mergeParts([B(0, 0, 0, 0.07, 0.06, 0.08, '#e8b48a'), B(-0.06, -0.06, 0.18, 0.09, 0.1, 0.38, '#ff8c1a', 0.3, 0.4)]);
  for (const k of ['pistol', 'rifle', 'shotgun', 'sniper']) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(GEO[k], lamV));
    g.add(new THREE.Mesh(arms, lamV));
    const la = new THREE.Mesh(leftArm, lamV); la.position.set(-0.02, 0.0, k === 'pistol' ? 0.01 : -0.36); g.add(la);
    vm.guns[k] = g; g.visible = false; vm.group.add(g);
  }
  const fists = new THREE.Group();
  for (const x of [-0.18, 0.18]) { const f = new THREE.Mesh(mergeParts([B(0, 0, 0, 0.09, 0.09, 0.1, '#e8b48a'), B(0, -0.04, 0.22, 0.1, 0.1, 0.4, '#ff8c1a', 0.3)]), lamV); f.position.set(x, -0.18, -0.38); fists.add(f); }
  vm.guns.fist = fists; fists.visible = false; vm.group.add(fists);
  vm.flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: '#ffe38a' }));
  vm.group.add(vm.flash);
  vmScene.add(vm.group);
}

// ---- The world step -----------------------------------------------------------------------------------
function updateWorld(dt) {
  S.t += dt;
  const P = S.plane;
  if (!P.gone) { P.d += tune.plane_speed * dt; if (P.d > P.len + 200) P.gone = true; }
  if (S.player.alive) playerControl(dt); else S.player.deadT += dt;
  for (const c of S.chars) if (!c.isPlayer && c.alive) botUpdate(c, dt);
  // characters do not walk through one another
  for (let i = 0; i < S.chars.length; i++) for (let j = i + 1; j < S.chars.length; j++) {
    const a = S.chars[i], b = S.chars[j];
    if (!a.alive || !b.alive || a.phase !== 'ground' || b.phase !== 'ground' || Math.abs(a.y - b.y) > 1.5) continue;
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d < 2 * R && d > 1e-4) { const o = (2 * R - d) / 2, nx = dx / d, nz = dz / d; a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o; }
  }
  updateZone(dt);
  for (const t of tracers) t.t -= dt;
  while (tracers.length && tracers[0].t <= 0) tracers.shift();
  for (const s of sparks) s.t -= dt;
  while (sparks.length && sparks[0].t <= 0) sparks.shift();
  for (const m of S.msgs) m.t -= dt; S.msgs = S.msgs.filter(m => m.t > 0).slice(-3);
  for (const f of S.feed) f.t -= dt; S.feed = S.feed.filter(f => f.t > 0);
  for (const n of S.nums) { n.t -= dt; n.y += dt * 0.6; } S.nums = S.nums.filter(n => n.t > 0);
  for (const d of S.dmgDirs) d.t -= dt; S.dmgDirs = S.dmgDirs.filter(d => d.t > 0);
  for (const h of S.heard) h.t -= dt; S.heard = S.heard.filter(h => h.t > 0);
  S.hitT -= dt; S.hurtFlash -= dt; S.zoneHurt -= dt; S.kick *= Math.exp(-14 * dt);
  updateSound();
}
function updateSound() {
  if (!audio) return;
  const p = S.player, inPlane = p.phase === 'plane' && scene === 'play';
  const pd = S.plane.gone ? 1e9 : Math.hypot(...planePos().map((v, i) => v - [p.x, p.y, p.z][i]));
  level(audio.drone.gain, scene === 'play' ? (inPlane ? 0.16 : clamp(1 - pd / 600, 0, 1) * 0.1) : 0, 0.2);
  const falling = scene === 'play' && p.alive && (p.phase === 'fall' || p.phase === 'chute');
  level(audio.wind.gain, falling ? (p.phase === 'fall' ? 0.35 : 0.08) : 0, 0.15);
  level(audio.windF, p.phase === 'fall' ? 900 : 500, 0.2);
}

// ---- Drawing ----------------------------------------------------------------------------------------
const tmpV = new THREE.Vector3();
function syncScene() {
  const p = S.player;
  // the camera
  const G = GUNS[gunType(p)];
  camera.fov = S.fov || tune.fov; camera.updateProjectionMatrix();
  if (p.phase === 'plane') {
    const [x, y, z] = planePos(), d = viewDir(p.yaw, p.pitch);
    camera.position.set(x - d[0] * 32, y + 6 - d[1] * 32, z - d[2] * 32);
    camera.rotation.set(p.pitch, p.yaw, 0);
  } else if (!p.alive) {
    const k = Math.min(1, p.deadT / 1.2);
    camera.position.set(p.x, lerp(eyeY(p), p.y + 0.35, k), p.z);
    camera.rotation.set(lerp(p.pitch, -0.2, k), p.yaw, k * 0.6);
  } else {
    const bob = p.phase === 'ground' && !p.aim ? Math.sin(p.walk * 2) * 0.035 * Math.min(1, Math.hypot(p.vx, p.vz) / 4) : 0;
    camera.position.set(p.x, eyeY(p) + bob, p.z);
    camera.rotation.set(p.pitch, p.yaw, 0);
  }
  // the plane
  planeMesh.visible = !S.plane.gone;
  if (!S.plane.gone) { const [x, y, z] = planePos(); planeMesh.position.set(x, y, z); planeMesh.rotation.set(0, Math.atan2(-S.plane.dx, -S.plane.dz) + Math.PI, 0); }
  // the zone wall
  const z = S.zone; zoneMesh.position.set(z.cx, 200, z.cz); zoneMesh.scale.set(Math.max(0.1, z.r), 600, Math.max(0.1, z.r));
  // characters
  for (const c of S.chars) {
    if (!c.mesh) continue;
    const g = c.mesh;
    g.visible = c.phase !== 'plane' && Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < 650;
    if (!g.visible) continue;
    g.position.set(c.x, c.y, c.z);
    if (!c.alive) { g.rotation.set(-Math.PI / 2 * Math.min(1, c.deadT * 3 + 0.0001), c.yaw, 0); g.position.y = c.y + 0.15; c.deadT += 1 / 60; c.canopyM.visible = false; c.flashM.visible = false; continue; }
    g.rotation.set(0, c.yaw, 0);
    const sw = c.phase === 'ground' ? Math.sin(c.walk * 2) * 0.6 * Math.min(1, Math.hypot(c.vx, c.vz) / 3) : 0.3;
    c.legs[0].rotation.x = sw; c.legs[1].rotation.x = -sw;
    c.upper.position.y = c.crouch ? -0.42 : 0;
    for (const l of c.legs) { l.scale.y = c.crouch ? 0.5 : 1; l.position.y = c.crouch ? 0.43 : 0.86; }
    c.upper.rotation.x = c.phase === 'ground' ? clamp(c.pitch, -0.5, 0.5) * 0.4 : 0;
    c.canopyM.visible = c.phase === 'chute';
    c.vestM.visible = c.armor > 0;
    const t = gunType(c);
    c.gunM.visible = t !== 'fist';
    if (t !== 'fist' && c.gunM.geometry !== GEO[t]) c.gunM.geometry = GEO[t];
    c.flashM.visible = c.flashT > 0; c.flashM.position.set(0.14, 1.33, t === 'sniper' ? -1.4 : -1.15);
  }
  myCanopy.visible = p.phase === 'chute' && p.alive;
  if (myCanopy.visible) myCanopy.position.set(p.x, p.y + 6.5, p.z);
  // loot: shown near
  for (const it of S.loot) it.mesh.visible = Math.abs(it.x - camera.position.x) < 140 && Math.abs(it.z - camera.position.z) < 140;
  // tracers
  const tp = tracerMesh.geometry.attributes.position, arr = tp.array;
  arr.fill(0);
  tracers.slice(-64).forEach((t, i) => { arr.set(t.a, i * 6); arr.set([lerp(t.a[0], t.b[0], 1), lerp(t.a[1], t.b[1], 1), lerp(t.a[2], t.b[2], 1)], i * 6 + 3); });
  tp.needsUpdate = true;
  // sparks
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) {
    const s = sparks[i];
    if (s) { const k = 0.06 + (0.25 - s.t) * 0.4; m4.compose(tmpV.set(s.x, s.y, s.z), new THREE.Quaternion(), new THREE.Vector3(k, k, k)); sparkMesh.setColorAt(i, tmpC.set(s.c)); }
    else m4.makeScale(0, 0, 0);
    sparkMesh.setMatrixAt(i, m4);
  }
  sparkMesh.instanceMatrix.needsUpdate = true; if (sparkMesh.instanceColor) sparkMesh.instanceColor.needsUpdate = true;
  if (dishMesh) dishMesh.rotation.z = S.t * 0.4;
  // the view model
  const t = gunType(p);
  for (const k in vm.guns) vm.guns[k].visible = k === t && p.alive && p.phase === 'ground' && !(G.scope && p.aim && S.fov < tune.fov / G.zoom + 3);
  const gm = vm.guns[t], hs = Math.hypot(p.vx, p.vz), bob = p.aim ? 0 : Math.min(1, hs / 4);
  let x = 0.2, y = -0.2, zz = -0.42;
  if (p.aim) { x = 0; y = t === 'pistol' ? -0.085 : -0.095; zz = -0.32; }
  if (t === 'sniper' && p.aim) y = -0.13;
  const rl = p.reloadT > 0 ? Math.sin(Math.min(1, (GUNS[t].reload - p.reloadT) / GUNS[t].reload) * Math.PI) : 0;
  const hl = p.healT > 0 ? 1 : 0;
  const sprint = p.phase === 'ground' && hs > tune.walk_speed + 0.5;
  gm.position.set(x + Math.sin(p.walk) * 0.012 * bob, y + Math.abs(Math.cos(p.walk)) * 0.012 * bob - rl * 0.12 - hl * 0.3, zz + S.kick * 0.05);
  gm.rotation.set(S.kick * 0.08 + rl * 0.5 - (sprint ? 0.25 : 0), sprint ? 0.5 : 0, rl * 0.4);
  vm.flash.visible = p.flashT > 0 && t !== 'fist';
  const len = t === 'sniper' ? 1.0 : t === 'shotgun' ? 0.8 : t === 'rifle' ? 0.75 : 0.2;
  vm.flash.position.set(gm.position.x, gm.position.y + 0.045, gm.position.z - len);
  vm.flash.rotation.z = S.t * 40;
}
function drawFrame() {
  if (scene === 'figures') return drawFigures();
  if (scene === 'title') { titleCamera(); }
  else syncScene();
  renderer.clear(); renderer.render(scene3, camera);
  if (scene !== 'title') { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
  screenSpace(); ctx.clearRect(0, 0, VW, VH);
  scenes[scene].hud();
  touchUI.style.display = touchOn && scene === 'play' && S.player.alive ? 'block' : 'none';
}
let titleT = 0;
function titleCamera() {
  const a = titleT * 0.05;
  camera.position.set(Math.cos(a) * 420, 160, Math.sin(a) * 420);
  camera.lookAt(0, 0, 0); camera.fov = 60; camera.updateProjectionMatrix();
  zoneMesh.visible = false; planeMesh.visible = true;
  const d = (titleT * 50) % 1600 - 800; planeMesh.position.set(-Math.sin(a) * d * 0.5 + 0, 140, d); planeMesh.rotation.set(0, Math.PI, 0);
  for (const c of S.chars) if (c.mesh) c.mesh.visible = false;
}

// ---- HUD ------------------------------------------------------------------------------------------------
function worldToScreen(x, y, z) {
  tmpV.set(x, y, z).project(camera);
  if (tmpV.z > 1) return null;
  return [(tmpV.x + 1) / 2 * VW, (1 - tmpV.y) / 2 * VH];
}
function fmtT(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHUD() {
  const p = S.player, pad = 12 * U, G = GUNS[gunType(p)];
  // tints
  if (p.alive && p.outside && p.phase === 'ground') { ctx.fillStyle = 'rgba(40,90,255,0.18)'; ctx.fillRect(0, 0, VW, VH); }
  if (S.hurtFlash > 0) { const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.8); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(200,0,0,${S.hurtFlash})`); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  if (p.hp < 30 && p.alive) { const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.8); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(170,0,0,${0.25 + 0.1 * Math.sin(S.t * 6)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  // scope
  const scoped = G.scope && p.aim && p.phase === 'ground' && S.fov < tune.fov / G.zoom + 3;
  if (scoped) {
    const r = Math.min(VW, VH) * 0.42;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.arc(VW / 2, VH / 2, r, 0, Math.PI * 2, true); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(VW / 2 - r, VH / 2); ctx.lineTo(VW / 2 + r, VH / 2); ctx.moveTo(VW / 2, VH / 2 - r); ctx.lineTo(VW / 2, VH / 2 + r); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(VW / 2 - r, VH / 2); ctx.lineTo(VW / 2 - r * 0.15, VH / 2); ctx.moveTo(VW / 2 + r * 0.15, VH / 2); ctx.lineTo(VW / 2 + r, VH / 2); ctx.moveTo(VW / 2, VH / 2 + r * 0.15); ctx.lineTo(VW / 2, VH / 2 + r); ctx.stroke();
    circle(ctx, VW / 2, VH / 2, 2, '#d32f2f');
  }
  // damage numbers
  for (const n of S.nums) { const s = worldToScreen(n.x, n.y, n.z); if (s) text(String(n.n), s[0] + 14 * U, s[1] - 10 * U, (n.head ? 20 : 16) * U, n.head ? '#ffd23a' : '#ffffff'); }
  if (p.alive && p.phase === 'ground' && !scoped) {
    // crosshair: spreads with movement
    const hs = Math.hypot(p.vx, p.vz), sp = G.melee ? 0 : (p.aim ? G.aimSpread : G.spread) * (1 + Math.min(1, hs / tune.walk_speed) * 1.2) * (p.crouch ? 0.7 : 1);
    const gap = Math.max(4, sp * VH / (2 * Math.tan(camera.fov * Math.PI / 360)) * 1.5) + S.kick * 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    if (!p.aim || G.melee) { ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(VW / 2 + dx * gap, VH / 2 + dy * gap); ctx.lineTo(VW / 2 + dx * (gap + 8), VH / 2 + dy * (gap + 8)); } ctx.stroke(); }
    circle(ctx, VW / 2, VH / 2, 1.6, '#ffffff');
  }
  if (S.hitT > 0) { ctx.strokeStyle = S.hitHead ? '#ffd23a' : '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(VW / 2 + dx * 6, VH / 2 + dy * 6); ctx.lineTo(VW / 2 + dx * 13, VH / 2 + dy * 13); } ctx.stroke(); }
  // where the hits came from
  for (const d of S.dmgDirs) {
    const a = d.a - p.yaw + Math.PI; // 0 = in front
    const r = 90 * U; ctx.strokeStyle = `rgba(255,40,40,${Math.min(0.85, d.t)})`; ctx.lineWidth = 6 * U;
    ctx.beginPath(); ctx.arc(VW / 2, VH / 2, r, -Math.PI / 2 - a - 0.3, -Math.PI / 2 - a + 0.3); ctx.stroke();
  }
  // compass
  const cw = Math.min(420 * U, VW * 0.42), cx = VW / 2, cy = pad + 14 * U;
  panel(cx - cw / 2, pad, cw, 30 * U, 0.4);
  ctx.save(); ctx.beginPath(); ctx.rect(cx - cw / 2, pad, cw, 30 * U); ctx.clip();
  const deg = ((-p.yaw * 180 / Math.PI) % 360 + 360) % 360, ppd = cw / 120;
  for (let a = Math.floor(deg - 65); a <= deg + 65; a++) {
    if (((a % 15) + 15) % 15) continue;
    const x = cx + (a - deg) * ppd, an = ((a % 360) + 360) % 360;
    const lab = { 0: 'B', 90: 'Đ', 180: 'N', 270: 'T' }[an];
    if (lab) text(lab, x, cy, 16 * U, lab === 'B' ? '#ffd23a' : '#ffffff');
    else if (an % 45 === 0) text(String(an), x, cy, 11 * U, 'rgba(255,255,255,0.8)', 'center', 'normal');
    else { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - 0.75, cy - 4 * U, 1.5, 8 * U); }
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(cx, pad + 30 * U); ctx.lineTo(cx - 5 * U, pad + 36 * U); ctx.lineTo(cx + 5 * U, pad + 36 * U); ctx.fill();
  // the map, top right
  const mm = Math.round(150 * U);
  drawMap(VW - pad - mm, pad, mm, 300, false);
  const alive = S.chars.filter(c => c.alive).length;
  panel(VW - pad - mm, pad + mm + 6 * U, mm, 26 * U);
  text(`Còn sống ${alive}`, VW - pad - mm + 10 * U, pad + mm + 19 * U, 14 * U, '#ffffff', 'left');
  text(`Hạ ${p.kills}`, VW - pad - 10 * U, pad + mm + 19 * U, 14 * U, '#ffd23a', 'right');
  // zone info, top left
  const z = S.zone;
  let zs = z.state === 'shrink' ? 'Bo đang thu hẹp' : z.k >= ZONE_R.length - 1 ? 'Bo cuối' : 'Bo thu hẹp sau ' + fmtT(z.t);
  panel(pad, pad, 210 * U, 28 * U);
  text(zs, pad + 10 * U, pad + 14 * U, 14 * U, z.state === 'shrink' ? '#7ab8ff' : '#ffffff', 'left');
  let fy = pad + 36 * U;
  if (p.alive && p.phase === 'ground') {
    const dz = Math.hypot(p.x - z.nx, p.z - z.nz) - z.nr;
    if (dz > 0) { panel(pad, fy, 210 * U, 26 * U); text('Cách vòng bo mới ' + Math.round(dz) + 'm', pad + 10 * U, fy + 13 * U, 13 * U, p.outside ? '#ff8a7a' : '#cfe3ff', 'left', 'normal'); fy += 32 * U; }
  }
  for (const f of S.feed) { text(f.s, pad + 4 * U, fy + 10 * U, 13 * U, f.mine ? '#ffd23a' : '#ffffff', 'left', 'normal'); fy += 20 * U; }
  // messages
  S.msgs.forEach((m, i) => text(m.s, VW / 2, VH * 0.22 + i * 26 * U, 18 * U, m.c));
  if (!p.alive) return;
  // plane and fall
  if (p.phase === 'plane') {
    text('SPACE / nút NHẢY: nhảy dù', VW / 2, VH * 0.7, 24 * U, '#ffd23a');
    text('Chọn chỗ đáp trên bản đồ (M). Chuột / kéo màn hình để nhìn quanh', VW / 2, VH * 0.7 + 30 * U, 15 * U, '#ffffff', 'center', 'normal');
    return;
  }
  if (p.phase === 'fall' || p.phase === 'chute') {
    const h = Math.max(0, p.y - groundH(p.x, p.z));
    panel(VW - pad - 110 * U, VH * 0.45, 110 * U, 50 * U);
    text(Math.round(h) + ' m', VW - pad - 55 * U, VH * 0.45 + 18 * U, 20 * U, '#ffffff');
    text(Math.round(-p.vy) + ' m/s', VW - pad - 55 * U, VH * 0.45 + 38 * U, 12 * U, '#cfe3ff', 'center', 'normal');
    text(p.phase === 'fall' ? 'W + nhìn xuống: lao nhanh · dù tự bung' : 'WASD: lái dù', VW / 2, VH * 0.75, 16 * U, '#ffffff', 'center', 'normal');
  }
  // health and armor
  const bw = Math.min(380 * U, VW * 0.36), bx = VW / 2 - bw / 2, by = VH - pad - 22 * U - (touchOn ? 8 * U : 0);
  panel(bx - 4, by - 4, bw + 8, 22 * U + 8);
  const hf = clamp(p.hp / tune.player_hp, 0, 1);
  ctx.fillStyle = hf > 0.5 ? '#f2f2f2' : hf > 0.25 ? '#ffb02e' : '#ff4040'; ctx.fillRect(bx, by, bw * hf, 14 * U);
  if (p.healT > 0) { ctx.fillStyle = 'rgba(80,220,120,0.6)'; ctx.fillRect(bx + bw * hf, by, bw * Math.min(1 - hf, tune.bandage_heal / tune.player_hp) * (1 - p.healT / tune.bandage_time), 14 * U); }
  ctx.fillStyle = '#5aa9ff'; ctx.fillRect(bx, by + 16 * U, bw * clamp(p.armor / 100, 0, 1), 5 * U);
  text(Math.ceil(p.hp) + '', bx - 10 * U, by + 8 * U, 15 * U, '#ffffff', 'right');
  text(`Băng ${p.bands}`, bx + bw + 12 * U, by + 8 * U, 13 * U, p.bands ? '#ffffff' : 'rgba(255,255,255,0.5)', 'left');
  if (p.armor > 0) text(`Giáp ${Math.round(p.armor)}`, bx + bw + 12 * U, by + 24 * U, 12 * U, '#8fc2ff', 'left', 'normal');
  // gun and ammo
  const g = gunOf(p), rx = VW - pad - (touchOn ? 0 : 0), ry = touchOn ? VH * 0.42 : VH - pad - 12 * U;
  if (g) {
    const reserve = p.ammo[G.ammo];
    text(String(g.mag), rx - 70 * U, ry - 18 * U, 34 * U, g.mag ? '#ffffff' : '#ff6a5a', 'right');
    text('/ ' + reserve, rx, ry - 14 * U, 18 * U, '#cfd6e0', 'right');
  }
  text(G.name, rx, ry - 48 * U, 15 * U, '#ffd23a', 'right');
  p.guns.forEach((q, i) => {
    const s = `${i + 1}  ${q ? GUNS[q.type].name : 'trống'}`;
    text(s, rx, ry - 72 * U - (1 - i) * 18 * U, 12 * U, i === p.cur ? '#ffffff' : 'rgba(255,255,255,0.55)', 'right', i === p.cur ? 'bold' : 'normal');
  });
  if (p.reloadT > 0) text('Đang nạp đạn...', VW / 2, VH / 2 + 46 * U, 15 * U, '#ffffff');
  if (p.healT > 0) text('Đang băng bó... ' + p.healT.toFixed(1) + 's', VW / 2, VH / 2 + 46 * U, 15 * U, '#7dff9a');
  // what lies at your feet
  const it = nearestLoot();
  if (it) {
    const s = (touchOn ? 'NHẶT: ' : 'E: nhặt ') + lootName(it), w = textW(s, 16 * U) + 28 * U;
    panel(VW / 2 - w / 2, VH / 2 + 62 * U, w, 30 * U);
    text(s, VW / 2, VH / 2 + 77 * U, 16 * U, '#ffffff');
  }
  if (!touchOn && S.t < 40) text('Chuột: nhìn · Chuột trái: bắn · Chuột phải: ngắm · R: nạp · E: nhặt · Q: băng · C: ngồi · M: bản đồ · P: dừng', VW / 2, VH - 6 * U - 46 * U, 12 * U, 'rgba(255,255,255,0.8)', 'center', 'normal');
}
function drawMap(x, y, size, span, big) {
  const p = S.player, s = mapImg.width / (2 * HALF);
  const cxw = big ? 0 : p.x, czw = big ? 0 : p.z, k = size / span;
  ctx.save();
  rrect(ctx, x, y, size, size, 8 * U); ctx.fillStyle = '#2f86b8'; ctx.fill(); ctx.clip();
  const to = (wx, wz) => [x + size / 2 + (wx - cxw) * k, y + size / 2 + (wz - czw) * k];
  const [ix, iy] = to(-HALF, -HALF);
  ctx.globalAlpha = 0.95; ctx.drawImage(mapImg, ix, iy, 2 * HALF * k, 2 * HALF * k); ctx.globalAlpha = 1;
  void s;
  const z = S.zone;
  // outside the current zone: blue
  let [zx, zy] = to(z.cx, z.cz);
  ctx.fillStyle = 'rgba(30,70,200,0.28)'; ctx.beginPath(); ctx.rect(x, y, size, size); ctx.arc(zx, zy, Math.max(0, z.r * k), 0, Math.PI * 2, true); ctx.fill();
  ctx.strokeStyle = '#3a7bff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(zx, zy, Math.max(0, z.r * k), 0, Math.PI * 2); ctx.stroke();
  const [nx, ny] = to(z.nx, z.nz);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(nx, ny, Math.max(0, z.nr * k), 0, Math.PI * 2); ctx.stroke();
  if (!S.plane.gone) {
    const P = S.plane, [ax, ay] = to(P.x0, P.z0), [bx, by] = to(P.x0 + P.dx * P.len, P.z0 + P.dz * P.len);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    const [px, py] = planePos(); const [qx, qy] = to(px, py === undefined ? 0 : planePos()[2]);
    circle(ctx, qx, qy, 4 * U, '#ffd23a', '#000', 1);
  }
  if (big) for (const st of sites) { const [lx, ly] = to(st.x, st.z); text(st.name, lx, ly - 12 * U, 13 * U, '#ffffff'); }
  for (const h of S.heard) if (Math.hypot(h.x - p.x, h.z - p.z) < 200) { const [hx, hy] = to(h.x, h.z); circle(ctx, hx, hy, 3 * U, `rgba(255,80,60,${h.t / 1.2})`); }
  const [mx, my] = to(p.x, p.z);
  ctx.save(); ctx.translate(mx, my); ctx.rotate(-p.yaw);
  ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -8 * U); ctx.lineTo(-5 * U, 5 * U); ctx.lineTo(0, 2.5 * U); ctx.lineTo(5 * U, 5 * U); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 2; rrect(ctx, x, y, size, size, 8 * U); ctx.stroke();
}
function drawBigMap() {
  const size = Math.min(VW, VH) - 60 * U;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VW, VH);
  drawMap(VW / 2 - size / 2, VH / 2 - size / 2 + 10 * U, size, 2 * HALF, true);
  text('BẢN ĐỒ · M để đóng', VW / 2, VH / 2 - size / 2 - 8 * U, 16 * U, '#ffffff');
}

// ---- Figures (all the models, for a look) ------------------------------------------------------------
let figs = null;
function drawFigures() {
  if (!figs) {
    figs = [];
    const base = [0, 420, 0], add = (obj, x, label, y = 0) => { obj.position.set(base[0] + x, base[1] + y, base[2] - 6); scene3.add(obj); figs.push([obj, label, x]); };
    const mk = (armor, gun, crouch) => { const c = makeChar(false, 'x'); c.phase = 'ground'; const g = charMesh(c); c.canopyM.visible = false; c.vestM.visible = armor; c.gunM.geometry = GEO[gun]; c.flashM.visible = false; if (crouch) { c.upper.position.y = -0.42; for (const l of c.legs) { l.scale.y = 0.5; l.position.y = 0.43; } } g.rotation.y = -0.6; return g; };
    add(mk(false, 'rifle'), -5.4, 'Đối thủ', -0.9);
    add(mk(true, 'shotgun', true), -4.0, 'Có giáp, ngồi', -0.9);
    for (const [i, t] of ['pistol', 'rifle', 'shotgun', 'sniper'].entries()) { const m = new THREE.Mesh(GEO[t], lamV); m.rotation.y = Math.PI / 2; m.scale.setScalar(1.3); add(m, -2.3 + i * 1.35, GUNS[t].name, 0.6); }
    for (const [i, t] of ['ammo', 'armor', 'band'].entries()) { const m = new THREE.Mesh(GEO[t], lamV); m.rotation.y = 0.5; m.scale.setScalar(1.6); add(m, -2.0 + i * 2, ['Hộp đạn', 'Áo giáp', 'Băng cứu thương'][i], -0.9); }
  }
  camera.position.set(0, 420.2, 1.2); camera.rotation.set(-0.06, 0, 0); camera.fov = 70; camera.updateProjectionMatrix();
  planeMesh.visible = zoneMesh.visible = false;
  renderer.clear(); renderer.render(scene3, camera);
  screenSpace(); ctx.clearRect(0, 0, VW, VH);
  text('VẬT PHẨM VÀ NHÂN VẬT', VW / 2, 28 * U, 22 * U, '#ffffff');
  for (const [o, label] of figs) { const s = worldToScreen(o.position.x, o.position.y - 0.25, o.position.z); if (s) text(label, s[0], s[1] + 10 * U, 14 * U, '#ffffff'); }
}

// ---- Scenes ------------------------------------------------------------------------------------------------
const CONTROLS = [
  'Chuột: nhìn · Chuột trái: bắn · Chuột phải: ngắm',
  'WASD: đi · Shift: chạy · Space: nhảy · C: ngồi',
  'E: nhặt · R: nạp đạn · 1 / 2: đổi súng · Q: băng bó',
  'M: bản đồ · P / Esc: dừng · N: tắt tiếng',
  'Điện thoại cầm ngang: cần đi bên trái, kéo bên phải để nhìn',
];
const scenes = {
  figures: { update() {}, hud() {} },
  title: {
    update(dt) {
      titleT += dt;
      if (tapped('ok') || tapped('jump')) { reset(); scene = 'play'; sfx.start(); events.push({ type: 'start' }); lockPointer(); }
    },
    hud() {
      ctx.fillStyle = 'rgba(8,10,20,0.45)'; ctx.fillRect(0, 0, VW, VH);
      text('ĐẢO SINH TỒN', VW / 2, VH * 0.2, 60 * U, '#ffd23a');
      text(`Nhảy dù · Nhặt súng · Chạy bo · Người cuối cùng thắng · 1 bạn và ${tune.bots} đối thủ máy`, VW / 2, VH * 0.2 + 50 * U, 17 * U, '#ffffff', 'center', 'normal');
      CONTROLS.forEach((c, i) => text(c, VW / 2, VH * 0.2 + 100 * U + i * 26 * U, 16 * U, '#e8ecf4', 'center', 'normal'));
      if (Math.floor(titleT * 2) % 2) text('Nhấn Enter, bấm chuột hoặc chạm để vào trận', VW / 2, VH * 0.2 + 250 * U, 20 * U, '#ffe9a0');
    },
  },
  play: {
    update(dt) {
      if (tapped('pause')) { scene = 'pause'; unlockPointer(); return; }
      updateWorld(dt);
      if (!S.player.alive && S.player.deadT > 2.5) { scene = 'over'; unlockPointer(); }
      if (S.won && (S.endT -= dt) <= 0) { scene = 'over'; unlockPointer(); }
    },
    hud() { drawHUD(); if (S.bigMap) drawBigMap(); },
  },
  pause: {
    update() { if (tapped('pause') || tapped('ok')) { scene = 'play'; lockPointer(); } },
    hud() {
      drawHUD(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VW, VH);
      text('TẠM DỪNG', VW / 2, VH * 0.25, 44 * U, '#ffffff');
      CONTROLS.forEach((c, i) => text(c, VW / 2, VH * 0.25 + 60 * U + i * 26 * U, 16 * U, '#e8ecf4', 'center', 'normal'));
      text('Enter / P / bấm chuột: chơi tiếp', VW / 2, VH * 0.25 + 210 * U, 18 * U, '#ffe9a0');
    },
  },
  over: {
    update(dt) { updateWorld(dt); if (tapped('ok')) { reset(); scene = 'play'; sfx.start(); events.push({ type: 'start' }); lockPointer(); } },
    hud() {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, VW, VH);
      const p = S.player, total = S.chars.length;
      if (S.won) { text('SỐNG SÓT CUỐI CÙNG!', VW / 2, VH * 0.28, 50 * U, '#ffd23a'); text('TOP 1 / ' + total, VW / 2, VH * 0.28 + 52 * U, 28 * U, '#ffffff'); }
      else {
        text('BẠN ĐÃ BỊ HẠ', VW / 2, VH * 0.28, 48 * U, '#ff5a4a');
        text(`Hạng #${S.rank} / ${total}`, VW / 2, VH * 0.28 + 52 * U, 28 * U, '#ffffff');
        text(p.killer ? `Bởi ${p.killer.name} · ${GUNS[p.killGun].name}` : 'Chết ngoài vòng bo', VW / 2, VH * 0.28 + 88 * U, 17 * U, '#e8ecf4', 'center', 'normal');
      }
      text(`Hạ gục: ${p.kills} · Sống được ${fmtT(S.t)}`, VW / 2, VH * 0.28 + 120 * U, 18 * U, '#e8ecf4', 'center', 'normal');
      text('Enter / bấm chuột: trận mới', VW / 2, VH * 0.28 + 170 * U, 20 * U, '#ffe9a0');
    },
  },
};

// ---- Loop: fixed step, frame time clamped ---------------------------------------------------------------
function step() {
  if (pressed('KeyN')) { setMuted(!muted); }
  scenes[scene].update(STEP); hit.clear();
}
let last, acc = 0;
function tick() {
  const now = clock.now();
  acc += Math.min(now - last, 0.25); last = now;
  let n = 0;
  while (acc >= STEP && n < 6) { step(); acc -= STEP; n++; }
  if (n >= 6) acc = 0;
  drawFrame();
}
function frame() { tick(); requestAnimationFrame(frame); }
function timer() { if (document.visibilityState === 'visible' && clock.now() - last > 0.1) tick(); }

// ---- What a check can read and drive (?manual=1 stops the loop; players never see it) -------------------
window.game = {
  get scene() { return scene; },
  get state() { return S; },
  press(code) { hit.add(code); },
  hold(code, on) { on ? down.add(code) : down.delete(code); },
  look(dx, dy) { look.dx += dx; look.dy += dy; },
  get events() { return events; },
  step(n = 1, draw = true) { for (let i = 0; i < n; i++) step(); if (draw) drawFrame(); },
};

reset();
scene = params.get('scene') || 'title';
if (scene === 'play') events.push({ type: 'start' });
last = clock.now();
if (params.get('manual') === '1') drawFrame();
else { requestAnimationFrame(frame); setInterval(timer, 50); }
