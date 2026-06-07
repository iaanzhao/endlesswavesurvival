import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type Ticker,
} from "pixi.js";
import {
  CHARACTERS,
  ENEMY_DEFS,
  SHOP_ITEMS,
  UPGRADES,
  computeStats,
  getCharacter,
  pickWeightedEnemy,
  spawnBatchForWave,
  spawnIntervalForWave,
  waveEnemyHpBonus,
  type AppliedStats,
  type CharacterDef,
  type CharacterId,
  type EnemyKind,
  type UpgradeId,
} from "./data";
import { Input, dist, formatTime, loadSave, pickRandom, saveGame } from "./util";

type Phase =
  | "mainMenu"
  | "characterSelect"
  | "playing"
  | "levelUp"
  | "paused"
  | "gameOver"
  | "shop"
  | "help";

interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  xp: number;
  gold: number;
  sprite: Sprite;
  hitFlash: number;
  wobble: number;
  spawnTimer: number;
  baseScale: number;
}

type FloatKind = "damage" | "crit" | "xp" | "gold" | "heal" | "hurt";

interface FloatingNum {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: Text;
}

interface SpawnRingFx {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  color: number;
  gfx: Graphics;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierceLeft: number;
  radius: number;
  color: number;
  life: number;
  gfx: Graphics;
  isMelee?: boolean;
}

interface Pickup {
  x: number;
  y: number;
  kind: "xp" | "gold";
  amount: number;
  gfx: Graphics;
}

const ARENA = 2400;
const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 1.0;
const DASH_SPEED = 420;
const DASH_IFRAMES = 0.22;

function enemyAssetPath(kind: EnemyKind): string {
  const files: Record<EnemyKind, string> = {
    ghost: "ghost",
    skeleton: "skeleton",
    slimeSmall: "slime-small",
    slimeMedium: "slime-small",
    slimeBig: "slime-medium",
    skull: "skull",
    bat: "bat",
    brute: "brute",
  };
  return `/assets/enemies/${files[kind]}.png`;
}

function getSpawnDuration(kind: EnemyKind): number {
  if (kind === "brute") return 0.72;
  if (kind === "slimeBig") return 0.58;
  if (kind === "bat") return 0.38;
  return 0.46;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function getEnemySpawnOffset(kind: EnemyKind, progress: number, radius: number): number {
  const lift = 1 - easeOutCubic(progress);
  switch (kind) {
    case "slimeSmall":
    case "slimeMedium":
    case "slimeBig":
      return -lift * radius * 1.8;
    case "ghost":
    case "bat":
      return -lift * radius * 1.4;
    case "skeleton":
      return lift * radius * 0.9;
    case "skull":
      return -lift * radius * 0.7;
    case "brute":
      return -lift * radius * 2.2;
    default:
      return -lift * radius;
  }
}

export async function startGame(app: Application) {
  const input = new Input();
  let save = loadSave();

  const root = new Container();
  app.stage.addChild(root);

  const world = new Container();
  const floor = new Graphics();
  const vignette = new Graphics();
  const ui = new Container();
  root.addChild(world, ui);

  const enemyTextures: Partial<Record<EnemyKind, Texture>> = {};
  await Promise.all(
    (
      [
        "ghost",
        "skeleton",
        "slimeSmall",
        "slimeMedium",
        "slimeBig",
        "skull",
        "bat",
        "brute",
      ] as EnemyKind[]
    ).map(async (kind) => {
      const path = enemyAssetPath(kind);
      const tex = await Assets.load(path);
      tex.source.scaleMode = "nearest";
      enemyTextures[kind] = tex;
    }),
  );

  let phase: Phase = "mainMenu";
  let charFocus = 0;
  let menuFocus = 0;
  let shopFocus = 0;
  let pauseMenuFocus = 0;
  let activeCharacterId: CharacterId = "mage";
  let levelUpChoices: UpgradeId[] = [];
  let levelUpFocus = 0;
  let pendingLevelUps = 0;

  let playerX = 0;
  let playerY = 0;
  let playerHp = 100;
  let playerLevel = 1;
  let xp = 0;
  let xpToNext = 80;
  let runGold = 0;
  let kills = 0;
  let wave = 1;
  let gameTime = 0;
  let spawnTimer = 0;
  let attackTimer = 0;
  let dashTimer = 0;
  let dashCooldown = 0;
  let dashVx = 0;
  let dashVy = 0;
  let invincible = 0;
  let skillQCooldown = 0;
  let skillRCooldown = 0;
  let smokeTimer = 0;
  let reviveLeft = 0;
  let upgradeLevels: Partial<Record<UpgradeId, number>> = {};

  let character: CharacterDef = getCharacter("mage");
  let stats: AppliedStats = computeStats(character, upgradeLevels, save.shopActive);

  const playerGfx = new Container();
  const playerBody = new Graphics();
  playerGfx.addChild(playerBody);

  const enemies: Enemy[] = [];
  const projectiles: Projectile[] = [];
  const pickups: Pickup[] = [];
  const floatingNums: FloatingNum[] = [];
  const spawnRings: SpawnRingFx[] = [];
  let pendingHurtNumber = 0;
  let hurtNumberTimer = 0;
  const enemyLayer = new Container();
  const fxLayer = new Container();
  const pickupLayer = new Container();
  world.addChild(floor, enemyLayer, pickupLayer, fxLayer, playerGfx);

  const hud = buildHud(ui);
  const overlay = new Container();
  ui.addChild(overlay);

  let levelUpPanel!: ReturnType<typeof createLevelUpPanel>;

  function drawFloor() {
    floor.clear();
    const tile = 64;
    for (let x = -ARENA; x <= ARENA; x += tile) {
      for (let y = -ARENA; y <= ARENA; y += tile) {
        const c = ((x / tile + y / tile) & 1) === 0 ? 0x1a2230 : 0x151c28;
        floor.rect(x, y, tile, tile).fill(c);
      }
    }
    floor.circle(0, 0, ARENA).stroke({ width: 6, color: 0x334455, alpha: 0.6 });
  }

  function drawVignette() {
    vignette.clear();
    if (phase !== "playing" && phase !== "levelUp") {
      vignette.visible = false;
      return;
    }
    vignette.visible = true;
    const w = app.screen.width;
    const h = app.screen.height;
    vignette.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.35 });
  }

  function drawPlayerGraphic() {
    playerBody.clear();
    const c = character.color;
    const a = character.accent;
    switch (character.id) {
      case "mage":
        playerBody.circle(0, -6, 10).fill(a);
        playerBody.roundRect(-8, -2, 16, 18, 3).fill(c);
        playerBody.moveTo(-14, 4).lineTo(-22, 16).stroke({ width: 3, color: 0x8844cc });
        playerBody.circle(-22, 16, 5).fill(0xff6622);
        break;
      case "knight":
        playerBody.roundRect(-12, -4, 24, 22, 2).fill(c);
        playerBody.roundRect(-8, -14, 16, 12, 2).fill(a);
        playerBody.rect(10, 0, 6, 18).fill(0x667788);
        playerBody.rect(8, 14, 10, 4).fill(0x8899aa);
        break;
      case "rogue":
        playerBody.circle(0, 2, 11).fill(c);
        playerBody.moveTo(-10, -8).lineTo(0, -16).lineTo(10, -8).closePath().fill(0x224433);
        playerBody.rect(-3, 8, 6, 10).fill(a);
        playerBody.circle(12, 6, 3).fill(0xcccccc);
        break;
      case "archer":
        playerBody.roundRect(-7, -2, 14, 18, 2).fill(c);
        playerBody.circle(0, -10, 8).fill(a);
        playerBody.moveTo(8, 4).quadraticCurveTo(18, 0, 8, 14).stroke({ width: 2, color: 0x886644 });
        break;
    }
    if (invincible > 0 || smokeTimer > 0) {
      playerBody.circle(0, 4, 18).stroke({
        width: 2,
        color: smokeTimer > 0 ? 0x888888 : 0xffffff,
        alpha: 0.5,
      });
    }
  }

  function resetRun(charId: CharacterId) {
    activeCharacterId = charId;
    character = getCharacter(charId);
    upgradeLevels = {};
    stats = computeStats(character, upgradeLevels, save.shopActive);
    reviveLeft = save.shopActive.revive_token ? 1 : 0;
    playerX = 0;
    playerY = 0;
    playerHp = stats.maxHp;
    playerLevel = 1;
    xp = 0;
    xpToNext = 80;
    runGold = 0;
    kills = 0;
    wave = 1;
    gameTime = 0;
    spawnTimer = 0.5;
    attackTimer = 0;
    dashTimer = 0;
    dashCooldown = 0;
    skillQCooldown = 0;
    skillRCooldown = 0;
    smokeTimer = 0;
    pendingHurtNumber = 0;
    hurtNumberTimer = 0;
    pendingLevelUps = 0;
    levelUpPanel?.hide();
    clearEntities();
    drawPlayerGraphic();
    playerGfx.position.set(0, 0);
  }

  function clearEntities() {
    for (const e of enemies) e.sprite.destroy();
    enemies.length = 0;
    for (const p of projectiles) p.gfx.destroy();
    projectiles.length = 0;
    for (const p of pickups) p.gfx.destroy();
    pickups.length = 0;
    for (const d of floatingNums) d.text.destroy();
    floatingNums.length = 0;
    for (const r of spawnRings) r.gfx.destroy();
    spawnRings.length = 0;
    enemyLayer.removeChildren();
    pickupLayer.removeChildren();
    fxLayer.removeChildren();
  }

  function spawnFromEdge(): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const distFromPlayer = 520 + Math.random() * 180;
    return {
      x: playerX + Math.cos(angle) * distFromPlayer,
      y: playerY + Math.sin(angle) * distFromPlayer,
    };
  }

  function spawnEnemyRing(x: number, y: number, radius: number, color: number) {
    const gfx = new Graphics();
    gfx.position.set(x, y);
    fxLayer.addChild(gfx);
    spawnRings.push({
      x,
      y,
      life: 0.45,
      maxLife: 0.45,
      radius,
      color,
      gfx,
    });
  }

  function addEnemy(kind: EnemyKind) {
    const pos = spawnFromEdge();
    const tex = enemyTextures[kind];
    if (!tex) return;

    const base = ENEMY_DEFS[kind];
    const maxHp = base.hp + waveEnemyHpBonus(wave, kind);
    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.tint = base.tint;
    const scale = (base.radius * 2.2) / Math.max(sprite.width, sprite.height);
    const baseScale = kind === "slimeMedium" ? scale * 1.15 : scale;
    sprite.scale.set(baseScale * 0.08);
    sprite.alpha = 0;
    sprite.position.set(pos.x, pos.y);
    enemyLayer.addChild(sprite);
    spawnEnemyRing(pos.x, pos.y, base.radius, base.tint);

    enemies.push({
      kind,
      x: pos.x,
      y: pos.y,
      hp: maxHp,
      maxHp,
      speed: base.speed + wave * 1.2,
      radius: base.radius,
      damage: base.damage + Math.floor(wave / 8),
      xp: base.xp,
      gold: base.gold,
      sprite,
      hitFlash: 0,
      wobble: Math.random() * Math.PI * 2,
      spawnTimer: getSpawnDuration(kind),
      baseScale,
    });
  }

  function findNearestEnemy(maxRange = Infinity): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxRange;
    for (const e of enemies) {
      const d = dist(playerX, playerY, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function spawnFloatingNumber(
    x: number,
    y: number,
    amount: number,
    kind: FloatKind,
  ) {
    const rounded = Math.max(1, Math.round(amount));
    let label = String(rounded);
    let fill = 0xffffff;
    let fontSize = 14;

    switch (kind) {
      case "crit":
        fill = 0xffdd44;
        fontSize = 18;
        break;
      case "xp":
        label = `+${rounded} XP`;
        fill = 0x66bbff;
        fontSize = 15;
        break;
      case "gold":
        label = `+${rounded}`;
        fill = 0xffcc44;
        fontSize = 15;
        break;
      case "heal":
        label = `+${rounded} HP`;
        fill = 0x66ff88;
        fontSize = 15;
        break;
      case "hurt":
        label = `-${rounded}`;
        fill = 0xff5566;
        fontSize = 16;
        break;
      default:
        break;
    }

    const text = new Text({
      text: label,
      style: {
        fill,
        fontSize,
        fontFamily: "monospace",
        fontWeight: kind === "crit" || kind === "hurt" ? "bold" : "normal",
      },
    });
    text.anchor.set(0.5);
    text.position.set(x, y);
    fxLayer.addChild(text);
    floatingNums.push({
      x,
      y,
      vy: kind === "hurt" ? -45 : -68,
      life: kind === "xp" || kind === "gold" ? 0.85 : 0.7,
      text,
    });
  }

  function damageEnemy(e: Enemy, amount: number, crit = false) {
    e.hp -= amount;
    e.hitFlash = 0.12;
    spawnFloatingNumber(e.x, e.y, amount, crit ? "crit" : "damage");
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e: Enemy) {
    const idx = enemies.indexOf(e);
    if (idx < 0) return;
    kills++;
    const xpGain = Math.round(e.xp * stats.xpMult);
    spawnFloatingNumber(e.x, e.y - 8, xpGain, "xp");
    spawnPickup(e.x, e.y, "xp", xpGain);
    if (Math.random() < 0.35 + e.gold * 0.05) {
      spawnPickup(e.x + 8, e.y, "gold", e.gold);
    }
    e.sprite.destroy();
    enemies.splice(idx, 1);
  }

  function spawnPickup(x: number, y: number, kind: "xp" | "gold", amount: number) {
    const gfx = new Graphics();
    if (kind === "xp") {
      gfx.star(0, 0, 4, 6, 3).fill(0x44aaff);
    } else {
      gfx.circle(0, 0, 5).fill(0xffcc44);
      gfx.circle(0, 0, 7).stroke({ width: 1, color: 0xffaa22, alpha: 0.6 });
    }
    gfx.position.set(x, y);
    pickupLayer.addChild(gfx);
    pickups.push({ x, y, kind, amount, gfx });
  }

  function addProjectile(opts: Omit<Projectile, "gfx" | "life"> & { life?: number }) {
    const gfx = new Graphics();
    if (opts.isMelee) {
      gfx.arc(0, 0, opts.radius, -0.8, 0.8).fill({ color: opts.color, alpha: 0.7 });
    } else if (character.attackKind === "arrow") {
      gfx.moveTo(-8, 0).lineTo(8, 0).stroke({ width: 3, color: opts.color });
      gfx.moveTo(4, 0).lineTo(8, -3).lineTo(8, 3).closePath().fill(opts.color);
    } else if (character.attackKind === "knife") {
      gfx.moveTo(-4, 0).lineTo(4, 0).stroke({ width: 2, color: opts.color });
      gfx.circle(4, 0, 2).fill(opts.color);
    } else {
      gfx.circle(0, 0, opts.radius).fill(opts.color);
    }
    gfx.position.set(opts.x, opts.y);
    if (!opts.isMelee) {
      gfx.rotation = Math.atan2(opts.vy, opts.vx);
    }
    fxLayer.addChild(gfx);
    projectiles.push({
      ...opts,
      life: opts.life ?? 2.5,
      gfx,
    });
  }

  function rollDamage(base: number): { amount: number; crit: boolean } {
    const crit = Math.random() < stats.critChance;
    return { amount: base * (crit ? 2 : 1), crit };
  }

  function autoAttack() {
    const target = findNearestEnemy(stats.areaMult * character.range);
    if (!target) return;

    const baseDmg = character.damage * stats.damageMult;
    const angle = Math.atan2(target.y - playerY, target.x - playerX);
    const count = stats.multishot;
    const spread = count > 1 ? 0.25 : 0;

    if (character.attackKind === "melee") {
      const { amount, crit } = rollDamage(baseDmg);
      addProjectile({
        x: playerX + Math.cos(angle) * 30,
        y: playerY + Math.sin(angle) * 30,
        vx: 0,
        vy: 0,
        damage: amount,
        pierceLeft: 0,
        radius: character.range * stats.areaMult,
        color: character.accent,
        isMelee: true,
        life: 0.15,
      });
      for (const e of enemies) {
        const d = dist(playerX, playerY, e.x, e.y);
        if (d <= character.range * stats.areaMult) {
          const aToEnemy = Math.atan2(e.y - playerY, e.x - playerX);
          let diff = Math.abs(aToEnemy - angle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 1.2) damageEnemy(e, amount, crit);
        }
      }
      return;
    }

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
      const a = angle + t;
      const { amount } = rollDamage(baseDmg);
      const speed = character.projectileSpeed;
      addProjectile({
        x: playerX,
        y: playerY,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        damage: amount,
        pierceLeft: stats.pierce,
        radius: character.attackKind === "magic" ? 8 * stats.areaMult : 5,
        color:
          character.attackKind === "magic"
            ? 0xff8844
            : character.attackKind === "knife"
              ? 0xaaffcc
              : 0xffeeaa,
      });
    }
  }

  function useSkillQ() {
    if (skillQCooldown > 0) return;
    skillQCooldown = character.skillQ.cooldown * stats.cooldownMult;

    switch (character.id) {
      case "mage": {
        for (const e of [...enemies]) {
          if (dist(playerX, playerY, e.x, e.y) < 160 * stats.areaMult) {
            damageEnemy(e, 45 * stats.damageMult);
          }
        }
        const ring = new Graphics();
        ring.circle(0, 0, 160 * stats.areaMult).stroke({ width: 4, color: 0xff6622, alpha: 0.8 });
        ring.position.set(playerX, playerY);
        fxLayer.addChild(ring);
        setTimeout(() => ring.destroy(), 200);
        break;
      }
      case "knight": {
        const target = findNearestEnemy(120);
        const angle = target
          ? Math.atan2(target.y - playerY, target.x - playerX)
          : 0;
        for (const e of enemies) {
          const d = dist(playerX, playerY, e.x, e.y);
          if (d < 100) {
            const a = Math.atan2(e.y - playerY, e.x - playerX);
            let diff = Math.abs(a - angle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            if (diff < 0.9) damageEnemy(e, 55 * stats.damageMult);
          }
        }
        break;
      }
      case "rogue":
        smokeTimer = 2.5;
        invincible = Math.max(invincible, 2.5);
        break;
      case "archer": {
        const target = findNearestEnemy(400);
        const angle = target
          ? Math.atan2(target.y - playerY, target.x - playerX)
          : 0;
        for (let i = -2; i <= 2; i++) {
          const a = angle + i * 0.12;
          addProjectile({
            x: playerX,
            y: playerY,
            vx: Math.cos(a) * 600,
            vy: Math.sin(a) * 600,
            damage: 35 * stats.damageMult,
            pierceLeft: 3 + stats.pierce,
            radius: 5,
            color: 0xffcc44,
          });
        }
        break;
      }
    }
  }

  function useSkillR() {
    if (skillRCooldown > 0) return;
    skillRCooldown = character.skillR.cooldown * stats.cooldownMult;

    switch (character.id) {
      case "mage": {
        let remaining = 5;
        let from = findNearestEnemy(500);
        if (!from) break;
        let cx = from.x;
        let cy = from.y;
        damageEnemy(from, 40 * stats.damageMult);
        remaining--;
        while (remaining > 0) {
          const next = enemies
            .filter((e) => dist(cx, cy, e.x, e.y) < 180)
            .sort((a, b) => dist(cx, cy, a.x, a.y) - dist(cx, cy, b.x, b.y))[0];
          if (!next) break;
          const bolt = new Graphics();
          bolt.moveTo(cx, cy).lineTo(next.x, next.y).stroke({ width: 3, color: 0x66ccff });
          fxLayer.addChild(bolt);
          setTimeout(() => bolt.destroy(), 150);
          damageEnemy(next, 30 * stats.damageMult);
          cx = next.x;
          cy = next.y;
          remaining--;
        }
        break;
      }
      case "knight":
        for (const e of [...enemies]) {
          if (dist(playerX, playerY, e.x, e.y) < 110 * stats.areaMult) {
            damageEnemy(e, 28 * stats.damageMult);
          }
        }
        break;
      case "rogue":
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          addProjectile({
            x: playerX,
            y: playerY,
            vx: Math.cos(a) * 380,
            vy: Math.sin(a) * 380,
            damage: 18 * stats.damageMult,
            pierceLeft: stats.pierce,
            radius: 4,
            color: 0x44ff88,
          });
        }
        break;
      case "archer":
        for (const e of [...enemies]) {
          if (dist(playerX, playerY, e.x, e.y) < 280) {
            addProjectile({
              x: e.x,
              y: e.y - 200,
              vx: 0,
              vy: 500,
              damage: 32 * stats.damageMult,
              pierceLeft: 0,
              radius: 6,
              color: 0xff8844,
              life: 1.2,
            });
          }
        }
        break;
    }
  }

  function tryDash() {
    if (dashCooldown > 0 || dashTimer > 0) return;
    const move = input.moveVector();
    const dx = move.x || (Math.random() - 0.5);
    const dy = move.y || (Math.random() - 0.5);
    const len = Math.hypot(dx, dy) || 1;
    dashVx = (dx / len) * DASH_SPEED;
    dashVy = (dy / len) * DASH_SPEED;
    dashTimer = DASH_DURATION;
    dashCooldown = DASH_COOLDOWN;
    invincible = Math.max(invincible, DASH_IFRAMES);
  }

  function gainXp(amount: number) {
    xp += amount;
    while (xp >= xpToNext) {
      xp -= xpToNext;
      xpToNext = Math.floor(xpToNext * 1.22 + 35);
      pendingLevelUps++;
      const healAmount = Math.min(8, stats.maxHp - playerHp);
      playerLevel++;
      playerHp = Math.min(stats.maxHp, playerHp + 8);
      if (healAmount > 0) {
        spawnFloatingNumber(playerX, playerY - 28, healAmount, "heal");
      }
    }
    tryShowLevelUp();
  }

  function tryShowLevelUp() {
    if (pendingLevelUps <= 0 || phase === "levelUp") return;
    if (phase !== "playing") return;
    showLevelUpMenu();
  }

  function showLevelUpMenu() {
    const available = UPGRADES.filter(
      (u) => (upgradeLevels[u.id] ?? 0) < u.maxLevel,
    );
    levelUpChoices = pickRandom(available, 3).map((u) => u.id);
    levelUpFocus = 0;
    phase = "levelUp";
    levelUpPanel.refresh(app.screen.width, app.screen.height);
    levelUpPanel.show();
    drawVignette();
    updateHudDisplay();
  }

  function applyUpgrade(id: UpgradeId) {
    upgradeLevels[id] = (upgradeLevels[id] ?? 0) + 1;
    stats = computeStats(character, upgradeLevels, save.shopActive);
    playerHp = Math.min(stats.maxHp, playerHp);
    pendingLevelUps--;
    if (pendingLevelUps > 0) {
      showLevelUpMenu();
      return;
    }
    phase = "playing";
    levelUpPanel.hide();
    drawVignette();
    updateHudDisplay();
  }

  levelUpPanel = createLevelUpPanel({
    onPick: applyUpgrade,
    getChoices: () => levelUpChoices,
    getFocus: () => levelUpFocus,
    getLevel: () => playerLevel,
    getUpgradeLevels: () => upgradeLevels,
  });
  ui.addChild(levelUpPanel.root);

  function damagePlayer(amount: number) {
    if (invincible > 0 || smokeTimer > 0) return;
    const reduced = amount * (1 - stats.armor);
    if (reduced <= 0) return;
    playerHp -= reduced;
    pendingHurtNumber += reduced;
    invincible = 0.4;
    if (playerHp <= 0) {
      if (reviveLeft > 0) {
        reviveLeft--;
        playerHp = stats.maxHp * 0.5;
        invincible = 2;
      } else {
        endRun();
      }
    }
  }

  function saveRunProgress() {
    save.totalGold += runGold;
    save.lifetimeGold += runGold;
    if (kills > save.highScore) save.highScore = kills;
    if (gameTime > save.bestTime) save.bestTime = gameTime;
    for (const item of SHOP_ITEMS) {
      if (save.lifetimeGold >= item.unlockGold) {
        save.unlockedShop[item.id] = true;
      }
    }
    saveGame(save);
  }

  function endRun() {
    phase = "gameOver";
    saveRunProgress();
  }

  function openPause() {
    phase = "paused";
    pauseMenuFocus = 0;
    layoutOverlay();
    updateHudDisplay();
  }

  function resumeFromPause() {
    phase = "playing";
    layoutOverlay();
    updateHudDisplay();
  }

  function restartFromPause() {
    resetRun(activeCharacterId);
    phase = "playing";
    layoutOverlay();
    updateHudDisplay();
  }

  function quitToMainMenu() {
    saveRunProgress();
    phase = "mainMenu";
    clearEntities();
    layoutOverlay();
  }

  function clampPlayer() {
    const m = ARENA - 30;
    playerX = Math.max(-m, Math.min(m, playerX));
    playerY = Math.max(-m, Math.min(m, playerY));
  }

  function updatePlaying(dt: number) {
    gameTime += dt;
    wave = 1 + Math.floor(gameTime / 30);

    if (input.pressed("Space")) tryDash();
    if (input.pressed("Escape") || input.pressed("KeyP")) openPause();

    if (dashTimer > 0) {
      dashTimer -= dt;
      playerX += dashVx * dt;
      playerY += dashVy * dt;
    } else {
      const move = input.moveVector();
      const speed = smokeTimer > 0 ? stats.speed * 1.35 : stats.speed;
      playerX += move.x * speed * dt;
      playerY += move.y * speed * dt;
    }
    clampPlayer();
    playerGfx.position.set(playerX, playerY);

    if (dashCooldown > 0) dashCooldown -= dt;
    if (skillQCooldown > 0) skillQCooldown -= dt;
    else useSkillQ();
    if (skillRCooldown > 0) skillRCooldown -= dt;
    else useSkillR();
    if (invincible > 0) invincible -= dt;
    if (smokeTimer > 0) smokeTimer -= dt;
    if (playerHp < stats.maxHp) playerHp = Math.min(stats.maxHp, playerHp + stats.regen * dt);

    attackTimer -= dt;
    if (attackTimer <= 0) {
      autoAttack();
      attackTimer = 1 / (character.attackRate * stats.attackRateMult);
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const batch = spawnBatchForWave(wave);
      for (let i = 0; i < batch; i++) addEnemy(pickWeightedEnemy(wave));
      spawnTimer = spawnIntervalForWave(wave);
    }

    for (const e of enemies) {
      if (e.spawnTimer > 0) {
        e.spawnTimer -= dt;
        const duration = getSpawnDuration(e.kind);
        const progress = 1 - Math.max(0, e.spawnTimer) / duration;
        const pop = easeOutBack(Math.min(1, progress));
        const offsetY = getEnemySpawnOffset(e.kind, progress, e.radius);
        e.sprite.scale.set(e.baseScale * (0.08 + pop * 0.92));
        e.sprite.alpha = Math.min(1, progress * 1.35);
        e.wobble += dt * 4;
        e.sprite.position.set(
          e.x + Math.sin(e.wobble) * 2,
          e.y + offsetY + Math.cos(e.wobble * 0.7) * 2,
        );
        continue;
      }

      const dx = playerX - e.x;
      const dy = playerY - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
      e.wobble += dt * 4;
      e.sprite.position.set(
        e.x + Math.sin(e.wobble) * 2,
        e.y + Math.cos(e.wobble * 0.7) * 2,
      );
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        e.sprite.alpha = 0.5 + Math.sin(e.hitFlash * 40) * 0.3;
      } else {
        e.sprite.alpha = 1;
      }
      if (dist(playerX, playerY, e.x, e.y) < e.radius + 14) {
        damagePlayer(e.damage * dt * 2.5);
      }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= dt;
      if (p.isMelee) {
        if (p.life <= 0) {
          p.gfx.destroy();
          projectiles.splice(i, 1);
        }
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.gfx.position.set(p.x, p.y);
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (dist(p.x, p.y, e.x, e.y) < e.radius + p.radius) {
          damageEnemy(e, p.damage);
          if (p.pierceLeft > 0) {
            p.pierceLeft--;
          } else {
            hit = true;
            break;
          }
        }
      }
      if (hit || p.life <= 0 || Math.abs(p.x) > ARENA || Math.abs(p.y) > ARENA) {
        p.gfx.destroy();
        projectiles.splice(i, 1);
      }
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      const d = dist(playerX, playerY, p.x, p.y);
      if (d < stats.magnet) {
        const pull = d < 30 ? 1 : 0.15;
        p.x += ((playerX - p.x) / (d || 1)) * 280 * pull * dt;
        p.y += ((playerY - p.y) / (d || 1)) * 280 * pull * dt;
        p.gfx.position.set(p.x, p.y);
      }
      if (d < 20) {
        if (p.kind === "xp") {
          gainXp(p.amount);
        } else {
          runGold += p.amount;
          spawnFloatingNumber(playerX, playerY - 20, p.amount, "gold");
        }
        p.gfx.destroy();
        pickups.splice(i, 1);
      }
    }

    hurtNumberTimer -= dt;
    if (pendingHurtNumber > 0 && hurtNumberTimer <= 0) {
      spawnFloatingNumber(playerX, playerY - 24, pendingHurtNumber, "hurt");
      pendingHurtNumber = 0;
      hurtNumberTimer = 0.2;
    }

    for (let i = spawnRings.length - 1; i >= 0; i--) {
      const ring = spawnRings[i];
      ring.life -= dt;
      const t = 1 - ring.life / ring.maxLife;
      ring.gfx.clear();
      ring.gfx
        .circle(0, 0, ring.radius * (0.6 + t * 1.1))
        .stroke({ width: 2, color: ring.color, alpha: 1 - t });
      if (ring.life <= 0) {
        ring.gfx.destroy();
        spawnRings.splice(i, 1);
      }
    }

    for (let i = floatingNums.length - 1; i >= 0; i--) {
      const d = floatingNums[i];
      d.life -= dt;
      d.y += d.vy * dt;
      d.text.position.set(d.x, d.y);
      d.text.alpha = d.life / 0.85;
      if (d.life <= 0) {
        d.text.destroy();
        floatingNums.splice(i, 1);
      }
    }

    drawPlayerGraphic();
    updateCamera();
    updateHudDisplay();
  }

  function updateCamera() {
    world.position.set(
      app.screen.width / 2 - playerX,
      app.screen.height / 2 - playerY,
    );
  }

  function updateHudDisplay() {
    hud.update({
      hp: playerHp,
      maxHp: stats.maxHp,
      xp,
      xpMax: xpToNext,
      level: playerLevel,
      wave,
      time: formatTime(gameTime),
      gold: runGold,
      totalGold: save.totalGold,
      skillQ: skillQCooldown,
      skillR: skillRCooldown,
      skillQName: character.skillQ.name,
      skillRName: character.skillR.name,
      skillQMax: character.skillQ.cooldown * stats.cooldownMult,
      skillRMax: character.skillR.cooldown * stats.cooldownMult,
      kills,
      visible: phase === "playing" || phase === "levelUp" || phase === "paused",
    });
  }

  function layoutUi() {
    drawVignette();
    vignette.position.set(0, 0);
    ui.removeChild(vignette);
    ui.addChild(vignette);
    layoutOverlay();
    hud.layout(app.screen.width, app.screen.height);
  }

  function layoutOverlay() {
    overlay.removeChildren();
    const w = app.screen.width;
    const h = app.screen.height;

    if (phase === "levelUp") {
      levelUpPanel.refresh(w, h);
      levelUpPanel.show();
      return;
    }
    levelUpPanel.hide();

    if (phase === "mainMenu") {
      overlay.addChild(buildMainMenu(w, h));
    } else if (phase === "characterSelect") {
      overlay.addChild(buildCharacterSelect(w, h));
    } else if (phase === "help") {
      overlay.addChild(buildHelp(w, h));
    } else if (phase === "shop") {
      overlay.addChild(buildShopPanel(w, h));
    } else if (phase === "paused") {
      overlay.addChild(buildPauseMenu(w, h));
    } else if (phase === "gameOver") {
      overlay.addChild(buildGameOver(w, h));
    }
  }

  function panelBg(w: number, h: number, pw: number, ph: number): Container {
    const c = new Container();
    const dim = new Graphics();
    dim.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.55 });
    dim.eventMode = "static";
    const box = new Graphics();
    box.roundRect(-pw / 2, -ph / 2, pw, ph, 8).fill(0x1a2030);
    box.roundRect(-pw / 2, -ph / 2, pw, ph, 8).stroke({ width: 2, color: 0x445566 });
    box.position.set(w / 2, h / 2);
    c.addChild(dim, box);
    return c;
  }

  function menuBtn(label: string, onClick: () => void, focused = false): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const g = new Graphics();
    g.roundRect(-120, -22, 240, 44, 4).fill(focused ? 0x334466 : 0x222838);
    g.roundRect(-120, -22, 240, 44, 4).stroke({ width: 2, color: focused ? 0x88aacc : 0x445566 });
    const t = new Text({
      text: label,
      style: { fill: 0xffffff, fontSize: 20, fontFamily: "monospace", letterSpacing: 2 },
    });
    t.anchor.set(0.5);
    btn.addChild(g, t);
    btn.on("pointertap", onClick);
    return btn;
  }

  function buildMainMenu(w: number, h: number): Container {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, w, h).fill({ color: 0x0a0e14, alpha: 0.92 });
    c.addChild(bg);

    const title = new Text({
      text: "ENDLESS WAVES\nSURVIVAL",
      style: {
        fill: 0xffcc44,
        fontSize: 42,
        fontFamily: "monospace",
        fontWeight: "bold",
        align: "center",
        lineHeight: 48,
        letterSpacing: 3,
      },
    });
    title.anchor.set(0.5);
    title.position.set(w / 2, h * 0.22);

    const sub = new Text({
      text: "Survive the endless horde. Level up. Stack power.",
      style: { fill: 0x8899aa, fontSize: 16, fontFamily: "monospace" },
    });
    sub.anchor.set(0.5);
    sub.position.set(w / 2, h * 0.22 + 70);

    const items = ["PLAY", "SHOP", "HOW TO PLAY"];
    const actions = [
      () => {
        phase = "characterSelect";
        layoutOverlay();
      },
      () => {
        phase = "shop";
        shopFocus = 0;
        layoutOverlay();
      },
      () => {
        phase = "help";
        layoutOverlay();
      },
    ];
    items.forEach((label, i) => {
      const btn = menuBtn(label, actions[i], menuFocus === i);
      btn.position.set(w / 2, h * 0.48 + i * 58);
      c.addChild(btn);
    });

    const stats = new Text({
      text: `Gold: ${save.totalGold}  |  Best: ${save.highScore} kills  |  ${formatTime(save.bestTime)}`,
      style: { fill: 0x667788, fontSize: 14, fontFamily: "monospace" },
    });
    stats.anchor.set(0.5);
    stats.position.set(w / 2, h - 40);
    c.addChild(title, sub, stats);
    return c;
  }

  function buildCharacterSelect(w: number, h: number): Container {
    const c = panelBg(w, h, 720, 480);
    const title = new Text({
      text: "CHOOSE YOUR HERO",
      style: { fill: 0xffcc44, fontSize: 26, fontFamily: "monospace", letterSpacing: 2 },
    });
    title.anchor.set(0.5);
    title.position.set(w / 2, h / 2 - 200);
    c.addChild(title);

    CHARACTERS.forEach((ch, i) => {
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      const focused = charFocus === i;
      const g = new Graphics();
      g.roundRect(-80, -90, 160, 180, 6).fill(focused ? 0x283040 : 0x1a2030);
      g.roundRect(-80, -90, 160, 180, 6).stroke({ width: 2, color: focused ? ch.accent : 0x445566 });
      const preview = new Graphics();
      preview.circle(0, -20, 14).fill(ch.accent);
      preview.roundRect(-10, -5, 20, 22, 2).fill(ch.color);
      const name = new Text({
        text: ch.name,
        style: { fill: 0xffffff, fontSize: 16, fontFamily: "monospace", fontWeight: "bold" },
      });
      name.anchor.set(0.5);
      name.y = 30;
      const tag = new Text({
        text: ch.tagline,
        style: { fill: 0x8899aa, fontSize: 11, fontFamily: "monospace", wordWrap: true, wordWrapWidth: 140, align: "center" },
      });
      tag.anchor.set(0.5);
      tag.y = 55;
      card.addChild(g, preview, name, tag);
      card.position.set(w / 2 - 240 + i * 160, h / 2 - 10);
      card.on("pointertap", () => {
        resetRun(ch.id);
        phase = "playing";
        layoutOverlay();
      });
      c.addChild(card);
    });

    const back = menuBtn("BACK", () => {
      phase = "mainMenu";
      layoutOverlay();
    });
    back.position.set(w / 2, h / 2 + 170);
    c.addChild(back);
    return c;
  }

  function buildHelp(w: number, h: number): Container {
    const c = panelBg(w, h, 560, 440);
    const text = new Text({
      text:
        "HOW TO PLAY\n\n" +
        "WASD / Arrows — move\n" +
        "Space — dash (brief invincibility)\n" +
        "Esc / P — pause\n\n" +
        "Auto-attack and skills fire automatically.\n" +
        "Collect XP gems to level up and pick upgrades.\n" +
        "Collect gold to buy permanent shop buffs.\n" +
        "All upgrades stack — build the strongest combo!\n\n" +
        "Mage — area magic  |  Knight — melee tank\n" +
        "Rogue — speed & crit  |  Archer — ranged kiting",
      style: {
        fill: 0xccddee,
        fontSize: 15,
        fontFamily: "monospace",
        align: "center",
        lineHeight: 24,
      },
    });
    text.anchor.set(0.5);
    text.position.set(w / 2, h / 2 - 20);
    c.addChild(text);
    const back = menuBtn("BACK", () => {
      phase = "mainMenu";
      layoutOverlay();
    });
    back.position.set(w / 2, h / 2 + 180);
    c.addChild(back);
    return c;
  }

  function buildShopPanel(w: number, h: number): Container {
    const c = panelBg(w, h, 640, 500);
    const title = new Text({
      text: `SHOP — ${save.totalGold} gold`,
      style: { fill: 0xffcc44, fontSize: 24, fontFamily: "monospace" },
    });
    title.anchor.set(0.5);
    title.position.set(w / 2, h / 2 - 210);
    c.addChild(title);

    SHOP_ITEMS.forEach((item, i) => {
      const unlocked = save.unlockedShop[item.id];
      const owned = save.shopOwned[item.id];
      const active = save.shopActive[item.id];
      const row = new Container();
      const focused = shopFocus === i;
      const g = new Graphics();
      g.roundRect(-280, -22, 560, 44, 4).fill(focused ? 0x283040 : 0x1a2030);
      g.roundRect(-280, -22, 560, 44, 4).stroke({ width: 1, color: focused ? 0x88aacc : 0x334455 });
      const label = unlocked
        ? `${item.name} — ${item.desc}  [${owned ? (active ? "ON" : "OFF") : `${item.cost}g`}]`
        : `${item.name} — locked (collect ${item.unlockGold} lifetime gold)`;
      const t = new Text({
        text: label,
        style: { fill: unlocked ? 0xccddee : 0x556677, fontSize: 13, fontFamily: "monospace" },
      });
      t.anchor.set(0, 0.5);
      t.x = -260;
      row.addChild(g, t);
      row.position.set(w / 2, h / 2 - 140 + i * 52);
      row.eventMode = "static";
      row.cursor = unlocked ? "pointer" : "default";
      row.on("pointertap", () => {
        if (!unlocked) return;
        if (!save.shopOwned[item.id]) {
          if (save.totalGold >= item.cost) {
            save.totalGold -= item.cost;
            save.shopOwned[item.id] = true;
            save.shopActive[item.id] = true;
            saveGame(save);
          }
        } else {
          save.shopActive[item.id] = !save.shopActive[item.id];
          saveGame(save);
        }
        layoutOverlay();
      });
      c.addChild(row);
    });

    const back = menuBtn("BACK", () => {
      phase = "mainMenu";
      layoutOverlay();
    });
    back.position.set(w / 2, h / 2 + 210);
    c.addChild(back);
    return c;
  }

  function buildPauseMenu(w: number, h: number): Container {
    const c = panelBg(w, h, 440, 380);
    const title = new Text({
      text: "PAUSED",
      style: { fill: 0xffcc44, fontSize: 32, fontFamily: "monospace", fontWeight: "bold", letterSpacing: 3 },
    });
    title.anchor.set(0.5);
    title.position.set(w / 2, h / 2 - 150);
    c.addChild(title);

    const stats = new Text({
      text:
        `${character.name}  ·  Lv ${playerLevel}  ·  Wave ${wave}\n` +
        `${formatTime(gameTime)}  ·  ${kills} kills  ·  ${runGold} gold`,
      style: {
        fill: 0x8899aa,
        fontSize: 14,
        fontFamily: "monospace",
        align: "center",
        lineHeight: 22,
      },
    });
    stats.anchor.set(0.5);
    stats.position.set(w / 2, h / 2 - 105);
    c.addChild(stats);

    const items = [
      { label: "RESUME", action: resumeFromPause },
      { label: "RESTART", action: restartFromPause },
      { label: "MAIN MENU", action: quitToMainMenu },
    ];
    items.forEach((item, i) => {
      const btn = menuBtn(item.label, item.action, pauseMenuFocus === i);
      btn.position.set(w / 2, h / 2 - 30 + i * 58);
      c.addChild(btn);
    });

    const hint = new Text({
      text: "↑↓ navigate  ·  Enter select  ·  Esc resume",
      style: { fill: 0x556677, fontSize: 12, fontFamily: "monospace" },
    });
    hint.anchor.set(0.5);
    hint.position.set(w / 2, h / 2 + 155);
    c.addChild(hint);

    return c;
  }

  function buildGameOver(w: number, h: number): Container {
    const c = panelBg(w, h, 520, 360);
    const title = new Text({
      text: "GAME OVER",
      style: { fill: 0xff5544, fontSize: 36, fontFamily: "monospace", fontWeight: "bold" },
    });
    title.anchor.set(0.5);
    title.position.set(w / 2, h / 2 - 120);
    const statsText = new Text({
      text:
        `Time survived: ${formatTime(gameTime)}\n` +
        `Kills: ${kills}\n` +
        `Gold earned: ${runGold}\n` +
        `Level reached: ${playerLevel}`,
      style: { fill: 0xccddee, fontSize: 18, fontFamily: "monospace", align: "center", lineHeight: 28 },
    });
    statsText.anchor.set(0.5);
    statsText.position.set(w / 2, h / 2 - 20);
    c.addChild(title, statsText);
    const again = menuBtn("PLAY AGAIN", () => {
      phase = "characterSelect";
      layoutOverlay();
    }, true);
    again.position.set(w / 2, h / 2 + 80);
    const menu = menuBtn("MAIN MENU", () => {
      phase = "mainMenu";
      clearEntities();
      layoutOverlay();
    });
    menu.position.set(w / 2, h / 2 + 138);
    c.addChild(again, menu);
    return c;
  }

  function handleMenuInput() {
    if (phase === "mainMenu") {
      if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
        menuFocus = (menuFocus + 2) % 3;
        layoutOverlay();
      }
      if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
        menuFocus = (menuFocus + 1) % 3;
        layoutOverlay();
      }
      if (input.pressed("Enter") || input.pressed("Space")) {
        if (menuFocus === 0) phase = "characterSelect";
        else if (menuFocus === 1) {
          phase = "shop";
          shopFocus = 0;
        } else phase = "help";
        layoutOverlay();
      }
    } else if (phase === "characterSelect") {
      if (input.pressed("ArrowLeft") || input.pressed("KeyA")) {
        charFocus = (charFocus + 3) % 4;
        layoutOverlay();
      }
      if (input.pressed("ArrowRight") || input.pressed("KeyD")) {
        charFocus = (charFocus + 1) % 4;
        layoutOverlay();
      }
      if (input.pressed("Enter") || input.pressed("Space")) {
        resetRun(CHARACTERS[charFocus].id);
        phase = "playing";
        layoutOverlay();
      }
      if (input.pressed("Escape")) {
        phase = "mainMenu";
        layoutOverlay();
      }
    } else if (phase === "levelUp") {
      if (input.pressed("ArrowLeft") || input.pressed("KeyA")) {
        levelUpFocus = (levelUpFocus + 2) % 3;
        levelUpPanel.refresh(app.screen.width, app.screen.height);
      }
      if (input.pressed("ArrowRight") || input.pressed("KeyD")) {
        levelUpFocus = (levelUpFocus + 1) % 3;
        levelUpPanel.refresh(app.screen.width, app.screen.height);
      }
      if (input.pressed("Enter") || input.pressed("Space")) {
        applyUpgrade(levelUpChoices[levelUpFocus]);
      }
      if (input.pressed("Digit1")) applyUpgrade(levelUpChoices[0]);
      if (input.pressed("Digit2")) applyUpgrade(levelUpChoices[1]);
      if (input.pressed("Digit3")) applyUpgrade(levelUpChoices[2]);
    } else if (phase === "paused") {
      if (input.pressed("Escape")) {
        resumeFromPause();
        return;
      }
      if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
        pauseMenuFocus = (pauseMenuFocus + 2) % 3;
        layoutOverlay();
      }
      if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
        pauseMenuFocus = (pauseMenuFocus + 1) % 3;
        layoutOverlay();
      }
      if (input.pressed("Enter") || input.pressed("Space")) {
        if (pauseMenuFocus === 0) resumeFromPause();
        else if (pauseMenuFocus === 1) restartFromPause();
        else quitToMainMenu();
      }
    } else if (phase === "shop" || phase === "help" || phase === "gameOver") {
      if (input.pressed("Escape") || input.pressed("Enter")) {
        phase = phase === "gameOver" ? "characterSelect" : "mainMenu";
        layoutOverlay();
      }
      if (phase === "shop") {
        if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
          shopFocus = (shopFocus + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length;
          layoutOverlay();
        }
        if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
          shopFocus = (shopFocus + 1) % SHOP_ITEMS.length;
          layoutOverlay();
        }
        if (input.pressed("Enter") || input.pressed("Space")) {
          const item = SHOP_ITEMS[shopFocus];
          if (save.unlockedShop[item.id]) {
            if (!save.shopOwned[item.id]) {
              if (save.totalGold >= item.cost) {
                save.totalGold -= item.cost;
                save.shopOwned[item.id] = true;
                save.shopActive[item.id] = true;
                saveGame(save);
              }
            } else {
              save.shopActive[item.id] = !save.shopActive[item.id];
              saveGame(save);
            }
            layoutOverlay();
          }
        }
      }
    }
  }

  drawFloor();
  layoutUi();
  layoutOverlay();
  updateHudDisplay();

  app.renderer.on("resize", () => {
    layoutUi();
    layoutOverlay();
  });

  app.ticker.add((ticker: Ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    handleMenuInput();

    if (phase === "playing") updatePlaying(dt);
    else if (phase === "levelUp") {
      updateCamera();
      updateHudDisplay();
    }

    input.flush();
  });
}

function buildHud(parent: Container) {
  const root = new Container();
  parent.addChild(root);

  const hpBar = new Graphics();
  const xpBar = new Graphics();
  const hpText = new Text({
    text: "",
    style: { fill: 0xff8899, fontSize: 11, fontFamily: "monospace" },
  });
  const xpText = new Text({
    text: "",
    style: { fill: 0x88bbff, fontSize: 11, fontFamily: "monospace" },
  });
  const info = new Text({
    text: "",
    style: { fill: 0xffffff, fontSize: 14, fontFamily: "monospace" },
  });

  const skillsRoot = new Container();
  const SLOT_W = 108;
  const SLOT_H = 56;
  const SLOT_GAP = 8;

  const skillSlots = [0, 1].map(() => {
    const slot = new Container();
    const bg = new Graphics();
    const ring = new Graphics();
    const name = new Text({
      text: "",
      style: {
        fill: 0xffffff,
        fontSize: 11,
        fontFamily: "monospace",
        fontWeight: "bold",
        align: "center",
        wordWrap: true,
        wordWrapWidth: SLOT_W - 36,
      },
    });
    const cd = new Text({
      text: "",
      style: { fill: 0xaabbcc, fontSize: 11, fontFamily: "monospace" },
    });
    name.anchor.set(0.5, 0);
    cd.anchor.set(0.5, 0);
    slot.addChild(bg, ring, name, cd);
    skillsRoot.addChild(slot);
    return { slot, bg, ring, name, cd };
  });

  root.addChild(hpBar, xpBar, hpText, xpText, info, skillsRoot);

  function drawSkillSlot(
    g: Graphics,
    ready: boolean,
  ) {
    g.clear();
    g.roundRect(0, 0, SLOT_W, SLOT_H, 6).fill(ready ? 0x243040 : 0x1a2030);
    g.roundRect(0, 0, SLOT_W, SLOT_H, 6).stroke({
      width: 2,
      color: ready ? 0x66cc88 : 0x445566,
    });
  }

  function drawSkillRing(
    g: Graphics,
    ratio: number,
    ready: boolean,
  ) {
    g.clear();
    const cx = SLOT_W - 16;
    const cy = SLOT_H / 2;
    const r = 12;
    g.circle(cx, cy, r).stroke({ width: 3, color: 0x333344 });
    if (!ready && ratio < 1) {
      g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - ratio))
        .stroke({ width: 3, color: 0x4488ff });
    } else if (ready) {
      g.circle(cx, cy, r).stroke({ width: 3, color: 0x66cc88 });
    }
  }

  return {
    root,
    layout(w: number, h: number) {
      info.position.set(16, 16);
      hpBar.position.set(16, 38);
      xpBar.position.set(16, 56);
      hpText.position.set(222, 38);
      xpText.position.set(222, 56);

      const totalW = SLOT_W * 2 + SLOT_GAP;
      skillsRoot.position.set(w - totalW - 16, h - SLOT_H - 16);
      skillSlots[0].slot.position.set(0, 0);
      skillSlots[1].slot.position.set(SLOT_W + SLOT_GAP, 0);
    },
    update(opts: {
      hp: number;
      maxHp: number;
      xp: number;
      xpMax: number;
      level: number;
      wave: number;
      time: string;
      gold: number;
      totalGold: number;
      skillQ: number;
      skillR: number;
      skillQName: string;
      skillRName: string;
      skillQMax: number;
      skillRMax: number;
      kills: number;
      visible: boolean;
    }) {
      root.visible = opts.visible;
      if (!opts.visible) return;

      hpBar.clear();
      hpBar.roundRect(0, 0, 200, 12, 2).fill(0x222830);
      hpBar.roundRect(0, 0, 200 * (opts.hp / opts.maxHp), 12, 2).fill(0xee4455);

      xpBar.clear();
      xpBar.roundRect(0, 0, 200, 8, 2).fill(0x222830);
      xpBar.roundRect(0, 0, 200 * (opts.xp / opts.xpMax), 8, 2).fill(0x4488ff);

      hpText.text = `${Math.ceil(opts.hp)} / ${Math.ceil(opts.maxHp)} HP`;
      xpText.text = `${Math.floor(opts.xp)} / ${opts.xpMax} XP`;

      info.text =
        `Lv ${opts.level}  Wave ${opts.wave}  ${opts.time}  Kills ${opts.kills}  Gold ${opts.gold}`;

      const skillData = [
        {
          name: opts.skillQName,
          cd: opts.skillQ,
          max: opts.skillQMax,
        },
        {
          name: opts.skillRName,
          cd: opts.skillR,
          max: opts.skillRMax,
        },
      ];

      skillSlots.forEach((ui, i) => {
        const data = skillData[i];
        const ready = data.cd <= 0;
        const ratio = data.max > 0 ? Math.min(1, data.cd / data.max) : 0;
        drawSkillSlot(ui.bg, ready);
        drawSkillRing(ui.ring, ratio, ready);
        ui.name.text = data.name;
        ui.name.position.set(SLOT_W / 2, 10);
        ui.cd.text = ready ? "READY" : `${data.cd.toFixed(1)}s`;
        ui.cd.style.fill = ready ? 0x66cc88 : 0x8899aa;
        ui.cd.position.set(SLOT_W / 2, 30);
      });
    },
  };
}

function createLevelUpPanel(opts: {
  onPick: (id: UpgradeId) => void;
  getChoices: () => UpgradeId[];
  getFocus: () => number;
  getLevel: () => number;
  getUpgradeLevels: () => Partial<Record<UpgradeId, number>>;
}) {
  const root = new Container();
  root.visible = false;

  const dim = new Graphics();
  const box = new Graphics();
  const title = new Text({
    text: "",
    style: {
      fill: 0xffcc44,
      fontSize: 28,
      fontFamily: "monospace",
      fontWeight: "bold",
    },
  });
  title.anchor.set(0.5);

  const cards = [0, 1, 2].map(() => {
    const slot = new Container();
    slot.eventMode = "static";
    slot.cursor = "pointer";
    const bg = new Graphics();
    const icon = new Text({
      text: "",
      style: { fill: 0xffcc44, fontSize: 32, fontFamily: "monospace" },
    });
    icon.anchor.set(0.5);
    icon.y = -30;
    const name = new Text({
      text: "",
      style: {
        fill: 0xffffff,
        fontSize: 16,
        fontFamily: "monospace",
        fontWeight: "bold",
      },
    });
    name.anchor.set(0.5);
    name.y = 5;
    const desc = new Text({
      text: "",
      style: {
        fill: 0x8899aa,
        fontSize: 12,
        fontFamily: "monospace",
        align: "center",
        lineHeight: 16,
      },
    });
    desc.anchor.set(0.5);
    desc.y = 40;
    slot.addChild(bg, icon, name, desc);
    return { slot, bg, icon, name, desc, pickId: null as UpgradeId | null };
  });

  cards.forEach((card) => {
    card.slot.on("pointertap", () => {
      if (card.pickId) opts.onPick(card.pickId);
    });
  });

  root.addChild(dim, box, title, ...cards.map((c) => c.slot));

  return {
    root,
    show() {
      root.visible = true;
    },
    hide() {
      root.visible = false;
    },
    refresh(w: number, h: number) {
      dim.clear().rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.55 });

      box.clear();
      box.roundRect(w / 2 - 340, h / 2 - 160, 680, 320, 8).fill(0x1a2030);
      box
        .roundRect(w / 2 - 340, h / 2 - 160, 680, 320, 8)
        .stroke({ width: 2, color: 0x445566 });

      title.text = `LEVEL UP! — Level ${opts.getLevel()}`;
      title.position.set(w / 2, h / 2 - 120);

      const choices = opts.getChoices();
      const focus = opts.getFocus();
      const levels = opts.getUpgradeLevels();

      cards.forEach((card, i) => {
        const id = choices[i];
        if (!id) {
          card.slot.visible = false;
          card.pickId = null;
          return;
        }

        card.slot.visible = true;
        card.pickId = id;
        const up = UPGRADES.find((u) => u.id === id)!;
        const lvl = levels[id] ?? 0;
        const focused = focus === i;

        card.bg.clear();
        card.bg
          .roundRect(-100, -70, 200, 140, 6)
          .fill(focused ? 0x283848 : 0x1a2430);
        card.bg
          .roundRect(-100, -70, 200, 140, 6)
          .stroke({ width: 2, color: focused ? 0x88ccff : 0x445566 });

        card.icon.text = up.icon;
        card.name.text = up.name;
        card.desc.text = `${up.desc}\n(Lv ${lvl})`;
        card.slot.position.set(w / 2 - 220 + i * 220, h / 2 + 10);
      });
    },
  };
}
