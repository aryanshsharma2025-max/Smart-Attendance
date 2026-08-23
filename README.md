# Smart Attendance Management System

A full-stack, automated classroom attendance management platform featuring a modern responsive web dashboard, Spring Boot REST backend, and comprehensive MySQL database schema.

---

## 🌟 Features

- **📊 Live Dashboard & Analytics**: Real-time overview of daily attendance rates, active class sessions, flagged low-attendance alerts, and department metrics.
- **⚡ Live Scan Engine**: Supports multiple identification methods:
  - 💳 RFID Card Scanning
  - 👆 Biometric Fingerprint (AS608)
  - 📱 Bluetooth Low Energy (BLE) / QR Beacon
  - 👁️ Facial Recognition scan simulation
- **👥 Student Management**: Complete student registry with roll numbers, RFID/Biometric mappings, semester filtering, and attendance status tracking.
- **📈 Comprehensive Reports**: Filter attendance records by date range, department, and semester, with export capabilities (CSV/PDF).
- **☕ Spring Boot Backend**: Robust Java REST API implementation with JPA/Hibernate entities, JWT authentication, and repository layer.
- **🗄️ MySQL Database Schema**: Normalized schema with automated triggers for real-time percentage updates and session state management.

---

## 📁 Repository Structure

```
Smart-Attendance/
├── index.html              # Main dashboard frontend interface
├── style.css               # Modern UI stylesheet with dark mode styling
├── app.js                  # Frontend interactivity, mock data & scan logic
├── AttendanceBackend.java  # Spring Boot backend (Controllers, Services, Models)
├── attendance_schema.sql   # Complete MySQL schema, sample data & triggers
├── test/                   # Test assets and experimental UI variants
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### 1. Web Dashboard (Frontend)
No build tools or web servers required:
1. Clone the repository:
   ```bash
   git clone https://github.com/aryanshsharma2025-max/Smart-Attendance.git
   ```
2. Open `index.html` in any web browser.

### 2. Database Setup
1. Open MySQL Workbench or your preferred MySQL client.
2. Execute the `attendance_schema.sql` script to create the database, tables, views, and seed data:
   ```sql
   SOURCE attendance_schema.sql;
   ```

### 3. Backend Setup (Spring Boot)
1. Use the provided structure in `AttendanceBackend.java` within a standard Maven/Gradle Spring Boot project.
2. Configure `application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/smart_attendance
   spring.datasource.username=root
   spring.datasource.password=your_password
   spring.jpa.hibernate.ddl-auto=update
   ```
3. Run the Spring Boot application on port `8080`.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (CSS Variables, Flexbox/Grid), Modern JavaScript (ES6+)
- **Backend**: Java 17+, Spring Boot (Web, Security, Data JPA), JWT
- **Database**: MySQL 8.0+
- **Hardware Integration Protocols**: RFID (RC522), Fingerprint (AS608), ESP32 / Arduino / MQTT / HTTP Webhooks

---

## 📄 License
Open source for educational and portfolio use.
