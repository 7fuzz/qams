/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(process.cwd(), 'test_management.db');
const SCHEMA_PATH = path.join(process.cwd(), 'lib/db/schema.sql');

async function initDb() {
  console.log('Initializing database at:', DB_PATH);

  const db = new Database(DB_PATH);
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

  db.exec(schema);

  console.log('Database schema created successfully.');

  // Seed Roles
  const insertRole = db.prepare('INSERT OR IGNORE INTO roles (role_id, name, permissions) VALUES (?, ?, ?)');
  const adminRoleId = randomUUID();
  const devRoleId = randomUUID();
  const qaRoleId = randomUUID();

  insertRole.run(adminRoleId, 'Admin', JSON.stringify({ all: true }));
  insertRole.run(devRoleId, 'Developer', JSON.stringify({ edit: true }));
  insertRole.run(qaRoleId, 'QA', JSON.stringify({ test: true }));

  // Seed Users (password: 123)
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash('123', salt);

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)');
  insertUser.run(randomUUID(), 'Admin User', 'admin@example.com', hashed, adminRoleId);
  insertUser.run(randomUUID(), 'Dev User', 'dev@example.com', hashed, devRoleId);

  console.log('Seed data added.');
  db.close();
}

initDb().catch(err => {
  console.error('Error initializing database:', err);
  process.exit(1);
});
