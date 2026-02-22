// Test employee login API
async function testLogin() {
  try {
    console.log('Testing employee login...');
    
    const response = await fetch('http://localhost:5227/api/auth/employee/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Id': '1'
      },
      body: JSON.stringify({ username: 'adm', password: '123456' })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLogin();
