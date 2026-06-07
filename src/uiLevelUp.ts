import { Container, Graphics, Text } from "pixi.js";
import { UPGRADES, type UpgradeId } from "./data";
import {
  drawLevelUpHeaderFx,
  drawUpgradeCardBg,
  drawUpgradeIcon,
  drawUpgradeIconFrame,
  drawUpgradeIconGlow,
  drawUpgradeLevelPips,
} from "./uiDraw";
import { CARD_GAP, CARD_H, CARD_W, FONT, titleStyle, UI, UPGRADE_ACCENT } from "./uiTheme";
import { setClickHitArea } from "./util";

interface LevelUpCard {
  slot: Container;
  bg: Graphics;
  glow: Graphics;
  iconFrame: Graphics;
  icon: Graphics;
  divider: Graphics;
  badge: Graphics;
  badgeText: Text;
  title: Text;
  desc: Text;
  levelText: Text;
  pips: Graphics;
  pickId: UpgradeId | null;
}

export function createLevelUpPanel(opts: {
  onPick: (id: UpgradeId) => void;
  getChoices: () => UpgradeId[];
  getFocus: () => number;
  getLevel: () => number;
  getUpgradeLevels: () => Partial<Record<UpgradeId, number>>;
}) {
  const root = new Container();
  root.visible = false;

  const dim = new Graphics();
  const headerFx = new Graphics();
  const title = new Text({ text: "Choose an upgrade", style: titleStyle });
  title.anchor.set(0.5);

  const subtitle = new Text({
    text: "",
    style: {
      fill: UI.cardSelectedGlow,
      fontSize: 15,
      fontFamily: FONT,
      letterSpacing: 2,
      fontWeight: "bold",
    },
  });
  subtitle.anchor.set(0.5);

  const hint = new Text({
    text: "← → pick   ·   Enter confirm   ·   1 2 3 quick select",
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT, letterSpacing: 0.5 },
  });
  hint.anchor.set(0.5);

  const cards: LevelUpCard[] = [0, 1, 2].map(() => {
    const slot = new Container();
    slot.eventMode = "static";
    slot.cursor = "pointer";
    const bg = new Graphics();
    const glow = new Graphics();
    const iconFrame = new Graphics();
    const icon = new Graphics();
    const divider = new Graphics();
    const badge = new Graphics();
    const badgeText = new Text({
      text: "NEW",
      style: {
        fill: UI.textPrimary,
        fontSize: 10,
        fontFamily: FONT,
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    badgeText.anchor.set(0.5);
    const titleText = new Text({
      text: "",
      style: {
        fill: UI.textPrimary,
        fontSize: 17,
        fontFamily: FONT,
        fontWeight: "bold",
        wordWrap: true,
        wordWrapWidth: CARD_W - 28,
        align: "center",
        stroke: { color: 0x000000, width: 3 },
      },
    });
    titleText.anchor.set(0.5, 0);
    const desc = new Text({
      text: "",
      style: {
        fill: UI.textMuted,
        fontSize: 11,
        fontFamily: FONT,
        lineHeight: 16,
        wordWrap: true,
        wordWrapWidth: CARD_W - 28,
        align: "center",
      },
    });
    desc.anchor.set(0.5, 0);
    const levelText = new Text({
      text: "",
      style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT, letterSpacing: 0.5 },
    });
    levelText.anchor.set(0.5, 0);
    const pips = new Graphics();
    slot.addChild(
      bg,
      glow,
      iconFrame,
      icon,
      divider,
      badge,
      badgeText,
      titleText,
      desc,
      pips,
      levelText,
    );
    setClickHitArea(slot, CARD_W, CARD_H);
    return {
      slot,
      bg,
      glow,
      iconFrame,
      icon,
      divider,
      badge,
      badgeText,
      title: titleText,
      desc,
      levelText,
      pips,
      pickId: null as UpgradeId | null,
    };
  });

  cards.forEach((card) => {
    card.slot.on("pointertap", () => {
      if (card.pickId) opts.onPick(card.pickId);
    });
  });

  root.addChild(dim, headerFx, title, subtitle, hint, ...cards.map((c) => c.slot));

  const iconCx = CARD_W / 2;
  const iconCy = 62;
  const iconBox = 76;
  let animPhase = 0;
  let lastFocus = -1;

  function paintCard(card: LevelUpCard, i: number, focus: number, levels: Partial<Record<UpgradeId, number>>) {
    const id = card.pickId!;
    const up = UPGRADES.find((u) => u.id === id)!;
    const lvl = levels[id] ?? 0;
    const selected = focus === i;
    const accent = UPGRADE_ACCENT[id] ?? 0x888899;
    const pulse = selected ? 0.5 + Math.sin(animPhase * 4) * 0.5 : 0;

    card.slot.scale.set(selected ? 1.04 + pulse * 0.015 : 1);

    drawUpgradeCardBg(card.bg, CARD_W, CARD_H, selected, accent, pulse);
    drawUpgradeIconGlow(card.glow, iconCx, iconCy, iconBox, accent, selected, pulse);
    drawUpgradeIconFrame(card.iconFrame, iconCx, iconCy, iconBox, accent, selected);
    drawUpgradeIcon(card.icon, id, iconCx, iconCy);

    card.divider.clear();
    card.divider
      .moveTo(18, 108)
      .lineTo(CARD_W - 18, 108)
      .stroke({ width: 1, color: accent, alpha: 0.35 });
    card.divider
      .moveTo(CARD_W / 2 - 24, 108)
      .lineTo(CARD_W / 2 + 24, 108)
      .stroke({ width: 2, color: selected ? UI.cardSelectedGlow : accent, alpha: 0.65 });

    const badgeW = lvl === 0 ? 48 : 52;
    const badgeH = 20;
    const badgeY = 14;
    card.badge.clear();
    card.badge.roundRect(iconCx - badgeW / 2, badgeY, badgeW, badgeH, 4).fill(
      lvl === 0 ? UI.cardSelected : 0x222228,
    );
    card.badge
      .roundRect(iconCx - badgeW / 2, badgeY, badgeW, badgeH, 4)
      .stroke({
        width: 1,
        color: lvl === 0 ? UI.cardSelectedGlow : accent,
        alpha: 0.85,
      });
    card.badgeText.text = lvl === 0 ? "✦ NEW" : `Lv ${lvl} → ${lvl + 1}`;
    card.badgeText.style.fill = lvl === 0 ? UI.textPrimary : UI.textGreen;
    card.badgeText.position.set(iconCx, badgeY + badgeH / 2);

    card.title.text = up.name.toUpperCase();
    card.title.style.fill = selected ? UI.textPrimary : UI.textPrimary;
    card.title.position.set(iconCx, 118);
    card.desc.text = up.desc;
    card.desc.position.set(iconCx, 148);

    drawUpgradeLevelPips(card.pips, iconCx, CARD_H - 52, lvl, up.maxLevel, accent);

    const nextLabel =
      lvl === 0
        ? "First time — big boost!"
        : lvl + 1 >= up.maxLevel
          ? "→ MAX LEVEL next"
          : `Stack ${lvl + 1} — keeps scaling`;
    card.levelText.text = nextLabel;
    card.levelText.style.fill = lvl + 1 >= up.maxLevel ? UI.coin : UI.textDim;
    card.levelText.position.set(iconCx, CARD_H - 32);
  }

  return {
    root,
    show() {
      root.visible = true;
      animPhase = 0;
    },
    hide() {
      root.visible = false;
    },
    tick(dt: number) {
      if (!root.visible) return;
      animPhase += dt;
      const focus = opts.getFocus();
      if (focus === lastFocus && root.visible) {
        cards.forEach((card, i) => {
          if (!card.pickId || !card.slot.visible) return;
          if (i !== focus) return;
          paintCard(card, i, focus, opts.getUpgradeLevels());
        });
      }
    },
    refresh(w: number, h: number) {
      dim.clear().rect(0, 0, w, h).fill({ color: UI.overlay, alpha: 0.82 });
      dim
        .rect(w / 2 - 280, 28, 560, 70)
        .fill({ color: UI.cardSelected, alpha: 0.04 });

      drawLevelUpHeaderFx(headerFx, w / 2, 52, w);

      title.text = "CHOOSE AN UPGRADE";
      title.position.set(w / 2, 44);
      subtitle.text = `— LEVEL ${opts.getLevel()} —`;
      subtitle.position.set(w / 2, 78);
      hint.position.set(w / 2, h - 36);

      const choices = opts.getChoices();
      const focus = opts.getFocus();
      lastFocus = focus;
      const levels = opts.getUpgradeLevels();
      const totalW = CARD_W * 3 + CARD_GAP * 2;
      const startX = w / 2 - totalW / 2 + CARD_W / 2;
      const cardY = h / 2 + 6;

      cards.forEach((card, i) => {
        const id = choices[i];
        if (!id) {
          card.slot.visible = false;
          card.pickId = null;
          return;
        }

        card.slot.visible = true;
        card.pickId = id;
        paintCard(card, i, focus, levels);
        card.slot.position.set(startX + i * (CARD_W + CARD_GAP), cardY);
      });
    },
  };
}
