import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: DB_HOST || 'localhost',
  user: DB_USER || 'postgres',
  password: DB_PASSWORD,
  database: DB_NAME || 'tarefas_treino',
  port: Number(DB_PORT) || 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

export const query = (text, params) => pool.query(text, params);