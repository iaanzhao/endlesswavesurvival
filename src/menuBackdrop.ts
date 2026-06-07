import { Container, Graphics } from "pixi.js";
import { UI } from "./uiTheme";

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createMenuBackdrop(w: number, h: number): Container {
  const root = new Container();
  root.eventMode = "none";

  const sky = new Graphics();
  sky.rect(0, 0, w, h).fill(UI.bg);
  sky.rect(0, 0, w, h * 0.55).fill({ color: 0x120818, alpha: 0.85 });
  sky.rect(0, h * 0.35, w, h * 0.35).fill({ color: 0x1a0a20, alpha: 0.55 });
  sky.ellipse(w * 0.5, h * 0.72, w * 0.55, h * 0.22).fill({ color: 0xbb44aa, alpha: 0.12 });
  sky.ellipse(w * 0.5, h * 0.78, w * 0.35, h * 0.12).fill({ color: 0xdd66cc, alpha: 0.08 });

  const stars = new Graphics();
  for (let i = 0; i < 48; i++) {
    const sx = hash(i) * w;
    const sy = hash(i + 50) * h * 0.55;
    const size = hash(i + 100) > 0.82 ? 2 : 1;
    stars.rect(sx, sy, size, size).fill({ color: 0xffffff, alpha: 0.15 + hash(i + 150) * 0.35 });
  }

  const hills = new Graphics();
  hills.moveTo(0, h)
    .lineTo(0, h * 0.62)
    .lineTo(w * 0.12, h * 0.52)
    .lineTo(w * 0.28, h * 0.58)
    .lineTo(w * 0.42, h * 0.46)
    .lineTo(w * 0.58, h * 0.56)
    .lineTo(w * 0.72, h * 0.48)
    .lineTo(w * 0.88, h * 0.6)
    .lineTo(w, h * 0.54)
    .lineTo(w, h)
    .closePath()
    .fill(0x0c0c12);

  hills.moveTo(0, h)
    .lineTo(0, h * 0.72)
    .lineTo(w * 0.18, h * 0.66)
    .lineTo(w * 0.36, h * 0.74)
    .lineTo(w * 0.55, h * 0.64)
    .lineTo(w * 0.74, h * 0.72)
    .lineTo(w * 0.9, h * 0.66)
    .lineTo(w, h * 0.7)
    .lineTo(w, h)
    .closePath()
    .fill(0x08080c);

  const ground = new Graphics();
  ground.rect(0, h * 0.82, w, h * 0.18).fill(0x060608);
  ground.rect(0, h * 0.82, w, 3).fill({ color: 0xbb44aa, alpha: 0.25 });

  const vignette = new Graphics();
  vignette.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.35 });

  root.addChild(sky, stars, hills, ground, vignette);
  return root;
}
