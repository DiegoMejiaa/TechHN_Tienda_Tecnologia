import sql from 'mssql';
import { readFileSync } from 'fs';

// Leer .env.local manualmente
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
);

console.log('Credenciales leidas:');
console.log('  SERVER:', env.DB_SERVER);
console.log('  DB:    ', env.DB_NAME);
console.log('  USER:  ', env.DB_USER);
console.log('  PASS:  ', env.DB_PASSWORD);

const config = {
  server: env.DB_SERVER,
  port: parseInt(env.DB_PORT || '1433'),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

try {
  console.log('\nConectando...');
  const pool = await sql.connect(config);
  const result = await pool.request().query('SELECT 1 AS ok');
  console.log('Conexion exitosa:', result.recordset);
  await pool.close();
} catch (err) {
  console.error('Error de conexion:', err.message);
}
