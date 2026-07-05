import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, message } = await req.json();
    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message are required' }, { status: 400 });
    }

    const dairy = await prisma.dairy.findUnique({ where: { id: session.dairyId } });
    if (!dairy) {
      return NextResponse.json({ error: 'Dairy not found' }, { status: 404 });
    }

    const baseUrl = (dairy.whatsappPhoneId || 'http://localhost:8080').replace(/\/$/, '');
    const instanceName = dairy.whatsappBusinessId || 'krishna_dairy_instance';
    const apikey = dairy.whatsappApiKey || 'dairybook_global_apikey';

    // Format phone: strip non-digits, ensure country code
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // Check instance is connected
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      headers: { apikey },
      signal: AbortSignal.timeout(5000),
    });

    if (!stateRes.ok) {
      return NextResponse.json({ error: 'Evolution API unreachable' }, { status: 503 });
    }

    const stateData = await stateRes.json();
    if (stateData?.instance?.state !== 'open') {
      return NextResponse.json({
        error: 'WhatsApp not connected. Please scan the QR code in Settings first.',
        state: stateData?.instance?.state,
      }, { status: 400 });
    }

    // Send message via Evolution API
    const sendRes = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const sendData = await sendRes.json().catch(() => ({}));

    if (!sendRes.ok) {
      console.error('[WhatsApp Send] Error:', sendData);
      return NextResponse.json({
        error: sendData?.message || 'Failed to send WhatsApp message',
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: sendData?.key?.id });
  } catch (error: any) {
    console.error('[WhatsApp Send] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
