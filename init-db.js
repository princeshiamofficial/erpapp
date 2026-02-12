const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDb() {
    const config = {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        port: process.env.DATABASE_PORT || 3306
    };

    const connection = await mysql.createConnection(config);

    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            company_name VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            avatar_url TEXT,
            monthly_order_target DECIMAL(10,2) DEFAULT 0,
            weekly_order_target DECIMAL(10,2) DEFAULT 0,
            is_banned BOOLEAN DEFAULT FALSE,
            fcm_token TEXT,
            is_leader BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS global_settings (
            id VARCHAR(50) PRIMARY KEY,
            settings_json JSON NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS user_roles (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100),
            color VARCHAR(20),
            is_default BOOLEAN DEFAULT FALSE,
            priority INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS attendance_records (
            id VARCHAR(100) PRIMARY KEY,
            employee_id VARCHAR(50),
            employee_name VARCHAR(100),
            date DATE,
            check_in_time DATETIME,
            check_out_time DATETIME NULL,
            status VARCHAR(50),
            hours_worked DECIMAL(5,2) NULL,
            late_reason TEXT NULL,
            early_out_reason TEXT NULL,
            location VARCHAR(100),
            check_in_location JSON NULL,
            check_out_location JSON NULL
        )`,
        `CREATE TABLE IF NOT EXISTS attendance_marks (
            user_id VARCHAR(50) PRIMARY KEY,
            status VARCHAR(50),
            last_check_in_time DATETIME NULL,
            last_check_out_time DATETIME NULL,
            attendance_status VARCHAR(50),
            check_in_location JSON NULL,
            date DATE
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(50) PRIMARY KEY,
            company_name VARCHAR(255),
            address TEXT,
            phone_number VARCHAR(50),
            order_items JSON,
            special_client_discount DECIMAL(10,2) NULL,
            shipping_charge DECIMAL(10,2) NULL,
            order_notes TEXT NULL,
            crm_user_id VARCHAR(50),
            crm_user_name VARCHAR(100),
            designer_representative_id VARCHAR(50) NULL,
            designer_representative_name VARCHAR(100) NULL,
            assignee_avatar_url TEXT NULL,
            designer_representative_avatar_url TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            updated_by_user_id VARCHAR(50),
            updated_by_user_name VARCHAR(100),
            is_public BOOLEAN DEFAULT FALSE,
            current_status VARCHAR(50),
            status_history JSON,
            comments JSON,
            view_count INT DEFAULT 0,
            advance_payments JSON,
            packzy_consignment_id VARCHAR(50) NULL,
            packzy_tracking_code VARCHAR(50) NULL
        )`,
        `CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR(50) PRIMARY KEY,
            data_json JSON NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS shipped_orders (
            order_id VARCHAR(50) PRIMARY KEY,
            tracking_code VARCHAR(100),
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS order_statuses (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            color VARCHAR(20),
            is_system_status BOOLEAN DEFAULT FALSE,
            is_visible BOOLEAN DEFAULT TRUE,
            allowed_roles JSON,
            xid VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of tables) {
        await connection.query(sql);
    }

    console.log("All core tables initialized successfully.");
    await connection.end();
}

initDb().catch(console.error);
