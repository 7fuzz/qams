import db from './db';
import { generateId } from './id-utils';

export type Action = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'ASSIGN' | 'UNASSIGN' | 'CLEAR';
export type EntityType = 'PROJECT' | 'MODULE' | 'SCENARIO' | 'TEST_CASE' | 'TEST_RUN' | 'TAG' | 'ISSUE' | 'RELEASE' | 'USER' | 'ROLE' | 'AUTH' | 'ATTACHMENT' | 'MAIL_CREDENTIAL' | 'CAUGHT_EMAIL' | 'CAUGHT_EMAILS';

export async function logActivity(
    userId: string,
    action: Action,
    entityType: EntityType,
    entityId: string,
    details?: Record<string, unknown>
) {
    try {
        await db.execute(`
            INSERT INTO activity_log (log_id, user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [generateId(), userId, action, entityType, entityId, details ? JSON.stringify(details) : null]);

        // Auto-cleanup: Delete logs older than 1 month
        // We run this with a low probability (e.g., 5% of logs) to avoid constant overhead
        if (Math.random() < 0.05) {
            await db.execute('DELETE FROM activity_log WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 MONTH)');
        }
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
