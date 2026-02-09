/**
 * Generates an array of shuffled indices using the Fisher-Yates algorithm.
 * Returns [0, 1, 2, ..., length-1] in a random order.
 */
export function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}
