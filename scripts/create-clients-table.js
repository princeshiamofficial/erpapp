require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'erp_database',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  });

  console.log('Connected to MySQL database.');

  try {
    // 1. Create the clients table
    console.log('Creating clients table if it does not exist...');
    await connection.execute('DROP TABLE IF EXISTS clients');
    await connection.execute(`
      CREATE TABLE clients (
        id VARCHAR(50) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('Clients table created successfully.');

    // 2. Fetch all orders from database
    console.log('Fetching orders from database...');
    const [orders] = await connection.execute('SELECT id, company_name, phone_number, address, created_at FROM orders WHERE is_deleted = FALSE');
    console.log(`Found ${orders.length} orders.`);

    // 3. Process and deduplicate clients
    const clientsMap = new Map();

    for (const order of orders) {
      const companyNameRaw = order.company_name || '';
      const nameParts = companyNameRaw.split(' • ');
      
      let jobId = '';
      let companyName = '';

      if (nameParts.length > 1) {
        jobId = nameParts[0].trim();
        companyName = nameParts.slice(1).join(' • ').trim();
      } else {
        // Fallback for legacy orders without the " • " separator
        jobId = `LEGACY-${order.id}`;
        companyName = companyNameRaw.trim();
      }

      if (!jobId) {
        jobId = `LEGACY-${order.id}`;
      }

      const clientInfo = {
        id: jobId,
        company_name: companyName || companyNameRaw,
        phone_number: order.phone_number || '',
        address: order.address || '',
        created_at: order.created_at,
      };

      // Deduplicate: If client already exists, keep the one with the latest order
      if (clientsMap.has(jobId)) {
        const existing = clientsMap.get(jobId);
        const existingTime = new Date(existing.created_at).getTime();
        const newTime = new Date(order.created_at).getTime();
        if (newTime > existingTime) {
          clientsMap.set(jobId, clientInfo);
        }
      } else {
        clientsMap.set(jobId, clientInfo);
      }
    }

    console.log(`Extracted ${clientsMap.size} unique clients.`);

    // 4. Insert clients into clients table
    console.log('Inserting clients into clients table...');
    let insertedCount = 0;
    for (const client of clientsMap.values()) {
      try {
        await connection.execute(
          `INSERT INTO clients (id, company_name, phone_number, address) 
           VALUES (?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE 
             company_name = VALUES(company_name), 
             phone_number = VALUES(phone_number), 
             address = VALUES(address)`,
          [client.id, client.company_name, client.phone_number, client.address]
        );
        insertedCount++;
      } catch (err) {
        console.error(`Failed to insert client ${client.id}:`, err.message);
      }
    }

    console.log(`Successfully migrated/synced ${insertedCount} clients into the clients table.`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

main().catch(console.error);
