import type { UpgradeId } from "./data";

export const UI = {
  bg: 0x08080c,
  overlay: 0x08080c,
  cardBg: 0x121216,
  cardInner: 0x1a1a20,
  cardBorder: 0x3a3540,
  cardBorderHi: 0x4a4554,
  cardSelected: 0xbb44aa,
  cardSelectedGlow: 0xdd66cc,
  textPrimary: 0xe6e4ea,
  textMuted: 0x6e6c74,
  textDim: 0x4a484e,
  textGreen: 0x55dd77,
  textRed: 0xff8866,
  coin: 0xffcc44,
  hpFill: 0xee4455,
  hpBg: 0x5a2830,
  xpFill: 0x55dd66,
  xpBg: 0x285a30,
  menuBorder: 0x4a4650,
  menuBorderHi: 0x5b5363,
  menuShadow: 0x121212,
  menuText: 0xacaaaa,
  menuSelected: 0x757575,
  skillSlot: 0x52525e,
  skillBorder: 0x888899,
} as const;

export const FONT = "Courier New, monospace";

export const titleStyle = {
  fill: UI.textPrimary,
  fontSize: 26,
  fontFamily: FONT,
  fontWeight: "bold" as const,
  letterSpacing: 2,
  stroke: { color: 0x000000, width: 4 },
};

export const menuTitleStyle = {
  fill: UI.textPrimary,
  fontSize: 34,
  fontFamily: FONT,
  fontWeight: "bold" as const,
  letterSpacing: 3,
  stroke: { color: 0x000000, width: 5 },
  align: "center" as const,
};

export const bodyStyle = {
  fill: UI.textMuted,
  fontSize: 14,
  fontFamily: FONT,
  align: "center" as const,
  lineHeight: 22,
};

export const CARD_W = 220;
export const CARD_H = 320;
export const CARD_GAP = 20;

/** Thematic glow color per upgrade for card accents. */
export const UPGRADE_ACCENT: Record<UpgradeId, number> = {
  vitality: 0xee4455,
  recovery: 0x55dd77,
  armor: 0x8899bb,
  haste: 0x55aaff,
  might: 0xffaa44,
  swift_strike: 0xffdd44,
  multishot: 0x66ccff,
  pierce: 0xeedd88,
  area: 0xff6644,
  magnet: 0xaa66ff,
  wisdom: 0xddcc88,
  crit: 0xffcc44,
  cooldown: 0x55cc77,
};
