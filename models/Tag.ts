import db from '@/lib/db';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket } from 'mysql2';

export interface Tag {
    tag_id: string;
    name: string;
    color: string;
    description: string | null;
    created_at?: string;
}

export const TagModel = {
    async findAll(): Promise<Tag[]> {
        const [rows] = await db.execute<RowDataPacket[]>('SELECT * FROM tags ORDER BY name ASC');
        return rows as Tag[];
    },

    async findById(id: string): Promise<Tag | null> {
        const [rows] = await db.execute<RowDataPacket[]>('SELECT * FROM tags WHERE tag_id = ?', [id]);
        return (rows[0] as Tag) || null;
    },

    async create(data: { name: string, color?: string, description?: string }) {
        const id = generateId();
        await db.execute(
            'INSERT INTO tags (tag_id, name, color, description) VALUES (?, ?, ?, ?)',
            [id, data.name, data.color || '#3b82f6', data.description || null]
        );
        return id;
    },

    async update(id: string, data: Partial<Tag>) {
        await db.execute(`
            UPDATE tags 
            SET name = COALESCE(?, name),
                color = COALESCE(?, color),
                description = COALESCE(?, description)
            WHERE tag_id = ?
        `, [data.name ?? null, data.color ?? null, data.description ?? null, id]);
    },

    async delete(id: string) {
        await db.execute('DELETE FROM tags WHERE tag_id = ?', [id]);
    },

    // Issue-Tag Junction Methods
    async getIssueTags(issueId: string): Promise<Tag[]> {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT t.* 
            FROM tags t
            JOIN issue_tags it ON t.tag_id = it.tag_id
            WHERE it.issue_id = ?
            ORDER BY t.name ASC
        `, [issueId]);
        return rows as Tag[];
    },

    async setIssueTags(issueId: string, tagIds: string[]) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute('DELETE FROM issue_tags WHERE issue_id = ?', [issueId]);
            for (const tagId of tagIds) {
                await connection.execute('INSERT INTO issue_tags (issue_id, tag_id) VALUES (?, ?)', [issueId, tagId]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};
