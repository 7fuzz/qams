import db from '@/lib/db';
import { Release, ReleaseChange } from '@/types/app';
import { generateId } from '@/lib/id-utils';

export const ReleaseModel = {
    findAll(projectId?: string) {
        let query = 'SELECT * FROM releases';
        const params: string[] = [];
        if (projectId) {
            query += ' WHERE project_id = ?';
            params.push(projectId);
        }
        query += ' ORDER BY created_at DESC';
        return db.prepare(query).all(...params) as Release[];
    },

    create(data: Partial<Release>) {
        const id = generateId();
        db.prepare(`
            INSERT INTO releases (release_id, project_id, version_name, status, target_date, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, data.project_id, data.version_name, data.status || 'Planning', data.target_date || null, data.description || null);
        return id;
    },

    update(id: string, data: Partial<Release>) {
        db.prepare(`
            UPDATE releases 
            SET version_name = ?, status = ?, target_date = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE release_id = ?
        `).run(data.version_name, data.status, data.target_date || null, data.description || null, id);
        return true;
    },

    delete(id: string) {
        return db.prepare('DELETE FROM releases WHERE release_id = ?').run(id);
    },

    // Release Changes logic
    findChanges(releaseId: string) {
        interface DBChangeRow {
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

        const changes = db.prepare(`
            SELECT 
                rc.*,
                (SELECT GROUP_CONCAT(m.name, '||') FROM release_change_modules rcm JOIN modules m ON rcm.module_id = m.module_id WHERE rcm.change_id = rc.change_id) as module_names,
                (SELECT GROUP_CONCAT(m.module_id, '||') FROM release_change_modules rcm WHERE rcm.change_id = rc.change_id) as module_ids,
                (SELECT GROUP_CONCAT(i.title, '||') FROM release_change_issues rci JOIN issues i ON rci.issue_id = i.issue_id WHERE rci.change_id = rc.change_id) as issue_titles,
                (SELECT GROUP_CONCAT(i.issue_id, '||') FROM release_change_issues rci WHERE rci.change_id = rc.change_id) as issue_ids
            FROM release_changes rc
            WHERE rc.release_id = ?
            ORDER BY rc.created_at ASC
        `).all(releaseId) as DBChangeRow[];

        return changes.map((c: DBChangeRow) => ({
            ...c,
            module_names: c.module_names ? c.module_names.split('||') : [],
            module_ids: c.module_ids ? c.module_ids.split('||') : [],
            issue_titles: c.issue_titles ? c.issue_titles.split('||') : [],
            issue_ids: c.issue_ids ? c.issue_ids.split('||') : []
        })) as ReleaseChange[];
    },

    createChange(data: Partial<ReleaseChange>) {
        const changeId = generateId();
        const { release_id, type, title, description, module_ids, issue_ids } = data;

        const transaction = db.transaction(() => {
            db.prepare(`
                INSERT INTO release_changes (change_id, release_id, type, title, description)
                VALUES (?, ?, ?, ?, ?)
            `).run(changeId, release_id, type, title, description || null);

            if (module_ids && Array.isArray(module_ids)) {
                const insertModule = db.prepare('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)');
                module_ids.forEach(id => insertModule.run(changeId, id));
            }

            if (issue_ids && Array.isArray(issue_ids)) {
                const insertIssue = db.prepare('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)');
                issue_ids.forEach(id => insertIssue.run(changeId, id));
            }

            return changeId;
        });

        return transaction();
    },

    updateChange(id: string, data: Partial<ReleaseChange>) {
        const { type, title, description, module_ids, issue_ids } = data;

        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE release_changes 
                SET type = ?, title = ?, description = ?
                WHERE change_id = ?
            `).run(type, title, description || null, id);

            // Sync Modules
            db.prepare('DELETE FROM release_change_modules WHERE change_id = ?').run(id);
            if (module_ids && Array.isArray(module_ids)) {
                const insertModule = db.prepare('INSERT INTO release_change_modules (change_id, module_id) VALUES (?, ?)');
                module_ids.forEach(mid => insertModule.run(id, mid));
            }

            // Sync Issues
            db.prepare('DELETE FROM release_change_issues WHERE change_id = ?').run(id);
            if (issue_ids && Array.isArray(issue_ids)) {
                const insertIssue = db.prepare('INSERT INTO release_change_issues (change_id, issue_id) VALUES (?, ?)');
                issue_ids.forEach(iid => insertIssue.run(id, iid));
            }
        });

        transaction();
        return true;
    },

    deleteChange(id: string) {
        return db.prepare('DELETE FROM release_changes WHERE change_id = ?').run(id);
    }
};
