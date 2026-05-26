const axios = require('axios');

async function testDNI() {
  const dni = '71459191';
  const token = 'XI8gUjpSUjWHANkWxjLFUhw7NI1PqPLWUcbzzmrBOEhAfLAzn9BG6IS5f64t';
  
  console.log('--- Test 1: GET with Path Param and JSON Header ---');
  try {
    const res1 = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/reniec/dni/${dni}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Success 1:', res1.data);
  } catch (err) {
    console.log('Error 1:', err.response?.status, err.response?.statusText);
  }

  console.log('\n--- Test 2: GET with Path Param, NO Content-Type ---');
  try {
    const res2 = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/reniec/dni/${dni}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Success 2:', res2.data);
  } catch (err) {
    console.log('Error 2:', err.response?.status, err.response?.statusText);
  }

  console.log('\n--- Test 3: GET with Query Param ---');
  try {
    const res3 = await axios.get(`https://api-codart.cgrt.org/api/v1/consultas/reniec/dni`, {
      params: { dni },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Success 3:', res3.data);
  } catch (err) {
    console.log('Error 3:', err.response?.status, err.response?.statusText);
  }
}

testDNI();
