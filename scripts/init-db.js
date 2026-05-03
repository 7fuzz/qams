/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const DB_FILENAME = process.argv[2] || 'test_management.db';
const DB_PATH = path.isAbsolute(DB_FILENAME) ? DB_FILENAME : path.join(process.cwd(), DB_FILENAME);
const SCHEMA_PATH = path.join(process.cwd(), 'lib/db/schema.sql');

async function initDb() {
  console.log('Initializing database at:', DB_PATH);

  const db = new Database(DB_PATH);
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

  db.exec(schema);

  console.log('Database schema created successfully.');

  // Seed Roles & Permissions
  console.log('Seeding roles and permissions...');
  const adminRoleId = randomUUID();
  const devRoleId = randomUUID();
  const qaRoleId = randomUUID();
  
  db.prepare('INSERT OR IGNORE INTO roles (role_id, name) VALUES (?, ?)').run(adminRoleId, 'Admin');
  db.prepare('INSERT OR IGNORE INTO roles (role_id, name) VALUES (?, ?)').run(devRoleId, 'Developer');
  db.prepare('INSERT OR IGNORE INTO roles (role_id, name) VALUES (?, ?)').run(qaRoleId, 'QA');

  const perms = [
      { name: 'users:manage', desc: 'Create, update, delete users' },
      { name: 'roles:manage', desc: 'Create, update, delete roles' },
      { name: 'projects:write', desc: 'Create, update, delete projects/modules/scenarios' },
      { name: 'projects:read', desc: 'View projects' },
      { name: 'tests:write', desc: 'Create and update test cases' },
      { name: 'tests:run', desc: 'Execute test runs' },
      { name: 'issues:manage', desc: 'Update/close any issue' },
      { name: 'logs:read', desc: 'View system activity logs' }
  ];

  const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (permission_id, name, description) VALUES (?, ?, ?)');
  const permIds = {};
  perms.forEach(p => {
    const id = randomUUID();
    insertPerm.run(id, p.name, p.desc);
    // Since we use INSERT OR IGNORE, if it already exists we need to fetch the ID
    const row = db.prepare('SELECT permission_id FROM permissions WHERE name = ?').get(p.name);
    permIds[p.name] = row.permission_id;
  });

  const insertRolePerm = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  
  // Admin gets everything
  Object.values(permIds).forEach(pid => insertRolePerm.run(adminRoleId, pid));
  
  // Dev gets projects:write, projects:read, tests:write, issues:manage
  ['projects:write', 'projects:read', 'tests:write', 'issues:manage'].forEach(name => {
    if (permIds[name]) insertRolePerm.run(devRoleId, permIds[name]);
  });
         
  // QA gets projects:read, tests:run, tests:write
  ['projects:read', 'tests:run', 'tests:write'].forEach(name => {
    if (permIds[name]) insertRolePerm.run(qaRoleId, permIds[name]);
  });

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
