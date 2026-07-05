const BASE = 'http://localhost:8080';
const INSTANCE = 'krishna_dairy_instance';
const APIKEY = 'dairybook_global_apikey';

async function test() {
  // Delete any existing
  await fetch(`${BASE}/instance/delete/${INSTANCE}`, { method: 'DELETE', headers: { apikey: APIKEY } }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  // Create fresh
  const create = await fetch(`${BASE}/instance/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: APIKEY },
    body: JSON.stringify({ instanceName: INSTANCE, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
  });
  const cd = await create.json();
  console.log('Created. Full response:', JSON.stringify(cd, null, 2));

  // Poll connect every 2s for 30s
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const c = await fetch(`${BASE}/instance/connect/${INSTANCE}`, { headers: { apikey: APIKEY } });
    const ct = await c.text();
    const state = await fetch(`${BASE}/instance/connectionState/${INSTANCE}`, { headers: { apikey: APIKEY } });
    const stateD = await state.json();
    console.log(`[${i+1}] state=${stateD?.instance?.state} connect=${ct.substring(0, 200)}`);
    
    // Also try fetchInstances
    const fi = await fetch(`${BASE}/instance/fetchInstances?instanceName=${INSTANCE}`, { headers: { apikey: APIKEY } });
    const fid = await fi.json();
    const inst = Array.isArray(fid) ? fid[0] : fid;
    if (inst?.instance?.qrcode?.base64) {
      console.log('QR FOUND in fetchInstances! Length:', inst.instance.qrcode.base64.length);
      console.log('QR prefix:', inst.instance.qrcode.base64.substring(0, 50));
      break;
    }

    try {
      const cd2 = JSON.parse(ct);
      if (cd2?.base64 && cd2.base64.length > 20) {
        console.log('QR FOUND in connect! Length:', cd2.base64.length);
        break;
      }
      if (cd2?.count > 0) {
        console.log('count > 0, trying again...');
      }
    } catch(e) {}
  }
}

test().catch(console.error);
