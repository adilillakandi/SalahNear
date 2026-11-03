# Kerala Mosque Ingestion Pipeline (OpenStreetMap Overpass API)

This pipeline extracts, normalizes, deduplicates, and seeds Kerala mosques from OpenStreetMap into the SalahNear PostgreSQL / PostGIS database.

---

## Architecture Overview

```
OpenStreetMap (Overpass API)
         │
         ▼
[overpass-client.js]  <── Multi-endpoint failover & exponential backoff
         │
         ▼
[normalizer.js]       <── Resolves Malayalam (name:ml) + English names,
         │                addresses, district mapping & deterministic UUIDv5
         ▼
[deduplicator.js]     <── Merges overlapping OSM node & building polygons (<40m)
         │
    ┌────┴────────────────────────┬────────────────────────┐
    ▼                             ▼                        ▼
kerala_mosques.json    osm_kerala_mosques_seed.sql    Direct Supabase REST Sync
(JSON API Dataset)      (PostGIS SQL with ST_MakePoint) (--direct-sync flag)
```

---

## Quick Usage

### 1. Ingest Mosques for a Specific District

```bash
# Ingest Kozhikode district (Default)
node scripts/ingestion/ingest.js --district=Kozhikode

# Ingest multiple districts
node scripts/ingestion/ingest.js --district=Kozhikode,Malappuram,Kannur
```

### 2. Ingest All 14 Kerala Districts Statewide

```bash
node scripts/ingestion/ingest.js --all
```

Supported districts:
* `Kasaragod`, `Kannur`, `Wayanad`, `Kozhikode`, `Malappuram`, `Palakkad`, `Thrissur`, `Ernakulam`, `Idukki`, `Kottayam`, `Alappuzha`, `Pathanamthitta`, `Kollam`, `Thiruvananthapuram`.

### 3. Direct REST Upload to Supabase

```bash
node scripts/ingestion/ingest.js --district=Kozhikode --direct-sync
```

*(Uses the Supabase URL and credentials configured in your project)*

---

## Output Files

1. **JSON Dataset**: `scripts/data/kerala_mosques.json`
2. **PostgreSQL / PostGIS Seed SQL**: `supabase/seed/osm_kerala_mosques_seed.sql`
