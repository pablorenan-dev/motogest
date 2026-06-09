# 🏍️ MotoGest

Sistema de gestão para pequenas e médias oficinas de motos.

> Projeto acadêmico — Laboratório de Empreendedorismo e Práticas Comunitárias | UNISC 2026

---

## 📁 Estrutura do Projeto

```
motogest/
├── frontend-provisorio/       # Frontend em HTML + CSS + JavaScript puro
│   ├── login.html             # Tela de login
│   ├── register.html          # Criar conta (cria usuário + organização)
│   ├── home.html              # Dashboard com métricas e atalhos
│   ├── estoque.html           # Gestão de peças e produtos
│   ├── moto.html              # Cadastro de motos com vinculação de contatos
│   ├── contato.html           # Cadastro de contatos com vinculação de motos
│   ├── vendas.html            # Registro de vendas (desconta estoque)
│   ├── relatorios.html        # Histórico de vendas e gráfico por período
│   ├── chats.html             # Mensagens WhatsApp (layout três painéis)
│   ├── configuracoes.html     # Conexão WhatsApp via QR, conta e logout
│   ├── app.js                 # Funções compartilhadas (auth guard, fetchAutenticado)
│   └── style.css              # Estilos globais
└── backend/
    ├── src/
    │   ├── config/db.js        # Conexão PostgreSQL (pool)
    │   ├── controllers/        # Lógica de cada recurso
    │   ├── middlewares/        # Autenticação JWT
    │   ├── routes/             # Definição das rotas
    │   └── services/
    │       └── whatsappService.js  # Integração Baileys (WhatsApp Web)
    ├── app.js                  # Configuração Express + registro de rotas
    └── src/server.js           # Entry point
```

---

## 🚀 Como rodar localmente

### Pré-requisitos

- Node.js 18+
- npm
- PostgreSQL (ou conta no Supabase)

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
DB_USER=postgres.seu_projeto
DB_PASSWORD=sua_senha
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

Abra o arquivo `frontend-provisorio/login.html` diretamente no navegador.  
Não precisa de `npm install` nem servidor separado — é HTML puro.

Na primeira vez, acesse `register.html` para criar sua conta e organização.

---

## 🔑 Autenticação JWT

O sistema usa **JWT (JSON Web Token)**. Toda rota da API exceto `/api/auth/login` e `/api/auth/registro` exige um token válido.

### Como funciona

1. Usuário faz login ou cria conta → backend devolve um `token`
2. Frontend salva o token no `localStorage`
3. Todo request seguinte precisa enviar o token no header `Authorization`
4. Se o token expirar (8h), o backend devolve `401` e o usuário é redirecionado para o login

### Regra de ouro: use sempre `fetchAutenticado`

A função está em `app.js` e injeta o token automaticamente em todas as chamadas. Se receber `401`, limpa o localStorage e redireciona para o login.

```js
// Errado:
const r = await fetch(`${API_URL}/produtos/${idOrganizacao}`);

// Certo:
const r = await fetchAutenticado(`${API_URL}/produtos/${idOrganizacao}`);
```

### Guard de rota no frontend

O `app.js` verifica se há token ao carregar qualquer página protegida. Páginas públicas: `login.html` e `register.html`.

### Como pegar o idOrganizacao nas telas

```js
const { usuario } = JSON.parse(localStorage.getItem('usuarioLogado'));
const idOrganizacao = usuario.idOrganizacao;
```

---

## ⚠️ Observações importantes

- Colunas no banco em **letras minúsculas** (padrão PostgreSQL sem aspas duplas).
- `criticoproduto` é calculado automaticamente pelo banco quando `quantidade <= quantidadeMinima`.
- Venda e compra atualizam o estoque via transação — se qualquer item falhar, nada é salvo.
- A integração WhatsApp usa a biblioteca Baileys (cliente não-oficial do WhatsApp Web). Credenciais são salvas em `.whatsapp-auth/` e persistem entre reinicializações.
- Mensagens e chats do WhatsApp são armazenados **em memória** — reiniciar o backend limpa o histórico em cache (as credenciais de conexão permanecem).

---

## 🧪 Dados de teste

| Campo | Valor |
|-------|-------|
| Email | `admin@admin.com` |
| Senha | `admin` |

---

## 📡 Documentação da API

Base URL: `http://localhost:3001/api`

---

### 🔐 Autenticação

#### `POST /auth/login`

```json
{ "emailUsuario": "admin@admin.com", "senhaUsuario": "admin" }
```

**Resposta `200`:**
```json
{
  "message": "Login realizado com sucesso.",
  "token": "eyJ...",
  "usuario": {
    "idUsuario": "uuid",
    "nomeUsuario": "Admin",
    "emailUsuario": "admin@admin.com",
    "idOrganizacao": "uuid-da-org"
  }
}
```

---

#### `POST /auth/registro`

Cria organização e usuário em uma única transação e retorna o token (já entra logado).

```json
{
  "nomeUsuario": "João",
  "emailUsuario": "joao@email.com",
  "senhaUsuario": "minhasenha",
  "nomeOrganizacao": "Oficina do João"
}
```

**Resposta `201`:**
```json
{
  "message": "Conta criada com sucesso.",
  "token": "eyJ...",
  "usuario": {
    "idUsuario": "uuid",
    "nomeUsuario": "João",
    "emailUsuario": "joao@email.com",
    "idOrganizacao": "uuid-da-org"
  }
}
```

| Status | Motivo |
|--------|--------|
| `201` | Conta criada |
| `400` | Campo obrigatório faltando |
| `409` | E-mail já cadastrado |
| `500` | Erro interno |

---

### 🏢 Organizações

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/organizacoes/:idOrganizacao` | Busca organização |
| `POST` | `/organizacoes` | Cria organização |
| `PUT` | `/organizacoes/:idOrganizacao` | Edita nome |
| `DELETE` | `/organizacoes/:idOrganizacao` | Remove |

---

### 👤 Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/usuarios/:idOrganizacao` | Lista usuários da organização |
| `POST` | `/usuarios` | Cria usuário |
| `PUT` | `/usuarios/:idUsuario` | Edita nome, email e senha (senha opcional) |
| `DELETE` | `/usuarios/:idUsuario` | Remove |

---

### 📦 Produtos (Estoque)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/produtos/:idOrganizacao` | Lista produtos ordenados por nome |
| `POST` | `/produtos` | Cria produto |
| `PUT` | `/produtos/:idproduto` | Edita produto |
| `DELETE` | `/produtos/:idproduto` | Remove |

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

> `criticoproduto` é `true` automaticamente quando `quantidade <= quantidadeMinima`.

---

### 🏍️ Motos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/motos/:idOrganizacao` | Lista motos |
| `POST` | `/motos` | Cria moto |
| `PUT` | `/motos/:idMoto` | Edita |
| `DELETE` | `/motos/:idMoto` | Remove |

---

### 👥 Contatos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/contatos/:idOrganizacao` | Lista contatos com motos vinculadas |
| `POST` | `/contatos` | Cria contato |
| `PUT` | `/contatos/:idContato` | Edita |
| `DELETE` | `/contatos/:idContato` | Remove |
| `POST` | `/contatos/:idContato/motos/:idMoto` | Vincula moto ao contato |
| `DELETE` | `/contatos/:idContato/motos/:idMoto` | Desvincula moto |

**Resposta GET** inclui array `motos[]` embutido em cada contato.

---

### 🔧 Serviços

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/servicos/:idOrganizacao` | Lista serviços com motos e contatos |
| `POST` | `/servicos` | Cria serviço |
| `PUT` | `/servicos/:idServico` | Edita |
| `DELETE` | `/servicos/:idServico` | Remove |
| `POST/DELETE` | `/servicos/:idServico/motos/:idMoto` | Vincula/desvincula moto |
| `POST/DELETE` | `/servicos/:idServico/contatos/:idContato` | Vincula/desvincula contato |

> Valores para `statusServico`: `aguardando`, `em_andamento`, `impedimento`, `pronto`  
> Valores para `prioridade`: `baixo`, `normal`, `medio`, `alto`, `urgente`

---

### 🛒 Vendas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/vendas/:idOrganizacao` | Lista vendas com itens (mais recente primeiro) |
| `POST` | `/vendas` | Registra venda e desconta estoque |
| `DELETE` | `/vendas/:idVenda` | Remove venda |

**Body POST:**
```json
{
  "idOrganizacao": "uuid-da-org",
  "idServico": "uuid-do-servico",
  "observacoes": "Venda balcão",
  "itens": [
    { "idProduto": "uuid", "quantidade": 2, "precoUnitario": 25.00 }
  ]
}
```

> `idServico` é opcional.

---

### 📥 Compras

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/compras/:idOrganizacao` | Lista compras com itens (mais recente primeiro) |
| `POST` | `/compras` | Registra compra e soma ao estoque |
| `DELETE` | `/compras/:idCompra` | Remove compra |

---

### 💬 WhatsApp

Integração via **Baileys** (WhatsApp Web não-oficial). Todas as rotas exigem autenticação JWT.  
O SSE aceita o token via query param: `?token=...` (necessário pois `EventSource` não suporta headers).

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/whatsapp/sse?token=...` | Stream de eventos em tempo real (SSE) |
| `GET` | `/whatsapp/status` | Status da conexão |
| `GET` | `/whatsapp/chats` | Lista de conversas em cache |
| `GET` | `/whatsapp/mensagens/:jid?limit=50` | Mensagens de uma conversa |
| `GET` | `/whatsapp/media/:jid/:msgId` | Download de mídia (vídeo, documento) |
| `POST` | `/whatsapp/enviar` | Envia mensagem de texto |
| `POST` | `/whatsapp/iniciar` | Inicia nova conversa por número de telefone |
| `POST` | `/whatsapp/conectar` | Inicia conexão (gera QR se necessário) |
| `POST` | `/whatsapp/desconectar` | Encerra sessão (logout do WhatsApp) |
| `GET` | `/whatsapp/configuracao` | Lê configurações (ex: somenteMensagensNovas) |
| `POST` | `/whatsapp/configuracao` | Salva configurações |

**Eventos SSE emitidos:**

| Evento | Dados | Descrição |
|--------|-------|-----------|
| `status` | `{ status, qr }` | Mudança de estado da conexão |
| `qr` | `{ qr }` | Novo QR code em base64 |
| `chats` | `Chat[]` | Lista atualizada de conversas |
| `mensagem` | `Mensagem` | Nova mensagem recebida |

**Body `POST /whatsapp/enviar`:**
```json
{ "jid": "5511999999999@s.whatsapp.net", "texto": "Olá!" }
```

**Body `POST /whatsapp/iniciar`:**
```json
{ "telefone": "5511999999999" }
```

**Body `POST /whatsapp/configuracao`:**
```json
{ "somenteMensagensNovas": true }
```

> Imagens e áudios são baixados automaticamente ao receber. Vídeos e documentos ficam como placeholder com botão de download sob demanda.

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
