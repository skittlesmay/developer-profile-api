import { resolve } from 'node:path';
import { config } from 'dotenv';
import { getTestDatabaseUrl } from './test-database';

config({ path: resolve(__dirname, '../.env'), quiet: true });
process.env.DATABASE_URL = getTestDatabaseUrl(process.env);
