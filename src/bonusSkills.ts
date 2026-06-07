import { Container, Graphics } from "pixi.js";
import type { UpgradeId } from "./data";

export const SKILL_UPGRADE_IDS = [
  "skill_orbit",
  "skill_meteor",
  "skill_thunder",
  "skill_heal",
] as const;

export type SkillUpgradeId = (typeof SKILL_UPGRADE_IDS)[number];

export function isSkillUpgrade(id: UpgradeId): id is SkillUpgradeId {
  return (SKILL_UPGRADE_IDS as readonly string[]).includes(id);
}

export interface OrbiterConfig {
  count: number;
  orbitRadius: number;
  orbitSpeed: number;
  damage: number;
  hitRadius: number;
  hitCooldown: number;
}

export function getOrbiterConfig(
  level: number,
  damageMult: number,
): OrbiterConfig | null {
  if (level <= 0) return null;
  return {
    count: level,
    orbitRadius: 50 + level * 8,
    orbitSpeed: 2.8 + level * 0.3,
    damage: Math.round((14 + level * 5) * damageMult),
    hitRadius: 14,
    hitCooldown: 0.35,
  };
}

function createOrbiterBlade(): Container {
  const blade = new Container();
  const g = new Graphics();
  g.moveTo(0, -12)
    .lineTo(5, -3)
    .lineTo(12, 0)
    .lineTo(5, 3)
    .lineTo(0, 12)
    .lineTo(-5, 3)
    .lineTo(-12, 0)
    .lineTo(-5, -3)
    .closePath()
    .fill(0xff5544);
  g.stroke({ width: 2, color: 0xffaa88 });
  g.circle(0, 0, 3).fill(0xffeedd);
  blade.addChild(g);
  return blade;
}

interface OrbiterBlade {
  gfx: Container;
  angleOffset: number;
}

export class OrbiterSystem {
  private readonly root = new Container();
  private readonly blades: OrbiterBlade[] = [];
  private globalAngle = 0;
  private config: OrbiterConfig | null = null;

  constructor(parent: Container) {
    parent.addChild(this.root);
  }

  setConfig(config: OrbiterConfig | null) {
    this.config = config;
    this.syncBlades();
    this.root.visible = config !== null && config.count > 0;
  }

  private syncBlades() {
    const count = this.config?.count ?? 0;
    while (this.blades.length > count) {
      const blade = this.blades.pop()!;
      this.root.removeChild(blade.gfx);
      blade.gfx.destroy({ children: true });
    }
    while (this.blades.length < count) {
      const gfx = createOrbiterBlade();
      this.root.addChild(gfx);
      this.blades.push({ gfx, angleOffset: 0 });
    }
    const n = this.blades.length || 1;
    this.blades.forEach((blade, i) => {
      blade.angleOffset = (i / n) * Math.PI * 2;
    });
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    enemies: {
      x: number;
      y: number;
      radius: number;
      orbiterHitCooldown: number;
      spawnTimer: number;
    }[],
    onHit: (index: number, damage: number) => void,
  ) {
    if (!this.config || this.config.count <= 0) return;

    const { orbitRadius, orbitSpeed, damage, hitRadius, hitCooldown } =
      this.config;
    this.globalAngle += orbitSpeed * dt;

    for (const blade of this.blades) {
      const angle = this.globalAngle + blade.angleOffset;
      blade.gfx.position.set(
        playerX + Math.cos(angle) * orbitRadius,
        playerY + Math.sin(angle) * orbitRadius,
      );
      blade.gfx.rotation = angle + Math.PI / 2;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.spawnTimer > 0 || enemy.orbiterHitCooldown > 0) continue;

      for (const blade of this.blades) {
        const dx = blade.gfx.x - enemy.x;
        const dy = blade.gfx.y - enemy.y;
        if (Math.hypot(dx, dy) >= hitRadius + enemy.radius) continue;
        enemy.orbiterHitCooldown = hitCooldown;
        onHit(i, damage);
        break;
      }
    }
  }

  destroy() {
    for (const blade of this.blades) {
      blade.gfx.destroy({ children: true });
    }
    this.blades.length = 0;
    this.root.destroy({ children: true });
  }
}

export function getSkillUpgradeDesc(id: SkillUpgradeId, level: number): string {
  switch (id) {
    case "skill_orbit":
      return level === 0
        ? "Unlock orbiting blades"
        : `+1 orbiting blade (${level + 1} total)`;
    case "skill_meteor":
      return level === 0
        ? "Unlock meteor strikes"
        : `+1 meteor per cast (${level + 1} total)`;
    case "skill_thunder":
      return level === 0
        ? "Unlock thunder bolts"
        : "Stronger thunder (+25% dmg)";
    case "skill_heal":
      return level === 0
        ? "Unlock healing aura"
        : `+4 HP per pulse (Lv ${level + 1})`;
    default:
      return "";
  }
}

export const SKILL_COOLDOWNS: Record<
  Exclude<SkillUpgradeId, "skill_orbit">,
  number
> = {
  skill_meteor: 7,
  skill_thunder: 5,
  skill_heal: 9,
};
