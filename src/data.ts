export type CharacterId = "mage" | "knight" | "rogue" | "archer";

export type AttackKind = "magic" | "melee" | "knife" | "arrow";

export interface SkillDef {
  name: string;
  desc: string;
  cooldown: number;
  color: number;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  tagline: string;
  color: number;
  accent: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRate: number;
  range: number;
  attackKind: AttackKind;
  projectileSpeed: number;
  skillQ: SkillDef;
  skillR: SkillDef;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "mage",
    name: "MAGE",
    tagline: "Wide area magic damage",
    color: 0x6b48c8,
    accent: 0xa888ff,
    maxHp: 80,
    speed: 145,
    damage: 22,
    attackRate: 1.1,
    range: 280,
    attackKind: "magic",
    projectileSpeed: 340,
    skillQ: {
      name: "Fire Nova",
      desc: "Blast all nearby foes",
      cooldown: 8,
      color: 0xff6622,
    },
    skillR: {
      name: "Chain Lightning",
      desc: "Lightning jumps between enemies",
      cooldown: 5,
      color: 0x66ccff,
    },
  },
  {
    id: "knight",
    name: "KNIGHT",
    tagline: "Heavy melee & defense",
    color: 0x8899aa,
    accent: 0xc8d8e8,
    maxHp: 140,
    speed: 120,
    damage: 38,
    attackRate: 0.85,
    range: 72,
    attackKind: "melee",
    projectileSpeed: 0,
    skillQ: {
      name: "Shield Bash",
      desc: "Stun and damage in front",
      cooldown: 7,
      color: 0x88aacc,
    },
    skillR: {
      name: "Whirlwind",
      desc: "Spin and hit all around",
      cooldown: 12,
      color: 0xddddff,
    },
  },
  {
    id: "rogue",
    name: "ROGUE",
    tagline: "Speed and critical hits",
    color: 0x3a8858,
    accent: 0x66cc88,
    maxHp: 95,
    speed: 175,
    damage: 16,
    attackRate: 2.2,
    range: 200,
    attackKind: "knife",
    projectileSpeed: 460,
    skillQ: {
      name: "Smoke Bomb",
      desc: "Brief invisibility & speed",
      cooldown: 9,
      color: 0x888888,
    },
    skillR: {
      name: "Blade Flurry",
      desc: "Rapid knives in all directions",
      cooldown: 11,
      color: 0x44ff88,
    },
  },
  {
    id: "archer",
    name: "ARCHER",
    tagline: "Ranged kiting specialist",
    color: 0x886644,
    accent: 0xcc9966,
    maxHp: 100,
    speed: 150,
    damage: 20,
    attackRate: 1.4,
    range: 360,
    attackKind: "arrow",
    projectileSpeed: 520,
    skillQ: {
      name: "Power Shot",
      desc: "Piercing arrow burst",
      cooldown: 6,
      color: 0xffcc44,
    },
    skillR: {
      name: "Arrow Rain",
      desc: "Arrows fall on nearby foes",
      cooldown: 13,
      color: 0xff8844,
    },
  },
];

export type EnemyKind =
  | "ghost"
  | "skeleton"
  | "slimeSmall"
  | "slimeMedium"
  | "slimeBig"
  | "skull"
  | "bat"
  | "brute";

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  xp: number;
  gold: number;
  tint: number;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  ghost: {
    kind: "ghost",
    hp: 30,
    speed: 68,
    radius: 15,
    damage: 12,
    xp: 6,
    gold: 1,
    tint: 0xe8e4ff,
  },
  skeleton: {
    kind: "skeleton",
    hp: 42,
    speed: 72,
    radius: 14,
    damage: 15,
    xp: 8,
    gold: 1,
    tint: 0xf0eee0,
  },
  slimeSmall: {
    kind: "slimeSmall",
    hp: 16,
    speed: 58,
    radius: 10,
    damage: 9,
    xp: 5,
    gold: 1,
    tint: 0xe0ffe8,
  },
  slimeMedium: {
    kind: "slimeMedium",
    hp: 55,
    speed: 62,
    radius: 13,
    damage: 18,
    xp: 10,
    gold: 2,
    tint: 0xc8ffd8,
  },
  slimeBig: {
    kind: "slimeBig",
    hp: 90,
    speed: 48,
    radius: 18,
    damage: 27,
    xp: 16,
    gold: 3,
    tint: 0xa8ffcc,
  },
  skull: {
    kind: "skull",
    hp: 50,
    speed: 80,
    radius: 15,
    damage: 18,
    xp: 9,
    gold: 2,
    tint: 0xffe8e0,
  },
  bat: {
    kind: "bat",
    hp: 28,
    speed: 95,
    radius: 14,
    damage: 10,
    xp: 6,
    gold: 1,
    tint: 0xe8e0ff,
  },
  brute: {
    kind: "brute",
    hp: 160,
    speed: 52,
    radius: 22,
    damage: 33,
    xp: 28,
    gold: 5,
    tint: 0xffe8d8,
  },
};

export const ENEMY_SPAWN_WEIGHTS: Record<EnemyKind, number> = {
  slimeSmall: 30,
  ghost: 18,
  bat: 16,
  skeleton: 14,
  slimeMedium: 10,
  skull: 8,
  slimeBig: 3,
  brute: 1,
};

export type UpgradeId =
  | "vitality"
  | "recovery"
  | "armor"
  | "haste"
  | "might"
  | "swift_strike"
  | "multishot"
  | "pierce"
  | "area"
  | "magnet"
  | "wisdom"
  | "crit"
  | "cooldown"
  | "skill_orbit"
  | "skill_meteor"
  | "skill_thunder"
  | "skill_heal";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  icon: string;
  maxLevel: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "vitality",
    name: "Vitality",
    desc: "+15 max HP",
    icon: "♥",
    maxLevel: 99,
  },
  {
    id: "recovery",
    name: "Recovery",
    desc: "+0.4 HP/sec regen",
    icon: "+",
    maxLevel: 99,
  },
  {
    id: "armor",
    name: "Armor",
    desc: "+5% damage reduction",
    icon: "⛨",
    maxLevel: 99,
  },
  {
    id: "haste",
    name: "Haste",
    desc: "+8% move speed",
    icon: "»",
    maxLevel: 99,
  },
  {
    id: "might",
    name: "Might",
    desc: "+12% damage",
    icon: "⚔",
    maxLevel: 99,
  },
  {
    id: "swift_strike",
    name: "Swift Strike",
    desc: "+10% attack speed",
    icon: "⚡",
    maxLevel: 99,
  },
  {
    id: "multishot",
    name: "Multishot",
    desc: "+1 projectile per attack",
    icon: "✦",
    maxLevel: 8,
  },
  {
    id: "pierce",
    name: "Pierce",
    desc: "Projectiles pierce +1 enemy",
    icon: "→",
    maxLevel: 6,
  },
  {
    id: "area",
    name: "Area",
    desc: "+15% attack area",
    icon: "◎",
    maxLevel: 99,
  },
  {
    id: "magnet",
    name: "Magnet",
    desc: "+40 pickup range",
    icon: "◉",
    maxLevel: 99,
  },
  {
    id: "wisdom",
    name: "Wisdom",
    desc: "+12% XP gain",
    icon: "★",
    maxLevel: 99,
  },
  {
    id: "crit",
    name: "Critical",
    desc: "+6% crit chance (2× dmg)",
    icon: "✸",
    maxLevel: 99,
  },
  {
    id: "cooldown",
    name: "Cooldown",
    desc: "-8% skill cooldown",
    icon: "⏱",
    maxLevel: 99,
  },
  {
    id: "skill_orbit",
    name: "Orbiting Blades",
    desc: "Unlock orbiting blades",
    icon: "◈",
    maxLevel: 3,
  },
  {
    id: "skill_meteor",
    name: "Meteor Shower",
    desc: "Unlock meteor strikes",
    icon: "☄",
    maxLevel: 3,
  },
  {
    id: "skill_thunder",
    name: "Thunder Strike",
    desc: "Unlock thunder bolts",
    icon: "⚡",
    maxLevel: 3,
  },
  {
    id: "skill_heal",
    name: "Healing Aura",
    desc: "Unlock healing pulses",
    icon: "✚",
    maxLevel: 3,
  },
];

export type ShopItemId =
  | "health_potion"
  | "damage_tonic"
  | "speed_boots"
  | "xp_scroll"
  | "armor_charm"
  | "revive_token";

export interface ShopItemDef {
  id: ShopItemId;
  name: string;
  desc: string;
  cost: number;
  unlockGold: number;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: "health_potion",
    name: "Health Potion",
    desc: "Start with +30 HP",
    cost: 15,
    unlockGold: 0,
  },
  {
    id: "damage_tonic",
    name: "Damage Tonic",
    desc: "Start with +15% damage",
    cost: 25,
    unlockGold: 20,
  },
  {
    id: "speed_boots",
    name: "Speed Boots",
    desc: "Start with +10% speed",
    cost: 20,
    unlockGold: 15,
  },
  {
    id: "xp_scroll",
    name: "XP Scroll",
    desc: "Start with +20% XP",
    cost: 30,
    unlockGold: 40,
  },
  {
    id: "armor_charm",
    name: "Armor Charm",
    desc: "Start with +10% armor",
    cost: 35,
    unlockGold: 60,
  },
  {
    id: "revive_token",
    name: "Revive Token",
    desc: "Revive once per run",
    cost: 50,
    unlockGold: 100,
  },
];

export interface SaveData {
  totalGold: number;
  lifetimeGold: number;
  highScore: number;
  bestTime: number;
  shopOwned: Record<ShopItemId, boolean>;
  shopActive: Record<ShopItemId, boolean>;
  unlockedShop: Record<ShopItemId, boolean>;
}

export function defaultRunShopBuffs(): Record<ShopItemId, boolean> {
  return Object.fromEntries(
    SHOP_ITEMS.map((s) => [s.id, false]),
  ) as Record<ShopItemId, boolean>;
}

export function defaultSave(): SaveData {
  const shopOwned = Object.fromEntries(
    SHOP_ITEMS.map((s) => [s.id, false]),
  ) as Record<ShopItemId, boolean>;
  const shopActive = Object.fromEntries(
    SHOP_ITEMS.map((s) => [s.id, false]),
  ) as Record<ShopItemId, boolean>;
  const unlockedShop = Object.fromEntries(
    SHOP_ITEMS.map((s) => [s.id, s.unlockGold === 0]),
  ) as Record<ShopItemId, boolean>;
  return {
    totalGold: 0,
    lifetimeGold: 0,
    highScore: 0,
    bestTime: 0,
    shopOwned,
    shopActive,
    unlockedShop,
  };
}

export function getCharacter(id: CharacterId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export type DifficultyId = "easy" | "normal" | "hard";

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  desc: string;
  enemyHpMult: number;
  enemyDamageMult: number;
  enemySpeedMult: number;
  spawnIntervalMult: number;
  spawnBatchMult: number;
  rewardMult: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "easy",
    name: "Easy",
    desc: "Weaker enemies, slower spawns",
    enemyHpMult: 0.82,
    enemyDamageMult: 0.75,
    enemySpeedMult: 0.92,
    spawnIntervalMult: 1.2,
    spawnBatchMult: 0.85,
    rewardMult: 0.9,
  },
  {
    id: "normal",
    name: "Normal",
    desc: "Balanced challenge",
    enemyHpMult: 1,
    enemyDamageMult: 1,
    enemySpeedMult: 1,
    spawnIntervalMult: 1,
    spawnBatchMult: 1,
    rewardMult: 1,
  },
  {
    id: "hard",
    name: "Hard",
    desc: "Tougher foes, faster waves",
    enemyHpMult: 1.35,
    enemyDamageMult: 1.28,
    enemySpeedMult: 1.1,
    spawnIntervalMult: 0.82,
    spawnBatchMult: 1.2,
    rewardMult: 1.15,
  },
];

export function getDifficulty(id: DifficultyId): DifficultyDef {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

export type MapId = "graveyard" | "ember" | "frost" | "void";

export interface MapDef {
  id: MapId;
  name: string;
  desc: string;
  tileA: number;
  tileB: number;
  borderColor: number;
  accentColor: number;
}

export const MAPS: MapDef[] = [
  {
    id: "graveyard",
    name: "Graveyard",
    desc: "Misty stone ruins",
    tileA: 0x1a2230,
    tileB: 0x151c28,
    borderColor: 0x334455,
    accentColor: 0x667788,
  },
  {
    id: "ember",
    name: "Ember Fields",
    desc: "Scorched lava flats",
    tileA: 0x2a1410,
    tileB: 0x1e0e0a,
    borderColor: 0x884422,
    accentColor: 0xff6622,
  },
  {
    id: "frost",
    name: "Frost Ruins",
    desc: "Frozen crystal wastes",
    tileA: 0x1a2838,
    tileB: 0x142030,
    borderColor: 0x4488aa,
    accentColor: 0x88ccff,
  },
  {
    id: "void",
    name: "Void Chasm",
    desc: "Twisted shadow realm",
    tileA: 0x18141e,
    tileB: 0x100c14,
    borderColor: 0x6644aa,
    accentColor: 0xaa66ff,
  },
];

export function getMap(id: MapId): MapDef {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

export function spawnIntervalForWave(wave: number, difficulty?: DifficultyDef): number {
  const base = Math.max(0.25, 1.4 - wave * 0.035);
  return base * (difficulty?.spawnIntervalMult ?? 1);
}

export function spawnBatchForWave(wave: number, difficulty?: DifficultyDef): number {
  const base = 1 + Math.floor(wave / 6);
  return Math.max(1, Math.round(base * (difficulty?.spawnBatchMult ?? 1)));
}

export function waveEnemyHpBonus(wave: number, kind: EnemyKind): number {
  const base = wave * 4 + Math.floor(wave / 5) * 8;
  if (kind === "brute") return base * 1.5;
  if (kind === "slimeBig") return base * 1.2;
  return base;
}

export function getUpgrade(id: UpgradeId): UpgradeDef {
  return UPGRADES.find((u) => u.id === id) ?? UPGRADES[0];
}

export interface AppliedStats {
  maxHp: number;
  regen: number;
  armor: number;
  speed: number;
  damageMult: number;
  attackRateMult: number;
  multishot: number;
  pierce: number;
  areaMult: number;
  magnet: number;
  xpMult: number;
  critChance: number;
  cooldownMult: number;
}

export function computeStats(
  character: CharacterDef,
  levels: Partial<Record<UpgradeId, number>>,
  runShopBuffs: Record<ShopItemId, boolean>,
): AppliedStats {
  const lv = (id: UpgradeId) => levels[id] ?? 0;
  return {
    maxHp:
      character.maxHp +
      lv("vitality") * 15 +
      (runShopBuffs.health_potion ? 30 : 0),
    regen: lv("recovery") * 0.4,
    armor:
      Math.min(0.75, lv("armor") * 0.05 + (runShopBuffs.armor_charm ? 0.1 : 0)),
    speed:
      character.speed *
      (1 + lv("haste") * 0.08 + (runShopBuffs.speed_boots ? 0.1 : 0)),
    damageMult:
      (1 + lv("might") * 0.12) * (runShopBuffs.damage_tonic ? 1.15 : 1),
    attackRateMult: 1 + lv("swift_strike") * 0.1,
    multishot: 1 + lv("multishot"),
    pierce: lv("pierce"),
    areaMult: 1 + lv("area") * 0.15,
    magnet: 60 + lv("magnet") * 40,
    xpMult: (1 + lv("wisdom") * 0.12) * (runShopBuffs.xp_scroll ? 1.2 : 1),
    critChance: lv("crit") * 0.06,
    cooldownMult: Math.max(0.35, 1 - lv("cooldown") * 0.08),
  };
}

export function pickWeightedEnemy(wave: number): EnemyKind {
  const weights = { ...ENEMY_SPAWN_WEIGHTS };
  if (wave >= 3) weights.skeleton += 4;
  if (wave >= 5) weights.skull += 3;
  if (wave >= 7) weights.slimeMedium += 4;
  if (wave >= 10) weights.slimeBig += 3;
  if (wave >= 14) weights.brute += 2;
  if (wave >= 18) weights.bat += 4;

  let total = 0;
  for (const w of Object.values(weights)) total += w;
  let roll = Math.random() * total;
  for (const [kind, w] of Object.entries(weights) as [EnemyKind, number][]) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return "slimeSmall";
}
