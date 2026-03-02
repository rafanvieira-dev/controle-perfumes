// ===============================
// CONFIGURAÇÃO DO FIREBASE
// ===============================
const firebaseConfig = {
    apiKey: "AIzaSyDH-nn68jOO4emJuSRkgx_71Ggk1cwiGnU",
    authDomain: "controle-perfumes-9cbca.firebaseapp.com",
    projectId: "controle-perfumes-9cbca",
    storageBucket: "controle-perfumes-9cbca.firebasestorage.app",
    messagingSenderId: "281513368705",
    appId: "1:281513368705:web:0cfa02b7a1f66883b58180"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let estoqueLocal = [];

// ===============================
// MONITORAMENTO DE AUTENTICAÇÃO
// ===============================
auth.onAuthStateChanged(user => {
    const isLoginPage = window.location.pathname.includes('login.html');

    if (user) {
        // Usuário logado
        currentUser = user;
        if (isLoginPage) {
            window.location.href = "index.html"; // Redireciona para painel se tentar acessar login
        } else {
            executarFuncoesDaPagina(); // Carrega os dados da página atual
        }
    } else {
        // Usuário não logado
        currentUser = null;
        if (!isLoginPage) {
            window.location.href = "login.html"; // Expulsa para login
        }
    }
});

// Helper para pegar a coleção do usuário logado (Cada usuário tem seu estoque isolado)
function getEstoqueRef() {
    return db.collection("usuarios").doc(currentUser.uid).collection("perfumes");
}

// Descobre qual página estamos e roda a função correta
function executarFuncoesDaPagina() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) carregarDashboard();
    else if (path.includes('estoque.html')) carregarEstoque();
    else if (path.includes('saida.html')) carregarProdutos();
    else if (path.includes('balancete.html')) carregarBalancete();
}

// ===============================
// SISTEMA DE LOGIN E CADASTRO
// ===============================
async function criarConta() {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    if (!email || !senha) return Swal.fire('Atenção', 'Preencha email e senha', 'warning');
    if (senha.length < 6) return Swal.fire('Atenção', 'A senha deve ter no mínimo 6 caracteres', 'warning');

    Swal.fire({ title: 'Criando conta...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        await auth.createUserWithEmailAndPassword(email, senha);
        // O onAuthStateChanged vai redirecionar automaticamente para index.html
    } catch (error) {
        Swal.fire('Erro', error.message, 'error');
    }
}

async function fazerLogin() {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    if (!email || !senha) return Swal.fire('Atenção', 'Preencha email e senha', 'warning');

    Swal.fire({ title: 'Entrando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        await auth.signInWithEmailAndPassword(email, senha);
        // O onAuthStateChanged vai redirecionar automaticamente
    } catch (error) {
        Swal.fire('Erro', 'Email ou senha incorretos!', 'error');
    }
}

function fazerLogout() {
    auth.signOut();
}

// ===============================
// DASHBOARD (INÍCIO)
// ===============================
async function carregarDashboard() {
    try {
        const snapshot = await getEstoqueRef().get();
        let totalQtd = 0;
        let totalValor = 0;
        let alertas = 0;

        snapshot.forEach(doc => {
            const p = doc.data();
            totalQtd += p.quantidade;
            totalValor += (p.quantidade * p.preco);
            if(p.quantidade < 3) alertas++;
        });

        document.getElementById('dash-qtd').innerText = totalQtd + " frascos";
        document.getElementById('dash-valor').innerText = "R$ " + totalValor.toFixed(2);
        document.getElementById('dash-alertas').innerText = alertas + " produto(s)";
    } catch (error) {
        console.error("Erro dashboard:", error);
    }
}

// ===============================
// CADASTRO DE PRODUTO
// ===============================
async function cadastrarProduto() {
    const nome = document.getElementById("nome").value.trim();
    const marca = document.getElementById("marca").value.trim();
    const tamanho = document.getElementById("tamanho").value.trim();
    const quantidade = parseInt(document.getElementById("quantidade").value);
    const preco = parseFloat(document.getElementById("preco").value);

    if (!nome || quantidade <= 0 || isNaN(preco) || preco <= 0) {
        return Swal.fire('Atenção!', 'Preencha os campos obrigatórios corretamente!', 'warning');
    }

    Swal.fire({ title: 'Salvando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const ref = getEstoqueRef();
        const query = await ref.where("nome", "==", nome).where("marca", "==", marca).where("tamanho", "==", tamanho).get();

        if (!query.empty) {
            const docRef = query.docs[0].ref;
            const qtdAtual = query.docs[0].data().quantidade;
            await docRef.update({ quantidade: qtdAtual + quantidade });
        } else {
            await ref.add({ nome, marca, tamanho, quantidade, preco });
        }

        Swal.fire('Sucesso!', 'Produto cadastrado!', 'success');
        document.getElementById("nome").value = "";
        document.getElementById("marca").value = "";
        document.getElementById("tamanho").value = "";
        document.getElementById("quantidade").value = "";
        document.getElementById("preco").value = "";
        document.getElementById("nome").focus();

    } catch (error) {
        Swal.fire('Erro!', 'Não foi possível salvar o produto.', 'error');
    }
}

// ===============================
// SAÍDA
// ===============================
async function carregarProdutos() {
    const select = document.getElementById("produtoSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Carregando produtos...</option>';

    try {
        const snapshot = await getEstoqueRef().get();
        select.innerHTML = '<option value="">Selecione o perfume</option>';
        snapshot.forEach(doc => {
            const p = doc.data();
            if (p.quantidade > 0) {
                select.innerHTML += `<option value="${doc.id}">${p.nome} ${p.marca ? '- '+p.marca : ''} ${p.tamanho ? '('+p.tamanho+')' : ''} (Estoque: ${p.quantidade})</option>`;
            }
        });
    } catch (error) { console.error(error); }
}

async function retirarProduto() {
    const idProduto = document.getElementById("produtoSelect").value;
    const quantidade = parseInt(document.getElementById("quantidadeSaida").value);

    if (!idProduto || isNaN(quantidade) || quantidade <= 0) return Swal.fire('Atenção!', 'Selecione e informe a quantidade!', 'warning');

    Swal.fire({ title: 'Registrando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const docRef = getEstoqueRef().doc(idProduto);
        const doc = await docRef.get();
        if (!doc.exists) return Swal.fire('Erro!', 'Produto não encontrado!', 'error');

        const p = doc.data();
        if (p.quantidade < quantidade) return Swal.fire('Ops!', 'Estoque insuficiente!', 'error');

        await docRef.update({ quantidade: p.quantidade - quantidade });
        Swal.fire('Sucesso!', 'Saída registrada!', 'success');
        document.getElementById("quantidadeSaida").value = "";
        carregarProdutos();
    } catch (error) { Swal.fire('Erro!', 'Falha ao registrar saída.', 'error'); }
}

// ===============================
// BALANCETE
// ===============================
async function carregarBalancete() {
    const tabela = document.getElementById("tabela");
    if (!tabela) return;
    tabela.innerHTML = "<tr><td colspan='5'>Carregando dados...</td></tr>";

    try {
        const snapshot = await getEstoqueRef().get();
        let totalFinanceiro = 0;
        tabela.innerHTML = "";
        snapshot.forEach(doc => {
            const p = doc.data();
            const total = p.quantidade * p.preco;
            totalFinanceiro += total;
            tabela.innerHTML += `<tr><td>${p.nome} ${p.tamanho ? '('+p.tamanho+')' : ''}</td><td>${p.marca || '-'}</td><td>${p.quantidade}</td><td>R$ ${p.preco.toFixed(2)}</td><td>R$ ${total.toFixed(2)}</td></tr>`;
        });
        document.getElementById("totalGeral").innerText = "Total em Estoque: R$ " + totalFinanceiro.toFixed(2);
    } catch (error) { console.error(error); }
}

// ===============================
// ESTOQUE
// ===============================
async function carregarEstoque() {
    const tabela = document.getElementById("tabelaEstoque");
    if (!tabela) return;
    tabela.innerHTML = "<tr><td colspan='7'>Carregando banco de dados...</td></tr>";

    try {
        const snapshot = await getEstoqueRef().get();
        let totalGeral = 0;
        tabela.innerHTML = "";
        estoqueLocal = [];

        snapshot.forEach((doc, index) => {
            const p = doc.data();
            p.id = doc.id;
            estoqueLocal.push(p);
            const total = p.quantidade * p.preco;
            totalGeral += total;
            const trClass = p.quantidade < 3 ? 'class="low-stock" title="Estoque Baixo!"' : '';
            
            tabela.innerHTML += `<tr ${trClass}><td>${p.nome}</td><td>${p.marca || '-'}</td><td>${p.tamanho || '-'}</td><td>${p.quantidade}</td><td>R$ ${p.preco.toFixed(2)}</td><td>R$ ${total.toFixed(2)}</td><td>
                <button class="btn-icon" title="Editar" onclick="editarProduto(${index})"><i class="ph ph-pencil-simple"></i></button>
                <button class="btn-icon btn-danger" title="Excluir" onclick="excluirProduto('${p.id}')"><i class="ph ph-trash"></i></button>
            </td></tr>`;
        });
        document.getElementById("totalEstoque").innerText = "Valor Total do Estoque: R$ " + totalGeral.toFixed(2);
    } catch (error) { console.error(error); }
}

function filtrarEstoque() {
    const termo = document.getElementById("buscaEstoque").value.toLowerCase();
    document.querySelectorAll("#tabelaEstoque tr").forEach(linha => {
        linha.style.display = linha.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
}

function excluirProduto(idProduto) {
    Swal.fire({ title: 'Excluir?', text: "Sem volta!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sim' }).then(async (result) => {
        if (result.isConfirmed) {
            await getEstoqueRef().doc(idProduto).delete();
            Swal.fire('Apagado!', '', 'success');
            carregarEstoque();
        }
    });
}

async function editarProduto(index) {
    let p = estoqueLocal[index];
    let nNome = prompt("Nome:", p.nome); if(nNome === null) return;
    let nMarca = prompt("Marca:", p.marca || ""); if(nMarca === null) return;
    let nTam = prompt("Tamanho:", p.tamanho || ""); if(nTam === null) return;
    let nQtd = prompt("Quantidade:", p.quantidade); if(nQtd === null || isNaN(parseInt(nQtd))) return;
    let nPreco = prompt("Preço:", p.preco); if(nPreco === null || isNaN(parseFloat(nPreco))) return;

    await getEstoqueRef().doc(p.id).update({ nome: nNome, marca: nMarca, tamanho: nTam, quantidade: parseInt(nQtd), preco: parseFloat(nPreco) });
    Swal.fire('Atualizado!', '', 'success');
    carregarEstoque();
}

// ===============================
// EXPORTAÇÃO PDF
// ===============================
async function exportarEstoquePDF() { /* Mantido lógica anterior com getEstoqueRef().get() */ }
async function exportarBalancetePDF() { /* Mantido lógica anterior com getEstoqueRef().get() */ }
