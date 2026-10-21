require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

// (1) Credenciais e token vêm do ambiente (.env), nunca do código
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, API_TOKEN } = process.env;
if (!DB_PASSWORD || !API_TOKEN) {
  console.error('Defina DB_PASSWORD e API_TOKEN no arquivo .env');
  process.exit(1);
}

const pool = new Pool({
  host: DB_HOST || 'localhost',
  user: DB_USER || 'postgres',
  password: DB_PASSWORD,
  database: DB_NAME || 'tarefas_treino',
  port: Number(DB_PORT) || 5432,
});

const app = express();

// (6) Cabeçalhos de segurança, limite de tamanho do body e rate limit
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 })); 

// (5) Autenticação simples por Bearer token
function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(token);
  const b = Buffer.from(API_TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
}

// Valida que o id é um inteiro positivo
function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ erro: 'id inválido' });
  }
  req.id = id;
  next();
}

// (2) Loga o erro real no servidor e devolve mensagem genérica ao cliente
function erroInterno(res, error) {
  console.error(error);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
}

app.get('/tarefas', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM tarefas ORDER BY id');
    res.json(resultado.rows);
  } catch (error) {
    erroInterno(res, error);
  }
});

app.get('/tarefas/buscar', async (req, res) => {
  const { termo } = req.query;

  if (typeof termo !== 'string' || termo.trim() === '' || termo.length > 100) {
    return res.status(400).json({ erro: 'termo inválido' });
  }

  try {
    // (3) Consulta parametrizada: o termo nunca vira código SQL
    const resultado = await pool.query(
      'SELECT * FROM tarefas WHERE titulo ILIKE $1 ORDER BY id',
      [`%${termo.trim()}%`]
    );
    res.json(resultado.rows);
  } catch (error) {
    erroInterno(res, error);
  }
});

app.post('/tarefas', autenticar, async (req, res) => {
  const { titulo } = req.body;

  // (4) Validação da entrada
  if (typeof titulo !== 'string' || titulo.trim() === '' || titulo.length > 200) {
    return res.status(400).json({ erro: 'titulo deve ser texto de 1 a 200 caracteres' });
  }

  try {
    const resultado = await pool.query(
      'INSERT INTO tarefas (titulo, concluida) VALUES ($1, false) RETURNING *',
      [titulo.trim()]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    erroInterno(res, error);
  }
});

app.put('/tarefas/:id', autenticar, validarId, async (req, res) => {
  try {
    const resultado = await pool.query(
      'UPDATE tarefas SET concluida = true WHERE id = $1 RETURNING *',
      [req.id]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Tarefa não encontrada' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    erroInterno(res, error);
  }
});

app.delete('/tarefas/:id', autenticar, validarId, async (req, res) => {
  try {
    const resultado = await pool.query('DELETE FROM tarefas WHERE id = $1', [req.id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Tarefa não encontrada' });
    }
    res.status(204).send();
  } catch (error) {
    erroInterno(res, error);
  }
});

// (6) Escuta só em localhost; em produção, coloque atrás de um proxy com HTTPS
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`API de tarefas (TREINO) rodando em http://127.0.0.1:${PORT}`);
});