import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { assetUrl } from "./assetUrl";

export type SlimeKind = "slimeSmall" | "slimeMedium" | "slimeBig";

export type EnemyKind =
  | "ghost"
  | "skeleton"
  | "zombie"
  | SlimeKind
  | "skull"
  | "bat"
  | "brute"
  | "crawlerBoss";

export const SLIME_KINDS: SlimeKind[] = [
  "slimeSmall",
  "slimeMedium",
  "slimeBig",
];

export const ENEMY_KINDS: EnemyKind[] = [
  "ghost",
  "skeleton",
  "zombie",
  ...SLIME_KINDS,
  "skull",
  "bat",
  "brute",
  "crawlerBoss",
];

export function isSlimeKind(kind: EnemyKind): kind is SlimeKind {
  return SLIME_KINDS.includes(kind as SlimeKind);
}

export const CRAWLER_BOSS_WAVE = 10;

const ENEMY_BASE = assetUrl("assets/enemies");

const ENEMY_HIT_RADIUS: Record<EnemyKind, number> = {
  ghost: 15,
  skeleton: 14,
  zombie: 15,
  slimeSmall: 10,
  slimeMedium: 13,
  slimeBig: 18,
  skull: 15,
  bat: 14,
  brute: 22,
  crawlerBoss: 68,
};

const ENEMY_HP: Record<EnemyKind, number> = {
  ghost: 35,
  skeleton: 45,
  zombie: 50,
  slimeSmall: 28,
  slimeMedium: 62,
  slimeBig: 68,
  skull: 55,
  bat: 38,
  brute: 130,
  crawlerBoss: 480,
};

const ENEMY_HEALTH_BAR_WIDTH: Record<EnemyKind, number> = {
  ghost: 32,
  skeleton: 32,
  zombie: 32,
  slimeSmall: 28,
  slimeMedium: 32,
  slimeBig: 40,
  skull: 32,
  bat: 32,
  brute: 32,
  crawlerBoss: 72,
};

const enemyTextures: Partial<Record<EnemyKind, Texture>> = {};

const ENEMY_SPRITE_FILE: Partial<Record<EnemyKind, string>> = {
  slimeSmall: "slime-small",
  slimeMedium: "slime-small",
  slimeBig: "slime-medium",
};

/** Extra sprite scale on top of hit-radius sizing (medium = small art, bumped up). */
const SLIME_VISUAL_SCALE: Partial<Record<SlimeKind, number>> = {
  slimeMedium: 1.15,
};

export async function loadEnemyAssets(): Promise<void> {
  await Promise.all(
    ENEMY_KINDS.filter((kind) => kind !== "crawlerBoss").map(async (kind) => {
      const file = ENEMY_SPRITE_FILE[kind] ?? kind;
      const texture = await Assets.load(`${ENEMY_BASE}/${file}.png`);
      texture.source.scaleMode = "nearest";
      enemyTextures[kind] = texture;
    }),
  );
}

const ENEMY_GLOW: Record<Exclude<EnemyKind, "crawlerBoss">, number> = {
  ghost: 0x8866ff,
  skeleton: 0xc8c4a8,
  zombie: 0x55aa44,
  slimeSmall: 0x44dd88,
  slimeMedium: 0x44dd88,
  slimeBig: 0x44dd88,
  skull: 0xff5544,
  bat: 0x7755cc,
  brute: 0xff7733,
};

const ENEMY_TINT: Record<Exclude<EnemyKind, "crawlerBoss">, number> = {
  ghost: 0xe8e4ff,
  skeleton: 0xf0eee0,
  zombie: 0xa8c898,
  slimeSmall: 0xe0ffe8,
  slimeMedium: 0xe0ffe8,
  slimeBig: 0xe0ffe8,
  skull: 0xffe8e0,
  bat: 0xe8e0ff,
  brute: 0xffe8d8,
};

function getEnemyBody(container: Container): Container {
  return container.getChildByLabel("enemyBody") as Container;
}

function getEnemyShadow(container: Container): Graphics {
  return container.getChildByLabel("enemyShadow") as Graphics;
}

function paintEnemyShadow(
  shadow: Graphics,
  kind: EnemyKind,
  radius: number,
  bodyY: number,
  squash = 1,
  bodyAlpha = 1,
): void {
  shadow.clear();
  const stretch =
    kind === "bat"
      ? 1.18
      : kind === "brute"
        ? 1.22
        : isSlimeKind(kind)
          ? 1.08
          : 1;
  shadow
    .ellipse(
      0,
      radius * 0.54 + bodyY * 0.22,
      radius * 0.9 * squash * stretch,
      radius * (kind === "crawlerBoss" ? 0.42 : 0.32),
    )
    .fill({
      color: 0x000000,
      alpha:
        (kind === "ghost" ? 0.1 : kind === "crawlerBoss" ? 0.34 : 0.24) *
        bodyAlpha,
    });
}

function paintEnemyGlow(
  glow: Graphics,
  kind: Exclude<EnemyKind, "crawlerBoss">,
  radius: number,
  phase: number,
  moving: boolean,
): void {
  const pulse = 0.85 + Math.sin(phase * (kind === "ghost" ? 2.5 : 4)) * 0.15;
  const moveBoost = moving ? 1.12 : 1;
  glow.clear();
  glow
    .circle(0, 0, radius * 1.15 * moveBoost)
    .fill({ color: ENEMY_GLOW[kind], alpha: 0.1 * pulse });
  glow
    .circle(0, 0, radius * 0.62)
    .fill({ color: ENEMY_GLOW[kind], alpha: 0.07 * pulse });
}

function createEnemySprite(
  kind: Exclude<EnemyKind, "crawlerBoss">,
): EnemyAnimBody {
  const texture = enemyTextures[kind];
  if (!texture) {
    throw new Error(`Enemy texture not loaded: ${kind}`);
  }

  const wrapper = new Container() as EnemyAnimBody;
  const glow = new Graphics();
  glow.label = "enemyGlow";
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  const target = getEnemyRadius(kind) * 2.15;
  const dim =
    kind === "bat"
      ? Math.max(texture.height * 1.35, texture.width * 0.72)
      : Math.max(texture.width, texture.height);
  const slimeVisualScale = isSlimeKind(kind)
    ? (SLIME_VISUAL_SCALE[kind] ?? 1)
    : 1;
  wrapper.baseScale = (target / dim) * slimeVisualScale;
  wrapper.sprite = sprite;
  wrapper.glow = glow;
  paintEnemyGlow(glow, kind, getEnemyRadius(kind), 0, false);
  wrapper.addChild(glow, sprite);
  return wrapper;
}

export type EnemyAnimBody = Container & {
  baseScale: number;
  sprite?: Sprite;
  glow?: Graphics;
};

const ENEMY_WOBBLE_RATE: Record<Exclude<EnemyKind, "crawlerBoss">, number> = {
  ghost: 3.2,
  skeleton: 6.5,
  zombie: 4.2,
  slimeSmall: 5.5,
  slimeMedium: 5,
  slimeBig: 4.2,
  skull: 4,
  bat: 11,
  brute: 4.5,
};

export function getEnemyWobbleRate(kind: EnemyKind): number {
  if (kind === "crawlerBoss") return 4;
  return ENEMY_WOBBLE_RATE[kind];
}

export type EnemySpawnFxStyle =
  | "slime"
  | "ghost"
  | "undead"
  | "bat"
  | "heavy"
  | "boss";

export function getEnemySpawnFxStyle(kind: EnemyKind): EnemySpawnFxStyle {
  if (isSlimeKind(kind)) return "slime";
  if (kind === "ghost") return "ghost";
  if (kind === "bat") return "bat";
  if (kind === "brute") return "heavy";
  if (kind === "crawlerBoss") return "boss";
  return "undead";
}

export function getEnemySpawnDuration(kind: EnemyKind): number {
  switch (kind) {
    case "crawlerBoss":
      return 0.72;
    case "brute":
      return 0.52;
    case "ghost":
      return 0.42;
    case "bat":
      return 0.38;
    case "slimeBig":
      return 0.4;
    case "slimeMedium":
      return 0.36;
    case "slimeSmall":
      return 0.32;
    case "skull":
      return 0.34;
    case "zombie":
      return 0.58;
    default:
      return 0.34;
  }
}

export interface SpawnAnimState {
  progress: number;
  pop: number;
  alpha: number;
  offsetY: number;
  rotation: number;
  glowBoost: number;
  spawning: boolean;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInCubic(t: number): number {
  return t ** 3;
}

export function getSpawnAnimation(
  kind: EnemyKind,
  spawnTimer: number,
): SpawnAnimState {
  const duration = getEnemySpawnDuration(kind);
  if (spawnTimer <= 0) {
    return {
      progress: 1,
      pop: 1,
      alpha: 1,
      offsetY: 0,
      rotation: 0,
      glowBoost: 0,
      spawning: false,
    };
  }

  const progress = 1 - spawnTimer / duration;
  const pop = 0.06 + easeOutBack(Math.min(1, progress * 1.08)) * 0.94;
  const alpha = easeOutCubic(Math.min(1, progress * 1.35));
  const radius = getEnemyRadius(kind);
  let offsetY = 0;
  let rotation = 0;
  let glowBoost = (1 - progress) * 0.55;

  switch (kind) {
    case "slimeSmall":
    case "slimeMedium":
    case "slimeBig":
      offsetY = -(1 - easeOutCubic(progress)) * (radius * 1.8);
      glowBoost = (1 - progress) * 0.75;
      break;
    case "ghost":
      offsetY = -(1 - easeOutCubic(progress)) * (radius * 1.2);
      glowBoost = (1 - progress) * 0.95;
      break;
    case "skeleton":
      offsetY = (1 - easeOutCubic(progress)) * (radius * 1.1);
      rotation = (1 - progress) * 0.35;
      break;
    case "zombie":
      offsetY = (1 - easeOutCubic(progress)) * (radius * 1.45);
      glowBoost = (1 - progress) * 0.7;
      break;
    case "skull":
      rotation = (1 - progress) * Math.PI * 2;
      offsetY = -(1 - easeOutCubic(progress)) * (radius * 0.6);
      break;
    case "bat":
      offsetY = -(1 - easeOutCubic(progress)) * (radius * 2.4);
      rotation = Math.sin(progress * Math.PI * 3) * 0.25 * (1 - progress);
      break;
    case "brute":
      offsetY = -(1 - easeInCubic(progress)) * (radius * 2);
      glowBoost = (1 - progress) * 0.45;
      break;
    case "crawlerBoss":
      offsetY = (1 - easeOutCubic(progress)) * (radius * 0.85);
      glowBoost = (1 - progress) * 0.65;
      break;
    default:
      offsetY = -(1 - easeOutCubic(progress)) * (radius * 0.8);
      break;
  }

  return {
    progress,
    pop,
    alpha,
    offsetY,
    rotation,
    glowBoost,
    spawning: true,
  };
}

export function updateEnemyAnimation(
  kind: EnemyKind,
  container: Container,
  phase: number,
  moveAngle: number,
  moving: boolean,
  hitFlash: number,
  spawnTimer: number,
): void {
  const body = getEnemyBody(container);
  const shadow = getEnemyShadow(container);
  const spawn = getSpawnAnimation(kind, spawnTimer);
  const pop = spawn.pop;
  const hitPulse = hitFlash > 0 ? 1 + Math.min(1, hitFlash * 7) * 0.14 : 1;
  const radius = getEnemyRadius(kind);

  if (kind === "crawlerBoss") {
    updateCrawlerBossMotion(container, phase, moving, hitFlash, pop);
    getEnemyBody(container).alpha = spawn.alpha;
    getEnemyBody(container).rotation = spawn.rotation;
    paintEnemyShadow(shadow, kind, radius, spawn.offsetY, pop, spawn.alpha);
    return;
  }

  const animBody = body as EnemyAnimBody;
  const sprite = animBody.sprite;
  if (!sprite) return;

  const base = animBody.baseScale * pop * hitPulse;
  const faceLeft = Math.cos(moveAngle) < 0;
  const sign = faceLeft ? -1 : 1;
  const flashMix = hitFlash > 0 ? Math.min(1, hitFlash * 8) : 0;
  const restTint = ENEMY_TINT[kind];
  const hitTint = 0xffffff;
  const tint = flashMix > 0 ? lerpColor(restTint, hitTint, flashMix) : restTint;

  body.rotation = spawn.rotation;
  body.alpha = spawn.alpha;
  sprite.rotation = 0;
  sprite.tint = tint;

  let bodyY = spawn.offsetY;
  let shadowSquash = 1;
  let bodyAlpha = spawn.alpha;

  if (animBody.glow) {
    paintEnemyGlow(
      animBody.glow,
      kind,
      radius,
      phase,
      moving || spawn.spawning,
    );
    if (spawn.glowBoost > 0) {
      animBody.glow.alpha = 0.65 + spawn.glowBoost * 0.35;
    }
  }

  switch (kind) {
    case "ghost": {
      bodyY += Math.sin(phase * 2.1) * 5;
      bodyAlpha = spawn.alpha * (0.82 + Math.sin(phase * 3.4) * 0.14);
      body.y = bodyY;
      body.alpha = bodyAlpha;
      sprite.rotation = Math.sin(phase * 1.6) * 0.1;
      sprite.scale.set(base * sign * 0.98, base * 1.04);
      shadowSquash = 0.88 + bodyAlpha * 0.12;
      break;
    }
    case "slimeSmall":
    case "slimeMedium":
    case "slimeBig": {
      const squash = moving
        ? Math.sin(phase * 7) * 0.14
        : Math.sin(phase * 2) * 0.05;
      let sx = 1 + squash;
      let sy = 1 - squash * 0.85;
      if (spawn.spawning && spawn.progress > 0.5) {
        const landT = (spawn.progress - 0.5) / 0.5;
        const impact = Math.sin(landT * Math.PI) * 0.32;
        sx += impact;
        sy -= impact * 0.88;
      }
      sprite.scale.set(base * sign * sx, base * sy);
      bodyY += Math.sin(phase * 5) * 2.5;
      body.y = bodyY;
      shadowSquash = 1 + squash * 0.35;
      break;
    }
    case "skeleton": {
      bodyY += moving
        ? -Math.abs(Math.sin(phase * 9)) * 3
        : Math.sin(phase * 2) * 1;
      body.y = bodyY;
      body.rotation = spawn.rotation + Math.sin(phase * 4.5) * 0.06 * sign;
      sprite.scale.set(base * sign, base * (1 + Math.sin(phase * 9) * 0.04));
      shadowSquash = moving ? 0.92 + Math.abs(Math.sin(phase * 9)) * 0.08 : 1;
      break;
    }
    case "zombie": {
      const lurch = Math.sin(phase * 4.5);
      const cosA = Math.cos(moveAngle);
      // Original art when player is left; mirror when player is right.
      const facing = cosA < 0 ? 1 : cosA > 0 ? -1 : 1;
      bodyY += moving ? lurch * 2.5 : Math.sin(phase * 1.6) * 1.2;
      body.y = bodyY;
      body.rotation = spawn.rotation + lurch * 0.07 * facing;
      sprite.scale.set(
        base * facing * (1 + lurch * 0.05),
        base * (1 - Math.abs(lurch) * 0.04),
      );
      shadowSquash = 0.92 + Math.abs(lurch) * 0.08;
      break;
    }
    case "skull": {
      bodyY += Math.sin(phase * 3.2) * 4;
      body.y = bodyY;
      body.rotation = spawn.rotation + Math.sin(phase * 2.2) * 0.14 * sign;
      sprite.scale.set(
        base * sign * (1 + Math.sin(phase * 4) * 0.05),
        base * (1 + Math.sin(phase * 4 + 1) * 0.05),
      );
      break;
    }
    case "bat": {
      const flap = Math.sin(phase * 24);
      const spawnFlap = spawn.spawning ? 1 - spawn.progress : 0;
      sprite.scale.set(
        base * sign * (1 + flap * 0.18 + spawnFlap * 0.35),
        base * (1 - flap * 0.24 - spawnFlap * 0.2),
      );
      bodyY += Math.sin(phase * 12) * 3.5;
      body.y = bodyY;
      body.rotation = spawn.rotation + Math.sin(phase * 8) * 0.08 * sign;
      shadowSquash = 1 - flap * 0.08;
      break;
    }
    case "brute": {
      const stomp = moving ? Math.abs(Math.sin(phase * 5.5)) : 0;
      bodyY += -stomp * 4;
      body.y = bodyY;
      body.rotation = spawn.rotation + Math.sin(phase * 3) * 0.04 * sign;
      let sx = 1 + stomp * 0.06;
      let sy = 1 - stomp * 0.08;
      if (spawn.spawning && spawn.progress > 0.55) {
        const slam = (spawn.progress - 0.55) / 0.45;
        const impact = Math.sin(slam * Math.PI) * 0.22;
        sx += impact;
        sy -= impact * 0.75;
      }
      sprite.scale.set(base * sign * sx, base * sy);
      shadowSquash = 1 + stomp * 0.18;
      break;
    }
    default:
      body.y = bodyY;
      sprite.scale.set(base * sign, base);
      break;
  }

  paintEnemyShadow(shadow, kind, radius, bodyY, shadowSquash, bodyAlpha);
}

function lerpColor(from: number, to: number, t: number): number {
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  const r = Math.round(fr + (tr - fr) * t);
  const g = Math.round(fg + (tg - fg) * t);
  const b = Math.round(fb + (tb - fb) * t);
  return (r << 16) | (g << 8) | b;
}

export const CRAWLER_BOSS_SCALE = 1.75;

export interface CrawlerSegmentState {
  hp: number;
  maxHp: number;
  alive: boolean;
}

const CRAWLER_SHELL = 0x5c3070;
const CRAWLER_SHELL_HI = 0x8050a0;
const CRAWLER_HEAD = 0x3a1848;
const CRAWLER_LEG = 0x301040;
const CRAWLER_FOOT = 0x442255;
const CRAWLER_ANTENNA = 0x8866aa;

const CRAWLER_SEGMENTS: {
  y: number;
  rx: number;
  ry: number;
  legReach: number;
  legDrop: number;
}[] = [
  { y: 28, rx: 18, ry: 12, legReach: 0, legDrop: 0 },
  { y: 12, rx: 22, ry: 14, legReach: 32, legDrop: 10 },
  { y: -2, rx: 24, ry: 15, legReach: 34, legDrop: 10 },
  { y: -16, rx: 22, ry: 14, legReach: 36, legDrop: 10 },
  { y: -30, rx: 20, ry: 13, legReach: 38, legDrop: 10 },
];

const CRAWLER_BASE_Y = [...CRAWLER_SEGMENTS.map((seg) => seg.y), -46];

function drawCrawlerSegment(
  rx: number,
  ry: number,
  legReach: number,
  legDrop: number,
): Graphics {
  const g = new Graphics();
  g.ellipse(0, 0, rx + 1, ry + 1).fill({ color: 0x120818, alpha: 0.35 });
  g.ellipse(0, 0, rx, ry).fill(CRAWLER_SHELL);
  g.ellipse(0, -1, rx - 2, ry - 2).fill(CRAWLER_SHELL_HI);
  g.ellipse(0, 0, rx, ry).stroke({ width: 2, color: 0x2a1038, alpha: 0.55 });
  g.ellipse(-rx * 0.35, -ry * 0.25, rx * 0.18, ry * 0.12).fill({
    color: 0xffffff,
    alpha: 0.08,
  });

  if (legReach > 0) {
    const legInset = Math.min(rx - 2, 14);
    g.moveTo(-legInset, 2);
    g.lineTo(-legReach, legDrop);
    g.moveTo(legInset, 2);
    g.lineTo(legReach, legDrop);
    g.stroke({ width: 4, color: CRAWLER_LEG });
    g.circle(-legReach, legDrop, 3).fill(CRAWLER_FOOT);
    g.circle(legReach, legDrop, 3).fill(CRAWLER_FOOT);
  }

  return g;
}

function drawCrawlerHead(): Container {
  const head = new Container();
  const shell = new Graphics();
  shell.circle(0, 0, 12).fill(CRAWLER_HEAD);
  shell.circle(0, 0, 12).stroke({ width: 2, color: 0x1a0828, alpha: 0.7 });
  shell.circle(-4, -4, 4).fill({ color: 0xffffff, alpha: 0.06 });

  const eyeL = new Graphics();
  eyeL.circle(-5, -1, 3.5).fill(0xff6644);
  eyeL.circle(-5, -1, 1.5).fill(0x110008);
  eyeL.label = "crawlerEye";

  const eyeR = new Graphics();
  eyeR.circle(5, -1, 3.5).fill(0xff6644);
  eyeR.circle(5, -1, 1.5).fill(0x110008);
  eyeR.label = "crawlerEye";

  const antenna = new Graphics();
  antenna.moveTo(-8, -6);
  antenna.lineTo(-16, -16);
  antenna.moveTo(8, -6);
  antenna.lineTo(16, -16);
  antenna.stroke({ width: 3, color: CRAWLER_ANTENNA });

  head.addChild(shell, eyeL, eyeR, antenna);
  return head;
}

function createCrawlerBossBody(): Container {
  const body = new Container();

  for (const seg of CRAWLER_SEGMENTS) {
    const part = drawCrawlerSegment(seg.rx, seg.ry, seg.legReach, seg.legDrop);
    part.position.set(0, seg.y);
    body.addChild(part);
  }

  const head = drawCrawlerHead();
  head.position.set(0, -46);
  body.addChild(head);

  body.scale.set(CRAWLER_BOSS_SCALE);
  return body;
}

export function getCrawlerSegmentCount(): number {
  return CRAWLER_SEGMENTS.length + 1;
}

export function initCrawlerSegmentHp(totalHp: number): CrawlerSegmentState[] {
  const count = getCrawlerSegmentCount();
  const perSeg = totalHp / count;
  return Array.from({ length: count }, () => ({
    hp: perSeg,
    maxHp: perSeg,
    alive: true,
  }));
}

function getCrawlerBody(container: Container): Container {
  return getEnemyBody(container);
}

function toWorldSpace(
  container: Container,
  body: Container,
  x: number,
  y: number,
): { x: number; y: number } {
  const root = container.parent ?? container;
  return root.toLocal(body.toGlobal({ x, y }));
}

function localRadiusToWorld(
  container: Container,
  body: Container,
  radius: number,
): number {
  const center = toWorldSpace(container, body, 0, 0);
  const edge = toWorldSpace(container, body, radius, 0);
  return Math.hypot(edge.x - center.x, edge.y - center.y);
}

export function syncEnemyHitbox(
  kind: EnemyKind,
  container: Container,
): { x: number; y: number; radius: number } {
  const body = getEnemyBody(container);
  const center = toWorldSpace(container, body, 0, 0);

  if (kind === "crawlerBoss") {
    return {
      x: center.x,
      y: center.y,
      radius: localRadiusToWorld(
        container,
        body,
        ENEMY_HIT_RADIUS.crawlerBoss * 0.68,
      ),
    };
  }

  const animBody = body as EnemyAnimBody;
  const sprite = animBody.sprite;
  if (sprite) {
    const localR =
      Math.min(Math.abs(sprite.width), Math.abs(sprite.height)) * 0.44;
    return {
      x: center.x,
      y: center.y,
      radius: localRadiusToWorld(container, body, localR),
    };
  }

  return {
    x: center.x,
    y: center.y,
    radius: localRadiusToWorld(container, body, ENEMY_HIT_RADIUS[kind] * 0.9),
  };
}

function getCrawlerSegmentHitRadius(segmentIndex: number): number {
  if (segmentIndex >= CRAWLER_SEGMENTS.length) {
    return 12 * CRAWLER_BOSS_SCALE * 0.82;
  }
  const seg = CRAWLER_SEGMENTS[segmentIndex];
  return Math.max(seg.rx, seg.ry) * CRAWLER_BOSS_SCALE * 0.78;
}

export function getCrawlerSegmentWorldPos(
  container: Container,
  segmentIndex: number,
): { x: number; y: number } {
  const body = getCrawlerBody(container);
  const seg = body.children[segmentIndex];
  return toWorldSpace(container, body, seg.x, seg.y);
}

export function findCrawlerSegmentHit(
  container: Container,
  worldX: number,
  worldY: number,
): number {
  const body = getCrawlerBody(container);
  let best = -1;
  let bestDist = Infinity;

  for (let i = 0; i < body.children.length; i++) {
    const seg = body.children[i];
    if (!seg.visible) continue;
    const pos = toWorldSpace(container, body, seg.x, seg.y);
    const d = Math.hypot(worldX - pos.x, worldY - pos.y);
    const r = getCrawlerSegmentHitRadius(i);
    if (d <= r && d < bestDist) {
      bestDist = d;
      best = i;
    }
  }

  return best;
}

export function findNearestCrawlerSegment(
  container: Container,
  worldX: number,
  worldY: number,
): number {
  const body = getCrawlerBody(container);
  let best = -1;
  let bestDist = Infinity;

  for (let i = 0; i < body.children.length; i++) {
    const seg = body.children[i];
    if (!seg.visible) continue;
    const pos = toWorldSpace(container, body, seg.x, seg.y);
    const d = Math.hypot(worldX - pos.x, worldY - pos.y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }

  return best;
}

export function hideCrawlerSegment(
  container: Container,
  segmentIndex: number,
): void {
  const body = getCrawlerBody(container);
  const seg = body.children[segmentIndex];
  if (seg) seg.visible = false;
}

export function sumCrawlerSegmentHp(segments: CrawlerSegmentState[]): number {
  return segments.reduce((sum, seg) => sum + (seg.alive ? seg.hp : 0), 0);
}

export function sumCrawlerSegmentMaxHp(
  segments: CrawlerSegmentState[],
): number {
  return segments.reduce((sum, seg) => sum + seg.maxHp, 0);
}

export function updateCrawlerBossMotion(
  enemyContainer: Container,
  phase: number,
  moving = true,
  hitFlash = 0,
  spawnPop = 1,
): void {
  const body = getCrawlerBody(enemyContainer);
  const march = moving ? Math.sin(phase * 9) : 0;
  body.position.set(0, march * 2.5);
  body.scale.set(CRAWLER_BOSS_SCALE * spawnPop);

  const headIdx = body.children.length - 1;
  for (let i = 0; i < body.children.length; i++) {
    const seg = body.children[i];
    if (!seg.visible) continue;

    const baseY = CRAWLER_BASE_Y[i] ?? 0;
    const wave = Math.sin(phase * 2.4 - i * 0.55);
    const legWave = moving ? Math.sin(phase * 11 - i * 0.85) : 0;
    const parity = i % 2 === 0 ? 1 : -1;

    seg.x = wave * (2.5 + i * 0.35) + legWave * parity * 3.5;
    seg.y = baseY + legWave * parity * 2.2;
    seg.rotation =
      wave * 0.07 +
      legWave * 0.05 * parity +
      (i === headIdx ? Math.sin(phase * 4.5) * 0.08 : 0);

    if (hitFlash > 0) {
      seg.tint = 0xffaaaa;
      seg.alpha = 0.85 + Math.min(1, hitFlash * 5) * 0.15;
    } else {
      seg.tint = 0xffffff;
      seg.alpha = 1;
    }

    if (i === headIdx) {
      for (const child of seg.children) {
        if (child.label === "crawlerEye") {
          const glow = 0.75 + Math.sin(phase * 6) * 0.25;
          child.alpha = glow;
          child.scale.set(0.95 + Math.sin(phase * 6 + 1) * 0.08);
        }
      }
    }
  }
}

export function getEnemyRadius(kind: EnemyKind): number {
  return ENEMY_HIT_RADIUS[kind];
}

/** Scale an in-game enemy graphic to fit a square HUD / UI icon slot. */
export function scaleEnemyForStatIcon(kind: EnemyKind, boxSize: number): number {
  const targetPx = boxSize * 0.76;
  const approxDiameter = getEnemyRadius(kind) * 2.15 * 2;
  return targetPx / approxDiameter;
}

export function getEnemyMaxHp(kind: EnemyKind): number {
  return ENEMY_HP[kind];
}

export function createEnemyGraphic(kind: EnemyKind): {
  container: Container;
  healthBar: Graphics;
} {
  const container = new Container();
  const shadow = new Graphics();
  shadow.label = "enemyShadow";
  const body =
    kind === "crawlerBoss" ? createCrawlerBossBody() : createEnemySprite(kind);
  body.label = "enemyBody";

  const barW = ENEMY_HEALTH_BAR_WIDTH[kind];
  const healthBar = new Graphics();
  healthBar.label = "enemyHealthBar";
  healthBar.position.set(-barW / 2, -getEnemyRadius(kind) - 18);
  container.addChild(shadow, body, healthBar);

  if (kind === "crawlerBoss") {
    const label = new Text({
      text: "CRAWLER",
      style: {
        fill: 0xff6644,
        fontSize: 13,
        fontFamily: "monospace",
        fontWeight: "bold",
        dropShadow: {
          alpha: 0.8,
          angle: Math.PI / 2,
          blur: 2,
          color: 0x000000,
          distance: 2,
        },
      },
    });
    label.anchor.set(0.5, 1);
    label.position.set(0, -getEnemyRadius(kind) - 24);
    container.addChild(label);
  }

  paintEnemyShadow(shadow, kind, getEnemyRadius(kind), 0);

  return { container, healthBar };
}

export function updateEnemyHealthBar(
  bar: Graphics,
  hp: number,
  maxHp: number,
  width = 32,
  kind: EnemyKind = "ghost",
  showBar = true,
  phase = 0,
): void {
  const ratio = Math.max(0, hp / maxHp);
  const alwaysShow = kind === "crawlerBoss" || kind === "brute";
  bar.visible = showBar || alwaysShow || hp < maxHp;
  if (!bar.visible) return;

  const h = kind === "crawlerBoss" ? 7 : 5;
  const pulse =
    ratio > 0 && ratio < 0.28 ? 0.72 + Math.sin(phase * 14) * 0.28 : 1;
  const fillColor =
    ratio < 0.28
      ? 0xff4422
      : kind === "crawlerBoss"
        ? 0xff3355
        : kind === "brute"
          ? 0xff5533
          : 0xee2233;

  bar.clear();
  bar
    .roundRect(-1, -1, width + 2, h + 2, 3)
    .fill({ color: 0x000000, alpha: 0.45 });
  bar.roundRect(0, 0, width, h, 2).fill({ color: 0x1a1018, alpha: 0.9 });
  if (ratio > 0) {
    bar
      .roundRect(0, 0, width * ratio, h, 2)
      .fill({ color: fillColor, alpha: pulse });
    bar
      .roundRect(1, 1, Math.max(0, width * ratio - 2), Math.max(1, h * 0.38), 1)
      .fill({ color: 0xffffff, alpha: 0.22 * pulse });
  }
  bar
    .roundRect(0, 0, width, h, 2)
    .stroke({ width: 1, color: 0x000000, alpha: 0.35 });
}

export function getEnemySpeedMultiplier(kind: EnemyKind): number {
  switch (kind) {
    case "ghost":
      return 1.08;
    case "skeleton":
      return 1;
    case "zombie":
      return 0.78;
    case "slimeSmall":
      return 0.95;
    case "slimeMedium":
      return 0.88;
    case "slimeBig":
      return 0.72;
    case "skull":
      return 0.95;
    case "bat":
      return 1.2;
    case "brute":
      return 0.72;
    case "crawlerBoss":
      return 0.42;
    default:
      return 1;
  }
}

export function getEnemyHealthBarWidth(kind: EnemyKind): number {
  return ENEMY_HEALTH_BAR_WIDTH[kind];
}

export function getEnemyWaveHpBonus(kind: EnemyKind, wave: number): number {
  return kind === "crawlerBoss" ? wave * 14 : wave * 4;
}
