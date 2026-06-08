import { Graphics } from "pixi.js";
import type { MapDef, MapId } from "./data";
import { drawMapTerrainPreview, getMapTerrain } from "./mapTerrain";

function drawMapDecor(g: Graphics, mapId: MapId, cx: number, cy: number, r: number): void {
  switch (mapId) {
    case "graveyard":
      g.roundRect(cx - r * 0.35, cy + r * 0.05, r * 0.22, r * 0.3, 2).fill({
        color: 0x556677,
        alpha: 0.7,
      });
      g.roundRect(cx + r * 0.12, cy - r * 0.1, r * 0.18, r * 0.24, 2).fill({
        color: 0x445566,
        alpha: 0.55,
      });
      g.circle(cx - r * 0.1, cy - r * 0.28, r * 0.08).fill({ color: 0x778899, alpha: 0.45 });
      break;
    case "ember":
      for (let i = 0; i < 5; i++) {
        const a = -0.8 + i * 0.4;
        g.moveTo(cx + Math.cos(a) * r * 0.15, cy + Math.sin(a) * r * 0.15)
          .lineTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55)
          .stroke({ width: 2, color: 0xff4422, alpha: 0.65 });
      }
      g.circle(cx, cy, r * 0.12).fill({ color: 0xffaa44, alpha: 0.5 });
      break;
    case "frost":
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.moveTo(cx, cy)
          .lineTo(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42)
          .stroke({ width: 2, color: 0xaaddff, alpha: 0.55 });
      }
      g.circle(cx, cy, r * 0.1).fill({ color: 0xccffff, alpha: 0.45 });
      break;
    case "void":
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        g.circle(
          cx + Math.cos(a) * r * 0.35,
          cy + Math.sin(a) * r * 0.35,
          r * 0.05,
        ).fill({ color: 0xcc88ff, alpha: 0.7 });
      }
      g.circle(cx, cy, r * 0.18).stroke({ width: 2, color: 0x8844cc, alpha: 0.5 });
      break;
  }
}

/** Top-down miniature arena preview for map selection cards. */
export function drawMapPreview(
  g: Graphics,
  map: MapDef,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.clear();

  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * 0.42;
  const tile = 10;

  g.rect(x, y, w, h).fill(0x08080c);

  for (let tx = x; tx < x + w; tx += tile) {
    for (let ty = y; ty < y + h; ty += tile) {
      const dx = tx + tile / 2 - cx;
      const dy = ty + tile / 2 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const c = ((Math.floor((tx - x) / tile) + Math.floor((ty - y) / tile)) & 1) === 0
        ? map.tileA
        : map.tileB;
      g.rect(tx, ty, tile, tile).fill(c);
    }
  }

  g.circle(cx, cy, r).stroke({ width: 3, color: map.borderColor, alpha: 0.85 });
  g.circle(cx, cy, r - 2).stroke({ width: 1, color: map.accentColor, alpha: 0.35 });
  drawMapTerrainPreview(g, map, getMapTerrain(map.id), x, y, w, h);
  drawMapDecor(g, map.id, cx, cy, r);
}
