const API_URL = 'https://motogest-hnz8.onrender.com';

// Redireciona para login se não houver token (exceto na própria tela de login)
(function() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['login.html', 'register.html'];
    if (!publicPages.includes(page) && !localStorage.getItem('token')) {
        window.location.replace('login.html');
    }
})();

function getToken() { return localStorage.getItem('token'); }

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
        localStorage.removeItem('nomeOrganizacao');
        window.location.href = 'login.html';
        return;
    }
    return resposta;
}

// ================= LOGIN =================

async function validarLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById('login-email');
    const senhaInput = document.getElementById('login-senha');
    const errorMsg   = document.getElementById('error-msg');
    if (!emailInput || !senhaInput) return;
    const email = emailInput.value;
    const senha = senhaInput.value;
    if (!email || !senha) {
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
        errorMsg.style.display = "block";
        errorMsg.innerText = "Erro ao conectar com o servidor. O Back-end está ligado?";
    }
}

// ================= SEARCH PICKER =================
// Seletor com busca em tempo real, substitui os chips para escalar bem

function renderizarSearchPicker(containerId, items, idKey, nomeKey, selectedIds = [], onChange = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selectedSet = new Set(selectedIds.map(String));

    const itemsHtml = items.length === 0
        ? '<div class="picker-empty">Nenhum cadastrado ainda.</div>'
        : items.map(item => `
            <div class="picker-item ${selectedSet.has(String(item[idKey])) ? 'active' : ''}" data-id="${item[idKey]}">
                <div class="picker-checkbox">${selectedSet.has(String(item[idKey])) ? '✓' : ''}</div>
                <span>${item[nomeKey]}</span>
            </div>`).join('');

    container.innerHTML = `
        <div class="search-picker">
            <input type="text" class="picker-search" placeholder="Buscar...">
            <div class="picker-list">${itemsHtml}</div>
            <div class="picker-footer">
                <span class="picker-count">${selectedSet.size}</span> selecionado(s)
            </div>
        </div>`;

    const input   = container.querySelector('.picker-search');
    const list    = container.querySelector('.picker-list');
    const countEl = container.querySelector('.picker-count');

    // Filtro em tempo real
    input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        list.querySelectorAll('.picker-item').forEach(el => {
            el.style.display = el.querySelector('span').textContent.toLowerCase().includes(q) ? '' : 'none';
        });
    });

    // Toggle seleção
    list.addEventListener('click', e => {
        const item = e.target.closest('.picker-item');
        if (!item) return;
        item.classList.toggle('active');
        item.querySelector('.picker-checkbox').textContent = item.classList.contains('active') ? '✓' : '';
        countEl.textContent = list.querySelectorAll('.picker-item.active').length;
        if (onChange) onChange(getSelectedFromPicker(containerId));
    });
}

function getSelectedFromPicker(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.picker-item.active')).map(el => el.dataset.id);
}

// ================= ESTOQUE ================c
let pecas = [];
let pecaAtualId = null;

async function carregarEstoqueBanco() {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return;
    const usuario = JSON.parse(usuarioSalvo);
    const idOrganizacao = usuario.usuario.idOrganizacao;
    try {
        const resposta = await fetchAutenticado(`${API_URL}/produtos/${idOrganizacao}`);
        if (resposta && resposta.ok) {
            pecas = await resposta.json();
            renderizarEstoque();
        }
    } catch (erro) { console.error("Erro ao buscar as peças:", erro); }
}

function renderizarEstoque(data = pecas) {
    if (document.getElementById('lista-pecas') != null) {
        const lista = document.getElementById('lista-pecas');
        lista.innerHTML = "";
        if (data.length === 0) {
            lista.innerHTML = `<tr><td colspan="5" class="empty-state-row"><span class="empty-state-icon">📦</span><span>Nenhuma peça cadastrada ainda.</span></td></tr>`;
            return;
        }
        data.forEach(peca => {
            const tr = document.createElement('tr');
            const eCritica = peca.quantidadeproduto !== null && peca.quantidademinimaproduto !== null
                && peca.quantidadeproduto <= peca.quantidademinimaproduto;
            tr.className = eCritica ? 'item-card item-card-critica' : 'item-card';
            const tdProduto = document.createElement('td');
            tdProduto.textContent = peca.nomeproduto;
            const tdDescricao = document.createElement('td');
            tdDescricao.textContent = peca.descricaoproduto;
            const tdPreco = document.createElement('td');
            tdPreco.textContent = `R$ ${peca.precoproduto}`;
            const tdQtd = document.createElement('td');
            tdQtd.textContent = peca.quantidadeproduto ?? '-';
            const tdActions = document.createElement('td');
            tdActions.className = 'item-actions';
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-delete';
            btnDelete.textContent = '🗑️';
            btnDelete.addEventListener('click', () => abrirModalDeletar(peca.idproduto));
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn-edit';
            btnEdit.textContent = '✏️';
            btnEdit.addEventListener('click', () => abrirModalEditar(peca.idproduto));
            tdActions.appendChild(btnDelete);
            tdActions.appendChild(btnEdit);
            tr.appendChild(tdProduto);
            tr.appendChild(tdDescricao);
            tr.appendChild(tdPreco);
            tr.appendChild(tdQtd);
            tr.appendChild(tdActions);
            lista.appendChild(tr);
        });
    } else if (document.getElementById('lista-pecas-alt') != null) {
        const lista = document.getElementById('lista-pecas-alt');
        lista.innerHTML = "";
        if (data.length === 0) {
            lista.innerHTML = `<div class="empty-state-row"><span class="empty-state-icon">📦</span><span>Nenhum produto cadastrado ainda.</span></div>`;
            renderCart();
            return;
        }
        data.forEach(peca => {
            const div = document.createElement('div');
            div.className = 'product-card';
            div.innerHTML = `
                <div class="product-info">
                    <div class="product-name">${peca.nomeproduto}</div>
                    <div class="price">R$ ${peca.precoproduto}</div>
                </div>
                <div class="stock">${peca.quantidadeproduto} un.</div>`;
            div.addEventListener('click', () => addToCart(peca.idproduto));
            lista.appendChild(div);
        });
        renderCart();
    }
}

async function adicionarPeca() {
    const nome       = document.getElementById('add-nome').value;
    const desc       = document.getElementById('add-desc').value;
    const preco      = document.getElementById('add-preco').value;
    const quantidade = document.getElementById('add-quantidade').value;
    const qtdMin     = document.getElementById('add-qtd-min').value;
    if (!nome || !preco) { alert("Preencha nome e preço."); return; }
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return;
    const dados = JSON.parse(usuarioSalvo);
    try {
        const resposta = await fetchAutenticado(`${API_URL}/produtos`, {
            method: 'POST',
            body: JSON.stringify({
                nomeProduto: nome,
                descricaoProduto: desc,
                precoProduto: parseFloat(preco),
                quantidadeProduto: parseInt(quantidade) || 0,
                quantidadeMinimaProduto: parseInt(qtdMin) || 0,
                idOrganizacao: dados.usuario.idOrganizacao
            })
        });
        if (resposta && resposta.ok) {
            fecharModal('modal-add');
            ['add-nome','add-desc','add-preco','add-quantidade','add-qtd-min'].forEach(id => {
                document.getElementById(id).value = '';
            });
            carregarEstoqueBanco();
        } else { alert("Erro ao salvar a peça."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

function abrirModalEditar(id) {
    pecaAtualId = id;
    const peca = pecas.find(p => p.idproduto === id);
    if (!peca) return;
    document.getElementById('edit-nome').value      = peca.nomeproduto     || '';
    document.getElementById('edit-desc').value      = peca.descricaoproduto|| '';
    document.getElementById('edit-preco').value     = peca.precoproduto    || '';
    document.getElementById('edit-quantidade').value= peca.quantidadeproduto     || '';
    document.getElementById('edit-qtd-min').value   = peca.quantidademinimaproduto || '';
    abrirModal('modal-edit');
}

async function salvarEdicao() {
    const nome      = document.getElementById('edit-nome').value;
    const desc      = document.getElementById('edit-desc').value;
    const preco     = document.getElementById('edit-preco').value;
    const quantidade= document.getElementById('edit-quantidade').value;
    const qtdMin    = document.getElementById('edit-qtd-min').value;
    if (!nome || !preco) { alert("Preencha nome e preço."); return; }
    try {
        const resposta = await fetchAutenticado(`${API_URL}/produtos/${pecaAtualId}`, {
            method: 'PUT',
            body: JSON.stringify({
                nomeProduto: nome, descricaoProduto: desc, precoProduto: parseFloat(preco),
                quantidadeProduto: parseInt(quantidade) || 0, quantidadeMinimaProduto: parseInt(qtdMin) || 0
            })
        });
        if (resposta && resposta.ok) { fecharModal('modal-edit'); carregarEstoqueBanco(); }
        else { alert("Erro ao atualizar a peça."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

function abrirModalDeletar(id) { pecaAtualId = id; abrirModal('modal-delete'); }

async function deletarPeca() {
    try {
        const resposta = await fetchAutenticado(`${API_URL}/produtos/${pecaAtualId}`, { method: 'DELETE' });
        if (resposta && resposta.ok) { fecharModal('modal-delete'); carregarEstoqueBanco(); }
        else { alert("Erro ao deletar a peça."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

// ================= CARRINHO / VENDAS =================

const cart = [];

function addToCart(id) {
    const produto = pecas.find(p => p.idproduto === id);
    const existe  = cart.find(item => item.idproduto === id);
    if (existe) {
        if (existe.quantidade < produto.quantidadeproduto) { existe.quantidade++; }
        else { alert("Estoque insuficiente."); return; }
    } else { cart.push({ ...produto, quantidade: 1 }); }
    renderCart();
}

function changeQty(id, delta) {
    const item    = cart.find(p => p.idproduto === id);
    if (!item) return;
    const produto = pecas.find(p => p.idproduto === id);
    if (delta > 0 && item.quantidade >= produto.quantidadeproduto) { alert("Estoque insuficiente."); return; }
    item.quantidade += delta;
    if (item.quantidade <= 0) cart.splice(cart.findIndex(p => p.idproduto === id), 1);
    renderCart();
}

function renderCart() {
    const cartItems = document.getElementById("cart-itens");
    if (!cartItems) return;
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <strong>${item.nomeproduto}</strong>
            <div class="qty-controls">
                <button onclick="changeQty('${item.idproduto}', -1)">-</button>
                <span>${item.quantidade}</span>
                <button onclick="changeQty('${item.idproduto}', 1)">+</button>
            </div>
        </div>`).join("");
    const total = cart.reduce((sum, item) => sum + item.precoproduto * item.quantidade, 0);
    document.getElementById("total").textContent = total.toFixed(2);
}

function clearCart() { cart.length = 0; renderCart(); }

async function finalizarVenda() {
    if (cart.length === 0) { alert("Adicione pelo menos um produto ao carrinho."); return; }
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return;
    const dados = JSON.parse(usuarioSalvo);
    const itens = cart.map(item => ({
        idProduto: item.idproduto,
        quantidade: item.quantidade,
        precoUnitario: item.precoproduto
    }));
    try {
        const resposta = await fetchAutenticado(`${API_URL}/vendas`, {
            method: 'POST',
            body: JSON.stringify({ idOrganizacao: dados.usuario.idOrganizacao, itens })
        });
        if (resposta && resposta.ok) {
            const resultado = await resposta.json();
            document.getElementById('sucesso-total-valor').textContent = Number(resultado.valortotal).toFixed(2);
            abrirModal('modal-venda-sucesso');
            clearCart();
            carregarEstoqueBanco();
        } else {
            const erro = await resposta.json();
            alert(erro.error || "Erro ao finalizar a venda.");
        }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

// ================= MOTOS =================

let motos = [];
let motoAtualId = null;

async function carregarMotosBanco() {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return;
    const usuario = JSON.parse(usuarioSalvo);
    const idOrganizacao = usuario.usuario.idOrganizacao;
    try {
        const resposta = await fetchAutenticado(`${API_URL}/motos/${idOrganizacao}`);
        if (resposta && resposta.ok) {
            motos = await resposta.json();
            renderizarMotos();
        }
    } catch (erro) { console.error("Erro ao buscar motos:", erro); }
}

function renderizarMotos(data = motos) {
    const lista = document.getElementById('lista-motos');
    if (!lista) return;
    lista.innerHTML = '';
    if (data.length === 0) {
        lista.innerHTML = `<tr><td colspan="4" class="empty-state-row"><span class="empty-state-icon">🏍️</span><span>Nenhuma moto cadastrada ainda.</span></td></tr>`;
        return;
    }
    data.forEach(moto => {
        const tr = document.createElement('tr');
        tr.className = 'item-card';
        const tdModelo    = document.createElement('td');
        tdModelo.textContent = moto.nomemoto;
        const tdDescricao = document.createElement('td');
        tdDescricao.textContent = moto.descricaomoto;
        const tdContatos  = document.createElement('td');
        const contatosVinculados = contatos.filter(c => c.motos.some(m => String(m.idmoto) === String(moto.idmoto)));
        tdContatos.innerHTML = contatosVinculados.length > 0
            ? contatosVinculados.map(c => `<span class="tag-moto">${c.nomecontato}</span>`).join('')
            : '<span class="sem-vinculo">-</span>';
        const tdActions = document.createElement('td');
        tdActions.className = 'item-actions';
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.textContent = '🗑️';
        btnDelete.onclick = () => abrirModalDeletarMoto(moto.idmoto);
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.textContent = '✏️';
        btnEdit.onclick = () => abrirModalEditarMoto(moto.idmoto);
        tdActions.appendChild(btnDelete);
        tdActions.appendChild(btnEdit);
        tr.appendChild(tdModelo);
        tr.appendChild(tdDescricao);
        tr.appendChild(tdContatos);
        tr.appendChild(tdActions);
        lista.appendChild(tr);
    });
}

function prepararAddMotoModal() {
    renderizarSearchPicker('add-moto-contatos', contatos, 'idcontato', 'nomecontato');
    abrirModal('modal-add-motos');
}

async function adicionarMoto() {
    const modelo   = document.getElementById('add-nome').value;
    const descricao= document.getElementById('add-desc').value;
    if (!modelo || !descricao) { alert("Preencha todos os campos."); return; }
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return;
    const dados = JSON.parse(usuarioSalvo);
    try {
        const resposta = await fetchAutenticado(`${API_URL}/motos`, {
            method: 'POST',
            body: JSON.stringify({ nomeMoto: modelo, descricaoMoto: descricao, idOrganizacao: dados.usuario.idOrganizacao })
        });
        if (resposta && resposta.ok) {
            const resultado = await resposta.json();
            const idMoto = resultado.moto.idmoto;
            const idsContatosSelecionados = getSelectedFromPicker('add-moto-contatos');
            await Promise.all(idsContatosSelecionados.map(id => vincularContatoMoto(id, idMoto)));
            fecharModal('modal-add-motos');
            document.getElementById('add-nome').value = '';
            document.getElementById('add-desc').value = '';
            await Promise.all([carregarMotosBanco(), carregarContatosBanco()]);
        } else { alert("Erro ao salvar a moto."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

function abrirModalEditarMoto(id) {
    motoAtualId = id;
    const moto = motos.find(m => m.idmoto === id);
    if (!moto) return;
    document.getElementById('edit-moto-nome').value = moto.nomemoto    || '';
    document.getElementById('edit-moto-desc').value = moto.descricaomoto || '';
    const contatosVinculados = contatos
        .filter(c => c.motos.some(m => String(m.idmoto) === String(id)))
        .map(c => String(c.idcontato));
    renderizarSearchPicker('edit-moto-contatos', contatos, 'idcontato', 'nomecontato', contatosVinculados);
    abrirModal('modal-edit-moto');
}

async function salvarEdicaoMoto() {
    const nome = document.getElementById('edit-moto-nome').value;
    const desc = document.getElementById('edit-moto-desc').value;
    if (!nome) { alert("Preencha o nome da moto."); return; }
    try {
        const resposta = await fetchAutenticado(`${API_URL}/motos/${motoAtualId}`, {
            method: 'PUT',
            body: JSON.stringify({ nomeMoto: nome, descricaoMoto: desc })
        });
        if (resposta && resposta.ok) {
            await sincronizarContatosDaMoto(motoAtualId, getSelectedFromPicker('edit-moto-contatos'));
            fecharModal('modal-edit-moto');
            await Promise.all([carregarMotosBanco(), carregarContatosBanco()]);
        } else { alert("Erro ao atualizar a moto."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

function abrirModalDeletarMoto(id) { motoAtualId = id; abrirModal('modal-delete-moto'); }

async function deletarMoto() {
    try {
        const resposta = await fetchAutenticado(`${API_URL}/motos/${motoAtualId}`, { method: 'DELETE' });
        if (resposta && resposta.ok) { fecharModal('modal-delete-moto'); carregarMotosBanco(); }
        else { alert("Erro ao deletar a moto."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

// ================= CONTATOS =================

let contatos = [];
let contatoAtualId = null;

async function carregarContatosBanco() {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return;
    const usuario = JSON.parse(usuarioSalvo);
    const idOrganizacao = usuario.usuario.idOrganizacao;
    try {
        const resposta = await fetchAutenticado(`${API_URL}/contatos/${idOrganizacao}`);
        if (resposta && resposta.ok) {
            contatos = await resposta.json();
            if (document.getElementById('lista-contatos')) renderizarContatos();
            if (document.getElementById('lista-motos'))    renderizarMotos();
        }
    } catch (erro) { console.error("Erro ao buscar contatos:", erro); }
}

function renderizarContatos(data = contatos) {
    const lista = document.getElementById('lista-contatos');
    if (!lista) return;
    lista.innerHTML = '';
    if (data.length === 0) {
        lista.innerHTML = `<tr><td colspan="5" class="empty-state-row"><span class="empty-state-icon">👥</span><span>Nenhum contato cadastrado ainda.</span></td></tr>`;
        return;
    }
    data.forEach(contato => {
        const tr = document.createElement('tr');
        tr.className = 'item-card';
        const tdNome  = document.createElement('td');
        tdNome.textContent = contato.nomecontato;
        const tdTel   = document.createElement('td');
        tdTel.textContent  = contato.telefonecontato || '-';
        const tdEmail = document.createElement('td');
        tdEmail.textContent= contato.emailcontato   || '-';
        const tdMotos = document.createElement('td');
        tdMotos.innerHTML  = contato.motos.length > 0
            ? contato.motos.map(m => `<span class="tag-moto">${m.nomemoto}</span>`).join('')
            : '<span class="sem-vinculo">-</span>';
        const tdActions = document.createElement('td');
        tdActions.className = 'item-actions';
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.textContent = '✏️';
        btnEdit.onclick = () => abrirModalEditarContato(contato.idcontato);
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.textContent = '🗑️';
        btnDelete.onclick = () => abrirModalDeletarContato(contato.idcontato);
        tdActions.appendChild(btnEdit);
        tdActions.appendChild(btnDelete);
        tr.appendChild(tdNome);
        tr.appendChild(tdTel);
        tr.appendChild(tdEmail);
        tr.appendChild(tdMotos);
        tr.appendChild(tdActions);
        lista.appendChild(tr);
    });
}

function prepararAddContatoModal() {
    renderizarSearchPicker('add-contato-motos', motos, 'idmoto', 'nomemoto');
    abrirModal('modal-add-contato');
}

async function adicionarContato() {
    const nome     = document.getElementById('add-nome').value;
    const telefone = document.getElementById('add-telefone').value;
    const email    = document.getElementById('add-email').value;
    if (!nome) { alert("Nome é obrigatório."); return; }
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return;
    const dados = JSON.parse(usuarioSalvo);
    try {
        const resposta = await fetchAutenticado(`${API_URL}/contatos`, {
            method: 'POST',
            body: JSON.stringify({ nomeContato: nome, telefoneContato: telefone, emailContato: email, idOrganizacao: dados.usuario.idOrganizacao })
        });
        if (resposta && resposta.ok) {
            const resultado = await resposta.json();
            const idContato = resultado.contato.idcontato;
            const idsMotosSelecionadas = getSelectedFromPicker('add-contato-motos');
            await Promise.all(idsMotosSelecionadas.map(id => vincularContatoMoto(idContato, id)));
            fecharModal('modal-add-contato');
            ['add-nome','add-telefone','add-email'].forEach(id => document.getElementById(id).value = '');
            await carregarContatosBanco();
        } else { alert("Erro ao salvar o contato."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

function abrirModalEditarContato(id) {
    contatoAtualId = id;
    const contato = contatos.find(c => c.idcontato === id);
    if (!contato) return;
    document.getElementById('edit-nome').value     = contato.nomecontato    || '';
    document.getElementById('edit-telefone').value = contato.telefonecontato|| '';
    document.getElementById('edit-email').value    = contato.emailcontato   || '';
    const motosVinculadas = contato.motos.map(m => String(m.idmoto));
    renderizarSearchPicker('edit-contato-motos', motos, 'idmoto', 'nomemoto', motosVinculadas);
    abrirModal('modal-edit-contato');
}

async function salvarEdicaoContato() {
    const nome     = document.getElementById('edit-nome').value;
    const telefone = document.getElementById('edit-telefone').value;
    const email    = document.getElementById('edit-email').value;
    if (!nome) { alert("Nome é obrigatório."); return; }
    try {
        const resposta = await fetchAutenticado(`${API_URL}/contatos/${contatoAtualId}`, {
            method: 'PUT',
            body: JSON.stringify({ nomeContato: nome, telefoneContato: telefone, emailContato: email })
        });
        if (resposta && resposta.ok) {
            await sincronizarMotosDosContato(contatoAtualId, getSelectedFromPicker('edit-contato-motos'));
            fecharModal('modal-edit-contato');
            await carregarContatosBanco();
        } else { alert("Erro ao atualizar o contato."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

function abrirModalDeletarContato(id) { contatoAtualId = id; abrirModal('modal-delete-contato'); }

async function deletarContato() {
    try {
        const resposta = await fetchAutenticado(`${API_URL}/contatos/${contatoAtualId}`, { method: 'DELETE' });
        if (resposta && resposta.ok) { fecharModal('modal-delete-contato'); await carregarContatosBanco(); }
        else { alert("Erro ao deletar o contato."); }
    } catch (erro) { console.error(erro); alert("Erro de conexão."); }
}

// ================= VINCULAR / DESVINCULAR =================

async function vincularContatoMoto(idContato, idMoto) {
    return fetchAutenticado(`${API_URL}/contatos/${idContato}/motos/${idMoto}`, { method: 'POST' });
}
async function desvincularContatoMoto(idContato, idMoto) {
    return fetchAutenticado(`${API_URL}/contatos/${idContato}/motos/${idMoto}`, { method: 'DELETE' });
}

async function sincronizarContatosDaMoto(idMoto, idsContatosSelecionados) {
    const atualmenteVinculados = contatos
        .filter(c => c.motos.some(m => String(m.idmoto) === String(idMoto)))
        .map(c => String(c.idcontato));
    const adicionar = idsContatosSelecionados.filter(id => !atualmenteVinculados.includes(id));
    const remover   = atualmenteVinculados.filter(id => !idsContatosSelecionados.includes(id));
    await Promise.all([
        ...adicionar.map(id => vincularContatoMoto(id, idMoto)),
        ...remover.map(id   => desvincularContatoMoto(id, idMoto))
    ]);
}

async function sincronizarMotosDosContato(idContato, idsMotosSelecionadas) {
    const contato = contatos.find(c => String(c.idcontato) === String(idContato));
    const atualmenteVinculadas = contato ? contato.motos.map(m => String(m.idmoto)) : [];
    const adicionar = idsMotosSelecionadas.filter(id => !atualmenteVinculadas.includes(id));
    const remover   = atualmenteVinculadas.filter(id => !idsMotosSelecionadas.includes(id));
    await Promise.all([
        ...adicionar.map(id => vincularContatoMoto(idContato, id)),
        ...remover.map(id   => desvincularContatoMoto(idContato, id))
    ]);
}

// ================= RELATÓRIOS =================

let vendas = [];
let grafico = null;
let graficoPizza = null;

async function carregarVendasBanco() {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (!usuarioSalvo) return;
    const usuario = JSON.parse(usuarioSalvo);
    const idOrganizacao = usuario.usuario.idOrganizacao;
    try {
        const resposta = await fetchAutenticado(`${API_URL}/vendas/${idOrganizacao}`);
        if (resposta && resposta.ok) {
            vendas = await resposta.json();
            renderizarRelatorios(vendas);
        }
    } catch (erro) { console.error("Erro ao buscar vendas:", erro); }
}

function filtrarVendas() {
    const dataInicio = document.getElementById('filtro-inicio').value;
    const dataFim    = document.getElementById('filtro-fim').value;
    let filtradas = [...vendas];
    if (dataInicio) filtradas = filtradas.filter(v => new Date(v.datavenda) >= new Date(dataInicio));
    if (dataFim)    filtradas = filtradas.filter(v => new Date(v.datavenda) <= new Date(dataFim + 'T23:59:59'));
    renderizarRelatorios(filtradas);
}

function limparFiltros() {
    document.getElementById('filtro-inicio').value = '';
    document.getElementById('filtro-fim').value    = '';
    renderizarRelatorios(vendas);
}

function renderizarRelatorios(dados) {
    renderizarTabelaVendas(dados);
    renderizarGrafico(dados);
    renderizarGraficoPizza(dados);
    atualizarResumo(dados);
}

function atualizarResumo(dados) {
    const totalGeral = dados.reduce((s, v) => s + Number(v.valortotal), 0);
    const elTotal = document.getElementById('resumo-total');
    const elQtd   = document.getElementById('resumo-qtd');
    if (elTotal) elTotal.textContent = `R$ ${totalGeral.toFixed(2)}`;
    if (elQtd)   elQtd.textContent   = dados.length;
}

function renderizarTabelaVendas(dados) {
    const tbody = document.getElementById('lista-vendas');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-row">Nenhuma venda encontrada.</td></tr>';
        return;
    }
    dados.forEach(venda => {
        const tr = document.createElement('tr');
        tr.className = 'item-card';
        const data = new Date(venda.datavenda).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const nomesItens = venda.itens.length > 0
            ? venda.itens.map(i => `${i.nomeproduto} (${i.quantidade}x)`).join(', ')
            : '-';
        const tdData  = document.createElement('td');
        tdData.textContent = data;
        const tdItens = document.createElement('td');
        tdItens.textContent = nomesItens;
        tdItens.className   = 'td-itens';
        const tdTotal = document.createElement('td');
        tdTotal.textContent = `R$ ${Number(venda.valortotal).toFixed(2)}`;
        tdTotal.style.fontWeight = 'bold';
        tr.appendChild(tdData);
        tr.appendChild(tdItens);
        tr.appendChild(tdTotal);
        tbody.appendChild(tr);
    });
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('grafico-vendas');
    if (!ctx) return;
    const porDia = {};
    dados.forEach(v => {
        const dia = new Date(v.datavenda).toLocaleDateString('pt-BR');
        porDia[dia] = (porDia[dia] || 0) + Number(v.valortotal);
    });
    const labels = Object.keys(porDia).sort((a, b) => {
        const [da, ma, ya] = a.split('/').map(Number);
        const [db, mb, yb] = b.split('/').map(Number);
        return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });
    if (grafico) grafico.destroy();
    grafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label: 'Receita (R$)', data: labels.map(d => porDia[d]),
                backgroundColor: '#a8e6cf', borderColor: '#333', borderWidth: 1, borderRadius: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `R$ ${ctx.parsed.y.toFixed(2)}` } }
            },
            scales: { y: { beginAtZero: true, ticks: { callback: val => `R$ ${val.toFixed(0)}` } } }
        }
    });
}

function renderizarGraficoPizza(dados) {
    const ctx = document.getElementById('grafico-pizza');
    if (!ctx) return;

    // Agrega quantidade total por produto
    const porProduto = {};
    dados.forEach(venda => {
        (venda.itens || []).forEach(item => {
            porProduto[item.nomeproduto] = (porProduto[item.nomeproduto] || 0) + Number(item.quantidade || 1);
        });
    });

    const entradas = Object.entries(porProduto).sort((a, b) => b[1] - a[1]);
    // Limita a 7 produtos; o restante agrupa como "Outros"
    const TOP = 7;
    let labels, valores;
    if (entradas.length > TOP) {
        const top     = entradas.slice(0, TOP);
        const outros  = entradas.slice(TOP).reduce((s, [, v]) => s + v, 0);
        labels  = [...top.map(([k]) => k), 'Outros'];
        valores = [...top.map(([, v]) => v), outros];
    } else {
        labels  = entradas.map(([k]) => k);
        valores = entradas.map(([, v]) => v);
    }

    const CORES = ['#2d9e6b','#457b9d','#e76f51','#6a4c93','#f4a261','#e63946','#2a9d8f','#adb5bd'];

    if (graficoPizza) graficoPizza.destroy();

    if (labels.length === 0) {
        graficoPizza = null;
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }

    graficoPizza = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data:            valores,
                backgroundColor: CORES.slice(0, labels.length),
                borderWidth:     2,
                borderColor:     '#fff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
                tooltip: { callbacks: { label: c => ` ${c.label}: ${c.parsed} un.` } }
            },
            cutout: '55%',
        }
    });
}

// ================= FILTROS DAS TELAS =================

function setupFiltros() {
    // Estoque
    const filtroPeca = document.getElementById('filtro-peca');
    if (filtroPeca) {
        filtroPeca.addEventListener('input', () => {
            const q = filtroPeca.value.toLowerCase();
            renderizarEstoque(pecas.filter(p =>
                p.nomeproduto.toLowerCase().includes(q) ||
                (p.descricaoproduto || '').toLowerCase().includes(q)
            ));
        });
    }
    // Motos
    const filtroMoto = document.getElementById('filtro-moto');
    if (filtroMoto) {
        filtroMoto.addEventListener('input', () => {
            const q = filtroMoto.value.toLowerCase();
            renderizarMotos(motos.filter(m =>
                m.nomemoto.toLowerCase().includes(q) ||
                (m.descricaomoto || '').toLowerCase().includes(q)
            ));
        });
    }
    // Contatos
    const filtroContato = document.getElementById('filtro-contato');
    if (filtroContato) {
        filtroContato.addEventListener('input', () => {
            const q = filtroContato.value.toLowerCase();
            renderizarContatos(contatos.filter(c =>
                c.nomecontato.toLowerCase().includes(q) ||
                (c.telefonecontato || '').includes(q) ||
                (c.emailcontato || '').toLowerCase().includes(q)
            ));
        });
    }
}

// ================= MODAIS =================

function abrirModal(id)  { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

function stepQty(id, delta) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = Math.max(0, (parseInt(el.value) || 0) + delta);
}
function fecharModalFora(event, id) { if (event.target.id === id) fecharModal(id); }

// ================= TOAST =================

function mostrarToast(html, duracao = 5000) {
    const t = document.createElement('div');
    t.className = 'toast-notif';
    t.innerHTML = html;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duracao);
}

// ================= SIDEBAR ORG NAME =================

async function injetarNomeOrg() {
    const sidebarLogo = document.querySelector('.sidebar-logo');
    if (!sidebarLogo) return;
    if (sidebarLogo.querySelector('.logo-row')) return;

    // Reestrutura: envolve ícone + texto numa .logo-row
    const row = document.createElement('div');
    row.className = 'logo-row';
    Array.from(sidebarLogo.childNodes).forEach(n => row.appendChild(n));
    sidebarLogo.appendChild(row);

    // Cria o span do nome da org
    const orgSpan = document.createElement('span');
    orgSpan.className = 'sidebar-org-name';
    sidebarLogo.appendChild(orgSpan);

    // Tenta o cache primeiro
    let nome = localStorage.getItem('nomeOrganizacao');
    if (nome) { orgSpan.textContent = nome; return; }

    // Busca na API e cacheia
    try {
        const usuarioSalvo = localStorage.getItem('usuarioLogado');
        if (!usuarioSalvo) return;
        const { usuario } = JSON.parse(usuarioSalvo);
        const r = await fetchAutenticado(`${API_URL}/organizacoes/${usuario.idOrganizacao}`);
        const data = await r?.json();
        if (data?.nomeorganizacao) {
            localStorage.setItem('nomeOrganizacao', data.nomeorganizacao);
            orgSpan.textContent = data.nomeorganizacao;
        }
    } catch {}
}

// ================= INIT =================

document.addEventListener('DOMContentLoaded', async () => {
    const temPecas    = document.getElementById('lista-pecas');
    const temMotos    = document.getElementById('lista-motos');
    const temPecasAlt = document.getElementById('lista-pecas-alt');
    const temVendas   = document.getElementById('lista-vendas');
    const temContatos = document.getElementById('lista-contatos');

    if (temMotos || temContatos) {
        await Promise.all([carregarMotosBanco(), carregarContatosBanco()]);
    }
    if (temPecas)    await carregarEstoqueBanco();
    if (temPecasAlt) await carregarEstoqueBanco();
    if (temVendas)   await carregarVendasBanco();

    setupFiltros();
    injetarNomeOrg();

    if (document.getElementById('lista-logs-wa'))    carregarLogsWhatsapp();
    if (document.getElementById('lista-servicos-rel')) carregarServicosRelatorio();
});

let servicos = [];
        let servicoAtualId = null;

        async function carregarServicosBanco() {
            const usuarioSalvo = localStorage.getItem('usuarioLogado');
            if (!usuarioSalvo) return;
            const usuario = JSON.parse(usuarioSalvo);
            const idOrganizacao = usuario.usuario.idOrganizacao;
            try {
                const resposta = await fetchAutenticado(`${API_URL}/servicos/${idOrganizacao}`);
                if (resposta && resposta.ok) {
                    servicos = await resposta.json();
                    renderizarServicos();
                }
            } catch (erro) { console.error("Erro ao buscar serviços:", erro); }
        }

        function renderizarServicos(data = servicos) {
            const lista = document.getElementById('lista-servicos');
            if (!lista) return;
            lista.innerHTML = '';
            if (data.length === 0) {
                lista.innerHTML = `<tr><td colspan="6" class="empty-state-row"><span class="empty-state-icon">🔧</span><span>Nenhum serviço cadastrado ainda.</span></td></tr>`;
                return;
            }
            data.forEach(servico => {
                const tr = document.createElement('tr');
                tr.className = 'item-card';
                tr.style.cursor = 'pointer';
                tr.onclick = (e) => {
                    if (e.target.closest('.item-actions')) return;
                    window.location.href = `servico.html?id=${servico.idservico}`;
                };

                const tdNome = document.createElement('td');
                tdNome.textContent = servico.nomeservico;

                const tdStatus = document.createElement('td');
                tdStatus.innerHTML = `<span class="status-badge status-${servico.statusservico}">${traduzirStatus(servico.statusservico)}</span>`;

                const tdPrioridade = document.createElement('td');
                tdPrioridade.innerHTML = `<span class="prioridade-badge prioridade-${servico.prioridade}">${traduzirPrioridade(servico.prioridade)}</span>`;

                const tdMotos = document.createElement('td');
                tdMotos.innerHTML = servico.motos && servico.motos.length > 0
                    ? servico.motos.map(m => `<span class="tag-moto">${m.nomemoto}</span>`).join('')
                    : '<span class="sem-vinculo">-</span>';

                const tdContatos = document.createElement('td');
                tdContatos.innerHTML = servico.contatos && servico.contatos.length > 0
                    ? servico.contatos.map(c => `<span class="tag-moto">${c.nomecontato}</span>`).join('')
                    : '<span class="sem-vinculo">-</span>';

                const tdActions = document.createElement('td');
                tdActions.className = 'item-actions';
                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn-edit';
                btnEdit.textContent = '✏️';
                btnEdit.onclick = () => abrirModalEditarServico(servico.idservico);
                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-delete';
                btnDelete.textContent = '🗑️';
                btnDelete.onclick = () => abrirModalDeletarServico(servico.idservico);
                const btnTerminar = document.createElement('button');
                btnTerminar.className = 'btn-terminar';
                btnTerminar.title = 'Terminar e notificar contatos';
                btnTerminar.textContent = '✅';
                btnTerminar.onclick = () => abrirModalTerminar(servico.idservico);
                tdActions.appendChild(btnTerminar);
                tdActions.appendChild(btnEdit);
                tdActions.appendChild(btnDelete);

                tr.appendChild(tdNome);
                tr.appendChild(tdStatus);
                tr.appendChild(tdPrioridade);
                tr.appendChild(tdMotos);
                tr.appendChild(tdContatos);
                tr.appendChild(tdActions);
                lista.appendChild(tr);
            });
        }

        function traduzirStatus(status) {
            const map = {
                'aguardando': 'Aguardando',
                'em_andamento': 'Em andamento',
                'impedimento': 'Impedimento',
                'pronto': 'Pronto'
            };
            return map[status] || status;
        }

        function traduzirPrioridade(prioridade) {
            const map = {
                'baixo': 'Baixo',
                'normal': 'Normal',
                'medio': 'Médio',
                'alto': 'Alto',
                'urgente': 'Urgente'
            };
            return map[prioridade] || prioridade;
        }

        function prepararAddServicoModal() {
            _iniciarPickersServico('add');
            abrirModal('modal-add-servico');
        }

        function _iniciarPickersServico(prefixo, motosSel = [], contatosSel = [], produtosSel = []) {
            const onMotosChange = (idsMotosSel) => {
                const jaSelContatos = getSelectedFromPicker(`${prefixo}-servico-contatos`);
                // Mostra contatos da(s) moto(s) selecionada(s) + os que já estavam selecionados
                const filtrados = idsMotosSel.length === 0
                    ? contatos
                    : contatos.filter(c =>
                        jaSelContatos.includes(String(c.idcontato)) ||
                        (c.motos || []).some(m => idsMotosSel.includes(String(m.idmoto)))
                    );
                renderizarSearchPicker(`${prefixo}-servico-contatos`, filtrados, 'idcontato', 'nomecontato', jaSelContatos, onContatosChange);
            };

            const onContatosChange = (idsContatosSel) => {
                const jaSelMotos = getSelectedFromPicker(`${prefixo}-servico-motos`);
                // Mostra motos do(s) contato(s) selecionado(s) + as que já estavam selecionadas
                // Deriva de contatos[].motos já que o endpoint de motos não traz contatos
                const idsMotosDosContatos = new Set(
                    contatos
                        .filter(c => idsContatosSel.includes(String(c.idcontato)))
                        .flatMap(c => (c.motos || []).map(m => String(m.idmoto)))
                );
                const filtradas = idsContatosSel.length === 0
                    ? motos
                    : motos.filter(m =>
                        jaSelMotos.includes(String(m.idmoto)) ||
                        idsMotosDosContatos.has(String(m.idmoto))
                    );
                renderizarSearchPicker(`${prefixo}-servico-motos`, filtradas, 'idmoto', 'nomemoto', jaSelMotos, onMotosChange);
            };

            renderizarSearchPicker(`${prefixo}-servico-motos`, motos, 'idmoto', 'nomemoto', motosSel, onMotosChange);
            renderizarSearchPicker(`${prefixo}-servico-contatos`, contatos, 'idcontato', 'nomecontato', contatosSel, onContatosChange);
            renderizarSearchPicker(`${prefixo}-servico-produtos`, pecas, 'idproduto', 'nomeproduto', produtosSel);
        }

        async function adicionarServico() {
            const nome = document.getElementById('add-nome').value.trim();
            const desc = document.getElementById('add-desc').value.trim();
            const obs = document.getElementById('add-obs').value.trim();
            const valor = document.getElementById('add-valor').value.trim();
            const status = document.getElementById('add-status').value;
            const prioridade = document.getElementById('add-prioridade').value;

            if (!nome) { alert("Nome do serviço é obrigatório."); return; }

            const usuarioSalvo = localStorage.getItem('usuarioLogado');
            if (!usuarioSalvo) return;
            const dados = JSON.parse(usuarioSalvo);

            try {
                const resposta = await fetchAutenticado(`${API_URL}/servicos`, {
                    method: 'POST',
                    body: JSON.stringify({
                        nomeServico: nome,
                        descricaoServico: desc || null,
                        observacoes: obs || null,
                        valorServico: valor ? parseFloat(valor) : null,
                        statusServico: status,
                        prioridade: prioridade,
                        idOrganizacao: dados.usuario.idOrganizacao
                    })
                });

                if (resposta && resposta.ok) {
                    const resultado = await resposta.json();
                    const idServico = resultado.servico.idservico;

                    const idsMotosSelecionadas = getSelectedFromPicker('add-servico-motos');
                    const idsContatosSelecionados = getSelectedFromPicker('add-servico-contatos');

                    const idsProdutosSelecionados = getSelectedFromPicker('add-servico-produtos');
                    await Promise.all([
                        ...idsMotosSelecionadas.map(id => vincularMotoServico(idServico, id)),
                        ...idsContatosSelecionados.map(id => vincularContatoServico(idServico, id)),
                        ...idsProdutosSelecionados.map(id => fetchAutenticado(`${API_URL}/servicos/${idServico}/produtos/${id}`, { method: 'POST' }))
                    ]);

                    fecharModal('modal-add-servico');
                    document.getElementById('add-nome').value = '';
                    document.getElementById('add-desc').value = '';
                    document.getElementById('add-obs').value = '';
                    document.getElementById('add-valor').value = '';
                    await Promise.all([carregarServicosBanco(), carregarMotosBanco(), carregarContatosBanco()]);
                } else { alert("Erro ao salvar o serviço."); }
            } catch (erro) { console.error(erro); alert("Erro de conexão."); }
        }

        function abrirModalEditarServico(id) {
            servicoAtualId = id;
            const servico = servicos.find(s => s.idservico === id);
            if (!servico) return;

            document.getElementById('edit-nome').value = servico.nomeservico || '';
            document.getElementById('edit-desc').value = servico.descricaoservico || '';
            document.getElementById('edit-obs').value = servico.observacoes || '';
            document.getElementById('edit-valor').value = servico.valorservico || '';
            document.getElementById('edit-status').value = servico.statusservico || 'aguardando';
            document.getElementById('edit-prioridade').value = servico.prioridade || 'normal';

            const motosSelecionadas = servico.motos ? servico.motos.map(m => String(m.idmoto)) : [];
            const contatosSelecionados = servico.contatos ? servico.contatos.map(c => String(c.idcontato)) : [];
            const produtosSelecionados = servico.produtos ? servico.produtos.map(p => String(p.idproduto)) : [];

            _iniciarPickersServico('edit', motosSelecionadas, contatosSelecionados, produtosSelecionados);

            abrirModal('modal-edit-servico');
        }

        async function salvarEdicaoServico() {
            const nome = document.getElementById('edit-nome').value.trim();
            const desc = document.getElementById('edit-desc').value.trim();
            const obs = document.getElementById('edit-obs').value.trim();
            const valor = document.getElementById('edit-valor').value.trim();
            const status = document.getElementById('edit-status').value;
            const prioridade = document.getElementById('edit-prioridade').value;

            if (!nome) { alert("Nome do serviço é obrigatório."); return; }

            try {
                const resposta = await fetchAutenticado(`${API_URL}/servicos/${servicoAtualId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        nomeServico: nome,
                        descricaoServico: desc || null,
                        observacoes: obs || null,
                        valorServico: valor ? parseFloat(valor) : null,
                        statusServico: status,
                        prioridade: prioridade
                    })
                });

                if (resposta && resposta.ok) {
                    await sincronizarMotosDoServico(servicoAtualId, getSelectedFromPicker('edit-servico-motos'));
                    await sincronizarContatosDoServico(servicoAtualId, getSelectedFromPicker('edit-servico-contatos'));
                    await sincronizarProdutosDoServico(servicoAtualId, getSelectedFromPicker('edit-servico-produtos'));
                    fecharModal('modal-edit-servico');
                    await Promise.all([carregarServicosBanco(), carregarMotosBanco(), carregarContatosBanco()]);
                } else { alert("Erro ao atualizar o serviço."); }
            } catch (erro) { console.error(erro); alert("Erro de conexão."); }
        }

        function abrirModalDeletarServico(id) { servicoAtualId = id; abrirModal('modal-delete-servico'); }

        async function deletarServico() {
            try {
                const resposta = await fetchAutenticado(`${API_URL}/servicos/${servicoAtualId}`, { method: 'DELETE' });
                if (resposta && resposta.ok) { fecharModal('modal-delete-servico'); carregarServicosBanco(); }
                else { alert("Erro ao deletar o serviço."); }
            } catch (erro) { console.error(erro); alert("Erro de conexão."); }
        }

        // ================= VINCULAR / DESVINCULAR =================

        async function vincularMotoServico(idServico, idMoto) {
            return fetchAutenticado(`${API_URL}/servicos/${idServico}/motos/${idMoto}`, { method: 'POST' });
        }

        async function desvincularMotoServico(idServico, idMoto) {
            return fetchAutenticado(`${API_URL}/servicos/${idServico}/motos/${idMoto}`, { method: 'DELETE' });
        }

        async function vincularContatoServico(idServico, idContato) {
            return fetchAutenticado(`${API_URL}/servicos/${idServico}/contatos/${idContato}`, { method: 'POST' });
        }

        async function desvincularContatoServico(idServico, idContato) {
            return fetchAutenticado(`${API_URL}/servicos/${idServico}/contatos/${idContato}`, { method: 'DELETE' });
        }

        async function sincronizarMotosDoServico(idServico, idsMotosSelecionadas) {
            const servico = servicos.find(s => String(s.idservico) === String(idServico));
            const atualmenteVinculadas = servico && servico.motos ? servico.motos.map(m => String(m.idmoto)) : [];
            const adicionar = idsMotosSelecionadas.filter(id => !atualmenteVinculadas.includes(id));
            const remover = atualmenteVinculadas.filter(id => !idsMotosSelecionadas.includes(id));
            await Promise.all([
                ...adicionar.map(id => vincularMotoServico(idServico, id)),
                ...remover.map(id => desvincularMotoServico(idServico, id))
            ]);
        }

        async function sincronizarProdutosDoServico(idServico, idsProdutosSelecionados) {
            const servico = servicos.find(s => String(s.idservico) === String(idServico));
            const atualmenteVinculados = servico && servico.produtos ? servico.produtos.map(p => String(p.idproduto)) : [];
            const adicionar = idsProdutosSelecionados.filter(id => !atualmenteVinculados.includes(id));
            const remover = atualmenteVinculados.filter(id => !idsProdutosSelecionados.includes(id));
            await Promise.all([
                ...adicionar.map(id => fetchAutenticado(`${API_URL}/servicos/${idServico}/produtos/${id}`, { method: 'POST' })),
                ...remover.map(id => fetchAutenticado(`${API_URL}/servicos/${idServico}/produtos/${id}`, { method: 'DELETE' }))
            ]);
        }

        async function sincronizarContatosDoServico(idServico, idsContatosSelecionados) {
            const servico = servicos.find(s => String(s.idservico) === String(idServico));
            const atualmenteVinculados = servico && servico.contatos ? servico.contatos.map(c => String(c.idcontato)) : [];
            const adicionar = idsContatosSelecionados.filter(id => !atualmenteVinculados.includes(id));
            const remover = atualmenteVinculados.filter(id => !idsContatosSelecionados.includes(id));
            await Promise.all([
                ...adicionar.map(id => vincularContatoServico(idServico, id)),
                ...remover.map(id => desvincularContatoServico(idServico, id))
            ]);
        }

        // ================= TERMINAR SERVIÇO =================

        function telefoneParaJid(tel) {
            if (!tel) return null;
            const digits = tel.replace(/\D/g, '');
            if (digits.length >= 12 && digits.startsWith('55')) return `${digits}@s.whatsapp.net`;
            return `55${digits}@s.whatsapp.net`;
        }

        function abrirModalTerminar(id) {
            const servico = servicos.find(s => s.idservico === id);
            if (!servico) return;
            servicoAtualId = id;

            const motosNomes = servico.motos && servico.motos.length > 0
                ? servico.motos.map(m => m.nomemoto).join(', ')
                : 'sua moto';
            document.getElementById('terminar-mensagem').value =
                `Olá! O serviço *${servico.nomeservico}* foi concluído. ${motosNomes} está pronta para retirada! 🏍️`;

            const lista = document.getElementById('terminar-contatos-lista');
            if (servico.contatos && servico.contatos.length > 0) {
                lista.innerHTML = servico.contatos.map(c => {
                    const temTel = !!c.telefonecontato;
                    return `<label class="terminar-contato-item${temTel ? '' : ' terminar-sem-tel'}">
                        <input type="checkbox" class="terminar-contato-check"
                            data-jid="${temTel ? telefoneParaJid(c.telefonecontato) : ''}"
                            data-nome="${c.nomecontato}"
                            ${temTel ? 'checked' : 'disabled'}>
                        <span class="terminar-contato-nome">${c.nomecontato}</span>
                        <span class="terminar-tel">${c.telefonecontato || 'Sem telefone'}</span>
                    </label>`;
                }).join('');
            } else {
                lista.innerHTML = '<span class="sd-sem-vinculo">Nenhum contato vinculado a este serviço.</span>';
            }

            document.getElementById('terminar-progresso').style.display = 'none';
            document.getElementById('terminar-actions').style.display = 'flex';
            abrirModal('modal-terminar');
        }

        async function finalizarServico() {
            const servico = servicos.find(s => s.idservico === servicoAtualId);
            if (!servico || servico.statusservico === 'pronto') return;
            await fetchAutenticado(`${API_URL}/servicos/${servicoAtualId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    nomeServico: servico.nomeservico,
                    descricaoServico: servico.descricaoservico || null,
                    observacoes: servico.observacoes || null,
                    valorServico: servico.valorservico || null,
                    statusServico: 'pronto',
                    prioridade: servico.prioridade
                })
            });
        }

        async function enviarMensagensTermino() {
            const mensagem = document.getElementById('terminar-mensagem').value.trim();
            if (!mensagem) { alert('A mensagem não pode estar vazia.'); return; }

            const checks = Array.from(document.querySelectorAll('.terminar-contato-check:checked:not(:disabled)'));
            const contatos = checks.map(c => ({ jid: c.dataset.jid, nome: c.dataset.nome }));

            await finalizarServico();
            await carregarServicosBanco();
            fecharModal('modal-terminar');

            if (contatos.length === 0) {
                mostrarToast('✅ Serviço marcado como <b>pronto</b>.');
                return;
            }

            const usuarioSalvo = localStorage.getItem('usuarioLogado');
            const { usuario } = JSON.parse(usuarioSalvo);

            try {
                await fetchAutenticado(`${API_URL}/whatsapp/enviar-lote`, {
                    method: 'POST',
                    body: JSON.stringify({
                        contatos,
                        mensagem,
                        idServico: servicoAtualId,
                        idOrganizacao: usuario.idOrganizacao
                    })
                });
                mostrarToast(`✅ Enviando para <b>${contatos.length} contato(s)</b> em background.<br>Acompanhe os logs em <b>Relatórios</b>.`, 7000);
            } catch (e) {
                mostrarToast('❌ Erro ao enfileirar envio. Verifique o WhatsApp.');
            }
        }

        // ================= FILTRO =================

        function setupFiltroServico() {
            const filtroServico = document.getElementById('filtro-servico');
            if (filtroServico) {
                filtroServico.addEventListener('input', () => {
                    const q = filtroServico.value.toLowerCase();
                    renderizarServicos(servicos.filter(s =>
                        s.nomeservico.toLowerCase().includes(q) ||
                        (s.descricaoservico || '').toLowerCase().includes(q)
                    ));
                });
            }
        }

        // ================= INIT =================

        document.addEventListener('DOMContentLoaded', async () => {
            await Promise.all([carregarServicosBanco(), carregarMotosBanco(), carregarContatosBanco(), carregarEstoqueBanco()]);
            setupFiltroServico();
            injetarNomeOrg();
            const autoEdit = new URLSearchParams(location.search).get('autoEdit');
            if (autoEdit) abrirModalEditarServico(parseInt(autoEdit));
        });

        // ================= LOGS WHATSAPP =================

        async function carregarLogsWhatsapp() {
            const listaLogs = document.getElementById('lista-logs-wa');
            if (!listaLogs) return;
            const usuarioSalvo = localStorage.getItem('usuarioLogado');
            if (!usuarioSalvo) return;
            const { usuario } = JSON.parse(usuarioSalvo);
            try {
                const resp = await fetchAutenticado(`${API_URL}/whatsapp/logs?idOrganizacao=${usuario.idOrganizacao}`);
                if (!resp || !resp.ok) return;
                const logs = await resp.json();
                listaLogs.innerHTML = '';
                if (logs.length === 0) {
                    listaLogs.innerHTML = `<tr><td colspan="5" class="empty-row">Nenhum envio registrado ainda.</td></tr>`;
                    return;
                }
                logs.forEach(log => {
                    const tr = document.createElement('tr');
                    tr.className = 'item-card';
                    const data = new Date(log.createdat).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
                    const statusHtml = log.status === 'enviado'
                        ? `<span class="log-status-enviado">✅ Enviado</span>`
                        : log.status === 'pendente'
                        ? `<span class="log-status-pendente">⏳ Na fila...</span>`
                        : `<span class="log-status-erro">❌ Erro</span>`;
                    tr.innerHTML = `
                        <td>${data}</td>
                        <td>${log.nomecontato || log.jid}</td>
                        <td>${log.idservico || '-'}</td>
                        <td>${statusHtml}</td>
                        <td class="log-erro-detalhe">${log.erro || '-'}</td>`;
                    listaLogs.appendChild(tr);
                });
                // Auto-refresh enquanto houver mensagens pendentes
                if (logs.some(l => l.status === 'pendente')) {
                    setTimeout(carregarLogsWhatsapp, 10000);
                }
            } catch(e) { console.error(e); }
        }

        async function carregarServicosRelatorio() {
            const tbody = document.getElementById('lista-servicos-rel');
            if (!tbody) return;
            const usuarioSalvo = localStorage.getItem('usuarioLogado');
            if (!usuarioSalvo) return;
            const { usuario } = JSON.parse(usuarioSalvo);
            try {
                const resp = await fetchAutenticado(`${API_URL}/servicos/${usuario.idOrganizacao}`);
                if (!resp || !resp.ok) return;
                const lista = await resp.json();
                const prontos = lista.filter(s => s.statusservico === 'pronto');
                tbody.innerHTML = '';
                if (prontos.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="empty-row">Nenhum serviço concluído ainda.</td></tr>`;
                    return;
                }
                prontos.forEach(s => {
                    const tr = document.createElement('tr');
                    tr.className = 'item-card';
                    const data = s.dataentrada ? new Date(s.dataentrada).toLocaleDateString('pt-BR') : '-';
                    const valor = s.valorservico ? `R$ ${parseFloat(s.valorservico).toFixed(2)}` : '-';
                    const motos = s.motos && s.motos.length > 0 ? s.motos.map(m => m.nomemoto).join(', ') : '-';
                    tr.innerHTML = `<td>${data}</td><td>${s.nomeservico}</td><td>${motos}</td><td style="font-weight:600">${valor}</td>`;
                    tbody.appendChild(tr);
                });
            } catch(e) { console.error(e); }
        }
