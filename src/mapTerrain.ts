import { Container, Graphics } from "pixi.js";
import type { MapDef, MapId } from "./data";

export const ARENA_RADIUS = 2400;

export type TerrainKind =
  | "tombstone"
  | "rock"
  | "deadTree"
  | "lavaRock"
  | "obsidian"
  | "fissure"
  | "icePillar"
  | "snowRock"
  | "crystal"
  | "voidMonolith"
  | "voidRock"
  | "rift";

export type InteractiveTerrainKind = "fissure" | "crystal" | "rift";

export interface TerrainInteractDef {
  triggerRadius: number;
  cooldown: number;
  label: string;
  desc: string;
}

export const TERRAIN_INTERACT: Record<InteractiveTerrainKind, TerrainInteractDef> = {
  fissure: {
    triggerRadius: 44,
    cooldown: 4,
    label: "Warp",
    desc: "Teleport to another fissure",
  },
  crystal: {
    triggerRadius: 38,
    cooldown: 9,
    label: "Restore",
    desc: "Heal + brief speed boost",
  },
  rift: {
    triggerRadius: 50,
    cooldown: 3.5,
    label: "Blink",
    desc: "Blink to another rift · brief i-frames",
  },
};

export interface TerrainFeature {
  x: number;
  y: number;
  radius: number;
  kind: TerrainKind;
  w?: number;
  h?: number;
  rot?: number;
  /** Decorative only — no collision. Default true when omitted. */
  blocking?: boolean;
}

export function isInteractiveTerrain(kind: TerrainKind): kind is InteractiveTerrainKind {
  return kind === "fissure" || kind === "crystal" || kind === "rift";
}

export function getInteractiveFeatures(features: TerrainFeature[]): number[] {
  const out: number[] = [];
  features.forEach((f, i) => {
    if (isInteractiveTerrain(f.kind)) out.push(i);
  });
  return out;
}

export function findTerrainPartners(
  features: TerrainFeature[],
  index: number,
  kind: InteractiveTerrainKind,
): number[] {
  const partners: number[] = [];
  features.forEach((f, i) => {
    if (i !== index && f.kind === kind) partners.push(i);
  });
  return partners;
}

const CENTER_CLEAR = 220;
const ARENA_INNER = 320;
const ARENA_OUTER = ARENA_RADIUS - 180;
const BLOCK_MIN_SPACING = 95;
const INTERACT_MIN_SPACING = 280;

const MAP_SEED: Record<MapId, number> = {
  graveyard: 0x6e2a1f,
  ember: 0xeb7312,
  frost: 0xf057a0,
  void: 0x9012fa,
};

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tooClose(
  x: number,
  y: number,
  placed: { x: number; y: number }[],
  minDist: number,
): boolean {
  return placed.some((p) => Math.hypot(p.x - x, p.y - y) < minDist);
}

function scatterArenaPositions(
  seed: number,
  count: number,
  minDist: number,
  minR = ARENA_INNER,
  maxR = ARENA_OUTER,
): { x: number; y: number }[] {
  const rng = mulberry32(seed);
  const placed: { x: number; y: number }[] = [];
  const ringRadii = [360, 580, 800, 1020, 1260, 1500, 1740, 1980];

  for (const baseR of ringRadii) {
    const perRing = Math.max(5, Math.ceil(count / ringRadii.length));
    for (let i = 0; i < perRing && placed.length < count; i++) {
      const angle = (i / perRing) * Math.PI * 2 + rng() * 0.55;
      const r = Math.min(maxR, Math.max(minR, baseR + (rng() - 0.5) * 120));
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (Math.hypot(x, y) < CENTER_CLEAR) continue;
      if (!tooClose(x, y, placed, minDist)) placed.push({ x, y });
    }
  }

  let attempts = 0;
  while (placed.length < count && attempts < count * 80) {
    attempts++;
    const angle = rng() * Math.PI * 2;
    const r = minR + rng() * (maxR - minR);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (Math.hypot(x, y) < CENTER_CLEAR) continue;
    if (!tooClose(x, y, placed, minDist)) placed.push({ x, y });
  }

  return placed;
}

function graveyardBlockingAt(
  x: number,
  y: number,
  i: number,
  rng: () => number,
): TerrainFeature {
  const pick = i % 5;
  if (pick === 0 || pick === 1) {
    return {
      x,
      y,
      radius: 17 + Math.floor(rng() * 5),
      kind: "tombstone",
      w: 20 + Math.floor(rng() * 8),
      h: 28 + Math.floor(rng() * 8),
      rot: (rng() - 0.5) * 0.35,
    };
  }
  if (pick === 2) {
    return { x, y, radius: 20 + Math.floor(rng() * 8), kind: "rock" };
  }
  return { x, y, radius: 19 + Math.floor(rng() * 6), kind: "deadTree" };
}

function emberBlockingAt(x: number, y: number, rng: () => number): TerrainFeature {
  if (rng() > 0.42) {
    return { x, y, radius: 22 + Math.floor(rng() * 8), kind: "lavaRock" };
  }
  return {
    x,
    y,
    radius: 22 + Math.floor(rng() * 8),
    kind: "obsidian",
    w: 26 + Math.floor(rng() * 10),
    h: 32 + Math.floor(rng() * 12),
    rot: (rng() - 0.5) * 0.2,
  };
}

function frostBlockingAt(x: number, y: number, rng: () => number): TerrainFeature {
  if (rng() > 0.45) {
    return { x, y, radius: 19 + Math.floor(rng() * 8), kind: "snowRock" };
  }
  return {
    x,
    y,
    radius: 17 + Math.floor(rng() * 5),
    kind: "icePillar",
    w: 18 + Math.floor(rng() * 8),
    h: 32 + Math.floor(rng() * 10),
    rot: (rng() - 0.5) * 0.15,
  };
}

function voidBlockingAt(x: number, y: number, rng: () => number): TerrainFeature {
  if (rng() > 0.4) {
    return { x, y, radius: 22 + Math.floor(rng() * 8), kind: "voidRock" };
  }
  return {
    x,
    y,
    radius: 22 + Math.floor(rng() * 8),
    kind: "voidMonolith",
    w: 24 + Math.floor(rng() * 10),
    h: 36 + Math.floor(rng() * 10),
    rot: (rng() - 0.5) * 0.18,
  };
}

function interactiveAt(
  x: number,
  y: number,
  kind: InteractiveTerrainKind,
  rng: () => number,
): TerrainFeature {
  return {
    x,
    y,
    radius: 0,
    kind,
    rot: rng() * Math.PI * 2,
    blocking: false,
  };
}

function buildGraveyardTerrain(): TerrainFeature[] {
  const rng = mulberry32(MAP_SEED.graveyard);
  const positions = scatterArenaPositions(MAP_SEED.graveyard, 44, BLOCK_MIN_SPACING);
  return positions.map((p, i) => graveyardBlockingAt(p.x, p.y, i, rng));
}

function buildEmberTerrain(): TerrainFeature[] {
  const rng = mulberry32(MAP_SEED.ember);
  const blockingPos = scatterArenaPositions(MAP_SEED.ember, 38, BLOCK_MIN_SPACING);
  const interactPos = scatterArenaPositions(MAP_SEED.ember + 91, 10, INTERACT_MIN_SPACING);
  return [
    ...blockingPos.map((p) => emberBlockingAt(p.x, p.y, rng)),
    ...interactPos.map((p) => interactiveAt(p.x, p.y, "fissure", rng)),
  ];
}

function buildFrostTerrain(): TerrainFeature[] {
  const rng = mulberry32(MAP_SEED.frost);
  const blockingPos = scatterArenaPositions(MAP_SEED.frost, 38, BLOCK_MIN_SPACING);
  const interactPos = scatterArenaPositions(MAP_SEED.frost + 91, 10, INTERACT_MIN_SPACING);
  return [
    ...blockingPos.map((p) => frostBlockingAt(p.x, p.y, rng)),
    ...interactPos.map((p) => interactiveAt(p.x, p.y, "crystal", rng)),
  ];
}

function buildVoidTerrain(): TerrainFeature[] {
  const rng = mulberry32(MAP_SEED.void);
  const blockingPos = scatterArenaPositions(MAP_SEED.void, 38, BLOCK_MIN_SPACING);
  const interactPos = scatterArenaPositions(MAP_SEED.void + 91, 10, INTERACT_MIN_SPACING);
  return [
    ...blockingPos.map((p) => voidBlockingAt(p.x, p.y, rng)),
    ...interactPos.map((p) => interactiveAt(p.x, p.y, "rift", rng)),
  ];
}

const TERRAIN_BY_MAP: Record<MapId, TerrainFeature[]> = {
  graveyard: buildGraveyardTerrain(),
  ember: buildEmberTerrain(),
  frost: buildFrostTerrain(),
  void: buildVoidTerrain(),
};

export function getMapTerrain(mapId: MapId): TerrainFeature[] {
  return TERRAIN_BY_MAP[mapId];
}

function isBlocking(f: TerrainFeature): boolean {
  return f.blocking !== false && f.radius > 0;
}

export function resolveTerrainCollision(
  x: number,
  y: number,
  entityRadius: number,
  features: TerrainFeature[],
): { x: number; y: number } {
  let px = x;
  let py = y;
  for (const f of features) {
    if (!isBlocking(f)) continue;
    const dx = px - f.x;
    const dy = py - f.y;
    const d = Math.hypot(dx, dy);
    const minD = entityRadius + f.radius;
    if (d < minD) {
      if (d < 0.001) {
        px += minD;
        continue;
      }
      const push = (minD - d) / d;
      px += dx * push;
      py += dy * push;
    }
  }
  return { x: px, y: py };
}

function drawTombstone(g: Graphics, f: TerrainFeature): void {
  const w = f.w ?? 24;
  const h = f.h ?? 32;
  g.roundRect(-w / 2, -h / 2, w, h, 4).fill(0x556677);
  g.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 8, 3).fill(0x778899);
  g.rect(-w / 2, h / 2 - 10, w, 8).fill(0x445566);
}

function drawRock(g: Graphics, color: number, hi: number, r: number): void {
  g.circle(0, 2, r).fill(color);
  g.circle(-r * 0.25, -r * 0.2, r * 0.55).fill(hi);
}

function drawDeadTree(g: Graphics): void {
  g.rect(-3, -18, 6, 22).fill(0x443322);
  g.moveTo(0, -16).lineTo(-14, -28).stroke({ width: 3, color: 0x554433 });
  g.moveTo(0, -12).lineTo(12, -24).stroke({ width: 3, color: 0x554433 });
  g.circle(0, 8, 10).fill({ color: 0x333344, alpha: 0.35 });
}

function drawLavaRock(g: Graphics, r: number): void {
  drawRock(g, 0x662211, 0xaa4422, r);
  g.circle(0, 0, r * 0.35).fill({ color: 0xff6622, alpha: 0.45 });
}

function drawObsidian(g: Graphics, f: TerrainFeature): void {
  const w = f.w ?? 28;
  const h = f.h ?? 36;
  g.roundRect(-w / 2, -h / 2, w, h, 3).fill(0x1a0a08);
  g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 10, 2).fill(0x3a1810);
  g.rect(-w / 2 + 4, -h / 2 + 4, 4, h - 12).fill({ color: 0xff6622, alpha: 0.35 });
}

function drawFissure(g: Graphics, pulse = 0): void {
  const len = 90;
  const glow = 0.35 + pulse * 0.35;
  g.circle(0, 0, 38).stroke({ width: 2, color: 0xff6622, alpha: glow * 0.45 });
  g.moveTo(-len / 2, 0)
    .lineTo(-len / 4, -4)
    .lineTo(0, 2)
    .lineTo(len / 4, -3)
    .lineTo(len / 2, 0)
    .stroke({ width: 3, color: 0xff4422, alpha: 0.55 + pulse * 0.25 });
  g.moveTo(-len / 2, 2)
    .lineTo(len / 2, 2)
    .stroke({ width: 6, color: 0xffaa44, alpha: 0.15 + pulse * 0.2 });
  g.circle(0, 0, 6 + pulse * 4).fill({ color: 0xffaa44, alpha: 0.35 + pulse * 0.3 });
}

function drawIcePillar(g: Graphics, f: TerrainFeature): void {
  const w = f.w ?? 22;
  const h = f.h ?? 38;
  g.moveTo(0, -h / 2).lineTo(w / 2, h / 2).lineTo(-w / 2, h / 2).closePath().fill(0x88bbdd);
  g.moveTo(0, -h / 2 + 4).lineTo(w / 2 - 4, h / 2).lineTo(-w / 2 + 4, h / 2).closePath().fill(0xcceeff);
}

function drawCrystal(g: Graphics, pulse = 0): void {
  const glow = 0.3 + pulse * 0.4;
  g.circle(0, 0, 30).stroke({ width: 2, color: 0x88ccff, alpha: glow * 0.5 });
  g.moveTo(0, -14).lineTo(8, 6).lineTo(0, 14).lineTo(-8, 6).closePath().fill(0x88ccff);
  g.moveTo(0, -10).lineTo(5, 4).lineTo(0, 10).lineTo(-5, 4).closePath().fill(0xccffff);
  g.circle(0, 0, 4 + pulse * 3).fill({ color: 0xffffff, alpha: 0.4 + pulse * 0.35 });
}

function drawVoidMonolith(g: Graphics, f: TerrainFeature): void {
  const w = f.w ?? 28;
  const h = f.h ?? 42;
  g.roundRect(-w / 2, -h / 2, w, h, 2).fill(0x1a1028);
  g.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 6, 2).fill(0x3a2060);
  g.rect(-w / 2 + 4, -h / 2 + 6, w - 8, 3).fill({ color: 0xaa66ff, alpha: 0.5 });
}

function drawRift(g: Graphics, pulse = 0): void {
  const len = 100;
  const glow = 0.35 + pulse * 0.35;
  g.ellipse(0, 0, len / 2 + 6 + pulse * 6, 14).fill({ color: 0xaa66ff, alpha: glow * 0.12 });
  g.ellipse(0, 0, len / 2, 8).fill({ color: 0x220033, alpha: 0.7 });
  g.ellipse(0, 0, len / 2 - 8, 4).fill({ color: 0xaa66ff, alpha: 0.35 + pulse * 0.25 });
  g.circle(0, 0, 5 + pulse * 4).fill({ color: 0xdd99ff, alpha: 0.5 + pulse * 0.3 });
}

function interactPulse(
  kind: InteractiveTerrainKind,
  cooldown: number,
  time: number,
): number {
  if (cooldown > 0) return 0;
  const speed = kind === "rift" ? 3.2 : kind === "fissure" ? 2.6 : 2;
  return 0.5 + 0.5 * Math.sin(time * speed);
}

function drawTerrainFeature(
  g: Graphics,
  f: TerrainFeature,
  map: MapDef,
  pulse = 0,
): void {
  g.position.set(f.x, f.y);
  if (f.rot) g.rotation = f.rot;

  switch (f.kind) {
    case "tombstone":
      drawTombstone(g, f);
      break;
    case "rock":
      drawRock(g, 0x556666, 0x778888, f.radius);
      break;
    case "deadTree":
      drawDeadTree(g);
      break;
    case "lavaRock":
      drawLavaRock(g, f.radius);
      break;
    case "obsidian":
      drawObsidian(g, f);
      break;
    case "fissure":
      drawFissure(g, pulse);
      break;
    case "icePillar":
      drawIcePillar(g, f);
      break;
    case "snowRock":
      drawRock(g, 0x6688aa, 0xaaccee, f.radius);
      break;
    case "crystal":
      drawCrystal(g, pulse);
      break;
    case "voidMonolith":
      drawVoidMonolith(g, f);
      break;
    case "voidRock":
      drawRock(g, 0x3a2850, 0x6644aa, f.radius);
      break;
    case "rift":
      drawRift(g, pulse);
      break;
  }

  if (isBlocking(f)) {
    g.circle(0, 0, f.radius).stroke({
      width: 1,
      color: map.accentColor,
      alpha: 0.12,
    });
  }
}

function destroyContainerChildren(container: Container): void {
  for (const child of container.removeChildren()) {
    child.destroy({ children: true });
  }
}

/** Blocking obstacles and static art — built once per map change. */
export function buildMapTerrainStatic(
  container: Container,
  map: MapDef,
  features: TerrainFeature[],
): void {
  destroyContainerChildren(container);
  for (const f of features) {
    if (isInteractiveTerrain(f.kind)) continue;
    const piece = new Graphics();
    drawTerrainFeature(piece, f, map, 0);
    container.addChild(piece);
  }
}

/** Animated fissures / crystals / rifts — small layer, rebuilt each tick. */
export function refreshInteractiveTerrain(
  container: Container,
  map: MapDef,
  features: TerrainFeature[],
  cooldowns: number[],
  time: number,
): void {
  destroyContainerChildren(container);
  features.forEach((f, i) => {
    if (!isInteractiveTerrain(f.kind)) return;
    const piece = new Graphics();
    const pulse = interactPulse(f.kind, cooldowns[i] ?? 0, time);
    drawTerrainFeature(piece, f, map, pulse);
    container.addChild(piece);
  });
}

/** Miniature terrain markers for map preview cards. */
export function drawMapTerrainPreview(
  g: Graphics,
  map: MapDef,
  features: TerrainFeature[],
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const previewR = Math.min(w, h) * 0.42;
  const scale = previewR / ARENA_RADIUS;

  for (const f of features) {
    const px = cx + f.x * scale;
    const py = cy + f.y * scale;
    const inside = (px - cx) ** 2 + (py - cy) ** 2 <= previewR ** 2;
    if (!inside) continue;

    if (isInteractiveTerrain(f.kind)) {
      g.circle(px, py, 3.5).fill({ color: map.accentColor, alpha: 0.75 });
      continue;
    }
    if (f.blocking === false || f.radius === 0) {
      g.circle(px, py, 2).fill({ color: map.accentColor, alpha: 0.55 });
      continue;
    }
    g.circle(px, py, Math.max(2.5, f.radius * scale)).fill({
      color: map.accentColor,
      alpha: 0.4,
    });
    g.circle(px, py, Math.max(1.5, f.radius * scale * 0.55)).fill({
      color: 0xffffff,
      alpha: 0.12,
    });
  }
}
