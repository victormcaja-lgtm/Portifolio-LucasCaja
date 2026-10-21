import type { Category, CategorySlug } from "./types";

export const CATEGORIES: readonly Category[] = Object.freeze([
  { slug: "fine-art", name: "Fine Art" },
  { slug: "fashion-editorial", name: "Fashion Editorial" },
  { slug: "high-fashion", name: "High Fashion" },
  { slug: "filme", name: "Filme" },
]);

export function getCategoryName(slug: CategorySlug): string {
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) {
    throw new Error(`Categoria desconhecida: ${String(slug)}`);
  }
  return category.name;
}
