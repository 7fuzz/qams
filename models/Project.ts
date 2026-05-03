import db from '@/lib/db';
import { Project, Module } from '@/types/app';
import { generateId } from '@/lib/id-utils';

export const ProjectModel = {
    findAll() {
        return db.prepare(`
            SELECT 
                p.*, 
                u.name as owner_name,
                (SELECT COUNT(*) FROM issues i 
                 JOIN test_cases tc ON i.test_case_id = tc.test_case_id
                 JOIN scenarios s ON tc.scenario_id = s.scenario_id
                 JOIN modules m ON s.module_id = m.module_id
                 WHERE m.project_id = p.project_id AND i.status != 'Closed') as open_issues_count
            FROM projects p 
            JOIN users u ON p.owner_id = u.user_id
        `).all() as (Project & { owner_name: string, open_issues_count: number })[];
    },

    create(data: { name: string, version?: string, description?: string, owner_id: string }) {
        const projectId = generateId();
        db.prepare('INSERT INTO projects (project_id, name, version, description, owner_id) VALUES (?, ?, ?, ?, ?)')
            .run(projectId, data.name, data.version || '1.0.0', data.description || null, data.owner_id);
        return projectId;
    },

    update(id: string, data: { name: string, version: string, description?: string }) {
        db.prepare('UPDATE projects SET name = ?, version = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?')
            .run(data.name, data.version, data.description || null, id);
        return true;
    },

    delete(id: string) {
        return db.prepare('DELETE FROM projects WHERE project_id = ?').run(id);
    },

    // Module Logic
    findModules(projectId?: string) {
        let query = `
            SELECT m.*, u.name as responsible_name 
            FROM modules m 
            LEFT JOIN users u ON m.responsible_id = u.user_id
        `;
        const params: string[] = [];
        if (projectId) {
            query += ' WHERE m.project_id = ?';
            params.push(projectId);
        }
        return db.prepare(query).all(...params) as (Module & { responsible_name?: string })[];
    },

    createModule(data: { project_id: string, name: string, description?: string, responsible_id?: string }) {
        const moduleId = generateId();
        db.prepare('INSERT INTO modules (module_id, project_id, name, description, responsible_id) VALUES (?, ?, ?, ?, ?)')
            .run(moduleId, data.project_id, data.name, data.description || null, data.responsible_id || null);
        return moduleId;
    },

    updateModule(id: string, data: { name: string, description?: string, responsible_id?: string }) {
        db.prepare('UPDATE modules SET name = ?, description = ?, responsible_id = ? WHERE module_id = ?')
            .run(data.name, data.description || null, data.responsible_id || null, id);
        return true;
    },

    deleteModule(id: string) {
        return db.prepare('DELETE FROM modules WHERE module_id = ?').run(id);
    }
};
