import {
  CHARACTERS,
  ENEMY_DEFS,
  ENEMY_SPAWN_WEIGHTS,
  MAPS,
  type EnemyKind,
  type MapId,
} from "./data";
import { SKILL_COOLDOWNS } from "./bonusSkills";
import {
  CRYSTAL_BUFF,
  VOLCANO_CONFIG,
  RIFT_CONFIG,
  TERRAIN_INTERACT,
  type InteractiveTerrainKind,
} from "./mapTerrain";
import type { StatIconId } from "./uiDraw";

export interface SkillStatEntry {
  iconId: StatIconId;
  category: "class" | "bonus";
  hero?: string;
  slot?: "Q" | "R";
  name: string;
  desc: string;
  damage: string;
  cooldown: string;
  range: string;
  extra?: string;
}

type ClassSkillMeta = {
  iconId: StatIconId;
  damage: string;
  cooldown: string;
  range: string;
  extra?: string;
};

const CLASS_SKILL_META: Record<
  string,
  { q: ClassSkillMeta; r: ClassSkillMeta }
> = {
  mage: {
    q: {
      iconId: "class_mage_q",
      damage: "45 (AoE)",
      cooldown: "8s",
      range: "160",
      extra: "Hits all enemies in radius",
    },
    r: {
      iconId: "class_mage_r",
      damage: "26 + 18×4 chain",
      cooldown: "5s",
      range: "500",
      extra: "Up to 5 jumps, 180 chain range",
    },
  },
  knight: {
    q: {
      iconId: "class_knight_q",
      damage: "55",
      cooldown: "7s",
      range: "100 cone",
      extra: "Front arc ~100°",
    },
    r: {
      iconId: "class_knight_r",
      damage: "28 (AoE)",
      cooldown: "12s",
      range: "110",
      extra: "Hits all around you",
    },
  },
  rogue: {
    q: {
      iconId: "class_rogue_q",
      damage: "—",
      cooldown: "9s",
      range: "Self",
      extra: "2.5s invisibility + 35% move speed",
    },
    r: {
      iconId: "class_rogue_r",
      damage: "18 × 12 knives",
      cooldown: "11s",
      range: "320",
      extra: "Knives pierce with Pierce upgrades",
    },
  },
  archer: {
    q: {
      iconId: "class_archer_q",
      damage: "35 × 5 arrows",
      cooldown: "6s",
      range: "400",
      extra: "Each arrow pierces 3+ enemies",
    },
    r: {
      iconId: "class_archer_r",
      damage: "32 per enemy",
      cooldown: "13s",
      range: "280",
      extra: "One falling arrow per nearby foe",
    },
  },
};

function classEntries(): SkillStatEntry[] {
  const out: SkillStatEntry[] = [];
  for (const c of CHARACTERS) {
    const meta = CLASS_SKILL_META[c.id];
    out.push({
      category: "class",
      hero: c.name,
      slot: "Q",
      name: c.skillQ.name,
      desc: c.skillQ.desc,
      ...meta.q,
    });
    out.push({
      category: "class",
      hero: c.name,
      slot: "R",
      name: c.skillR.name,
      desc: c.skillR.desc,
      ...meta.r,
    });
  }
  return out;
}

function bonusEntries(): SkillStatEntry[] {
  return [
    {
      category: "bonus",
      iconId: "skill_orbit",
      name: "Orbiting Blades",
      desc: "Blades spin around you and cut nearby foes",
      damage: "19 / hit (Lv 1)",
      cooldown: "Passive",
      range: "Orbit",
      extra: "Lv 2–3: +1 blade, +5 dmg/blade · 0.35s hit CD",
    },
    {
      category: "bonus",
      iconId: "skill_meteor",
      name: "Meteor Shower",
      desc: "Meteors strike random enemies in range",
      damage: "32 / meteor",
      cooldown: `${SKILL_COOLDOWNS.skill_meteor}s`,
      range: "450",
      extra: "Lv 2–3: +1 meteor per cast",
    },
    {
      category: "bonus",
      iconId: "skill_thunder",
      name: "Thunder Strike",
      desc: "Lightning bolt on the nearest foe",
      damage: "36 (Lv 1)",
      cooldown: `${SKILL_COOLDOWNS.skill_thunder}s`,
      range: "420",
      extra: "Lv 2+: chains once (65% dmg) · +8 dmg/lv",
    },
    {
      category: "bonus",
      iconId: "skill_heal",
      name: "Healing Aura",
      desc: "Pulse restores HP over time",
      damage: "—",
      cooldown: `${SKILL_COOLDOWNS.skill_heal}s`,
      range: "Self",
      extra: "Lv 1: +12 HP · +4 HP per level",
    },
  ];
}

export const SKILL_STAT_ENTRIES: SkillStatEntry[] = [
  ...classEntries(),
  ...bonusEntries(),
];

export interface MapStatEntry {
  id: MapId;
  name: string;
  desc: string;
  accentColor: number;
  terrain: string;
  arena: string;
  extra?: string;
}

const MAP_META: Record<MapId, { terrain: string; extra: string }> = {
  graveyard: {
    terrain: "Tombstones · rocks · dead trees",
    extra: "44 obstacles · zombies are the main enemy · rise from tombstones",
  },
  ember: {
    terrain: "Lava rocks · obsidian pillars · roaming volcanoes",
    extra: "Slower spawns · brutes are common · 5 volcanoes erupt and relocate",
  },
  frost: {
    terrain: "Ice pillars · snow boulders · heal crystals",
    extra: "Crystals: +5 HP · 2× speed · +10% attack speed (3s)",
  },
  void: {
    terrain: "Void monoliths · shadow rocks · blink rifts",
    extra: "4 active rifts · both vanish on blink · respawn after 8s",
  },
};

export const MAP_STAT_ENTRIES: MapStatEntry[] = MAPS.map((map) => ({
  id: map.id,
  name: map.name,
  desc: map.desc,
  accentColor: map.accentColor,
  terrain: MAP_META[map.id].terrain,
  arena: "2400 radius circle",
  extra: MAP_META[map.id].extra,
}));

export interface EnemyStatEntry {
  kind: EnemyKind;
  name: string;
  desc: string;
  accent: number;
  tag: string;
  hp: string;
  damage: string;
  speed: string;
  rewards: string;
  extra?: string;
}

const ENEMY_META: Record<
  EnemyKind,
  { name: string; desc: string; spawnNote: string }
> = {
  slimeSmall: {
    name: "Small Slime",
    desc: "Weak swarm fodder — appears in huge numbers",
    spawnNote: "Very common from wave 1",
  },
  bat: {
    name: "Bat",
    desc: "Fast flier that closes gaps quickly",
    spawnNote: "Common · more bats after wave 18",
  },
  ghost: {
    name: "Ghost",
    desc: "Balanced ranged threat with steady pressure",
    spawnNote: "Common from wave 1",
  },
  skeleton: {
    name: "Skeleton",
    desc: "Tougher bones with a bit more bite",
    spawnNote: "Uncommon until wave 3+",
  },
  zombie: {
    name: "Zombie",
    desc: "Slow graveyard shamblers that claw their way out of tombs",
    spawnNote: "Graveyard main enemy · rises from tombstones",
  },
  slimeMedium: {
    name: "Medium Slime",
    desc: "Chunky blob with higher HP and damage",
    spawnNote: "Rare early · more common wave 7+",
  },
  skull: {
    name: "Skull",
    desc: "Quick hitter that punishes slow builds",
    spawnNote: "Uncommon until wave 5+",
  },
  slimeBig: {
    name: "Big Slime",
    desc: "Mini-tank slime with heavy contact damage",
    spawnNote: "Very rare until wave 10+",
  },
  brute: {
    name: "Brute",
    desc: "Elite tank — slow but extremely dangerous",
    spawnNote: "Rare elite · common on Ember Fields · more likely wave 14+",
  },
};

function spawnRarity(weight: number): string {
  if (weight >= 20) return "Very common";
  if (weight >= 12) return "Common";
  if (weight >= 8) return "Uncommon";
  if (weight >= 3) return "Rare";
  return "Very rare";
}

const ENEMY_STAT_ORDER: EnemyKind[] = [
  "slimeSmall",
  "bat",
  "ghost",
  "skeleton",
  "zombie",
  "slimeMedium",
  "skull",
  "slimeBig",
  "brute",
];

export const ENEMY_STAT_ENTRIES: EnemyStatEntry[] = ENEMY_STAT_ORDER.map((kind) => {
  const def = ENEMY_DEFS[kind];
  const meta = ENEMY_META[kind];
  const weight = ENEMY_SPAWN_WEIGHTS[kind];
  return {
    kind,
    name: meta.name,
    desc: meta.desc,
    accent: def.tint,
    tag: kind === "zombie" ? "Graveyard · Main enemy" : spawnRarity(weight),
    hp: `${def.hp}`,
    damage: `${def.damage}`,
    speed: `${def.speed}`,
    rewards: `${def.xp} XP · ${def.gold}g`,
    extra: `${meta.spawnNote} · +HP scales with wave`,
  };
});

export interface TerrainStatEntry {
  kind: InteractiveTerrainKind;
  name: string;
  mapName: string;
  accentColor: number;
  desc: string;
  activation: string;
  cooldown: string;
  effect: string;
  extra?: string;
}

export const TERRAIN_STAT_ENTRIES: TerrainStatEntry[] = [
  {
    kind: "volcano",
    name: "Volcano",
    mapName: "Ember Fields",
    accentColor: 0xff6622,
    desc: TERRAIN_INTERACT.volcano.desc,
    activation: "Passive — always active while present",
    cooldown: `${VOLCANO_CONFIG.eruptInterval}s between eruptions`,
    effect: `${VOLCANO_CONFIG.damage} dmg to enemies · ${VOLCANO_CONFIG.radius} radius`,
    extra: `${VOLCANO_CONFIG.activeCount} volcanoes · dormant after ${VOLCANO_CONFIG.lifetime}s · respawn after ${VOLCANO_CONFIG.respawnDelay}s`,
  },
  {
    kind: "crystal",
    name: "Frost Crystal",
    mapName: "Frost Ruins",
    accentColor: 0x88ccff,
    desc: TERRAIN_INTERACT.crystal.desc,
    activation: `Walk within ${TERRAIN_INTERACT.crystal.triggerRadius} units`,
    cooldown: `${TERRAIN_INTERACT.crystal.cooldown}s per crystal`,
    effect: `+${CRYSTAL_BUFF.heal} HP · ${CRYSTAL_BUFF.speedMult}× speed · +${Math.round((CRYSTAL_BUFF.attackRateMult - 1) * 100)}% attack speed (${CRYSTAL_BUFF.duration}s)`,
    extra: "10 crystals spread across the map",
  },
  {
    kind: "rift",
    name: "Void Rift",
    mapName: "Void Chasm",
    accentColor: 0xaa66ff,
    desc: TERRAIN_INTERACT.rift.desc,
    activation: `Walk within ${TERRAIN_INTERACT.rift.triggerRadius} units`,
    cooldown: `${TERRAIN_INTERACT.rift.cooldown}s per rift`,
    effect: "Blink to a random other active rift",
    extra: `${RIFT_CONFIG.activeCount} rifts at once · both vanish · respawn after ${RIFT_CONFIG.respawnDelay}s`,
  },
];

export type StatTab = "skills" | "maps" | "enemies" | "terrain";

export const STAT_TABS: { id: StatTab; label: string }[] = [
  { id: "skills", label: "Skills" },
  { id: "maps", label: "Maps" },
  { id: "enemies", label: "Enemies" },
  { id: "terrain", label: "Terrain" },
];

export function getStatEntryCount(tab: StatTab): number {
  switch (tab) {
    case "skills":
      return SKILL_STAT_ENTRIES.length;
    case "maps":
      return MAP_STAT_ENTRIES.length;
    case "enemies":
      return ENEMY_STAT_ENTRIES.length;
    case "terrain":
      return TERRAIN_STAT_ENTRIES.length;
  }
}
