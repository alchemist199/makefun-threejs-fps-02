// Weapons: the buy menu's catalogue and the view model in the player's hands.
// Every weapon is hitscan with its own damage, fire rate, spread and recoil, so stopping
// to aim pays and spraying on the move does not. A grenade is a thrown body with a fuse,
// not a hitscan shot: it arcs, bounces once and bursts.
// Damage falls off past the weapon's range; a headshot multiplies it.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export const WEAPONS = {
  pistol: { id: 'pistol', name: 'P9 Sparrow', kind: 'pistol', price: 0, damage: 26, headMult: 3.5, mag: 12, reserve: 48, gap: 0.16, auto: false, reload: 1.4, spreadStill: 0.003, spreadMove: 0.02, recoil: 0.006, range: 45 },
  smg: { id: 'smg', name: 'Hornet-9', kind: 'smg', price: 900, damage: 22, headMult: 3, mag: 30, reserve: 120, gap: 0.075, auto: true, reload: 1.7, spreadStill: 0.006, spreadMove: 0.034, recoil: 0.005, range: 34 },
  rifle: { id: 'rifle', name: 'Kestrel-7', kind: 'rifle', price: 1600, damage: 34, headMult: 3.5, mag: 30, reserve: 90, gap: 0.105, auto: true, reload: 1.9, spreadStill: 0.0022, spreadMove: 0.028, recoil: 0.009, range: 60 },
  dmr: { id: 'dmr', name: 'Falcon-12', kind: 'dmr', price: 2400, damage: 70, headMult: 3, mag: 10, reserve: 30, gap: 0.55, auto: false, reload: 2.4, spreadStill: 0.0008, spreadMove: 0.03, recoil: 0.02, range: 80 },
};
export const GRENADE = { id: 'grenade', name: 'Flashburst', price: 300, radius: 6.5, maxDamage: 95, fuse: 1.6 };
export const WEAPON_ORDER = ['pistol', 'smg', 'rifle', 'dmr'];

const MUZZLE_TIME = 0.06;

export function createWeapons(camera) {
  const grip = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.7, metalness: 0.2 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.5, metalness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.5, metalness: 0.2 });

  // One view model per weapon, built from boxes; only the equipped one is visible.
  const models = {};
  function buildModel(def) {
    const model = new THREE.Group();
    const length = def.kind === 'pistol' ? 0.22 : def.kind === 'smg' ? 0.34 : def.kind === 'rifle' ? 0.46 : 0.58;
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, length), bodyMat);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, length * 0.7), grip);
    barrel.position.set(0, 0.025, -length * 0.6);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 0.2), grip);
    stock.position.set(0, -0.02, length * 0.5);
    model.add(receiver, barrel, stock);
    if (def.kind === 'dmr') {
      const scope = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.16), accentMat);
      scope.position.set(0, 0.09, 0);
      model.add(scope);
    }
    if (def.kind === 'smg' || def.kind === 'rifle') {
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), grip);
      mag.position.set(0, -0.12, -0.05);
      model.add(mag);
    }
    model.position.set(0.24, -0.2, -0.42);
    model.visible = false;
    camera.add(model);
    return model;
  }
  for (const id of WEAPON_ORDER) models[id] = buildModel(WEAPONS[id]);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.26),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;
  camera.add(flash);
  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 6);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  const state = {
    current: 'pistol',
    owned: { pistol: true },
    mag: WEAPONS.pistol.mag,
    reserve: WEAPONS.pistol.reserve,
    cooldown: 0,
    reloadLeft: 0,
    flash: 0,
    kick: 0,
    grenades: 0,
  };

  function def() {
    return WEAPONS[state.current];
  }

  function showModel() {
    for (const id of WEAPON_ORDER) models[id].visible = id === state.current;
  }
  showModel();

  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    const model = models[state.current];
    model.position.z = -0.42 + state.kick;
    model.rotation.x = state.kick * 2.2;
    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 30;
    flashLight.intensity = state.flash > 0 ? 18 : 0;
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      const progress = 1 - state.reloadLeft / def().reload;
      model.rotation.x = -0.55 * Math.min(1, progress * 2);
      if (state.reloadLeft === 0) {
        const need = def().mag - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
      }
    }
  }

  return {
    state,
    def,
    step,
    ready() {
      return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
    },
    pullTrigger() {
      state.cooldown = def().gap;
      state.flash = MUZZLE_TIME;
      state.kick = 0.055;
    },
    takeRound() {
      if (state.mag <= 0) return false;
      state.mag -= 1;
      return true;
    },
    reload() {
      const d = def();
      if (state.reloadLeft > 0 || state.mag === d.mag || state.reserve === 0) return false;
      state.reloadLeft = d.reload;
      return true;
    },
    spread(speed) {
      const d = def();
      return d.spreadStill + Math.min(1, speed / 5.2) * d.spreadMove;
    },
    damageAt(distance, part) {
      const d = def();
      const falloff = distance > d.range ? Math.max(0.45, 1 - (distance - d.range) / d.range) : 1;
      const base = d.damage * falloff;
      return part === 'head' ? base * d.headMult : base;
    },
    equip(id) {
      if (!state.owned[id]) return false;
      state.current = id;
      state.mag = WEAPONS[id].mag;
      state.reserve = WEAPONS[id].reserve;
      state.cooldown = 0;
      state.reloadLeft = 0;
      showModel();
      return true;
    },
    // Buying keeps the pistol as a fallback; a bought weapon replaces the current one.
    buy(id) {
      if (state.owned[id]) return false;
      state.owned[id] = true;
      this.equip(id);
      return true;
    },
    buyGrenade() {
      if (state.grenades >= 1) return false;
      state.grenades = 1;
      return true;
    },
    refill() {
      state.current = 'pistol';
      state.owned = { pistol: true };
      state.mag = WEAPONS.pistol.mag;
      state.reserve = WEAPONS.pistol.reserve;
      state.cooldown = 0;
      state.reloadLeft = 0;
      state.flash = 0;
      state.kick = 0;
      state.grenades = 0;
      showModel();
    },
    // A fresh round keeps what was bought; only the magazines are topped up.
    restock() {
      const d = def();
      state.mag = d.mag;
      state.reserve = d.reserve;
      state.cooldown = 0;
      state.reloadLeft = 0;
    },
  };
}

// Grenades: a small pool of thrown bodies. Gravity pulls, walls bounce once, the fuse
// pops the burst. The pool is fixed size, so throwing never allocates mid-frame.
export function createGrenades(scene, colliders, onExplode) {
  const pool = [];
  const geometry = new THREE.SphereGeometry(0.09, 10, 8);
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.4, metalness: 0.4 });
  for (let i = 0; i < 4; i += 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);
    pool.push({ mesh, active: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(), fuse: 0, bounced: false });
  }

  function throwFrom(origin, direction) {
    const slot = pool.find((entry) => !entry.active);
    if (!slot) return false;
    slot.active = true;
    slot.position.copy(origin);
    slot.velocity.copy(direction).multiplyScalar(13);
    slot.velocity.y += 3.2;
    slot.fuse = GRENADE.fuse;
    slot.bounced = false;
    slot.mesh.visible = true;
    slot.mesh.position.copy(origin);
    return true;
  }

  const scratch = new THREE.Vector3();

  function step(dt) {
    for (const slot of pool) {
      if (!slot.active) continue;
      slot.fuse -= dt;
      slot.velocity.y -= 14 * dt;
      const next = scratch.copy(slot.position).addScaledVector(slot.velocity, dt);
      let bounced = false;
      for (const collider of colliders) {
        if (next.x > collider.min.x - 0.09 && next.x < collider.max.x + 0.09 && next.y > collider.min.y - 0.09 && next.y < collider.max.y + 0.09 && next.z > collider.min.z - 0.09 && next.z < collider.max.z + 0.09) {
          bounced = true;
          break;
        }
      }
      if (bounced && !slot.bounced) {
        slot.velocity.multiplyScalar(-0.45);
        slot.velocity.y = Math.abs(slot.velocity.y) * 0.4 + 1.5;
        slot.bounced = true;
      } else if (bounced) {
        slot.velocity.multiplyScalar(0.6);
      }
      if (next.y < 0.09) {
        next.y = 0.09;
        slot.velocity.y = Math.abs(slot.velocity.y) * 0.35;
        slot.velocity.x *= 0.7;
        slot.velocity.z *= 0.7;
      }
      slot.position.copy(next);
      slot.mesh.position.copy(slot.position);
      if (slot.fuse <= 0) {
        slot.active = false;
        slot.mesh.visible = false;
        onExplode(slot.position);
      }
    }
  }

  return { throwFrom, step, active: pool };
}
