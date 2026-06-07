import { Graphics } from "pixi.js";
import type { AttackKind } from "./data";

export interface TransientFx {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  gfx: Graphics;
  kind:
    | "muzzle"
    | "hit"
    | "ring"
    | "bolt"
    | "slash"
    | "nova"
    | "shockwave"
    | "whirl"
    | "smoke"
    | "flurry"
    | "marker"
    | "meteor"
    | "healAura"
    | "lightning";
  color: number;
  radius: number;
  angle: number;
  x2: number;
  y2: number;
}

export function drawProjectileBody(
  g: Graphics,
  attackKind: AttackKind,
  radius: number,
  color: number,
  _spin: number,
  trail: number,
): void {
  g.clear();
  const hi = lighten(color, 40);

  switch (attackKind) {
    case "magic": {
      g.circle(0, 0, radius * 1.5).fill({ color, alpha: 0.18 + trail * 0.12 });
      g.circle(0, 0, radius).fill({ color, alpha: 0.55 });
      g.circle(0, 0, radius * 0.55).fill(hi);
      g.circle(-radius * 0.3, -radius * 0.3, radius * 0.25).fill({
        color: 0xffffff,
        alpha: 0.45,
      });
      if (trail > 0.05) {
        g.moveTo(-radius * 2.2 * trail, 0)
          .lineTo(-radius * 0.4, 0)
          .stroke({ width: radius * 0.9, color, alpha: trail * 0.35 });
      }
      break;
    }
    case "arrow": {
      const len = 14;
      g.moveTo(-len - trail * 10, 0)
        .lineTo(len, 0)
        .stroke({ width: 3, color: 0x886644 });
      g.moveTo(len - 2, 0)
        .lineTo(len + 4, -3)
        .lineTo(len + 4, 3)
        .closePath()
        .fill(color);
      g.moveTo(-len - trail * 8, 0)
        .lineTo(-len, 0)
        .stroke({ width: 2, color: hi, alpha: 0.5 + trail * 0.3 });
      g.moveTo(-len + 2, -3).lineTo(-len + 2, 3).stroke({ width: 1, color: 0xccaa88 });
      break;
    }
    case "knife": {
      g.moveTo(-6, 0).lineTo(8, 0).stroke({ width: 3, color: 0x667766 });
      g.moveTo(4, -2).lineTo(10, 0).lineTo(4, 2).closePath().fill(color);
      g.circle(8, 0, 2).fill(hi);
      g.moveTo(-8, 0).lineTo(-4, 0).stroke({ width: 2, color: hi, alpha: 0.4 + trail * 0.3 });
      break;
    }
    case "melee":
      break;
  }
}

export function drawMeleeSlash(
  g: Graphics,
  radius: number,
  color: number,
  angle: number,
  progress: number,
): void {
  g.clear();
  const expand = easeOutQuad(Math.min(1, progress * 1.4));
  const fade = 1 - easeInQuad(Math.max(0, (progress - 0.35) / 0.65));
  const r = radius * (0.35 + expand * 0.75);
  const arcSpan = 0.55 + expand * 0.65;
  const alpha = fade * (0.75 - progress * 0.25);

  g.arc(0, 0, r, angle - arcSpan, angle + arcSpan).stroke({
    width: 10 + expand * 8,
    color,
    alpha: alpha * 0.35,
  });
  g.arc(0, 0, r * 0.92, angle - arcSpan * 0.85, angle + arcSpan * 0.85).stroke({
    width: 4 + expand * 4,
    color: lighten(color, 50),
    alpha: alpha * 0.85,
  });
  g.moveTo(0, 0)
    .lineTo(Math.cos(angle) * r * 0.7, Math.sin(angle) * r * 0.7)
    .stroke({ width: 3, color: 0xffffff, alpha: alpha * 0.4 });
}

export function spawnMuzzleFlash(
  x: number,
  y: number,
  angle: number,
  color: number,
  attackKind: AttackKind,
): Omit<TransientFx, "gfx"> {
  const size =
    attackKind === "magic" ? 22 : attackKind === "arrow" ? 16 : attackKind === "knife" ? 12 : 20;
  return {
    x,
    y,
    life: 0.12,
    maxLife: 0.12,
    kind: "muzzle",
    color,
    radius: size,
    angle,
    x2: 0,
    y2: 0,
  };
}

export function spawnHitBurst(
  x: number,
  y: number,
  color: number,
  crit: boolean,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: crit ? 0.22 : 0.16,
    maxLife: crit ? 0.22 : 0.16,
    kind: "hit",
    color: crit ? 0xffdd44 : color,
    radius: crit ? 18 : 12,
    angle: Math.random() * Math.PI * 2,
    x2: 0,
    y2: 0,
  };
}

export function spawnRingFx(
  x: number,
  y: number,
  radius: number,
  color: number,
  duration = 0.28,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "ring",
    color,
    radius,
    angle: 0,
    x2: 0,
    y2: 0,
  };
}

export function spawnBoltFx(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
): Omit<TransientFx, "gfx"> {
  return spawnLightningFx(x1, y1, x2, y2, color, 0.18);
}

export function spawnLightningFx(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  duration = 0.22,
): Omit<TransientFx, "gfx"> {
  return {
    x: x1,
    y: y1,
    life: duration,
    maxLife: duration,
    kind: "lightning",
    color,
    radius: 0,
    angle: 0,
    x2,
    y2,
  };
}

export function spawnNovaFx(
  x: number,
  y: number,
  radius: number,
  color: number,
  duration = 0.45,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "nova",
    color,
    radius,
    angle: 0,
    x2: 0,
    y2: 0,
  };
}

export function spawnShockwaveFx(
  x: number,
  y: number,
  angle: number,
  radius: number,
  color: number,
  duration = 0.32,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "shockwave",
    color,
    radius,
    angle,
    x2: 0,
    y2: 0,
  };
}

export function spawnWhirlFx(
  x: number,
  y: number,
  radius: number,
  color: number,
  duration = 0.4,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "whirl",
    color,
    radius,
    angle: 0,
    x2: 0,
    y2: 0,
  };
}

export function spawnSmokeFx(
  x: number,
  y: number,
  duration = 0.75,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "smoke",
    color: 0x667766,
    radius: 48,
    angle: 0,
    x2: 0,
    y2: 0,
  };
}

export function spawnFlurryFx(
  x: number,
  y: number,
  color: number,
  duration = 0.28,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "flurry",
    color,
    radius: 70,
    angle: 0,
    x2: 0,
    y2: 0,
  };
}

export function spawnRainMarkerFx(
  x: number,
  y: number,
  duration = 0.38,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "marker",
    color: 0xff8844,
    radius: 22,
    angle: 0,
    x2: 0,
    y2: 0,
  };
}

export function spawnMeteorFx(
  x: number,
  y: number,
  duration = 0.52,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "meteor",
    color: 0xff6622,
    radius: 36,
    angle: 0,
    x2: 0,
    y2: 0,
  };
}

export function spawnHealAuraFx(
  x: number,
  y: number,
  radius: number,
  duration = 0.48,
): Omit<TransientFx, "gfx"> {
  return {
    x,
    y,
    life: duration,
    maxLife: duration,
    kind: "healAura",
    color: 0x55dd77,
    radius,
    angle: 0,
    x2: 0,
    y2: 0,
  };
}

export function paintTransientFx(fx: TransientFx): void {
  const g = fx.gfx;
  g.clear();
  const t = 1 - fx.life / fx.maxLife;

  switch (fx.kind) {
    case "muzzle": {
      const alpha = 1 - t;
      const spread = fx.radius * (0.6 + t * 0.8);
      g.circle(0, 0, spread).fill({ color: fx.color, alpha: alpha * 0.25 });
      g.circle(0, 0, spread * 0.45).fill({ color: 0xffffff, alpha: alpha * 0.55 });
      const len = spread * 1.2;
      g.moveTo(0, 0)
        .lineTo(Math.cos(fx.angle) * len, Math.sin(fx.angle) * len)
        .stroke({ width: 4, color: fx.color, alpha: alpha * 0.7 });
      break;
    }
    case "hit": {
      const alpha = 1 - t;
      for (let i = 0; i < 6; i++) {
        const a = fx.angle + (i / 6) * Math.PI * 2;
        const len = fx.radius * (0.4 + t * 1.1);
        g.moveTo(0, 0)
          .lineTo(Math.cos(a) * len, Math.sin(a) * len)
          .stroke({ width: 2, color: fx.color, alpha: alpha * 0.75 });
      }
      g.circle(0, 0, fx.radius * 0.35 * (1 - t)).fill({
        color: fx.color,
        alpha: alpha * 0.5,
      });
      break;
    }
    case "ring": {
      g.circle(0, 0, fx.radius * (0.5 + t * 1.05)).stroke({
        width: 3 + t * 2,
        color: fx.color,
        alpha: 1 - t,
      });
      g.circle(0, 0, fx.radius * (0.35 + t * 0.7)).stroke({
        width: 1,
        color: 0xffffff,
        alpha: (1 - t) * 0.35,
      });
      break;
    }
    case "bolt":
    case "lightning": {
      const alpha = 1 - t;
      const dx = fx.x2 - fx.x;
      const dy = fx.y2 - fx.y;
      drawJaggedBolt(g, 0, 0, dx, dy, fx.color, alpha * 0.95, 7);
      drawJaggedBolt(g, 0, 0, dx, dy, 0xffffff, alpha * 0.3, 5);
      const flashR = 10 + t * 6;
      g.circle(0, 0, flashR).fill({ color: fx.color, alpha: alpha * 0.35 });
      g.circle(dx, dy, flashR * 0.85).fill({ color: fx.color, alpha: alpha * 0.45 });
      g.circle(dx, dy, flashR * 0.4).fill({ color: 0xffffff, alpha: alpha * 0.55 });
      break;
    }
    case "nova": {
      const alpha = 1 - t;
      const r = fx.radius * easeOutQuad(t);
      g.circle(0, 0, r * 0.25).fill({ color: 0xffffff, alpha: alpha * 0.55 });
      g.circle(0, 0, r * 0.55).fill({ color: fx.color, alpha: alpha * 0.35 });
      g.circle(0, 0, r).stroke({ width: 4 + t * 3, color: fx.color, alpha: alpha * 0.85 });
      g.circle(0, 0, r * 0.82).stroke({ width: 2, color: 0xffdd88, alpha: alpha * 0.5 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + t * 0.8;
        const len = r * (0.55 + (i % 3) * 0.12);
        g.moveTo(0, 0)
          .lineTo(Math.cos(a) * len, Math.sin(a) * len)
          .stroke({ width: 3 - t * 1.5, color: lighten(fx.color, 30), alpha: alpha * 0.7 });
      }
      break;
    }
    case "shockwave": {
      const alpha = 1 - t;
      const r = fx.radius * (0.4 + easeOutQuad(t) * 0.85);
      const span = 1.1;
      g.arc(0, 0, r, fx.angle - span, fx.angle + span).stroke({
        width: 14 + t * 10,
        color: fx.color,
        alpha: alpha * 0.3,
      });
      g.arc(0, 0, r * 0.92, fx.angle - span * 0.85, fx.angle + span * 0.85).stroke({
        width: 5 + t * 4,
        color: lighten(fx.color, 40),
        alpha: alpha * 0.85,
      });
      for (let i = -2; i <= 2; i++) {
        const a = fx.angle + i * 0.22;
        g.moveTo(0, 0)
          .lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75)
          .stroke({ width: 2, color: 0xffffff, alpha: alpha * 0.35 });
      }
      break;
    }
    case "whirl": {
      const alpha = 1 - t;
      const spin = t * Math.PI * 4;
      const r = fx.radius * (0.35 + easeOutQuad(t) * 0.75);
      for (let i = 0; i < 6; i++) {
        const a = spin + (i / 6) * Math.PI * 2;
        const arcSpan = 0.45 + easeOutQuad(t) * 0.35;
        const bladeAlpha = alpha * (0.85 - i * 0.05);
        g.arc(0, 0, r, a - arcSpan, a + arcSpan).stroke({
          width: 8 + t * 6,
          color: fx.color,
          alpha: bladeAlpha * 0.35,
        });
        g.arc(0, 0, r * 0.92, a - arcSpan * 0.85, a + arcSpan * 0.85).stroke({
          width: 3 + t * 3,
          color: lighten(fx.color, 50),
          alpha: bladeAlpha * 0.85,
        });
      }
      g.circle(0, 0, r * 0.35).stroke({ width: 2, color: 0xffffff, alpha: alpha * 0.4 });
      break;
    }
    case "smoke": {
      const alpha = 1 - t;
      const puffs = 7;
      for (let i = 0; i < puffs; i++) {
        const seed = i * 1.37;
        const drift = fx.radius * t * (0.4 + (i % 3) * 0.15);
        const px = Math.cos(seed) * drift;
        const py = Math.sin(seed) * drift - t * 12;
        const size = fx.radius * (0.35 + (i % 4) * 0.08) * (0.7 + t * 0.5);
        g.circle(px, py, size).fill({ color: fx.color, alpha: alpha * 0.22 });
        g.circle(px, py, size * 0.55).fill({ color: 0x99aa99, alpha: alpha * 0.15 });
      }
      g.circle(0, 0, fx.radius * 0.3 * (1 - t * 0.5)).fill({
        color: 0x445544,
        alpha: alpha * 0.35,
      });
      break;
    }
    case "flurry": {
      const alpha = 1 - t;
      const spin = t * Math.PI * 3;
      const r = fx.radius * (0.3 + easeOutQuad(t) * 0.85);
      for (let i = 0; i < 12; i++) {
        const a = spin + (i / 12) * Math.PI * 2;
        const len = r * (0.6 + (i % 2) * 0.2);
        g.moveTo(0, 0)
          .lineTo(Math.cos(a) * len, Math.sin(a) * len)
          .stroke({ width: 3, color: fx.color, alpha: alpha * 0.75 });
        g.moveTo(Math.cos(a) * len * 0.7, Math.sin(a) * len * 0.7)
          .lineTo(Math.cos(a) * len, Math.sin(a) * len)
          .stroke({ width: 5, color: lighten(fx.color, 50), alpha: alpha * 0.45 });
      }
      g.circle(0, 0, r * 0.2).fill({ color: 0xffffff, alpha: alpha * 0.4 });
      break;
    }
    case "marker": {
      const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
      const alpha = 1 - t * 0.85;
      const r = fx.radius * (1.1 - t * 0.35 + pulse * 0.15);
      g.circle(0, 0, r).stroke({ width: 2, color: fx.color, alpha: alpha * 0.9 });
      g.circle(0, 0, r * 0.55).stroke({ width: 1, color: 0xffffff, alpha: alpha * 0.35 });
      g.moveTo(-r, 0).lineTo(r, 0).stroke({ width: 1, color: fx.color, alpha: alpha * 0.5 });
      g.moveTo(0, -r).lineTo(0, r).stroke({ width: 1, color: fx.color, alpha: alpha * 0.5 });
      if (t > 0.55) {
        const strikeT = (t - 0.55) / 0.45;
        g.moveTo(0, -80 * (1 - strikeT))
          .lineTo(0, 0)
          .stroke({ width: 3, color: 0xffcc88, alpha: (1 - strikeT) * 0.8 });
      }
      break;
    }
    case "meteor": {
      const fallEnd = 0.68;
      if (t < fallEnd) {
        const ft = t / fallEnd;
        const startY = -160;
        const my = startY + (0 - startY) * easeInQuad(ft);
        const size = 8 + ft * 4;
        g.moveTo(0, my - 40).lineTo(0, my).stroke({
          width: 6,
          color: 0xff8844,
          alpha: 0.35 + ft * 0.35,
        });
        g.circle(0, my, size).fill({ color: fx.color, alpha: 0.85 });
        g.circle(0, my, size * 0.5).fill({ color: 0xffddaa, alpha: 0.9 });
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + ft * 2;
          g.moveTo(0, my)
            .lineTo(Math.cos(a) * size * 1.4, my + Math.sin(a) * size * 0.6)
            .stroke({ width: 2, color: 0xffaa44, alpha: 0.5 });
        }
      } else {
        const it = (t - fallEnd) / (1 - fallEnd);
        const alpha = 1 - it;
        const r = fx.radius * (0.4 + easeOutQuad(it) * 0.9);
        g.circle(0, 0, r).stroke({ width: 4, color: fx.color, alpha: alpha * 0.85 });
        g.circle(0, 0, r * 0.5).fill({ color: fx.color, alpha: alpha * 0.35 });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.moveTo(0, 0)
            .lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8)
            .stroke({ width: 2, color: 0xffcc66, alpha: alpha * 0.6 });
        }
      }
      break;
    }
    case "healAura": {
      const alpha = 1 - t;
      const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
      const r = fx.radius * (0.55 + t * 0.55 + pulse * 0.08);
      g.circle(0, 0, r).stroke({ width: 3, color: fx.color, alpha: alpha * 0.75 });
      g.circle(0, 0, r * 0.65).stroke({ width: 1, color: 0xffffff, alpha: alpha * 0.3 });
      g.circle(0, 0, r * 0.25).fill({ color: fx.color, alpha: alpha * 0.2 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 1.5;
        const dist = r * 0.45 + pulse * 8;
        const px = Math.cos(a) * dist;
        const py = Math.sin(a) * dist - t * 20;
        const s = 4 + pulse * 2;
        g.rect(px - s / 2, py - 1, s, 2).fill({ color: 0xaaffcc, alpha: alpha * 0.7 });
        g.rect(px - 1, py - s / 2, 2, s).fill({ color: 0xaaffcc, alpha: alpha * 0.7 });
      }
      break;
    }
    case "slash":
      drawMeleeSlash(g, fx.radius, fx.color, fx.angle, t);
      break;
  }
}

function lighten(c: number, amount: number): number {
  const r = Math.min(255, ((c >> 16) & 0xff) + amount);
  const g = Math.min(255, ((c >> 8) & 0xff) + amount);
  const b = Math.min(255, (c & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}

function boltSeed(x1: number, y1: number, x2: number, y2: number, i: number): number {
  const h = Math.sin(x1 * 12.9898 + y1 * 78.233 + x2 * 37.719 + y2 * 11.131 + i * 43.758) * 43758.5453;
  return h - Math.floor(h);
}

function drawJaggedBolt(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  alpha: number,
  segments: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  g.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const f = i / segments;
    const jitter =
      (boltSeed(x1, y1, x2, y2, i) - 0.5) * 28 * (1 - Math.abs(f - 0.5) * 1.6);
    g.lineTo(x1 + dx * f + nx * jitter, y1 + dy * f + ny * jitter);
  }
  g.lineTo(x2, y2);
  g.stroke({ width: 3, color, alpha });
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) ** 2;
}

function easeInQuad(t: number): number {
  return t ** 2;
}
