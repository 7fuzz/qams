# Test Management System with Built-in Mail Catcher

A comprehensive test management application with an integrated SMTP "Mail Catcher" (similar to Mailtrap) for development and testing.

## 🚀 Docker Setup

The easiest way to run the entire stack (Next.js, MariaDB, and SMTP Listener) is using Docker Compose.

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 2. Start the Services
```bash
docker compose up -d
```
This will start:
- **Web App**: `http://localhost:3000`
- **MariaDB**: `localhost:3306` (root / root)
- **SMTP Listener**: `localhost:2525`

### 3. Initialize the Database
The first time you run the project, you must apply the schema and seed the initial admin account:
```bash
docker exec -it testing-mgmt-web npm run db:init
```

**Default Admin Credentials:**
- **Email**: `admin@example.com`
- **Password**: `123`

### 4. SSL/TLS Support (Optional)
The SMTP listener supports STARTTLS if certificates are provided in the `smtp-service/cert/` directory.

**Development (Self-signed):**
```bash
openssl req -x509 -newkey rsa:4096 -keyout smtp-service/cert/key.pem -out smtp-service/cert/cert.pem -days 365 -nodes -subj "/CN=localhost"
docker compose up -d --build smtp
```
*Note: You must configure your mail client to trust self-signed certificates (`rejectUnauthorized: false`).*

**Production:**
Mount your trusted certificates (e.g., from Certbot) via volumes in `docker-compose.yml`:
```yaml
volumes:
  - /etc/letsencrypt/live/yourdomain/privkey.pem:/app/cert/key.pem:ro
  - /etc/letsencrypt/live/yourdomain/fullchain.pem:/app/cert/cert.pem:ro
```

---

## 📧 Mail Catcher Feature

The built-in Mail Catcher allows you to capture outgoing emails from any application during development.

### How to use:
1.  **Create Credentials**: Go to **Admin > Mail Admin** in the sidebar. Create a new SMTP credential (username/password).
2.  **Assign to Project**: Link the credential to one or more projects using the "Link" icon.
3.  **Configure your app**: Point your external application's SMTP settings to:
    - **Host**: `localhost` (or your server IP)
    - **Port**: `2525`
    - **User/Pass**: The ones you created in Step 1.
4.  **View Emails**: Go to **Dev Tools > Mail Catcher** in the sidebar to see captured emails in real-time.

### Features:
- **HTML Support**: View rich formatted emails in an isolated iframe.
- **Attachments**: Automatically captures and stores files (stored in `public/uploads/mail`).
- **Quotas**: Set per-credential limits for email count and storage size (oldest emails are auto-deleted).
- **Pagination**: Efficiently handle thousands of captured emails.

---

## 🛠 Local Development (Hybrid)

If you prefer to run the Next.js app locally for faster hot-reloading:

1.  **Start Infrastructure**:
    ```bash
    docker compose up -d db smtp
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment**: Copy `.env.example` to `.env.local`.
4.  **Initialize DB**:
    ```bash
    npm run db:init
    ```
5.  **Run Dev Server**:
    ```bash
    npm run dev
    ```

## 📁 Directory Structure
- `/app`: Next.js frontend and API routes.
- `/models`: Database logic and abstractions.
- `/smtp-service`: Standalone Node.js SMTP listener.
- `/public/uploads`: Shared volume for email attachments.
- `/lib/db`: Database connection and schema files.
