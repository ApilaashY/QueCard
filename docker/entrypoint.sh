#!/bin/sh
set -e
set -x

echo "⏳ Ensuring pgvector extension is enabled in Supabase..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
pool.query('CREATE EXTENSION IF NOT EXISTS vector;')
  .then(() => { console.log('✅ pgvector extension enabled'); return pool.end(); })
  .catch(e => { console.error('💥 ERROR enabling vector extension:', e); pool.end(); process.exit(1); });
"

echo "⏳ Pushing Prisma schema to Supabase database..."
npx prisma db push --accept-data-loss

echo "✅ Schema sync complete. Starting app..."
exec node server.js
