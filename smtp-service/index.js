const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const mysql = require("mysql2/promise");
const { v4: uuidv4 } = require("uuid");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "root",
  database: process.env.MYSQL_DATABASE || "test_management",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const server = new SMTPServer({
  authOptional: false,
  onAuth(auth, session, callback) {
    authenticate(auth.username, auth.password)
      .then((credential) => {
        if (credential) {
          callback(null, { user: credential });
        } else {
          callback(new Error("Invalid username or password"));
        }
      })
      .catch((err) => {
        console.error("Auth Error:", err);
        callback(new Error("Internal Server Error"));
      });
  },
  onData(stream, session, callback) {
    simpleParser(stream)
      .then((parsed) => {
        return saveEmail(session.user.credential_id, parsed);
      })
      .then(() => callback())
      .catch((err) => {
        console.error("Mail Error:", err);
        callback(new Error("Failed to save email"));
      });
  },
});

async function authenticate(username, password) {
  const [rows] = await pool.execute(
    "SELECT credential_id FROM mail_credentials WHERE smtp_user = ? AND smtp_password = ?",
    [username, password]
  );
  return rows.length > 0 ? rows[0] : null;
}

const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./attachments";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function saveEmail(credentialId, parsed) {
  const emailId = uuidv4();
  const recipient = parsed.to ? parsed.to.text : "";
  const sender = parsed.from ? parsed.from.text : "";
  
  await pool.execute(
    "INSERT INTO caught_emails (email_id, credential_id, sender, recipient, subject, body_text, body_html) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      emailId,
      credentialId,
      sender,
      recipient,
      parsed.subject || "(No Subject)",
      parsed.text || "",
      parsed.html || "",
    ]
  );

  if (parsed.attachments && parsed.attachments.length > 0) {
    for (const attachment of parsed.attachments) {
      const attachmentId = uuidv4();
      const ext = path.extname(attachment.filename);
      const fileName = `${attachmentId}${ext}`;
      const filePath = path.join(UPLOAD_DIR, fileName);
      
      fs.writeFileSync(filePath, attachment.content);
      
      // Use the existing attachments table
      // url will be the relative path for the web app to serve
      const publicUrl = `/uploads/mail/${fileName}`;
      
      await pool.execute(
        "INSERT INTO attachments (attachment_id, entity_type, entity_id, url, name) VALUES (?, ?, ?, ?, ?)",
        [attachmentId, 'EMAIL', emailId, publicUrl, attachment.filename]
      );
    }
  }
  
  console.log(`[${new Date().toISOString()}] Caught email for cred ${credentialId}: ${parsed.subject} (${parsed.attachments?.length || 0} attachments)`);
}

const PORT = process.env.SMTP_PORT || 25;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`SMTP Listener running on port ${PORT}`);
});
