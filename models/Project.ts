import db from '@/lib/db';
import { Project, Module } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket } from 'mysql2';

export const ProjectModel = {
    async findAll(): Promise<(Project & { owner_name: string, open_issues_count: number })[]> {
        const [rows] = await db.execute<(Project & { owner_name: string, open_issues_count: number })[] & RowDataPacket[]>(`
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
        `);
        return rows;
    },

    async create(data: { name: string, version?: string, description?: string, owner_id: string }): Promise<string> {
        const projectId = generateId();
        await db.execute('INSERT INTO projects (project_id, name, version, description, owner_id) VALUES (?, ?, ?, ?, ?)', 
            [projectId, data.name, data.version || '1.0.0', data.description || null, data.owner_id]);
        return projectId;
    },

    async update(id: string, data: { name: string, version: string, description?: string }): Promise<void> {
        await db.execute('UPDATE projects SET name = ?, version = ?, description = ? WHERE project_id = ?', 
            [data.name, data.version, data.description || null, id]);
    },

    async delete(id: string): Promise<void> {
        await db.execute('DELETE FROM projects WHERE project_id = ?', [id]);
    },

    // Module Logic
    async findModules(projectId?: string): Promise<(Module & { responsible_name?: string })[]> {
        let query = `
            SELECT m.*, u.name as responsible_name 
            FROM modules m 
            LEFT JOIN users u ON m.responsible_id = u.user_id
        `;
        const params: any[] = [];
        if (projectId) {
            query += ' WHERE m.project_id = ?';
            params.push(projectId);
        }
        const [rows] = await db.execute<(Module & { responsible_name?: string })[] & RowDataPacket[]>(query, params);
        return rows;
    },

    async createModule(data: { project_id: string, name: string, description?: string, responsible_id?: string }): Promise<string> {
        const moduleId = generateId();
        await db.execute('INSERT INTO modules (module_id, project_id, name, description, responsible_id) VALUES (?, ?, ?, ?, ?)', 
            [moduleId, data.project_id, data.name, data.description || null, data.responsible_id || null]);
        return moduleId;
    },

    async updateModule(id: string, data: { name: string, description?: string, responsible_id?: string }): Promise<void> {
        await db.execute('UPDATE modules SET name = ?, description = ?, responsible_id = ? WHERE module_id = ?', 
            [data.name, data.description || null, data.responsible_id || null, id]);
    },

    async deleteModule(id: string): Promise<void> {
        await db.execute('DELETE FROM modules WHERE module_id = ?', [id]);
    }
};
