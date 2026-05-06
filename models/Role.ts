import db from '@/lib/db';
import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';

export interface Role {
    role_id: string;
    name: string;
}

export interface Permission {
    permission_id: string;
    name: string;
    description: string;
}

export const RoleModel = {
    async findAll(): Promise<Role[]> {
        const [rows] = await db.execute<Role[] & RowDataPacket[]>('SELECT * FROM roles ORDER BY name ASC');
        return rows;
    },

    async findByName(name: string): Promise<Role | undefined> {
        const [rows] = await db.execute<Role[] & RowDataPacket[]>('SELECT * FROM roles WHERE name = ?', [name]);
        return rows[0];
    },

    async findById(id: string): Promise<Role | undefined> {
        const [rows] = await db.execute<Role[] & RowDataPacket[]>('SELECT * FROM roles WHERE role_id = ?', [id]);
        return rows[0];
    },

    async create(name: string, permissionIds: string[]): Promise<string> {
        const roleId = randomUUID();
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute('INSERT INTO roles (role_id, name) VALUES (?, ?)', [roleId, name]);
            if (permissionIds.length > 0) {
                for (const pid of permissionIds) {
                    await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pid]);
                }
            }
            await connection.commit();
            return roleId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    async update(roleId: string, name: string, permissionIds: string[]): Promise<void> {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        try {
            await connection.execute('UPDATE roles SET name = ? WHERE role_id = ?', [name, roleId]);
            await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
            if (permissionIds.length > 0) {
                for (const pid of permissionIds) {
                    await connection.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pid]);
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

    async delete(roleId: string): Promise<void> {
        await db.execute('DELETE FROM roles WHERE role_id = ?', [roleId]);
    },

    async getPermissions(roleId: string): Promise<Permission[]> {
        const [rows] = await db.execute<Permission[] & RowDataPacket[]>(`
            SELECT p.* FROM permissions p
            JOIN role_permissions rp ON p.permission_id = rp.permission_id
            WHERE rp.role_id = ?
        `, [roleId]);
        return rows;
    },

    async findAllPermissions(): Promise<Permission[]> {
        const [rows] = await db.execute<Permission[] & RowDataPacket[]>('SELECT * FROM permissions ORDER BY name ASC');
        return rows;
    }
};
