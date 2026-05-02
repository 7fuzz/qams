const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'test_management.db');
const SCHEMA_PATH = path.join(process.cwd(), 'lib/db/schema.sql');

async function initDb() {
    console.log('Initializing database at:', DB_PATH);
    
    const db = new Database(DB_PATH);
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    db.exec(schema);
    
    console.log('Database schema created successfully.');
    
    // Seed Roles
    const insertRole = db.prepare('INSERT OR IGNORE INTO roles (name, permissions) VALUES (?, ?)');
    insertRole.run('Admin', JSON.stringify({ all: true }));
    insertRole.run('Developer', JSON.stringify({ edit: true }));
    insertRole.run('QA', JSON.stringify({ test: true }));
    
    const adminRole = db.prepare('SELECT role_id FROM roles WHERE name = ?').get('Admin');
    const devRole = db.prepare('SELECT role_id FROM roles WHERE name = ?').get('Developer');

    // Seed Users (password: 123)
    // Note: In a real app, use bcrypt to hash passwords. Using plain text here per request.
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)');
    insertUser.run('Admin User', 'admin@example.com', '123', adminRole.role_id);
    insertUser.run('Dev User', 'dev@example.com', '123', devRole.role_id);
    
    console.log('Seed data added.');
    db.close();
}

initDb().catch(err => {
    console.error('Error initializing database:', err);
    process.exit(1);
});
