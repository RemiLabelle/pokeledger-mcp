const PROMOTION_COUNT = 3;
const HOT_LIMIT = 100;
const WARM_LIMIT = 200;

// Normalise une leçon pour reconnaître ses répétitions.
export function normalize(lesson) {
  return lesson.trim().toLowerCase();
}

// Indique si deux entrées portent la même leçon dans le même espace.
export function sameLesson(a, b) {
  return a.namespace === b.namespace && normalize(a.lesson) === normalize(b.lesson);
}

// Promeut l'entrée au niveau hot dès qu'elle atteint le seuil de répétitions.
export function promote(entry) {
  if (entry.count >= PROMOTION_COUNT) {
    entry.tier = "hot";
  }
  return entry;
}

// Rétrograde une seule entrée en trop ; renvoie vrai si une entrée a changé de niveau.
function demoteOne(entries) {
  const hot = entries.filter((e) => e.tier === "hot");
  if (hot.length > HOT_LIMIT) {
    const demoted = hot.find((e) => e.kind !== "preference") ?? hot[0];
    demoted.tier = "warm";
    return true;
  }
  for (const namespace of new Set(entries.map((e) => e.namespace))) {
    const warm = entries.filter((e) => e.tier === "warm" && e.namespace === namespace);
    if (warm.length > WARM_LIMIT) {
      warm[0].tier = "cold";
      return true;
    }
  }
  return false;
}

// Fait respecter les limites : le niveau hot rétrograde ses plus anciennes non-préférences, le niveau warm archive ses plus anciennes entrées par espace, jusqu'à ce que chaque niveau soit dans ses bornes.
export function enforceLimits(entries) {
  while (demoteOne(entries));
  return entries;
}
