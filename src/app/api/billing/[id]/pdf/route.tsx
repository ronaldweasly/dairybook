import { renderToStream } from '@react-pdf/renderer';
import { InvoiceDocument } from '@/components/billing/InvoicePDF';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import QRCode from 'qrcode';

type Params = Promise<{ id: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    // 1. Fetch invoice, dairy and customer details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        dairy: true,
      },
    });

    if (!invoice || invoice.dairyId !== session.dairyId) {
      return new Response('Invoice not found', { status: 404 });
    }

    // 2. Fetch daily entries for invoice period
    const entries = await prisma.dailyEntry.findMany({
      where: {
        customerId: invoice.customerId,
        date: {
          gte: invoice.periodStart,
          lte: invoice.periodEnd,
        },
      },
      orderBy: { date: 'asc' },
    });

    // 3. Generate UPI QR Code data URL if UPI ID is set
    let qrCodeDataUrl = '';
    if (invoice.dairy.upiId && invoice.grandTotal > 0) {
      const upiLink = `upi://pay?pa=${invoice.dairy.upiId}&pn=${encodeURIComponent(
        invoice.dairy.name
      )}&am=${invoice.grandTotal.toFixed(2)}&cu=INR`;
      
      try {
        qrCodeDataUrl = await QRCode.toDataURL(upiLink, { margin: 1 });
      } catch (err) {
        console.error('Failed to generate QR Code', err);
      }
    }

    const lang = invoice.dairy.language || 'hi';

    // 4. Render the React PDF component to stream
    const stream = await renderToStream(
      <InvoiceDocument 
        invoice={invoice} 
        entries={entries} 
        qrCodeDataUrl={qrCodeDataUrl}
        lang={lang}
      />
    );

    // 5. Stream the PDF Response
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF Generation API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
