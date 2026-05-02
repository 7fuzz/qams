import db from './db';

export type Action = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'PROJECT' | 'SCENARIO' | 'TEST_CASE';

export function logActivity(
    userId: number,
    action: Action,
    entityType: EntityType,
    entityId: number,
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
