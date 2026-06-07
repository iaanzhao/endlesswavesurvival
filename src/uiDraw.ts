import { Graphics } from "pixi.js";
import type { UpgradeId } from "./data";
import { UI, UPGRADE_ACCENT } from "./uiTheme";

export type ClassSkillIconId =
  | "class_mage_q"
  | "class_mage_r"
  | "class_knight_q"
  | "class_knight_r"
  | "class_rogue_q"
  | "class_rogue_r"
  | "class_archer_q"
  | "class_archer_r";

export type StatIconId = UpgradeId | ClassSkillIconId;

const CLASS_SKILL_ACCENT: Record<ClassSkillIconId, number> = {
  class_mage_q: 0xff6644,
  class_mage_r: 0x66ccff,
  class_knight_q: 0x8899bb,
  class_knight_r: 0xddddff,
  class_rogue_q: 0x888888,
  class_rogue_r: 0x44ff88,
  class_archer_q: 0xffcc44,
  class_archer_r: 0xff8844,
};

function statIconAccent(id: StatIconId): number {
  if (id in CLASS_SKILL_ACCENT) {
    return CLASS_SKILL_ACCENT[id as ClassSkillIconId];
  }
  return UPGRADE_ACCENT[id as UpgradeId] ?? 0x888899;
}

export { statIconAccent };

function drawCornerBrackets(
  g: Graphics,
  w: number,
  h: number,
  color: number,
  bold: boolean,
): void {
  const len = bold ? 18 : 12;
  const thick = bold ? 3 : 2;
  const inset = bold ? 5 : 7;
  const drawCorner = (x: number, y: number, hx: number, vy: number) => {
    g.moveTo(x, y + vy * len).lineTo(x, y).lineTo(x + hx * len, y).stroke({
      width: thick,
      color,
      alpha: bold ? 0.95 : 0.55,
    });
  };
  drawCorner(inset, inset, 1, 1);
  drawCorner(w - inset, inset, -1, 1);
  drawCorner(inset, h - inset, 1, -1);
  drawCorner(w - inset, h - inset, -1, -1);
}

export function drawBar(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  fill: number,
  bg: number,
): void {
  g.roundRect(x, y, w, h, 2).fill(bg);
  if (ratio > 0.01) {
    g.roundRect(x, y, w * ratio, h, 2).fill(fill);
  }
  g.roundRect(x, y, w, h, 2).stroke({ width: 1, color: 0x333344, alpha: 0.45 });
}

export function drawCoinIcon(g: Graphics, x: number, y: number, r = 7): void {
  g.circle(x, y, r).fill(UI.coin);
  g.circle(x - 1, y - 1, r - 2).fill({ color: 0xffee88, alpha: 0.55 });
}

export function drawUpgradeCardBg(
  g: Graphics,
  width: number,
  height: number,
  selected: boolean,
  accent: number,
  pulse = 0,
): void {
  g.clear();

  if (selected) {
    g.roundRect(-6, -6, width + 12, height + 12, 4).fill({
      color: UI.cardSelected,
      alpha: 0.1 + pulse * 0.12,
    });
    g.roundRect(-3, -3, width + 6, height + 6, 2).fill({
      color: accent,
      alpha: 0.06 + pulse * 0.06,
    });
  }

  g.rect(0, 0, width, height).fill(UI.cardBg);
  g.rect(2, 2, width - 4, 54).fill({ color: accent, alpha: selected ? 0.14 : 0.07 });
  g.rect(2, 2, width - 4, height - 4).fill(UI.cardInner);

  g.rect(10, 4, width - 20, 2).fill({
    color: 0xffffff,
    alpha: selected ? 0.22 + pulse * 0.08 : 0.07,
  });
  g.rect(10, height - 8, width - 20, 2).fill({ color: accent, alpha: 0.5 });

  const outer = selected ? UI.cardSelected : UI.cardBorder;
  const outerW = selected ? 4 : 2;
  g.rect(0, 0, width, height).stroke({ width: outerW, color: outer, alpha: 0.95 });

  if (selected) {
    g.rect(1, 1, width - 2, height - 2).stroke({
      width: 1,
      color: UI.cardSelectedGlow,
      alpha: 0.4 + pulse * 0.25,
    });
    drawCornerBrackets(g, width, height, UI.cardSelectedGlow, true);
  } else {
    g.rect(4, 4, width - 8, height - 8).stroke({
      width: 1,
      color: UI.cardBorderHi,
      alpha: 0.35,
    });
    drawCornerBrackets(g, width, height, accent, false);
  }
}

export function drawUpgradeIconGlow(
  g: Graphics,
  cx: number,
  cy: number,
  box: number,
  accent: number,
  selected: boolean,
  pulse: number,
): void {
  g.clear();
  const half = box / 2;
  const glowSize = box + 14 + pulse * 6;
  g.roundRect(cx - glowSize / 2, cy - glowSize / 2, glowSize, glowSize, 8).fill({
    color: accent,
    alpha: selected ? 0.12 + pulse * 0.1 : 0.05,
  });
  if (selected) {
    g.circle(cx, cy, half + 6 + pulse * 4).fill({
      color: UI.cardSelected,
      alpha: 0.08 + pulse * 0.06,
    });
  }
}

export function drawUpgradeIconFrame(
  g: Graphics,
  cx: number,
  cy: number,
  box: number,
  accent: number,
  selected: boolean,
): void {
  g.clear();
  const half = box / 2;
  const x = cx - half;
  const y = cy - half;

  g.rect(x - 1, y - 1, box + 2, box + 2).fill({ color: 0x000000, alpha: 0.45 });
  g.rect(x, y, box, box).fill(0x08080e);
  g.rect(x + 2, y + 2, box - 4, 10).fill({ color: 0xffffff, alpha: 0.05 });
  g.rect(x, y, box, box).stroke({
    width: selected ? 2 : 1,
    color: selected ? UI.cardSelected : UI.cardBorder,
    alpha: 0.9,
  });
  g.rect(x + 3, y + 3, box - 6, box - 6).stroke({
    width: 1,
    color: accent,
    alpha: selected ? 0.55 : 0.25,
  });

  const tick = 6;
  g.moveTo(x + 4, y + 4 + tick).lineTo(x + 4, y + 4).lineTo(x + 4 + tick, y + 4)
    .stroke({ width: 2, color: accent, alpha: 0.7 });
  g.moveTo(x + box - 4 - tick, y + 4).lineTo(x + box - 4, y + 4).lineTo(x + box - 4, y + 4 + tick)
    .stroke({ width: 2, color: accent, alpha: 0.7 });
  g.moveTo(x + 4, y + box - 4 - tick).lineTo(x + 4, y + box - 4).lineTo(x + 4 + tick, y + box - 4)
    .stroke({ width: 2, color: accent, alpha: 0.7 });
  g.moveTo(x + box - 4, y + box - 4 - tick).lineTo(x + box - 4, y + box - 4).lineTo(x + box - 4 - tick, y + box - 4)
    .stroke({ width: 2, color: accent, alpha: 0.7 });
}

export function drawUpgradeLevelPips(
  g: Graphics,
  cx: number,
  y: number,
  level: number,
  maxLevel: number,
  accent: number,
): void {
  g.clear();
  const dotCount = Math.min(5, maxLevel);
  const filled = Math.min(level, dotCount);
  const gap = 10;
  const startX = cx - ((dotCount - 1) * gap) / 2;

  for (let i = 0; i < dotCount; i++) {
    const filledDot = i < filled;
    g.circle(startX + i * gap, y, filledDot ? 4 : 3).fill(
      filledDot ? accent : UI.textDim,
    );
    if (filledDot) {
      g.circle(startX + i * gap - 1, y - 1, 2).fill({ color: 0xffffff, alpha: 0.35 });
    }
  }
}

export function drawLevelUpHeaderFx(g: Graphics, cx: number, y: number, w: number): void {
  g.clear();
  const lineW = Math.min(120, w * 0.14);
  g.moveTo(cx - lineW - 80, y).lineTo(cx - 80, y).stroke({
    width: 2,
    color: UI.cardSelected,
    alpha: 0.55,
  });
  g.moveTo(cx + 80, y).lineTo(cx + lineW + 80, y).stroke({
    width: 2,
    color: UI.cardSelected,
    alpha: 0.55,
  });
  g.circle(cx - 80, y, 3).fill(UI.cardSelectedGlow);
  g.circle(cx + 80, y, 3).fill(UI.cardSelectedGlow);
  g.star(cx, y - 28, 4, 5, 2).fill({ color: UI.cardSelectedGlow, alpha: 0.35 });
}

function upgradeAccent(id: StatIconId): number {
  return statIconAccent(id);
}

export function drawUpgradeIcon(
  g: Graphics,
  id: StatIconId,
  cx: number,
  cy: number,
): void {
  g.clear();
  const accent = upgradeAccent(id);
  const s = 32;
  const x = cx - s / 2;
  const y = cy - s / 2;

  g.circle(cx, cy, 16).fill({ color: accent, alpha: 0.12 });

  switch (id) {
    case "vitality":
      g.rect(x + 11, y + 7, 10, 20).fill(0xcc4455);
      g.rect(x + 7, y + 13, 18, 10).fill(0xff6677);
      g.rect(x + 11, y + 7, 10, 4).fill({ color: 0xffffff, alpha: 0.25 });
      break;
    case "recovery":
      g.rect(x + 9, y + 9, 18, 16).fill(0x338855);
      g.rect(x + 15, y + 5, 6, 24).fill(0x88ffaa);
      g.rect(x + 9, y + 15, 18, 4).fill(0x55cc77);
      break;
    case "armor":
      g.moveTo(cx, y + 5).lineTo(x + 24, y + 13).lineTo(x + 20, y + 27).lineTo(x + 12, y + 27).lineTo(x + 8, y + 13).closePath().fill(0x667788);
      g.moveTo(cx, y + 8).lineTo(x + 20, y + 14).lineTo(x + 17, y + 23).lineTo(x + 11, y + 23).lineTo(x + 8, y + 14).closePath().fill(0x99aacc);
      break;
    case "haste":
      g.moveTo(cx, y + 5).lineTo(x + 24, y + 15).lineTo(cx, y + 27).lineTo(x + 8, y + 15).closePath().fill(0x3388dd);
      g.moveTo(cx, y + 10).lineTo(x + 18, y + 15).lineTo(cx, y + 22).lineTo(x + 10, y + 15).closePath().fill(0x88ccff);
      break;
    case "might":
      g.rect(x + 13, y + 5, 6, 22).fill(0xaa6622);
      g.rect(x + 7, y + 11, 18, 6).fill(0xdd9944);
      g.rect(x + 13, y + 5, 6, 4).fill({ color: 0xffffff, alpha: 0.2 });
      break;
    case "swift_strike":
      g.moveTo(x + 6, y + 22).lineTo(cx, y + 5).lineTo(x + 26, y + 22).closePath().fill(0xddaa22);
      g.moveTo(x + 10, y + 20).lineTo(cx, y + 10).lineTo(x + 22, y + 20).closePath().fill(0xffee66);
      break;
    case "multishot":
      g.circle(x + 8, y + 16, 5).fill(0x4499dd);
      g.circle(cx, y + 10, 5).fill(0x66ccff);
      g.circle(x + 24, y + 16, 5).fill(0x4499dd);
      g.circle(x + 8, y + 16, 2).fill({ color: 0xffffff, alpha: 0.5 });
      g.circle(cx, y + 10, 2).fill({ color: 0xffffff, alpha: 0.5 });
      break;
    case "pierce":
      g.moveTo(x + 5, cy).lineTo(x + 27, cy).stroke({ width: 4, color: 0xccaa55 });
      g.moveTo(x + 20, cy - 5).lineTo(x + 27, cy).lineTo(x + 20, cy + 5).fill(0xffeeaa);
      break;
    case "area":
      g.circle(cx, cy, 13).stroke({ width: 2, color: 0xff4422, alpha: 0.5 });
      g.circle(cx, cy, 8).fill({ color: 0xff6644, alpha: 0.45 });
      g.circle(cx, cy, 4).fill(0xffaa66);
      break;
    case "magnet":
      g.rect(x + 11, y + 5, 10, 12).fill(0xcc3333);
      g.rect(x + 7, y + 17, 18, 8).fill(0x4444dd);
      g.rect(x + 11, y + 5, 5, 12).fill({ color: 0xff6666, alpha: 0.5 });
      break;
    case "wisdom":
      g.rect(x + 9, y + 5, 14, 20).fill(0xbb9966);
      g.rect(x + 11, y + 10, 10, 2).fill(0x554433);
      g.rect(x + 11, y + 15, 10, 2).fill(0x554433);
      g.rect(x + 11, y + 5, 10, 3).fill({ color: 0xffffff, alpha: 0.15 });
      break;
    case "crit":
      g.moveTo(cx, y + 4)
        .lineTo(x + 19, y + 13)
        .lineTo(x + 26, y + 13)
        .lineTo(x + 21, y + 18)
        .lineTo(x + 23, y + 27)
        .lineTo(cx, y + 22)
        .lineTo(x + 9, y + 27)
        .lineTo(x + 11, y + 18)
        .lineTo(x + 6, y + 13)
        .lineTo(x + 13, y + 13)
        .fill(0xffcc44);
      g.moveTo(cx, y + 8)
        .lineTo(x + 18, y + 14)
        .lineTo(cx, y + 19)
        .lineTo(x + 10, y + 14)
        .fill({ color: 0xffffff, alpha: 0.35 });
      break;
    case "cooldown":
      g.circle(cx, cy, 12).stroke({ width: 3, color: 0x44aa66 });
      g.circle(cx, cy, 12).stroke({ width: 1, color: 0x88ffaa, alpha: 0.4 });
      g.rect(x + 13, y + 7, 5, 14).fill(0x55cc77);
      g.rect(x + 13, y + 7, 5, 4).fill({ color: 0xffffff, alpha: 0.25 });
      break;
    case "skill_orbit":
      g.circle(cx, cy, 11).stroke({ width: 2, color: 0xff5544 });
      g.moveTo(cx, cy - 9).lineTo(cx + 8, cy + 6).lineTo(cx - 8, cy + 6).closePath().fill(0xff5544);
      break;
    case "skill_meteor":
      g.circle(cx, cy + 4, 8).fill(0xff6622);
      g.moveTo(cx - 6, cy - 8).lineTo(cx, cy - 14).lineTo(cx + 6, cy - 8).fill(0xffaa44);
      break;
    case "skill_thunder":
      g.moveTo(cx - 4, cy - 10).lineTo(cx + 2, cy).lineTo(cx - 2, cy).lineTo(cx + 4, cy + 10).fill(0x66ccff);
      break;
    case "skill_heal":
      g.circle(cx, cy, 10).fill({ color: 0x55dd77, alpha: 0.35 });
      g.rect(x + 13, y + 7, 6, 14).fill(0x55dd77);
      g.rect(x + 9, y + 11, 14, 6).fill(0x88ffaa);
      break;
    case "class_mage_q":
      g.circle(cx, cy, 13).stroke({ width: 2, color: 0xff6622, alpha: 0.55 });
      g.circle(cx, cy, 8).fill({ color: 0xff6644, alpha: 0.5 });
      g.circle(cx, cy, 4).fill(0xffaa66);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.moveTo(cx, cy)
          .lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14)
          .stroke({ width: 2, color: 0xff8844, alpha: 0.6 });
      }
      break;
    case "class_mage_r":
      g.moveTo(cx - 4, cy - 10).lineTo(cx + 2, cy).lineTo(cx - 2, cy).lineTo(cx + 4, cy + 10).fill(0x66ccff);
      g.circle(cx, cy - 8, 3).fill({ color: 0xffffff, alpha: 0.45 });
      break;
    case "class_knight_q":
      g.moveTo(cx, y + 5).lineTo(x + 24, y + 13).lineTo(x + 20, y + 27).lineTo(x + 12, y + 27).lineTo(x + 8, y + 13).closePath().fill(0x667788);
      g.moveTo(cx + 8, cy).lineTo(x + 26, cy).stroke({ width: 3, color: 0x88aacc });
      g.moveTo(x + 22, cy - 4).lineTo(x + 27, cy).lineTo(x + 22, cy + 4).fill(0xccddff);
      break;
    case "class_knight_r":
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        g.arc(cx, cy, 8, a - 0.3, a + 0.3).stroke({ width: 2, color: 0xddddff, alpha: 0.85 });
      }
      g.circle(cx, cy, 2).fill({ color: 0xffffff, alpha: 0.45 });
      break;
    case "class_rogue_q":
      for (let i = 0; i < 4; i++) {
        const a = i * 1.5;
        g.circle(cx + Math.cos(a) * 6, cy + Math.sin(a) * 4, 7).fill({ color: 0x667766, alpha: 0.35 });
      }
      g.circle(cx, cy, 5).fill({ color: 0x445544, alpha: 0.5 });
      break;
    case "class_rogue_r":
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.moveTo(cx, cy)
          .lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14)
          .stroke({ width: 2, color: 0x44ff88, alpha: 0.75 });
      }
      g.circle(cx, cy, 3).fill(0xeeffcc);
      break;
    case "class_archer_q":
      g.circle(x + 8, y + 16, 4).fill(0x4499dd);
      g.circle(cx, y + 10, 4).fill(0xffcc44);
      g.circle(x + 24, y + 16, 4).fill(0x4499dd);
      g.moveTo(x + 6, y + 22).lineTo(x + 26, y + 22).stroke({ width: 2, color: 0x886644 });
      break;
    case "class_archer_r":
      g.circle(cx, cy + 6, 7).stroke({ width: 2, color: 0xff8844, alpha: 0.7 });
      g.moveTo(cx, cy - 12).lineTo(cx, cy + 2).stroke({ width: 3, color: 0xffcc88, alpha: 0.8 });
      g.moveTo(cx - 3, cy - 10).lineTo(cx + 3, cy - 10).lineTo(cx, cy - 6).fill(0xff8844);
      break;
    default:
      g.rect(x + 6, y + 6, 20, 20).fill(0x888899);
  }
}

export function drawSkillSlotIcon(g: Graphics, ready: boolean): void {
  g.clear();
  g.roundRect(-20, -20, 40, 40, 5).fill(UI.skillSlot);
  g.roundRect(-20, -20, 40, 40, 5).stroke({
    width: 2,
    color: ready ? UI.cardSelected : UI.skillBorder,
  });
  g.circle(0, 0, ready ? 8 : 6).fill(ready ? UI.textGreen : UI.textMuted);
}

const MENU_REF_W = 712;
const MENU_REF_H = 152;
const MENU_FRAME = 12;

export function drawMenuButtonBg(
  bg: Graphics,
  width: number,
  height: number,
  selected: boolean,
): void {
  bg.clear();
  const sx = width / MENU_REF_W;
  const sy = height / MENU_REF_H;
  const thickX = Math.max(2, MENU_FRAME * sx);
  const thickY = Math.max(thickX, MENU_FRAME * sy);

  bg.rect(0, 0, width, thickY).fill({ color: UI.menuBorderHi, alpha: 0.72 });
  bg.rect(0, height - thickY, width, thickY).fill({ color: UI.menuBorder, alpha: 0.78 });
  bg.rect(0, 0, thickX, height).fill({ color: UI.menuBorderHi, alpha: 0.65 });
  bg.rect(width - thickX, 0, thickX, height).fill({ color: UI.menuBorder, alpha: 0.72 });
  bg.rect(0, 0, width, height).stroke({ width: 2, color: UI.menuBorder, alpha: 0.88 });

  if (!selected) return;

  const inset = 5 * sx;
  const armX = 33 * sx;
  const armY = 33 * sy;
  bg.rect(inset, inset, armX, thickY).fill(UI.menuSelected);
  bg.rect(inset, inset, thickX, armY).fill(UI.menuSelected);
  bg.rect(width - inset - armX, inset, armX, thickY).fill(UI.menuSelected);
  bg.rect(width - inset - thickX, inset, thickX, armY).fill(UI.menuSelected);
  bg.rect(inset, height - inset - thickY, armX, thickY).fill(UI.menuSelected);
  bg.rect(inset, height - inset - armY, thickX, armY).fill(UI.menuSelected);
  bg.rect(width - inset - armX, height - inset - thickY, armX, thickY).fill(UI.menuSelected);
  bg.rect(width - inset - thickX, height - inset - armY, thickX, armY).fill(UI.menuSelected);
}

export function drawPanelFrame(g: Graphics, w: number, h: number): void {
  g.clear();
  g.rect(0, 0, w, h).fill(UI.cardBg);
  g.rect(2, 2, w - 4, h - 4).fill(UI.cardInner);
  g.rect(0, 0, w, h).stroke({ width: 2, color: UI.cardBorder, alpha: 0.95 });
}
