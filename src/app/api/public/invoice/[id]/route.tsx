import { renderToStream } from '@react-pdf/renderer';
import { InvoiceDocument } from '@/components/billing/InvoicePDF';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';

type Params = Promise<{ id: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;

    // Fetch invoice, dairy and customer details (no authentication check since this is a public shareable link)
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        dairy: true,
      },
    });

    if (!invoice) {
      return new Response('Invoice not found', { status: 404 });
    }

    // Fetch daily entries for invoice period
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

    // Generate UPI QR Code data URL if UPI ID is set
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

    // Render the React PDF component to stream
    const stream = await renderToStream(
      <InvoiceDocument 
        invoice={invoice} 
        entries={entries} 
        qrCodeDataUrl={qrCodeDataUrl}
        lang={lang}
      />
    );

    // Stream the PDF Response
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Public PDF Generation error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
