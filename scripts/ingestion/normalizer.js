// Normalizer: Standardizes OSM tags into SalahNear Mosque database entities

import crypto from 'node:crypto';
import { CONFIG } from './config.js';

export class MosqueNormalizer {
  constructor() {
    this.districts = Object.keys(CONFIG.districts);
  }

  // Generate deterministic UUIDv5-like UUID from OSM element identifier
  generateDeterministicId(type, id) {
    const input = `salahnear:osm:${type}:${id}`;
    const hash = crypto.createHash('sha1').update(input).digest('hex');
    
    // Format hash into UUID (8-4-4-4-12) with version 5 and RFC 4122 variant
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      '5' + hash.substring(13, 16),
      ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
      hash.substring(20, 32),
    ].join('-');
  }

  // Haversine distance in meters
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
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

  // Find closest district from centroid if not present in tags
  resolveDistrictFromCoordinates(lat, lon, fallbackDistrict) {
    if (fallbackDistrict && this.districts.includes(fallbackDistrict)) {
      return fallbackDistrict;
    }

    let closestDistrict = 'Kozhikode';
    let minDistance = Infinity;

    for (const [district, info] of Object.entries(CONFIG.districts)) {
      const [cLat, cLon] = info.centroid;
      const dist = this.calculateDistance(lat, lon, cLat, cLon);
      if (dist < minDistance) {
        minDistance = dist;
        closestDistrict = district;
      }
    }

    return closestDistrict;
  }

  normalize(element, districtContext) {
    const tags = element.tags || {};

    // 1. Resolve coordinates
    let lat = null;
    let lon = null;

    if (element.type === 'node') {
      lat = element.lat;
      lon = element.lon;
    } else if (element.center) {
      lat = element.center.lat;
      lon = element.center.lon;
    }

    if (!lat || !lon) {
      return null; // Skip elements missing coordinates
    }

    // 2. Resolve Names
    const nameMalayalam = tags['name:ml'];
    const nameEnglish = tags['name:en'] || tags['int_name'];
    const primaryName = tags.name || nameEnglish || nameMalayalam || 'Juma Masjid';
    const alternateName = tags.alt_name || tags.official_name || tags.loc_name || (nameMalayalam && nameMalayalam !== primaryName ? nameMalayalam : null);

    // Build combined name if Malayalam name exists and differs
    let combinedName = primaryName;
    if (nameMalayalam && !primaryName.includes(nameMalayalam)) {
      combinedName = `${primaryName} (${nameMalayalam})`;
    }

    // 3. Resolve Address & Locality
    const street = tags['addr:street'] || tags['addr:road'];
    const place = tags['addr:place'] || tags['addr:suburb'] || tags['addr:locality'];
    const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || place;
    const pincode = tags['addr:postcode'] || tags.postcode;

    const addressParts = [street, place, city].filter(Boolean);
    const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : (city || districtContext || 'Kerala');

    // 4. Resolve District
    let district = tags['addr:district'] || tags['is_in:district'];
    if (!district || !this.districts.includes(district)) {
      district = this.resolveDistrictFromCoordinates(lat, lon, districtContext);
    }

    // 5. Contact information
    const contact = tags.phone || tags['contact:phone'] || tags['contact:mobile'];

    return {
      id: this.generateDeterministicId(element.type, element.id),
      name: combinedName.trim(),
      alternate_name: alternateName ? alternateName.trim() : null,
      address: formattedAddress,
      city_or_locality: city || place || null,
      district: district,
      state: 'Kerala',
      pincode: pincode || null,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lon.toFixed(6)),
      attendance_radius_m: CONFIG.defaultAttendanceRadiusMeters,
      timezone: CONFIG.defaultTimezone,
      verification_status: 'verified',
      is_active: true,
      source: 'openstreetmap',
      source_reference: `${element.type}/${element.id}`,
    };
  }
}
