# 🖥️ Desktop Deployment Guide: Blood Donor Connect

This guide explains how to set up "Blood Donor Connect" on your desktop computer as a dedicated standalone utility.

---

## 🛠️ 1. Prerequisites
Ensure the following are installed on your workstation:
- **Node.js (LTS)**: To run the frontend development server.
- **XAMPP**: To host the MySQL database and PHP API locally.
- **Web Browser**: Chrome or Edge (recommended for "App Mode").

---

## 🗄️ 2. Backend & Database Setup (Local)

Before the app can save data, you must activate the local database engine:

1. **Launch XAMPP**: Open the XAMPP Control Panel and click **Start** for both `Apache` and `MySQL`.
2. **Setup Database**:
   - Go to `http://localhost/phpmyadmin/` in your browser.
   - Create a new database named `blood_connect`.
3. **Deploy API**:
   - Copy the `server/api.php` file from this project.
   - Paste it into `C:\xampp\htdocs\api.php`.
4. **Configuration**:
   - Open the pasted `api.php` and ensure the `$username` is `'root'` and `$password` is `''` (XAMPP defaults).

---

## 🚀 3. Running the Application

### A. Development Mode
If you are working with the source code directly:
1. Open your terminal in the project root folder.
2. Run `npm install` followed by `npm start`.
3. The app will open at `http://localhost:3000`.

### B. Production Build
To run the app at maximum performance:
1. Run `npm run build`.
2. Move the contents of the `dist` or `build` folder into a subfolder in `C:\xampp\htdocs\bloodconnect`.
3. Access the app via `http://localhost/bloodconnect`.

---

## 📱 4. Transforming into a "Desktop App"

You can make Blood Donor Connect feel like a native desktop application (without the browser address bar):

### For Windows Users (Chrome/Edge):
1. Open the app in **Google Chrome**.
2. Click the **Three Dots (⋮)** in the top right.
3. Select **Save and Share** > **Install page as app**.
4. Give it the name "Blood Donor Connect".
5. A shortcut will appear on your **Desktop** and **Start Menu**. It will now open in a dedicated window without browser tabs.

---

## 🌐 5. Connecting the Frontend to Backend

Once the app is running on your desktop:
1. Go to the **Staff / Command** tab.
2. Log in (User: `admin` | Pass: `password123`).
3. Navigate to the **Uplink / Sync** section.
4. In the "Terminal Station URI" field, enter: `http://localhost/` (or your Static IP if accessing remotely).
5. Click **Ping Interface**. Once you see "Handshake verified", click **Apply Settings**.

---

## 🛡️ 6. Troubleshooting
- **Database Error**: Ensure MySQL is green in the XAMPP Control Panel.
- **CORS Errors**: If the app cannot "Ping" the server, ensure `api.php` is correctly placed in `htdocs` and that your Firewall is not blocking Port 80.
- **Data Missing**: Remember that the app uses `localStorage` as a fallback. If you clear your browser cache, you must reconnect the "Command Uplink" to restore your MySQL data.

---

**Architecture Note:** To deploy this for multiple desktops in an office, use your **Internal IP** (e.g., `192.168.1.5`) instead of `localhost` in the Uplink settings.