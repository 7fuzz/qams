import db from '@/lib/db';
import { Role } from '@/types/app';

export const RoleModel = {
    findAll() {
        return db.prepare('SELECT * FROM roles ORDER BY name ASC').all() as Role[];
    },

    findByName(name: string) {
        return db.prepare('SELECT * FROM roles WHERE name = ?').get(name) as Role | undefined;
    },

    findById(id: string) {
        return db.prepare('SELECT * FROM roles WHERE role_id = ?').get(id) as Role | undefined;
    }
};
