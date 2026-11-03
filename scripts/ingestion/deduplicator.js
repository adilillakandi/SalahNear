// Deduplicator: Merges overlapping OSM node and way entries for the same mosque

import { CONFIG } from './config.js';

export class MosqueDeduplicator {
  constructor(distanceThresholdMeters = CONFIG.deduplicationDistanceThresholdMeters) {
    this.distanceThresholdMeters = distanceThresholdMeters;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  isSimilarName(name1, name2) {
    if (!name1 || !name2) return true;
    const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;

    // Both are generic placeholders (e.g. "masjid", "mosque", "jumamasjid")
    const generic = ['mosque', 'masjid', 'jumamasjid', 'palli', 'jumapalli'];
    if (generic.includes(n1) || generic.includes(n2)) return true;

    return false;
  }

  deduplicate(mosques) {
    const initialCount = mosques.length;
    const uniqueById = new Map();

    // 1. Deduplicate by exact ID
    for (const m of mosques) {
      if (!uniqueById.has(m.id)) {
        uniqueById.set(m.id, m);
      }
    }

    const items = Array.from(uniqueById.values());
    const merged = [];
    const visited = new Set();

    // 2. Spatial proximity clustering
    for (let i = 0; i < items.length; i++) {
      if (visited.has(i)) continue;

      let primary = { ...items[i] };
      visited.add(i);

      for (let j = i + 1; j < items.length; j++) {
        if (visited.has(j)) continue;

        const candidate = items[j];
        const dist = this.calculateDistance(
          primary.latitude,
          primary.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (dist <= this.distanceThresholdMeters) {
          if (this.isSimilarName(primary.name, candidate.name)) {
            visited.add(j);

            // Merge metadata: choose the longer, more informative name
            if (candidate.name.length > primary.name.length) {
              primary.name = candidate.name;
            }
            if (!primary.alternate_name && candidate.alternate_name) {
              primary.alternate_name = candidate.alternate_name;
            }
            if (!primary.pincode && candidate.pincode) {
              primary.pincode = candidate.pincode;
            }
            if (primary.address === 'Kerala' && candidate.address !== 'Kerala') {
              primary.address = candidate.address;
            }
          }
        }
      }

      merged.push(primary);
    }

    const removedCount = initialCount - merged.length;
    console.log(`[Deduplicator] Filtered ${initialCount} entries -> ${merged.length} unique mosques (merged ${removedCount} duplicates)`);
    return merged;
  }
}
