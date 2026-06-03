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
- Git

---

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/motogest.git
cd motogest
```

---

### 2. Configurar o Backend

Entre na pasta do backend e instale todas as dependências:

```bash
cd backend
npm install
```

Isso vai instalar automaticamente: `express`, `cors`, `pg`, `dotenv` e tudo mais que estiver no `package.json`.

Agora crie o arquivo `.env` dentro da pasta `backend/` — **nunca suba esse arquivo pro GitHub:**

```env
DB_HOST=aws-1-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.ipbpqxsgjegsyqhkzcpi
DB_PASSWORD=senha_que_o_pablo_vai_passar
DB_NAME=postgres
PORT=3001
```

> ⚠️ Pede a senha do banco pro Pablo — ela não fica no repositório por segurança.

Rode o servidor:

```bash
npm run dev
```

Se aparecer `Servidor rodando na porta 3001` funcionou. ✅

---

### 3. Configurar o Frontend

Abre um **novo terminal** (deixa o backend rodando) e entre na pasta do frontend:

```bash
cd frontend
npm install
npm run dev
```

O React vai abrir em `http://localhost:5173`

---

### 4. Testar se está tudo funcionando

Com o backend rodando, acessa no navegador ou Insomnia/Postman:

```
GET http://localhost:3001/api/produtos/44e043fa-5652-42bf-a252-c07f48025bab
```

Se retornar uma lista de produtos, está tudo certo. ✅

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
  }
]
```

> ℹ️ `criticoproduto` é calculado automaticamente — será `true` quando `quantidadeproduto <= quantidademinimaproduto`.

| Status | Motivo |
|--------|--------|
| `200` | Lista retornada com sucesso |
| `500` | Erro interno |

---

#### `POST /produtos`

Cria um novo produto vinculado a uma organização.

**Body:**
```json
{
  "nomeProduto": "Corrente de Transmissão",
  "descricaoProduto": "Corrente 428 para motos 150cc",
  "precoProduto": 89.90,
  "quantidadeProduto": 5,
  "quantidadeMinimaProduto": 2,
  "idOrganizacao": "44e043fa-5652-42bf-a252-c07f48025bab"
}
```

**Resposta `201`:**
```json
{
  "message": "Produto cadastrado com sucesso."
}
```

| Status | Motivo |
|--------|--------|
| `201` | Produto criado com sucesso |
| `500` | Erro interno |

---

#### `PUT /produtos/:idproduto`

Atualiza os dados de um produto existente.

**Exemplo de chamada:**
```
PUT http://localhost:3001/api/produtos/uuid-do-produto
```

**Body:**
```json
{
  "nomeProduto": "Corrente de Transmissão",
  "descricaoProduto": "Corrente 428 para motos 150cc atualizada",
  "precoProduto": 95.00,
  "quantidadeProduto": 8,
  "quantidadeMinimaProduto": 2
}
```

**Resposta `200`:**
```json
{
  "message": "Produto atualizado com sucesso.",
  "produto": {
    "idproduto": "uuid-do-produto",
    "nomeproduto": "Corrente de Transmissão",
    "descricaoproduto": "Corrente 428 para motos 150cc atualizada",
    "precoproduto": "95.00",
    "quantidadeproduto": 8,
    "quantidademinimaproduto": 2
  }
}
```

| Status | Motivo |
|--------|--------|
| `200` | Produto atualizado com sucesso |
| `404` | Produto não encontrado |
| `500` | Erro interno |

---

#### `DELETE /produtos/:idproduto`

Remove um produto do estoque.

**Exemplo de chamada:**
```
DELETE http://localhost:3001/api/produtos/uuid-do-produto
```

**Resposta `200`:**
```json
{
  "message": "Produto deletado com sucesso."
}
```

| Status | Motivo |
|--------|--------|
| `200` | Produto deletado com sucesso |
| `404` | Produto não encontrado |
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
