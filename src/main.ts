import { Application } from "pixi.js";
import { startGame } from "./game";

async function main() {
  const app = new Application();
  await app.init({
    background: 0x0a0e14,
    resizeTo: window,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const container = document.getElementById("pixi-container");
  if (!container) throw new Error("Missing #pixi-container");
  container.appendChild(app.canvas);

  await startGame(app);
}

main().catch((err: unknown) => {
  console.error(err);
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  const container = document.getElementById("pixi-container");
  if (container) {
    container.innerHTML = `<pre style="color:#ff6666;padding:24px;font-family:monospace;white-space:pre-wrap">${message}</pre>`;
  }
});
