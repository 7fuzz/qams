/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const SCHEMA_PATH = path.join(process.cwd(), 'lib/db/schema.sql');

async function initDb(existingConnection = null) {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    multipleStatements: true
  };

  let connection = existingConnection;
  if (!connection) {
    console.log('Connecting to MySQL at:', config.host);
    connection = await mysql.createConnection(config);
  }

  const dbName = process.env.MYSQL_DATABASE || 'test_management';
  
  // Ensure database exists and is active
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.query(`USE \`${dbName}\``);

  console.log(`Using database: ${dbName}`);

  // Apply Schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query(schema);
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Database schema applied successfully.');

  // 1. Seed Roles & Permissions
  console.log('Seeding base roles and permissions...');
  const adminRoleId = randomUUID();
  const devRoleId = randomUUID();
  const qaRoleId = randomUUID();
  const observerId = randomUUID();

  await connection.query('INSERT IGNORE INTO roles (role_id, name) VALUES (?, ?)', [adminRoleId, 'Admin']);
  await connection.query('INSERT IGNORE INTO roles (role_id, name) VALUES (?, ?)', [devRoleId, 'Developer']);
  await connection.query('INSERT IGNORE INTO roles (role_id, name) VALUES (?, ?)', [qaRoleId, 'QA']);
  await connection.query('INSERT IGNORE INTO roles (role_id, name) VALUES (?, ?)', [observerId, 'Observer']);

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

  const permIds = {};
  for (const p of perms) {
    const id = randomUUID();
    await connection.query('INSERT IGNORE INTO permissions (permission_id, name, description) VALUES (?, ?, ?)', [id, p.name, p.desc]);
    const [rows] = await connection.query('SELECT permission_id FROM permissions WHERE name = ?', [p.name]);
    permIds[p.name] = rows[0].permission_id;
  }

  // Admin gets everything
  for (const pid of Object.values(permIds)) {
    await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRoleId, pid]);
  }

  // Dev gets projects:write, projects:read, tests:write, issues:manage
  const devPerms = ['projects:write', 'projects:read', 'tests:write', 'issues:manage'];
  for (const name of devPerms) {
    if (permIds[name]) await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [devRoleId, permIds[name]]);
  }

  // QA gets projects:read, tests:run, tests:write
  const qaPerms = ['projects:read', 'tests:run', 'tests:write'];
  for (const name of qaPerms) {
    if (permIds[name]) await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [qaRoleId, permIds[name]]);
  }

  // Observer gets projects:read
  const obsPerms = ['projects:read'];
  for (const name of obsPerms) {
    if (permIds[name]) await connection.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [observerId, permIds[name]]);
  }

  // 2. Seed Admin User (password: 123)
  console.log('Seeding Primary Admin User...');
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash('123', salt);

  // We use REPLACE INTO to ensure that even if the reset logic was messy, the admin user definitely exists with these credentials
  await connection.query('REPLACE INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)',
    [randomUUID(), 'System Admin', 'admin@example.com', hashed, adminRoleId]);

  console.log('--- ADMIN SEEDED: admin@example.com / 123 ---');
  
  if (!existingConnection) {
    await connection.end();
  }
}

module.exports = { initDb };

if (require.main === module) {
  initDb().catch(err => {
    console.error('Error initializing database:', err);
    process.exit(1);
  });
}
