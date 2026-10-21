import type { ImageAsset, ImageCredit } from "./types";

/** Créditos das imagens, na ordem de aparição, sem duplicatas de autor + URL. */
export function collectImageCredits(images: readonly ImageAsset[]): ImageCredit[] {
  const seen = new Set<string>();
  const credits: ImageCredit[] = [];
  for (const { credit } of images) {
    if (!credit) continue;
    const key = `${credit.author}|${credit.sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    credits.push(credit);
  }
  return credits;
}
