import pg from 'pg';

let pool;
export function database() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) throw new Error('Connect a PostgreSQL database to this Vercel environment.');
  return pool ??= new pg.Pool({connectionString,max:8,connectionTimeoutMillis:10000,idleTimeoutMillis:15000});
}
