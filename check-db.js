const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://Catalyst_user:6cIOrCBdFwORyVfwGY7kEm663TF8ZJIT@dpg-d4o32va4d50c73a8nma0-a.oregon-postgres.render.com/Catalyst',
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check inventory table columns
    console.log('\n=== Inventory Table Columns ===');
    const invCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'inventory' ORDER BY ordinal_position
    `);
    console.log(invCols.rows);

    // Check order_items table columns
    console.log('\n=== Order Items Table Columns ===');
    const itemCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'order_items' ORDER BY ordinal_position
    `);
    console.log(itemCols.rows);

    // Check views
    console.log('\n=== Views ===');
    const views = await client.query(`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    console.log(views.rows.map(r => r.table_name));

    // Check v_inventory_summary view definition
    console.log('\n=== v_inventory_summary view definition ===');
    const viewDef = await client.query(`
      SELECT pg_get_viewdef('v_inventory_summary'::regclass, true)
    `);
    console.log(viewDef.rows[0]?.pg_get_viewdef);

    console.log('\nDone checking');
    return;

    // Find driver hassan fahes
    const driverResult = await client.query(`
      SELECT e.id, e.name, e.van_id, e.company_id, c.name as company_name
      FROM employees e
      LEFT JOIN companies c ON e.company_id = c.id
      WHERE LOWER(e.name) LIKE '%hassan fahes%'
    `);
    
    console.log('\n=== Driver Gak ===');
    console.log(driverResult.rows);

    if (driverResult.rows.length > 0) {
      const vanId = driverResult.rows[0].van_id;
      const companyId = driverResult.rows[0].company_id;
      
      // Check van_cash for this van
      console.log('\n=== Van Cash ===');
      const vanCashResult = await client.query(`
        SELECT * FROM van_cash WHERE van_id = $1
      `, [vanId]);
      console.log(vanCashResult.rows);

      // Check all vans for this company
      console.log('\n=== All Vans for Company ===');
      const vansResult = await client.query(`
        SELECT * FROM vans WHERE company_id = $1
      `, [companyId]);
      console.log(vansResult.rows);
      
      // Check van_cash table structure
      console.log('\n=== Van Cash Table Structure ===');
      const vcStructure = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'van_cash'
      `);
      console.log(vcStructure.rows);
      
      // Check all van_cash entries for company's vans
      console.log('\n=== All Van Cash Entries ===');
      const allVanCash = await client.query(`SELECT * FROM van_cash`);
      console.log(allVanCash.rows);

      // Check deposits for this driver
      const driverId = driverResult.rows[0].id;
      console.log('\n=== Deposits for Driver (id=' + driverId + ') ===');
      const depositsResult = await client.query(`
        SELECT * FROM deposits WHERE driver_id = $1 ORDER BY created_at DESC
      `, [driverId]);
      console.log(depositsResult.rows);

      // Check tasks for this driver
      console.log('\n=== Tasks for Driver ===');
      const tasksResult = await client.query(`
        SELECT id, task_number, status, total, paid_amount, debt_amount, scheduled_date 
        FROM tasks WHERE driver_id = $1 ORDER BY scheduled_date DESC LIMIT 10
      `, [driverId]);
      console.log(tasksResult.rows);

      // Check orders for this driver
      console.log('\n=== Orders for Driver ===');
      const ordersResult = await client.query(`
        SELECT id, order_number, total_amount, paid_amount, order_date 
        FROM orders WHERE driver_id = $1 ORDER BY order_date DESC LIMIT 10
      `, [driverId]);
      console.log(ordersResult.rows);

      // Check collections for this driver
      console.log('\n=== Collections for Driver ===');
      const collectionsResult = await client.query(`
        SELECT * FROM collections WHERE driver_id = $1 ORDER BY collection_date DESC LIMIT 10
      `, [driverId]);
      console.log(collectionsResult.rows);

      // Calculate totals
      console.log('\n=== CASH CALCULATION ===');
      const totalDeposits = await client.query(`SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE driver_id = $1 AND status != 'rejected'`, [driverId]);
      const totalTaskCash = await client.query(`SELECT COALESCE(SUM(paid_amount), 0) as total FROM tasks WHERE driver_id = $1 AND (status = 'Completed' OR status = 'Delivered')`, [driverId]);
      const totalPosCash = await client.query(`SELECT COALESCE(SUM(paid_amount), 0) as total FROM orders WHERE driver_id = $1`, [driverId]);
      const totalCollections = await client.query(`SELECT COALESCE(SUM(amount), 0) as total FROM collections WHERE driver_id = $1 AND payment_type = 'cash'`, [driverId]);
      
      console.log('Total Deposits:', totalDeposits.rows[0].total);
      console.log('Total Task Cash:', totalTaskCash.rows[0].total);
      console.log('Total POS Cash:', totalPosCash.rows[0].total);
      console.log('Total Collections:', totalCollections.rows[0].total);
      const inflows = parseFloat(totalTaskCash.rows[0].total) + parseFloat(totalPosCash.rows[0].total) + parseFloat(totalCollections.rows[0].total);
      const outflows = parseFloat(totalDeposits.rows[0].total);
      console.log('Cash Balance = Inflows - Deposits =', inflows, '-', outflows, '=', inflows - outflows);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
