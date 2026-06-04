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
    // 1. Add client_id column to orders table after the id column
    console.log('Adding client_id column to orders table after id...');
    // We check if it already exists first
    const [columns] = await connection.execute('SHOW COLUMNS FROM orders LIKE "client_id"');
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE orders ADD COLUMN client_id VARCHAR(50) AFTER id');
      console.log('client_id column added after id.');
    } else {
      // If it exists but is in a different position, modify position to be after id
      await connection.execute('ALTER TABLE orders MODIFY COLUMN client_id VARCHAR(50) AFTER id');
      console.log('client_id column position modified to be after id.');
    }

    // Check if we already migrated (dropped company_name)
    const [companyNameCols] = await connection.execute('SHOW COLUMNS FROM orders LIKE "company_name"');
    const hasCompanyName = companyNameCols.length > 0;

    if (hasCompanyName) {
      // 2. Populate client_id for all orders based on existing company_name prefix
      console.log('Populating client_id for all orders...');
      const [orders] = await connection.execute('SELECT id, company_name FROM orders');
      console.log(`Processing ${orders.length} orders...`);

      let updatedCount = 0;
      for (const order of orders) {
        const companyNameRaw = order.company_name || '';
        const nameParts = companyNameRaw.split(' • ');
        let jobId = '';

        if (nameParts.length > 1) {
          jobId = nameParts[0].trim();
        } else {
          jobId = `LEGACY-${order.id}`;
        }

        if (!jobId) {
          jobId = `LEGACY-${order.id}`;
        }

        await connection.execute('UPDATE orders SET client_id = ? WHERE id = ?', [jobId, order.id]);
        updatedCount++;
      }
      console.log(`Successfully populated client_id for ${updatedCount} orders.`);

      // 3. Make sure all client_ids exist in clients table (safety check)
      console.log('Ensuring all referenced client_ids exist in clients table...');
      const [missingClients] = await connection.execute(`
        SELECT DISTINCT o.client_id, o.company_name, o.phone_number, o.address 
        FROM orders o 
        LEFT JOIN clients c ON o.client_id = c.id 
        WHERE c.id IS NULL
      `);
      
      console.log(`Found ${missingClients.length} missing client profiles in clients table.`);
      for (const mc of missingClients) {
        const nameParts = (mc.company_name || '').split(' • ');
        const cleanName = nameParts.length > 1 ? nameParts.slice(1).join(' • ').trim() : mc.company_name || 'Legacy Customer';
        await connection.execute(
          'INSERT IGNORE INTO clients (id, company_name, phone_number, address) VALUES (?, ?, ?, ?)',
          [mc.client_id, cleanName, mc.phone_number || '', mc.address || '']
        );
      }
      console.log('Safety check completed.');
    } else {
      console.log('company_name column does not exist. Skipping data migration steps (already migrated).');
    }

    // 4. Add foreign key constraint
    console.log('Adding foreign key constraint from orders.client_id to clients.id...');
    try {
      await connection.execute('ALTER TABLE orders ADD CONSTRAINT fk_orders_client FOREIGN KEY (client_id) REFERENCES clients(id)');
      console.log('Foreign key constraint added successfully.');
    } catch (fkError) {
      console.warn('Could not add foreign key constraint (it might already exist):', fkError.message);
    }

    if (hasCompanyName) {
      // 5. Drop redundant/unwanted columns from orders table
      console.log('Dropping unwanted columns from orders table...');
      const colsToDrop = [
        'company_name', 
        'address', 
        'phone_number',
        'crm_user_name',
        'assignee_avatar_url',
        'designer_representative_name',
        'designer_representative_avatar_url',
        'updated_by_user_name',
        'deleted_by_name'
      ];
      for (const col of colsToDrop) {
        const [colCheck] = await connection.execute(`SHOW COLUMNS FROM orders LIKE "${col}"`);
        if (colCheck.length > 0) {
          await connection.execute(`ALTER TABLE orders DROP COLUMN ${col}`);
          console.log(`Dropped column: ${col}`);
        } else {
          console.log(`Column ${col} does not exist or was already dropped.`);
        }
      }
      console.log('Orders table successfully modified and columns dropped.');
    }

  } catch (error) {
    console.error('Modification failed:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

main().catch(console.error);
