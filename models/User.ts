import db from '@/lib/db';
import { LoginUser } from '@/types/auth';
import { generateId } from '@/lib/id-utils';
import { hashPassword } from '@/lib/crypto-utils';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const UserModel = {
    async findAll(limit: number, offset: number): Promise<{ data: LoginUser[], total: number }> {
        const baseQuery = 'FROM users u JOIN roles r ON u.role_id = r.role_id';
        const [countRows] = await db.execute<(RowDataPacket & { total: number })[]>(`SELECT COUNT(*) as total ${baseQuery}`);
        const total = countRows[0].total;
        
        const [data] = await db.execute<LoginUser[] & RowDataPacket[]>(`
            SELECT u.user_id, u.name, u.email, r.name as role_name, u.role_id 
            ${baseQuery}
            ORDER BY u.name ASC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        return { data, total };
    },

    async findByEmail(email: string): Promise<LoginUser | undefined> {
        const [rows] = await db.execute<LoginUser[] & RowDataPacket[]>(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id 
            WHERE u.email = ?
        `, [email]);
        return rows[0];
    },

    async findByGoogleId(googleId: string): Promise<LoginUser | undefined> {
        const [rows] = await db.execute<LoginUser[] & RowDataPacket[]>(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id 
            WHERE u.google_id = ?
        `, [googleId]);
        return rows[0];
    },

    async findById(id: string): Promise<LoginUser | undefined> {
        const [rows] = await db.execute<LoginUser[] & RowDataPacket[]>(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.role_id 
            WHERE u.user_id = ?
        `, [id]);
        return rows[0];
    },

    async create(data: { name: string, email: string, password?: string, role_id: string }): Promise<string> {
        const userId = generateId();
        let hashed = null;
        if (data.password) {
            hashed = await hashPassword(data.password);
        }

        await db.execute('INSERT INTO users (user_id, name, email, password, role_id) VALUES (?, ?, ?, ?, ?)', 
            [userId, data.name, data.email, hashed, data.role_id]);

        return userId;
    },

    async createGoogleUser(data: { name: string, email: string, googleId: string, roleId: string }): Promise<string> {
        const userId = generateId();
        await db.execute(`
            INSERT INTO users (user_id, name, email, google_id, role_id) 
            VALUES (?, ?, ?, ?, ?)
        `, [userId, data.name, data.email, data.googleId, data.roleId]);
        return userId;
    },

    async linkGoogleAccount(userId: string, googleId: string): Promise<void> {
        await db.execute('UPDATE users SET google_id = ? WHERE user_id = ?', [googleId, userId]);
    },

    async updatePassword(userId: string, newPassword: string): Promise<void> {
        const hashed = await hashPassword(newPassword);
        await db.execute('UPDATE users SET password = ? WHERE user_id = ?', [hashed, userId]);
    },

    async update(id: string, data: { name: string, email: string, password?: string, role_id: string }): Promise<void> {
        if (data.password) {
            const hashed = await hashPassword(data.password);
            await db.execute('UPDATE users SET name = ?, email = ?, password = ?, role_id = ? WHERE user_id = ?', 
                [data.name, data.email, hashed, data.role_id, id]);
        } else {
            await db.execute('UPDATE users SET name = ?, email = ?, role_id = ? WHERE user_id = ?', 
                [data.name, data.email, data.role_id, id]);
        }
    },

    async delete(id: string): Promise<void> {
        await db.execute('DELETE FROM users WHERE user_id = ?', [id]);
    }
};
