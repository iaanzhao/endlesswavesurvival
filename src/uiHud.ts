import { Container, Graphics, Text } from "pixi.js";
import { drawBar, drawCoinIcon, drawSkillSlotIcon } from "./uiDraw";
import { drawMinimap, MINIMAP_SIZE, type MinimapUpdate } from "./uiMinimap";
import { FONT, UI } from "./uiTheme";

export interface HudSkillSlot {
  name: string;
  cd: number;
  maxCd: number;
  passive?: boolean;
}

export interface GameHud {
  root: Container;
  layout(w: number, h: number): void;
  update(opts: {
    hp: number;
    maxHp: number;
    xp: number;
    xpMax: number;
    level: number;
    wave: number;
    time: string;
    gold: number;
    skills: HudSkillSlot[];
    minimap?: MinimapUpdate | null;
    visible: boolean;
  }): void;
}

const SLOT_SIZE = 52;
const MAX_SKILL_SLOTS = 6;

export function createGameHud(): GameHud {
  const root = new Container();
  root.visible = false;

  const bars = new Graphics();
  const minimapGfx = new Graphics();
  const hpLabel = new Text({
    text: "100/100",
    style: { fill: UI.textPrimary, fontSize: 12, fontFamily: FONT },
  });
  const xpLabel = new Text({
    text: "0/100",
    style: { fill: UI.textPrimary, fontSize: 12, fontFamily: FONT },
  });
  const lvlText = new Text({
    text: "Lvl: 1",
    style: {
      fill: UI.textMuted,
      fontSize: 13,
      fontFamily: FONT,
      fontWeight: "bold",
    },
  });

  const timerText = new Text({
    text: "0:00",
    style: {
      fill: UI.textPrimary,
      fontSize: 22,
      fontFamily: FONT,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 4 },
    },
  });
  timerText.anchor.set(0.5, 0);

  const waveText = new Text({
    text: "Wave 1",
    style: {
      fill: UI.textMuted,
      fontSize: 12,
      fontFamily: FONT,
      stroke: { color: 0x000000, width: 3 },
    },
  });
  waveText.anchor.set(0.5, 0);

  const coinWrap = new Container();
  const coinIcon = new Graphics();
  drawCoinIcon(coinIcon, 0, 0, 7);
  const coinText = new Text({
    text: "0",
    style: { fill: UI.textPrimary, fontSize: 16, fontFamily: FONT },
  });
  coinText.position.set(18, -8);
  coinWrap.addChild(coinIcon, coinText);

  const versionText = new Text({
    text: "Endless Waves Survival",
    style: { fill: UI.textDim, fontSize: 11, fontFamily: FONT },
  });

  const skillsRoot = new Container();
  const skillSlots = Array.from({ length: MAX_SKILL_SLOTS }, () => {
    const slot = new Container();
    const icon = new Graphics();
    const name = new Text({
      text: "",
      style: {
        fill: UI.textPrimary,
        fontSize: 9,
        fontFamily: FONT,
        fontWeight: "bold",
        align: "center",
        wordWrap: true,
        wordWrapWidth: 44,
      },
    });
    const cd = new Text({
      text: "",
      style: { fill: UI.textMuted, fontSize: 11, fontFamily: FONT, fontWeight: "bold" },
    });
    name.anchor.set(0.5, 0);
    name.y = 24;
    cd.anchor.set(0.5, 0);
    cd.y = 44;
    slot.addChild(icon, name, cd);
    skillsRoot.addChild(slot);
    return { slot, icon, name, cd };
  });

  root.addChild(
    bars,
    hpLabel,
    xpLabel,
    lvlText,
    timerText,
    waveText,
    minimapGfx,
    coinWrap,
    versionText,
    skillsRoot,
  );

  const barW = 200;
  let lastW = 800;
  let lastH = 600;

  return {
    root,
    layout(w, h) {
      lastW = w;
      lastH = h;
      hpLabel.position.set(18, 8);
      xpLabel.position.set(18, 30);
      lvlText.position.set(16, 50);
      timerText.position.set(w / 2, 10);
      waveText.position.set(w / 2, 38);
      minimapGfx.position.set(w - MINIMAP_SIZE - 12, 10);
      coinWrap.position.set(w - MINIMAP_SIZE - 12, MINIMAP_SIZE + 18);
      versionText.position.set(12, h - 22);
    },
    update(opts) {
      root.visible = opts.visible;
      if (!opts.visible) return;

      const hpRatio = opts.hp / opts.maxHp;
      const xpRatio = opts.xp / opts.xpMax;

      bars.clear();
      drawBar(bars, 14, 14, barW, 10, hpRatio, UI.hpFill, UI.hpBg);
      drawBar(bars, 14, 34, barW, 10, xpRatio, UI.xpFill, UI.xpBg);

      hpLabel.text = `${Math.ceil(opts.hp)}/${Math.ceil(opts.maxHp)}`;
      xpLabel.text = `${Math.floor(opts.xp)}/${opts.xpMax}`;
      lvlText.text = `Lvl: ${opts.level}`;
      timerText.text = opts.time;
      waveText.text = `Wave ${opts.wave}`;
      coinText.text = String(opts.gold);

      if (opts.minimap) {
        minimapGfx.visible = true;
        drawMinimap(minimapGfx, opts.minimap);
      } else {
        minimapGfx.visible = false;
        minimapGfx.clear();
      }

      const count = opts.skills.length;
      const totalW = count * SLOT_SIZE;
      skillsRoot.position.set(lastW - 16 - totalW, lastH - 72);

      skillSlots.forEach((ui, i) => {
        const data = opts.skills[i];
        if (!data) {
          ui.slot.visible = false;
          return;
        }
        ui.slot.visible = true;
        ui.slot.position.set(i * SLOT_SIZE, 0);
        const ready = data.passive || data.cd <= 0;
        drawSkillSlotIcon(ui.icon, ready);
        ui.name.text = data.name.split(" ")[0];
        if (data.passive) {
          ui.cd.text = "●";
          ui.cd.style.fill = UI.textGreen;
        } else {
          ui.cd.text = ready ? "" : data.cd.toFixed(1);
          ui.cd.style.fill = ready ? UI.textGreen : UI.textPrimary;
        }
      });
    },
  };
}
