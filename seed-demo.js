const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DB_URL = 'postgresql://postgres:postgres_password@localhost:5432/dairybook?schema=public';
const pool = new Pool({ connectionString: DB_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.dailyEntry.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.dairy.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating demo user...');
  const pw = await bcrypt.hash('1234', 10);

  // Create admin user for PIN-pad login
  const adminUser = await prisma.user.create({
    data: { name: 'Admin Owner', username: 'admin', password: pw, role: 'OWNER' }
  });

  // Create backup demo user
  const demoUser = await prisma.user.create({
    data: { name: 'Demo Owner', username: 'demo', password: pw, role: 'OWNER' }
  });

  const dairy = await prisma.dairy.create({
    data: {
      name: 'Krishna Dairy',
      address: 'Sector 5, Laxmi Nagar, Delhi',
      phone: '9876543210',
      currency: 'INR',
      language: 'hi',
      invoicePrefix: 'KD',
      ownerId: adminUser.id
    }
  });

  const raw = [
    { name: 'Ramesh Kumar', phone: '9811001001', w: '9811001001', v: 'Noida',      m: 2.5, e: 1.5, r: 58, t: 'COW'     },
    { name: 'Sunita Devi',  phone: '9811002002', w: '9811002002', v: 'Ghaziabad',  m: 3.0, e: 2.0, r: 60, t: 'BUFFALO' },
    { name: 'Mohan Lal',    phone: '9811003003', w: '9811003003', v: 'Noida',      m: 1.5, e: 1.0, r: 58, t: 'COW'     },
    { name: 'Priya Sharma', phone: '9811004004', w: '9811004004', v: 'Delhi',      m: 4.0, e: 2.5, r: 62, t: 'BUFFALO' },
    { name: 'Vijay Singh',  phone: '9811005005', w: '9811005005', v: 'Faridabad',  m: 2.0, e: 1.5, r: 58, t: 'COW'     },
  ];

  const custs = [];
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    const cust = await prisma.customer.create({
      data: {
        customerId: 'CUST-00' + (i + 1),
        name: c.name, phone: c.phone, whatsappNumber: c.w,
        village: c.v, morningQty: c.m, eveningQty: c.e,
        ratePerLiter: c.r, milkType: c.t, dairyId: dairy.id,
      }
    });
    custs.push({ ...cust, r: c.r, m: c.m, e: c.e });
  }
  console.log('Created ' + custs.length + ' customers');

  // Daily entries for last 7 days
  const today = new Date();
  for (let day = 6; day >= 0; day--) {
    const d = new Date(today);
    d.setDate(today.getDate() - day);
    d.setHours(0, 0, 0, 0);
    for (const c of custs) {
      const mq = Math.max(0, Math.round((c.m + (Math.random() - 0.5) * 0.4) * 10) / 10);
      const eq = Math.max(0, Math.round((c.e + (Math.random() - 0.5) * 0.4) * 10) / 10);
      await prisma.dailyEntry.create({
        data: { customerId: c.id, date: d, morningQty: mq, eveningQty: eq, ratePerLiter: c.r, milkType: c.milkType }
      });
    }
  }
  console.log('Created 7 days of daily entries');

  // One paid invoice + payment per customer
  for (let i = 0; i < custs.length; i++) {
    const c = custs[i];
    const morningQtyTotal = c.m * 15;
    const eveningQtyTotal = c.e * 15;
    const totalQty = morningQtyTotal + eveningQtyTotal;
    const milkAmount = totalQty * c.r;
    const grandTotal = milkAmount;

    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: 'KD-' + String(i + 1).padStart(4, '0'),
        customerId: c.id,
        dairyId: dairy.id,
        billingMonth: today.getMonth() + 1, // 1-12
        billingYear: today.getFullYear(),
        periodStart: new Date(today.getFullYear(), today.getMonth(), 1),
        periodEnd:   new Date(today.getFullYear(), today.getMonth(), 15),
        totalMorningQty: morningQtyTotal,
        totalEveningQty: eveningQtyTotal,
        totalQty: totalQty,
        avgRate: c.r,
        milkAmount: milkAmount,
        grandTotal: grandTotal,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 20),
        status: 'PAID',
      }
    });
    await prisma.payment.create({
      data: { customerId: c.id, invoiceId: inv.id, amount: inv.grandTotal, method: 'CASH', notes: 'Demo payment' }
    });
  }

  console.log('');
  console.log('✅  Demo data seeded successfully!');
  console.log('    Username : demo');
  console.log('    Password : 1234');
  console.log('    Dairy    : Krishna Dairy');
  console.log('    Customers: ' + custs.length);
  console.log('    Entries  : 7 days x ' + custs.length + ' customers');
  console.log('    Invoices : ' + custs.length + ' (all PAID)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
