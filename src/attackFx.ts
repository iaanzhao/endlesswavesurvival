import { Graphics } from "pixi.js";
import type { AttackKind } from "./data";

export interface TransientFx {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  gfx: Graphics;
  kind: "muzzle" | "hit" | "ring" | "bolt" | "slash";
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
  return {
    x: x1,
    y: y1,
    life: 0.18,
    maxLife: 0.18,
    kind: "bolt",
    color,
    radius: 0,
    angle: 0,
    x2,
    y2,
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
    case "bolt": {
      const alpha = 1 - t;
      g.moveTo(0, 0).lineTo(fx.x2 - fx.x, fx.y2 - fx.y).stroke({
        width: 4 - t * 2,
        color: fx.color,
        alpha: alpha * 0.9,
      });
      g.moveTo(0, 0).lineTo(fx.x2 - fx.x, fx.y2 - fx.y).stroke({
        width: 8,
        color: 0xffffff,
        alpha: alpha * 0.25,
      });
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

function easeOutQuad(t: number): number {
  return 1 - (1 - t) ** 2;
}

function easeInQuad(t: number): number {
  return t ** 2;
}
