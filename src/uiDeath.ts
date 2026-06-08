import { Container, Graphics, Text } from "pixi.js";
import { drawPanelFrame, drawMenuButtonBg } from "./uiDraw";
import { FONT, bodyStyle, titleStyle, UI } from "./uiTheme";
import { setClickHitArea } from "./util";

export interface DeathScreenStats {
  heroName: string;
  time: string;
  kills: number;
  gold: number;
  level: number;
  wave: number;
}

export function buildDeathScreen(
  w: number,
  h: number,
  stats: DeathScreenStats,
  onContinue: () => void,
): Container {
  const c = new Container();

  const dim = new Graphics();
  dim.rect(0, 0, w, h).fill({ color: 0x1a0008, alpha: 0.72 });
  dim.rect(0, 0, w, h).fill({ color: 0x880022, alpha: 0.28 });
  dim.eventMode = "static";
  dim.on("pointertap", onContinue);
  c.addChild(dim);

  const vignette = new Graphics();
  const pad = Math.max(w, h) * 0.08;
  vignette.rect(0, 0, w, pad).fill({ color: 0x000000, alpha: 0.55 });
  vignette.rect(0, h - pad, w, pad).fill({ color: 0x000000, alpha: 0.55 });
  vignette.rect(0, 0, pad, h).fill({ color: 0x000000, alpha: 0.45 });
  vignette.rect(w - pad, 0, pad, h).fill({ color: 0x000000, alpha: 0.45 });
  c.addChild(vignette);

  const skull = new Graphics();
  skull.circle(w / 2, h * 0.28, 28).fill({ color: 0x221418, alpha: 0.9 });
  skull.circle(w / 2 - 10, h * 0.28 - 4, 6).fill(0xff4455);
  skull.circle(w / 2 + 10, h * 0.28 - 4, 6).fill(0xff4455);
  skull.moveTo(w / 2 - 8, h * 0.28 + 10)
    .lineTo(w / 2, h * 0.28 + 18)
    .lineTo(w / 2 + 8, h * 0.28 + 10)
    .stroke({ width: 2, color: 0xff6677 });
  c.addChild(skull);

  const title = new Text({
    text: "YOU DIED",
    style: {
      ...titleStyle,
      fill: 0xff4455,
      fontSize: 42,
      letterSpacing: 6,
    },
  });
  title.anchor.set(0.5);
  title.position.set(w / 2, h * 0.42);
  c.addChild(title);

  const hero = new Text({
    text: stats.heroName,
    style: {
      fill: UI.textMuted,
      fontSize: 16,
      fontFamily: FONT,
      letterSpacing: 3,
    },
  });
  hero.anchor.set(0.5);
  hero.position.set(w / 2, h * 0.5);
  c.addChild(hero);

  const box = new Graphics();
  const pw = 420;
  const ph = 160;
  drawPanelFrame(box, pw, ph);
  box.position.set(w / 2 - pw / 2, h * 0.54);
  c.addChild(box);

  const statsText = new Text({
    text:
      `Time survived: ${stats.time}\n` +
      `Wave reached: ${stats.wave}\n` +
      `Kills: ${stats.kills}\n` +
      `Gold earned: ${stats.gold}\n` +
      `Level: ${stats.level}`,
    style: {
      fill: UI.textPrimary,
      fontSize: 14,
      fontFamily: FONT,
      align: "center",
      lineHeight: 24,
    },
  });
  statsText.anchor.set(0.5);
  statsText.position.set(w / 2, h * 0.54 + ph / 2);
  c.addChild(statsText);

  const hint = new Text({
    text: "Press Enter or tap to continue",
    style: { fill: UI.textDim, fontSize: 12, fontFamily: FONT },
  });
  hint.anchor.set(0.5);
  hint.position.set(w / 2, h * 0.82);
  c.addChild(hint);

  return c;
}

export function buildDeathSummaryOverlay(
  w: number,
  h: number,
  stats: DeathScreenStats,
  onDone: () => void,
): Container {
  const c = new Container();

  const dim = new Graphics();
  dim.rect(0, 0, w, h).fill({ color: UI.overlay, alpha: 0.55 });
  dim.eventMode = "static";
  c.addChild(dim);

  const pw = 480;
  const ph = 300;
  const ox = w / 2 - pw / 2;
  const oy = h / 2 - ph / 2;

  const box = new Graphics();
  drawPanelFrame(box, pw, ph);
  box.position.set(ox, oy);
  c.addChild(box);

  const title = new Text({
    text: "Run Complete",
    style: titleStyle,
  });
  title.anchor.set(0.5);
  title.position.set(w / 2, oy + 42);
  c.addChild(title);

  const summary = new Text({
    text:
      `${stats.heroName} fell on wave ${stats.wave}.\n\n` +
      `${stats.time} survived  ·  ${stats.kills} kills\n` +
      `${stats.gold} gold  ·  Level ${stats.level}`,
    style: {
      ...bodyStyle,
      fontSize: 14,
      lineHeight: 26,
    },
  });
  summary.anchor.set(0.5);
  summary.position.set(w / 2, oy + 130);
  c.addChild(summary);

  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";
  const btnG = new Graphics();
  const btnLabel = new Text({
    text: "DONE",
    style: {
      fill: UI.textPrimary,
      fontSize: 24,
      fontFamily: FONT,
      letterSpacing: 3,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 3 },
    },
  });
  btnLabel.anchor.set(0.5);
  const padX = 28;
  const padY = 16;
  const btnW = btnLabel.width + padX * 2;
  const btnH = btnLabel.height + padY * 2;
  drawMenuButtonBg(btnG, btnW, btnH, true);
  btnLabel.position.set(btnW / 2, btnH / 2);
  btn.addChild(btnG, btnLabel);
  setClickHitArea(btn, btnW, btnH);
  btn.position.set(w / 2 - btnW / 2, oy + ph - btnH - 28);
  btn.on("pointertap", onDone);
  c.addChild(btn);

  return c;
}
