import db from '@/lib/db';
import { Project, Module } from '@/types/app';
import { generateId } from '@/lib/id-utils';
import { RowDataPacket } from 'mysql2';

export const ProjectModel = {
    async findAll(filters: { 
        search?: string, 
        sortBy?: string, 
        sortOrder?: 'ASC' | 'DESC',
        assignedUserId?: string
    } = {}, limit?: number, offset?: number): Promise<{ data: (Project & { lead_developer_name: string, open_issues_count: number })[], total: number }> {
        let whereClause = 'WHERE 1=1';
        const params: unknown[] = [];

        if (filters.search) {
            whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters.assignedUserId) {
            whereClause += ' AND (p.lead_developer_id = ? OR p.project_id IN (SELECT project_id FROM project_assignments WHERE user_id = ?))';
            params.push(filters.assignedUserId, filters.assignedUserId);
        }

        const baseQuery = `
            FROM projects p 
            JOIN users u ON p.lead_developer_id = u.user_id
            ${whereClause}
        `;

        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) as total ${baseQuery}`, params);
        const total = countRows[0].total;

        const allowedSortColumns: Record<string, string> = {
            'name': 'p.name',
            'created_at': 'p.created_at',
            'updated_at': 'p.updated_at',
            'lead_developer_name': 'u.name'
        };

        const sortColumn = allowedSortColumns[filters.sortBy || ''] || 'p.created_at';
        const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';

        let query = `
            SELECT 
                p.*, 
                u.name as lead_developer_name,
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

        const [rows] = await db.execute<(Project & { lead_developer_name: string, open_issues_count: number })[] & RowDataPacket[]>(query, params);
        return { data: rows, total };
    },

    async create(data: { name: string, version?: string, description?: string, lead_developer_id: string }): Promise<string> {
        const projectId = generateId();
        await db.execute('INSERT INTO projects (project_id, name, version, description, lead_developer_id) VALUES (?, ?, ?, ?, ?)', 
            [projectId, data.name, data.version || '1.0.0', data.description || null, data.lead_developer_id]);
        return projectId;
    },

    async update(id: string, data: { name?: string, version?: string, description?: string, lead_developer_id?: string }): Promise<void> {
        await db.execute(`
            UPDATE projects 
            SET name = COALESCE(?, name), 
                version = COALESCE(?, version), 
                description = COALESCE(?, description), 
                lead_developer_id = COALESCE(?, lead_developer_id) 
            WHERE project_id = ?
        `, [
            data.name ?? null, 
            data.version ?? null, 
            data.description ?? null, 
            data.lead_developer_id ?? null, 
            id
        ]);
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
        const params: unknown[] = [];
        
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

    async createModule(data: { project_id: string, name: string, description?: string, responsible_id?: string, sla_date?: string, actual_date?: string }): Promise<string> {
        const moduleId = generateId();
        await db.execute('INSERT INTO modules (module_id, project_id, name, description, responsible_id, sla_date, actual_date) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [moduleId, data.project_id, data.name, data.description || null, data.responsible_id || null, data.sla_date || null, data.actual_date || null]);
        return moduleId;
    },

    async updateModule(id: string, data: { name?: string, description?: string, responsible_id?: string, sla_date?: string, actual_date?: string }): Promise<void> {
        await db.execute(`
            UPDATE modules 
            SET name = COALESCE(?, name), 
                description = COALESCE(?, description), 
                responsible_id = COALESCE(?, responsible_id), 
                sla_date = COALESCE(?, sla_date), 
                actual_date = COALESCE(?, actual_date) 
            WHERE module_id = ?
        `, [
            data.name ?? null, 
            data.description ?? null, 
            data.responsible_id ?? null, 
            data.sla_date ?? null, 
            data.actual_date ?? null, 
            id
        ]);
    },

    async deleteModule(id: string): Promise<void> {
        await db.execute('DELETE FROM modules WHERE module_id = ?', [id]);
    },

    async getProjectIdFromModule(moduleId: string): Promise<string | null> {
        const [rows] = await db.execute<RowDataPacket[]>('SELECT project_id FROM modules WHERE module_id = ?', [moduleId]);
        return rows.length > 0 ? (rows[0] as { project_id: string }).project_id : null;
    },

    async getProjectIdFromScenario(scenarioId: string): Promise<string | null> {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT m.project_id 
            FROM modules m
            JOIN scenarios s ON m.module_id = s.module_id
            WHERE s.scenario_id = ?
        `, [scenarioId]);
        return rows.length > 0 ? (rows[0] as { project_id: string }).project_id : null;
    },

    async getProjectIdFromTestCase(testCaseId: string): Promise<string | null> {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT m.project_id 
            FROM modules m
            JOIN scenarios s ON m.module_id = s.module_id
            JOIN test_cases tc ON s.scenario_id = tc.scenario_id
            WHERE tc.test_case_id = ?
        `, [testCaseId]);
        return rows.length > 0 ? (rows[0] as { project_id: string }).project_id : null;
    },

    // Assignment Logic
    async assignUser(projectId: string, userId: string): Promise<void> {
        await db.execute('INSERT IGNORE INTO project_assignments (project_id, user_id) VALUES (?, ?)', [projectId, userId]);
    },

    async unassignUser(projectId: string, userId: string): Promise<void> {
        await db.execute('DELETE FROM project_assignments WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    },

    async getAssignedUsers(projectId: string): Promise<{ user_id: string, name: string, email: string }[]> {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT u.user_id, u.name, u.email 
            FROM users u
            JOIN project_assignments pa ON u.user_id = pa.user_id
            WHERE pa.project_id = ?
        `, [projectId]);
        return rows as { user_id: string, name: string, email: string }[];
    },

    async isUserAssigned(projectId: string, userId: string): Promise<boolean> {
        const [rows] = await db.execute<RowDataPacket[]>(`
            SELECT 1 FROM project_assignments WHERE project_id = ? AND user_id = ?
            UNION
            SELECT 1 FROM projects WHERE project_id = ? AND lead_developer_id = ?
        `, [projectId, userId, projectId, userId]);
        return rows.length > 0;
    }
};
