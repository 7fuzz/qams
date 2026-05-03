import db from '@/lib/db';
import { Attachment } from '@/types/app';
import { generateId } from '@/lib/id-utils';

export const AttachmentModel = {
    findAll(entityId: string, entityType: string) {
        return db.prepare('SELECT * FROM attachments WHERE entity_id = ? AND entity_type = ? ORDER BY created_at ASC')
            .all(entityId, entityType) as Attachment[];
    },

    create(data: { entity_id: string, entity_type: string, url: string, name?: string }) {
        const id = generateId();
        db.prepare('INSERT INTO attachments (attachment_id, entity_id, entity_type, url, name) VALUES (?, ?, ?, ?, ?)')
            .run(id, data.entity_id, data.entity_type, data.url, data.name || data.url);
        return { attachment_id: id, ...data };
    },

    delete(id: string) {
        return db.prepare('DELETE FROM attachments WHERE attachment_id = ?').run(id);
    }
};
