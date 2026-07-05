require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configure database connection using PG adapter (required in Prisma 7)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data
  await prisma.auditLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.dailyEntry.deleteMany({});
  await prisma.rateHistory.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.dairy.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Default Owner User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const owner = await prisma.user.create({
    data: {
      name: 'Ramesh Yadav',
      username: 'admin',
      password: hashedPassword,
      role: 'OWNER',
    },
  });

  // 3. Create Default Dairy
  const dairy = await prisma.dairy.create({
    data: {
      name: 'कृष्णा डेयरी (Krishna Dairy)',
      address: 'गली नंबर 3, मेन रोड, गोपालगंज',
      phone: '9876543210',
      upiId: 'krishnadairy@upi',
      bankName: 'State Bank of India',
      bankAccount: '12345678901',
      bankIfsc: 'SBIN0001234',
      language: 'hi', // Hindi default
      ownerId: owner.id,
    },
  });

  // 4. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      customerId: 'CUST-001',
      name: 'राहुल शर्मा (Rahul Sharma)',
      phone: '9812345678',
      whatsappNumber: '9812345678',
      address: 'वार्ड नंबर 5',
      village: 'रामपुर',
      milkType: 'COW',
      morningQty: 2.5,
      eveningQty: 2.0,
      ratePerLiter: 55.0,
      dairyId: dairy.id,
      notes: 'रोज सुबह-शाम दूध चाहिए',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      customerId: 'CUST-002',
      name: 'सुनील वर्मा (Sunil Verma)',
      phone: '9823456789',
      whatsappNumber: '9823456789',
      address: 'नियर शिव मंदिर',
      village: 'गोपालपुर',
      milkType: 'BUFFALO',
      morningQty: 4.0,
      eveningQty: 3.5,
      ratePerLiter: 65.0,
      dairyId: dairy.id,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      customerId: 'CUST-003',
      name: 'अमित कुमार (Amit Kumar)',
      phone: '9834567890',
      whatsappNumber: '9834567890',
      address: 'गली नंबर 2',
      village: 'रामपुर',
      milkType: 'MIXED',
      morningQty: 1.5,
      eveningQty: 1.5,
      ratePerLiter: 60.0,
      dairyId: dairy.id,
      isActive: false, // Inactive test customer
    },
  });

  // 5. Create Daily Entries for past 5 days (June 25 to June 29)
  const customers = [customer1, customer2, customer3];
  const dates = [
    new Date('2026-06-25'),
    new Date('2026-06-26'),
    new Date('2026-06-27'),
    new Date('2026-06-28'),
    new Date('2026-06-29'),
  ];

  for (const date of dates) {
    for (const customer of customers) {
      if (!customer.isActive && date.getTime() > new Date('2026-06-27').getTime()) {
        // Skip entries for inactive customers after some date
        continue;
      }
      await prisma.dailyEntry.create({
        data: {
          date: date,
          customerId: customer.id,
          morningQty: customer.morningQty,
          eveningQty: customer.eveningQty,
          milkType: customer.milkType,
          ratePerLiter: customer.ratePerLiter,
          extraCharges: 0,
          discount: 0,
          remarks: date.getDay() === 0 ? 'रविवार स्पेशल' : '',
        },
      });
    }
  }

  // 6. Create Invoice for previous month (May 2026) for Customer 1
  const mayStart = new Date('2026-05-01');
  const mayEnd = new Date('2026-05-31');
  
  const totalQty = (customer1.morningQty + customer1.eveningQty) * 31; // daily total * 31 days
  const milkAmount = totalQty * customer1.ratePerLiter;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-05-001',
      customerId: customer1.id,
      dairyId: dairy.id,
      billingMonth: 5,
      billingYear: 2026,
      periodStart: mayStart,
      periodEnd: mayEnd,
      totalMorningQty: customer1.morningQty * 31,
      totalEveningQty: customer1.eveningQty * 31,
      totalQty: totalQty,
      avgRate: customer1.ratePerLiter,
      milkAmount: milkAmount,
      grandTotal: milkAmount,
      dueDate: new Date('2026-06-10'),
      status: 'PARTIALLY_PAID',
    },
  });

  // 7. Create Payment for May invoice
  await prisma.payment.create({
    data: {
      customerId: customer1.id,
      invoiceId: invoice.id,
      amount: milkAmount - 500, // Partial payment
      method: 'UPI',
      reference: 'UPI9876543210',
      notes: 'आंशिक भुगतान प्राप्त हुआ',
      paidAt: new Date('2026-06-05'),
    },
  });

  console.log('Seeding completed successfully!');
  console.log('Default credentials: admin / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Close PG pool connections
  });
