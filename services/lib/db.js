const { Pool } = (() => {
  try {
    return require('pg');
  } catch (e) {
    throw new Error(
      "Missing dependency 'pg'. Run `npm install` inside `services/` before executing this service."
    );
  }
})();

let pool;

function getEnv(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function getPool() {
  if (pool) return pool;

  const host = getEnv('POSTGRES_HOST', 'localhost');
  const port = Number(getEnv('POSTGRES_PORT', '5432'));
  const database = getEnv('POSTGRES_DB', 'crea_db');
  const user = getEnv('POSTGRES_USER', 'crea');
  const password = getEnv('POSTGRES_PASSWORD', '');

  pool = new Pool({
    host,
    port,
    database,
    user,
    password,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

async function withClient(fn) {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function getSystemUserId() {
  const preferredEmail = getEnv('RADAR_REGISTRADO_POR_EMAIL', 'editor@creacontenidos.com');

  const byEmail = await query(
    "SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) AND activo = TRUE AND deleted_at IS NULL LIMIT 1",
    [preferredEmail]
  );
  if (byEmail.rows[0]?.id) return byEmail.rows[0].id;

  const fallback = await query(
    "SELECT id FROM usuarios WHERE activo = TRUE AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1"
  );
  if (fallback.rows[0]?.id) return fallback.rows[0].id;

  throw new Error('No active users found in usuarios (needed for ideas.registrado_por)');
}

module.exports = {
  getPool,
  query,
  withClient,
  getSystemUserId,
};

