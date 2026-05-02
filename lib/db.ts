import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), process.env.DATABASE_URL || 'test_management.db');

const db = new Database(DB_PATH, { verbose: console.log });

export default db;
