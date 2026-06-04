// URL base do seu Back-end
const API_URL = 'http://localhost:3001/api';

// Retorna o token salvo no localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Wrapper autenticado — adiciona o token em todo request e redireciona se expirar
async function fetchAutenticado(url, opcoes = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(opcoes.headers || {})
    };

    const resposta = await fetch(url, { ...opcoes, headers });

    if (resposta.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
        return;
    }

    return resposta;
}

// ================= LÓGICA DE LOGIN =================
async function validarLogin(event) {
    event.preventDefault(); // Evita recarregar a página

    const emailInput = document.getElementById('login-email');
    const senhaInput = document.getElementById('login-senha');
    const errorMsg = document.getElementById('error-msg');

    if (!emailInput || !senhaInput) return;

    const email = emailInput.value;
    const senha = senhaInput.value;

    if (email === "" || senha === "") {
        errorMsg.style.display = "block";
        errorMsg.innerText = "Por favor, preencha e-mail e senha.";
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailUsuario: email, senhaUsuario: senha })
        });

        if (resposta.ok) {
            const dados = await resposta.json();

            localStorage.setItem('token', dados.token);
            localStorage.setItem('usuarioLogado', JSON.stringify(dados));

            window.location.href = "home.html";
        } else if (resposta.status === 401) {
            errorMsg.style.display = "block";
            errorMsg.innerText = "E-mail ou senha incorretos.";
        } else {
            errorMsg.style.display = "block";
            errorMsg.innerText = "Erro ao conectar com o servidor.";
        }
    } catch (erro) {
        console.error("Erro de conexão:", erro);
        errorMsg.style.display = "block";
        errorMsg.innerText = "Erro ao conectar com o servidor. O Back-end está ligado?";
    }
}

// ================= LÓGICA DO ESTOQUE =================

let pecas = [];
let pecaAtualId = null;

// Busca as peças REAIS do banco de dados
async function carregarEstoqueBanco() {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return; // Se não tem ninguém logado, não faz nada

    const usuario = JSON.parse(usuarioSalvo);
    const idOrganizacao = usuario.usuario.idOrganizacao;

    try {
        const resposta = await fetchAutenticado(`${API_URL}/produtos/${idOrganizacao}`);

        if (resposta && resposta.ok) {
            pecas = await resposta.json();
            renderizarEstoque();
        }
    } catch (erro) {
        console.error("Erro ao buscar as peças:", erro);
    }
}

// Renderiza a lista na tela (agora usando os nomes do banco de dados)
function renderizarEstoque() {
    const lista = document.getElementById('lista-pecas');
    if (!lista) return; 

    lista.innerHTML = ""; 
    
    pecas.forEach(peca => {
        const li = document.createElement('li');
        const eCritica = peca.quantidadeproduto !== null && peca.quantidademinimaproduto !== null
            && peca.quantidadeproduto <= peca.quantidademinimaproduto;
        li.className = eCritica ? 'item-card item-card-critica' : 'item-card';

        const span = document.createElement('span');
        span.textContent = `${peca.nomeproduto} | Descrição: ${peca.descricaoproduto} | Preço: R$ ${peca.precoproduto}`;

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.textContent = '🗑️';
        btnDelete.addEventListener('click', () => abrirModalDeletar(peca.idproduto));

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.textContent = '✏️';
        btnEdit.addEventListener('click', () => abrirModalEditar(peca.idproduto));

        actions.appendChild(btnDelete);
        actions.appendChild(btnEdit);
        li.appendChild(span);
        li.appendChild(actions);
        lista.appendChild(li);
    });
}

// ================= FUNÇÃO PARA ADICIONAR PEÇA =================
async function adicionarPeca() {
    // 1. Pega o que foi digitado nos campos
    const nome = document.getElementById('add-nome').value;
    const desc = document.getElementById('add-desc').value;
    const preco = document.getElementById('add-preco').value;

    // 2. Verifica se algum campo está vazio
    if (!nome || !desc || !preco) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    // 3. Pega o ID da organização de quem está logado
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) {
        alert("Você precisa estar logado para adicionar peças.");
        return;
    }
    
    // Ajuste para lidar com a estrutura do seu login
    const dados = JSON.parse(usuarioSalvo);
    const idOrganizacao = dados.usuario.idOrganizacao;

    // 4. "Telefona" para o Back-end mandando salvar
    try {
        const resposta = await fetchAutenticado(`${API_URL}/produtos`, {
            method: 'POST',
            body: JSON.stringify({
                nomeProduto: nome,
                descricaoProduto: desc,
                precoProduto: parseFloat(preco),
                idOrganizacao: idOrganizacao
            })
        });

        if (resposta && resposta.ok) {
            // Se deu certo: fecha a janela, limpa os campos e recarrega a lista
            fecharModal('modal-add');
            document.getElementById('add-nome').value = '';
            document.getElementById('add-desc').value = '';
            document.getElementById('add-preco').value = '';
            
            carregarEstoqueBanco(); // Atualiza a tela com o novo item
        } else {
            alert("Erro ao salvar a peça no banco de dados.");
        }
    } catch (erro) {
        console.error("Erro ao adicionar:", erro);
        alert("Erro de conexão. O Back-end está rodando?");
    }
}

// ================= FUNÇÕES DE EDITAR PEÇA =================

function abrirModalEditar(id) {
    pecaAtualId = id;
    const peca = pecas.find(p => p.idproduto === id);
    if (!peca) return;

    document.getElementById('edit-nome').value = peca.nomeproduto || '';
    document.getElementById('edit-desc').value = peca.descricaoproduto || '';
    document.getElementById('edit-preco').value = peca.precoproduto || '';
    document.getElementById('edit-quantidade').value = peca.quantidadeproduto || '';
    document.getElementById('edit-qtd-min').value = peca.quantidademinimaproduto || '';

    abrirModal('modal-edit');
}

async function salvarEdicao() {
    const nome = document.getElementById('edit-nome').value;
    const desc = document.getElementById('edit-desc').value;
    const preco = document.getElementById('edit-preco').value;
    const quantidade = document.getElementById('edit-quantidade').value;
    const qtdMin = document.getElementById('edit-qtd-min').value;

    if (!nome || !desc || !preco) {
        alert("Por favor, preencha os campos obrigatórios.");
        return;
    }

    try {
        const resposta = await fetchAutenticado(`${API_URL}/produtos/${pecaAtualId}`, {
            method: 'PUT',
            body: JSON.stringify({
                nomeProduto: nome,
                descricaoProduto: desc,
                precoProduto: parseFloat(preco),
                quantidadeProduto: parseInt(quantidade) || 0,
                quantidadeMinimaProduto: parseInt(qtdMin) || 0
            })
        });

        if (resposta && resposta.ok) {
            fecharModal('modal-edit');
            carregarEstoqueBanco();
        } else {
            alert("Erro ao atualizar a peça.");
        }
    } catch (erro) {
        console.error("Erro ao editar:", erro);
        alert("Erro de conexão. O Back-end está rodando?");
    }
}

// ================= FUNÇÕES DE DELETAR PEÇA =================

function abrirModalDeletar(id) {
    pecaAtualId = id;
    abrirModal('modal-delete');
}

async function deletarPeca() {
    try {
        const resposta = await fetchAutenticado(`${API_URL}/produtos/${pecaAtualId}`, {
            method: 'DELETE'
        });

        if (resposta && resposta.ok) {
            fecharModal('modal-delete');
            carregarEstoqueBanco();
        } else {
            alert("Erro ao deletar a peça.");
        }
    } catch (erro) {
        console.error("Erro ao deletar:", erro);
        alert("Erro de conexão. O Back-end está rodando?");
    }
}

// ================= HELPERS DE MODAL =================

function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }
function fecharModalFora(event, id) { if (event.target.id === id) fecharModal(id); }

// Ao carregar a página de estoque, chama a função que busca no banco
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lista-pecas')) {
        carregarEstoqueBanco();
    }
});