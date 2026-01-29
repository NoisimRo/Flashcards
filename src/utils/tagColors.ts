// Predefined palette of distinguishable Tailwind bg/text color pairs
const TAG_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-lime-100', text: 'text-lime-700' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
];

// Deterministic hash -> color assignment
function hashString(str: string): number {
  let hash = 0;
  const lower = str.toLowerCase().trim();
  for (let i = 0; i < lower.length; i++) {
    const char = lower.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTagColor(tag: string): { bg: string; text: string } {
  const index = hashString(tag) % TAG_COLORS.length;
  return TAG_COLORS[index];
}
