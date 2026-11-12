/** One-off external-host transfer. Never imported by application routes. */
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';

const connection = process.env['EXTERNAL_DB_MIGRATION_URL'];
const exportPath = process.env['SHOP_TABLE_EXPORT_PATH'];
if (!connection || !exportPath) throw new Error('Secure destination connection and table export path are required');
const tables = ['products', 'delivery_zones', 'store_settings', 'orders', 'order_items', 'order_events', 'payments'] as const;
const expected = JSON.parse(readFileSync(exportPath, 'utf8')) as Record<string, unknown[]>;
for (const table of tables) if (!Array.isArray(expected[table])) throw new Error(`Missing exported table: ${table}`);

// Reuse the existing application schema and its security repairs, never old seed data.
const migrationDirectory = new URL('../drizzle/migrations/', import.meta.url);
const migrations = readdirSync(migrationDirectory).filter(name => name.endsWith('.sql')).sort();
const schema = migrations.filter(name => !name.startsWith('0011_')).map(name => {
  let text = readFileSync(new URL(name, migrationDirectory), 'utf8');
  if (name.startsWith('0000_')) {
    text = text.split('-- Seed')[0] ?? '';
    // Managed publication/bucket configuration is not part of this data copy.
    text = text.replace(/^alter publication .*;\s*$/gm, '');
  }
  if (name.startsWith('0002_')) {
    // Define all existing enum values at once; PostgreSQL cannot use newly added
    // enum labels until their transaction commits.
    text = text.replace("('admin', 'staff', 'rider', 'customer')", "('admin', 'staff', 'rider', 'customer', 'super_admin', 'inventory_manager', 'kitchen_staff', 'cashier', 'delivery_manager')");
    // Do not grant an external account privileges solely by matching its email.
    text = text.replace(/insert into public\.user_roles \(user_id, role\)\s*select id, 'admin'[\s\S]*?on conflict do nothing;/, '');
  }
  if (name.startsWith('0003_')) text = text.replace(/^ALTER TYPE .*;\s*$/gm, '');
  return text;
}).join('\n\n');

const sql = postgres(connection, { ssl: 'require', max: 1, connect_timeout: 15 });
try {
  await sql.begin(async tx => {
    const existing = await tx`select tablename from pg_tables where schemaname='public'`;
    if (existing.length) throw new Error('Destination is no longer empty; refusing to overwrite existing tables');
    await tx.unsafe(schema);
    // Import history exactly once rather than generating new events for old orders.
    await tx.unsafe('ALTER TABLE public.orders DISABLE TRIGGER orders_status_log');
    for (const table of tables) {
      const rows = expected[table];
      await tx.unsafe(`INSERT INTO public.${table} SELECT * FROM jsonb_populate_recordset(NULL::public.${table}, $1::text::jsonb)`, [JSON.stringify(rows)]);
      const count = await tx.unsafe(`SELECT count(*)::int AS count FROM public.${table}`);
      if (count[0]?.['count'] !== rows?.length) throw new Error(`Row count mismatch: ${table}`);
      const mismatch = await tx.unsafe(`
        WITH expected AS (SELECT * FROM jsonb_populate_recordset(NULL::public.${table}, $1::text::jsonb)),
        differences AS ((SELECT * FROM public.${table} EXCEPT SELECT * FROM expected)
        UNION ALL (SELECT * FROM expected EXCEPT SELECT * FROM public.${table}))
        SELECT count(*)::int AS count FROM differences`, [JSON.stringify(rows)]);
      if (mismatch[0]?.['count'] !== 0) throw new Error(`Copied values differ: ${table}`);
    }
    await tx.unsafe('ALTER TABLE public.orders ENABLE TRIGGER orders_status_log');
    await tx`select setval('public.order_number_seq', greatest(10000, coalesce((select max(substring(order_number from '^MW([0-9]+)$')::bigint) from public.orders),10000)),true)`;
    const security = await tx`select count(*)::int as count from pg_tables where schemaname='public' and not rowsecurity`;
    if (security[0]?.['count'] !== 0) throw new Error('Destination table is missing row-level security');
    await tx`NOTIFY pgrst, 'reload schema'`;
  });
  console.log('Copy committed. Exact row values and row-level security verified.');
  for (const table of tables) console.log(`${table}: ${expected[table]?.length}`);
} catch (error) {
  // Provider errors may include connection information; emit only safe codes.
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'validation';
  console.error(`Copy failed (${code}); transaction rolled back.`);
  process.exitCode = 1;
} finally {
  await sql.end();
}