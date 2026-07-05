async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '1234' })
    });
    const status = res.status;
    const data = await res.json();
    console.log('STATUS:', status);
    console.log('RESPONSE:', data);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
