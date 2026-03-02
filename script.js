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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let estoqueLocal = [];

// Variáveis para a Frente de Caixa (PDV)
let produtosVenda = {}; // Guarda os produtos carregados do banco
let carrinho = []; // Carrinho de compras atual

// ===============================
// MONITORAMENTO DE AUTENTICAÇÃO
// ===============================
auth.onAuthStateChanged(user => {
    const isLoginPage = window.location.pathname.includes('login.html');
    if (user) {
        currentUser = user;
        if (isLoginPage) window.location.href = "index.html"; 
        else executarFuncoesDaPagina();
    } else {
        currentUser = null;
        if (!isLoginPage) window.location.href = "login.html";
    }
});

function getEstoqueRef() {
    return db.collection("usuarios").doc(currentUser.uid).collection("perfumes");
}

function executarFuncoesDaPagina() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) carregarDashboard();
    else if (path.includes('estoque.html')) carregarEstoque();
    else if (path.includes('saida.html')) carregarProdutos();
    else if (path.includes('balancete.html')) carregarBalancete();
}

async function criarConta() {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    if (!email || !senha) return Swal.fire('Atenção', 'Preencha email e senha', 'warning');
    if (senha.length < 6) return Swal.fire('Atenção', 'A senha deve ter no mínimo 6 caracteres', 'warning');

    Swal.fire({ title: 'Criando conta...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
    try { await auth.createUserWithEmailAndPassword(email, senha); } 
    catch (error) { Swal.fire('Erro', error.message, 'error'); }
}

async function fazerLogin() {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    if (!email || !senha) return Swal.fire('Atenção', 'Preencha email e senha', 'warning');

    Swal.fire({ title: 'Entrando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
    try { await auth.signInWithEmailAndPassword(email, senha); } 
    catch (error) { Swal.fire('Erro', 'Email ou senha incorretos!', 'error'); }
}

function fazerLogout() { auth.signOut(); }

// ===============================
// DASHBOARD
// ===============================
async function carregarDashboard() {
    try {
        const snapshot = await getEstoqueRef().get();
        let totalQtd = 0; let totalValor = 0; let alertas = 0;
        snapshot.forEach(doc => {
            const p = doc.data();
            totalQtd += p.quantidade;
            totalValor += (p.quantidade * p.preco);
            if(p.quantidade < 3) alertas++;
        });
        document.getElementById('dash-qtd').innerText = totalQtd + " frascos";
        document.getElementById('dash-valor').innerText = "R$ " + totalValor.toFixed(2);
        document.getElementById('dash-alertas').innerText = alertas + " produto(s)";
    } catch (error) { console.error(error); }
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
    
    const campoCodigo = document.getElementById("codigoBarras");
    const codigoBarras = campoCodigo ? campoCodigo.value.trim() : "";

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
            await docRef.update({ quantidade: qtdAtual + quantidade, codigoBarras: codigoBarras }); 
        } else {
            await ref.add({ nome, marca, tamanho, quantidade, preco, codigoBarras });
        }

        Swal.fire('Sucesso!', 'Produto cadastrado!', 'success');
        document.getElementById("nome").value = "";
        document.getElementById("marca").value = "";
        document.getElementById("tamanho").value = "";
        document.getElementById("quantidade").value = "";
        document.getElementById("preco").value = "";
        if(campoCodigo) campoCodigo.value = "";
        document.getElementById("nome").focus();

    } catch (error) { Swal.fire('Erro!', 'Não foi possível salvar o produto.', 'error'); }
}

let leitorCamera = null;
function abrirCameraCadastro() {
    const containerId = "reader-cadastro";
    document.getElementById(containerId).style.display = "block";
    if (!leitorCamera) {
        leitorCamera = new Html5QrcodeScanner(containerId, { fps: 10, qrbox: {width: 250, height: 100} }, false);
        leitorCamera.render((codigo) => {
            document.getElementById("codigoBarras").value = codigo;
            leitorCamera.clear(); leitorCamera = null;
            document.getElementById(containerId).style.display = "none";
            Swal.fire('Bip!', 'Código lido com sucesso!', 'success');
        });
    }
}

// ===============================
// FRENTE DE CAIXA (NOVO PDV)
// ===============================

// 1. Carrega os produtos para a memória
async function carregarProdutos() {
    const select = document.getElementById("produtoSelect");
    if (!select) return;
    
    select.innerHTML = '<option value="">Carregando produtos...</option>';
    produtosVenda = {}; // Limpa memória
    carrinho = []; // Limpa carrinho ao abrir
    atualizarTelaCarrinho();

    try {
        const snapshot = await getEstoqueRef().get();
        select.innerHTML = '<option value="">Selecione o perfume (Manual)</option>';
        snapshot.forEach(doc => {
            const p = doc.data();
            if (p.quantidade > 0) {
                produtosVenda[doc.id] = { id: doc.id, ...p };
                select.innerHTML += `<option value="${doc.id}">${p.nome} ${p.marca ? '- '+p.marca : ''} ${p.tamanho ? '('+p.tamanho+')' : ''} (Est: ${p.quantidade} | R$ ${p.preco.toFixed(2)})</option>`;
            }
        });
    } catch (error) { console.error(error); }
}

// 2. Busca por Código Digitado ou Escaneado
function verificarEnterSaida(event) {
    if (event.key === "Enter") buscarPorCodigoDigitado();
}

function buscarPorCodigoDigitado() {
    const codigo = document.getElementById("codigoBarrasSaida").value.trim();
    if(!codigo) return Swal.fire('Atenção', 'Digite um código.', 'warning');

    let idEncontrado = null;
    for(let key in produtosVenda) {
        if(produtosVenda[key].codigoBarras === codigo) {
            idEncontrado = key;
            break;
        }
    }
    
    if(idEncontrado) {
        adicionarItemAoCarrinhoLogic(idEncontrado, 1); // Adiciona 1 unidade como no mercado
        Swal.fire({ title: 'Bip!', text: `${produtosVenda[idEncontrado].nome} adicionado.`, icon: 'success', timer: 1000, showConfirmButton: false });
        
        // Limpa pra próxima leitura
        document.getElementById("codigoBarrasSaida").value = "";
        document.getElementById("codigoBarrasSaida").focus();
    } else {
        Swal.fire('Ops!', `Produto com código (${codigo}) não encontrado ou sem estoque.`, 'error');
    }
}

function abrirCameraSaida() {
    const containerId = "reader-saida";
    document.getElementById(containerId).style.display = "block";
    if (!leitorCamera) {
        leitorCamera = new Html5QrcodeScanner(containerId, { fps: 10, qrbox: {width: 250, height: 100} }, false);
        leitorCamera.render((codigo) => {
            leitorCamera.clear(); leitorCamera = null;
            document.getElementById(containerId).style.display = "none";
            
            // Joga no input e finge que apertou "enter"
            document.getElementById("codigoBarrasSaida").value = codigo;
            buscarPorCodigoDigitado(); 
        });
    }
}

// 3. Adiciona item pelo Select Manual
function adicionarAoCarrinhoBtn() {
    const idProduto = document.getElementById("produtoSelect").value;
    const qtd = parseInt(document.getElementById("quantidadeSaida").value);
    if(!idProduto || isNaN(qtd) || qtd <= 0) return Swal.fire('Atenção', 'Selecione um produto e a quantidade', 'warning');
    adicionarItemAoCarrinhoLogic(idProduto, qtd);
}

// 4. Lógica central para jogar no carrinho e verificar estoque
function adicionarItemAoCarrinhoLogic(idProduto, qtdAdicional) {
    const prod = produtosVenda[idProduto];
    let itemExistente = carrinho.find(i => i.id === idProduto);
    let qtdNoCarrinho = itemExistente ? itemExistente.quantidade : 0;

    if (qtdNoCarrinho + qtdAdicional > prod.quantidade) {
        Swal.fire('Estoque Insuficiente', `Você tem apenas ${prod.quantidade} unidades de ${prod.nome}.`, 'error');
        return;
    }

    if (itemExistente) {
        itemExistente.quantidade += qtdAdicional;
    } else {
        carrinho.push({ id: prod.id, nome: prod.nome, preco: prod.preco, quantidade: qtdAdicional });
    }

    if(document.getElementById("produtoSelect")) document.getElementById("produtoSelect").value = "";
    if(document.getElementById("quantidadeSaida")) document.getElementById("quantidadeSaida").value = "1";
    atualizarTelaCarrinho();
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarTelaCarrinho();
}

function atualizarTelaCarrinho() {
    const tbody = document.getElementById("tabelaCarrinho");
    const elTotal = document.getElementById("totalVenda");
    if(!tbody) return;

    if(carrinho.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color: #888;">Nenhum produto adicionado.</td></tr>';
        elTotal.innerText = "Total: R$ 0,00";
        return;
    }

    tbody.innerHTML = "";
    let total = 0;

    carrinho.forEach((item, index) => {
        const subtotal = item.quantidade * item.preco;
        total += subtotal;
        tbody.innerHTML += `
            <tr>
                <td>${item.nome}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${item.preco.toFixed(2)}</td>
                <td>R$ ${subtotal.toFixed(2)}</td>
                <td><button class="btn-icon btn-danger" onclick="removerDoCarrinho(${index})" title="Remover"><i class="ph ph-trash"></i></button></td>
            </tr>
        `;
    });
    elTotal.innerText = `Total: R$ ${total.toFixed(2)}`;
}

// 5. Finalizar a Venda
async function finalizarVenda() {
    if(carrinho.length === 0) return Swal.fire('Atenção', 'O carrinho está vazio!', 'warning');

    Swal.fire({ title: 'Emitindo venda...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    try {
        const batch = db.batch(); // Permite atualizar vários produtos no banco ao mesmo tempo

        for (let item of carrinho) {
            const docRef = getEstoqueRef().doc(item.id);
            const prodBD = produtosVenda[item.id];
            const novaQtd = prodBD.quantidade - item.quantidade;
            batch.update(docRef, { quantidade: novaQtd });
        }

        await batch.commit();

        Swal.fire('Venda Concluída!', 'Estoque atualizado com sucesso.', 'success');
        carrinho = []; // Esvazia o carrinho
        atualizarTelaCarrinho();
        carregarProdutos(); // Atualiza a lista da tela com os estoques novos
    } catch (error) {
        console.error(error);
        Swal.fire('Erro!', 'Não foi possível finalizar a venda.', 'error');
    }
}

// ===============================
// BALANCETE, ESTOQUE, EXPORTAÇÃO PDF (Mantidos iguais)
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

async function exportarEstoquePDF() { /* Função mantida oculta para brevidade, use a mesma de antes se desejar */ }
async function exportarBalancetePDF() { /* Função mantida oculta para brevidade, use a mesma de antes se desejar */ }
