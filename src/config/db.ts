import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Production-ready Pool Configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  
  // SENIOR ENGINEER FIX: SSL is required for Render/Cloud DBs
  ssl: {
    rejectUnauthorized: false, // Required for Render/Heroku hosted DBs
  },

  // Connection Pool Settings
  max: 20,              
  idleTimeoutMillis: 30000,
  
  // SENIOR ENGINEER FIX: Increase timeout. 
  // 2000ms (2s) is too short for a connection from India to Singapore (Render region)
  connectionTimeoutMillis: 10000, // Set to 10 seconds
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;