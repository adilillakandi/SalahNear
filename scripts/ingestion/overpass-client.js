// Overpass API Client with Failover & Exponential Backoff

import { CONFIG } from './config.js';

export class OverpassClient {
  constructor() {
    this.endpoints = CONFIG.overpassEndpoints;
    this.currentEndpointIndex = 0;
  }

  get activeEndpoint() {
    return this.endpoints[this.currentEndpointIndex];
  }

  rotateEndpoint() {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
    console.log(`[Overpass] Switching to fallback endpoint: ${this.activeEndpoint}`);
  }

  buildBoundingBoxQuery(bbox, timeoutSec = 60) {
    const [minLat, minLon, maxLat, maxLon] = bbox;
    return `
      [out:json][timeout:${timeoutSec}];
      (
        node["amenity"="place_of_worship"]["religion"="muslim"](${minLat},${minLon},${maxLat},${maxLon});
        way["amenity"="place_of_worship"]["religion"="muslim"](${minLat},${minLon},${maxLat},${maxLon});
        node["building"="mosque"](${minLat},${minLon},${maxLat},${maxLon});
        way["building"="mosque"](${minLat},${minLon},${maxLat},${maxLon});
      );
      out center tags;
    `.trim();
  }

  async executeQuery(qlQuery, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const endpoint = this.activeEndpoint;
      try {
        console.log(`[Overpass] Attempt ${attempt}/${maxRetries} using ${endpoint}...`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'User-Agent': CONFIG.userAgent,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'data=' + encodeURIComponent(qlQuery),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        if (text.trim().startsWith('<')) {
          throw new Error(`Received HTML error from Overpass gateway: ${text.slice(0, 150)}`);
        }

        const data = JSON.parse(text);
        const elements = data.elements || [];
        console.log(`[Overpass] Success! Received ${elements.length} elements from ${endpoint}`);
        return elements;

      } catch (err) {
        lastError = err;
        console.warn(`[Overpass] Attempt ${attempt} failed on ${endpoint}: ${err.message}`);
        this.rotateEndpoint();

        if (attempt < maxRetries) {
          const delayMs = attempt * 2000;
          console.log(`[Overpass] Waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(`Failed to query Overpass after ${maxRetries} attempts. Last error: ${lastError.message}`);
  }

  async fetchDistrictMosques(districtName, bbox) {
    console.log(`\n======================================================`);
    console.log(`[Ingestion] Fetching mosques for district: ${districtName}`);
    console.log(`[Ingestion] Bounding box: [${bbox.join(', ')}]`);
    console.log(`======================================================`);

    const query = this.buildBoundingBoxQuery(bbox);
    return await this.executeQuery(query);
  }
}
