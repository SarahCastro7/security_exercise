select * from tarefas
select * from usuarios

CREATE TABLE tarefas (
 id SERIAL PRIMARY KEY,
 titulo VARCHAR(255) NOT NULL,
 concluida BOOLEAN DEFAULT FALSE,
 criada_em TIMESTAMP DEFAULT NOW()
);

create table usuarios (
  id serial primary key,
  nome varchar(255) not null,
  email varchar(255) not null unique,
  senha varchar(255) not null
);