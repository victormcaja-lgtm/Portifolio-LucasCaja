export const SITE = {
  name: "Lucas Caja",
  disciplines: ["Fine Art", "Fashion Editorial", "High Fashion", "Fotografia & Filme"],
  description:
    "Portfólio de fotografia e filme — Fine Art, Fashion Editorial e High Fashion.",
} as const satisfies {
  name: string;
  disciplines: readonly string[];
  description: string;
};
