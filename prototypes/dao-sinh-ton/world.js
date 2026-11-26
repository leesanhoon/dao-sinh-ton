'use strict';
// world.js: the island. Height field, places, houses, trees, the merged static mesh, collision
// boxes and ray tests. Units are metres; north is -Z, east is +X.

const HALF = 700, CELL = 8, N = 175, NV = N + 1; // the height grid covers -700..700
const ISLAND_R = 540, WATER_STAND = -1.3;          // a character in deep water floats at this height
let H = null;                                       // heights at grid points
let vals = null;                                    // value-noise lattice

// ---- Noise and the height field ------------------------------------------------------------
function makeNoise() { vals = new Float32Array(64 * 64); for (let i = 0; i < vals.length; i++) vals[i] = rng(); }
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const g = (a, b) => vals[((b & 63) << 6) | (a & 63)];
  return lerp(lerp(g(xi, yi), g(xi + 1, yi), su), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), su), sv);
}
function fbm(x, y) { return noise2(x, y) * 0.5 + noise2(x * 2.1 + 17, y * 2.1 + 9) * 0.3 + noise2(x * 4.3 + 41, y * 4.3 + 3) * 0.2; }
function rawH(x, z) {
  const r = Math.hypot(x, z) / ISLAND_R;
  const coast = r + (fbm(x / 120 + 50, z / 120 + 50) - 0.5) * 0.38;
  const land = 1 - smooth(0.74, 1.0, coast);
  const hills = Math.pow(fbm(x / 230 + 11, z / 230 + 7), 1.7) * 62 + (fbm(x / 50, z / 50) - 0.5) * 3;
  return lerp(-7, 1.2 + hills * smooth(0.0, 0.5, land), land);
}
function groundH(x, z) { // matches the drawn terrain triangles exactly
  const fx = clamp((x + HALF) / CELL, 0, N - 1e-4), fz = clamp((z + HALF) / CELL, 0, N - 1e-4);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * NV + i;
  const h00 = H[k], h10 = H[k + 1], h01 = H[k + NV], h11 = H[k + NV + 1];
  if (u + v <= 1) return h00 + u * (h10 - h00) + v * (h01 - h00);
  return h11 + (1 - u) * (h01 - h11) + (1 - v) * (h10 - h11);
}

// ---- Places ----------------------------------------------------------------------------------
const PLACE_NAMES = { port: 'Bến Cảng', radar: 'Trạm Radar', village: ['Xóm Chài', 'Làng Dừa', 'Xóm Mới', 'Chợ Đảo'], farm: ['Nông Trường', 'Trại Gà'] };
let sites = [], houses = [], spots = [], decor = [];
function chooseSites() {
  sites = [];
  const ok = (x, z, gap) => sites.every(s => Math.hypot(s.x - x, s.z - z) > gap);
  for (let i = 0; i < 4000 && !sites.length; i++) { // the port: low land near the sea
    const a = rng() * Math.PI * 2, r = ISLAND_R * (0.6 + rng() * 0.15), x = Math.cos(a) * r, z = Math.sin(a) * r, h = rawH(x, z);
    if (h > 1.8 && h < 5 && rawH(x * 1.25, z * 1.25) < -1) sites.push({ type: 'port', x, z, r: 52, h: Math.max(h, 2) });
  }
  let best = null; // the radar: high ground
  for (let i = 0; i < 600; i++) {
    const x = (rng() - 0.5) * 760, z = (rng() - 0.5) * 760, h = rawH(x, z);
    if (Math.hypot(x, z) < 420 && ok(x, z, 220) && (!best || h > best.h)) best = { type: 'radar', x, z, r: 40, h };
  }
  if (best) sites.push(best);
  const types = ['village', 'farm', 'village', 'village', 'farm', 'village'];
  for (let i = 0; i < 5000 && sites.length < 8; i++) {
    const x = (rng() - 0.5) * 900, z = (rng() - 0.5) * 900, h = rawH(x, z);
    if (h < 2.5 || h > 40 || Math.hypot(x, z) > 450 || !ok(x, z, 190)) continue;
    sites.push({ type: types[(sites.length - 2) % types.length], x, z, r: 50, h });
  }
  const vn = PLACE_NAMES.village.slice(), fn = PLACE_NAMES.farm.slice();
  for (const s of sites) s.name = s.type === 'port' ? PLACE_NAMES.port : s.type === 'radar' ? PLACE_NAMES.radar : s.type === 'farm' ? fn.shift() || 'Trại' : vn.shift() || 'Xóm';
  // lone houses on flat-ish land between the places
  const lone = [];
  for (let i = 0; i < 3000 && lone.length < 16; i++) {
    const x = (rng() - 0.5) * 900, z = (rng() - 0.5) * 900, h = rawH(x, z);
    if (h < 2.5 || h > 45 || !ok(x, z, 110) || lone.some(l => Math.hypot(l.x - x, l.z - z) < 70)) continue;
    lone.push({ type: 'lone', x, z, r: 11, h });
  }
  return lone;
}
function genHeights(flats) {
  H = new Float32Array(NV * NV);
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) {
    const x = -HALF + i * CELL, z = -HALF + j * CELL;
    let h = rawH(x, z);
    for (const s of flats) {
      const d = Math.hypot(x - s.x, z - s.z), w = 1 - smooth(s.r, s.r + 26, d);
      if (w > 0) h = lerp(h, s.h, w);
    }
    H[j * NV + i] = h;
  }
}

// ---- Geometry builders: everything static goes into one mesh with vertex colours ----------------
const SG = { p: [], n: [], c: [] };
const boxes = [];                     // solid boxes: [x0, y0, z0, x1, y1, z1]
const tmpC = new THREE.Color();
function quad(G, a, b, c, d, nx, ny, nz, col) {
  for (const v of [a, b, c, a, c, d]) { G.p.push(v[0], v[1], v[2]); G.n.push(nx, ny, nz); G.c.push(col.r, col.g, col.b); }
}
function addBox(x0, y0, z0, x1, y1, z1, hex, solid = true, G = SG) {
  const col = tmpC.set(hex), k = 0.94 + vhash(x0 * 7 + z1, y0 * 13 + x1) * 0.12;
  const c = { r: col.r * k, g: col.g * k, b: col.b * k };
  quad(G, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], 0, 1, 0, c);   // top
  quad(G, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, -1, 0, c);  // bottom
  quad(G, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0, 0, 1, c);   // south
  quad(G, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0, 0, -1, c);  // north
  quad(G, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 1, 0, 0, c);   // east
  quad(G, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, 0, c);  // west
  if (solid) boxes.push([x0, y0, z0, x1, y1, z1]);
}
function toGeo(G) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(G.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(G.c, 3));
  return g;
}
// A wall along one axis with openings (doors, windows). along: 'x' or 'z'.
function wall(along, a0, a1, b0, b1, y0, y1, holes, hex) {
  const put = (s, e, lo, hi) => { if (e - s > 0.01 && hi - lo > 0.01) along === 'x' ? addBox(s, lo, b0, e, hi, b1, hex) : addBox(b0, lo, s, b1, hi, e, hex); };
  let cur = a0;
  for (const h of holes.sort((p, q) => p.a - q.a)) {
    put(cur, h.a, y0, y1);
    put(h.a, h.b, y0, y0 + h.lo);
    put(h.a, h.b, y0 + h.hi, y1);
    cur = h.b;
  }
  put(cur, a1, y0, y1);
}

// ---- Buildings -----------------------------------------------------------------------------------
const WALLS = ['#efe3c2', '#f3d27a', '#e7b9a0', '#cfe3d6', '#f2efe6', '#e9c98f', '#bcd7ea', '#f0c6c6'];
const ROOFS = ['#b5452e', '#9e3b2a', '#c2643a', '#7d8a94'];
const SIDES = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
function floorUnder(x0, z0, x1, z1) {
  let m = -99;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]]) m = Math.max(m, groundH(x, z));
  return m + 0.15;
}
function makeHouse(cx, cz, w, d, doorSides, kind) {
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, t = 0.25;
  const fy = floorUnder(x0, z0, x1, z1);
  const big = kind === 'shed', hh = big ? 6 : 3.2;
  const wc = big ? pick(['#8fa3b0', '#a9a28f', '#9b2d20', '#7f8f7a']) : pick(WALLS), rc = big ? '#5d6d7a' : pick(ROOFS);
  addBox(x0 - 0.15, fy - 3, z0 - 0.15, x1 + 0.15, fy, z1 + 0.15, '#8d8478');          // foundation; its top is the floor
  addBox(x0 + t, fy - 0.02, z0 + t, x1 - t, fy + 0.01, z1 - t, big ? '#7a7a72' : '#c9b79a', false); // floor colour
  const doorW = big ? 4 : 1.3, doorH = big ? 4.4 : 2.3, holes = { n: [], s: [], w: [], e: [] }, doors = [];
  for (const side of doorSides) {
    const alongX = side === 'n' || side === 's', mid = alongX ? cx : cz;
    holes[side].push({ a: mid - doorW / 2, b: mid + doorW / 2, lo: 0, hi: doorH });
    const [nx, nz] = SIDES[side], dx = alongX ? cx : side === 'w' ? x0 : x1, dz = alongX ? (side === 'n' ? z0 : z1) : cz;
    doors.push({ side, x: dx, z: dz, out: { x: dx + nx * 1.6, z: dz + nz * 1.6 }, in: { x: dx - nx * 1.6, z: dz - nz * 1.6 } });
    // stairs down to the ground when the floor sits high: each step at most 0.4 m
    let top = fy, k = 0;
    while (true) {
      const ox = dx + nx * (0.15 + k * 0.5), oz = dz + nz * (0.15 + k * 0.5), gy = groundH(ox + nx * 0.5, oz + nz * 0.5);
      if (top - gy < 0.42 || k > 12) break;
      top -= 0.4; k++;
      const ax = Math.min(ox, ox + nx * 0.5), bx = Math.max(ox, ox + nx * 0.5), az = Math.min(oz, oz + nz * 0.5), bz = Math.max(oz, oz + nz * 0.5);
      addBox(ax - (alongX ? doorW / 2 + 0.2 : 0), gy - 1.5, az - (alongX ? 0 : doorW / 2 + 0.2), bx + (alongX ? doorW / 2 + 0.2 : 0), top, bz + (alongX ? 0 : doorW / 2 + 0.2), '#8d8478');
    }
    doors[doors.length - 1].out = { x: dx + nx * (1.0 + k * 0.5), z: dz + nz * (1.0 + k * 0.5) };
  }
  if (!big) for (const side of ['n', 's', 'w', 'e']) { // windows wherever there is room
    const alongX = side === 'n' || side === 's', a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, len = a1 - a0;
    for (const f of len > 7 ? [0.22, 0.78] : [0.5]) {
      const m = a0 + len * f;
      if (holes[side].some(h => Math.abs((h.a + h.b) / 2 - m) < 1.8)) continue;
      holes[side].push({ a: m - 0.6, b: m + 0.6, lo: 1.0, hi: 2.0 });
    }
  }
  wall('x', x0, x1, z0, z0 + t, fy, fy + hh, holes.n, wc);
  wall('x', x0, x1, z1 - t, z1, fy, fy + hh, holes.s, wc);
  wall('z', z0 + t, z1 - t, x0, x0 + t, fy, fy + hh, holes.w, wc);
  wall('z', z0 + t, z1 - t, x1 - t, x1, fy, fy + hh, holes.e, wc);
  addBox(x0 - 0.3, fy + hh, z0 - 0.3, x1 + 0.3, fy + hh + 0.3, z1 + 0.3, rc);
  if (!big) addBox(x0 - 0.3, fy + hh + 0.3, z0 - 0.3, x1 + 0.3, fy + hh + 0.7, z0 - 0.1, rc); // a low parapet at the front
  const h = { x0, x1, z0, z1, fy, doors, big, spots: [] };
  // inside: furniture as cover, loot spots on the floor
  const inner = (m) => [x0 + t + m + rng() * (w - 2 * t - 2 * m), z0 + t + m + rng() * (d - 2 * t - 2 * m)];
  if (big) {
    for (let i = 0; i < 4; i++) {
      const [px, pz] = inner(3), s = 1.4;
      if (doors.some(dd => Math.hypot(dd.x - px, dd.z - pz) < 5)) continue;
      addBox(px - s / 2, fy, pz - s / 2, px + s / 2, fy + s, pz + s / 2, '#a07a45');
      if (rng() < 0.4) addBox(px - s / 2 + 0.1, fy + s, pz - s / 2 + 0.1, px + s / 2 - 0.1, fy + 2 * s - 0.2, pz + s / 2 - 0.1, '#8a6a3a');
    }
    for (let i = 0; i < 7; i++) { const [px, pz] = inner(1.5); h.spots.push({ x: px, y: fy, z: pz, house: h }); }
  } else {
    const [px, pz] = inner(1.2);
    if (!doors.some(dd => Math.hypot(dd.x - px, dd.z - pz) < 2.5)) addBox(px - 0.6, fy, pz - 0.4, px + 0.6, fy + 0.8, pz + 0.4, '#7a5530');
    for (let i = 0; i < 4; i++) { const [qx, qz] = inner(0.8); h.spots.push({ x: qx, y: fy, z: qz, house: h }); }
  }
  houses.push(h);
  return h;
}
function containerStack(cx, cz, alongX) {
  const cols = ['#b03a2e', '#1f5fa8', '#2e8b57', '#e67e22', '#7d3c98', '#c9a227'];
  const L = 6, W = 2.4, Hh = 2.6, gy = groundH(cx, cz) - 0.3;
  const n = rng() < 0.4 ? 2 : 1;
  for (let k = 0; k < n; k++) {
    const y0 = gy + k * Hh, y1 = y0 + Hh, c = pick(cols);
    if (alongX) addBox(cx - L / 2, y0, cz - W / 2, cx + L / 2, y1, cz + W / 2, c);
    else addBox(cx - W / 2, y0, cz - L / 2, cx + W / 2, y1, cz + L / 2, c);
  }
  const s = alongX ? [0, W / 2 + 0.8] : [W / 2 + 0.8, 0];
  const side = rng() < 0.5 ? 1 : -1;
  spots.push({ x: cx + s[0] * side, y: groundH(cx + s[0] * side, cz + s[1] * side), z: cz + s[1] * side, house: null });
}
function buildPlace(s) {
  const slots = [];
  const pitch = s.type === 'port' ? 26 : 23;
  for (let gz = -1; gz <= 1; gz++) for (let gx = -1; gx <= 1; gx++) slots.push([s.x + gx * pitch + (rng() - 0.5) * 4, s.z + gz * pitch + (rng() - 0.5) * 4, gx, gz]);
  for (const [x, z, gx, gz] of slots) {
    const center = gx === 0 && gz === 0;
    const face = Math.abs(gx) >= Math.abs(gz) ? (gx > 0 ? 'w' : 'e') : (gz > 0 ? 'n' : 's');
    const towardCentre = center ? pick(['n', 's', 'w', 'e']) : face;
    if (s.type === 'port') {
      if (center || (gx === 1 && gz === -1)) makeHouse(x, z, 22, 14, ['w', 'e'], 'shed');
      else for (let k = 0; k < 3; k++) containerStack(x + (rng() - 0.5) * 8, z + (k - 1) * 4.2, true);
    } else if (s.type === 'radar') {
      if (center) {
        const gy = groundH(x, z);
        addBox(x - 0.6, gy, z - 0.6, x + 0.6, gy + 16, z + 0.6, '#9aa3ab');
        addBox(x - 3, gy + 16, z - 3, x + 3, gy + 16.5, z + 3, '#7d8a94');
        decor.push({ type: 'dish', x, y: gy + 16.5, z });
      } else if (rng() < 0.45) makeHouse(x, z, 20, 13, ['n', 's'], 'shed');
      else if (rng() < 0.8) makeHouse(x, z, 9 + rng() * 2, 7, [towardCentre], 'house');
      else containerStack(x, z, rng() < 0.5);
    } else if (s.type === 'farm') {
      if (center) makeHouse(x, z, 20, 13, ['w', 'e'], 'shed');
      else if (rng() < 0.75) makeHouse(x, z, 8 + rng() * 3, 6 + rng() * 2, [towardCentre], 'house');
    } else if (rng() < 0.85) makeHouse(x, z, 7.5 + rng() * 3.5, 6 + rng() * 2.5, [towardCentre], 'house');
  }
}

// ---- Trees, rocks, bushes: instanced -------------------------------------------------------------
let trees = [], rocks = [], bushes = [];
function nearPlace(x, z, m) {
  return sites.some(s => Math.hypot(s.x - x, s.z - z) < s.r + m) || houses.some(h => x > h.x0 - m && x < h.x1 + m && z > h.z0 - m && z < h.z1 + m);
}
function scatter() {
  trees = []; rocks = []; bushes = [];
  for (let i = 0; i < 4200 && trees.length < 900; i++) {
    const x = (rng() - 0.5) * 1200, z = (rng() - 0.5) * 1200, h = groundH(x, z);
    if (h < 0.8 || nearPlace(x, z, 6)) continue;
    const dense = fbm(x / 90 + 3, z / 90 + 5);
    if (rng() > dense * 1.4 - 0.2) continue;
    const type = h < 3.2 ? 'palm' : h > 16 && rng() < 0.75 ? 'pine' : 'round';
    const s = 0.8 + rng() * 0.5;
    trees.push({ x, z, y: h, type, s, r: rng() * Math.PI * 2 });
    boxes.push([x - 0.3 * s, h - 1, z - 0.3 * s, x + 0.3 * s, h + 6 * s, z + 0.3 * s]);
  }
  for (let i = 0; i < 1200 && rocks.length < 150; i++) {
    const x = (rng() - 0.5) * 1200, z = (rng() - 0.5) * 1200, h = groundH(x, z);
    if (h < 0.3 || nearPlace(x, z, 4)) continue;
    const s = 0.8 + rng() * rng() * 3.2;
    rocks.push({ x, z, y: h, s, r: rng() * 6 });
    boxes.push([x - s * 0.75, h - 1, z - s * 0.75, x + s * 0.75, h + s * 0.9, z + s * 0.75]);
  }
  for (let i = 0; i < 3000 && bushes.length < 700; i++) {
    const x = (rng() - 0.5) * 1200, z = (rng() - 0.5) * 1200, h = groundH(x, z);
    if (h < 0.6 || nearPlace(x, z, 2)) continue;
    bushes.push({ x, z, y: h, s: 0.6 + rng() * 0.8 });
  }
}
function mergeParts(parts) { // parts: [geometry, hex, matrix]: one geometry with vertex colours
  const P = [], Nn = [], C = [];
  for (const [g0, hex, m] of parts) {
    const g = (g0.index ? g0.toNonIndexed() : g0.clone()).applyMatrix4(m);
    g.computeVertexNormals();
    const col = new THREE.Color(hex), p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { P.push(p[i]); Nn.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) C.push(col.r, col.g, col.b);
  }
  return toGeo({ p: P, n: Nn, c: C });
}
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
function treeGeos() {
  const cyl = new THREE.CylinderGeometry(0.16, 0.26, 1, 6), cone = new THREE.ConeGeometry(1, 1, 7), ball = new THREE.IcosahedronGeometry(1, 0), box = new THREE.BoxGeometry(1, 1, 1);
  const palmParts = [[cyl, '#8a6a45', M4(0, 3.5, 0, 0, 0, 0.08, 1, 7, 1)]];
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; palmParts.push([box, k % 2 ? '#3f8f3a' : '#4fa443', M4(Math.cos(a) * 1.5 + 0.3, 6.7, Math.sin(a) * 1.5, 0, -a, -0.35, 3.2, 0.12, 0.7)]); }
  palmParts.push([ball, '#6b4a2a', M4(0.3, 6.8, 0, 0, 0, 0, 0.45, 0.45, 0.45)]);
  return {
    palm: mergeParts(palmParts),
    pine: mergeParts([[cyl, '#6b4a2a', M4(0, 1.5, 0, 0, 0, 0, 1.3, 3, 1.3)], [cone, '#2f6b3a', M4(0, 4, 0, 0, 0, 0, 2.6, 4, 2.6)], [cone, '#3a7d45', M4(0, 6.3, 0, 0, 0, 0, 1.9, 3.4, 1.9)]]),
    round: mergeParts([[cyl, '#6b4a2a', M4(0, 1.6, 0, 0, 0, 0, 1.4, 3.2, 1.4)], [ball, '#4f9a3c', M4(0, 4.6, 0, 0, 0, 0, 2.6, 2.3, 2.6)], [ball, '#5aa845', M4(0.9, 5.4, 0.5, 0, 0, 0, 1.6, 1.4, 1.6)]]),
    rock: mergeParts([[new THREE.DodecahedronGeometry(1, 0), '#9a958c', M4(0, 0.25, 0, 0, 0, 0, 1, 0.75, 1)]]),
    bush: mergeParts([[ball, '#4a8f36', M4(0, 0.35, 0, 0, 0, 0, 1, 0.75, 1)]]),
  };
}
function instanced(geo, list, mat, fn) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((o, i) => m.setMatrixAt(i, fn(o)));
  m.count = list.length; m.instanceMatrix.needsUpdate = true; m.frustumCulled = false;
  return m;
}

// ---- Terrain mesh and the map picture ----------------------------------------------------------
function terrainColor(x, z, h, slope) {
  const g = fbm(x / 40, z / 40), site = sites.find(s => Math.hypot(s.x - x, s.z - z) < s.r + 8);
  if (h < -0.3) return tmpC.set('#d9c58f').multiplyScalar(0.75 + 0.1 * g);
  if (h < 2.4) return tmpC.set('#e8d7a0').multiplyScalar(0.92 + 0.1 * g);
  if (slope > 0.75 || h > 44) return tmpC.set('#9c927f').multiplyScalar(0.85 + 0.2 * g);
  if (site) return tmpC.set(g > 0.5 ? '#b49a6a' : '#8fae5a').multiplyScalar(0.92 + 0.12 * g);
  return tmpC.set(g > 0.55 ? '#6fa54a' : '#82b553').multiplyScalar(0.88 + 0.18 * g);
}
function terrainMesh() {
  const G = { p: [], n: [], c: [] };
  const P = (i, j) => [-HALF + i * CELL, H[j * NV + i], -HALF + j * CELL];
  const cols = [];
  for (let j = 0; j < NV; j++) for (let i = 0; i < NV; i++) {
    const x = -HALF + i * CELL, z = -HALF + j * CELL, h = H[j * NV + i];
    const sx = (H[j * NV + Math.min(N, i + 1)] - H[j * NV + Math.max(0, i - 1)]) / (2 * CELL), sz = (H[Math.min(N, j + 1) * NV + i] - H[Math.max(0, j - 1) * NV + i]) / (2 * CELL);
    const c = terrainColor(x, z, h, Math.hypot(sx, sz));
    cols.push([c.r, c.g, c.b]);
  }
  const pos = [], col = [];
  const push = (i, j) => { const p = P(i, j), c = cols[j * NV + i]; pos.push(p[0], p[1], p[2]); col.push(c[0], c[1], c[2]); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    push(i, j); push(i, j + 1); push(i + 1, j);
    push(i, j + 1); push(i + 1, j + 1); push(i + 1, j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  void G;
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
}
const MAPPX = 512;
let mapImg = null;
function mapPicture() {
  mapImg = document.createElement('canvas'); mapImg.width = mapImg.height = MAPPX;
  const g = mapImg.getContext('2d'), img = g.createImageData(MAPPX, MAPPX);
  for (let py = 0; py < MAPPX; py++) for (let px = 0; px < MAPPX; px++) {
    const x = -HALF + (px + 0.5) / MAPPX * 2 * HALF, z = -HALF + (py + 0.5) / MAPPX * 2 * HALF, h = groundH(x, z);
    let c;
    if (h < 0) c = tmpC.set('#2f86b8').multiplyScalar(1 + h / 30);
    else {
      const e = 0.02 * (groundH(x + 3, z + 3) - h);
      c = terrainColor(x, z, h, 0).multiplyScalar(clamp(1 + e * 4, 0.7, 1.2));
    }
    const k = (py * MAPPX + px) * 4;
    img.data[k] = c.getStyle && Math.round(Math.pow(c.r, 1 / 2.2) * 255); img.data[k + 1] = Math.round(Math.pow(c.g, 1 / 2.2) * 255); img.data[k + 2] = Math.round(Math.pow(c.b, 1 / 2.2) * 255); img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const s = MAPPX / (2 * HALF);
  g.fillStyle = 'rgba(70,60,55,0.85)';
  for (const h of houses) g.fillRect((h.x0 + HALF) * s, (h.z0 + HALF) * s, Math.max(1.5, (h.x1 - h.x0) * s), Math.max(1.5, (h.z1 - h.z0) * s));
  g.fillStyle = 'rgba(30,70,30,0.35)';
  for (const t of trees) g.fillRect((t.x + HALF) * s - 0.7, (t.z + HALF) * s - 0.7, 1.4, 1.4);
}

// ---- Collision grid and ray tests ------------------------------------------------------------------
const GC = 16, GN = Math.ceil(2 * HALF / GC);
let bgrid = null, bstamp = null, stampN = 0;
function buildGrid() {
  bgrid = Array.from({ length: GN * GN }, () => []);
  boxes.forEach((b, k) => {
    const i0 = clamp(Math.floor((b[0] + HALF) / GC), 0, GN - 1), i1 = clamp(Math.floor((b[3] + HALF) / GC), 0, GN - 1);
    const j0 = clamp(Math.floor((b[2] + HALF) / GC), 0, GN - 1), j1 = clamp(Math.floor((b[5] + HALF) / GC), 0, GN - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) bgrid[j * GN + i].push(k);
  });
  bstamp = new Int32Array(boxes.length);
}
function boxesNear(x, z, r, fn) {
  stampN++;
  const i0 = clamp(Math.floor((x - r + HALF) / GC), 0, GN - 1), i1 = clamp(Math.floor((x + r + HALF) / GC), 0, GN - 1);
  const j0 = clamp(Math.floor((z - r + HALF) / GC), 0, GN - 1), j1 = clamp(Math.floor((z + r + HALF) / GC), 0, GN - 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const k of bgrid[j * GN + i]) {
    if (bstamp[k] === stampN) continue; bstamp[k] = stampN; fn(boxes[k]);
  }
}
function slab(ox, oy, oz, dx, dy, dz, b, maxT) {
  let t0 = 0, t1 = maxT;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let a = 0; a < 3; a++) {
    const lo = b[a], hi = b[a + 3];
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < lo || o[a] > hi) return -1; continue; }
    let ta = (lo - o[a]) / d[a], tb = (hi - o[a]) / d[a];
    if (ta > tb) { const s = ta; ta = tb; tb = s; }
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
    if (t0 > t1) return -1;
  }
  return t0;
}
function rayBoxes(ox, oy, oz, dx, dy, dz, maxT) { // walks the grid cells along the ray
  let best = maxT;
  stampN++;
  const hl = Math.hypot(dx, dz);
  let i = Math.floor((ox + HALF) / GC), j = Math.floor((oz + HALF) / GC);
  const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1;
  const tdi = Math.abs(dx) > 1e-9 ? GC / Math.abs(dx) : Infinity, tdj = Math.abs(dz) > 1e-9 ? GC / Math.abs(dz) : Infinity;
  let tmi = Math.abs(dx) > 1e-9 ? ((dx > 0 ? (i + 1) * GC : i * GC) - (ox + HALF)) / dx : Infinity;
  let tmj = Math.abs(dz) > 1e-9 ? ((dz > 0 ? (j + 1) * GC : j * GC) - (oz + HALF)) / dz : Infinity;
  let tc = 0;
  for (let n = 0; n < 400; n++) {
    if (i >= 0 && j >= 0 && i < GN && j < GN) for (const k of bgrid[j * GN + i]) {
      if (bstamp[k] === stampN) continue; bstamp[k] = stampN;
      const t = slab(ox, oy, oz, dx, dy, dz, boxes[k], best);
      if (t >= 0 && t < best) best = t;
    }
    if (hl < 1e-9) break;
    if (tmi < tmj) { tc = tmi; tmi += tdi; i += si; } else { tc = tmj; tmj += tdj; j += sj; }
    if (tc > best) break;
  }
  return best;
}
function rayTerrain(ox, oy, oz, dx, dy, dz, maxT) {
  const stepL = 1.5;
  let pt = 0, above = oy - groundH(ox, oz);
  if (above < 0) return 0;
  for (let t = stepL; t <= maxT + stepL; t += stepL) {
    const tt = Math.min(t, maxT), y = oy + dy * tt;
    if (y > 75 && dy >= 0) return maxT;
    const a = y - groundH(ox + dx * tt, oz + dz * tt);
    if (a < 0) {
      let lo = pt, hi = tt;
      for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (oy + dy * m - groundH(ox + dx * m, oz + dz * m) < 0) hi = m; else lo = m; }
      return hi;
    }
    pt = tt;
    if (tt >= maxT) break;
  }
  return maxT;
}
function rayWorld(ox, oy, oz, dx, dy, dz, maxT) {
  const tb = rayBoxes(ox, oy, oz, dx, dy, dz, maxT);
  return rayTerrain(ox, oy, oz, dx, dy, dz, tb);
}
function clearLine(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz);
  if (L < 0.01) return true;
  return rayWorld(ax, ay, az, dx / L, dy / L, dz / L, L) >= L - 0.05;
}
function houseAt(x, z) {
  for (const h of houses) if (x > h.x0 + 0.2 && x < h.x1 - 0.2 && z > h.z0 + 0.2 && z < h.z1 - 0.2) return h;
  return null;
}

// ---- Build it all once ---------------------------------------------------------------------------
let worldGroup = null, waterMesh = null, dishMesh = null;
function genWorld() {
  seed = Number(params.get('seed')) || CONFIG.seed;
  makeNoise();
  const lone = chooseSites();
  genHeights(sites.concat(lone));
  for (const s of sites) buildPlace(s);
  for (const l of lone) makeHouse(l.x, l.z, 7.5 + rng() * 3, 6 + rng() * 2, [pick(['n', 's', 'w', 'e'])], 'house');
  for (const h of houses) spots.push(...h.spots);
  scatter();
  buildGrid();
  worldGroup = new THREE.Group();
  worldGroup.add(terrainMesh());
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true });
  worldGroup.add(new THREE.Mesh(toGeo(SG), lam));
  const TG = treeGeos();
  for (const type of ['palm', 'pine', 'round']) worldGroup.add(instanced(TG[type], trees.filter(t => t.type === type), lam, t => M4(t.x, t.y - 0.2, t.z, 0, t.r, 0, t.s, t.s, t.s)));
  worldGroup.add(instanced(TG.rock, rocks, lam, r => M4(r.x, r.y - 0.3, r.z, r.r * 0.3, r.r, 0, r.s, r.s, r.s)));
  worldGroup.add(instanced(TG.bush, bushes, lam, b => M4(b.x, b.y - 0.1, b.z, 0, 0, 0, b.s * 1.3, b.s, b.s * 1.3)));
  for (const d of decor) if (d.type === 'dish') {
    dishMesh = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshLambertMaterial({ color: '#e8ecef', side: THREE.DoubleSide }));
    dishMesh.position.set(d.x, d.y + 3.4, d.z); dishMesh.rotation.x = Math.PI - 0.5;
    worldGroup.add(dishMesh);
  }
  waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ color: '#2a8fc0', transparent: true, opacity: 0.82 }));
  waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.y = 0;
  worldGroup.add(waterMesh);
  scene3.add(worldGroup);
  scene3.background = new THREE.Color('#9fd3f5');
  scene3.fog = new THREE.Fog('#bfe0f2', 140, 720);
  scene3.add(new THREE.HemisphereLight('#dbeeff', '#6b5a3a', 1.25));
  const sun = new THREE.DirectionalLight('#fff1d6', 1.9); sun.position.set(-0.5, 1, -0.3); scene3.add(sun);
  vmScene.add(new THREE.HemisphereLight('#dbeeff', '#6b5a3a', 1.3));
  const vs = new THREE.DirectionalLight('#fff1d6', 1.6); vs.position.set(-0.5, 1, 0.4); vmScene.add(vs);
  mapPicture();
}
