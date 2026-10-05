import dotenv from 'dotenv';
import { initializeDatabase, connectDatabase } from '../config/database';

dotenv.config();

const run = (): void => {
  try {
    console.log('🛠️ Bootstrapping BillFlow database...');
    initializeDatabase();

    console.log('🔍 Verifying application credentials...');
    connectDatabase();

    console.log('🎉 Database bootstrap completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database bootstrap failed:', error);
    process.exit(1);
  }
};

run();
