/**
 * Generates a fully self-contained HTML string for an invoice.
 * Uses base64-embedded Noto Sans Devanagari fonts so it works 100% offline.
 * Rendered by Puppeteer (Chromium) for native Hindi ligature support.
 */
import { fontRegularB64, fontBoldB64 } from './fontBase64';

function fmt(val: Date | string): string {
  const d = new Date(val);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function generateInvoiceHtml(params: {
  invoice: any;
  entries: any[];
  qrCodeDataUrl?: string;
  lang?: string;
}): string {
  const { invoice, entries, qrCodeDataUrl, lang = 'hi' } = params;
  const isHi = lang === 'hi';

  const milkTypeLabel = () => {
    if (invoice.customer.milkType === 'COW') return isHi ? 'गाय' : 'Cow';
    if (invoice.customer.milkType === 'BUFFALO') return isHi ? 'भैंस' : 'Buffalo';
    return isHi ? 'मिश्रित' : 'Mixed';
  };

  const rowsHtml = entries.map((item: any) => {
    const dailyTotal =
      (item.morningQty + item.eveningQty) * item.ratePerLiter +
      item.extraCharges -
      item.discount;
    return `
      <tr>
        <td>${fmt(item.date)}</td>
        <td class="center">${item.isHoliday ? '-' : fmtNum(item.morningQty, 1) + ' L'}</td>
        <td class="center">${item.isHoliday ? '-' : fmtNum(item.eveningQty, 1) + ' L'}</td>
        <td class="right">&#8377;${fmtNum(item.ratePerLiter, 1)}</td>
        <td class="right">&#8377;${fmtNum(dailyTotal)}</td>
        <td class="muted">${item.remarks || ''}</td>
      </tr>`;
  }).join('');

  const extraChargesRow = invoice.extraCharges > 0
    ? `<tr><td>${isHi ? 'अतिरिक्त शुल्क' : 'Extra Charges'}</td><td class="right amount-green">+ &#8377;${fmtNum(invoice.extraCharges)}</td></tr>`
    : '';
  const discountRow = invoice.discount > 0
    ? `<tr><td>${isHi ? 'छूट' : 'Discount'}</td><td class="right amount-green">- &#8377;${fmtNum(invoice.discount)}</td></tr>`
    : '';
  const prevBalRow = invoice.previousBalance > 0
    ? `<tr><td class="amount-red">${isHi ? 'पिछला बकाया' : 'Prev Balance'}</td><td class="right amount-red">+ &#8377;${fmtNum(invoice.previousBalance)}</td></tr>`
    : '';
  const advanceRow = invoice.advancePayment > 0
    ? `<tr><td class="amount-green">${isHi ? 'अग्रिम भुगतान' : 'Advance Paid'}</td><td class="right amount-green">- &#8377;${fmtNum(invoice.advancePayment)}</td></tr>`
    : '';

  const qrSection = qrCodeDataUrl
    ? `<div class="qr-box">
        <img src="${qrCodeDataUrl}" class="qr-img" />
        <p class="qr-label">${isHi ? 'भुगतान के लिए स्कैन करें' : 'Scan to Pay'}</p>
        <p class="qr-upi">UPI: ${invoice.dairy.upiId || ''}</p>
       </div>`
    : `<div class="qr-box qr-empty"><p>${isHi ? 'UPI उपलब्ध नहीं' : 'UPI Not Configured'}</p></div>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<title>${isHi ? 'दूध बिल' : 'Milk Invoice'} - ${invoice.invoiceNumber}</title>
<style>
  /* Embedded offline font — no network needed */
  @font-face {
    font-family: 'NotoDevanagari';
    src: url('data:font/ttf;base64,${fontRegularB64}') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'NotoDevanagari';
    src: url('data:font/ttf;base64,${fontBoldB64}') format('truetype');
    font-weight: bold;
    font-style: normal;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'NotoDevanagari', Arial, sans-serif;
    font-size: 11px;
    color: #334155;
    background: #fff;
    padding: 24px 28px;
    line-height: 1.5;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2.5px solid #10b981;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .dairy-name { font-size: 20px; font-weight: bold; color: #064e3b; margin-bottom: 3px; }
  .dairy-sub  { font-size: 10px; color: #64748b; margin-top: 2px; }
  .invoice-title { font-size: 16px; font-weight: bold; color: #0f172a; text-align: right; }
  .invoice-meta  { font-size: 10px; color: #64748b; text-align: right; margin-top: 3px; }

  .meta-grid { display: flex; gap: 20px; margin-bottom: 18px; }
  .meta-box  { flex: 1; }
  .meta-title { font-size: 10px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 7px; }
  .meta-row   { display: flex; gap: 6px; margin-bottom: 3px; font-size: 10px; }
  .meta-label { font-weight: bold; color: #64748b; white-space: nowrap; min-width: 72px; }
  .meta-value { color: #1e293b; }
  .due-red    { color: #e11d48; font-weight: bold; }

  .section-title { font-size: 11px; font-weight: bold; color: #0f172a; margin-bottom: 8px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 10px; }
  thead tr { background: #f8fafc; }
  th { padding: 6px 5px; font-weight: bold; color: #334155; border-bottom: 1.5px solid #cbd5e1; text-align: left; }
  td { padding: 5px 5px; border-bottom: 1px solid #f1f5f9; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .muted  { color: #94a3b8; }

  .summary-section { display: flex; gap: 18px; align-items: flex-start; margin-top: 6px; }
  .qr-box {
    flex: 0 0 130px; border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 10px; text-align: center; min-height: 140px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .qr-empty { color: #94a3b8; font-size: 9px; }
  .qr-img   { width: 90px; height: 90px; margin-bottom: 5px; }
  .qr-label { font-size: 9px; font-weight: bold; color: #064e3b; }
  .qr-upi   { font-size: 8px; color: #64748b; margin-top: 2px; }

  .totals-block { flex: 1; }
  table.totals-table { margin: 0; }
  table.totals-table td { padding: 4px 6px; font-size: 10px; border-bottom: 1px solid #f1f5f9; }
  .amount-red   { color: #e11d48; }
  .amount-green { color: #16a34a; }

  .grand-total-row { background: #ecfdf5; border-top: 2px solid #10b981 !important; border-bottom: 2px solid #10b981 !important; }
  .grand-total-row td { font-size: 13px; font-weight: bold; color: #064e3b; padding: 7px 6px; border-bottom: none !important; }

  .footer {
    margin-top: 22px; border-top: 1px solid #e2e8f0;
    padding-top: 10px; text-align: center; color: #94a3b8; font-size: 9px;
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <p class="dairy-name">${invoice.dairy.name}</p>
    ${invoice.dairy.address ? `<p class="dairy-sub">${invoice.dairy.address}</p>` : ''}
    ${invoice.dairy.phone ? `<p class="dairy-sub">${isHi ? 'मोबाइल' : 'Mobile'}: ${invoice.dairy.phone}</p>` : ''}
    ${invoice.dairy.gstNumber ? `<p class="dairy-sub">GSTIN: ${invoice.dairy.gstNumber}</p>` : ''}
  </div>
  <div>
    <p class="invoice-title">${isHi ? 'दुग्ध बिल / इनवॉइस' : 'Milk Invoice'}</p>
    <p class="invoice-meta">${isHi ? 'बिल नंबर' : 'Bill No'}: <strong>${invoice.invoiceNumber}</strong></p>
    <p class="invoice-meta">${isHi ? 'दिनांक' : 'Date'}: ${fmt(invoice.createdAt)}</p>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-box">
    <p class="meta-title">${isHi ? 'ग्राहक का विवरण' : 'Customer Details'}</p>
    <div class="meta-row"><span class="meta-label">${isHi ? 'नाम' : 'Name'}:</span><span class="meta-value">${invoice.customer.name}</span></div>
    <div class="meta-row"><span class="meta-label">ID:</span><span class="meta-value">${invoice.customer.customerId}</span></div>
    <div class="meta-row"><span class="meta-label">${isHi ? 'फोन' : 'Phone'}:</span><span class="meta-value">${invoice.customer.phone}</span></div>
    ${invoice.customer.village ? `<div class="meta-row"><span class="meta-label">${isHi ? 'गांव' : 'Village'}:</span><span class="meta-value">${invoice.customer.village}</span></div>` : ''}
  </div>
  <div class="meta-box">
    <p class="meta-title">${isHi ? 'बिल की अवधि' : 'Billing Period'}</p>
    <div class="meta-row"><span class="meta-label">${isHi ? 'अवधि' : 'Period'}:</span><span class="meta-value">${fmt(invoice.periodStart)} - ${fmt(invoice.periodEnd)}</span></div>
    <div class="meta-row"><span class="meta-label">${isHi ? 'दूध' : 'Milk Type'}:</span><span class="meta-value">${milkTypeLabel()}</span></div>
    <div class="meta-row"><span class="meta-label">${isHi ? 'देय तिथि' : 'Due Date'}:</span><span class="meta-value due-red">${fmt(invoice.dueDate)}</span></div>
  </div>
</div>

<p class="section-title">${isHi ? 'दैनिक दूध विवरण' : 'Daily Milk Record'}</p>
<table>
  <thead>
    <tr>
      <th>${isHi ? 'तारीख' : 'Date'}</th>
      <th class="center">${isHi ? 'सुबह' : 'Morning'}</th>
      <th class="center">${isHi ? 'शाम' : 'Evening'}</th>
      <th class="right">${isHi ? 'दर' : 'Rate'}</th>
      <th class="right">${isHi ? 'कुल' : 'Total'}</th>
      <th>${isHi ? 'टिप्पणी' : 'Remarks'}</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>

<div class="summary-section">
  ${qrSection}
  <div class="totals-block">
    <table class="totals-table">
      <tr><td><strong>${isHi ? 'सुबह कुल दूध' : 'Morning Total'}</strong></td><td class="right">${fmtNum(invoice.totalMorningQty, 1)} L</td></tr>
      <tr><td><strong>${isHi ? 'शाम कुल दूध' : 'Evening Total'}</strong></td><td class="right">${fmtNum(invoice.totalEveningQty, 1)} L</td></tr>
      <tr><td><strong>${isHi ? 'कुल दूध' : 'Total Milk'}</strong></td><td class="right">${fmtNum(invoice.totalQty, 1)} L</td></tr>
      <tr><td><strong>${isHi ? 'दूध मूल्य' : 'Milk Cost'}</strong></td><td class="right">&#8377;${fmtNum(invoice.milkAmount)}</td></tr>
      ${extraChargesRow}
      ${discountRow}
      ${prevBalRow}
      ${advanceRow}
      <tr class="grand-total-row">
        <td>${isHi ? 'कुल देय राशि' : 'Grand Total'}</td>
        <td class="right">&#8377;${fmtNum(invoice.grandTotal)}</td>
      </tr>
    </table>
  </div>
</div>

<p class="footer">${isHi ? `हमारे साथ व्यापार करने के लिए धन्यवाद! — ${invoice.dairy.name}` : `Thank you for choosing ${invoice.dairy.name}!`}</p>

</body>
</html>`;
}
