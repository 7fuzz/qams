/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { initDb } = require('./init-db');

async function reset() {
    console.log('--- RESETTING DATABASE ---');
    
    const dbName = process.env.MYSQL_DATABASE || 'test_management';
    const config = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        multipleStatements: true
    };

    console.log('Connecting to MySQL at:', config.host);
    const connection = await mysql.createConnection(config);

    console.log(`Dropping existing database: ${dbName}`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    
    console.log('Triggering fresh initialization...');
    await initDb(connection);

    console.log('--- DATABASE RESET AND INITIALIZED SUCCESSFULLY ---');
    console.log('Admin Login: admin@example.com / 123');
    await connection.end();
}

reset().catch(err => {
    console.error('Error resetting database:', err);
    process.exit(1);
});
