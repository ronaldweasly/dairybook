import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
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

    // Auto-populate default Evolution API configurations if not present
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

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const baseUrl = (dairy.whatsappPhoneId || 'http://localhost:8080').replace(/\/$/, '');
    const instanceName = dairy.whatsappBusinessId || 'krishna_dairy_instance';
    const apikey = dairy.whatsappApiKey || 'dairybook_global_apikey';

    // Check if connected first to protect active sessions from force delete
    let alreadyConnected = false;
    let instanceExists = false;
    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey },
        signal: AbortSignal.timeout(3000),
      });

      if (stateRes.ok) {
        instanceExists = true;
        const stateData = await stateRes.json();
        if (stateData?.instance?.state === 'open') {
          alreadyConnected = true;
        }
      }
    } catch (err: any) {
      console.error('[Evolution] Pre-check failed:', err.message);
    }

    if (alreadyConnected) {
      return NextResponse.json({ status: 'connected', message: 'WhatsApp is already connected!' });
    }

    // Now we know it is not connected. If force=true, delete and recreate for a clean slate.
    if (force) {
      console.log(`[Evolution] Force reconnect requested. Deleting instance ${instanceName}...`);
      try {
        await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: { apikey },
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
        instanceExists = false;
        // Wait a moment for delete operation to finish
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error('[Evolution] Delete failed:', err);
      }
    }

    // 1. Check connection state (if we didn't delete it, re-verify stateData)
    if (instanceExists && !force) {
      // It exists and is not open, let's keep going.
    } else {
      // If we deleted it, it doesn't exist anymore.
      instanceExists = false;
    }

    // 2. Create instance if it doesn't exist
    if (!instanceExists) {
      console.log(`[Evolution] Creating instance ${instanceName}...`);
      try {
        const createRes = await fetch(`${baseUrl}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey },
          body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
          signal: AbortSignal.timeout(8000),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          return NextResponse.json(
            { error: 'Failed to create instance: ' + (errData?.message || createRes.status) },
            { status: 500 }
          );
        }
      } catch (err: any) {
        return NextResponse.json({ error: 'Instance creation timed out' }, { status: 500 });
      }

      // Return immediately telling client to poll
      return NextResponse.json({ status: 'creating', message: 'Instance created, generating QR...' });
    }

    // 3. Instance exists but not connected — fetch QR
    try {
      // Try /instance/connect
      const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
        headers: { apikey },
        signal: AbortSignal.timeout(5000),
      });

      if (connectRes.ok) {
        const d = await connectRes.json();
        if (d?.base64 && d.base64.length > 10) {
          return NextResponse.json({ status: 'qrcode', qrcode: d.base64 });
        }
        if (d?.code && d.code.length > 10) {
          return NextResponse.json({ status: 'qrcode', qrcode: d.code });
        }
      }

      // Fallback: /instance/qrcode
      const qrRes = await fetch(`${baseUrl}/instance/qrcode/${instanceName}`, {
        headers: { apikey },
        signal: AbortSignal.timeout(5000),
      });

      if (qrRes.ok) {
        const q = await qrRes.json();
        if (q?.base64 && q.base64.length > 10) {
          return NextResponse.json({ status: 'qrcode', qrcode: q.base64 });
        }
        if (q?.code && q.code.length > 10) {
          return NextResponse.json({ status: 'qrcode', qrcode: q.code });
        }
      }
    } catch (err) {
      // ignore timeout, fall through
    }

    // QR not ready yet — tell client to retry
    return NextResponse.json({ status: 'generating', message: 'QR code is being generated, please wait...' });

  } catch (error: any) {
    console.error('[Evolution] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
