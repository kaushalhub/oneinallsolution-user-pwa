const ICON_MAP: Record<string, string> = {
  home: 'home-outline',
  sofa: 'bed-outline',
  droplet: 'water-outline',
  flame: 'flame-outline',
  sparkles: 'sparkles-outline',
  grid: 'grid-outline',
  water: 'water-outline',
  flash: 'flash-outline',
  construct: 'construct-outline',
};

/** Ionicons-style name fragment for our Io5 icon picker. */
export function resolveServiceIonicon(icon?: string): string {
  if (!icon) return 'ellipse-outline';
  if (ICON_MAP[icon]) return ICON_MAP[icon];
  if (/^-outline$/i.test(icon) || icon.includes('-')) return icon;
  return `${icon}-outline`;
}
