import db from '@/lib/db';
import { Release, ReleaseChange } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const ReleaseModel = {
    async findAll(projectId?: string): Promise<Release[]> {
        let query = 'SELECT * FROM releases';
        const params: any[] = [];
        if (projectId) {
            query += ' WHERE project_id = ?';
            params.push(projectId);
        }
        query += ' ORDER BY created_at DESC';
        const [rows] = await db.execute<Release[] & RowDataPacket[]>(query, params);
        return rows;
    },

    async create(data: Partial<Release>): Promise<string> {
        const id = generateId();
        await db.query(`
            INSERT INTO releases (release_id, project_id, version_name, status, target_date, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, data.project_id, data.version_name, data.status || 'Planning', data.target_date || null, data.description || null]);
        return id;
    },

    async update(id: string, data: Partial<Release>): Promise<void> {
        await db.query(`
            UPDATE releases 
            SET version_name = ?, status = ?, target_date = ?, description = ?
            WHERE release_id = ?
        `, [data.version_name, data.status, data.target_date || null, data.description || null, id]);
    },

    async delete(id: string): Promise<void> {
        await db.execute('DELETE FROM releases WHERE release_id = ?', [id]);
    },

    // Release Changes logic
    async findChanges(releaseId: string): Promise<ReleaseChange[]> {
        interface DBChangeRow extends RowDataPacket {
            change_id: string;
            release_id: string;
            type: 'Feature' | 'Bugfix' | 'Enhancement';
            title: string;
            description: string | null;
            module_names: string | null;
            module_ids: string | null;
            issue_titles: string | null;
            issue_ids: string | null;
            created_at: string;
        }

        const [changes] = await db.execute<DBChangeRow[]>(`
            SELECT 
                rc.*,
                (SELECT GROUP_CONCAT(m.name SEPARATOR '||') FROM release_change_modules rcm JOIN modules m ON rcm.module_id = m.module_id WHERE rcm.change_id = rc.change_id) as module_names,
                (SELECT GROUP_CONCAT(m.module_id SEPARATOR '||') FROM release_change_modules rcm WHERE rcm.change_id = rc.change_id) as module_ids,
                (SELECT GROUP_CONCAT(i.title SEPARATOR '||') FROM release_change_issues rci JOIN issues i ON rci.issue_id = i.issue_id WHERE rci.change_id = rc.change_id) as issue_titles,
                (SELECT GROUP_CONCAT(i.issue_id SEPARATOR '||') FROM release_change_issues rci WHERE rci.change_id = rc.change_id) as issue_ids
            FROM release_changes rc
            WHERE rc.release_id = ?
            ORDER BY rc.created_at ASC
        `, [releaseId]);

        return changes.map((c: DBChangeRow) => ({
            ...c,
            module_names: c.module_names ? c.module_names.split('||') : [],
            module_ids: c.module_ids ? c.module_ids.split('||') : [],
            issue_titles: c.issue_titles ? c.issue_titles.split('||') : [],
            issue_ids: c.issue_ids ? c.issue_ids.split('||') : []
        })) as ReleaseChange[];
    },

    async createChange(data: Partial<ReleaseChange>): Promise<string> {
        const changeId = generateId();
        const { release_id, type, title, description, module_ids, issue_ids } = data;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query(`
                INSERT INTO release_changes (change_id, release_id, type, title, description)
                VALUES (?, ?, ?, ?, ?)
            `, [changeId, release_id, type, title, description || null]);

            if (module_ids && Array.isArray(module_ids)) {
                for (const id of module_ids) {
                    await connection.query('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)', [changeId, id]);
                }
            }

            if (issue_ids && Array.isArray(issue_ids)) {
                for (const id of issue_ids) {
                    await connection.query('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)', [changeId, id]);
                }
            }

            await connection.commit();
            return changeId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async updateChange(id: string, data: Partial<ReleaseChange>): Promise<void> {
        const { type, title, description, module_ids, issue_ids } = data;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query(`
                UPDATE release_changes 
                SET type = ?, title = ?, description = ?
                WHERE change_id = ?
            `, [type, title, description || null, id]);

            // Sync Modules
            await connection.query('DELETE FROM release_change_modules WHERE change_id = ?', [id]);
            if (module_ids && Array.isArray(module_ids)) {
                for (const mid of module_ids) {
                    await connection.query('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)', [id, mid]);
                }
            }

            // Sync Issues
            await connection.query('DELETE FROM release_change_issues WHERE change_id = ?', [id]);
            if (issue_ids && Array.isArray(issue_ids)) {
                for (const iid of issue_ids) {
                    await connection.query('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)', [id, iid]);
                }
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async deleteChange(id: string): Promise<void> {
        await db.execute('DELETE FROM release_changes WHERE change_id = ?', [id]);
    }
};
