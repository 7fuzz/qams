/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(process.cwd(), 'lib/db/schema.sql');

async function rebuild() {
    console.log('REBUILDING DATABASE...');
    
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
    
    console.log('Applying schema from:', SCHEMA_PATH);
    await connection.query(schema);
    
    console.log('Database rebuilt successfully.');
    await connection.end();
}

rebuild().catch(err => {
    console.error('Error rebuilding database:', err);
    process.exit(1);
});
