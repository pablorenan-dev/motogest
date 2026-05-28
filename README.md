# 🏍️ MotoGest

Sistema de gestão para pequenas e médias oficinas de motos.

> Projeto acadêmico — Laboratório de Empreendedorismo e Práticas Comunitárias | UNISC 2026

---

## 📁 Estrutura do Projeto

```
motogest/
├── frontend/   # Aplicação React
└── backend/    # API Node.js + Express
```

---

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 18+
- npm

### Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env` na pasta `backend/` com as variáveis:

```env
DB_HOST=seu_host
DB_PORT=5432
DB_USER=seu_user
DB_PASSWORD=sua_senha
DB_NAME=postgres
PORT=3001
```

Rode o servidor:

```bash
npm run dev
```

A API estará disponível em `http://localhost:3001`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📡 Documentação da API

Base URL: `http://localhost:3001/api`

---

### 🔐 Autenticação

#### `POST /auth/cadastro`

Cria um novo usuário vinculado a uma organização.

**Body:**
```json
{
  "nomeUsuario": "Pablo",
  "emailUsuario": "pablo@motogest.com",
  "senhaUsuario": "123456",
  "idOrganizacao": "uuid-da-organizacao"
}
```

**Resposta `201`:**
```json
{
  "message": "Usuário cadastrado com sucesso.",
  "usuario": {
    "idUsuario": "uuid-gerado",
    "nomeUsuario": "Pablo",
    "emailUsuario": "pablo@motogest.com",
    "idOrganizacao": "uuid-da-organizacao"
  }
}
```

| Status | Motivo |
|--------|--------|
| `201` | Usuário criado com sucesso |
| `400` | Campo obrigatório faltando |
| `409` | Email já cadastrado |
| `500` | Erro interno |

---

#### `POST /auth/login`

Autentica um usuário com email e senha.

**Body:**
```json
{
  "emailUsuario": "pablo@motogest.com",
  "senhaUsuario": "123456"
}
```

**Resposta `200`:**
```json
{
  "message": "Login realizado com sucesso.",
  "usuario": {
    "idUsuario": "uuid-do-usuario",
    "nomeUsuario": "Pablo",
    "emailUsuario": "pablo@motogest.com",
    "idOrganizacao": "uuid-da-organizacao"
  }
}
```

> ⚠️ Guarda o `idOrganizacao` retornado — ele é necessário para todas as chamadas de produtos.

| Status | Motivo |
|--------|--------|
| `200` | Login realizado com sucesso |
| `400` | Email ou senha não enviados |
| `401` | Credenciais inválidas |
| `500` | Erro interno |

---

### 📦 Produtos

#### `GET /produtos/:idOrganizacao`

Retorna todos os produtos do estoque de uma organização, ordenados por nome.

**Exemplo de chamada:**
```
GET http://localhost:3001/api/produtos/uuid-da-organizacao
```

**Resposta `200`:**
```json
[
  {
    "idProduto": "uuid-do-produto",
    "nomeProduto": "Filtro de Óleo",
    "descricaoProduto": "Filtro para Honda CG 160",
    "precoProduto": "25.90",
    "quantidadeProduto": 3,
    "quantidadeMinimaProduto": 5,
    "criticoProduto": true,
    "idOrganizacao": "uuid-da-organizacao"
  }
]
```

> ℹ️ `criticoProduto` é calculado automaticamente — será `true` quando `quantidadeProduto <= quantidadeMinimaProduto`.

---

### 💻 Exemplos no React

**Login:**
```js
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailUsuario, senhaUsuario })
});
const data = await response.json();
```

**Listar produtos:**
```js
const response = await fetch(`http://localhost:3001/api/produtos/${idOrganizacao}`);
const data = await response.json();
```

**Cadastro:**
```js
const response = await fetch('http://localhost:3001/api/auth/cadastro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nomeUsuario, emailUsuario, senhaUsuario, idOrganizacao })
});
const data = await response.json();
```

---

## 👥 Equipe

| Integrante | Responsabilidade |
|-----------|-----------------|
| Pablo | Backend, estrutura e integração |
| João Kaspary | Frontend — telas principais |
| Gabriel | Frontend — cadastros e formulários |
| Leonardo | Estilização e componentes |

---

## 🏫 Sobre o Projeto

Desenvolvido como parte do módulo de Laboratório de Empreendedorismo e Práticas Comunitárias (LEPC), ministrado pelo Prof. Kurt Molz — Universidade de Santa Cruz do Sul (UNISC), 2026.
