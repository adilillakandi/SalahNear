// Main Ingestion CLI Runner

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from './config.js';
import { OverpassClient } from './overpass-client.js';
import { MosqueNormalizer } from './normalizer.js';
import { MosqueDeduplicator } from './deduplicator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to escape SQL strings
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

// Generate PostGIS SQL insert statement for a batch of mosques
function generateSqlSeed(mosques) {
  const header = `-- ==============================================================================
-- OpenStreetMap Kerala Mosques Ingested Dataset
-- Generated on: ${new Date().toISOString()}
-- Total records: ${mosques.length}
-- ==============================================================================

`;

  const valuesList = mosques.map((m) => {
    const id = escapeSql(m.id);
    const name = escapeSql(m.name);
    const altName = escapeSql(m.alternate_name);
    const address = escapeSql(m.address);
    const city = escapeSql(m.city_or_locality);
    const district = escapeSql(m.district);
    const pincode = escapeSql(m.pincode);
    const sourceRef = escapeSql(m.source_reference);

    return `  (
    ${id},
    ${name},
    ${altName},
    ${address},
    ${city},
    ${district},
    'Kerala',
    ${pincode},
    extensions.st_setsrid(extensions.st_makepoint(${m.longitude}, ${m.latitude}), 4326)::extensions.geography,
    ${m.attendance_radius_m},
    'verified',
    'openstreetmap',
    ${sourceRef},
    true
  )`;
  }).join(',\n');

  return (
    header +
    `insert into public.mosques (
  id,
  name,
  alternate_name,
  address,
  city_or_locality,
  district,
  state,
  pincode,
  location,
  attendance_radius_m,
  verification_status,
  source,
  source_reference,
  is_active
) values
${valuesList}
on conflict (id) do update set
  name = excluded.name,
  alternate_name = coalesce(excluded.alternate_name, public.mosques.alternate_name),
  address = excluded.address,
  city_or_locality = excluded.city_or_locality,
  location = excluded.location,
  updated_at = now();
`
  );
}

// Direct sync to Supabase REST API
async function directSyncToSupabase(mosques, supabaseUrl, apiKey) {
  console.log(`\n[Supabase Sync] Uploading ${mosques.length} mosques to ${supabaseUrl}...`);
  const endpoint = `${supabaseUrl}/rest/v1/mosques`;
  const batchSize = 100;
  let successCount = 0;

  for (let i = 0; i < mosques.length; i += batchSize) {
    const batch = mosques.slice(i, i + batchSize).map((m) => ({
      id: m.id,
      name: m.name,
      alternate_name: m.alternate_name,
      address: m.address,
      city_or_locality: m.city_or_locality,
      district: m.district,
      state: m.state,
      pincode: m.pincode,
      // GeoJSON Point for PostGIS column
      location: `POINT(${m.longitude} ${m.latitude})`,
      attendance_radius_m: m.attendance_radius_m,
      verification_status: m.verification_status,
      source: m.source,
      source_reference: m.source_reference,
      is_active: m.is_active,
    }));

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Supabase Sync] Batch ${i / batchSize + 1} failed: ${res.status} ${errorText}`);
      } else {
        successCount += batch.length;
        console.log(`[Supabase Sync] Synced batch ${i / batchSize + 1} (${successCount}/${mosques.length})`);
      }
    } catch (err) {
      console.error(`[Supabase Sync] Error during batch upload:`, err.message);
    }
  }

  console.log(`[Supabase Sync] Completed! Successfully uploaded ${successCount} records.`);
}

async function main() {
  const args = process.argv.slice(2);
  const helpFlag = args.includes('--help') || args.includes('-h');

  if (helpFlag) {
    console.log(`
SalahNear: Kerala Mosque Ingestion Pipeline

Options:
  --all                     Ingest mosques for all 14 Kerala districts
  --district=NAME           Ingest a specific district (e.g. --district=Kozhikode)
  --limit=NUMBER            Limit items per district (for testing)
  --output-json=PATH        Path for JSON output (default: scripts/data/kerala_mosques.json)
  --output-sql=PATH         Path for SQL seed output (default: supabase/seed/osm_kerala_mosques_seed.sql)
  --direct-sync             Sync directly into Supabase database via REST
  --supabase-url=URL        Supabase Project URL
  --supabase-key=KEY        Supabase Anon or Service Role key
    `);
    process.exit(0);
  }

  // Parse district list
  const districtArg = args.find((a) => a.startsWith('--district='));
  const allFlag = args.includes('--all');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const directSyncFlag = args.includes('--direct-sync');

  let targetDistricts = [];
  if (districtArg) {
    const val = districtArg.split('=')[1];
    targetDistricts = val.split(',').map((d) => d.trim());
  } else if (allFlag) {
    targetDistricts = Object.keys(CONFIG.districts);
  } else {
    // Default to a primary high-density district for initial quick run
    targetDistricts = ['Kozhikode'];
    console.log('[Ingestion] No district specified. Defaulting to Kozhikode. Use --all to process all 14 districts.');
  }

  const limitPerDistrict = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  // Output paths
  const jsonArg = args.find((a) => a.startsWith('--output-json='));
  const sqlArg = args.find((a) => a.startsWith('--output-sql='));

  const jsonOutputPath = jsonArg
    ? path.resolve(jsonArg.split('=')[1])
    : path.resolve(__dirname, '../data/kerala_mosques.json');

  const sqlOutputPath = sqlArg
    ? path.resolve(sqlArg.split('=')[1])
    : path.resolve(__dirname, '../../supabase/seed/osm_kerala_mosques_seed.sql');

  const client = new OverpassClient();
  const normalizer = new MosqueNormalizer();
  const deduplicator = new MosqueDeduplicator();

  const allRawMosques = [];

  for (let i = 0; i < targetDistricts.length; i++) {
    const district = targetDistricts[i];
    const info = CONFIG.districts[district];

    if (!info) {
      console.warn(`[Ingestion] Unknown district '${district}'. Skipping.`);
      continue;
    }

    try {
      const elements = await client.fetchDistrictMosques(district, info.bbox);
      let count = 0;

      for (const el of elements) {
        if (limitPerDistrict && count >= limitPerDistrict) break;
        const normalized = normalizer.normalize(el, district);
        if (normalized) {
          allRawMosques.push(normalized);
          count++;
        }
      }

      console.log(`[Ingestion] Processed ${count} normalized mosques from ${district}`);

      // Polite delay between district queries to prevent Overpass throttling
      if (i < targetDistricts.length - 1) {
        console.log('[Ingestion] Pausing 2 seconds before next district...');
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`[Ingestion] Failed to process district ${district}: ${err.message}`);
    }
  }

  console.log(`\n[Ingestion] Total elements normalized before deduplication: ${allRawMosques.length}`);

  // Deduplicate
  const uniqueMosques = deduplicator.deduplicate(allRawMosques);

  // Write JSON
  fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
  fs.writeFileSync(jsonOutputPath, JSON.stringify(uniqueMosques, null, 2), 'utf-8');
  console.log(`[Ingestion] Saved ${uniqueMosques.length} mosques to JSON: ${jsonOutputPath}`);

  // Write SQL
  fs.mkdirSync(path.dirname(sqlOutputPath), { recursive: true });
  const sqlContent = generateSqlSeed(uniqueMosques);
  fs.writeFileSync(sqlOutputPath, sqlContent, 'utf-8');
  console.log(`[Ingestion] Saved SQL seed file to: ${sqlOutputPath}`);

  // Direct sync if requested
  if (directSyncFlag) {
    const urlArg = args.find((a) => a.startsWith('--supabase-url='));
    const keyArg = args.find((a) => a.startsWith('--supabase-key='));

    const supabaseUrl = urlArg
      ? urlArg.split('=')[1]
      : 'https://vopcihpgfqborlwwimyx.supabase.co';

    const supabaseKey = keyArg
      ? keyArg.split('=')[1]
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvcGNpaHBnZnFib3Jsd3dpbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODE4OTIsImV4cCI6MjEwOTE1Nzg5Mn0.Uo4EEiJJbY2vyByF-c_AIrB7U-pd5SkwHrdT8RXn9J4';

    await directSyncToSupabase(uniqueMosques, supabaseUrl, supabaseKey);
  }

  console.log(`\n======================================================`);
  console.log(`[Ingestion] Completed successfully! ${uniqueMosques.length} mosques processed.`);
  console.log(`======================================================`);
}

main().catch((err) => {
  console.error('[Ingestion] Uncaught error:', err);
  process.exit(1);
});
