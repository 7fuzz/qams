import db from '@/lib/db';
import { Attachment } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket } from 'mysql2';

export const AttachmentModel = {
    async findAll(entityId: string, entityType: string): Promise<Attachment[]> {
        const [rows] = await db.execute<Attachment[] & RowDataPacket[]>('SELECT * FROM attachments WHERE entity_id = ? AND entity_type = ? ORDER BY created_at ASC', 
            [entityId, entityType]);
        return rows;
    },

    async create(data: { entity_id: string, entity_type: string, url: string, name?: string }): Promise<Attachment & { attachment_id: string }> {
        const id = generateId();
        const name = data.name || data.url;
        await db.execute('INSERT INTO attachments (attachment_id, entity_id, entity_type, url, name) VALUES (?, ?, ?, ?, ?)', 
            [id, data.entity_id, data.entity_type, data.url, name]);
        return { attachment_id: id, ...data, name };
    },

    async delete(id: string): Promise<void> {
        await db.execute('DELETE FROM attachments WHERE attachment_id = ?', [id]);
    }
};
