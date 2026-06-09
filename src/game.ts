import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Text,
  type Ticker,
} from "pixi.js";
import {
  CHARACTERS,
  ENEMY_DEFS,
  SHOP_ITEMS,
  UPGRADES,
  computeStats,
  defaultRunShopBuffs,
  DIFFICULTIES,
  MAPS,
  getCharacter,
  getDifficulty,
  getMap,
  pickWeightedEnemy,
  spawnBatchForWave,
  spawnIntervalForWave,
  waveEnemyHpBonus,
  type AppliedStats,
  type AttackKind,
  type CharacterDef,
  type CharacterId,
  type DifficultyId,
  type MapId,
  type EnemyKind,
  type ShopItemId,
  type UpgradeId,
} from "./data";
import { Input, dist, formatTime, loadSave, pickRandom, saveGame, setClickHitArea } from "./util";
import { createGameHud, type HudSkillSlot } from "./uiHud";
import { createLevelUpPanel } from "./uiLevelUp";
import { drawMenuButtonBg, drawPanelFrame, drawUpgradeCardBg } from "./uiDraw";
import { bodyStyle, FONT, menuTitleStyle, titleStyle, UI } from "./uiTheme";
import { createMenuBackdrop } from "./menuBackdrop";
import {
  drawMeleeSlash,
  drawProjectileBody,
  paintTransientFx,
  spawnBoltFx,
  spawnFlurryFx,
  spawnHealAuraFx,
  spawnHitBurst,
  spawnMeteorFx,
  spawnMuzzleFlash,
  spawnNovaFx,
  spawnRainMarkerFx,
  spawnShockwaveFx,
  spawnSmokeFx,
  spawnWhirlFx,
  type TransientFx,
} from "./attackFx";
import {
  buildDeathScreen,
  buildDeathSummaryOverlay,
  type DeathScreenStats,
} from "./uiDeath";
import {
  buildStatisticsPanel,
  getStatDetailScrollMax,
  getStatScrollMax,
} from "./uiStatistics";
import { STAT_TABS, type StatTab } from "./statCatalog";
import { buildShopPanel } from "./uiShop";
import { buildPauseMenu } from "./uiPauseMenu";
import { drawMapPreview } from "./uiMapPreview";
import {
  buildMapTerrainStatic,
  createEmberVolcanoFeatures,
  createVoidRiftFeatures,
  CRYSTAL_BUFF,
  EMBER_VOLCANO_SPAWN_SEED,
  findTerrainPartners,
  getMapTerrain,
  getTombstoneGraves,
  isInteractiveTerrain,
  isRiftActive,
  relocateRift,
  relocateVolcano,
  refreshInteractiveTerrain,
  resolveTerrainCollision,
  RIFT_CONFIG,
  TERRAIN_INTERACT,
  VOLCANO_CONFIG,
  VOID_RIFT_SPAWN_SEED,
  type TerrainFeature,
} from "./mapTerrain";
import {
  getOrbiterConfig,
  OrbiterSystem,
  SKILL_COOLDOWNS,
  type SkillUpgradeId,
} from "./bonusSkills";
import {
  createEnemyGraphic,
  getEnemyHealthBarWidth,
  getEnemySpawnDuration,
  getEnemyWobbleRate,
  getSpawnAnimation,
  loadEnemyAssets,
  updateEnemyAnimation,
  updateEnemyHealthBar,
} from "./enemies";

type Phase =
  | "mainMenu"
  | "characterSelect"
  | "playing"
  | "levelUp"
  | "paused"
  | "death"
  | "shop"
  | "statistics"
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
  container: Container;
  healthBar: Graphics;
  hitFlash: number;
  wobblePhase: number;
  spawnTimer: number;
  showHealthBar: boolean;
  orbiterHitCooldown: number;
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
  maxLife: number;
  gfx: Graphics;
  attackKind: AttackKind;
  angle: number;
  crit: boolean;
  spin: number;
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
const PLAYER_TERRAIN_RADIUS = 12;
const DASH_DURATION = 0.18;
const DASH_COOLDOWN = 1.0;
const DASH_SPEED = 420;
const DASH_IFRAMES = 0.22;
const ATTACK_SWING_DUR = 0.2;

export async function startGame(app: Application) {
  await loadEnemyAssets();

  const input = new Input();
  let save = loadSave();

  const root = new Container();
  app.stage.addChild(root);

  const world = new Container();
  const floor = new Graphics();
  const terrain = new Container();
  const terrainStatic = new Container();
  const terrainInteractive = new Container();
  terrain.addChild(terrainStatic, terrainInteractive);
  let terrainFeatures: TerrainFeature[] = getMapTerrain("graveyard");
  let terrainCooldowns: number[] = [];
  let terrainVolcanoBurstTimers: number[] = [];
  let volcanoLifetimeTimers: number[] = [];
  let volcanoRespawnTimers: number[] = [];
  let volcanoRespawnSeed = EMBER_VOLCANO_SPAWN_SEED + 200;
  let riftRespawnTimers: number[] = [];
  let riftRespawnSeed = VOID_RIFT_SPAWN_SEED + 200;
  let terrainAnimTime = 0;
  let terrainSpeedTimer = 0;
  const vignette = new Graphics();
  const ui = new Container();
  root.addChild(world, ui);

  let phase: Phase = "mainMenu";
  let charFocus = 0;
  let difficultyFocus = 1;
  let charSelectSection: "hero" | "difficulty" | "map" | "actions" = "hero";
  let charSelectActionFocus = 0;
  let activeDifficultyId: DifficultyId = "normal";
  let mapFocus = 0;
  let activeMapId: MapId = "graveyard";
  let menuFocus = 0;
  let statsScroll = 0;
  let statsTab: StatTab = "skills";
  let statsDetailIndex: number | null = null;
  let statsDetailScroll = 0;
  let deathSummaryActive = false;
  let lastDeathStats: DeathScreenStats | null = null;
  let shopFocus = 0;
  let runShopBuffs = defaultRunShopBuffs();
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
  let attackSwingTimer = 0;
  let attackSwingAngle = 0;
  let reviveLeft = 0;
  let upgradeLevels: Partial<Record<UpgradeId, number>> = {};

  let character: CharacterDef = getCharacter("mage");
  let stats: AppliedStats = computeStats(character, upgradeLevels, runShopBuffs);

  const playerGfx = new Container();
  const playerBody = new Graphics();
  playerGfx.addChild(playerBody);

  const enemies: Enemy[] = [];
  const projectiles: Projectile[] = [];
  const pickups: Pickup[] = [];
  const floatingNums: FloatingNum[] = [];
  const spawnRings: SpawnRingFx[] = [];
  const transientFx: TransientFx[] = [];
  let pendingHurtNumber = 0;
  let hurtNumberTimer = 0;
  const enemyLayer = new Container();
  const fxLayer = new Container();
  const pickupLayer = new Container();
  world.addChild(floor, terrain, enemyLayer, pickupLayer, fxLayer, playerGfx);
  const orbiterSystem = new OrbiterSystem(world);

  const bonusSkillCooldowns: Partial<
    Record<Exclude<SkillUpgradeId, "skill_orbit">, number>
  > = {};

  const hud = createGameHud();
  ui.addChild(hud.root);
  const overlay = new Container();
  ui.addChild(overlay);

  let levelUpPanel!: ReturnType<typeof createLevelUpPanel>;

  function skillLv(id: UpgradeId): number {
    return upgradeLevels[id] ?? 0;
  }

  function syncOrbiters() {
    orbiterSystem.setConfig(
      getOrbiterConfig(skillLv("skill_orbit"), stats.damageMult),
    );
  }

  function buildHudSkills(): HudSkillSlot[] {
    const skills: HudSkillSlot[] = [];
    if (skillLv("skill_orbit") > 0) {
      skills.push({ name: "Orbit", cd: 0, maxCd: 0, passive: true });
    }
    if (skillLv("skill_meteor") > 0) {
      const max = SKILL_COOLDOWNS.skill_meteor * stats.cooldownMult;
      skills.push({
        name: "Meteor",
        cd: bonusSkillCooldowns.skill_meteor ?? 0,
        maxCd: max,
      });
    }
    if (skillLv("skill_thunder") > 0) {
      const max = SKILL_COOLDOWNS.skill_thunder * stats.cooldownMult;
      skills.push({
        name: "Thunder",
        cd: bonusSkillCooldowns.skill_thunder ?? 0,
        maxCd: max,
      });
    }
    if (skillLv("skill_heal") > 0) {
      const max = SKILL_COOLDOWNS.skill_heal * stats.cooldownMult;
      skills.push({
        name: "Heal",
        cd: bonusSkillCooldowns.skill_heal ?? 0,
        maxCd: max,
      });
    }
    skills.push({
      name: character.skillQ.name,
      cd: skillQCooldown,
      maxCd: character.skillQ.cooldown * stats.cooldownMult,
    });
    skills.push({
      name: character.skillR.name,
      cd: skillRCooldown,
      maxCd: character.skillR.cooldown * stats.cooldownMult,
    });
    return skills;
  }

  function castMeteorShower(): boolean {
    const level = skillLv("skill_meteor");
    if (level <= 0) return false;
    const active = enemies.filter(
      (e) => isEnemyActive(e) && dist(playerX, playerY, e.x, e.y) <= 450,
    );
    if (active.length === 0) return false;

    for (let i = 0; i < level; i++) {
      const e = active[Math.floor(Math.random() * active.length)];
      addTransientFx(spawnMeteorFx(e.x, e.y));
      damageEnemy(e, 32 * stats.damageMult);
    }
    return true;
  }

  function castThunderStrike(): boolean {
    const level = skillLv("skill_thunder");
    if (level <= 0) return false;
    const target = findNearestEnemy(420);
    if (!target) return false;

    const dmg = (28 + level * 8) * stats.damageMult;
    addTransientFx(spawnBoltFx(playerX, playerY, target.x, target.y, 0x66ccff));
    damageEnemy(target, dmg);

    if (level >= 2) {
      let cx = target.x;
      let cy = target.y;
      const next = enemies
        .filter((e) => e !== target && isEnemyActive(e) && dist(cx, cy, e.x, e.y) < 140)
        .sort((a, b) => dist(cx, cy, a.x, a.y) - dist(cx, cy, b.x, b.y))[0];
      if (next) {
        addTransientFx(spawnBoltFx(cx, cy, next.x, next.y, 0xaaddff));
        damageEnemy(next, dmg * 0.65);
      }
    }
    return true;
  }

  function castHealingAura(): boolean {
    const level = skillLv("skill_heal");
    if (level <= 0) return false;
    const heal = 8 + level * 4;
    const actual = Math.min(heal, stats.maxHp - playerHp);
    playerHp = Math.min(stats.maxHp, playerHp + heal);
    if (actual > 0) {
      spawnFloatingNumber(playerX, playerY - 28, actual, "heal");
    }
    addTransientFx(
      spawnHealAuraFx(playerX, playerY, 55 + level * 8),
    );
    return true;
  }

  function useBonusSkills() {
    const casts: {
      id: Exclude<SkillUpgradeId, "skill_orbit">;
      fn: () => boolean;
    }[] = [
      { id: "skill_meteor", fn: castMeteorShower },
      { id: "skill_thunder", fn: castThunderStrike },
      { id: "skill_heal", fn: castHealingAura },
    ];

    for (const { id, fn } of casts) {
      if (skillLv(id) <= 0) continue;
      const cd = bonusSkillCooldowns[id] ?? 0;
      if (cd > 0) continue;
      if (fn()) {
        bonusSkillCooldowns[id] = SKILL_COOLDOWNS[id] * stats.cooldownMult;
      }
    }
  }

  function tickBonusSkillCooldowns(dt: number) {
    for (const id of ["skill_meteor", "skill_thunder", "skill_heal"] as const) {
      if (skillLv(id) <= 0) continue;
      if ((bonusSkillCooldowns[id] ?? 0) > 0) {
        bonusSkillCooldowns[id] = Math.max(0, (bonusSkillCooldowns[id] ?? 0) - dt);
      }
    }
  }

  function drawFloor() {
    floor.clear();
    const map = getActiveMap();
    terrainFeatures = getMapTerrain(activeMapId);
    if (activeMapId === "void") {
      terrainFeatures = [
        ...terrainFeatures,
        ...createVoidRiftFeatures(terrainFeatures, VOID_RIFT_SPAWN_SEED),
      ];
    } else if (activeMapId === "ember") {
      terrainFeatures = [
        ...terrainFeatures,
        ...createEmberVolcanoFeatures(terrainFeatures, EMBER_VOLCANO_SPAWN_SEED),
      ];
    }
    const tile = 64;
    for (let x = -ARENA; x <= ARENA; x += tile) {
      for (let y = -ARENA; y <= ARENA; y += tile) {
        const c = ((x / tile + y / tile) & 1) === 0 ? map.tileA : map.tileB;
        floor.rect(x, y, tile, tile).fill(c);
      }
    }
    floor.circle(0, 0, ARENA).stroke({ width: 6, color: map.borderColor, alpha: 0.6 });
    floor.circle(0, 0, ARENA - 4).stroke({ width: 2, color: map.accentColor, alpha: 0.25 });
    terrainCooldowns = terrainFeatures.map(() => 0);
    terrainVolcanoBurstTimers = terrainFeatures.map((f, i) =>
      f.kind === "volcano"
        ? VOLCANO_CONFIG.eruptInterval * (0.25 + (i % 7) * 0.1)
        : 0,
    );
    volcanoLifetimeTimers = terrainFeatures.map((f, i) =>
      f.kind === "volcano"
        ? VOLCANO_CONFIG.lifetime * (0.75 + (i % 5) * 0.12)
        : -1,
    );
    volcanoRespawnTimers = terrainFeatures.map((f) => (f.kind === "volcano" ? -1 : -1));
    volcanoRespawnSeed = EMBER_VOLCANO_SPAWN_SEED + 200;
    riftRespawnTimers = terrainFeatures.map((f) => (f.kind === "rift" ? 0 : -1));
    riftRespawnSeed = VOID_RIFT_SPAWN_SEED + 200;
    terrainAnimTime = 0;
    terrainSpeedTimer = 0;
    buildMapTerrainStatic(terrainStatic, map, terrainFeatures);
    refreshInteractiveTerrain(
      terrainInteractive,
      map,
      terrainFeatures,
      terrainCooldowns,
      terrainAnimTime,
    );
  }

  function refreshTerrainVisuals() {
    refreshInteractiveTerrain(
      terrainInteractive,
      getActiveMap(),
      terrainFeatures,
      terrainCooldowns,
      terrainAnimTime,
    );
  }

  function applyTerrainCollision(x: number, y: number, radius: number) {
    return resolveTerrainCollision(x, y, radius, terrainFeatures);
  }

  function triggerTerrainWarp(
    fromIdx: number,
    kind: "rift",
    color: number,
    label: string,
    iframe: number,
  ) {
    const partners = findTerrainPartners(terrainFeatures, fromIdx, kind);
    if (partners.length === 0) return;

    const from = terrainFeatures[fromIdx];
    const destIdx = partners[Math.floor(Math.random() * partners.length)];
    const dest = terrainFeatures[destIdx];

    addTransientFx(spawnNovaFx(from.x, from.y, 52, color, 0.45));
    playerX = dest.x;
    playerY = dest.y;
    const pushed = applyTerrainCollision(playerX, playerY, PLAYER_TERRAIN_RADIUS);
    playerX = pushed.x;
    playerY = pushed.y;
    playerGfx.position.set(playerX, playerY);
    invincible = Math.max(invincible, iframe);
    addTransientFx(spawnNovaFx(dest.x, dest.y, 64, color, 0.55));
    if (kind === "rift") {
      addTransientFx(spawnSmokeFx(dest.x, dest.y));
    }
    spawnFloatingLabel(dest.x, dest.y - 28, label, color);

    terrainFeatures[fromIdx].riftDormant = true;
    riftRespawnTimers[fromIdx] = RIFT_CONFIG.respawnDelay;
    terrainFeatures[destIdx].riftDormant = true;
    riftRespawnTimers[destIdx] = RIFT_CONFIG.respawnDelay;
  }

  function tickTerrainInteractions() {
    for (let i = 0; i < terrainFeatures.length; i++) {
      const f = terrainFeatures[i];
      if (!isInteractiveTerrain(f.kind)) continue;
      if ((terrainCooldowns[i] ?? 0) > 0) continue;

      const def = TERRAIN_INTERACT[f.kind];
      if (dist(playerX, playerY, f.x, f.y) > def.triggerRadius) continue;

      if (f.kind === "volcano") continue;
      if (f.kind === "rift" && !isRiftActive(f)) continue;

      if (f.kind === "crystal") {
        const before = playerHp;
        playerHp = Math.min(stats.maxHp, playerHp + CRYSTAL_BUFF.heal);
        const actual = playerHp - before;
        if (actual > 0) spawnFloatingNumber(playerX, playerY - 24, actual, "heal");
        terrainSpeedTimer = CRYSTAL_BUFF.duration;
        spawnFloatingLabel(playerX, playerY - 42, "CRYSTAL BUFF", 0x88ddff);
        addTransientFx(spawnHealAuraFx(playerX, playerY, 48));
        terrainCooldowns[i] = def.cooldown;
      } else if (f.kind === "rift") {
        triggerTerrainWarp(i, "rift", 0xaa66ff, "BLINK", 0.55);
      }
      break;
    }
  }

  function mapHasInteractiveTerrain(): boolean {
    return terrainFeatures.some((f) => isInteractiveTerrain(f.kind));
  }

  function tickRiftRespawns(dt: number) {
    for (let i = 0; i < terrainFeatures.length; i++) {
      const f = terrainFeatures[i];
      if (f.kind !== "rift" || !f.riftDormant) continue;
      if (riftRespawnTimers[i] <= 0) continue;

      riftRespawnTimers[i] -= dt;
      if (riftRespawnTimers[i] > 0) continue;

      const seed = riftRespawnSeed;
      riftRespawnSeed += 997;
      if (relocateRift(terrainFeatures, i, seed)) {
        addTransientFx(spawnNovaFx(f.x, f.y, 64, 0xaa66ff, 0.55));
        addTransientFx(spawnSmokeFx(f.x, f.y));
      } else {
        riftRespawnTimers[i] = 0.5;
      }
    }
  }

  function tickVolcanoes(dt: number) {
    for (let i = 0; i < terrainFeatures.length; i++) {
      const f = terrainFeatures[i];
      if (f.kind !== "volcano") continue;

      if (f.volcanoDormant) {
        if (volcanoRespawnTimers[i] <= 0) continue;
        volcanoRespawnTimers[i] -= dt;
        if (volcanoRespawnTimers[i] > 0) continue;

        const seed = volcanoRespawnSeed;
        volcanoRespawnSeed += 991;
        if (relocateVolcano(terrainFeatures, i, seed)) {
          volcanoLifetimeTimers[i] =
            VOLCANO_CONFIG.lifetime * (0.75 + (seed % 5) * 0.12);
          terrainVolcanoBurstTimers[i] =
            VOLCANO_CONFIG.eruptInterval * (0.25 + (seed % 7) * 0.1);
          addTransientFx(spawnNovaFx(f.x, f.y, 72, 0xff6622, 0.55));
          addTransientFx(spawnSmokeFx(f.x, f.y));
        } else {
          volcanoRespawnTimers[i] = 0.5;
        }
        continue;
      }

      volcanoLifetimeTimers[i] -= dt;
      if (volcanoLifetimeTimers[i] <= 0) {
        addTransientFx(spawnNovaFx(f.x, f.y, VOLCANO_CONFIG.radius, 0xff4422, 0.4));
        addTransientFx(spawnSmokeFx(f.x, f.y));
        f.volcanoDormant = true;
        volcanoRespawnTimers[i] = VOLCANO_CONFIG.respawnDelay;
        volcanoLifetimeTimers[i] = -1;
        continue;
      }

      terrainVolcanoBurstTimers[i] -= dt;
      if (terrainVolcanoBurstTimers[i] > 0) continue;

      terrainVolcanoBurstTimers[i] = VOLCANO_CONFIG.eruptInterval;
      addTransientFx(spawnNovaFx(f.x, f.y, VOLCANO_CONFIG.radius, 0xff6622));
      for (const e of enemies) {
        if (!isEnemyActive(e)) continue;
        if (dist(f.x, f.y, e.x, e.y) < VOLCANO_CONFIG.radius) {
          damageEnemy(e, VOLCANO_CONFIG.damage);
        }
      }
    }
  }

  function tickTerrainSystems(dt: number) {
    if (!mapHasInteractiveTerrain()) return;

    terrainAnimTime += dt;
    if (terrainSpeedTimer > 0) terrainSpeedTimer = Math.max(0, terrainSpeedTimer - dt);
    for (let i = 0; i < terrainCooldowns.length; i++) {
      if (terrainCooldowns[i] > 0) {
        terrainCooldowns[i] = Math.max(0, terrainCooldowns[i] - dt);
      }
    }
    tickVolcanoes(dt);
    tickRiftRespawns(dt);
    tickTerrainInteractions();
    refreshTerrainVisuals();
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
    const swingT =
      attackSwingTimer > 0 ? 1 - attackSwingTimer / ATTACK_SWING_DUR : 0;
    const recoil = Math.sin(swingT * Math.PI);
    const lx = Math.cos(attackSwingAngle) * recoil * 9;
    const ly = Math.sin(attackSwingAngle) * recoil * 9;
    playerBody.position.set(lx, ly);
    playerBody.scale.set(1 + recoil * 0.06, 1 - recoil * 0.03);

    const c = character.color;
    const a = character.accent;
    const ax = Math.cos(attackSwingAngle);
    const ay = Math.sin(attackSwingAngle);

    switch (character.id) {
      case "mage":
        playerBody.circle(0, -6, 10).fill(a);
        playerBody.roundRect(-8, -2, 16, 18, 3).fill(c);
        playerBody.moveTo(-14, 4).lineTo(-22, 16).stroke({ width: 3, color: 0x8844cc });
        playerBody.circle(-22, 16, 5).fill(0xff6622);
        if (recoil > 0.1) {
          playerBody
            .circle(ax * 18, ay * 18, 6 + recoil * 10)
            .fill({ color: 0xff6622, alpha: recoil * 0.45 });
        }
        break;
      case "knight":
        playerBody.roundRect(-12, -4, 24, 22, 2).fill(c);
        playerBody.roundRect(-8, -14, 16, 12, 2).fill(a);
        playerBody.rect(10, 0, 6, 18).fill(0x667788);
        playerBody.rect(8, 14, 10, 4).fill(0x8899aa);
        if (recoil > 0.05) {
          playerBody
            .moveTo(8, 4)
            .lineTo(8 + ax * (24 + recoil * 20), 4 + ay * (24 + recoil * 20))
            .stroke({ width: 4, color: a, alpha: 0.5 + recoil * 0.4 });
        }
        break;
      case "rogue":
        playerBody.circle(0, 2, 11).fill(c);
        playerBody.moveTo(-10, -8).lineTo(0, -16).lineTo(10, -8).closePath().fill(0x224433);
        playerBody.rect(-3, 8, 6, 10).fill(a);
        playerBody.circle(12, 6, 3).fill(0xcccccc);
        if (recoil > 0.05) {
          playerBody
            .moveTo(12, 6)
            .lineTo(12 + ax * (16 + recoil * 14), 6 + ay * (16 + recoil * 14))
            .stroke({ width: 2, color: 0xeeffcc, alpha: 0.6 + recoil * 0.35 });
        }
        break;
      case "archer":
        playerBody.roundRect(-7, -2, 14, 18, 2).fill(c);
        playerBody.circle(0, -10, 8).fill(a);
        playerBody.moveTo(8, 4).quadraticCurveTo(18, 0, 8, 14).stroke({ width: 2, color: 0x886644 });
        if (recoil > 0.05) {
          playerBody
            .moveTo(8, 4)
            .lineTo(8 + ax * 22, 4 + ay * 22)
            .stroke({ width: 2, color: 0xffeeaa, alpha: 0.5 + recoil * 0.45 });
        }
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

  function getActiveDifficulty() {
    return getDifficulty(activeDifficultyId);
  }

  function getActiveMap() {
    return getMap(activeMapId);
  }

  function startRun(charId: CharacterId) {
    resetRun(charId);
    phase = "playing";
    layoutOverlay();
  }

  function resetRun(charId: CharacterId) {
    activeCharacterId = charId;
    character = getCharacter(charId);
    upgradeLevels = {};
    stats = computeStats(character, upgradeLevels, runShopBuffs);
    reviveLeft = runShopBuffs.revive_token ? 1 : 0;
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
    attackSwingTimer = 0;
    Object.keys(bonusSkillCooldowns).forEach((k) => {
      delete bonusSkillCooldowns[k as Exclude<SkillUpgradeId, "skill_orbit">];
    });
    pendingHurtNumber = 0;
    hurtNumberTimer = 0;
    pendingLevelUps = 0;
    levelUpPanel?.hide();
    clearEntities();
    syncOrbiters();
    drawPlayerGraphic();
    playerGfx.position.set(0, 0);
  }

  function clearEntities() {
    for (const e of enemies) e.container.destroy();
    enemies.length = 0;
    for (const p of projectiles) p.gfx.destroy();
    projectiles.length = 0;
    for (const p of pickups) p.gfx.destroy();
    pickups.length = 0;
    for (const d of floatingNums) d.text.destroy();
    floatingNums.length = 0;
    for (const r of spawnRings) r.gfx.destroy();
    spawnRings.length = 0;
    for (const f of transientFx) f.gfx.destroy();
    transientFx.length = 0;
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

  function pickGraveSpawn(): { x: number; y: number } | null {
    const graves = getTombstoneGraves(terrainFeatures);
    if (graves.length === 0) return null;
    const grave = graves[Math.floor(Math.random() * graves.length)];
    const outX = Math.cos(grave.rot) * 10;
    const outY = Math.sin(grave.rot) * 10 + 16;
    return {
      x: grave.x + outX + (Math.random() - 0.5) * 10,
      y: grave.y + outY + Math.random() * 6,
    };
  }

  function addEnemy(kind: EnemyKind) {
    const base = ENEMY_DEFS[kind];
    const fromGrave = kind === "zombie" && activeMapId === "graveyard";
    const pos = fromGrave ? pickGraveSpawn() ?? spawnFromEdge() : spawnFromEdge();
    const diff = getActiveDifficulty();
    const maxHp = Math.round((base.hp + waveEnemyHpBonus(wave, kind)) * diff.enemyHpMult);
    const { container, healthBar } = createEnemyGraphic(kind);
    container.position.set(pos.x, pos.y);
    const barW = getEnemyHealthBarWidth(kind);
    const showHealthBar = kind === "brute";
    updateEnemyHealthBar(healthBar, maxHp, maxHp, barW, kind, showHealthBar, 0);
    enemyLayer.addChild(container);
    if (fromGrave) {
      addTransientFx(spawnNovaFx(pos.x, pos.y - 6, 42, 0x665544, 0.42));
      addTransientFx(spawnSmokeFx(pos.x, pos.y));
      spawnEnemyRing(pos.x, pos.y, base.radius, 0x778866);
    } else {
      spawnEnemyRing(pos.x, pos.y, base.radius, base.tint);
    }

    enemies.push({
      kind,
      x: pos.x,
      y: pos.y,
      hp: maxHp,
      maxHp,
      speed: (base.speed + wave * 1.2) * diff.enemySpeedMult,
      radius: base.radius,
      damage: (base.damage + Math.floor(wave / 8)) * diff.enemyDamageMult,
      xp: Math.round(base.xp * diff.rewardMult),
      gold: Math.round(base.gold * diff.rewardMult),
      container,
      healthBar,
      hitFlash: 0,
      wobblePhase: Math.random() * Math.PI * 2,
      spawnTimer: getEnemySpawnDuration(kind),
      showHealthBar,
      orbiterHitCooldown: 0,
    });
  }

  function isEnemyActive(e: Enemy): boolean {
    return e.spawnTimer <= 0;
  }

  function findNearestEnemy(maxRange = Infinity): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxRange;
    for (const e of enemies) {
      if (!isEnemyActive(e)) continue;
      const d = dist(playerX, playerY, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  function hasEnemyInRange(range: number): boolean {
    return findNearestEnemy(range) !== null;
  }

  function spawnFloatingLabel(x: number, y: number, label: string, fill: number) {
    const text = new Text({
      text: label,
      style: {
        fill,
        fontSize: 14,
        fontFamily: FONT,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 },
      },
    });
    text.anchor.set(0.5);
    text.position.set(x, y);
    floatingNums.push({ x, y, vy: -52, life: 0.9, text });
    world.addChild(text);
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
    e.showHealthBar = true;
    spawnFloatingNumber(e.x, e.y, amount, crit ? "crit" : "damage");
    addTransientFx(spawnHitBurst(e.x, e.y, character.accent, crit));
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
    e.container.destroy();
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

  function addTransientFx(opts: Omit<TransientFx, "gfx">) {
    const gfx = new Graphics();
    gfx.position.set(opts.x, opts.y);
    fxLayer.addChild(gfx);
    const fx: TransientFx = { ...opts, gfx };
    paintTransientFx(fx);
    transientFx.push(fx);
  }

  function triggerAttackSwing(angle: number) {
    attackSwingTimer = ATTACK_SWING_DUR;
    attackSwingAngle = angle;
  }

  function addProjectile(
    opts: Omit<Projectile, "gfx" | "maxLife" | "spin" | "life"> & {
      life?: number;
      maxLife?: number;
      spin?: number;
    },
  ) {
    const gfx = new Graphics();
    const maxLife = opts.maxLife ?? opts.life ?? 2.5;
    const life = opts.life ?? maxLife;
    const spin = opts.spin ?? 0;
    const attackKind = opts.attackKind;

    if (opts.isMelee) {
      gfx.position.set(opts.x, opts.y);
      gfx.rotation = opts.angle;
      drawMeleeSlash(gfx, opts.radius, opts.color, 0, 0);
    } else {
      drawProjectileBody(gfx, attackKind, opts.radius, opts.color, spin, 0.5);
      gfx.position.set(opts.x, opts.y);
      if (attackKind !== "knife") {
        gfx.rotation = Math.atan2(opts.vy, opts.vx);
      }
    }

    fxLayer.addChild(gfx);
    projectiles.push({
      ...opts,
      life,
      maxLife,
      spin,
      gfx,
    });
  }

  function rollDamage(base: number): { amount: number; crit: boolean } {
    const crit = Math.random() < stats.critChance;
    return { amount: base * (crit ? 2 : 1), crit };
  }

  function autoAttack(): boolean {
    const attackRange = stats.areaMult * character.range;
    const target = findNearestEnemy(attackRange);
    if (!target) return false;

    const baseDmg = character.damage * stats.damageMult;
    const angle = Math.atan2(target.y - playerY, target.x - playerX);
    const count = stats.multishot;
    const spread = count > 1 ? 0.25 : 0;
    triggerAttackSwing(angle);

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
        attackKind: "melee",
        angle,
        crit,
        isMelee: true,
        life: 0.18,
        maxLife: 0.18,
      });
      addTransientFx(
        spawnMuzzleFlash(playerX, playerY, angle, character.accent, "melee"),
      );
      for (const e of enemies) {
        if (!isEnemyActive(e)) continue;
        const d = dist(playerX, playerY, e.x, e.y);
        if (d <= character.range * stats.areaMult) {
          const aToEnemy = Math.atan2(e.y - playerY, e.x - playerX);
          let diff = Math.abs(aToEnemy - angle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 1.2) damageEnemy(e, amount, crit);
        }
      }
      return true;
    }

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
      const a = angle + t;
      const { amount, crit } = rollDamage(baseDmg);
      const speed = character.projectileSpeed;
      const color =
        character.attackKind === "magic"
          ? 0xff8844
          : character.attackKind === "knife"
            ? 0xaaffcc
            : 0xffeeaa;
      addProjectile({
        x: playerX + Math.cos(a) * 14,
        y: playerY + Math.sin(a) * 14,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        damage: amount,
        pierceLeft: stats.pierce,
        radius: character.attackKind === "magic" ? 8 * stats.areaMult : 5,
        color,
        attackKind: character.attackKind,
        angle: a,
        crit,
      });
      if (i === 0) {
        addTransientFx(spawnMuzzleFlash(playerX, playerY, a, color, character.attackKind));
      }
    }
    return true;
  }

  function canCastSkillQ(): boolean {
    switch (character.id) {
      case "mage":
        return hasEnemyInRange(160 * stats.areaMult);
      case "knight":
        return hasEnemyInRange(100);
      case "rogue":
        return true;
      case "archer":
        return hasEnemyInRange(400);
      default:
        return false;
    }
  }

  function canCastSkillR(): boolean {
    switch (character.id) {
      case "mage":
        return hasEnemyInRange(500);
      case "knight":
        return hasEnemyInRange(110 * stats.areaMult);
      case "rogue":
        return hasEnemyInRange(320);
      case "archer":
        return hasEnemyInRange(280);
      default:
        return false;
    }
  }

  function useSkillQ() {
    if (skillQCooldown > 0) return;
    if (!canCastSkillQ()) return;
    skillQCooldown = character.skillQ.cooldown * stats.cooldownMult;

    switch (character.id) {
      case "mage": {
        const novaR = 160 * stats.areaMult;
        addTransientFx(spawnNovaFx(playerX, playerY, novaR, 0xff6622));
        for (const e of [...enemies]) {
          if (!isEnemyActive(e)) continue;
          if (dist(playerX, playerY, e.x, e.y) < novaR) {
            damageEnemy(e, 45 * stats.damageMult);
          }
        }
        break;
      }
      case "knight": {
        const target = findNearestEnemy(120);
        const angle = target
          ? Math.atan2(target.y - playerY, target.x - playerX)
          : 0;
        triggerAttackSwing(angle);
        addTransientFx(spawnShockwaveFx(playerX, playerY, angle, 100, 0x88aacc));
        addTransientFx(spawnMuzzleFlash(playerX, playerY, angle, 0x88aacc, "melee"));
        for (const e of enemies) {
          if (!isEnemyActive(e)) continue;
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
        addTransientFx(spawnSmokeFx(playerX, playerY));
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
            attackKind: "arrow",
            angle: a,
            crit: false,
          });
        }
        triggerAttackSwing(angle);
        addTransientFx(spawnNovaFx(playerX, playerY, 48, 0xffcc44, 0.28));
        addTransientFx(spawnMuzzleFlash(playerX, playerY, angle, 0xffcc44, "arrow"));
        break;
      }
    }
  }

  function useSkillR() {
    if (skillRCooldown > 0) return;
    if (!canCastSkillR()) return;
    skillRCooldown = character.skillR.cooldown * stats.cooldownMult;

    switch (character.id) {
      case "mage": {
        let remaining = 5;
        let from = findNearestEnemy(500);
        if (!from) break;
        let cx = playerX;
        let cy = playerY;
        addTransientFx(spawnBoltFx(cx, cy, from.x, from.y, 0x66ccff));
        damageEnemy(from, 26 * stats.damageMult);
        remaining--;
        cx = from.x;
        cy = from.y;
        while (remaining > 0) {
          const next = enemies
            .filter((e) => isEnemyActive(e) && dist(cx, cy, e.x, e.y) < 180)
            .sort((a, b) => dist(cx, cy, a.x, a.y) - dist(cx, cy, b.x, b.y))[0];
          if (!next) break;
          addTransientFx(spawnBoltFx(cx, cy, next.x, next.y, 0x66ccff));
          damageEnemy(next, 18 * stats.damageMult);
          cx = next.x;
          cy = next.y;
          remaining--;
        }
        break;
      }
      case "knight": {
        const whirlR = 110 * stats.areaMult;
        addTransientFx(spawnWhirlFx(playerX, playerY, whirlR, 0xddddff));
        for (const e of [...enemies]) {
          if (!isEnemyActive(e)) continue;
          if (dist(playerX, playerY, e.x, e.y) < whirlR) {
            damageEnemy(e, 28 * stats.damageMult);
          }
        }
        break;
      }
      case "rogue":
        addTransientFx(spawnFlurryFx(playerX, playerY, 0x44ff88));
        triggerAttackSwing(0);
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
            attackKind: "knife",
            angle: a,
            crit: false,
          });
        }
        break;
      case "archer":
        for (const e of [...enemies]) {
          if (!isEnemyActive(e)) continue;
          if (dist(playerX, playerY, e.x, e.y) < 280) {
            addTransientFx(spawnRainMarkerFx(e.x, e.y));
            addProjectile({
              x: e.x,
              y: e.y - 200,
              vx: 0,
              vy: 500,
              damage: 32 * stats.damageMult,
              pierceLeft: 0,
              radius: 6,
              color: 0xff8844,
              attackKind: "arrow",
              angle: Math.PI / 2,
              crit: false,
              life: 1.2,
              maxLife: 1.2,
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
    const prev = upgradeLevels[id] ?? 0;
    upgradeLevels[id] = prev + 1;
    stats = computeStats(character, upgradeLevels, runShopBuffs);
    playerHp = Math.min(stats.maxHp, playerHp);
    if (
      prev === 0 &&
      (id === "skill_meteor" || id === "skill_thunder" || id === "skill_heal")
    ) {
      bonusSkillCooldowns[id] = 0;
    }
    syncOrbiters();
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

  function getDeathStats(): DeathScreenStats {
    return {
      heroName: character.name,
      time: formatTime(gameTime),
      kills,
      gold: runGold,
      level: playerLevel,
      wave,
    };
  }

  function clearRunShopBuffs() {
    runShopBuffs = defaultRunShopBuffs();
  }

  function buyShopItem(id: ShopItemId) {
    const item = SHOP_ITEMS.find((s) => s.id === id);
    if (!item || !save.unlockedShop[id] || runShopBuffs[id]) return;
    if (save.totalGold < item.cost) return;
    save.totalGold -= item.cost;
    runShopBuffs[id] = true;
    saveGame(save);
    layoutOverlay();
  }

  function finishDeathAndGoHome() {
    lastDeathStats = getDeathStats();
    clearRunShopBuffs();
    clearEntities();
    phase = "mainMenu";
    deathSummaryActive = true;
    menuFocus = 0;
    layoutOverlay();
  }

  function dismissDeathSummary() {
    deathSummaryActive = false;
    lastDeathStats = null;
    layoutOverlay();
  }

  function endRun() {
    phase = "death";
    saveRunProgress();
    updateCamera();
    layoutOverlay();
    updateHudDisplay();
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
    clearRunShopBuffs();
    phase = "mainMenu";
    deathSummaryActive = false;
    lastDeathStats = null;
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
      let speed = stats.speed;
      if (smokeTimer > 0) speed *= 1.35;
      if (terrainSpeedTimer > 0) speed *= CRYSTAL_BUFF.speedMult;
      playerX += move.x * speed * dt;
      playerY += move.y * speed * dt;
    }
    clampPlayer();
    const playerPos = applyTerrainCollision(playerX, playerY, PLAYER_TERRAIN_RADIUS);
    playerX = playerPos.x;
    playerY = playerPos.y;
    playerGfx.position.set(playerX, playerY);

    if (dashCooldown > 0) dashCooldown -= dt;
    if (skillQCooldown > 0) skillQCooldown -= dt;
    else useSkillQ();
    if (skillRCooldown > 0) skillRCooldown -= dt;
    else useSkillR();
    tickBonusSkillCooldowns(dt);
    useBonusSkills();
    if (invincible > 0) invincible -= dt;
    if (smokeTimer > 0) smokeTimer -= dt;
    if (attackSwingTimer > 0) attackSwingTimer -= dt;
    tickTerrainSystems(dt);
    if (playerHp < stats.maxHp) playerHp = Math.min(stats.maxHp, playerHp + stats.regen * dt);

    attackTimer -= dt;
    if (attackTimer <= 0) {
      if (autoAttack()) {
        const attackMult =
          stats.attackRateMult *
          (terrainSpeedTimer > 0 ? CRYSTAL_BUFF.attackRateMult : 1);
        attackTimer = 1 / (character.attackRate * attackMult);
      } else {
        attackTimer = 0.12;
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const diff = getActiveDifficulty();
      const batch = spawnBatchForWave(wave, diff, activeMapId);
      for (let i = 0; i < batch; i++) addEnemy(pickWeightedEnemy(wave, activeMapId));
      spawnTimer = spawnIntervalForWave(wave, diff, activeMapId);
    }

    for (const e of enemies) {
      const dx = playerX - e.x;
      const dy = playerY - e.y;
      const len = Math.hypot(dx, dy) || 1;
      const moveAngle = Math.atan2(dy, dx);
      const moving = len > 8 && e.spawnTimer <= 0;

      const spawn =
        e.spawnTimer > 0 ? getSpawnAnimation(e.kind, e.spawnTimer) : null;
      const moveScale = spawn ? spawn.progress * spawn.progress : 1;

      e.x += (dx / len) * e.speed * dt * moveScale;
      e.y += (dy / len) * e.speed * dt * moveScale;
      if (e.spawnTimer <= 0) {
        const pushed = applyTerrainCollision(e.x, e.y, e.radius);
        e.x = pushed.x;
        e.y = pushed.y;
      }
      if (e.spawnTimer > 0) e.spawnTimer -= dt;

      e.wobblePhase += dt * getEnemyWobbleRate(e.kind);
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.orbiterHitCooldown > 0) e.orbiterHitCooldown -= dt;

      e.container.position.set(e.x, e.y);
      updateEnemyAnimation(
        e.kind,
        e.container,
        e.wobblePhase,
        moveAngle,
        moving,
        e.hitFlash,
        e.spawnTimer,
      );

      const spawnUi =
        e.spawnTimer > 0 ? getSpawnAnimation(e.kind, e.spawnTimer) : null;
      updateEnemyHealthBar(
        e.healthBar,
        e.hp,
        e.maxHp,
        getEnemyHealthBarWidth(e.kind),
        e.kind,
        e.showHealthBar && (!spawnUi || spawnUi.progress > 0.35),
        e.wobblePhase,
      );
      if (spawnUi) e.healthBar.alpha = spawnUi.alpha;

      if (
        e.spawnTimer <= 0 &&
        dist(playerX, playerY, e.x, e.y) < e.radius + 14
      ) {
        damagePlayer(e.damage * dt * 2.5);
      }
    }

    if (skillLv("skill_orbit") > 0) {
      orbiterSystem.update(dt, playerX, playerY, enemies, (index, damage) => {
        const e = enemies[index];
        if (e && e.spawnTimer <= 0) damageEnemy(e, damage);
      });
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life -= dt;

      if (p.isMelee) {
        const progress = 1 - p.life / p.maxLife;
        p.gfx.position.set(p.x, p.y);
        p.gfx.rotation = p.angle;
        drawMeleeSlash(p.gfx, p.radius, p.color, 0, progress);
        if (p.life <= 0) {
          p.gfx.destroy();
          projectiles.splice(i, 1);
        }
        continue;
      }

      p.spin += dt * 24;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const speed = Math.hypot(p.vx, p.vy);
      const trail = Math.min(1, speed / 400);
      p.gfx.position.set(p.x, p.y);
      if (p.attackKind === "knife") {
        p.gfx.rotation = Math.atan2(p.vy, p.vx) + p.spin;
      } else {
        p.gfx.rotation = Math.atan2(p.vy, p.vx);
      }
      drawProjectileBody(p.gfx, p.attackKind, p.radius, p.color, p.spin, trail);

      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (!isEnemyActive(e)) continue;
        if (dist(p.x, p.y, e.x, e.y) < e.radius + p.radius) {
          damageEnemy(e, p.damage, p.crit);
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

    for (let i = transientFx.length - 1; i >= 0; i--) {
      const fx = transientFx[i];
      fx.life -= dt;
      paintTransientFx(fx);
      if (fx.life <= 0) {
        fx.gfx.destroy();
        transientFx.splice(i, 1);
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
    const hudVisible = phase === "playing" || phase === "levelUp" || phase === "paused";
    hud.update({
      hp: playerHp,
      maxHp: stats.maxHp,
      xp,
      xpMax: xpToNext,
      level: playerLevel,
      wave,
      time: formatTime(gameTime),
      gold: runGold,
      skills: buildHudSkills(),
      minimap: hudVisible
        ? {
            map: getActiveMap(),
            playerX,
            playerY,
            enemies: enemies
              .filter((e) => isEnemyActive(e))
              .map((e) => ({ x: e.x, y: e.y })),
            terrain: terrainFeatures,
            viewW: app.screen.width,
            viewH: app.screen.height,
          }
        : null,
      visible: hudVisible,
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

  function scrollStatistics(deltaY: number) {
    const scrollMax = getStatScrollMax(statsTab);
    if (deltaY === 0 || scrollMax <= 0) return;
    const step = Math.max(1, Math.round(Math.abs(deltaY) / 50));
    if (deltaY > 0) {
      statsScroll = Math.min(scrollMax, statsScroll + step);
    } else {
      statsScroll = Math.max(0, statsScroll - step);
    }
    layoutOverlay();
  }

  function scrollStatDetail(deltaY: number) {
    if (statsDetailIndex === null || deltaY === 0) return;
    const scrollMax = getStatDetailScrollMax(statsTab, statsDetailIndex);
    if (scrollMax <= 0) return;
    const step = Math.max(8, Math.round(Math.abs(deltaY) / 4));
    if (deltaY > 0) {
      statsDetailScroll = Math.min(scrollMax, statsDetailScroll + step);
    } else {
      statsDetailScroll = Math.max(0, statsDetailScroll - step);
    }
    layoutOverlay();
  }

  function setStatsTab(tab: StatTab) {
    if (statsTab === tab) return;
    statsTab = tab;
    statsScroll = 0;
    statsDetailIndex = null;
    statsDetailScroll = 0;
    layoutOverlay();
  }

  function openStatDetail(index: number) {
    statsDetailIndex = index;
    statsDetailScroll = 0;
    layoutOverlay();
  }

  function closeStatDetail() {
    statsDetailIndex = null;
    statsDetailScroll = 0;
    layoutOverlay();
  }

  function cycleStatsTab(dir: 1 | -1) {
    const tabs = STAT_TABS.map((t) => t.id);
    const idx = tabs.indexOf(statsTab);
    setStatsTab(tabs[(idx + dir + tabs.length) % tabs.length]);
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
    } else if (phase === "statistics") {
      overlay.addChild(
        buildStatisticsPanel(
          w,
          h,
          statsTab,
          statsScroll,
          statsDetailIndex,
          statsDetailScroll,
          () => {
            phase = "mainMenu";
            statsDetailIndex = null;
            statsDetailScroll = 0;
            layoutOverlay();
          },
          scrollStatistics,
          scrollStatDetail,
          setStatsTab,
          openStatDetail,
          closeStatDetail,
        ),
      );
    } else if (phase === "help") {
      overlay.addChild(buildHelp(w, h));
    } else if (phase === "shop") {
      overlay.addChild(
        buildShopPanel(
          w,
          h,
          save.totalGold,
          save.unlockedShop,
          runShopBuffs,
          shopFocus,
          buyShopItem,
          () => {
            phase = "mainMenu";
            layoutOverlay();
          },
        ),
      );
    } else if (phase === "death") {
      overlay.addChild(
        buildDeathScreen(w, h, getDeathStats(), finishDeathAndGoHome),
      );
    } else if (phase === "paused") {
      overlay.addChild(
        buildPauseMenu(
          w,
          h,
          {
            character,
            difficultyName: getActiveDifficulty().name,
            playerLevel,
            wave,
            gameTime,
            kills,
            runGold,
            upgradeLevels,
            runShopBuffs,
          },
          pauseMenuFocus,
          resumeFromPause,
          restartFromPause,
          quitToMainMenu,
        ),
      );
    }
  }

  function drawMenuBackdrop(container: Container, w: number, h: number) {
    container.addChild(createMenuBackdrop(w, h));
  }

  function panelBg(w: number, h: number, pw: number, ph: number): Container {
    const c = new Container();
    const dim = new Graphics();
    dim.rect(0, 0, w, h).fill({ color: UI.overlay, alpha: 0.78 });
    dim.eventMode = "static";
    const box = new Graphics();
    drawPanelFrame(box, pw, ph);
    box.position.set(w / 2 - pw / 2, h / 2 - ph / 2);
    c.addChild(dim, box);
    return c;
  }

  function menuBtn(
    label: string,
    onClick: () => void,
    focused = false,
    accent = UI.cardSelectedGlow,
  ): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const g = new Graphics();
    const text = new Text({
      text: label,
      style: {
        fill: UI.textPrimary,
        fontSize: label.length > 8 ? 20 : 24,
        fontFamily: FONT,
        letterSpacing: label.length > 8 ? 2 : 3,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: focused ? 3 : 2 },
      },
    });
    text.anchor.set(0.5);
    const padX = 28;
    const padY = 16;
    const btnW = text.width + padX * 2;
    const btnH = text.height + padY * 2;
    drawMenuButtonBg(g, btnW, btnH, focused, accent);
    text.position.set(btnW / 2, btnH / 2);
    btn.addChild(g, text);
    setClickHitArea(btn, btnW, btnH);
    btn.on("pointertap", onClick);
    return btn;
  }

  function buildMainMenu(w: number, h: number): Container {
    const c = new Container();
    drawMenuBackdrop(c, w, h);

    const title = new Text({
      text: "ENDLESS WAVES\nSURVIVAL",
      style: menuTitleStyle,
    });
    title.anchor.set(0.5);
    title.position.set(w / 2, h * 0.18);

    const items = ["NEW GAME", "SHOP", "STATISTICS", "HOW TO PLAY"];
    const actions = [
      () => {
        charSelectSection = "hero";
        charFocus = 0;
        charSelectActionFocus = 0;
        phase = "characterSelect";
        layoutOverlay();
      },
      () => {
        phase = "shop";
        shopFocus = 0;
        layoutOverlay();
      },
      () => {
        statsScroll = 0;
        statsTab = "skills";
        statsDetailIndex = null;
        statsDetailScroll = 0;
        phase = "statistics";
        layoutOverlay();
      },
      () => {
        phase = "help";
        layoutOverlay();
      },
    ];
    items.forEach((label, i) => {
      const btn = menuBtn(label, actions[i], menuFocus === i);
      btn.position.set(w / 2 - 140, h * 0.42 + i * 72);
      c.addChild(btn);
    });

    const stats = new Text({
      text: `Gold ${save.totalGold}   Best ${save.highScore} kills   ${formatTime(save.bestTime)}`,
      style: { fill: UI.textDim, fontSize: 13, fontFamily: FONT },
    });
    stats.anchor.set(0.5);
    stats.position.set(w / 2, h - 36);
    c.addChild(title, stats);

    if (deathSummaryActive && lastDeathStats) {
      c.addChild(
        buildDeathSummaryOverlay(w, h, lastDeathStats, dismissDeathSummary),
      );
    }

    return c;
  }

  function buildCharacterSelect(w: number, h: number): Container {
    const panelW = Math.min(920, w - 24);
    const panelH = Math.min(820, h - 24);
    const c = panelBg(w, h, panelW, panelH);
    const panelTop = h / 2 - panelH / 2;

    const title = new Text({
      text: "New Game",
      style: { ...titleStyle, fontSize: 30 },
    });
    title.anchor.set(0.5);
    title.position.set(w / 2, panelTop + 42);
    c.addChild(title);

    const cardW = 204;
    const cardH = 224;
    const cardGap = 14;
    const totalCardsW = CHARACTERS.length * cardW + (CHARACTERS.length - 1) * cardGap;
    const cardsStartX = w / 2 - totalCardsW / 2;
    const cardsY = panelTop + 84;

    CHARACTERS.forEach((ch, i) => {
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      const focused = charSelectSection === "hero" && charFocus === i;
      const selected = charFocus === i;
      const g = new Graphics();
      drawUpgradeCardBg(g, cardW, cardH, focused || selected, ch.accent);
      const preview = new Graphics();
      preview.circle(cardW / 2, 72, 22).fill(ch.accent);
      preview.roundRect(cardW / 2 - 12, 88, 24, 32, 3).fill(ch.color);
      const name = new Text({
        text: ch.name,
        style: {
          fill: UI.textPrimary,
          fontSize: 17,
          fontFamily: FONT,
          fontWeight: "bold",
          stroke: { color: 0x000000, width: focused ? 3 : 2 },
        },
      });
      name.anchor.set(0.5);
      name.position.set(cardW / 2, 142);
      const tag = new Text({
        text: ch.tagline,
        style: {
          fill: UI.textMuted,
          fontSize: 12,
          fontFamily: FONT,
          wordWrap: true,
          wordWrapWidth: cardW - 28,
          align: "center",
        },
      });
      tag.anchor.set(0.5);
      tag.position.set(cardW / 2, 182);
      card.addChild(g, preview, name, tag);
      if (selected) {
        const badge = new Graphics();
        badge.circle(cardW - 14, 14, 11).fill(UI.cardSelected);
        badge.moveTo(cardW - 19, 14).lineTo(cardW - 15, 18).lineTo(cardW - 8, 10).stroke({
          width: 2,
          color: 0xffffff,
        });
        const label = new Text({
          text: "SELECTED",
          style: {
            fill: UI.cardSelectedGlow,
            fontSize: 9,
            fontFamily: FONT,
            fontWeight: "bold",
            letterSpacing: 1,
          },
        });
        label.anchor.set(0.5);
        label.position.set(cardW / 2, cardH - 12);
        card.addChild(badge, label);
      }
      setClickHitArea(card, cardW, cardH);
      card.position.set(cardsStartX + i * (cardW + cardGap), cardsY);
      card.on("pointertap", () => {
        charFocus = i;
        charSelectSection = "hero";
        layoutOverlay();
      });
      c.addChild(card);
    });

    const diffSectionY = cardsY + cardH + 32;
    const diffLabel = new Text({
      text: "Select difficulty",
      style: {
        fill: charSelectSection === "difficulty" ? UI.cardSelectedGlow : UI.textMuted,
        fontSize: 15,
        fontFamily: FONT,
        letterSpacing: 2,
        fontWeight: "bold",
      },
    });
    diffLabel.anchor.set(0.5);
    diffLabel.position.set(w / 2, diffSectionY);
    c.addChild(diffLabel);

    const diffBtnW = 196;
    const diffBtnH = 90;
    const diffGap = 18;
    const totalDiffW = DIFFICULTIES.length * diffBtnW + (DIFFICULTIES.length - 1) * diffGap;
    const diffStartX = w / 2 - totalDiffW / 2;
    const diffBtnY = diffSectionY + 32;
    const diffAccent: Record<DifficultyId, number> = {
      easy: 0x55dd77,
      normal: UI.cardSelectedGlow,
      hard: 0xff8866,
    };

    DIFFICULTIES.forEach((diff, i) => {
      const btn = new Container();
      btn.eventMode = "static";
      btn.cursor = "pointer";
      const focused =
        charSelectSection === "difficulty" && difficultyFocus === i;
      const chosen = activeDifficultyId === diff.id;
      const g = new Graphics();
      drawUpgradeCardBg(g, diffBtnW, diffBtnH, focused || chosen, diffAccent[diff.id]);
      const name = new Text({
        text: diff.name,
        style: {
          fill: UI.textPrimary,
          fontSize: 16,
          fontFamily: FONT,
          fontWeight: "bold",
          stroke: { color: 0x000000, width: focused ? 3 : 2 },
        },
      });
      name.anchor.set(0.5);
      name.position.set(diffBtnW / 2, 28);
      const desc = new Text({
        text: diff.desc,
        style: {
          fill: UI.textDim,
          fontSize: 10,
          fontFamily: FONT,
          wordWrap: true,
          wordWrapWidth: diffBtnW - 20,
          align: "center",
        },
      });
      desc.anchor.set(0.5);
      desc.position.set(diffBtnW / 2, 60);
      btn.addChild(g, name, desc);
      if (chosen) {
        const badge = new Graphics();
        badge.circle(diffBtnW - 12, 12, 9).fill(UI.cardSelected);
        badge.moveTo(diffBtnW - 16, 12).lineTo(diffBtnW - 13, 15).lineTo(diffBtnW - 8, 9).stroke({
          width: 2,
          color: 0xffffff,
        });
        btn.addChild(badge);
      }
      setClickHitArea(btn, diffBtnW, diffBtnH);
      btn.position.set(diffStartX + i * (diffBtnW + diffGap), diffBtnY);
      btn.on("pointertap", () => {
        difficultyFocus = i;
        activeDifficultyId = diff.id;
        charSelectSection = "difficulty";
        layoutOverlay();
      });
      c.addChild(btn);
    });

    const mapSectionY = diffBtnY + diffBtnH + 28;
    const mapLabel = new Text({
      text: "Select map",
      style: {
        fill: charSelectSection === "map" ? UI.cardSelectedGlow : UI.textMuted,
        fontSize: 15,
        fontFamily: FONT,
        letterSpacing: 2,
        fontWeight: "bold",
      },
    });
    mapLabel.anchor.set(0.5);
    mapLabel.position.set(w / 2, mapSectionY);
    c.addChild(mapLabel);

    const mapCardW = 210;
    const mapGap = 14;
    const totalMapW = MAPS.length * mapCardW + (MAPS.length - 1) * mapGap;
    const mapStartX = w / 2 - totalMapW / 2;
    const mapCardY = mapSectionY + 30;
    const mapPreviewH = 76;

    MAPS.forEach((map, i) => {
      const card = new Container();
      card.eventMode = "static";
      card.cursor = "pointer";
      const focused = charSelectSection === "map" && mapFocus === i;
      const chosen = activeMapId === map.id;
      const cardH = mapPreviewH + 52;
      const g = new Graphics();
      drawUpgradeCardBg(g, mapCardW, cardH, focused || chosen, map.accentColor);
      const preview = new Graphics();
      drawMapPreview(preview, map, 10, 10, mapCardW - 20, mapPreviewH);
      const name = new Text({
        text: map.name,
        style: {
          fill: UI.textPrimary,
          fontSize: 14,
          fontFamily: FONT,
          fontWeight: "bold",
          stroke: { color: 0x000000, width: focused ? 3 : 2 },
        },
      });
      name.anchor.set(0.5);
      name.position.set(mapCardW / 2, mapPreviewH + 22);
      const desc = new Text({
        text: map.desc,
        style: {
          fill: UI.textDim,
          fontSize: 10,
          fontFamily: FONT,
        },
      });
      desc.anchor.set(0.5);
      desc.position.set(mapCardW / 2, mapPreviewH + 40);
      card.addChild(g, preview, name, desc);
      if (chosen) {
        const badge = new Graphics();
        badge.circle(mapCardW - 12, 12, 9).fill(UI.cardSelected);
        badge.moveTo(mapCardW - 16, 12).lineTo(mapCardW - 13, 15).lineTo(mapCardW - 8, 9).stroke({
          width: 2,
          color: 0xffffff,
        });
        card.addChild(badge);
      }
      setClickHitArea(card, mapCardW, cardH);
      card.position.set(mapStartX + i * (mapCardW + mapGap), mapCardY);
      card.on("pointertap", () => {
        mapFocus = i;
        activeMapId = map.id;
        charSelectSection = "map";
        drawFloor();
        layoutOverlay();
      });
      c.addChild(card);
    });

    const selectedHero = CHARACTERS[charFocus];
    const selectedDiff = getDifficulty(activeDifficultyId);
    const selectedMap = getMap(activeMapId);
    const summaryY = mapCardY + mapPreviewH + 52 + 28;
    const summaryW = Math.min(760, panelW - 80);
    const summaryH = 48;
    const summaryBox = new Graphics();
    drawPanelFrame(summaryBox, summaryW, summaryH);
    summaryBox.position.set(w / 2 - summaryW / 2, summaryY - summaryH / 2);
    c.addChild(summaryBox);

    const heroDot = new Graphics();
    heroDot.circle(0, 0, 6).fill(selectedHero.accent);
    heroDot.position.set(w / 2 - summaryW / 2 + 24, summaryY);
    c.addChild(heroDot);

    const mapDot = new Graphics();
    mapDot.circle(0, 0, 6).fill(selectedMap.accentColor);
    mapDot.position.set(w / 2 - summaryW / 2 + 44, summaryY);
    c.addChild(mapDot);

    const summary = new Text({
      text: `${selectedHero.name}   ·   ${selectedMap.name}   ·   ${selectedDiff.name}`,
      style: {
        fill: UI.textPrimary,
        fontSize: 16,
        fontFamily: FONT,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    summary.anchor.set(0.5);
    summary.position.set(w / 2 + 8, summaryY);
    c.addChild(summary);

    const actionY = summaryY + 52;
    const actionGap = 20;
    const done = menuBtn(
      "DONE",
      () => {
        drawFloor();
        startRun(CHARACTERS[charFocus].id);
      },
      charSelectSection === "actions" && charSelectActionFocus === 0,
    );
    const back = menuBtn(
      "BACK",
      () => {
        phase = "mainMenu";
        layoutOverlay();
      },
      charSelectSection === "actions" && charSelectActionFocus === 1,
    );
    const doneW = (done.hitArea as Rectangle).width;
    const backW = (back.hitArea as Rectangle).width;
    const actionRowW = doneW + actionGap + backW;
    done.position.set(w / 2 - actionRowW / 2, actionY);
    back.position.set(w / 2 - actionRowW / 2 + doneW + actionGap, actionY);
    c.addChild(done, back);

    const hint = new Text({
      text: "Hero → Difficulty → Map → Done  ·  ↓↓ advance  ·  Enter start",
      style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
    });
    hint.anchor.set(0.5);
    hint.position.set(w / 2, panelTop + panelH - 26);
    c.addChild(hint);

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
        "Some upgrades unlock bonus skills (orbit, meteor, thunder, heal).\n" +
        "Collect XP gems to level up and pick upgrades.\n" +
        "Collect gold to buy one-time shop buffs before each run.\n" +
        "Shop buffs are lost when you die — buy again next time.\n" +
        "All upgrades stack — build the strongest combo!\n\n" +
        "Mage — area magic  |  Knight — melee tank\n" +
        "Rogue — speed & crit  |  Archer — ranged kiting",
      style: bodyStyle,
    });
    text.anchor.set(0.5);
    text.position.set(w / 2, h / 2 - 20);
    c.addChild(text);
    const back = menuBtn("BACK", () => {
      phase = "mainMenu";
      layoutOverlay();
    });
    back.position.set(w / 2 - 140, h / 2 + 180);
    c.addChild(back);
    return c;
  }

  function handleMenuInput() {
    if (phase === "death") {
      if (input.pressed("Enter") || input.pressed("Space")) {
        finishDeathAndGoHome();
      }
      return;
    }

    if (phase === "mainMenu" && deathSummaryActive) {
      if (input.pressed("Enter") || input.pressed("Space") || input.pressed("Escape")) {
        dismissDeathSummary();
      }
      return;
    }

    if (phase === "mainMenu") {
      if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
        menuFocus = (menuFocus + 3) % 4;
        layoutOverlay();
      }
      if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
        menuFocus = (menuFocus + 1) % 4;
        layoutOverlay();
      }
      if (input.pressed("Enter") || input.pressed("Space")) {
        if (menuFocus === 0) phase = "characterSelect";
        else if (menuFocus === 1) {
          phase = "shop";
          shopFocus = 0;
        } else if (menuFocus === 2) {
          statsScroll = 0;
          statsTab = "skills";
          statsDetailIndex = null;
          statsDetailScroll = 0;
          phase = "statistics";
        } else phase = "help";
        layoutOverlay();
      }
    } else if (phase === "statistics") {
      if (statsDetailIndex !== null) {
        if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
          scrollStatDetail(-50);
        }
        if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
          scrollStatDetail(50);
        }
        if (input.pressed("Escape") || input.pressed("Enter") || input.pressed("Space")) {
          closeStatDetail();
        }
      } else {
        if (input.pressed("ArrowLeft") || input.pressed("KeyA")) {
          cycleStatsTab(-1);
        }
        if (input.pressed("ArrowRight") || input.pressed("KeyD")) {
          cycleStatsTab(1);
        }
        if (input.pressed("Digit1")) setStatsTab("skills");
        if (input.pressed("Digit2")) setStatsTab("maps");
        if (input.pressed("Digit3")) setStatsTab("enemies");
        if (input.pressed("Digit4")) setStatsTab("terrain");
        if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
          scrollStatistics(-50);
        }
        if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
          scrollStatistics(50);
        }
        if (input.pressed("Escape")) {
          phase = "mainMenu";
          statsDetailIndex = null;
          layoutOverlay();
        }
      }
    } else if (phase === "characterSelect") {
      if (charSelectSection === "hero") {
        if (input.pressed("ArrowLeft") || input.pressed("KeyA")) {
          charFocus = (charFocus + 3) % 4;
          layoutOverlay();
        }
        if (input.pressed("ArrowRight") || input.pressed("KeyD")) {
          charFocus = (charFocus + 1) % 4;
          layoutOverlay();
        }
        if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
          charSelectSection = "difficulty";
          layoutOverlay();
        }
      } else if (charSelectSection === "difficulty") {
        if (input.pressed("ArrowLeft") || input.pressed("KeyA")) {
          difficultyFocus = (difficultyFocus + DIFFICULTIES.length - 1) % DIFFICULTIES.length;
          activeDifficultyId = DIFFICULTIES[difficultyFocus].id;
          layoutOverlay();
        }
        if (input.pressed("ArrowRight") || input.pressed("KeyD")) {
          difficultyFocus = (difficultyFocus + 1) % DIFFICULTIES.length;
          activeDifficultyId = DIFFICULTIES[difficultyFocus].id;
          layoutOverlay();
        }
        if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
          charSelectSection = "hero";
          layoutOverlay();
        }
        if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
          charSelectSection = "map";
          layoutOverlay();
        }
      } else if (charSelectSection === "map") {
        if (input.pressed("ArrowLeft") || input.pressed("KeyA")) {
          mapFocus = (mapFocus + MAPS.length - 1) % MAPS.length;
          activeMapId = MAPS[mapFocus].id;
          drawFloor();
          layoutOverlay();
        }
        if (input.pressed("ArrowRight") || input.pressed("KeyD")) {
          mapFocus = (mapFocus + 1) % MAPS.length;
          activeMapId = MAPS[mapFocus].id;
          drawFloor();
          layoutOverlay();
        }
        if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
          charSelectSection = "difficulty";
          layoutOverlay();
        }
        if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
          charSelectSection = "actions";
          charSelectActionFocus = 0;
          layoutOverlay();
        }
      } else {
        if (input.pressed("ArrowLeft") || input.pressed("KeyA")) {
          charSelectActionFocus = 0;
          layoutOverlay();
        }
        if (input.pressed("ArrowRight") || input.pressed("KeyD")) {
          charSelectActionFocus = 1;
          layoutOverlay();
        }
        if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
          charSelectSection = "map";
          layoutOverlay();
        }
        if (input.pressed("Enter") || input.pressed("Space")) {
          if (charSelectActionFocus === 0) {
            drawFloor();
            startRun(CHARACTERS[charFocus].id);
          } else {
            phase = "mainMenu";
            layoutOverlay();
          }
        }
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
      if (
        input.pressed("ArrowLeft") ||
        input.pressed("KeyA") ||
        input.pressed("ArrowUp") ||
        input.pressed("KeyW")
      ) {
        pauseMenuFocus = (pauseMenuFocus + 2) % 3;
        layoutOverlay();
      }
      if (
        input.pressed("ArrowRight") ||
        input.pressed("KeyD") ||
        input.pressed("ArrowDown") ||
        input.pressed("KeyS")
      ) {
        pauseMenuFocus = (pauseMenuFocus + 1) % 3;
        layoutOverlay();
      }
      if (input.pressed("Enter") || input.pressed("Space")) {
        if (pauseMenuFocus === 0) resumeFromPause();
        else if (pauseMenuFocus === 1) restartFromPause();
        else quitToMainMenu();
      }
    } else if (phase === "help") {
      if (input.pressed("Escape") || input.pressed("Enter")) {
        phase = "mainMenu";
        layoutOverlay();
      }
    } else if (phase === "shop") {
      if (input.pressed("Escape")) {
        phase = "mainMenu";
        layoutOverlay();
      }
      if (input.pressed("ArrowUp") || input.pressed("KeyW")) {
        shopFocus = (shopFocus + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length;
        layoutOverlay();
      }
      if (input.pressed("ArrowDown") || input.pressed("KeyS")) {
        shopFocus = (shopFocus + 1) % SHOP_ITEMS.length;
        layoutOverlay();
      }
      if (input.pressed("Enter") || input.pressed("Space")) {
        buyShopItem(SHOP_ITEMS[shopFocus].id);
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
      levelUpPanel.tick(dt);
    }

    input.flush();
  });
}
