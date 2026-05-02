import db from './db';

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
            INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, action, entityType, entityId, details ? JSON.stringify(details) : null);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
