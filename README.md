# 🔴 Blood Donor Connect: Static IP Sync Guide

This document explains how to implement the secure database synchronization system using a **Static Public IP** and a **XAMPP (MySQL/Apache)** backend.

---

## 🏗️ 1. Sync Architecture
The application follows a **Decentralized-to-Centralized** synchronization model.

1.  **Client Application**: The React frontend (mobile or web).
2.  **Public Bridge**: A **Static Public IP** provided by your ISP.
3.  **Router Gateway**: Configured with **Port Forwarding** (Port 80) to your local server.
4.  **Server (XAMPP)**: Your machine running Apache and MySQL.
5.  **Logic Layer (`api.php`)**: A secure PHP REST API that handles SQL queries using **PDO Prepared Statements**.
6.  **Database (MySQL)**: The central storage for all donor records.

**Workflow:** 
`User Action` → `React Fetch API` → `Static Public IP:80` → `Local Router` → `XAMPP (api.php)` → `MySQL Database`

---

## 🛠️ 2. Server-Side Implementation (XAMPP)

### A. Database Setup
1. Open XAMPP Control Panel and start **MySQL**.
2. Go to `phpMyAdmin` (usually `http://localhost/phpmyadmin`).
3. Create a new database named `blood_connect`.
4. The system will auto-generate the `donors` table upon the first successful API hit, or you can manually run the SQL found in the `api.php` comments.

### B. REST API Deployment
1. Locate the `server/api.php` file in this project.
2. Copy it to your XAMPP installation directory: `C:\xampp\htdocs\api.php`.
3. Open the file and configure your MySQL credentials:
   ```php
   $username = 'root'; // Your MySQL Username
   $password = '';     // Your MySQL Password
   ```

### C. Network Configuration (The Static IP)
1. **Find your Local IP**: Open CMD, type `ipconfig`. (e.g., `192.168.1.15`).
2. **Router Port Forwarding**:
   - Access your Router Admin Panel (usually `192.168.1.1`).
   - Find **Port Forwarding** or **Virtual Server** settings.
   - Forward **Port 80** (External) to your **Local IP** (Internal) on **Port 80**.
3. **Verify Static IP**: Ensure your ISP has provided a Static Public IP. If not, use a service like No-IP for a Dynamic DNS.

---

## 📱 3. App-Side Implementation

Once your server is live and reachable via your Static IP, follow these steps in the app:

1.  Navigate to the **Admin Login** (default: `admin` / `password123`).
2.  Go to the **Static IP** (or Sync) tab.
3.  **Input your URI**: Enter `http://YOUR_STATIC_IP/`.
4.  **Test Connection**: Click **Ping Station**.
    - If successful, you will see a green "Handshake verified" message.
    - If it fails, check your Firewall or Port Forwarding.
5.  **Lock Link**: Click **Lock Link**. The app is now in "Central Node" mode. All registrations and searches will happen in real-time against your MySQL database.

---

## 🔒 4. Security & Best Practices

- **CORS Protection**: `api.php` includes headers to allow cross-origin requests. In a production environment, change `Access-Control-Allow-Origin: *` to your specific domain.
- **SQL Injection**: We **never** send raw SQL from the frontend. We send JSON payloads. `api.php` uses **PDO Prepared Statements** (`:name`, `:bloodGroup`) to sanitize all data before it touches MySQL.
- **No Direct MySQL Access**: The app connects to Port 80 (HTTP), not 3306 (MySQL). This prevents exposing your database port directly to the internet.
- **Offline Resiliency**: The app maintains a `localStorage` fallback. If your Static IP server goes down, the app continues to function locally and attempts to re-sync once the connection is restored.

---

## 🚀 5. Performance Strategy
- **Real-Time CRUD**: The `db.ts` service uses `async/await` to ensure UI does not freeze during sync.
- **Simultaneous Access**: MySQL handles row-level locking, allowing hundreds of users to search and register at the same time without data corruption.
