function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** URL de imagem de demonstração (Picsum, escala de cinza). */
export function demoImageUrl(id: number, width: number, height: number): string {
  if (!Number.isInteger(id) || id < 0) {
    throw new RangeError(`id inválido: ${id}`);
  }
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
    throw new RangeError(`Dimensões inválidas: ${width}×${height}`);
  }
  return `https://picsum.photos/id/${id}/${width}/${height}?grayscale`;
}
