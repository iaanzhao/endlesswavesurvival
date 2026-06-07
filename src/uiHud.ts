import { Container, Graphics, Text } from "pixi.js";
import { drawBar, drawCoinIcon, drawSkillSlotIcon } from "./uiDraw";
import { FONT, UI } from "./uiTheme";

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
    skillQ: number;
    skillR: number;
    skillQName: string;
    skillRName: string;
    skillQMax: number;
    skillRMax: number;
    visible: boolean;
  }): void;
}

export function createGameHud(): GameHud {
  const root = new Container();
  root.visible = false;

  const bars = new Graphics();
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
  const skillSlots = [0, 1].map(() => {
    const slot = new Container();
    const icon = new Graphics();
    const name = new Text({
      text: "",
      style: {
        fill: UI.textPrimary,
        fontSize: 10,
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
    coinWrap,
    versionText,
    skillsRoot,
  );

  const barW = 200;

  return {
    root,
    layout(w, h) {
      hpLabel.position.set(18, 8);
      xpLabel.position.set(18, 30);
      lvlText.position.set(16, 50);
      timerText.position.set(w / 2, 10);
      waveText.position.set(w / 2, 38);
      coinWrap.position.set(w - 72, 14);
      versionText.position.set(12, h - 22);
      skillsRoot.position.set(w - 16 - 52 * 2, h - 72);
      skillSlots[0].slot.position.set(0, 0);
      skillSlots[1].slot.position.set(52, 0);
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

      const skillData = [
        { name: opts.skillQName, cd: opts.skillQ, max: opts.skillQMax },
        { name: opts.skillRName, cd: opts.skillR, max: opts.skillRMax },
      ];

      skillSlots.forEach((ui, i) => {
        const data = skillData[i];
        const ready = data.cd <= 0;
        drawSkillSlotIcon(ui.icon, ready);
        ui.name.text = data.name.split(" ")[0];
        ui.cd.text = ready ? "" : data.cd.toFixed(1);
        ui.cd.style.fill = ready ? UI.textGreen : UI.textPrimary;
      });
    },
  };
}
