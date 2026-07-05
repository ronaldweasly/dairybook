import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

    const baseUrl = (dairy.whatsappPhoneId || 'http://localhost:8080').replace(/\/$/, ''); // Remove trailing slash
    const instanceName = dairy.whatsappBusinessId || 'krishna_dairy_instance';
    const apikey = dairy.whatsappApiKey || 'dairybook_global_apikey';

    // 1. Check if instance exists or create it
    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey },
      });
      
      if (!stateRes.ok) {
        // Instance might not exist, let's create it
        console.log(`[Evolution] Instance ${instanceName} not found. Creating...`);
        const createRes = await fetch(`${baseUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey,
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          return NextResponse.json({ error: errData.message || 'Failed to create Evolution instance' }, { status: 500 });
        }
      } else {
        const stateData = await stateRes.json();
        if (stateData?.instance?.state === 'open') {
          return NextResponse.json({ status: 'connected', message: 'WhatsApp is already connected!' });
        }
      }
    } catch (err) {
      return NextResponse.json({ error: 'Unable to connect to Evolution API server. Check URL.' }, { status: 500 });
    }

    // 2. Fetch the QR code
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: { apikey },
    });

    if (!connectRes.ok) {
      const errText = await connectRes.text();
      return NextResponse.json({ error: `Failed to fetch connection QR: ${errText}` }, { status: 500 });
    }

    const connectData = await connectRes.json();
    
    if (connectData?.base64) {
      return NextResponse.json({
        status: 'qrcode',
        qrcode: connectData.base64, // Base64 data string (e.g. data:image/png;base64,...)
      });
    } else if (connectData?.code) {
      return NextResponse.json({
        status: 'qrcode',
        qrcode: connectData.code,
      });
    }

    return NextResponse.json({ error: 'Evolution API returned invalid QR code response' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
