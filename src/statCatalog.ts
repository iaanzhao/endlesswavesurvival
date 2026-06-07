import { CHARACTERS } from "./data";
import { SKILL_COOLDOWNS } from "./bonusSkills";
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
