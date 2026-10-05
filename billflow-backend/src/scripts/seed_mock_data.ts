import { db, initializeDatabase } from '../config/database';

console.log('🌱 Seeding database with realistic mock enterprise data...');

// Initialize tables if needed
initializeDatabase();

// Clear existing tables
db.exec('DELETE FROM invoice_lines');
db.exec('DELETE FROM quote_lines');
db.exec('DELETE FROM invoices');
db.exec('DELETE FROM quotes');
db.exec('DELETE FROM clients');

// 1. Insert Mock Clients
const insertClient = db.prepare(`
  INSERT INTO clients (
    code, name, type, classification, email, phone, address, 
    siret, revenue, tva_rate, has_tva, article_imposition, matricule_fiscale, registre_commerce,
    nom_contact, tel_fixe, tel_mobile, fax, fiscal_id, commerce_registry, tax_article, nis
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

const clientsData = [
  [
    'CLT-001', 'TechNova Solutions Ltd', 'local', 'very_good', 'contact@technova.demo', '+1 555-0199', '100 Innovation Way, Suite 400, Tech Park',
    '80012345600012', 450000.0, 19.0, 1, 'ART-100234', 'MF-8923412', 'RC-998234B',
    'Sarah Jenkins (CTO)', '+1 555-0101', '+1 555-0102', '+1 555-0103', 'FISC-892341', 'REG-998234', 'ART-100234', 'NIS-0098234'
  ],
  [
    'CLT-002', 'Horizon Dynamics International', 'foreign', 'good', 'procurement@horizondynamics.demo', '+44 20 7946 0912', '45 London Wall, London, EC2M 5TE',
    'GB992384912', 820000.0, 0.0, 0, 'ART-883492', 'MF-GB992384', 'RC-UK489201',
    'David Miller (Procurement)', '+44 20 7946 0910', '+44 77 0090 0145', '', 'GB-TAX-99238', 'RC-UK489201', 'ART-883492', 'NIS-UK9923'
  ],
  [
    'CLT-003', 'Apex Logistics & Freight', 'local', 'recurring', 'finance@apexlogistics.demo', '+1 555-0188', '742 Evergreen Terrace, Industrial Zone',
    '50098765400034', 195000.0, 19.0, 1, 'ART-409123', 'MF-4091238', 'RC-203948A',
    'Michael Scott (Operations)', '+1 555-0177', '+1 555-0178', '+1 555-0179', 'FISC-409123', 'REG-203948', 'ART-409123', 'NIS-0040912'
  ],
  [
    'CLT-004', 'Nexus Cloud Systems', 'local', 'new', 'billing@nexuscloud.demo', '+1 555-0144', '12 Silicon Blvd, Cyber City',
    '60034567800056', 95000.0, 19.0, 1, 'ART-772391', 'MF-7723910', 'RC-661293C',
    'Elena Rostova (VP Finance)', '+1 555-0133', '+1 555-0134', '', 'FISC-772391', 'REG-661293', 'ART-772391', 'NIS-0077239'
  ]
];

const clientIds: number[] = [];
for (const c of clientsData) {
  const res = insertClient.run(...c);
  clientIds.push(res.lastInsertRowid as number);
}
console.log(`✓ Seeded ${clientIds.length} mock clients.`);

// 2. Insert Mock Quotes
const insertQuote = db.prepare(`
  INSERT INTO quotes (
    quote_number, date, client_id, total_amount, subtotal, status, project_name, affair_number, service_prestation, observations, tva_rate
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertQuoteLine = db.prepare(`
  INSERT INTO quote_lines (
    quote_id, item_number, description, quantity, unit, unit_price, total_price
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const q1 = insertQuote.run(
  'DEV-2026-001', '2026-03-01', clientIds[0], 14280.00, 12000.00, 'accepted',
  'Enterprise Cloud Infrastructure Migration', 'AFF-2026-101', 'Cloud Consulting & Architecture',
  'Includes 30 days post-migration SLA support.', 19.0
);
const q1Id = q1.lastInsertRowid as number;

insertQuoteLine.run(q1Id, 1, 'Cloud Architecture Assessment & Planning', 1, 'Forfait', 4000.00, 4000.00);
insertQuoteLine.run(q1Id, 2, 'Kubernetes Cluster Deployment & CI/CD Pipeline', 2, 'Semaines', 3500.00, 7000.00);
insertQuoteLine.run(q1Id, 3, 'Security Audit & Compliance Hardening', 1, 'Forfait', 1000.00, 1000.00);

console.log('✓ Seeded mock quotes with line items.');

// 3. Insert Mock Invoices (Definitive & Proforma)
const insertInvoice = db.prepare(`
  INSERT INTO invoices (
    number, date, type, client_id, amount, subtotal, status, payment_method, 
    project_name, affair_number, service_prestation, tva_rate, company_entity
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertInvoiceLine = db.prepare(`
  INSERT INTO invoice_lines (
    invoice_id, item_number, description, quantity, unit, unit_price, total_price
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Invoice 1: Paid Definitive
const inv1 = insertInvoice.run(
  'FAC-2026-001', '2026-03-10', 'definitive', clientIds[0], 14280.00, 12000.00, 'paid', 'Virement Bancaire',
  'Enterprise Cloud Infrastructure Migration', 'AFF-2026-101', 'Cloud Consulting & Architecture', 19.0, 'principal'
);
const inv1Id = inv1.lastInsertRowid as number;
insertInvoiceLine.run(inv1Id, 1, 'Cloud Architecture Assessment & Planning', 1, 'Forfait', 4000.00, 4000.00);
insertInvoiceLine.run(inv1Id, 2, 'Kubernetes Cluster Deployment & CI/CD Pipeline', 2, 'Semaines', 3500.00, 7000.00);
insertInvoiceLine.run(inv1Id, 3, 'Security Audit & Compliance Hardening', 1, 'Forfait', 1000.00, 1000.00);

// Invoice 2: Pending Definitive
const inv2 = insertInvoice.run(
  'FAC-2026-002', '2026-03-15', 'definitive', clientIds[2], 5950.00, 5000.00, 'pending', 'Chèque',
  'Logistics Fleet Tracking Software Module', 'AFF-2026-105', 'Custom Software Engineering', 19.0, 'principal'
);
const inv2Id = inv2.lastInsertRowid as number;
insertInvoiceLine.run(inv2Id, 1, 'GPS Fleet Telemetry API Integration', 1, 'Forfait', 3000.00, 3000.00);
insertInvoiceLine.run(inv2Id, 2, 'Realtime Driver Dashboard & Dispatching UI', 1, 'Forfait', 2000.00, 2000.00);

// Invoice 3: Proforma
const inv3 = insertInvoice.run(
  'PRO-2026-001', '2026-03-20', 'proforma', clientIds[3], 8925.00, 7500.00, 'pending', 'Virement Bancaire',
  'Data Pipeline & Automated Reporting Suite', 'AFF-2026-109', 'Data Engineering', 19.0, 'principal'
);
const inv3Id = inv3.lastInsertRowid as number;
insertInvoiceLine.run(inv3Id, 1, 'ETL Pipeline Setup & Database Optimization', 1, 'Forfait', 4500.00, 4500.00);
insertInvoiceLine.run(inv3Id, 2, 'Executive BI Analytics Dashboard', 1, 'Forfait', 3000.00, 3000.00);

console.log('✓ Seeded mock invoices with line items.');
console.log('🚀 Seeding complete! Login with: admin / admin123 or commercial / commercial123');
