export interface MediaRuleInput {
  provider: "CLOUDINARY" | "EXTERNAL";
  publicId?: string | null;
  url?: string | null;
  type: "IMAGE" | "VIDEO";
  alt: string;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Regras de mídia que o schema Prisma não expressa (a migração tem um CHECK equivalente
 * para provedor × origem). Lança `Error` na primeira regra violada.
 */
export function assertValidMedia(m: MediaRuleInput): void {
  if (m.provider === "CLOUDINARY" && !m.publicId) {
    throw new Error("Mídia CLOUDINARY exige publicId.");
  }
  if (m.provider === "EXTERNAL" && !m.url) {
    throw new Error("Mídia EXTERNAL exige url.");
  }
  if (m.url && !isHttpsUrl(m.url)) {
    throw new Error("A url da mídia deve usar https.");
  }
  if (m.type === "IMAGE" && m.alt.trim() === "") {
    throw new Error("Imagem exige texto alternativo (alt) não vazio.");
  }
}
