const fs = require('fs');
const postgres = require('postgres');

async function main() {
  const connectionString = "postgresql://postgres:pkvQ5iFabFUDIVDu@db.iggwfzxtramxovfxsmky.supabase.co:5432/postgres";
  
  // Set options to try to connect via IPV4 or IPV6
  const sql = postgres(connectionString, {
    max: 1,
    ssl: 'require'
  });

  try {
    const schema = fs.readFileSync('supabase/migrations/20260326000000_schema.sql', 'utf8');
    console.log("Applying schema...");
    await sql.unsafe(schema);
    console.log("Schema applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

main();
