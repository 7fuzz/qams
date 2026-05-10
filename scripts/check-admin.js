require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkAdmin() {
    const config = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'test_management'
    };

    console.log('Checking database:', config.database);
    const connection = await mysql.createConnection(config);
    
    try {
        const [users] = await connection.query('SELECT user_id, name, email FROM users');
        console.log('Total users found:', users.length);
        console.log('Users:', JSON.stringify(users, null, 2));
        
        const admin = users.find(u => u.email === 'admin@example.com');
        if (admin) {
            console.log('SUCCESS: admin@example.com exists.');
        } else {
            console.log('FAILURE: admin@example.com NOT FOUND.');
        }
    } catch (err) {
        console.error('Error querying users:', err.message);
    } finally {
        await connection.end();
    }
}

checkAdmin();
