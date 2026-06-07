import { Container, Graphics, Text } from "pixi.js";
import { SKILL_STAT_ENTRIES, type SkillStatEntry } from "./statCatalog";
import {
  drawMenuButtonBg,
  drawPanelFrame,
  drawUpgradeIcon,
  drawUpgradeIconFrame,
  statIconAccent,
} from "./uiDraw";
import { FONT, titleStyle, UI } from "./uiTheme";
import { setClickHitArea } from "./util";

const ROW_H = 58;
const VISIBLE_ROWS = 6;
const ICON_BOX = 40;

export const STATS_SCROLL_MAX = Math.max(0, SKILL_STAT_ENTRIES.length - VISIBLE_ROWS);

function drawStatRow(
  row: Container,
  entry: SkillStatEntry,
  rowW: number,
  focused: boolean,
): void {
  row.removeChildren();

  const bg = new Graphics();
  drawPanelFrame(bg, rowW, ROW_H - 4);
  if (focused) {
    bg.rect(0, 0, rowW, ROW_H - 4).stroke({ width: 2, color: UI.cardSelected });
  }
  row.addChild(bg);

  const iconFrame = new Graphics();
  const icon = new Graphics();
  const iconCx = 28;
  const iconCy = (ROW_H - 4) / 2;
  const accent = statIconAccent(entry.iconId);
  drawUpgradeIconFrame(iconFrame, iconCx, iconCy, ICON_BOX, accent, focused);
  drawUpgradeIcon(icon, entry.iconId, iconCx, iconCy);
  row.addChild(iconFrame, icon);

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
    style: {
      fill: UI.textMuted,
      fontSize: 11,
      fontFamily: FONT,
    },
  });
  desc.position.set(56, 24);

  const statsLine = new Text({
    text: `DMG ${entry.damage}   CD ${entry.cooldown}   Range ${entry.range}`,
    style: {
      fill: UI.textGreen,
      fontSize: 10,
      fontFamily: FONT,
    },
  });
  statsLine.position.set(56, 38);

  row.addChild(title, tag, desc, statsLine);

  if (entry.extra) {
    const extra = new Text({
      text: entry.extra,
      style: {
        fill: UI.textDim,
        fontSize: 9,
        fontFamily: FONT,
      },
    });
    extra.position.set(rowW - extra.width - 10, 38);
    row.addChild(extra);
  }
}

export function buildStatisticsPanel(
  w: number,
  h: number,
  scroll: number,
  onBack: () => void,
): Container {
  const pw = 760;
  const ph = 560;
  const c = new Container();

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
    text: "Skill Statistics",
    style: titleStyle,
  });
  title.anchor.set(0.5);
  title.position.set(w / 2, oy + 36);
  c.addChild(title);

  const subtitle = new Text({
    text: "Base values before run upgrades · ↑↓ scroll",
    style: {
      fill: UI.textDim,
      fontSize: 11,
      fontFamily: FONT,
    },
  });
  subtitle.anchor.set(0.5);
  subtitle.position.set(w / 2, oy + 62);
  c.addChild(subtitle);

  const listW = pw - 48;
  const listTop = oy + 82;
  const listH = VISIBLE_ROWS * ROW_H;

  const list = new Container();
  list.position.set(ox + 24, listTop);
  c.addChild(list);

  const clampedScroll = Math.max(0, Math.min(STATS_SCROLL_MAX, scroll));
  SKILL_STAT_ENTRIES.forEach((entry, i) => {
    const rowIndex = i - clampedScroll;
    if (rowIndex < 0 || rowIndex >= VISIBLE_ROWS) return;

    const row = new Container();
    row.position.set(0, rowIndex * ROW_H);
    drawStatRow(row, entry, listW, false);
    list.addChild(row);
  });

  if (STATS_SCROLL_MAX > 0) {
    const trackH = listH - 16;
    const thumbH = Math.max(24, trackH * (VISIBLE_ROWS / SKILL_STAT_ENTRIES.length));
    const thumbY = listTop + 8 + (trackH - thumbH) * (clampedScroll / STATS_SCROLL_MAX);
    const scrollbar = new Graphics();
    scrollbar.rect(ox + pw - 18, listTop + 8, 4, trackH).fill({ color: UI.textDim, alpha: 0.35 });
    scrollbar.rect(ox + pw - 18, thumbY, 4, thumbH).fill(UI.cardSelected);
    c.addChild(scrollbar);
  }

  const sectionY = listTop + listH + 8;
  const classCount = SKILL_STAT_ENTRIES.filter((e) => e.category === "class").length;
  const bonusCount = SKILL_STAT_ENTRIES.filter((e) => e.category === "bonus").length;
  const footer = new Text({
    text: `${classCount} class skills · ${bonusCount} bonus skills`,
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
  });
  footer.anchor.set(0.5);
  footer.position.set(w / 2, sectionY);
  c.addChild(footer);

  const back = new Container();
  back.eventMode = "static";
  back.cursor = "pointer";
  const backG = new Graphics();
  const backLabel = new Text({
    text: "BACK",
    style: {
      fill: UI.menuText,
      fontSize: 28,
      fontFamily: FONT,
      letterSpacing: 3,
      fontWeight: "bold",
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
