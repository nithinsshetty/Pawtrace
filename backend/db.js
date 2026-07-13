const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'nith',
  database: process.env.DB_NAME || 'pawtrace',
  port: parseInt(process.env.DB_PORT || '3306')
};

let pool;

async function initDB() {
  try {
    // 1. Try to connect to MySQL without specifying database first (to create database if not exists)
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    console.log(`Connecting to MySQL at ${dbConfig.host}:${dbConfig.port}...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await connection.end();

    // 2. Initialize connection pool with database selected
    pool = mysql.createPool(dbConfig);
    console.log(`MySQL Pool initialized on database "${dbConfig.database}".`);

    // 3. Verify tables and run schema.sql if empty
    const [tables] = await pool.query('SHOW TABLES');
    if (tables.length === 0) {
      console.log('Database tables not found. Initializing schema from schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Remove single-line comments and split by semicolon
        const cleanSql = schemaSql.replace(/--.*$/gm, '');
        const queries = cleanSql
          .split(';')
          .map(q => q.trim())
          .filter(q => q.length > 0);

        for (const query of queries) {
          if (query.toUpperCase().startsWith('USE ')) continue; // database is handled by the pool
          await pool.query(query);
        }
        console.log('Database schema successfully initialized.');
      } else {
        console.warn('schema.sql file not found in backend directory. Skipping initialization.');
      }
    } else {
      console.log(`Database tables verified: found ${tables.length} tables.`);
    }
  } catch (err) {
    console.error('Database connection / initialization failed:', err.message);
    // Throw error so server crashes immediately, alerting us to issues during startup
    throw err;
  }
}

module.exports = {
  initDB,
  query: async (sql, params) => {
    if (!pool) {
      throw new Error('Database pool not initialized. Check server startup logs.');
    }
    const [results] = await pool.execute(sql, params);
    return results;
  },
  getPool: () => pool
};
