const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://Catalyst_user:6cIOrCBdFwORyVfwGY7kEm663TF8ZJIT@dpg-d4o32va4d50c73a8nma0-a.oregon-postgres.render.com/Catalyst',
  ssl: { rejectUnauthorized: false }
});

async function debug() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check task 13
    console.log('=== TASK 13 ===');
    const task = await client.query('SELECT id, task_number, driver_id, van_id, customer_id, status, total FROM tasks WHERE id = 13');
    console.table(task.rows);

    // Check employees (drivers)
    console.log('\n=== DRIVERS ===');
    const drivers = await client.query('SELECT id, name, user_id, van_id, is_driver FROM employees WHERE is_driver = true LIMIT 5');
    console.table(drivers.rows);

    // Check users for drivers
    console.log('\n=== USERS (for drivers) ===');
    const users = await client.query(`
      SELECT u.id, u.username, u.employee_id, u.is_driver, e.name as emp_name
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.is_driver = true
      LIMIT 5
    `);
    console.table(users.rows);

    // Check if task's driver_id matches any employee
    if (task.rows.length > 0 && task.rows[0].driver_id) {
      console.log('\n=== TASK DRIVER INFO ===');
      const taskDriver = await client.query('SELECT id, name, user_id, van_id FROM employees WHERE id = $1', [task.rows[0].driver_id]);
      console.table(taskDriver.rows);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

debug();
