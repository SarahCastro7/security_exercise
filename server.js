const express = require('express');
const { Pool } = require ('pg');

const app = express();
app.use(express.json({ limit: '10kb' }));

app.get('/tarefas', async (req, res, next) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM tarefas ORDER BY id'
    );
    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/tarefas/buscar', async (req, res, next) => {
  try {
    const { termo } = req.query;

    if (typeof termo !== 'string' || termo.trim().length === 0) {
      return res.status(400).json({
        erro: 'Informe um termo de busca válido.',
      });
    }

    if (termo.length > 100) {
      return res.status(400).json({
        erro: 'O termo deve ter no máximo 100 caracteres.',
      });
    }

    const resultado = await pool.query(
      'SELECT * FROM tarefas WHERE titulo ILIKE $1 ORDER BY id',
      [termo]
    );

    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/tarefas', async (req, res, next) => {
  try {
    const { titulo } = req.body;

    if (
      typeof titulo !== 'string' ||
      titulo.trim().length === 0 ||
      titulo.trim().length > 200
    ) {
      return res.status(400).json({
        erro: 'O título deve ter entre 1 e 200 caracteres.',
      });
    }

    const resultado = await pool.query(
      'INSERT INTO tarefas (titulo, concluida) VALUES ($1, false) RETURNING *',
      [titulo]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.put('/tarefas/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validarId(id)) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const resultado = await pool.query(
      'UPDATE tarefas SET concluida = true WHERE id = $1 RETURNING *',
      [Number(id)]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    }

    res.json(resultado.rows[0]);
  } catch (error){}
});

app.delete('/tarefas/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validarId(id)) {
      return res.status(400).json({ erro: 'ID inválido.' });
    }

    const resultado = await pool.query(
      'DELETE FROM tarefas WHERE id = $1 RETURNING id',
      [Number(id)]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    }

    res.status(204).send();
    } catch (error) {
      next(error);
    }
});

app.use((error, req, res, next) => {
  console.error('Erro interno na API:', error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    erro: 'Ocorreu um erro interno. Tente novamente mais tarde.',
  });
});

app.listen(3000, () => {
console.log(`Servidor rodando em http://localhost:${PORT}`)
})

const PORT = Number(process.env.PORT || 3000);