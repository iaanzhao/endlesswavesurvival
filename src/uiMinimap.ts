import { Graphics } from "pixi.js";
import type { MapDef } from "./data";
import {
  ARENA_RADIUS,
  isInteractiveTerrain,
  type TerrainFeature,
} from "./mapTerrain";

export const MINIMAP_SIZE = 108;

export interface MinimapUpdate {
  map: MapDef;
  playerX: number;
  playerY: number;
  enemies: { x: number; y: number }[];
  terrain: TerrainFeature[];
  viewW: number;
  viewH: number;
}

export function drawMinimap(
  g: Graphics,
  data: MinimapUpdate,
  size = MINIMAP_SIZE,
): void {
  g.clear();

  const cx = size / 2;
  const cy = size / 2;
  const mapR = size / 2 - 3;
  const scale = (mapR - 4) / ARENA_RADIUS;

  const toMap = (wx: number, wy: number) => ({
    x: cx + wx * scale,
    y: cy + wy * scale,
  });

  const inside = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 <= mapR ** 2;

  g.roundRect(0, 0, size, size, 6).fill({ color: 0x08080c, alpha: 0.94 });
  g.roundRect(1, 1, size - 2, size - 2, 5).stroke({
    width: 2,
    color: data.map.borderColor,
    alpha: 0.9,
  });

  const tileWorld = 320;
  for (let tx = -ARENA_RADIUS; tx < ARENA_RADIUS; tx += tileWorld) {
    for (let ty = -ARENA_RADIUS; ty < ARENA_RADIUS; ty += tileWorld) {
      const m = toMap(tx + tileWorld / 2, ty + tileWorld / 2);
      if (!inside(m.x, m.y)) continue;
      const c =
        ((Math.floor(tx / tileWorld) + Math.floor(ty / tileWorld)) & 1) === 0
          ? data.map.tileA
          : data.map.tileB;
      g.rect(m.x - 2.5, m.y - 2.5, 5, 5).fill({ color: c, alpha: 0.55 });
    }
  }

  g.circle(cx, cy, mapR).stroke({ width: 1, color: data.map.accentColor, alpha: 0.4 });

  for (const f of data.terrain) {
    if (f.kind === "rift" && f.riftDormant) continue;
    if (f.kind === "volcano" && f.volcanoDormant) continue;
    const p = toMap(f.x, f.y);
    if (!inside(p.x, p.y)) continue;

    if (isInteractiveTerrain(f.kind)) {
      const color =
        f.kind === "volcano" ? 0xff6622 : f.kind === "crystal" ? 0x88ccff : 0xaa66ff;
      g.circle(p.x, p.y, 2.4).fill({ color, alpha: 0.95 });
      g.circle(p.x, p.y, 3.5).stroke({ width: 0.5, color, alpha: 0.35 });
      continue;
    }

    if (f.blocking !== false && f.radius > 0) {
      g.circle(p.x, p.y, 1.6).fill({ color: 0x778899, alpha: 0.45 });
    }
  }

  const player = toMap(data.playerX, data.playerY);
  const viewW = data.viewW * scale;
  const viewH = data.viewH * scale;
  g.rect(player.x - viewW / 2, player.y - viewH / 2, viewW, viewH).stroke({
    width: 1,
    color: 0xffffff,
    alpha: 0.22,
  });

  const maxEnemies = 120;
  const enemyList =
    data.enemies.length > maxEnemies ? data.enemies.slice(0, maxEnemies) : data.enemies;
  for (const e of enemyList) {
    const p = toMap(e.x, e.y);
    if (!inside(p.x, p.y)) continue;
    g.circle(p.x, p.y, 1.8).fill({ color: 0xff5555, alpha: 0.9 });
  }

  g.circle(player.x, player.y, 3.2).fill({ color: 0x44ff88, alpha: 1 });
  g.circle(player.x, player.y, 4.8).stroke({ width: 1.5, color: 0xffffff, alpha: 0.95 });
}
