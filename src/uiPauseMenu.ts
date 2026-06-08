import { Container, Graphics, Text } from "pixi.js";
import { isSkillUpgrade, SKILL_UPGRADE_IDS } from "./bonusSkills";
import {
  SHOP_ITEMS,
  UPGRADES,
  type CharacterDef,
  type CharacterId,
  type ShopItemId,
  type UpgradeId,
} from "./data";
import {
  drawCoinIcon,
  drawMenuButtonBg,
  drawPanelFrame,
  drawUpgradeCardBg,
  drawUpgradeIcon,
  drawUpgradeIconFrame,
  statIconAccent,
  type StatIconId,
} from "./uiDraw";
import { FONT, titleStyle, UI } from "./uiTheme";
import { formatTime, setClickHitArea } from "./util";

const ROW_H = 40;
const ICON_BOX = 34;
const COL_W = 320;
const MAX_UPGRADE_ROWS = 7;

type ClassSkillSlot = "q" | "r";

function classSkillIcon(charId: CharacterId, slot: ClassSkillSlot): StatIconId {
  return `class_${charId}_${slot}` as StatIconId;
}

function drawLoadoutRow(
  row: Container,
  iconId: StatIconId | null,
  name: string,
  detail: string,
  rowW: number,
  accent?: number,
): void {
  row.removeChildren();

  const rowAccent = accent ?? (iconId ? statIconAccent(iconId) : UI.coin);
  const bg = new Graphics();
  drawUpgradeCardBg(bg, rowW, ROW_H - 4, false, rowAccent);
  row.addChild(bg);

  const iconCx = 22;
  const iconCy = (ROW_H - 4) / 2;
  if (iconId) {
    const color = accent ?? statIconAccent(iconId);
    const iconFrame = new Graphics();
    const icon = new Graphics();
    const iconClip = new Graphics();
    drawUpgradeIconFrame(iconFrame, iconCx, iconCy, ICON_BOX, color, false);
    drawUpgradeIcon(icon, iconId, iconCx, iconCy);
    iconClip
      .rect(iconCx - ICON_BOX / 2 + 3, iconCy - ICON_BOX / 2 + 3, ICON_BOX - 6, ICON_BOX - 6)
      .fill(0xffffff);
    icon.mask = iconClip;
    row.addChild(iconClip, iconFrame, icon);
  } else {
    const coin = new Graphics();
    drawCoinIcon(coin, iconCx, iconCy, 10);
    row.addChild(coin);
  }

  const title = new Text({
    text: name,
    style: {
      fill: UI.textPrimary,
      fontSize: 13,
      fontFamily: FONT,
      fontWeight: "bold",
    },
  });
  title.position.set(46, 5);

  const tag = new Text({
    text: detail,
    style: {
      fill: UI.cardSelectedGlow,
      fontSize: 10,
      fontFamily: FONT,
      letterSpacing: 0.5,
    },
  });
  tag.position.set(rowW - tag.width - 10, 8);

  row.addChild(title, tag);
}

function sectionLabel(text: string, x: number, y: number, parent: Container): void {
  const label = new Text({
    text,
    style: {
      fill: UI.textMuted,
      fontSize: 11,
      fontFamily: FONT,
      fontWeight: "bold",
      letterSpacing: 1,
    },
  });
  label.position.set(x, y);
  parent.addChild(label);
}

function emptyNote(text: string, x: number, y: number, parent: Container): void {
  const note = new Text({
    text,
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
  });
  note.position.set(x, y);
  parent.addChild(note);
}

export interface PauseMenuData {
  character: CharacterDef;
  difficultyName: string;
  playerLevel: number;
  wave: number;
  gameTime: number;
  kills: number;
  runGold: number;
  upgradeLevels: Partial<Record<UpgradeId, number>>;
  runShopBuffs: Record<ShopItemId, boolean>;
}

export function buildPauseMenu(
  w: number,
  h: number,
  data: PauseMenuData,
  focus: number,
  onResume: () => void,
  onRestart: () => void,
  onMainMenu: () => void,
): Container {
  const pw = 740;
  const ph = 540;
  const c = new Container();

  const dim = new Graphics();
  dim.rect(0, 0, w, h).fill({ color: UI.overlay, alpha: 0.78 });
  dim.eventMode = "static";
  c.addChild(dim);

  const box = new Graphics();
  drawPanelFrame(box, pw, ph);
  box.position.set(w / 2 - pw / 2, h / 2 - ph / 2);
  c.addChild(box);

  const oy = h / 2 - ph / 2;
  const ox = w / 2 - pw / 2;

  const title = new Text({ text: "Paused", style: titleStyle });
  title.anchor.set(0.5);
  title.position.set(w / 2, oy + 32);
  c.addChild(title);

  const stats1 = new Text({
    text: `${data.character.name}  ·  ${data.difficultyName}  ·  Lv ${data.playerLevel}  ·  Wave ${data.wave}`,
    style: { fill: UI.textPrimary, fontSize: 13, fontFamily: FONT },
  });
  stats1.anchor.set(0.5);
  stats1.position.set(w / 2, oy + 62);
  c.addChild(stats1);

  const stats2 = new Text({
    text: `${formatTime(data.gameTime)}  ·  ${data.kills} kills  ·  ${data.runGold} gold`,
    style: { fill: UI.textMuted, fontSize: 12, fontFamily: FONT },
  });
  stats2.anchor.set(0.5);
  stats2.position.set(w / 2, oy + 82);
  c.addChild(stats2);

  const contentTop = oy + 108;
  const leftX = ox + 28;
  const rightX = ox + pw / 2 + 12;

  sectionLabel("SKILLS", leftX, contentTop, c);
  sectionLabel("UPGRADES", rightX, contentTop, c);

  const listTop = contentTop + 22;
  const skillsCol = new Container();
  skillsCol.position.set(leftX, listTop);
  c.addChild(skillsCol);

  const skillEntries: { iconId: StatIconId; name: string; detail: string }[] = [
    {
      iconId: classSkillIcon(data.character.id, "q"),
      name: data.character.skillQ.name,
      detail: "Q",
    },
    {
      iconId: classSkillIcon(data.character.id, "r"),
      name: data.character.skillR.name,
      detail: "R",
    },
  ];

  for (const id of SKILL_UPGRADE_IDS) {
    const level = data.upgradeLevels[id] ?? 0;
    if (level <= 0) continue;
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) continue;
    skillEntries.push({
      iconId: id,
      name: def.name,
      detail: `Lv ${level}`,
    });
  }

  skillEntries.forEach((entry, i) => {
    const row = new Container();
    row.position.set(0, i * ROW_H);
    drawLoadoutRow(row, entry.iconId, entry.name, entry.detail, COL_W);
    skillsCol.addChild(row);
  });

  const upgradesCol = new Container();
  upgradesCol.position.set(rightX, listTop);
  c.addChild(upgradesCol);

  const upgradeEntries: { iconId: StatIconId | null; name: string; detail: string }[] = [];
  for (const def of UPGRADES) {
    if (isSkillUpgrade(def.id)) continue;
    const level = data.upgradeLevels[def.id] ?? 0;
    if (level <= 0) continue;
    upgradeEntries.push({
      iconId: def.id,
      name: def.name,
      detail: `Lv ${level}`,
    });
  }

  for (const item of SHOP_ITEMS) {
    if (!data.runShopBuffs[item.id]) continue;
    upgradeEntries.push({
      iconId: null,
      name: item.name,
      detail: "Shop",
    });
  }

  if (upgradeEntries.length === 0) {
    emptyNote("No upgrades yet", 0, 8, upgradesCol);
  } else {
    const visible = upgradeEntries.slice(0, MAX_UPGRADE_ROWS);
    visible.forEach((entry, i) => {
      const row = new Container();
      row.position.set(0, i * ROW_H);
      const accent = entry.detail === "Shop" ? UI.coin : undefined;
      drawLoadoutRow(row, entry.iconId, entry.name, entry.detail, COL_W, accent);
      upgradesCol.addChild(row);
    });
    const overflow = upgradeEntries.length - visible.length;
    if (overflow > 0) {
      emptyNote(`+${overflow} more`, 0, visible.length * ROW_H + 4, upgradesCol);
    }
  }

  const buttons = [
    { label: "RESUME", action: onResume },
    { label: "RESTART", action: onRestart },
    { label: "MAIN MENU", action: onMainMenu },
  ];

  const btnY = oy + ph - 96;
  const btnGap = 12;
  let btnX = w / 2;
  const btnWidths: number[] = [];

  for (const item of buttons) {
    const label = new Text({
      text: item.label,
      style: {
        fill: UI.textPrimary,
        fontSize: item.label.length > 8 ? 18 : 22,
        fontFamily: FONT,
        letterSpacing: 2,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 2 },
      },
    });
    btnWidths.push(label.width + 56);
  }

  const totalBtnW =
    btnWidths.reduce((sum, bw) => sum + bw, 0) + btnGap * (buttons.length - 1);
  btnX = w / 2 - totalBtnW / 2;

  buttons.forEach((item, i) => {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const g = new Graphics();
    const text = new Text({
      text: item.label,
      style: {
        fill: UI.textPrimary,
        fontSize: item.label.length > 8 ? 18 : 22,
        fontFamily: FONT,
        letterSpacing: 2,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: focus === i ? 3 : 2 },
      },
    });
    text.anchor.set(0.5);
    const padX = 28;
    const padY = 14;
    const btnW = text.width + padX * 2;
    const btnH = text.height + padY * 2;
    drawMenuButtonBg(g, btnW, btnH, focus === i);
    text.position.set(btnW / 2, btnH / 2);
    btn.addChild(g, text);
    setClickHitArea(btn, btnW, btnH);
    btn.position.set(btnX, btnY);
    btn.on("pointertap", item.action);
    c.addChild(btn);
    btnX += btnW + btnGap;
  });

  const hint = new Text({
    text: "← → navigate  ·  Enter select  ·  Esc resume",
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
  });
  hint.anchor.set(0.5);
  hint.position.set(w / 2, oy + ph - 28);
  c.addChild(hint);

  return c;
}
