import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchQR(baseUrl: string, instanceName: string, apikey: string): Promise<string | null> {
  // Try /instance/connect first (v2 primary)
  const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
    headers: { apikey },
  });
  if (connectRes.ok) {
    const d = await connectRes.json().catch(() => ({}));
    if (d?.base64) return d.base64;
    if (d?.code && d.code.length > 10) return d.code; // pairing code or base64 inline
  }

  // Fallback: try /instance/qrcode endpoint
  const qrRes = await fetch(`${baseUrl}/instance/qrcode/${instanceName}`, {
    headers: { apikey },
  });
  if (qrRes.ok) {
    const q = await qrRes.json().catch(() => ({}));
    if (q?.base64) return q.base64;
    if (q?.code && q.code.length > 10) return q.code;
  }

  return null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let dairy = await prisma.dairy.findUnique({
      where: { id: session.dairyId },
    });

    if (!dairy) {
      return NextResponse.json({ error: 'Dairy not found' }, { status: 404 });
    }

    // Auto-populate default local Evolution API configurations if not present
    if (!dairy.whatsappPhoneId || !dairy.whatsappBusinessId || !dairy.whatsappApiKey) {
      dairy = await prisma.dairy.update({
        where: { id: session.dairyId },
        data: {
          whatsappPhoneId: dairy.whatsappPhoneId || 'http://localhost:8080',
          whatsappBusinessId: dairy.whatsappBusinessId || 'krishna_dairy_instance',
          whatsappApiKey: dairy.whatsappApiKey || 'dairybook_global_apikey',
        },
      });
    }

    const baseUrl = (dairy.whatsappPhoneId || 'http://localhost:8080').replace(/\/$/, '');
    const instanceName = dairy.whatsappBusinessId || 'krishna_dairy_instance';
    const apikey = dairy.whatsappApiKey || 'dairybook_global_apikey';

    // 1. Check if instance exists or create it
    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey },
      });

      if (!stateRes.ok) {
        // Instance does not exist — create it
        console.log(`[Evolution] Creating instance ${instanceName}...`);
        const createRes = await fetch(`${baseUrl}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey },
          body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          return NextResponse.json({ error: errData.message || 'Failed to create Evolution instance' }, { status: 500 });
        }

        // Wait for Baileys to initialise and generate QR
        await sleep(3000);
      } else {
        const stateData = await stateRes.json();
        if (stateData?.instance?.state === 'open') {
          return NextResponse.json({ status: 'connected', message: 'WhatsApp is already connected!' });
        }
      }
    } catch (err) {
      return NextResponse.json({ error: 'Unable to connect to Evolution API server. Check URL.' }, { status: 500 });
    }

    // 2. Fetch the QR code — retry up to 5 times with 2s delay between retries
    let qr: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      qr = await fetchQR(baseUrl, instanceName, apikey);
      if (qr) break;
      console.log(`[Evolution] QR not ready yet (attempt ${attempt + 1}/5), retrying in 2s...`);
      await sleep(2000);
    }

    if (!qr) {
      return NextResponse.json({ error: 'QR code not ready yet. Please try again in a few seconds.' }, { status: 500 });
    }

    return NextResponse.json({ status: 'qrcode', qrcode: qr });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

