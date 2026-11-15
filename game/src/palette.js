// The look plan, in one place. EMBERLINE is a freight yard at dusk: cold slate steel
// against one warm amber accent, so the player's own team reads amber and the other
// team reads teal at a glance. The same names are the CSS custom properties in index.html.
export const PALETTE = {
  canvas: '#12151c',
  surface: '#1b2027',
  hairline: '#2e3742',
  ink: '#ece7db',
  muted: '#93a0ad',
  accent: '#f59e2e',
  ember: '#f59e2e',
  slate: '#3fb8a6',
  danger: '#e5484d',
  yardFloor: '#23262c',
  yardWall: '#2b313a',
  containerA: '#8a5a2b',
  containerB: '#3d6b5e',
  containerC: '#6b4a5e',
  crate: '#4a4238',
  sky: '#1a2233',
};

export function shade(name) {
  return PALETTE[name];
}
