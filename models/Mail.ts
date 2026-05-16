import db from '@/lib/db';
import { randomUUID } from 'crypto';

export interface MailCredential {
  credential_id: string;
  name: string;
  smtp_user: string;
  smtp_password: string;
  created_at?: string;
}

export interface CaughtEmail {
  email_id: string;
  credential_id: string;
  sender: string;
  recipient: string;
  subject: string;
  body_text: string;
  body_html: string;
  created_at: string;
  attachments?: { attachment_id: string, name: string, url: string }[];
}

export class MailModel {
  static async getAllCredentials(): Promise<MailCredential[]> {
    const [rows] = await db.execute('SELECT * FROM mail_credentials ORDER BY created_at DESC');
    return rows as MailCredential[];
  }

  static async createCredential(data: Omit<MailCredential, 'credential_id'>): Promise<string> {
    const id = randomUUID();
    await db.execute(
      'INSERT INTO mail_credentials (credential_id, name, smtp_user, smtp_password) VALUES (?, ?, ?, ?)',
      [id, data.name, data.smtp_user, data.smtp_password]
    );
    return id;
  }

  static async deleteCredential(id: string): Promise<void> {
    await db.execute('DELETE FROM mail_credentials WHERE credential_id = ?', [id]);
  }

  static async assignToProject(projectId: string, credentialId: string): Promise<void> {
    await db.execute(
      'INSERT IGNORE INTO project_mail_credentials (project_id, credential_id) VALUES (?, ?)',
      [projectId, credentialId]
    );
  }

  static async unassignFromProject(projectId: string, credentialId: string): Promise<void> {
    await db.execute(
      'DELETE FROM project_mail_credentials WHERE project_id = ? AND credential_id = ?',
      [projectId, credentialId]
    );
  }

  static async getCredentialsForProject(projectId: string): Promise<MailCredential[]> {
    const [rows] = await db.execute(
      `SELECT mc.* FROM mail_credentials mc
       JOIN project_mail_credentials pmc ON mc.credential_id = pmc.credential_id
       WHERE pmc.project_id = ?`,
      [projectId]
    );
    return rows as MailCredential[];
  }

  static async getEmailsForProject(projectId: string): Promise<CaughtEmail[]> {
    const [rows] = await db.execute(
      `SELECT ce.* FROM caught_emails ce
       JOIN project_mail_credentials pmc ON ce.credential_id = pmc.credential_id
       WHERE pmc.project_id = ?
       ORDER BY ce.created_at DESC`,
      [projectId]
    );
    
    const emails = rows as CaughtEmail[];
    for (const email of emails) {
        const [attachments] = await db.execute(
            'SELECT attachment_id, name, url FROM attachments WHERE entity_type = "EMAIL" AND entity_id = ?',
            [email.email_id]
        );
        email.attachments = attachments as { attachment_id: string, name: string, url: string }[];
    }
    return emails;
  }

  static async deleteEmail(emailId: string): Promise<void> {
    await db.execute('DELETE FROM caught_emails WHERE email_id = ?', [emailId]);
  }

  static async clearEmailsForProject(projectId: string): Promise<void> {
    await db.execute(
      `DELETE ce FROM caught_emails ce
       JOIN project_mail_credentials pmc ON ce.credential_id = pmc.credential_id
       WHERE pmc.project_id = ?`,
      [projectId]
    );
  }
}
