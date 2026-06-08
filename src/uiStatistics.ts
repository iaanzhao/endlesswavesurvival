import { Container, Graphics, Text, type FederatedWheelEvent } from "pixi.js";
import {
  createEnemyGraphic,
  scaleEnemyForStatIcon,
  updateEnemyAnimation,
} from "./enemies";
import {
  ENEMY_STAT_ENTRIES,
  MAP_STAT_ENTRIES,
  SKILL_STAT_ENTRIES,
  STAT_TABS,
  TERRAIN_STAT_ENTRIES,
  getStatEntryCount,
  type EnemyStatEntry,
  type MapStatEntry,
  type SkillStatEntry,
  type StatTab,
  type TerrainStatEntry,
} from "./statCatalog";
import { getMap } from "./data";
import { drawMapPreview } from "./uiMapPreview";
import {
  drawMenuButtonBg,
  drawPanelFrame,
  drawUpgradeCardBg,
  drawUpgradeIcon,
  drawUpgradeIconFrame,
  statIconAccent,
} from "./uiDraw";
import { FONT, titleStyle, UI } from "./uiTheme";
import { setClickHitArea } from "./util";

const ROW_H = 58;
const VISIBLE_ROWS = 6;
const ICON_BOX = 40;

export function getStatScrollMax(tab: StatTab): number {
  return Math.max(0, getStatEntryCount(tab) - VISIBLE_ROWS);
}

function drawSkillStatRow(
  row: Container,
  entry: SkillStatEntry,
  rowW: number,
  focused: boolean,
): void {
  row.removeChildren();

  const accent = statIconAccent(entry.iconId);
  const bg = new Graphics();
  drawUpgradeCardBg(bg, rowW, ROW_H - 4, focused, accent);
  row.addChild(bg);

  const iconFrame = new Graphics();
  const icon = new Graphics();
  const iconClip = new Graphics();
  const iconCx = 28;
  const iconCy = (ROW_H - 4) / 2;
  drawUpgradeIconFrame(iconFrame, iconCx, iconCy, ICON_BOX, accent, focused);
  drawUpgradeIcon(icon, entry.iconId, iconCx, iconCy);
  iconClip
    .rect(iconCx - ICON_BOX / 2 + 3, iconCy - ICON_BOX / 2 + 3, ICON_BOX - 6, ICON_BOX - 6)
    .fill(0xffffff);
  icon.mask = iconClip;
  row.addChild(iconClip, iconFrame, icon);

  const badge =
    entry.category === "class" && entry.hero && entry.slot
      ? `${entry.hero} · ${entry.slot}`
      : "Bonus upgrade";

  const title = new Text({
    text: entry.name,
    style: {
      fill: UI.textPrimary,
      fontSize: 15,
      fontFamily: FONT,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: focused ? 3 : 2 },
    },
  });
  title.position.set(56, 6);

  const tag = new Text({
    text: badge,
    style: {
      fill: UI.cardSelectedGlow,
      fontSize: 10,
      fontFamily: FONT,
      letterSpacing: 1,
    },
  });
  tag.position.set(rowW - tag.width - 10, 8);

  const desc = new Text({
    text: entry.desc,
    style: { fill: UI.textMuted, fontSize: 11, fontFamily: FONT },
  });
  desc.position.set(56, 24);

  const statsLine = new Text({
    text: `DMG ${entry.damage}   CD ${entry.cooldown}   Range ${entry.range}`,
    style: { fill: UI.textGreen, fontSize: 10, fontFamily: FONT },
  });
  statsLine.position.set(56, 38);

  row.addChild(title, tag, desc, statsLine);

  if (entry.extra) {
    const extra = new Text({
      text: entry.extra,
      style: { fill: UI.textDim, fontSize: 9, fontFamily: FONT },
    });
    extra.position.set(rowW - extra.width - 10, 38);
    row.addChild(extra);
  }
}

function drawMapStatRow(
  row: Container,
  entry: MapStatEntry,
  rowW: number,
  focused: boolean,
): void {
  row.removeChildren();

  const bg = new Graphics();
  drawUpgradeCardBg(bg, rowW, ROW_H - 4, focused, entry.accentColor);
  row.addChild(bg);

  const preview = new Graphics();
  drawMapPreview(preview, getMap(entry.id), 6, 5, 44, ROW_H - 14);
  row.addChild(preview);

  const tag = new Text({
    text: "Map",
    style: {
      fill: UI.cardSelectedGlow,
      fontSize: 10,
      fontFamily: FONT,
      letterSpacing: 1,
    },
  });
  tag.position.set(rowW - tag.width - 10, 8);

  const title = new Text({
    text: entry.name,
    style: {
      fill: UI.textPrimary,
      fontSize: 15,
      fontFamily: FONT,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: focused ? 3 : 2 },
    },
  });
  title.position.set(56, 6);

  const desc = new Text({
    text: entry.desc,
    style: { fill: UI.textMuted, fontSize: 11, fontFamily: FONT },
  });
  desc.position.set(56, 24);

  const statsLine = new Text({
    text: `${entry.terrain}   ·   ${entry.arena}`,
    style: { fill: UI.textGreen, fontSize: 10, fontFamily: FONT },
  });
  statsLine.position.set(56, 38);

  row.addChild(title, tag, desc, statsLine);

  if (entry.extra) {
    const extra = new Text({
      text: entry.extra,
      style: { fill: UI.textDim, fontSize: 9, fontFamily: FONT },
    });
    extra.position.set(rowW - extra.width - 10, 38);
    row.addChild(extra);
  }
}

function drawEnemyStatRow(
  row: Container,
  entry: EnemyStatEntry,
  rowW: number,
  focused: boolean,
): void {
  row.removeChildren();

  const bg = new Graphics();
  drawUpgradeCardBg(bg, rowW, ROW_H - 4, focused, entry.accent);
  row.addChild(bg);

  const iconFrame = new Graphics();
  const iconCx = 28;
  const iconCy = (ROW_H - 4) / 2;
  drawUpgradeIconFrame(iconFrame, iconCx, iconCy, ICON_BOX, entry.accent, focused);

  const { container: enemyGfx, healthBar } = createEnemyGraphic(entry.kind);
  healthBar.visible = false;
  const previewPhase = entry.kind === "bat" ? 0.35 : entry.kind === "ghost" ? 0.6 : 0;
  updateEnemyAnimation(entry.kind, enemyGfx, previewPhase, 0, false, 0, 0);
  const iconScale = scaleEnemyForStatIcon(entry.kind, ICON_BOX);
  enemyGfx.scale.set(iconScale);
  enemyGfx.position.set(iconCx, iconCy + 2);

  const iconClip = new Graphics();
  iconClip
    .rect(iconCx - ICON_BOX / 2 + 3, iconCy - ICON_BOX / 2 + 3, ICON_BOX - 6, ICON_BOX - 6)
    .fill(0xffffff);
  enemyGfx.mask = iconClip;

  row.addChild(iconClip, iconFrame, enemyGfx);

  const title = new Text({
    text: entry.name,
    style: {
      fill: UI.textPrimary,
      fontSize: 15,
      fontFamily: FONT,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: focused ? 3 : 2 },
    },
  });
  title.position.set(56, 6);

  const tag = new Text({
    text: entry.tag,
    style: {
      fill: UI.cardSelectedGlow,
      fontSize: 10,
      fontFamily: FONT,
      letterSpacing: 1,
    },
  });
  tag.position.set(rowW - tag.width - 10, 8);

  const desc = new Text({
    text: entry.desc,
    style: { fill: UI.textMuted, fontSize: 11, fontFamily: FONT },
  });
  desc.position.set(56, 24);

  const statsLine = new Text({
    text: `HP ${entry.hp}   DMG ${entry.damage}   SPD ${entry.speed}   ${entry.rewards}`,
    style: { fill: UI.textGreen, fontSize: 10, fontFamily: FONT },
  });
  statsLine.position.set(56, 38);

  row.addChild(title, tag, desc, statsLine);

  if (entry.extra) {
    const extra = new Text({
      text: entry.extra,
      style: { fill: UI.textDim, fontSize: 9, fontFamily: FONT },
    });
    extra.position.set(rowW - extra.width - 10, 38);
    row.addChild(extra);
  }
}

function drawTerrainStatIcon(g: Graphics, entry: TerrainStatEntry, cx: number, cy: number): void {
  g.clear();
  g.circle(cx, cy, 15).fill({ color: entry.accentColor, alpha: 0.25 });
  switch (entry.kind) {
    case "fissure": {
      g.moveTo(cx - 10, cy).lineTo(cx, cy - 3).lineTo(cx + 10, cy)
        .stroke({ width: 2.5, color: 0xffaa44, alpha: 0.9 });
      g.circle(cx, cy, 4).fill({ color: 0xffee88, alpha: 0.8 });
      break;
    }
    case "crystal": {
      g.moveTo(cx, cy - 10).lineTo(cx + 7, cy + 2).lineTo(cx, cy + 10).lineTo(cx - 7, cy + 2)
        .closePath()
        .fill(0x88ccff);
      g.moveTo(cx, cy - 6).lineTo(cx + 4, cy + 1).lineTo(cx, cy + 6).lineTo(cx - 4, cy + 1)
        .closePath()
        .fill(0xccffff);
      break;
    }
    case "rift": {
      g.ellipse(cx, cy, 11, 5).fill({ color: 0x220033, alpha: 0.85 });
      g.ellipse(cx, cy, 11, 5).stroke({ width: 1.5, color: 0xdd99ff, alpha: 0.8 });
      g.circle(cx, cy, 3).fill({ color: 0xffffff, alpha: 0.55 });
      break;
    }
  }
}

function drawTerrainStatRow(
  row: Container,
  entry: TerrainStatEntry,
  rowW: number,
  focused: boolean,
): void {
  row.removeChildren();

  const bg = new Graphics();
  drawUpgradeCardBg(bg, rowW, ROW_H - 4, focused, entry.accentColor);
  row.addChild(bg);

  const iconFrame = new Graphics();
  const icon = new Graphics();
  const iconCx = 28;
  const iconCy = (ROW_H - 4) / 2;
  drawUpgradeIconFrame(iconFrame, iconCx, iconCy, ICON_BOX, entry.accentColor, focused);
  drawTerrainStatIcon(icon, entry, iconCx, iconCy);
  row.addChild(iconFrame, icon);

  const title = new Text({
    text: entry.name,
    style: {
      fill: UI.textPrimary,
      fontSize: 15,
      fontFamily: FONT,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: focused ? 3 : 2 },
    },
  });
  title.position.set(56, 6);

  const tag = new Text({
    text: entry.mapName,
    style: {
      fill: UI.cardSelectedGlow,
      fontSize: 10,
      fontFamily: FONT,
      letterSpacing: 1,
    },
  });
  tag.position.set(rowW - tag.width - 10, 8);

  const desc = new Text({
    text: entry.desc,
    style: { fill: UI.textMuted, fontSize: 11, fontFamily: FONT },
  });
  desc.position.set(56, 24);

  const statsLine = new Text({
    text: entry.effect,
    style: { fill: UI.textGreen, fontSize: 10, fontFamily: FONT },
  });
  statsLine.position.set(56, 38);

  const extra = new Text({
    text: entry.extra ?? `${entry.activation} · ${entry.cooldown}`,
    style: { fill: UI.textDim, fontSize: 9, fontFamily: FONT },
  });
  extra.position.set(rowW - extra.width - 10, 38);

  row.addChild(title, tag, desc, statsLine, extra);
}

function drawStatRow(
  row: Container,
  tab: StatTab,
  index: number,
  rowW: number,
  focused: boolean,
): void {
  switch (tab) {
    case "skills":
      drawSkillStatRow(row, SKILL_STAT_ENTRIES[index], rowW, focused);
      break;
    case "maps":
      drawMapStatRow(row, MAP_STAT_ENTRIES[index], rowW, focused);
      break;
    case "enemies":
      drawEnemyStatRow(row, ENEMY_STAT_ENTRIES[index], rowW, focused);
      break;
    case "terrain":
      drawTerrainStatRow(row, TERRAIN_STAT_ENTRIES[index], rowW, focused);
      break;
  }
}

function tabFooter(tab: StatTab): string {
  switch (tab) {
    case "skills": {
      const classCount = SKILL_STAT_ENTRIES.filter((e) => e.category === "class").length;
      const bonusCount = SKILL_STAT_ENTRIES.filter((e) => e.category === "bonus").length;
      return `${classCount} class skills · ${bonusCount} bonus skills`;
    }
    case "maps":
      return `${MAP_STAT_ENTRIES.length} playable arenas`;
    case "enemies":
      return `${ENEMY_STAT_ENTRIES.length} enemy types · base wave 1 stats`;
    case "terrain":
      return `${TERRAIN_STAT_ENTRIES.length} interactive features · Ember · Frost · Void`;
  }
}

function tabSubtitle(tab: StatTab): string {
  switch (tab) {
    case "skills":
      return "Base values before run upgrades";
    case "maps":
      return "Arena themes selectable in New Game";
    case "enemies":
      return "Contact damage · HP scales each wave";
    case "terrain":
      return "Map hazards and pickups you can trigger";
  }
}

export function buildStatisticsPanel(
  w: number,
  h: number,
  tab: StatTab,
  scroll: number,
  onBack: () => void,
  onScroll: (deltaY: number) => void,
  onTabChange: (tab: StatTab) => void,
): Container {
  const pw = 760;
  const ph = 580;
  const c = new Container();
  const scrollMax = getStatScrollMax(tab);
  const entryCount = getStatEntryCount(tab);

  const dim = new Graphics();
  dim.rect(0, 0, w, h).fill({ color: UI.overlay, alpha: 0.78 });
  dim.eventMode = "static";
  c.addChild(dim);

  const box = new Graphics();
  drawPanelFrame(box, pw, ph);
  box.position.set(w / 2 - pw / 2, h / 2 - ph / 2);
  c.addChild(box);

  const ox = w / 2 - pw / 2;
  const oy = h / 2 - ph / 2;

  const title = new Text({
    text: "Statistics",
    style: titleStyle,
  });
  title.anchor.set(0.5);
  title.position.set(w / 2, oy + 36);
  c.addChild(title);

  const subtitle = new Text({
    text: `${tabSubtitle(tab)} · ↑↓ or scroll wheel`,
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
  });
  subtitle.anchor.set(0.5);
  subtitle.position.set(w / 2, oy + 62);
  c.addChild(subtitle);

  const tabBarY = oy + 82;
  const tabW = 118;
  const tabGap = 10;
  const totalTabW = STAT_TABS.length * tabW + (STAT_TABS.length - 1) * tabGap;
  const tabStartX = w / 2 - totalTabW / 2;

  STAT_TABS.forEach((t, i) => {
    const active = tab === t.id;
    const tabBtn = new Container();
    tabBtn.eventMode = "static";
    tabBtn.cursor = "pointer";
    const g = new Graphics();
    drawUpgradeCardBg(g, tabW, 34, active, UI.cardSelectedGlow);
    const label = new Text({
      text: t.label,
      style: {
        fill: active ? UI.textPrimary : UI.textMuted,
        fontSize: 13,
        fontFamily: FONT,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: active ? 3 : 2 },
      },
    });
    label.anchor.set(0.5);
    label.position.set(tabW / 2, 17);
    tabBtn.addChild(g, label);
    setClickHitArea(tabBtn, tabW, 34);
    tabBtn.position.set(tabStartX + i * (tabW + tabGap), tabBarY);
    tabBtn.on("pointertap", () => onTabChange(t.id));
    c.addChild(tabBtn);
  });

  const listW = pw - 48;
  const listTop = oy + 126;
  const listH = VISIBLE_ROWS * ROW_H;

  const list = new Container();
  list.position.set(ox + 24, listTop);
  c.addChild(list);

  const clampedScroll = Math.max(0, Math.min(scrollMax, scroll));
  for (let i = 0; i < entryCount; i++) {
    const rowIndex = i - clampedScroll;
    if (rowIndex < 0 || rowIndex >= VISIBLE_ROWS) continue;

    const row = new Container();
    row.position.set(0, rowIndex * ROW_H);
    drawStatRow(row, tab, i, listW, false);
    list.addChild(row);
  }

  const scrollZone = new Graphics();
  scrollZone
    .rect(ox + 16, listTop - 4, pw - 32, listH + 8)
    .fill({ color: 0xffffff, alpha: 0.001 });
  scrollZone.eventMode = "static";
  scrollZone.cursor = "default";
  scrollZone.on("wheel", (e: FederatedWheelEvent) => {
    e.preventDefault();
    if (e.deltaY !== 0) onScroll(e.deltaY);
  });
  c.addChild(scrollZone);

  if (scrollMax > 0) {
    const trackH = listH - 16;
    const thumbH = Math.max(24, trackH * (VISIBLE_ROWS / entryCount));
    const thumbY = listTop + 8 + (trackH - thumbH) * (clampedScroll / scrollMax);
    const scrollbar = new Graphics();
    scrollbar.rect(ox + pw - 18, listTop + 8, 4, trackH).fill({ color: UI.textDim, alpha: 0.35 });
    scrollbar.rect(ox + pw - 18, thumbY, 4, thumbH).fill(UI.cardSelected);
    c.addChild(scrollbar);
  }

  const footer = new Text({
    text: tabFooter(tab),
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
  });
  footer.anchor.set(0.5);
  footer.position.set(w / 2, listTop + listH + 10);
  c.addChild(footer);

  const tabHint = new Text({
    text: "← → switch tab · 1–4 jump to tab",
    style: { fill: UI.textDim, fontSize: 10, fontFamily: FONT },
  });
  tabHint.anchor.set(0.5);
  tabHint.position.set(w / 2, listTop + listH + 28);
  c.addChild(tabHint);

  const back = new Container();
  back.eventMode = "static";
  back.cursor = "pointer";
  const backG = new Graphics();
  const backLabel = new Text({
    text: "BACK",
    style: {
      fill: UI.textPrimary,
      fontSize: 24,
      fontFamily: FONT,
      letterSpacing: 3,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 3 },
    },
  });
  backLabel.anchor.set(0.5);
  const padX = 28;
  const padY = 16;
  const btnW = backLabel.width + padX * 2;
  const btnH = backLabel.height + padY * 2;
  drawMenuButtonBg(backG, btnW, btnH, true);
  backLabel.position.set(btnW / 2, btnH / 2);
  back.addChild(backG, backLabel);
  setClickHitArea(back, btnW, btnH);
  back.position.set(w / 2 - btnW / 2, oy + ph - btnH - 20);
  back.on("pointertap", onBack);
  c.addChild(back);

  return c;
}
