import db from '@/lib/db';
import { randomUUID } from 'crypto';

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
    findAll() {
        return db.prepare('SELECT * FROM roles ORDER BY name ASC').all() as Role[];
    },

    findByName(name: string) {
        return db.prepare('SELECT * FROM roles WHERE name = ?').get(name) as Role | undefined;
    },

    findById(id: string) {
        return db.prepare('SELECT * FROM roles WHERE role_id = ?').get(id) as Role | undefined;
    },

    create(name: string, permissionIds: string[]) {
        const roleId = randomUUID();
        const transaction = db.transaction(() => {
            db.prepare('INSERT INTO roles (role_id, name) VALUES (?, ?)').run(roleId, name);
            const insertRolePerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
            permissionIds.forEach(pid => insertRolePerm.run(roleId, pid));
        });
        transaction();
        return roleId;
    },

    update(roleId: string, name: string, permissionIds: string[]) {
        const transaction = db.transaction(() => {
            db.prepare('UPDATE roles SET name = ? WHERE role_id = ?').run(name, roleId);
            db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
            const insertRolePerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
            permissionIds.forEach(pid => insertRolePerm.run(roleId, pid));
        });
        transaction();
    },

    delete(roleId: string) {
        return db.prepare('DELETE FROM roles WHERE role_id = ?').run(roleId);
    },

    getPermissions(roleId: string) {
        return db.prepare(`
            SELECT p.* FROM permissions p
            JOIN role_permissions rp ON p.permission_id = rp.permission_id
            WHERE rp.role_id = ?
        `).all(roleId) as Permission[];
    },

    findAllPermissions() {
        return db.prepare('SELECT * FROM permissions ORDER BY name ASC').all() as Permission[];
    }
};
