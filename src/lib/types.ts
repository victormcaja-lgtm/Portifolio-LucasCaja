export type CategorySlug = "fine-art" | "fashion-editorial" | "high-fashion" | "filme";

export type CategoryFilterValue = CategorySlug | "todos";

export interface Category {
  slug: CategorySlug;
  name: string;
}

export interface ImageCredit {
  author: string;
  sourceUrl: string;
}

export interface ImageAsset {
  src: string;
  width: number;
  height: number;
  /** Texto alternativo descritivo (não vazio). */
  alt: string;
  /** Obrigatório em conteúdo de demonstração. */
  credit?: ImageCredit;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  /** Ao menos uma categoria. */
  categories: CategorySlug[];
  cover: ImageAsset;
  sortOrder: number;
  isDemo: boolean;
  /** Texto curto do projeto. */
  summary?: string;
  /** Imagens além da capa (pode ser vazio). */
  gallery: readonly ImageAsset[];
}
