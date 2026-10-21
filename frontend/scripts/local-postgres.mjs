import EmbeddedPostgres from 'embedded-postgres';
const pg = new EmbeddedPostgres({ databaseDir: '../.local-postgres', user: 'sostav', password: 'sostav', port: 55432, persistent: true });
await pg.initialise();
await pg.start();
const { Client } = await import('pg');
const client = new Client({ host: '127.0.0.1', port: 55432, user: 'sostav', password: 'sostav', database: 'postgres' });
await client.connect();
for (const name of ['sostav', 'sostav_test']) {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!result.rowCount) await client.query(`CREATE DATABASE ${name}`);
}
await client.end();
console.log('PostgreSQL ready on 55432; databases sostav and sostav_test');
const stop = async () => { await pg.stop(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
setInterval(() => {}, 60_000);
