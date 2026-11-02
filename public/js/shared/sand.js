export function validSandStrokes(strokes) {
  if (!Array.isArray(strokes) || strokes.length > 80) return false;
  let count = 0;
  for (const stroke of strokes) {
    if (!Array.isArray(stroke) || stroke.length < 2) return false;
    count += stroke.length;
    if (count > 1600) return false;
    for (const p of stroke) if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1]) || p[0] < 0 || p[0] > 1000 || p[1] < 0 || p[1] > 600) return false;
  }
  return true;
}
