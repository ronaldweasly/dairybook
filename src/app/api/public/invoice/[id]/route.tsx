import puppeteer from 'puppeteer';
import prisma from '@/lib/prisma';
import { generateInvoiceHtml } from '@/lib/invoiceHtml';
import QRCode from 'qrcode';

export const maxDuration = 60; // seconds — allow Puppeteer time to start

type Params = Promise<{ id: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;

    // Fetch invoice, dairy and customer details (no auth — public shareable link)
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

    // Generate the invoice HTML
    const html = generateInvoiceHtml({ invoice, entries, qrCodeDataUrl, lang });

    // Use Puppeteer (Chromium) to render HTML → PDF with native Devanagari support
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
    });

    await browser.close();

    return new Response(Buffer.from(pdfBuffer), {
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
