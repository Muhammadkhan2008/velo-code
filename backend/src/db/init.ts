import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pool} from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runInit() {
  const sqlPath = path.resolve(__dirname, '../../sql/init.sql');
  const sql = await readFile(sqlPath, 'utf8');
  await pool.query(sql);
  await pool.end();
  console.log('Database init completed.');
}

runInit().catch(async (error) => {
  console.error('Database init failed:', error);
  await pool.end();
  process.exit(1);
});
