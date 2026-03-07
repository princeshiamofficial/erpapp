
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || 'localhost',
        user: process.env.DATABASE_USER || 'root',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'erp_database',
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    });

    // Using simple objects to seed
    const sampleFollowUps = [
        { businessName: "Apex Solutions", contactName: "Rahim Ahmed", phone: "01711223344", status: "New Lead", district: "Dhaka", crmName: "System Admin", crmId: "system-admin" },
        { businessName: "Blue Ocean Ltd", contactName: "Karim Uddin", phone: "01822334455", status: "Contacted", district: "Chittagong", crmName: "System Admin", crmId: "system-admin" },
        { businessName: "Creative Tech", contactName: "Sumi Akter", phone: "01933445566", status: "Qualified", district: "Sylhet", crmName: "System Admin", crmId: "system-admin" },
        { businessName: "Delta Corp", contactName: "Abul Hossain", phone: "01644556677", status: "Proposal Sent", district: "Rajshahi", crmName: "System Admin", crmId: "system-admin" },
        { businessName: "Echo Systems", contactName: "Fatima Begum", phone: "01555667788", status: "Won", district: "Khulna", crmName: "System Admin", crmId: "system-admin" },
    ];

    for (const item of sampleFollowUps) {
        const id = uuidv4();
        const data = {
            ...item,
            id,
            date: new Date().toISOString(),
            category: "General",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            history: []
        };

        await connection.execute(
            `INSERT INTO follow_ups (id, business_name, contact_name, phone, status, crm_id, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, item.businessName, item.contactName, item.phone, item.status, "system-admin", JSON.stringify(data)]
        );
    }

    console.log("Seeded 5 sample follow-up records correctly.");
    await connection.end();
}
seed();
