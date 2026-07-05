import prisma from './prisma';

/**
 * Automatically creates daily milk entries for all active customers up to today.
 * Copies the previous day's quantities (same as yesterday) unless interrupted.
 * If no previous entry exists, uses the default values from the customer's profile.
 */
export async function runDailyMilkAutosave(dairyId: string) {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        dairyId,
        isActive: true,
        isArchived: false,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lookback up to 14 days to backfill if the app was closed
    const lookbackDays = 14;
    const startCheckDate = new Date(today);
    startCheckDate.setDate(startCheckDate.getDate() - lookbackDays);

    let createdCount = 0;

    for (const customer of customers) {
      const custStartDate = new Date(customer.startDate);
      custStartDate.setHours(0, 0, 0, 0);
      const startLoop = custStartDate > startCheckDate ? custStartDate : startCheckDate;

      const currentLoopDate = new Date(startLoop);
      while (currentLoopDate <= today) {
        const dateToCheck = new Date(currentLoopDate);

        // Check if entry already exists
        const existing = await prisma.dailyEntry.findUnique({
          where: {
            customerId_date: {
              customerId: customer.id,
              date: dateToCheck,
            },
          },
        });

        if (!existing) {
          // Find previous day's entry to copy (carry forward logic)
          const prevDate = new Date(dateToCheck);
          prevDate.setDate(prevDate.getDate() - 1);

          const prevEntry = await prisma.dailyEntry.findUnique({
            where: {
              customerId_date: {
                customerId: customer.id,
                date: prevDate,
              },
            },
          });

          const morningQty = prevEntry ? prevEntry.morningQty : customer.morningQty;
          const eveningQty = prevEntry ? prevEntry.eveningQty : customer.eveningQty;
          const milkType = prevEntry ? prevEntry.milkType : customer.milkType;
          const ratePerLiter = prevEntry ? prevEntry.ratePerLiter : customer.ratePerLiter;

          await prisma.dailyEntry.create({
            data: {
              date: dateToCheck,
              customerId: customer.id,
              morningQty,
              eveningQty,
              milkType,
              ratePerLiter,
              extraCharges: 0,
              discount: 0,
              isHoliday: false,
            },
          });
          createdCount++;
        }

        currentLoopDate.setDate(currentLoopDate.getDate() + 1);
      }
    }

    if (createdCount > 0) {
      console.log(`[Automation] Auto-saved ${createdCount} daily milk entries for dairy ${dairyId}`);
    }
  } catch (error) {
    console.error('[Automation] Error running daily milk autosave:', error);
  }
}

/**
 * Automatically generates invoices for active customers if today matches their monthly billingDay.
 * The invoice covers the past 1 month ending yesterday.
 */
export async function runAutoBilling(dairyId: string) {
  try {
    const today = new Date();
    const currentDay = today.getDate(); // 1 to 31

    // Find all active customers whose billingDay is today
    const customers = await prisma.customer.findMany({
      where: {
        dairyId,
        isActive: true,
        isArchived: false,
        billingDay: currentDay,
      },
    });

    if (customers.length === 0) return [];

    // Calculate billing period: past 1 month ending yesterday
    const periodEnd = new Date(today);
    periodEnd.setDate(periodEnd.getDate() - 1);
    periodEnd.setHours(23, 59, 59, 999);

    const periodStart = new Date(today);
    periodStart.setMonth(periodStart.getMonth() - 1);
    periodStart.setHours(0, 0, 0, 0);

    const billingMonth = today.getMonth() + 1; // current month (1-12)
    const billingYear = today.getFullYear();

    const generatedInvoices = [];

    for (const customer of customers) {
      // Check if invoice already exists for this customer, month and year
      const existingInvoice = await prisma.invoice.findUnique({
        where: {
          customerId_billingMonth_billingYear: {
            customerId: customer.id,
            billingMonth,
            billingYear,
          },
        },
      });

      if (existingInvoice) continue;

      // Fetch entries in period
      const entries = await prisma.dailyEntry.findMany({
        where: {
          customerId: customer.id,
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      if (entries.length === 0) continue;

      let totalMorningQty = 0;
      let totalEveningQty = 0;
      let milkAmount = 0;
      let extraCharges = 0;
      let discount = 0;

      entries.forEach((e) => {
        if (!e.isHoliday) {
          totalMorningQty += e.morningQty;
          totalEveningQty += e.eveningQty;
          milkAmount += (e.morningQty + e.eveningQty) * e.ratePerLiter;
          extraCharges += e.extraCharges;
          discount += e.discount;
        }
      });

      const totalQty = totalMorningQty + totalEveningQty;
      if (totalQty === 0) continue;

      const avgRate = milkAmount / totalQty;

      // Fetch previous unpaid balances / advance payments
      const previousInvoices = await prisma.invoice.findMany({
        where: {
          customerId: customer.id,
          status: { in: ['GENERATED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        include: { payments: true },
      });

      let previousBalance = 0;
      previousInvoices.forEach((inv) => {
        const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
        previousBalance += Math.max(0, inv.grandTotal - paid);
      });

      // Get advance payments not linked to any invoice
      const unlinkedPayments = await prisma.payment.findMany({
        where: {
          customerId: customer.id,
          invoiceId: null,
          isAdvance: true,
        },
      });
      const advancePayment = unlinkedPayments.reduce((sum, p) => sum + p.amount, 0);

      const grandTotal = Math.max(0, milkAmount + extraCharges - discount + previousBalance - advancePayment);

      // Generate invoice number: INV-YEAR-MONTH-CUSTID
      const invoiceNumber = `INV-${billingYear}-${String(billingMonth).padStart(2, '0')}-${customer.customerId}`;

      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer.id,
          dairyId,
          billingMonth,
          billingYear,
          periodStart,
          periodEnd,
          totalMorningQty,
          totalEveningQty,
          totalQty,
          avgRate,
          milkAmount,
          extraCharges,
          discount,
          previousBalance,
          advancePayment,
          grandTotal,
          dueDate,
          status: 'GENERATED',
        },
        include: {
          customer: true,
          dairy: true,
        },
      });

      // Link those advance payments to this newly created invoice so they are settled
      if (unlinkedPayments.length > 0) {
        await prisma.payment.updateMany({
          where: { id: { in: unlinkedPayments.map((p) => p.id) } },
          data: { invoiceId: invoice.id },
        });
      }

      // ── Headless Background WhatsApp auto-send via Evolution API ──
      const dairy = invoice.dairy;
      if (dairy && dairy.whatsappPhoneId && dairy.whatsappBusinessId && dairy.whatsappApiKey) {
        const sentSuccess = await sendWhatsAppViaEvolutionBot(invoice, dairy);
        if (sentSuccess) {
          // Update status to SENT and record timestamp
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: 'SENT',
              whatsappSentAt: new Date(),
            },
          });
          // Update the local invoice object status for returning
          invoice.status = 'SENT';
          invoice.whatsappSentAt = new Date();
        }
      }

      generatedInvoices.push(invoice);
    }

    if (generatedInvoices.length > 0) {
      console.log(`[Automation] Automatically generated ${generatedInvoices.length} bills for dairy ${dairyId}`);
    }

    return generatedInvoices;
  } catch (error) {
    console.error('[Automation] Error running auto billing:', error);
    return [];
  }
}

/**
 * Headless background WhatsApp dispatch via Evolution Bot
 */
async function sendWhatsAppViaEvolutionBot(invoice: any, dairy: any): Promise<boolean> {
  try {
    const baseUrl = dairy.whatsappPhoneId.replace(/\/$/, ''); // Remove trailing slash
    const instanceName = dairy.whatsappBusinessId;
    const apikey = dairy.whatsappApiKey;

    const customerName = invoice.customer.name;
    const totalMilk = invoice.totalQty.toFixed(1);
    const avgRate = invoice.avgRate.toFixed(1);
    const grandTotal = invoice.grandTotal.toFixed(2);
    const dairyName = dairy.name || 'Dairy';
    
    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthName = monthNamesEn[invoice.billingMonth - 1];
    
    // Ensure APP URL is dynamic
    const publicPdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/public/invoice/${invoice.id}`;
    
    const sep = '━━━━━━━━━━━━━━━━';

    const text = `*${dairyName}*\n` +
      `${sep}\n` +
      `Hello *${customerName}*,\n\n` +
      `Your milk bill for *${monthName} ${invoice.billingYear}* is ready.\n\n` +
      `*Bill Summary:*\n` +
      `• Total Milk  : *${totalMilk} Liters*\n` +
      `• Rate        : *₹${avgRate}/Liter*\n` +
      `• Total Amount: *₹${grandTotal}*\n\n` +
      `${sep}\n` +
      `Click below to view your invoice:\n` +
      `${publicPdfUrl}\n\n` +
      `Thank you! *${dairyName}*`;

    const cleanPhone = invoice.customer.whatsappNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    console.log(`[Evolution] Attempting auto-send to ${customerName} (${formattedPhone})...`);

    const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        options: {
          delay: 1200,
          presence: 'composing',
        },
        textMessage: {
          text,
        },
      }),
    });

    const data = await res.json();

    if (res.ok && (data?.key || data?.message?.key)) {
      console.log(`[Evolution] headlessly auto-sent invoice to ${customerName} successfully!`);
      return true;
    } else {
      console.error(`[Evolution] API returned error:`, data);
      return false;
    }
  } catch (err) {
    console.error(`[Evolution] Headless connection error:`, err);
    return false;
  }
}
