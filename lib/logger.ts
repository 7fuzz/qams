import db from './db';
import { generateId } from './id-utils';

export type Action = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
export type EntityType = 'PROJECT' | 'MODULE' | 'SCENARIO' | 'TEST_CASE' | 'TEST_RUN' | 'TAG' | 'ISSUE' | 'RELEASE' | 'USER' | 'ROLE' | 'AUTH' | 'ATTACHMENT';

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
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
