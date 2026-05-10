import db from '@/lib/db';
import { Project, Module } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket } from 'mysql2';

export const ProjectModel = {
    async findAll(filters: { 
        search?: string, 
        sortBy?: string, 
        sortOrder?: 'ASC' | 'DESC' 
    } = {}, limit?: number, offset?: number): Promise<{ data: (Project & { owner_name: string, open_issues_count: number })[], total: number }> {
        let whereClause = 'WHERE 1=1';
        const params: any[] = [];

        if (filters.search) {
            whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        const baseQuery = `
            FROM projects p 
            JOIN users u ON p.owner_id = u.user_id
            ${whereClause}
        `;

        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) as total ${baseQuery}`, params);
        const total = countRows[0].total;

        const allowedSortColumns: Record<string, string> = {
            'name': 'p.name',
            'created_at': 'p.created_at',
            'updated_at': 'p.updated_at',
            'owner_name': 'u.name'
        };

        const sortColumn = allowedSortColumns[filters.sortBy || ''] || 'p.created_at';
        const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

        let query = `
            SELECT 
                p.*, 
                u.name as owner_name,
                (SELECT COUNT(*) FROM issue_test_cases itc
                 JOIN issues i ON itc.issue_id = i.issue_id
                 JOIN test_cases tc ON itc.test_case_id = tc.test_case_id
                 JOIN scenarios s ON tc.scenario_id = s.scenario_id
                 JOIN modules m ON s.module_id = m.module_id
                 WHERE m.project_id = p.project_id AND i.status != 'Closed') as open_issues_count
            ${baseQuery}
            ORDER BY ${sortColumn} ${sortOrder}
        `;

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }

        const [rows] = await db.execute<(Project & { owner_name: string, open_issues_count: number })[] & RowDataPacket[]>(query, params);
        return { data: rows, total };
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
    async findModules(filters: { 
        projectId?: string, 
        moduleIds?: string[],
        search?: string,
        sortBy?: string,
        sortOrder?: 'ASC' | 'DESC'
    } = {}, limit?: number, offset?: number): Promise<{ data: (Module & { responsible_name?: string, project_name?: string })[], total: number }> {
        let whereClause = 'WHERE 1=1';
        const params: any[] = [];
        
        if (filters.projectId) {
            whereClause += ' AND m.project_id = ?';
            params.push(filters.projectId);
        }

        if (filters.moduleIds && filters.moduleIds.length > 0) {
            whereClause += ` AND m.module_id IN (${filters.moduleIds.map(() => '?').join(',')})`;
            params.push(...filters.moduleIds);
        }

        if (filters.search) {
            whereClause += ' AND (m.name LIKE ? OR m.description LIKE ? OR p.name LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }

        const baseQuery = `
            FROM modules m 
            LEFT JOIN users u ON m.responsible_id = u.user_id
            JOIN projects p ON m.project_id = p.project_id
            ${whereClause}
        `;

        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) as total ${baseQuery}`, params);
        const total = countRows[0].total;

        const allowedSortColumns: Record<string, string> = {
            'name': 'm.name',
            'project_name': 'p.name',
            'responsible_name': 'u.name'
        };

        const sortColumn = allowedSortColumns[filters.sortBy || ''] || 'm.name';
        const sortOrder = filters.sortOrder === 'DESC' ? 'DESC' : 'ASC';

        let query = `
            SELECT m.*, u.name as responsible_name, p.name as project_name
            ${baseQuery}
            ORDER BY ${sortColumn} ${sortOrder}
        `;

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }

        const [rows] = await db.execute<(Module & { responsible_name?: string, project_name?: string })[] & RowDataPacket[]>(query, params);
        return { data: rows, total };
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
