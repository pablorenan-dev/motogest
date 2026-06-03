// URL base do seu Back-end
const API_URL = 'http://localhost:3001/api';

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
        // "Telefonando" para o Back-end
        const resposta = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                emailUsuario: email, 
                senhaUsuario: senha 
            }) // Nomes baseados no seu banco de dados
        });

        if (resposta.ok) {
            const dadosUsuario = await resposta.json();
            
            // Salvamos os dados do usuário (como o idOrganizacao) no navegador
            // para sabermos de qual organização puxar os produtos depois
            localStorage.setItem('usuarioLogado', JSON.stringify(dadosUsuario));
            
            // Vai para a tela principal
            window.location.href = "home.html";
        } else {
            errorMsg.style.display = "block";
            errorMsg.innerText = "E-mail ou senha incorretos.";
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
        console.log("chegou!")
        // Rota GET /:idOrganizacao que vimos no seu produtoRoutes.js
        const resposta = await fetch(`${API_URL}/produtos/${idOrganizacao}`);
        
        if (resposta.ok) {
            pecas = await resposta.json(); // Salva os dados que vieram do banco
            renderizarEstoque(); // Desenha na tela
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
        li.className = 'item-card';
        // Usando os nomes que você planejou: nomeProduto, descricaoProduto, precoProduto
        li.innerHTML = `
            <span>${peca.nomeproduto} | Descrição: ${peca.descricaoproduto} | Preço: R$ ${peca.precoproduto}</span>
            <div class="item-actions">
                <button class="btn-delete" onclick="abrirModalDeletar(${peca.idproduto})">🗑️</button>
                <button class="btn-edit" onclick="abrirModalEditar(${peca.idproduto})">✏️</button>
            </div>
        `;
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
    const idOrganizacao = usuario.usuario.idOrganizacao;

    // 4. "Telefona" para o Back-end mandando salvar
    try {
        const resposta = await fetch(`${API_URL}/`, { // Atenção: Confirme se a rota de criar produto é só a barra ou /produto
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nomeProduto: nome,
                descricaoProduto: desc,
                precoProduto: parseFloat(preco),
                idOrganizacao: idOrganizacao
            })
        });

        if (resposta.ok) {
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

// ... [O RESTO DAS FUNÇÕES DE MODAL CONTINUAM IGUAIS AO CÓDIGO ANTERIOR] ...
function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }
function fecharModalFora(event, id) { if (event.target.id === id) fecharModal(id); }

// Ao carregar a página de estoque, chama a função que busca no banco
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lista-pecas')) {
        carregarEstoqueBanco();
    }
});