import bcrypt from 'bcryptjs';

/**
 * Hashes a plain text password.
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

/**
 * Compares a plain text password with a hashed password.
 */
export async function comparePassword(password: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(password, hashed);
}
