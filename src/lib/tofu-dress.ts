// Seasonal costume for tofu's ascii frames: the hat fills the 3-char gap between the
// ears (first ear line only). scripts/validate-tofu.mjs checks every frame with every hat.
// No imports, so server code (share cards) and any client file can use it.
const EARS = /([n~.|])   ([n.|])/;

export function dress(frame: string, hat?: string) {
  if (!hat) return frame;
  const lines = frame.split("\n");
  const at = lines.slice(0, 2).findIndex((ln) => EARS.test(ln));
  if (at !== -1) lines[at] = lines[at].replace(EARS, `$1${hat}$2`);
  return lines.join("\n");
}
