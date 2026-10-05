import fs from 'fs';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const MYSQL_DUMP_PATH = path.join(__dirname, '../../data/billflow_db.sql');
const SQLITE_DB_PATH = process.env.DB_FILE || path.join(__dirname, '../../data/billflow.sqlite');

// Tables in dependency order (for deletion)
// We delete child tables first, then parents
const TABLES_TO_CLEAR = [
    'payments',
    'invoice_lines',
    'delivery_notes',
    'invoices',
    'quote_items',
    'quotes',
    'users',
    'clients',
    'invoice_counters',
    'document_templates'
];

interface InsertStatement {
    table: string;
    columns: string[];
    values: any[][];
}

const parseMysqlDump = (sqlContent: string): InsertStatement[] => {
    const statements: InsertStatement[] = [];
    const lines = sqlContent.split('\n');
    let currentStatement = '';
    let isBuildingStatement = false;

    // Regex to match INSERT INTO `table` (`col1`, `col2`) VALUES
    // We handle valid SQL dump format where values might span multiple lines

    // Simple parser: iterate through content, find "INSERT INTO", check for semicolon
    // Since the dump uses one INSERT per table usually, or multiple

    // We'll iterate through the whole content to find full statements ending in ;
    // But reading line by line is safer for memory, though basic split is fine for 35KB

    // Better approach: regex for the whole file or chunking
    // The dump format is: INSERT INTO `table` (...) VALUES \n (row1),\n (row2);

    const insertRegex = /INSERT INTO `([^`]+)` \(([^)]+)\) VALUES\s*([\s\S]+?);/g;

    let match;
    while ((match = insertRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const columnsStr = match[2];
        const valuesStr = match[3];

        const columns = columnsStr.split(',').map(c => c.trim().replace(/`/g, ''));

        // Parse values: (val1, val2), (val3, val4)
        // This is tricky because strings can contain commas and parentheses
        // We'll use a rudimentary parser matching top-level parens

        const rows: any[][] = [];
        let currentRow: any[] = [];
        let currentVal = '';
        let inString = false;
        let inParen = 0; // nesting level of row parens: ( ... )

        // Remove newlines and extra spaces from values string for easier parsing? 
        // No, strings might have newlines.

        // We scan valuesStr char by char
        for (let i = 0; i < valuesStr.length; i++) {
            const char = valuesStr[i];

            if (inString) {
                if (char === "'" && valuesStr[i - 1] !== '\\') { // Crude check for escaped quotes
                    inString = false;
                }
                currentVal += char;
            } else {
                if (char === "'") {
                    inString = true;
                    currentVal += char;
                } else if (char === '(') {
                    if (inParen === 0) {
                        // Start of a row
                        currentRow = [];
                    } else {
                        currentVal += char;
                    }
                    inParen++;
                } else if (char === ')') {
                    inParen--;
                    if (inParen === 0) {
                        // End of a row
                        // Push last value
                        if (currentVal.trim() !== '') {
                            currentRow.push(cleanValue(currentVal));
                        }
                        currentVal = '';
                        rows.push(currentRow);
                        currentRow = [];
                    } else {
                        currentVal += char;
                    }
                } else if (char === ',') {
                    if (inParen === 1) {
                        // Separator between values in a row
                        currentRow.push(cleanValue(currentVal));
                        currentVal = '';
                    } else if (inParen === 0) {
                        // Separator between rows (processed by ')' logic mostly, usually ignored)
                    } else {
                        currentVal += char;
                    }
                } else {
                    if (inParen > 0) currentVal += char;
                }
            }
        }

        statements.push({
            table: tableName,
            columns,
            values: rows
        });
    }

    return statements;
};

const cleanValue = (val: string): any => {
    val = val.trim();
    if (val.startsWith("'") && val.endsWith("'")) {
        // String: unquote and unescape
        val = val.substring(1, val.length - 1);
        val = val.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        return val;
    }
    if (val.toUpperCase() === 'NULL') return null;
    if (!isNaN(Number(val))) return Number(val);
    return val;
};

const migrate = () => {
    console.log('🔄 Starting data migration...');
    console.log(`📂 Reading MySQL dump: ${MYSQL_DUMP_PATH}`);
    console.log(`💾 Target SQLite DB: ${SQLITE_DB_PATH}`);

    if (!fs.existsSync(MYSQL_DUMP_PATH)) {
        console.error('❌ MySQL dump file not found!');
        process.exit(1);
    }

    const db = new BetterSqlite3(SQLITE_DB_PATH);

    try {
        const sqlContent = fs.readFileSync(MYSQL_DUMP_PATH, 'utf-8');
        const insertStatements = parseMysqlDump(sqlContent);

        if (insertStatements.length === 0) {
            console.error('❌ No INSERT statements found in dump.');
            process.exit(1);
        }

        console.log(`📝 Found data for ${insertStatements.length} tables.`);

        db.transaction(() => {
            // 1. Disable FKs
            db.pragma('foreign_keys = OFF');

            // 2. Clear tables
            console.log('🧹 Clearing existing data...');
            for (const table of TABLES_TO_CLEAR) {
                db.prepare(`DELETE FROM ${table}`).run();
            }

            // 3. Insert data
            console.log('📥 Importing data...');
            for (const stmt of insertStatements) {
                console.log(`   - Inserting ${stmt.values.length} rows into ${stmt.table}...`);

                const placeholders = stmt.columns.map(() => '?').join(',');
                const insertSql = `INSERT INTO ${stmt.table} (${stmt.columns.join(',')}) VALUES (${placeholders})`;
                const insert = db.prepare(insertSql);

                for (const row of stmt.values) {
                    // Match values to columns count (basic check)
                    if (row.length !== stmt.columns.length) {
                        console.warn(`⚠️ Row length mismatch in ${stmt.table}: expected ${stmt.columns.length}, got ${row.length}`);
                        // Pad with nulls or truncation if needed, but usually dump matches
                    }
                    insert.run(...row);
                }
            }

            // 4. Re-enable FKs
            db.pragma('foreign_keys = ON');
        })();

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
};

migrate();
