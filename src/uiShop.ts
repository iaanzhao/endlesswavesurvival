import { Container, Graphics, Text } from "pixi.js";
import {
  SHOP_ITEMS,
  type ShopItemDef,
  type ShopItemId,
} from "./data";
import {
  drawCoinIcon,
  drawMenuButtonBg,
  drawPanelFrame,
  drawUpgradeIconFrame,
} from "./uiDraw";
import { FONT, titleStyle, UI } from "./uiTheme";
import { setClickHitArea } from "./util";

const CARD_W = 340;
const CARD_H = 92;
const ICON_BOX = 44;
const COLS = 2;

const SHOP_ACCENT: Record<ShopItemId, number> = {
  health_potion: 0xee4455,
  damage_tonic: 0xff8844,
  speed_boots: 0x44ccff,
  xp_scroll: 0x55dd77,
  armor_charm: 0x8899dd,
  revive_token: 0xddaa44,
};

function drawShopIcon(g: Graphics, id: ShopItemId, cx: number, cy: number): void {
  switch (id) {
    case "health_potion":
      g.roundRect(cx - 7, cy - 12, 14, 20, 3).fill(0xcc3344);
      g.roundRect(cx - 5, cy - 10, 10, 14, 2).fill(0xff6677);
      g.rect(cx - 8, cy - 2, 16, 4).fill(0xaa2233);
      break;
    case "damage_tonic":
      g.roundRect(cx - 8, cy - 11, 16, 18, 4).fill(0x884422);
      g.roundRect(cx - 6, cy - 9, 12, 14, 3).fill(0xffaa44);
      g.moveTo(cx, cy - 14).lineTo(cx + 4, cy - 8).lineTo(cx - 4, cy - 8).closePath().fill(0xdd6622);
      break;
    case "speed_boots":
      g.roundRect(cx - 12, cy - 4, 22, 10, 3).fill(0x335566);
      g.roundRect(cx - 10, cy - 2, 18, 6, 2).fill(0x55aacc);
      g.moveTo(cx + 8, cy - 6).lineTo(cx + 14, cy).lineTo(cx + 8, cy + 6).closePath().fill(0x88ddff);
      break;
    case "xp_scroll":
      g.roundRect(cx - 10, cy - 12, 20, 24, 2).fill(0xeedd88);
      g.rect(cx - 7, cy - 8, 14, 2).fill(0x886622);
      g.rect(cx - 7, cy - 3, 10, 2).fill(0x886622);
      g.rect(cx - 7, cy + 2, 12, 2).fill(0x886622);
      g.circle(cx + 6, cy + 8, 4).fill(0x55dd77);
      break;
    case "armor_charm":
      g.circle(cx, cy, 12).fill(0x5566aa);
      g.circle(cx, cy, 8).fill(0x8899dd);
      g.star(cx, cy, 5, 5, 3).fill(0xccddee);
      break;
    case "revive_token":
      g.circle(cx, cy, 13).fill(0xaa7722);
      g.circle(cx, cy, 9).fill(0xffcc55);
      g.moveTo(cx, cy - 6).lineTo(cx + 5, cy + 1).lineTo(cx - 5, cy + 1).closePath().fill(0xffffff);
      break;
  }
}

type ShopCardState = "locked" | "ready" | "buy" | "broke";

function cardState(
  item: ShopItemDef,
  unlocked: boolean,
  equipped: boolean,
  gold: number,
): ShopCardState {
  if (!unlocked) return "locked";
  if (equipped) return "ready";
  if (gold < item.cost) return "broke";
  return "buy";
}

function stateLabel(state: ShopCardState, item: ShopItemDef): string {
  switch (state) {
    case "locked":
      return `Unlock at ${item.unlockGold}g earned`;
    case "ready":
      return "READY — next run";
    case "buy":
      return `BUY — ${item.cost}g`;
    case "broke":
      return `Need ${item.cost}g`;
  }
}

function stateColor(state: ShopCardState): number {
  switch (state) {
    case "locked":
      return UI.textDim;
    case "ready":
      return UI.textGreen;
    case "buy":
      return UI.coin;
    case "broke":
      return UI.textRed;
  }
}

function drawShopCard(
  card: Container,
  item: ShopItemDef,
  unlocked: boolean,
  equipped: boolean,
  gold: number,
  focused: boolean,
): void {
  card.removeChildren();

  const state = cardState(item, unlocked, equipped, gold);
  const accent = SHOP_ACCENT[item.id];

  const bg = new Graphics();
  drawPanelFrame(bg, CARD_W, CARD_H);
  if (focused) {
    bg.rect(0, 0, CARD_W, CARD_H).stroke({ width: 2, color: UI.cardSelected });
  } else if (equipped) {
    bg.rect(0, 0, CARD_W, CARD_H).stroke({ width: 1, color: UI.textGreen, alpha: 0.5 });
  }
  card.addChild(bg);

  const iconCx = 30;
  const iconCy = CARD_H / 2;
  const iconFrame = new Graphics();
  const icon = new Graphics();
  const iconClip = new Graphics();
  drawUpgradeIconFrame(iconFrame, iconCx, iconCy, ICON_BOX, accent, focused || equipped);
  drawShopIcon(icon, item.id, iconCx, iconCy);
  iconClip
    .rect(iconCx - ICON_BOX / 2 + 3, iconCy - ICON_BOX / 2 + 3, ICON_BOX - 6, ICON_BOX - 6)
    .fill(0xffffff);
  icon.mask = iconClip;
  card.addChild(iconClip, iconFrame, icon);

  const title = new Text({
    text: item.name,
    style: {
      fill: unlocked ? UI.textPrimary : UI.textDim,
      fontSize: 15,
      fontFamily: FONT,
      fontWeight: "bold",
    },
  });
  title.position.set(58, 14);

  const desc = new Text({
    text: item.desc,
    style: {
      fill: UI.textMuted,
      fontSize: 11,
      fontFamily: FONT,
    },
  });
  desc.position.set(58, 34);

  const badge = new Text({
    text: stateLabel(state, item),
    style: {
      fill: stateColor(state),
      fontSize: 11,
      fontFamily: FONT,
      fontWeight: "bold",
    },
  });
  badge.position.set(58, 58);

  card.addChild(title, desc, badge);

  if (state === "buy" || state === "broke") {
    const coin = new Graphics();
    drawCoinIcon(coin, CARD_W - 22, CARD_H / 2, 8);
    card.addChild(coin);
    const cost = new Text({
      text: `${item.cost}`,
      style: {
        fill: state === "buy" ? UI.coin : UI.textDim,
        fontSize: 13,
        fontFamily: FONT,
        fontWeight: "bold",
      },
    });
    cost.anchor.set(1, 0.5);
    cost.position.set(CARD_W - 34, CARD_H / 2);
    card.addChild(cost);
  }

  if (equipped) {
    const check = new Text({
      text: "✓",
      style: {
        fill: UI.textGreen,
        fontSize: 22,
        fontFamily: FONT,
        fontWeight: "bold",
      },
    });
    check.anchor.set(0.5);
    check.position.set(CARD_W - 24, 20);
    card.addChild(check);
  }
}

export function buildShopPanel(
  w: number,
  h: number,
  gold: number,
  unlockedShop: Record<ShopItemId, boolean>,
  runShopBuffs: Record<ShopItemId, boolean>,
  focus: number,
  onBuy: (id: ShopItemId) => void,
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

  const oy = h / 2 - ph / 2;

  const title = new Text({ text: "Run Shop", style: titleStyle });
  title.anchor.set(0.5);
  title.position.set(w / 2, oy + 34);
  c.addChild(title);

  const goldRow = new Container();
  const coinGfx = new Graphics();
  drawCoinIcon(coinGfx, 0, 0, 10);
  const goldText = new Text({
    text: `${gold} gold`,
    style: {
      fill: UI.coin,
      fontSize: 18,
      fontFamily: FONT,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 3 },
    },
  });
  goldText.position.set(18, -10);
  goldRow.addChild(coinGfx, goldText);
  goldRow.position.set(w / 2 - goldText.width / 2 - 10, oy + 58);
  c.addChild(goldRow);

  const subtitle = new Text({
    text: "One-time buffs for your next run · lost if you die",
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
  });
  subtitle.anchor.set(0.5);
  subtitle.position.set(w / 2, oy + 88);
  c.addChild(subtitle);

  const gridW = COLS * CARD_W + (COLS - 1) * 16;
  const gridLeft = w / 2 - gridW / 2;
  const gridTop = oy + 108;

  SHOP_ITEMS.forEach((item, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const card = new Container();
    const focused = focus === i;
    drawShopCard(
      card,
      item,
      unlockedShop[item.id],
      runShopBuffs[item.id],
      gold,
      focused,
    );
    setClickHitArea(card, CARD_W, CARD_H);
    card.position.set(gridLeft + col * (CARD_W + 16), gridTop + row * (CARD_H + 12));
    card.eventMode = "static";
    card.cursor = unlockedShop[item.id] && !runShopBuffs[item.id] ? "pointer" : "default";
    card.on("pointertap", () => onBuy(item.id));
    c.addChild(card);
  });

  const equippedCount = SHOP_ITEMS.filter((s) => runShopBuffs[s.id]).length;
  const footer = new Text({
    text:
      equippedCount > 0
        ? `${equippedCount} item${equippedCount === 1 ? "" : "s"} ready for next run`
        : "Select items before starting a run",
    style: { fill: UI.textMuted, fontSize: 11, fontFamily: FONT },
  });
  footer.anchor.set(0.5);
  footer.position.set(w / 2, oy + ph - 72);
  c.addChild(footer);

  const hint = new Text({
    text: "↑↓ navigate  ·  Enter buy  ·  Esc back",
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
  });
  hint.anchor.set(0.5);
  hint.position.set(w / 2, oy + ph - 52);
  c.addChild(hint);

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
  back.position.set(w / 2 - btnW / 2, oy + ph - btnH - 16);
  back.on("pointertap", onBack);
  c.addChild(back);

  return c;
}
