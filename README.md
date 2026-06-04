# 🏍️ MotoGest

Sistema de gestão para pequenas e médias oficinas de motos.

> Projeto acadêmico — Laboratório de Empreendedorismo e Práticas Comunitárias | UNISC 2026

---

## 📁 Estrutura do Projeto

```
motogest/
├── frontend-provisorio/   # Frontend em HTML + CSS + JavaScript puro
└── backend/               # API Node.js + Express
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

```bash
cd backend
npm install
```

Crie o arquivo `.env` dentro da pasta `backend/` — **nunca suba esse arquivo pro GitHub:**

```env
DB_HOST=aws-1-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.ipbpqxsgjegsyqhkzcpi
DB_PASSWORD=senha_que_o_pablo_vai_passar
DB_NAME=postgres
PORT=3001
JWT_SECRET=coloca_uma_string_longa_e_aleatoria_aqui
JWT_EXPIRES_IN=8h
```

```bash
npm run dev
```

Se aparecer `Servidor rodando na porta 3001` funcionou. ✅

---

### 3. Abrir o Frontend

Abra o arquivo `frontend-provisorio/login.html` diretamente no navegador. Não precisa de `npm install` nem servidor separado — é HTML puro.

---

## 🔑 Autenticação JWT — leia antes de fazer qualquer tela

O sistema usa **JWT (JSON Web Token)**. Toda rota da API exceto `/api/auth/login` exige um token válido no header. Se você esquecer isso, vai tomar `401` em tudo e não vai entender por quê.

### Como funciona

1. O usuário faz login → backend devolve um `token`
2. O frontend salva esse token no `localStorage`
3. **Todo request seguinte** precisa mandar esse token no header `Authorization`
4. Se o token expirar (8h), o backend devolve `401` e o usuário precisa logar de novo

### Regra de ouro: nunca use `fetch` direto — use `fetchAutenticado`

A função `fetchAutenticado` já está no `app.js`. Ela injeta o token automaticamente e redireciona pro login se receber 401.

**Errado:**
```js
const resposta = await fetch(`${API_URL}/produtos/${idOrganizacao}`);
```

**Certo:**
```js
const resposta = await fetchAutenticado(`${API_URL}/produtos/${idOrganizacao}`);
```

A única exceção é o próprio login — ele usa `fetch` normal porque ainda não tem token.

### Como pegar o idOrganizacao nas telas

```js
const { usuario } = JSON.parse(localStorage.getItem('usuarioLogado'));
const idOrganizacao = usuario.idOrganizacao;
```

### Fazer logout

```js
localStorage.removeItem('token');
localStorage.removeItem('usuarioLogado');
window.location.href = 'login.html';
```

### Não precisa mexer no banco

JWT é stateless — o token é verificado pelo backend direto na memória. Nenhuma tabela nova, nenhuma coluna extra no banco.

---

## ⚠️ Observações importantes

- Colunas no banco em **letras minúsculas** (padrão PostgreSQL sem aspas duplas).
- O `idOrganizacao` é retornado no login — salve no `localStorage` para usar nas demais chamadas.
- Todos os endpoints retornam e recebem JSON — inclua `Content-Type: application/json` nas requisições POST/PUT.
- Venda e compra atualizam o estoque automaticamente no backend via transação — se qualquer item falhar, nada é salvo.

---

## 🧪 Dados de teste

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

#### `POST /auth/login`

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
    "idUsuario": "uuid",
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

### 🏢 Organizações

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/organizacoes/:idOrganizacao` | Busca uma organização |
| `POST` | `/organizacoes` | Cria uma organização |
| `PUT` | `/organizacoes/:idOrganizacao` | Edita o nome |
| `DELETE` | `/organizacoes/:idOrganizacao` | Remove (cascata apaga tudo vinculado) |

**Body POST/PUT:**
```json
{ "nomeOrganizacao": "Oficina do João" }
```

**Resposta POST `201`:**
```json
{
  "message": "Organização criada com sucesso.",
  "organizacao": { "idorganizacao": "uuid", "nomeorganizacao": "Oficina do João" }
}
```

| Status | Motivo |
|--------|--------|
| `200/201` | Sucesso |
| `400` | Campo obrigatório faltando |
| `404` | Não encontrada |
| `500` | Erro interno |

---

### 👤 Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/usuarios/:idOrganizacao` | Lista usuários da organização |
| `POST` | `/usuarios` | Cria um usuário |
| `PUT` | `/usuarios/:idUsuario` | Edita nome, email e senha (senha opcional) |
| `DELETE` | `/usuarios/:idUsuario` | Remove o usuário |

**Body POST:**
```json
{
  "nomeUsuario": "João",
  "emailUsuario": "joao@email.com",
  "senhaUsuario": "123456",
  "idOrganizacao": "uuid-da-org"
}
```

**Body PUT** (senha opcional — se não enviada, mantém a atual):
```json
{
  "nomeUsuario": "João Editado",
  "emailUsuario": "joao_novo@email.com",
  "senhaUsuario": "nova_senha"
}
```

**Resposta GET `200`:**
```json
[
  {
    "idusuario": "uuid",
    "nomeusuario": "João",
    "emailusuario": "joao@email.com",
    "idorganizacao": "uuid-da-org"
  }
]
```

> ℹ️ A senha nunca é retornada nas respostas.

| Status | Motivo |
|--------|--------|
| `200/201` | Sucesso |
| `400` | Campo obrigatório faltando |
| `404` | Não encontrado |
| `409` | Email já cadastrado |
| `500` | Erro interno |

---

### 📦 Produtos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/produtos/:idOrganizacao` | Lista produtos ordenados por nome |
| `POST` | `/produtos` | Cria um produto |
| `PUT` | `/produtos/:idproduto` | Edita o produto |
| `DELETE` | `/produtos/:idproduto` | Remove o produto |

**Body POST:**
```json
{
  "nomeProduto": "Corrente de Transmissão",
  "descricaoProduto": "Corrente 428 para motos 150cc",
  "precoProduto": 89.90,
  "quantidadeProduto": 5,
  "quantidadeMinimaProduto": 2,
  "idOrganizacao": "uuid-da-org"
}
```

**Body PUT:**
```json
{
  "nomeProduto": "Corrente de Transmissão",
  "descricaoProduto": "Desc atualizada",
  "precoProduto": 95.00,
  "quantidadeProduto": 8,
  "quantidadeMinimaProduto": 2
}
```

**Resposta GET `200`:**
```json
[
  {
    "idproduto": "uuid",
    "nomeproduto": "Corrente de Transmissão",
    "descricaoproduto": "Corrente 428 para motos 150cc",
    "precoproduto": "89.90",
    "quantidadeproduto": 1,
    "quantidademinimaproduto": 2,
    "criticoproduto": true,
    "idorganizacao": "uuid-da-org"
  }
]
```

> ℹ️ `criticoproduto` é gerado automaticamente pelo banco — `true` quando `quantidadeproduto <= quantidademinimaproduto`.

| Status | Motivo |
|--------|--------|
| `200/201` | Sucesso |
| `404` | Não encontrado |
| `500` | Erro interno |

---

### 🏍️ Motos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/motos/:idOrganizacao` | Lista motos da organização |
| `POST` | `/motos` | Cria uma moto |
| `PUT` | `/motos/:idMoto` | Edita nome e descrição |
| `DELETE` | `/motos/:idMoto` | Remove a moto |

**Body POST:**
```json
{
  "nomeMoto": "CG 160 Fan",
  "descricaoMoto": "Honda CG 160 vermelha 2022",
  "idOrganizacao": "uuid-da-org"
}
```

**Body PUT:**
```json
{
  "nomeMoto": "CG 160 Fan",
  "descricaoMoto": "Desc atualizada"
}
```

**Resposta GET `200`:**
```json
[
  {
    "idmoto": "uuid",
    "nomemoto": "CG 160 Fan",
    "descricaomoto": "Honda CG 160 vermelha 2022",
    "idorganizacao": "uuid-da-org"
  }
]
```

| Status | Motivo |
|--------|--------|
| `200/201` | Sucesso |
| `400` | Campo obrigatório faltando |
| `404` | Não encontrada |
| `500` | Erro interno |

---

### 👥 Contatos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/contatos/:idOrganizacao` | Lista contatos com motos vinculadas |
| `POST` | `/contatos` | Cria um contato |
| `PUT` | `/contatos/:idContato` | Edita nome, telefone e email |
| `DELETE` | `/contatos/:idContato` | Remove o contato |
| `POST` | `/contatos/:idContato/motos/:idMoto` | Vincula uma moto ao contato |
| `DELETE` | `/contatos/:idContato/motos/:idMoto` | Desvincula uma moto do contato |

**Body POST:**
```json
{
  "nomeContato": "João da Silva",
  "telefoneContato": "51999990000",
  "emailContato": "joao@email.com",
  "idOrganizacao": "uuid-da-org"
}
```

**Resposta GET `200`** (motos embutidas):
```json
[
  {
    "idcontato": "uuid",
    "nomecontato": "João da Silva",
    "telefonecontato": "51999990000",
    "emailcontato": "joao@email.com",
    "idorganizacao": "uuid-da-org",
    "motos": [
      { "idmoto": "uuid", "nomemoto": "CG 160 Fan", "descricaomoto": "Vermelha 2022" }
    ]
  }
]
```

| Status | Motivo |
|--------|--------|
| `200/201` | Sucesso |
| `400` | Campo obrigatório faltando |
| `404` | Não encontrado ou vínculo não existe |
| `500` | Erro interno |

---

### 🔧 Serviços

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/servicos/:idOrganizacao` | Lista serviços com motos e contatos vinculados |
| `POST` | `/servicos` | Cria um serviço |
| `PUT` | `/servicos/:idServico` | Edita o serviço |
| `DELETE` | `/servicos/:idServico` | Remove o serviço |
| `POST` | `/servicos/:idServico/motos/:idMoto` | Vincula uma moto ao serviço |
| `DELETE` | `/servicos/:idServico/motos/:idMoto` | Desvincula uma moto do serviço |
| `POST` | `/servicos/:idServico/contatos/:idContato` | Vincula um contato ao serviço |
| `DELETE` | `/servicos/:idServico/contatos/:idContato` | Desvincula um contato do serviço |

**Body POST/PUT:**
```json
{
  "nomeServico": "Troca de óleo",
  "descricaoServico": "Troca de óleo e filtro",
  "statusServico": "em_andamento",
  "prioridade": "alto",
  "dataEntrada": "2026-06-04",
  "dataConclusao": null,
  "valorServico": 120.00,
  "observacoes": "Cliente pediu urgência",
  "idOrganizacao": "uuid-da-org"
}
```

> ℹ️ Valores válidos para `statusServico`: `aguardando`, `em_andamento`, `impedimento`, `pronto`
> ℹ️ Valores válidos para `prioridade`: `baixo`, `normal`, `medio`, `alto`, `urgente`
> ℹ️ `dataEntrada` é opcional — assume a data atual se não enviado. `dataConclusao` é opcional.

**Resposta GET `200`** (motos e contatos embutidos):
```json
[
  {
    "idservico": "uuid",
    "nomeservico": "Troca de óleo",
    "descricaoservico": "Troca de óleo e filtro",
    "statusservico": "em_andamento",
    "prioridade": "alto",
    "dataentrada": "2026-06-04",
    "dataconclusao": null,
    "valorservico": "120.00",
    "observacoes": "Cliente pediu urgência",
    "idorganizacao": "uuid-da-org",
    "motos": [
      { "idmoto": "uuid", "nomemoto": "CG 160 Fan", "descricaomoto": "Vermelha" }
    ],
    "contatos": [
      { "idcontato": "uuid", "nomecontato": "João", "telefonecontato": "51999990000", "emailcontato": "joao@email.com" }
    ]
  }
]
```

| Status | Motivo |
|--------|--------|
| `200/201` | Sucesso |
| `400` | Campo obrigatório faltando |
| `404` | Não encontrado ou vínculo não existe |
| `500` | Erro interno |

---

### 🛒 Vendas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/vendas/:idOrganizacao` | Lista vendas com itens, ordenadas pela mais recente |
| `POST` | `/vendas` | Registra uma venda e subtrai o estoque |
| `DELETE` | `/vendas/:idVenda` | Remove a venda |

**Body POST:**
```json
{
  "idOrganizacao": "uuid-da-org",
  "idServico": "uuid-do-servico",
  "observacoes": "Venda balcão",
  "itens": [
    { "idProduto": "uuid-produto", "quantidade": 2, "precoUnitario": 25.00 },
    { "idProduto": "uuid-produto-2", "quantidade": 1, "precoUnitario": 45.00 }
  ]
}
```

> ℹ️ `idServico` é opcional — venda pode ser avulsa ou vinculada a um serviço.

**Resposta POST `201`:**
```json
{
  "message": "Venda registrada com sucesso.",
  "idvenda": "uuid",
  "valortotal": 95.00
}
```

**Resposta GET `200`** (itens embutidos):
```json
[
  {
    "idvenda": "uuid",
    "idorganizacao": "uuid-da-org",
    "idservico": null,
    "datavenda": "2026-06-04T18:46:03.689Z",
    "valortotal": "95.00",
    "observacoes": "Venda balcão",
    "itens": [
      {
        "iditemvenda": "uuid",
        "idproduto": "uuid",
        "nomeproduto": "Vela de Ignição",
        "quantidade": 2,
        "precounitario": 25.00
      }
    ]
  }
]
```

| Status | Motivo |
|--------|--------|
| `201` | Venda registrada com sucesso |
| `400` | Campo obrigatório faltando ou estoque insuficiente |
| `404` | Produto não encontrado |
| `500` | Erro interno |

---

### 📥 Compras

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/compras/:idOrganizacao` | Lista compras com itens, ordenadas pela mais recente |
| `POST` | `/compras` | Registra uma compra e soma ao estoque |
| `DELETE` | `/compras/:idCompra` | Remove a compra |

**Body POST:**
```json
{
  "idOrganizacao": "uuid-da-org",
  "nomeFornecedor": "Distribuidora Moto Sul",
  "observacoes": "Reposição mensal",
  "itens": [
    { "idProduto": "uuid-produto", "quantidade": 10, "precoUnitario": 12.50 }
  ]
}
```

> ℹ️ `nomeFornecedor` e `observacoes` são opcionais.

**Resposta POST `201`:**
```json
{
  "message": "Compra registrada com sucesso.",
  "idcompra": "uuid",
  "valortotal": 125.00
}
```

**Resposta GET `200`** (itens embutidos):
```json
[
  {
    "idcompra": "uuid",
    "idorganizacao": "uuid-da-org",
    "nomefornecedor": "Distribuidora Moto Sul",
    "datacompra": "2026-06-04T18:45:52.482Z",
    "valortotal": "125.00",
    "observacoes": "Reposição mensal",
    "itens": [
      {
        "iditemcompra": "uuid",
        "idproduto": "uuid",
        "nomeproduto": "Vela de Ignição",
        "quantidade": 10,
        "precounitario": 12.50
      }
    ]
  }
]
```

| Status | Motivo |
|--------|--------|
| `201` | Compra registrada com sucesso |
| `400` | Campo obrigatório faltando |
| `404` | Produto não encontrado |
| `500` | Erro interno |

---

## 💻 Exemplos em JavaScript

**Login:**
```js
const resposta = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailUsuario: 'admin@admin.com', senhaUsuario: 'admin' })
});
const dados = await resposta.json();
localStorage.setItem('usuarioLogado', JSON.stringify(dados));
```

**Listar produtos:**
```js
const { usuario } = JSON.parse(localStorage.getItem('usuarioLogado'));
const resposta = await fetch(`http://localhost:3001/api/produtos/${usuario.idOrganizacao}`);
const produtos = await resposta.json();
```

**Registrar venda:**
```js
const { usuario } = JSON.parse(localStorage.getItem('usuarioLogado'));
const resposta = await fetch('http://localhost:3001/api/vendas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    idOrganizacao: usuario.idOrganizacao,
    observacoes: 'Venda balcão',
    itens: [
      { idProduto: 'uuid-do-produto', quantidade: 2, precoUnitario: 25.00 }
    ]
  })
});
const dados = await resposta.json();
// dados.valortotal = 50
```

**Registrar compra:**
```js
const { usuario } = JSON.parse(localStorage.getItem('usuarioLogado'));
const resposta = await fetch('http://localhost:3001/api/compras', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    idOrganizacao: usuario.idOrganizacao,
    nomeFornecedor: 'Distribuidora Sul',
    itens: [
      { idProduto: 'uuid-do-produto', quantidade: 10, precoUnitario: 12.50 }
    ]
  })
});
const dados = await resposta.json();
```

**Criar serviço e vincular moto:**
```js
const { usuario } = JSON.parse(localStorage.getItem('usuarioLogado'));

const resServico = await fetch('http://localhost:3001/api/servicos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nomeServico: 'Troca de óleo',
    statusServico: 'aguardando',
    prioridade: 'normal',
    idOrganizacao: usuario.idOrganizacao
  })
});
const { servico } = await resServico.json();

await fetch(`http://localhost:3001/api/servicos/${servico.idservico}/motos/${idMoto}`, {
  method: 'POST'
});
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
