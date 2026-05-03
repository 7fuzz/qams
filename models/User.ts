import db from '@/lib/db';
import { User, LoginUser } from '@/types/auth';
import { generateId } from '@/lib/id-utils';
import { hashPassword } from '@/lib/auth-utils';

export const UserModel = {
    async findAll(limit: number, offset: number) {
        const baseQuery = 'FROM users u JOIN roles r ON u.role_id = r.role_id';
        const total = (db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get() as { total: number }).total;
        
        const data = db.prepare(`
            SELECT u.user_id, u.name, u.email, r.name as role_name, u.role_id 
            ${baseQuery}
            ORDER BY u.name ASC
            LIMIT ? OFFSET ?
        `).all(limit, offset) as User[];

        return { data, total };
    },

    findByEmail(email: string) {
        return db.prepare(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id 
            WHERE u.email = ?
        `).get(email) as LoginUser | undefined;
    },

    findByGoogleId(googleId: string) {
        return db.prepare(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id 
            WHERE u.google_id = ?
        `).get(googleId) as LoginUser | undefined;
    },

    findById(id: string) {
        return db.prepare(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id 
            WHERE u.user_id = ?
        `).get(id) as User | undefined;
    },

    async create(data: { name: string, email: string, password?: string, role_id: string }) {
        const userId = generateId();
        let hashed = null;
        if (data.password) {
            hashed = await hashPassword(data.password);
        }

        db.prepare('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)')
            .run(userId, data.name, data.email, hashed, data.role_id);

        return userId;
    },

    createGoogleUser(data: { name: string, email: string, googleId: string, roleId: string }) {
        const userId = generateId();
        db.prepare(`
            INSERT INTO users (user_id, name, email, google_id, role_id) 
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, data.name, data.email, data.googleId, data.roleId);
        return userId;
    },

    linkGoogleAccount(userId: string, googleId: string) {
        return db.prepare('UPDATE users SET google_id = ? WHERE user_id = ?').run(googleId, userId);
    },

    async updatePassword(userId: string, newPassword: string) {
        const hashed = await hashPassword(newPassword);
        return db.prepare('UPDATE users SET password = ? WHERE user_id = ?').run(hashed, userId);
    },


    async update(id: string, data: { name: string, email: string, password?: string, role_id: string }) {
        if (data.password) {
            const hashed = await hashPassword(data.password);
            db.prepare('UPDATE users SET name = ?, email = ?, password = ?, role_id = ? WHERE user_id = ?')
                .run(data.name, data.email, hashed, data.role_id, id);
        } else {
            db.prepare('UPDATE users SET name = ?, email = ?, role_id = ? WHERE user_id = ?')
                .run(data.name, data.email, data.role_id, id);
        }
        return true;
    },

    delete(id: string) {
        return db.prepare('DELETE FROM users WHERE user_id = ?').run(id);
    }
};
