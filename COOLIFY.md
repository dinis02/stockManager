# Deploy no Coolify

Este projeto está preparado para correr como uma app única no Coolify:

- Angular compilado em produção
- Express/Node a servir o frontend e a API
- SQLite em ficheiro persistente

## Configuração recomendada

No Coolify, cria uma aplicação a partir do repositório e usa Dockerfile.

### Porta

```text
3000
```

### Variáveis de ambiente

```text
PORT=3000
DATA_DIR=/data
NODE_ENV=production
```

### Volume persistente

Cria um volume persistente:

```text
/data
```

A base de dados SQLite fica em:

```text
/data/data.db
```

## Notas

- Para demo, SQLite em ficheiro é suficiente.
- Para produção real com vários utilizadores/clientes, migrar depois para Supabase/Postgres.
- O frontend usa `/api` em produção, por isso funciona no domínio do Coolify sem depender de `localhost`.
