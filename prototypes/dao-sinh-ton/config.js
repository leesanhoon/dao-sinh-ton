// PROTOTYPE - NOT FOR PRODUCTION
// Question: Một game bắn súng góc nhìn thứ nhất sinh tồn (battle royale) chơi trên web có vui không?
// Date: 2026-11-26
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name>; the tweak panel, an add-on, writes them back here. Distances in metres.
window.CONFIG = {
  seed: 7, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },
  mouse_sens: { value: 0.0022, min: 0.0005, max: 0.008, step: 0.0001 }, // radians per pixel
  touch_sens: { value: 0.006, min: 0.001, max: 0.02, step: 0.0005 },
  fov: { value: 78, min: 60, max: 100, step: 1 },
  // The match
  bots: { value: 24, min: 1, max: 40, step: 1 },
  plane_height: { value: 200, min: 120, max: 400, step: 10 },
  plane_speed: { value: 70, min: 30, max: 150, step: 5 },
  fall_speed: { value: 55, min: 20, max: 90, step: 1 },        // m/s in free fall
  fall_glide: { value: 26, min: 5, max: 60, step: 1 },         // m/s sideways in free fall
  chute_height: { value: 70, min: 20, max: 150, step: 5 },     // opens this high above the ground
  chute_speed: { value: 7, min: 3, max: 15, step: 0.5 },
  chute_glide: { value: 11, min: 3, max: 25, step: 1 },
  // The player
  walk_speed: { value: 4.6, min: 2, max: 10, step: 0.1 },
  sprint_speed: { value: 6.9, min: 3, max: 14, step: 0.1 },
  crouch_speed: { value: 2.3, min: 1, max: 6, step: 0.1 },
  jump_speed: { value: 5.2, min: 2, max: 10, step: 0.1 },
  gravity: { value: 18, min: 5, max: 40, step: 0.5 },
  player_hp: { value: 100, min: 20, max: 300, step: 5 },
  armor_absorb: { value: 0.5, min: 0, max: 0.9, step: 0.05 },  // share of damage the vest takes
  bandage_heal: { value: 25, min: 5, max: 100, step: 5 },
  bandage_time: { value: 2.5, min: 0.5, max: 8, step: 0.1 },
  headshot: { value: 2, min: 1, max: 4, step: 0.1 },
  // Bots
  bot_damage: { value: 0.55, min: 0.1, max: 2, step: 0.05 },     // × weapon damage when a bot shoots
  bot_aim_error: { value: 0.032, min: 0, max: 0.15, step: 0.002 }, // radians
  bot_react: { value: 0.9, min: 0.1, max: 3, step: 0.05 },      // s before a bot opens fire
  bot_sight: { value: 95, min: 20, max: 300, step: 5 },         // m a bot sees; snipers see 1.8×
  bot_speed: { value: 4.4, min: 1, max: 10, step: 0.1 },
  // The zone (bo)
  zone_start_r: { value: 560, min: 200, max: 800, step: 10 },
  zone_first_wait: { value: 80, min: 10, max: 300, step: 5 },   // s from the plane's start
  zone_wait: { value: 40, min: 5, max: 200, step: 5 },          // s between shrinks (later phases)
  zone_shrink: { value: 35, min: 5, max: 200, step: 5 },        // s a shrink takes
  zone_dmg: { value: 1, min: 0, max: 20, step: 0.5 },           // hp/s outside in phase 1, grows each phase
  // Loot
  loot_per_house: { value: 4, min: 1, max: 10, step: 1 },
  ammo_per_pile: { value: 1, min: 0.5, max: 3, step: 0.1 },      // × the usual ammo in a pile
};
