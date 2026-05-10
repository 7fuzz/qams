/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { initDb } = require('./init-db');

async function rebuild() {
    console.log('REBUILDING DATABASE (Consolidated)...');
    
    const dbName = process.env.MYSQL_DATABASE || 'test_management';
    const config = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        multipleStatements: true
    };

    console.log('Connecting to MySQL at:', config.host);
    const connection = await mysql.createConnection(config);

    console.log(`Wiping database: ${dbName}`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    
    // Use the shared init logic to recreate and seed
    await initDb(connection);
    
    console.log('Database rebuilt successfully.');
    await connection.end();
}

rebuild().catch(err => {
    console.error('Error rebuilding database:', err);
    process.exit(1);
});
