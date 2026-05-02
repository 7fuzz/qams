import db from './db';
import { generateId } from './id-utils';

export type Action = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'PROJECT' | 'MODULE' | 'SCENARIO' | 'TEST_CASE' | 'TEST_RUN';

export function logActivity(
    userId: string,
    action: Action,
    entityType: EntityType,
    entityId: string,
    details?: Record<string, unknown>
) {
    try {
        db.prepare(`
            INSERT INTO activity_log (log_id, user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(generateId(), userId, action, entityType, entityId, details ? JSON.stringify(details) : null);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
