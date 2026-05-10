require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const dbName = process.env.MYSQL_DATABASE || 'test_management';
    const config = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: dbName,
        multipleStatements: true
    };

    const connection = await mysql.createConnection(config);
    console.log('Migrating to Many-to-Many Issues <-> Test Cases...');

    try {
        // 1. Create junction table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS issue_test_cases (
                issue_id VARCHAR(255) NOT NULL,
                test_case_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (issue_id, test_case_id),
                FOREIGN KEY (issue_id) REFERENCES issues(issue_id) ON DELETE CASCADE,
                FOREIGN KEY (test_case_id) REFERENCES test_cases(test_case_id) ON DELETE CASCADE
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('Junction table created.');

        // 2. Migrate data
        await connection.query(`
            INSERT IGNORE INTO issue_test_cases (issue_id, test_case_id)
            SELECT issue_id, test_case_id FROM issues WHERE test_case_id IS NOT NULL;
        `);
        console.log('Data migrated.');

        // 3. Drop foreign key and column from issues
        // We need to find the correct foreign key name. Usually it's issues_ibfk_1 but let's be sure.
        const [rows] = await connection.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'test_case_id'
        `, [dbName]);

        if (rows.length > 0) {
            const fkName = rows[0].CONSTRAINT_NAME;
            await connection.query(`ALTER TABLE issues DROP FOREIGN KEY ${fkName}`);
            console.log(`Foreign key ${fkName} dropped.`);
        }

        await connection.query(`ALTER TABLE issues DROP COLUMN test_case_id`);
        console.log('Column test_case_id dropped from issues.');

        console.log('Migration successful.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
