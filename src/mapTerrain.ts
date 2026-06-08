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

export const FISSURE_BURST = {
  interval: 5,
  radius: 120,
  damage: 32,
};

export const CRYSTAL_BUFF = {
  heal: 5,
  speedMult: 2,
  attackRateMult: 1.1,
  duration: 3,
};

export const TERRAIN_INTERACT: Record<InteractiveTerrainKind, TerrainInteractDef> = {
  fissure: {
    triggerRadius: 0,
    cooldown: 0,
    label: "Nova",
    desc: "Periodically damages nearby foes",
  },
  crystal: {
    triggerRadius: 38,
    cooldown: 9,
    label: "Restore",
    desc: "+5 HP · +100% speed · +10% attack speed",
  },
  rift: {
    triggerRadius: 50,
    cooldown: 3.5,
    label: "Blink",
    desc: "Blink to another rift · vanishes and respawns elsewhere",
  },
};

export const RIFT_CONFIG = {
  activeCount: 4,
  respawnDelay: 8,
  spawnMinSpacing: 280,
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
  /** Void rifts: hidden and inactive while respawning. */
  riftDormant?: boolean;
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

export function isRiftActive(f: TerrainFeature): boolean {
  return f.kind === "rift" && !f.riftDormant;
}

export function findTerrainPartners(
  features: TerrainFeature[],
  index: number,
  kind: InteractiveTerrainKind,
): number[] {
  const partners: number[] = [];
  features.forEach((f, i) => {
    if (i !== index && f.kind === kind) {
      if (kind === "rift" && !isRiftActive(f)) return;
      partners.push(i);
    }
  });
  return partners;
}

function collectRiftAvoidPoints(
  features: TerrainFeature[],
  skipIndex = -1,
): { x: number; y: number; minDist: number }[] {
  const avoid: { x: number; y: number; minDist: number }[] = [];
  for (const f of features) {
    if (isBlocking(f)) {
      avoid.push({ x: f.x, y: f.y, minDist: f.radius + 100 });
    }
  }
  features.forEach((f, i) => {
    if (i === skipIndex || f.kind !== "rift" || f.riftDormant) return;
    avoid.push({ x: f.x, y: f.y, minDist: RIFT_CONFIG.spawnMinSpacing });
  });
  return avoid;
}

export function findRiftSpawnPosition(
  features: TerrainFeature[],
  seed: number,
  skipIndex = -1,
): { x: number; y: number } | null {
  const rng = mulberry32(seed);
  const avoid = collectRiftAvoidPoints(features, skipIndex);
  for (let attempt = 0; attempt < 140; attempt++) {
    const angle = rng() * Math.PI * 2;
    const r = ARENA_INNER + rng() * (ARENA_OUTER - ARENA_INNER);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (Math.hypot(x, y) < CENTER_CLEAR) continue;
    if (avoid.some((p) => Math.hypot(p.x - x, p.y - y) < p.minDist)) continue;
    return { x, y };
  }
  return null;
}

export function createVoidRiftFeatures(
  features: TerrainFeature[],
  seed: number,
  count = RIFT_CONFIG.activeCount,
): TerrainFeature[] {
  const rng = mulberry32(seed);
  const rifts: TerrainFeature[] = [];
  const working = [...features];
  for (let i = 0; i < count; i++) {
    const pos = findRiftSpawnPosition(working, seed + i * 31);
    if (!pos) continue;
    const rift = interactiveAt(pos.x, pos.y, "rift", rng);
    rifts.push(rift);
    working.push(rift);
  }
  return rifts;
}

export function relocateRift(
  features: TerrainFeature[],
  index: number,
  seed: number,
): boolean {
  const f = features[index];
  if (f.kind !== "rift") return false;
  const pos = findRiftSpawnPosition(features, seed, index);
  if (!pos) return false;
  f.x = pos.x;
  f.y = pos.y;
  f.rot = mulberry32(seed + 17)() * Math.PI * 2;
  f.riftDormant = false;
  return true;
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
  const interactPos = scatterArenaPositions(MAP_SEED.ember + 91, 5, INTERACT_MIN_SPACING);
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
  return blockingPos.map((p) => voidBlockingAt(p.x, p.y, rng));
}

export const VOID_RIFT_SPAWN_SEED = MAP_SEED.void + 77;

export function getMapTerrainForPreview(mapId: MapId): TerrainFeature[] {
  const base = TERRAIN_BY_MAP[mapId];
  if (mapId !== "void") return base;
  return [...base, ...createVoidRiftFeatures(base, VOID_RIFT_SPAWN_SEED)];
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

export function getTombstoneGraves(
  features: TerrainFeature[],
): { x: number; y: number; rot: number }[] {
  return features
    .filter((f) => f.kind === "tombstone")
    .map((f) => ({ x: f.x, y: f.y, rot: f.rot ?? 0 }));
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

function drawCrackBranch(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width: number,
  alpha: number,
): void {
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.12;
  const my = (y1 + y2) / 2 - (x2 - x1) * 0.12;
  g.moveTo(x1, y1).lineTo(mx, my).lineTo(x2, y2).stroke({ width, color, alpha });
}

function drawFissure(g: Graphics, pulse = 0, time = 0, onCooldown = false): void {
  const ready = 0.35 + pulse * 0.65;
  const dim = onCooldown ? 0.38 : 1;

  g.ellipse(0, 4, 52, 22).fill({ color: 0x1a0804, alpha: 0.55 * dim });
  g.ellipse(0, 2, 44, 16).fill({ color: 0x331108, alpha: 0.35 * dim });

  const ripple = 1 + Math.sin(time * 2.4) * 0.08;
  g.circle(0, 0, (46 + pulse * 10) * ripple).stroke({
    width: 2,
    color: 0xff6622,
    alpha: ready * 0.22 * dim,
  });
  g.circle(0, 0, (34 + pulse * 6) * (1 + Math.sin(time * 3.1 + 1) * 0.06)).stroke({
    width: 1.5,
    color: 0xffaa44,
    alpha: ready * 0.3 * dim,
  });

  const len = 96;
  const branches: [number, number, number, number][] = [
    [-len / 2, 0, len / 2, 0],
    [-len / 3, -2, -len / 6, -22],
    [len / 6, 2, len / 3, 20],
    [-8, 0, -28, 14],
    [10, 0, 32, -16],
    [0, 0, 18, 24],
    [0, 0, -16, -20],
  ];
  for (const [x1, y1, x2, y2] of branches) {
    drawCrackBranch(g, x1, y1, x2, y2, 0x2a0a04, 5, 0.45 * dim);
    drawCrackBranch(g, x1, y1, x2, y2, 0xff4422, 2.5, (0.45 + pulse * 0.35) * dim);
  }

  g.moveTo(-len / 2, 1)
    .lineTo(-len / 4, -5)
    .lineTo(0, 3)
    .lineTo(len / 4, -4)
    .lineTo(len / 2, 1)
    .stroke({ width: 7, color: 0xffaa44, alpha: (0.12 + pulse * 0.22) * dim });
  g.moveTo(-len / 2, 1)
    .lineTo(-len / 4, -5)
    .lineTo(0, 3)
    .lineTo(len / 4, -4)
    .lineTo(len / 2, 1)
    .stroke({ width: 2.5, color: 0xffee88, alpha: (0.35 + pulse * 0.45) * dim });

  const coreR = 8 + pulse * 6 + Math.sin(time * 4.5) * 2;
  g.circle(0, 0, coreR + 6).fill({ color: 0xff6622, alpha: (0.12 + pulse * 0.18) * dim });
  g.circle(0, 0, coreR).fill({ color: 0xffaa44, alpha: (0.45 + pulse * 0.4) * dim });
  g.circle(0, 0, coreR * 0.45).fill({ color: 0xffffcc, alpha: (0.55 + pulse * 0.35) * dim });

  for (let i = 0; i < 6; i++) {
    const a = time * 1.8 + (i * Math.PI * 2) / 6;
    const orbit = 22 + Math.sin(time * 3 + i) * 4;
    const ex = Math.cos(a) * orbit;
    const ey = Math.sin(a) * orbit * 0.55;
    const spark = 0.35 + 0.65 * Math.max(0, Math.sin(time * 5 + i * 1.7));
    g.circle(ex, ey, 2 + spark).fill({
      color: i % 2 === 0 ? 0xff6622 : 0xffee88,
      alpha: spark * ready * dim,
    });
  }
}

function drawIcePillar(g: Graphics, f: TerrainFeature): void {
  const w = f.w ?? 22;
  const h = f.h ?? 38;
  g.moveTo(0, -h / 2).lineTo(w / 2, h / 2).lineTo(-w / 2, h / 2).closePath().fill(0x88bbdd);
  g.moveTo(0, -h / 2 + 4).lineTo(w / 2 - 4, h / 2).lineTo(-w / 2 + 4, h / 2).closePath().fill(0xcceeff);
}

function drawCrystalShard(
  g: Graphics,
  ox: number,
  oy: number,
  rot: number,
  h: number,
  w: number,
  base: number,
  hi: number,
  alpha: number,
): void {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pts = [
    [0, -h],
    [w, h * 0.35],
    [0, h],
    [-w, h * 0.35],
  ] as const;
  const mapped = pts.map(([px, py]) => [ox + px * cos - py * sin, oy + px * sin + py * cos]);
  g.moveTo(mapped[0][0], mapped[0][1])
    .lineTo(mapped[1][0], mapped[1][1])
    .lineTo(mapped[2][0], mapped[2][1])
    .lineTo(mapped[3][0], mapped[3][1])
    .closePath()
    .fill({ color: base, alpha });
  g.moveTo(mapped[0][0], mapped[0][1])
    .lineTo(mapped[1][0], mapped[1][1])
    .lineTo(mapped[2][0], mapped[2][1])
    .lineTo(mapped[3][0], mapped[3][1])
    .closePath()
    .stroke({ width: 1, color: hi, alpha: alpha * 0.7 });
}

function drawCrystal(g: Graphics, pulse = 0, time = 0, onCooldown = false): void {
  const ready = 0.35 + pulse * 0.65;
  const dim = onCooldown ? 0.4 : 1;
  const shimmer = 0.5 + 0.5 * Math.sin(time * 3.4);

  g.circle(0, 6, 34).fill({ color: 0x1a3048, alpha: 0.35 * dim });
  g.circle(0, 0, 38 + pulse * 6).stroke({
    width: 2,
    color: 0x88ccff,
    alpha: ready * 0.28 * dim,
  });
  g.circle(0, 0, 28 + pulse * 4).stroke({
    width: 1,
    color: 0xccffff,
    alpha: ready * 0.2 * dim,
  });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + time * 0.7;
    const r = 30 + Math.sin(time * 2.2 + i) * 3;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    const spark = 0.25 + 0.75 * Math.max(0, Math.sin(time * 4 + i * 0.9));
    g.circle(sx, sy, 1.5 + spark * 1.2).fill({
      color: 0xffffff,
      alpha: spark * ready * 0.7 * dim,
    });
  }

  drawCrystalShard(g, -6, 2, -0.2, 16, 7, 0x5588aa, 0x88bbdd, 0.85 * dim);
  drawCrystalShard(g, 8, 0, 0.35, 14, 6, 0x6699bb, 0xaaddff, 0.9 * dim);
  drawCrystalShard(g, 0, -4, 0, 18, 8, 0x88ccff, 0xccffff, 0.95 * dim);

  const facetA = time * 1.2;
  g.moveTo(0, -18)
    .lineTo(Math.cos(facetA) * 10, Math.sin(facetA) * 6 - 4)
    .stroke({ width: 2, color: 0xffffff, alpha: shimmer * ready * 0.45 * dim });
  g.moveTo(0, -18)
    .lineTo(Math.cos(facetA + 2.1) * 12, Math.sin(facetA + 2.1) * 8)
    .stroke({ width: 1.5, color: 0xccffff, alpha: shimmer * ready * 0.35 * dim });

  const coreR = 5 + pulse * 4 + Math.sin(time * 5) * 1.5;
  g.circle(0, -2, coreR + 5).fill({ color: 0x66aadd, alpha: (0.15 + pulse * 0.2) * dim });
  g.circle(0, -2, coreR).fill({ color: 0xccffff, alpha: (0.5 + pulse * 0.4) * dim });
  g.circle(0, -2, coreR * 0.4).fill({ color: 0xffffff, alpha: (0.65 + pulse * 0.3) * dim });

  for (let i = 0; i < 4; i++) {
    const a = time * 0.9 + (i * Math.PI) / 2;
    const ix = Math.cos(a) * 14;
    const iy = Math.sin(a) * 8 + 8;
    g.moveTo(ix, iy).lineTo(ix + Math.cos(a) * 6, iy + Math.sin(a) * 6)
      .stroke({ width: 1.5, color: 0xaaddff, alpha: ready * 0.35 * dim });
  }
}

function drawVoidMonolith(g: Graphics, f: TerrainFeature): void {
  const w = f.w ?? 28;
  const h = f.h ?? 42;
  g.roundRect(-w / 2, -h / 2, w, h, 2).fill(0x1a1028);
  g.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 6, 2).fill(0x3a2060);
  g.rect(-w / 2 + 4, -h / 2 + 6, w - 8, 3).fill({ color: 0xaa66ff, alpha: 0.5 });
}

function drawRiftArc(
  g: Graphics,
  rx: number,
  ry: number,
  start: number,
  end: number,
  color: number,
  width: number,
  alpha: number,
): void {
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const t0 = start + ((end - start) * i) / steps;
    const t1 = start + ((end - start) * (i + 1)) / steps;
    const x0 = Math.cos(t0) * rx;
    const y0 = Math.sin(t0) * ry;
    const x1 = Math.cos(t1) * rx;
    const y1 = Math.sin(t1) * ry;
    g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width, color, alpha });
  }
}

function drawRift(g: Graphics, pulse = 0, time = 0, onCooldown = false): void {
  const ready = 0.35 + pulse * 0.65;
  const dim = onCooldown ? 0.38 : 1;
  const len = 108;
  const wobble = Math.sin(time * 2.8) * 2;

  g.ellipse(0, 2, len / 2 + 14, 20).fill({ color: 0x0a0018, alpha: 0.5 * dim });
  g.ellipse(0, 0, len / 2 + 8 + pulse * 8 + wobble, 16).fill({
    color: 0xaa66ff,
    alpha: ready * 0.1 * dim,
  });

  for (let ring = 0; ring < 3; ring++) {
    const phase = time * (1.6 + ring * 0.4) + ring * 1.4;
    const rx = len / 2 - ring * 10 + Math.sin(phase) * 3;
    const ry = 12 - ring * 2;
    drawRiftArc(
      g,
      rx,
      ry,
      phase,
      phase + Math.PI * 0.85,
      ring === 0 ? 0xdd99ff : ring === 1 ? 0xaa66ff : 0x66ccff,
      2 - ring * 0.4,
      (0.2 + pulse * 0.25) * (1 - ring * 0.2) * dim,
    );
  }

  g.ellipse(0, 0, len / 2, 9).fill({ color: 0x110022, alpha: 0.85 * dim });
  g.ellipse(0, 0, len / 2 - 10, 5).fill({
    color: 0x440066,
    alpha: (0.45 + pulse * 0.3) * dim,
  });
  g.ellipse(0, 0, len / 2 - 18, 2.5).fill({
    color: 0xaa66ff,
    alpha: (0.55 + pulse * 0.35) * dim,
  });

  const coreR = 6 + pulse * 5 + Math.sin(time * 4.2) * 2;
  g.circle(0, 0, coreR + 8).fill({ color: 0x6600aa, alpha: (0.15 + pulse * 0.2) * dim });
  g.circle(0, 0, coreR).fill({ color: 0x220033, alpha: 0.9 * dim });
  g.circle(0, 0, coreR * 0.55).fill({ color: 0xdd99ff, alpha: (0.55 + pulse * 0.4) * dim });
  g.circle(0, 0, coreR * 0.2).fill({ color: 0xffffff, alpha: (0.35 + pulse * 0.45) * dim });

  for (let i = 0; i < 7; i++) {
    const a = time * 2.2 + (i * Math.PI * 2) / 7;
    const orbitX = Math.cos(a) * (len / 2 - 4);
    const orbitY = Math.sin(a) * 10;
    const wisp = 0.3 + 0.7 * Math.max(0, Math.sin(time * 5.5 + i));
    g.circle(orbitX, orbitY, 2 + wisp * 2).fill({
      color: i % 3 === 0 ? 0x66ccff : 0xdd99ff,
      alpha: wisp * ready * dim,
    });
    if (wisp > 0.6) {
      const tx = orbitX - Math.cos(a) * 8;
      const ty = orbitY - Math.sin(a) * 4;
      g.moveTo(orbitX, orbitY).lineTo(tx, ty).stroke({
        width: 1.5,
        color: 0xaa66ff,
        alpha: wisp * 0.35 * dim,
      });
    }
  }

  g.ellipse(0, 0, len / 2 + 4 + pulse * 6, 13).stroke({
    width: 1.5,
    color: 0xcc88ff,
    alpha: ready * 0.35 * dim,
  });
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
  time = 0,
  onCooldown = false,
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
      drawFissure(g, pulse, time, onCooldown);
      break;
    case "icePillar":
      drawIcePillar(g, f);
      break;
    case "snowRock":
      drawRock(g, 0x6688aa, 0xaaccee, f.radius);
      break;
    case "crystal":
      drawCrystal(g, pulse, time, onCooldown);
      break;
    case "voidMonolith":
      drawVoidMonolith(g, f);
      break;
    case "voidRock":
      drawRock(g, 0x3a2850, 0x6644aa, f.radius);
      break;
    case "rift":
      drawRift(g, pulse, time, onCooldown);
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
    if (f.kind === "rift" && f.riftDormant) return;
    const piece = new Graphics();
    const cd = cooldowns[i] ?? 0;
    const pulse = interactPulse(f.kind, cd, time);
    drawTerrainFeature(piece, f, map, pulse, time, cd > 0);
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
      const accent =
        f.kind === "fissure" ? 0xff6622 : f.kind === "crystal" ? 0x88ccff : 0xaa66ff;
      g.circle(px, py, 5).fill({ color: accent, alpha: 0.15 });
      g.circle(px, py, 2.5).fill({ color: accent, alpha: 0.85 });
      g.circle(px, py, 1).fill({ color: 0xffffff, alpha: 0.6 });
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
