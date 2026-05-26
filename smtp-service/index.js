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

const fs = require("fs");
const path = require("path");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./attachments";
const CERT_DIR = path.join(__dirname, "cert");

// Optional SSL Configuration
let sslOptions = {};
const keyPath = path.join(CERT_DIR, "key.pem");
const certPath = path.join(CERT_DIR, "cert.pem");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  console.log("SSL Certificates loaded from cert folder.");
} else {
  console.log("Running without SSL (key.pem/cert.pem not found in cert folder).");
}

const server = new SMTPServer({
  authOptional: false,
  ...sslOptions,
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
        return saveEmail(session.user, parsed, session.envelope);
      })
      .then(() => callback())
      .catch((err) => {
        console.error("Mail Error:", err);
        callback(new Error("Failed to save email"));
      });
  },
});

// Add error handler to prevent process crash
server.on("error", (err) => {
  console.error("SMTP Server Error:", err.message);
});

async function authenticate(username, password) {
  const [rows] = await pool.execute(
    "SELECT credential_id, smtp_user, max_emails, max_size_mb FROM mail_credentials WHERE smtp_user = ? AND smtp_password = ?",
    [username, password]
  );
  return rows.length > 0 ? rows[0] : null;
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function formatAddress(parsedAddr, envelopeAddr, smtpUser) {
  // If we have parsed headers, use the first one (most common case)
  if (parsedAddr && parsedAddr.value && parsedAddr.value.length > 0) {
    const first = parsedAddr.value[0];
    let name = first.name;
    // Only return "Name <email>" if there is actually a name
    if (name && name.trim()) {
      if (smtpUser) name = name.replace(smtpUser, '').trim();
      return name ? `${name} <${first.address}>` : first.address;
    }
    return first.address;
  }
  // Fallback to protocol envelope
  return envelopeAddr || "(Unknown)";
}

async function saveEmail(credential, parsed, envelope) {
  const credentialId = credential.credential_id;
  const emailId = uuidv4();
  
  // Use custom formatter to get clean strings
  const sender = formatAddress(parsed.from, envelope.mailFrom ? envelope.mailFrom.address : null, credential.smtp_user);
  
  // For recipients, we handle potential multiple addresses
  let recipient = "";
  if (parsed.to && parsed.to.value && parsed.to.value.length > 0) {
    recipient = parsed.to.value.map(addr => {
        let name = addr.name;
        if (name && name.trim()) {
            if (credential.smtp_user) name = name.replace(credential.smtp_user, '').trim();
            return name ? `${name} <${addr.address}>` : addr.address;
        }
        return addr.address;
    }).join(", ");
  } else {
    recipient = envelope.rcptTo ? envelope.rcptTo.map(r => r.address).join(", ") : "(Unknown Recipient)";
  }
  
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
      
      const publicUrl = `/uploads/mail/${fileName}`;
      
      await pool.execute(
        "INSERT INTO attachments (attachment_id, entity_type, entity_id, url, name) VALUES (?, ?, ?, ?, ?)",
        [attachmentId, 'EMAIL', emailId, publicUrl, attachment.filename]
      );
    }
  }
  
  console.log(`[${new Date().toISOString()}] Caught email for cred ${credentialId}: ${parsed.subject}`);

  // Auto-Rotation Logic
  try {
    await rotateEmails(credential);
  } catch (err) {
    console.error("Rotation Error:", err);
  }
}

async function rotateEmails(credential) {
  const { credential_id, max_emails, max_size_mb } = credential;

  // 1. Check Count Limit
  const [countRows] = await pool.execute(
    "SELECT email_id FROM caught_emails WHERE credential_id = ? ORDER BY created_at DESC",
    [credential_id]
  );

  if (countRows.length > max_emails) {
    const toDelete = countRows.slice(max_emails);
    for (const row of toDelete) {
      await deleteEmailFull(row.email_id);
    }
    console.log(`Rotated ${toDelete.length} emails (count limit reached)`);
  }

  // 2. Check Size Limit (Very rough estimate based on attachments + some overhead)
  // Real size would require summing up file sizes on disk
  const [attRows] = await pool.execute(
    `SELECT a.attachment_id, a.url, ce.email_id 
     FROM attachments a
     JOIN caught_emails ce ON a.entity_id = ce.email_id
     WHERE ce.credential_id = ? AND a.entity_type = 'EMAIL'
     ORDER BY ce.created_at ASC`,
    [credential_id]
  );

  let totalBytes = 0;
  const files = [];
  for (const att of attRows) {
    const fileName = path.basename(att.url);
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalBytes += stats.size;
      files.push({ email_id: att.email_id, size: stats.size });
    }
  }

  const maxBytes = max_size_mb * 1024 * 1024;
  if (totalBytes > maxBytes) {
    console.log(`Size limit exceeded: ${(totalBytes / 1024 / 1024).toFixed(2)}MB / ${max_size_mb}MB. Pruning...`);
    // Delete oldest emails until size is under limit
    // Note: This is simplified. We delete the whole email if any of its attachments push it over.
    const [allEmailsOldest] = await pool.execute(
        "SELECT email_id FROM caught_emails WHERE credential_id = ? ORDER BY created_at ASC",
        [credential_id]
    );

    for (const email of allEmailsOldest) {
        if (totalBytes <= maxBytes) break;
        
        // Find attachments for this email to subtract their size
        const emailAtts = attRows.filter(a => a.email_id === email.email_id);
        for (const ea of emailAtts) {
            const fileName = path.basename(ea.url);
            const filePath = path.join(UPLOAD_DIR, fileName);
            if (fs.existsSync(filePath)) {
                totalBytes -= fs.statSync(filePath).size;
            }
        }
        await deleteEmailFull(email.email_id);
    }
  }
}

async function deleteEmailFull(emailId) {
  // 1. Get attachments to delete files
  const [atts] = await pool.execute(
    "SELECT url FROM attachments WHERE entity_type = 'EMAIL' AND entity_id = ?",
    [emailId]
  );

  for (const att of atts) {
    const fileName = path.basename(att.url);
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // 2. Delete from DB (CASCADE will handle project_mail_credentials and attachments if set up, 
  // but we'll be explicit or rely on the schema)
  // Schema has: FOREIGN KEY (credential_id) REFERENCES mail_credentials(credential_id) ON DELETE CASCADE
  // We need to delete the email itself
  await pool.execute("DELETE FROM caught_emails WHERE email_id = ?", [emailId]);
}

const PORT = process.env.SMTP_PORT || 587;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`SMTP Listener running on port ${PORT}`);
});
