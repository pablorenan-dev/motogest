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

## ⚠️ Observações importantes

- As colunas no banco ficaram em **letras minúsculas** (comportamento padrão do PostgreSQL sem aspas duplas). Todas as queries devem usar nomes de colunas em minúsculo, sem aspas.
- O `idOrganizacao` é retornado no login e deve ser guardado para usar nas demais chamadas — salva no `localStorage` ou num `Context` do React.
- Todos os endpoints retornam e recebem JSON — sempre inclua o header `Content-Type: application/json` nas requisições POST.

---

## 🧪 Dados de teste

Para testar localmente use as credenciais abaixo, já cadastradas no banco:

| Campo | Valor |
|-------|-------|
| Email | `admin@admin.com` |
| Senha | `admin` |
| idOrganizacao | `44e043fa-5652-42bf-a252-c07f48025bab` |

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
  "idOrganizacao": "44e043fa-5652-42bf-a252-c07f48025bab"
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
    "idOrganizacao": "44e043fa-5652-42bf-a252-c07f48025bab"
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
  "emailUsuario": "admin@admin.com",
  "senhaUsuario": "admin"
}
```

**Resposta `200`:**
```json
{
  "message": "Login realizado com sucesso.",
  "usuario": {
    "idUsuario": "uuid-do-usuario",
    "nomeUsuario": "Admin",
    "emailUsuario": "admin@admin.com",
    "idOrganizacao": "44e043fa-5652-42bf-a252-c07f48025bab"
  }
}
```

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
GET http://localhost:3001/api/produtos/44e043fa-5652-42bf-a252-c07f48025bab
```

**Resposta `200`:**
```json
[
  {
    "idproduto": "uuid-do-produto",
    "nomeproduto": "Corrente de Transmissão",
    "descricaoproduto": "Corrente 428 para motos 150cc",
    "precoproduto": "89.90",
    "quantidadeproduto": 1,
    "quantidademinimaproduto": 2,
    "criticoproduto": true,
    "idorganizacao": "44e043fa-5652-42bf-a252-c07f48025bab"
  },
  {
    "idproduto": "uuid-do-produto-2",
    "nomeproduto": "Filtro de Óleo",
    "descricaoproduto": "Filtro para Honda CG 160",
    "precoproduto": "25.90",
    "quantidadeproduto": 3,
    "quantidademinimaproduto": 5,
    "criticoproduto": true,
    "idorganizacao": "44e043fa-5652-42bf-a252-c07f48025bab"
  },
  {
    "idproduto": "uuid-do-produto-3",
    "nomeproduto": "Vela de Ignição",
    "descricaoproduto": "NGK compatível com várias motos",
    "precoproduto": "18.00",
    "quantidadeproduto": 10,
    "quantidademinimaproduto": 3,
    "criticoproduto": false,
    "idorganizacao": "44e043fa-5652-42bf-a252-c07f48025bab"
  }
]
```

> ℹ️ `criticoproduto` é calculado automaticamente — será `true` quando `quantidadeproduto <= quantidademinimaproduto`.

| Status | Motivo |
|--------|--------|
| `200` | Lista retornada com sucesso |
| `500` | Erro interno |

---

## 💻 Exemplos no React

**Login:**
```js
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailUsuario: 'admin@admin.com',
    senhaUsuario: 'admin'
  })
});
const data = await response.json();
// data.usuario.idorganizacao = '44e043fa-5652-42bf-a252-c07f48025bab'
```

**Listar produtos:**
```js
const response = await fetch(
  'http://localhost:3001/api/produtos/44e043fa-5652-42bf-a252-c07f48025bab'
);
const data = await response.json();
// data = array de produtos
```

**Cadastro:**
```js
const response = await fetch('http://localhost:3001/api/auth/cadastro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nomeUsuario: 'João',
    emailUsuario: 'joao@motogest.com',
    senhaUsuario: '123456',
    idOrganizacao: '44e043fa-5652-42bf-a252-c07f48025bab'
  })
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
