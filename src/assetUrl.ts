/** Public asset path respecting Vite `base` (e.g. `/endless-waves-survival/` on GitHub Pages). */
export function assetUrl(path: string): string {
  const trimmed = path.replace(/^\//, "");
  return `${import.meta.env.BASE_URL}${trimmed}`;
}
