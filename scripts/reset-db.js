/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

const SCHEMA_PATH = path.join(process.cwd(), 'lib/db/schema.sql');

async function reset() {
    console.log('--- RESETTING DATABASE (SCHEMA + ROLES + ADMIN) ---');
    
    const dbName = process.env.MYSQL_DATABASE || 'test_management';
    const config = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        multipleStatements: true
    };

    console.log('Connecting to MySQL at:', config.host);
    const connection = await mysql.createConnection(config);

    console.log(`Dropping and recreating database: ${dbName}`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await connection.query(`CREATE DATABASE \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    console.log('Applying schema...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query(schema);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Database rebuilt successfully.');

    // Initialize with Roles, Permissions, and 1 Admin User
    console.log('Initializing roles and permissions...');
    const adminRoleId = randomUUID();
    const devRoleId = randomUUID();
    const qaRoleId = randomUUID();
    const observerRoleId = randomUUID();
    
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [adminRoleId, 'Admin']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [devRoleId, 'Developer']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [qaRoleId, 'QA']);
    await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [observerRoleId, 'Observer']);

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
        await connection.query('INSERT INTO permissions (permission_id, name, description) VALUES (?, ?, ?)', [id, p.name, p.desc]);
        permIds[p.name] = id;
    }

    // Admin gets everything
    for (const pid of Object.values(permIds)) {
        await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRoleId, pid]);
    }
    
    // Dev gets projects:write, projects:read, tests:write, issues:manage
    const devPerms = ['projects:write', 'projects:read', 'tests:write', 'issues:manage'];
    for (const name of devPerms) {
        if (permIds[name]) await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [devRoleId, permIds[name]]);
    }
         
    // QA gets projects:read, tests:run, tests:write
    const qaPerms = ['projects:read', 'tests:run', 'tests:write'];
    for (const name of qaPerms) {
        if (permIds[name]) await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [qaRoleId, permIds[name]]);
    }

    // Observer gets projects:read
    const obsPerms = ['projects:read'];
    for (const name of obsPerms) {
        if (permIds[name]) await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [observerRoleId, permIds[name]]);
    }

    // Create 1 Admin User
    console.log('Creating admin user...');
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('123', salt);
    await connection.query('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), 'Admin User', 'admin@example.com', hashed, adminRoleId]);

    console.log('--- DATABASE RESET AND INITIALIZED SUCCESSFULLY ---');
    console.log('Admin Login: admin@example.com / 123');
    await connection.end();
}

reset().catch(err => {
    console.error('Error resetting database:', err);
    process.exit(1);
});
