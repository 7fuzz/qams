const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'test_management.db');
const SCHEMA_PATH = path.join(process.cwd(), 'lib/db/schema.sql');

async function rebuild() {
    console.log('REBUILDING DATABASE...');
    
    // Close and delete the existing database
    if (fs.existsSync(DB_PATH)) {
        console.log('Deleting existing database file...');
        fs.unlinkSync(DB_PATH);
    }

    const db = new Database(DB_PATH);
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    console.log('Applying schema from:', SCHEMA_PATH);
    db.exec(schema);
    
    console.log('Database rebuilt successfully.');
    db.close();
}

rebuild().catch(err => {
    console.error('Error rebuilding database:', err);
    process.exit(1);
});
