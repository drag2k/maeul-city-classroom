'use strict';
// Only village submissions may be applied automatically to an unsaved city.
function mergeIncomingVillages(baseline, local, saved) {
  if (baseline.name !== saved.name || JSON.stringify(baseline.items) !== JSON.stringify(saved.items)) return null;
  for (const previous of baseline.villages) {
    const current = saved.villages.find(v => v.key === previous.key);
    if (!current || current.x !== previous.x || current.y !== previous.y) return null;
  }
  const merged = structuredClone(local);
  for (const incoming of saved.villages) {
    if (!addVillage(merged,incoming.num,incoming.village)) return null;
  }
  return routeMap('city',merged) ? merged : null;
}
