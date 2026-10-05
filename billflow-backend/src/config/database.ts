import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import BetterSqlite3 from 'better-sqlite3';

dotenv.config();

// Database file location - stored in protected data/ directory
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '../../data/billflow.sqlite');

// Ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database connection
export const db: BetterSqlite3.Database = BetterSqlite3(DB_FILE, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Enable foreign key constraints (CRITICAL for SQLite)
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Helper function to check if table exists
const tableExists = (tableName: string): boolean => {
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  return !!result;
};

// Helper function to check if column exists
const columnExists = (table: string, column: string): boolean => {
  try {
    const result = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return result.some(col => col.name === column);
  } catch {
    return false;
  }
};

// Helper function to check if trigger exists
const triggerExists = (triggerName: string): boolean => {
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='trigger' AND name=?"
  ).get(triggerName);
  return !!result;
};

const ensureDefaultUsers = (): void => {
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const commercialPassword = bcrypt.hashSync('commercial123', 10);

  const upsert = db.prepare(`
    INSERT INTO users (username, password_hash, name, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      password_hash = excluded.password_hash,
      name = excluded.name,
      role = excluded.role
  `);

  upsert.run('admin', adminPassword, 'Demo Administrator', 'admin');
  upsert.run('commercial', commercialPassword, 'Demo Commercial', 'commercial');

  console.info('👥 Ensured default demo users exist: admin / admin123 and commercial / commercial123');
};

export const connectDatabase = (): void => {
  try {
    // Test connection with a simple query
    const result = db.prepare('SELECT 1').get();
    console.log('✅ Database connected successfully');
    console.log(`📁 Database location: ${DB_FILE}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export const initializeDatabase = (): void => {
  try {
    console.log('🔧 Initializing database schema...');

    // Create users table
    if (!tableExists('users')) {
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'commercial')),
          current_session_token TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('✓ Created users table');
    } else {
      // Add current_session_token if it doesn't exist
      if (!columnExists('users', 'current_session_token')) {
        db.exec('ALTER TABLE users ADD COLUMN current_session_token TEXT');
        console.log('✓ Added current_session_token to users table');
      }
    }

    // Create trigger for users.updated_at
    if (!triggerExists('users_updated_at')) {
      db.exec(`
        CREATE TRIGGER users_updated_at
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
          UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }

    // Create clients table
    if (!tableExists('clients')) {
      db.exec(`
        CREATE TABLE clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('local', 'foreign')),
          classification TEXT NOT NULL CHECK(classification IN ('new', 'recurring', 'good', 'very_good')),
          email TEXT,
          phone TEXT,
          address TEXT,
          siret TEXT,
          revenue REAL DEFAULT 0,
          tva_rate REAL DEFAULT 19.00,
          has_tva INTEGER DEFAULT 1,
          article_imposition TEXT,
          matricule_fiscale TEXT,
          registre_commerce TEXT,
          nom_contact TEXT,
          tel_fixe TEXT,
          tel_mobile TEXT,
          fax TEXT,
          fiscal_id TEXT,
          commerce_registry TEXT,
          tax_article TEXT,
          nis TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('✓ Created clients table');
    }

    // Migration: Add nis column to clients if it doesn't exist
    if (tableExists('clients') && !columnExists('clients', 'nis')) {
      db.exec('ALTER TABLE clients ADD COLUMN nis TEXT');
      console.log('✓ Migrated clients table: added nis column');
    }

    // Create trigger for clients.updated_at
    if (!triggerExists('clients_updated_at')) {
      db.exec(`
        CREATE TRIGGER clients_updated_at
        AFTER UPDATE ON clients
        FOR EACH ROW
        BEGIN
          UPDATE clients SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }

    // Create invoices table
    if (!tableExists('invoices')) {
      db.exec(`
        CREATE TABLE invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          number TEXT NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('proforma', 'definitive', 'credit_note')),
          client_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          subtotal REAL NOT NULL DEFAULT 0,
          advance_amount REAL,
          timbre_amount REAL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('paid', 'pending', 'overdue', 'cancelled')),
          payment_method TEXT,
          project_name TEXT,
          affair_number TEXT,
          service_prestation TEXT,
          billing_period TEXT,
          contract_ref TEXT,
          order_ref TEXT,
          observations TEXT,
          tva_rate REAL,
          ref_contract_n TEXT,
          ref_convention TEXT,
          tx_retenue_garantie REAL,
          tx_remise_percent REAL,
          montant_remise REAL,
          advance_percentage REAL,
          company_entity TEXT DEFAULT 'principal',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
          UNIQUE (number, type)
        )
      `);
      console.log('✓ Created invoices table');
    }

    // Migration: Add company_entity column if it doesn't exist
    if (tableExists('invoices') && !columnExists('invoices', 'company_entity')) {
      db.exec("ALTER TABLE invoices ADD COLUMN company_entity TEXT DEFAULT 'principal'");
      console.log('✓ Migrated invoices table: added company_entity column');
    }

    // Migration: Add advance_percentage column if it doesn't exist
    if (tableExists('invoices') && !columnExists('invoices', 'advance_percentage')) {
      db.exec('ALTER TABLE invoices ADD COLUMN advance_percentage REAL');
      console.log('✓ Migrated invoices table: added advance_percentage column');
    }

    // Migration: Add subtotal column if it doesn't exist
    if (tableExists('invoices') && !columnExists('invoices', 'subtotal')) {
      db.exec('ALTER TABLE invoices ADD COLUMN subtotal REAL NOT NULL DEFAULT 0');
      // Backfill subtotal
      db.exec('UPDATE invoices SET subtotal = (SELECT COALESCE(SUM(total_price), 0) FROM invoice_lines WHERE invoice_id = invoices.id)');
      console.log('✓ Migrated invoices table: added subtotal column and backfilled data');
    }

    // Create trigger for invoices.updated_at
    if (!triggerExists('invoices_updated_at')) {
      db.exec(`
        CREATE TRIGGER invoices_updated_at
        AFTER UPDATE ON invoices
        FOR EACH ROW
        BEGIN
          UPDATE invoices SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }

    // Create invoice_lines table
    if (!tableExists('invoice_lines')) {
      db.exec(`
        CREATE TABLE invoice_lines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          item_type TEXT NOT NULL DEFAULT 'text_with_quantity' CHECK(item_type IN ('text', 'text_with_quantity', 'amount')),
          description TEXT NOT NULL,
          quantity REAL DEFAULT 0,
          unit TEXT DEFAULT '',
          unit_price REAL DEFAULT 0,
          amount REAL DEFAULT 0,
          total_price REAL NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created invoice_lines table');
    }

    // Create payments table
    if (!tableExists('payments')) {
      db.exec(`
        CREATE TABLE payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          method TEXT NOT NULL CHECK(method IN ('cash', 'bank_transfer', 'check', 'card', 'other')),
          reference TEXT,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created payments table');
    }

    // Create trigger for payments.updated_at
    if (!triggerExists('payments_updated_at')) {
      db.exec(`
        CREATE TRIGGER payments_updated_at
        AFTER UPDATE ON payments
        FOR EACH ROW
        BEGIN
          UPDATE payments SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }

    // Create quotes table
    if (!tableExists('quotes')) {
      db.exec(`
        CREATE TABLE quotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference TEXT NOT NULL,
          client_id INTEGER,
          date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
          validity_days INTEGER DEFAULT 30,
          terms TEXT,
          manual_client_mode INTEGER DEFAULT 0,
          manual_client_name TEXT,
          manual_client_email TEXT,
          manual_client_contact TEXT,
          manual_client_phone TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created quotes table');
    }

    // Create trigger for quotes.updated_at
    if (!triggerExists('quotes_updated_at')) {
      db.exec(`
        CREATE TRIGGER quotes_updated_at
        AFTER UPDATE ON quotes
        FOR EACH ROW
        BEGIN
          UPDATE quotes SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }

    // Create quote_items table
    if (!tableExists('quote_items')) {
      db.exec(`
        CREATE TABLE quote_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quote_id INTEGER NOT NULL,
          item_type TEXT NOT NULL CHECK(item_type IN ('main', 'sub')),
          display_type TEXT NOT NULL DEFAULT 'quantity' CHECK(display_type IN ('text', 'quantity')),
          item_number TEXT NOT NULL,
          designation TEXT NOT NULL,
          unit TEXT,
          unit_price REAL,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created quote_items table');
    }

    // Migration: Add display_type column to quote_items if it doesn't exist
    // NOTE: SQLite does not support CHECK constraints in ALTER TABLE, so we omit it here.
    const columns = db.prepare("PRAGMA table_info(quote_items)").all() as any[];
    const hasDisplayType = columns.some((col: any) => col.name === 'display_type');
    if (!hasDisplayType && tableExists('quote_items')) {
      try {
        db.exec(`ALTER TABLE quote_items ADD COLUMN display_type TEXT DEFAULT 'quantity'`);
        console.log('✓ Migrated quote_items table: added display_type column');
      } catch (migrationError) {
        console.warn('⚠️ Could not add display_type column (may already exist):', migrationError);
      }
    }

    // Migration: Add manual_client_* columns to quotes table if they don't exist
    if (tableExists('quotes')) {
      if (!columnExists('quotes', 'manual_client_mode')) {
        db.exec('ALTER TABLE quotes ADD COLUMN manual_client_mode INTEGER DEFAULT 0');
        console.log('✓ Migrated quotes table: added manual_client_mode column');
      }
      if (!columnExists('quotes', 'manual_client_name')) {
        db.exec('ALTER TABLE quotes ADD COLUMN manual_client_name TEXT');
        console.log('✓ Migrated quotes table: added manual_client_name column');
      }
      if (!columnExists('quotes', 'manual_client_email')) {
        db.exec('ALTER TABLE quotes ADD COLUMN manual_client_email TEXT');
        console.log('✓ Migrated quotes table: added manual_client_email column');
      }
      if (!columnExists('quotes', 'manual_client_contact')) {
        db.exec('ALTER TABLE quotes ADD COLUMN manual_client_contact TEXT');
        console.log('✓ Migrated quotes table: added manual_client_contact column');
      }
      if (!columnExists('quotes', 'manual_client_phone')) {
        db.exec('ALTER TABLE quotes ADD COLUMN manual_client_phone TEXT');
        console.log('✓ Migrated quotes table: added manual_client_phone column');
      }

      // Migration: Remove NOT NULL constraint on client_id if it exists
      const quoteColumns = db.prepare("PRAGMA table_info(quotes)").all() as any[];
      const clientIdCol = quoteColumns.find(col => col.name === 'client_id');
      if (clientIdCol && clientIdCol.notnull === 1) {
        console.log('🔧 Migrating quotes table: removing NOT NULL constraint on client_id...');
        db.pragma('foreign_keys = OFF');
        try {
          db.transaction(() => {
            db.exec('ALTER TABLE quotes RENAME TO quotes_old');
            db.exec(`
              CREATE TABLE quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reference TEXT NOT NULL,
                client_id INTEGER,
                date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
                validity_days INTEGER DEFAULT 30,
                terms TEXT,
                manual_client_mode INTEGER DEFAULT 0,
                manual_client_name TEXT,
                manual_client_email TEXT,
                manual_client_contact TEXT,
                manual_client_phone TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
              )
            `);
            db.exec(`
              INSERT INTO quotes (
                id, reference, client_id, date, status, validity_days, terms,
                manual_client_mode, manual_client_name, manual_client_email,
                manual_client_contact, manual_client_phone, created_at, updated_at
              )
              SELECT 
                id, reference, client_id, date, status, validity_days, terms,
                manual_client_mode, manual_client_name, manual_client_email,
                manual_client_contact, manual_client_phone, created_at, updated_at
              FROM quotes_old
            `);
            db.exec('DROP TABLE quotes_old');
            
            // Recreate trigger for updated_at since it was dropped with the old table
            db.exec(`
              CREATE TRIGGER IF NOT EXISTS quotes_updated_at
              AFTER UPDATE ON quotes
              FOR EACH ROW
              BEGIN
                UPDATE quotes SET updated_at = datetime('now') WHERE id = NEW.id;
              END
            `);
          })();
          console.log('✓ Migrated quotes table: removed NOT NULL from client_id successfully');
        } catch (e) {
          console.error('❌ Failed to migrate quotes table (NOT NULL removal):', e);
          try {
            if (!tableExists('quotes_old')) throw new Error('No old table');
            db.exec('DROP TABLE IF EXISTS quotes');
            db.exec('ALTER TABLE quotes_old RENAME TO quotes');
          } catch (rollbackErr) {
             // Avoid crashing the whole init if rollback fails completely
          }
        } finally {
          db.pragma('foreign_keys = ON');
        }
      }
    }

    // Migration: Fix broken foreign key in quote_items (pointing to quotes_old)
    if (tableExists('quote_items')) {
      const fks = db.prepare("PRAGMA foreign_key_list(quote_items)").all() as any[];
      const pointsToOld = fks.some((fk: any) => fk.table === 'quotes_old');
      
      if (pointsToOld) {
        console.log('🔧 Repairing quote_items table: fixing broken foreign key reference...');
        db.pragma('foreign_keys = OFF');
        try {
          db.transaction(() => {
            const data = db.prepare('SELECT * FROM quote_items').all() as any[];
            db.exec('DROP TABLE quote_items');
            db.exec(`
              CREATE TABLE quote_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_id INTEGER NOT NULL,
                item_type TEXT NOT NULL CHECK(item_type IN ('main', 'sub')),
                display_type TEXT NOT NULL DEFAULT 'quantity' CHECK(display_type IN ('text', 'quantity')),
                item_number TEXT NOT NULL,
                designation TEXT NOT NULL,
                unit TEXT,
                unit_price REAL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
              )
            `);
            
            if (data.length > 0) {
              const insert = db.prepare(`
                INSERT INTO quote_items (
                  id, quote_id, item_type, display_type, item_number, designation,
                  unit, unit_price, display_order, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              for (const item of data) {
                insert.run(
                  item.id, item.quote_id, item.item_type, item.display_type, 
                  item.item_number, item.designation, item.unit, 
                  item.unit_price, item.display_order, item.created_at
                );
              }
            }
          })();
          console.log('✓ Repaired quote_items table successfully');
        } catch (repairError) {
          console.error('❌ Failed to repair quote_items table:', repairError);
        } finally {
          db.pragma('foreign_keys = ON');
        }
      }
    }


    // Create delivery_notes table
    if (!tableExists('delivery_notes')) {
      db.exec(`
        CREATE TABLE delivery_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          number TEXT UNIQUE NOT NULL,
          date TEXT NOT NULL,
          client_id INTEGER NOT NULL,
          designation TEXT NOT NULL,
          observations TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created delivery_notes table');
    }

    // Create trigger for delivery_notes.updated_at
    if (!triggerExists('delivery_notes_updated_at')) {
      db.exec(`
        CREATE TRIGGER delivery_notes_updated_at
        AFTER UPDATE ON delivery_notes
        FOR EACH ROW
        BEGIN
          UPDATE delivery_notes SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }

    // Create document_templates table
    if (!tableExists('document_templates')) {
      db.exec(`
        CREATE TABLE document_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('invoice', 'quote', 'delivery_note')),
          is_default INTEGER DEFAULT 0,
          template_config TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('✓ Created document_templates table');
    }

    // Create trigger for document_templates.updated_at
    if (!triggerExists('document_templates_updated_at')) {
      db.exec(`
        CREATE TRIGGER document_templates_updated_at
        AFTER UPDATE ON document_templates
        FOR EACH ROW
        BEGIN
          UPDATE document_templates SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }

    // Create invoice_counters table
    if (!tableExists('invoice_counters')) {
      db.exec(`
        CREATE TABLE invoice_counters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('proforma', 'definitive', 'credit_note')),
          counter INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE (year, type)
        )
      `);
      console.log('✓ Created invoice_counters table');
    }

    // Create trigger for invoice_counters.updated_at
    if (!triggerExists('invoice_counters_updated_at')) {
      db.exec(`
        CREATE TRIGGER invoice_counters_updated_at
        AFTER UPDATE ON invoice_counters
        FOR EACH ROW
        BEGIN
          UPDATE invoice_counters SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);
    }

    // Sync invoice counters with actual maximum existing numbers in the database
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);
    for (const invType of ['definitive', 'proforma', 'credit_note']) {
      const invs = db.prepare(`
        SELECT number FROM invoices
        WHERE type = ? AND substr(number, -2) = ?
      `).all(invType, yearSuffix) as Array<{ number: string }>;
      
      let maxNum = 0;
      for (const inv of invs) {
        if (!inv.number) continue;
        const n = parseInt(inv.number.split('/')[0], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
      
      db.prepare(`
        INSERT INTO invoice_counters (year, type, counter)
        VALUES (?, ?, ?)
        ON CONFLICT(year, type) DO UPDATE SET counter = excluded.counter
      `).run(currentYear, invType, maxNum);
    }

    // Add sample client data - COMMENTED OUT TO PREVENT RE-SEEDING
    const insertClient = db.prepare(`
      INSERT OR IGNORE INTO clients (
        code, name, type, classification, fiscal_id, commerce_registry,
        tax_article, address, tva_rate, email, phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    /*
    insertClient.run(
      'CLI001', 'PIPELINE OIL GAZ', 'local', 'good', '001516101020596',
      '16/00-1010205B15', '16281813021', 'Villa N°20, Rue Parmentier, Hydra, Alger',
      19.00, 'contact@pipelineoilgaz.dz', '+213 21 XX XX XX'
    );

    insertClient.run(
      'CLI002', 'SONATRACH', 'local', 'very_good', '001516101020597',
      '16/00-1010205B16', '16281813022', 'Tour Sonatrach, Alger',
      19.00, 'contact@sonatrach.dz', '+213 21 XX XX XX'
    );
    */

    // Always recalculate subtotals from lines to ensure consistency
    {
      const allInvoices = db.prepare('SELECT id FROM invoices').all() as Array<{ id: number }>;
      for (const inv of allInvoices) {
        const lines = db.prepare('SELECT total_price, amount, quantity, unit_price FROM invoice_lines WHERE invoice_id = ?').all(inv.id) as Array<{ total_price: number; amount: number; quantity: number; unit_price: number }>;
        let ht = 0;
        for (const l of lines) {
          let t = l.total_price || 0;
          if (t === 0) t = l.amount || 0;
          if (t === 0) t = (l.quantity || 0) * (l.unit_price || 0);
          ht += t;
        }
        db.prepare('UPDATE invoices SET subtotal = ? WHERE id = ?').run(ht, inv.id);
      }
      console.log(`✓ Recalculated subtotals for ${allInvoices.length} invoices`);
    }

    // Ensure default users exist
    ensureDefaultUsers();

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Function to get next invoice number with gap detection
export const getNextInvoiceNumber = (type: string, consume: boolean = false): string => {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2);

  // Check the maximum existing invoice number in the database for this type & year
  const existingInvoices = db.prepare(`
    SELECT number FROM invoices
    WHERE type = ? AND substr(number, -2) = ?
  `).all(type, yearSuffix) as Array<{ number: string }>;

  let maxNumber = 0;
  for (const row of existingInvoices) {
    if (!row.number) continue;
    const numericPart = parseInt(row.number.split('/')[0], 10);
    if (!isNaN(numericPart) && numericPart > maxNumber) {
      maxNumber = numericPart;
    }
  }

  // Get current counter value
  const counterRow = db.prepare(`
    SELECT counter FROM invoice_counters
    WHERE year = ? AND type = ?
  `).get(currentYear, type) as { counter: number } | undefined;

  const lastUsed = Math.max(counterRow?.counter ?? 0, maxNumber);
  const nextNumber = lastUsed + 1;

  // Update the counter only if consume is true
  if (consume) {
    db.prepare(`
      INSERT INTO invoice_counters (year, type, counter)
      VALUES (?, ?, ?)
      ON CONFLICT(year, type) DO UPDATE SET counter = excluded.counter
    `).run(currentYear, type, nextNumber);
  }

  // Format: 001/26, 002/26, etc.
  const invoiceNumber = `${nextNumber.toString().padStart(3, '0')}/${yearSuffix}`;

  return invoiceNumber;
};

// Function to explicitly consume and update the counter for a given number
export const consumeInvoiceNumber = (type: string, invoiceNumber: string): void => {
  const currentYear = new Date().getFullYear();
  
  // Extract the numeric part (e.g. "005/26" -> 5)
  const numericPart = parseInt(invoiceNumber.split('/')[0], 10);
  if (isNaN(numericPart)) return;

  // Update the counter to be at least the numeric part
  db.prepare(`
    INSERT INTO invoice_counters (year, type, counter)
    VALUES (?, ?, ?)
    ON CONFLICT(year, type) DO UPDATE SET counter = MAX(counter, excluded.counter)
  `).run(currentYear, type, numericPart);
};

// Graceful shutdown
process.on('exit', () => {
  db.close();
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
