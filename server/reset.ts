// npm run db:reset: wipe the database and load the demo data again (all accounts and changes are lost)
import { openDb, seed, DEFAULT_DB_PATH } from './db';

const db = openDb();
seed(db);
console.log(`Database reset: ${process.env.DB_PATH || DEFAULT_DB_PATH}`);
