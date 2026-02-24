function getEstoque() {
    return JSON.parse(localStorage.getItem("estoque")) || [];
}

function salvarEstoque(estoque) {
    localStorage.setItem("estoque", JSON.stringify(estoque));
}

// ===============================
// CADASTRO
// ===============================
function cadastrarProduto() {
    const nome = document.getElementById("nome").value;
    const quantidade = parseInt(document.getElementById("quantidade").value);
    const preco = parseFloat(document.getElementById("preco").value);

    if (!nome || quantidade <= 0 || preco <= 0) {
        alert("Preencha todos os campos corretamente!");
        return;
    }

    let estoque = getEstoque();
    const produtoExistente = estoque.find(p => p.nome === nome);

    if (produtoExistente) {
        produtoExistente.quantidade += quantidade;
    } else {
        estoque.push({ nome, quantidade, preco });
    }

    salvarEstoque(estoque);

    alert("Produto cadastrado com sucesso!");

    // 🔥 NOVO: voltar para página principal
    window.location.href = "index.html";
}

// ===============================
// CARREGAR PRODUTOS NA LISTA
// ===============================
function carregarProdutos() {
    const estoque = getEstoque();
    const select = document.getElementById("produtoSelect");

    if (!select) return;

    select.innerHTML = '<option value="">Selecione o perfume</option>';

    estoque.forEach(produto => {
        if (produto.quantidade > 0) {
            select.innerHTML += `
                <option value="${produto.nome}">
                    ${produto.nome} (Estoque: ${produto.quantidade})
                </option>
            `;
        }
    });
}

// ===============================
// SAÍDA
// ===============================
function retirarProduto() {
    const nome = document.getElementById("produtoSelect").value;
    const quantidade = parseInt(document.getElementById("quantidadeSaida").value);

    if (!nome || quantidade <= 0) {
        alert("Selecione um produto e informe a quantidade!");
        return;
    }

    let estoque = getEstoque();
    const produto = estoque.find(p => p.nome === nome);

    if (!produto) {
        alert("Produto não encontrado!");
        return;
    }

    if (produto.quantidade < quantidade) {
        alert("Estoque insuficiente!");
        return;
    }

    produto.quantidade -= quantidade;
    salvarEstoque(estoque);

    alert("Saída registrada com sucesso!");

    // 🔥 NOVO: voltar para página principal
    window.location.href = "index.html";
}

// ===============================
// BALANCETE
// ===============================
function carregarBalancete() {
    const estoque = getEstoque();
    const tabela = document.getElementById("tabela");

    if (!tabela) return;

    let totalFinanceiro = 0;
    tabela.innerHTML = "";

    estoque.forEach(produto => {
        const totalProduto = produto.quantidade * produto.preco;
        totalFinanceiro += totalProduto;

        tabela.innerHTML += `
            <tr>
                <td>${produto.nome}</td>
                <td>${produto.quantidade}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td>R$ ${totalProduto.toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById("totalGeral").innerText =
        "Total em Estoque: R$ " + totalFinanceiro.toFixed(2);
}
// ===============================
// PÁGINA ESTOQUE COM AÇÕES
// ===============================
function carregarEstoque() {
    const estoque = getEstoque();
    const tabela = document.getElementById("tabelaEstoque");

    if (!tabela) return;

    let totalGeral = 0;
    tabela.innerHTML = "";

    estoque.forEach((produto, index) => {
        const totalProduto = produto.quantidade * produto.preco;
        totalGeral += totalProduto;

        tabela.innerHTML += `
            <tr>
                <td>${produto.nome}</td>
                <td>${produto.quantidade}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td>R$ ${totalProduto.toFixed(2)}</td>
                <td>
                    <button type="button" onclick="editarProduto(${index})">Editar</button>
                    <button type="button" onclick="excluirProduto(${index})">Excluir</button>
                </td>
            </tr>
        `;
    });

    document.getElementById("totalEstoque").innerText =
        "Valor Total do Estoque: R$ " + totalGeral.toFixed(2);
}

// ===============================
// EXCLUIR PRODUTO
// ===============================
function excluirProduto(index) {
    let estoque = getEstoque();

    if (confirm("Tem certeza que deseja excluir este produto?")) {
        estoque.splice(index, 1);
        salvarEstoque(estoque);
        carregarEstoque();
    }
}

// ===============================
// EDITAR PRODUTO
// ===============================
function editarProduto(index) {
    let estoque = getEstoque();
    let produto = estoque[index];

    let novoNome = prompt("Editar nome:", produto.nome);
    if (novoNome === null) return;

    let novaQuantidade = prompt("Editar quantidade:", produto.quantidade);
    if (novaQuantidade === null) return;

    let novoPreco = prompt("Editar preço:", produto.preco);
    if (novoPreco === null) return;

    estoque[index] = {
        nome: novoNome,
        quantidade: parseInt(novaQuantidade),
        preco: parseFloat(novoPreco)
    };

    salvarEstoque(estoque);
    carregarEstoque();
}
async function exportarEstoquePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("RELATÓRIO DE ESTOQUE", 20, 20);

    doc.setFontSize(10);
    doc.text("Gerado em: " + new Date().toLocaleString(), 20, 30);

    let y = 40;

    let produtos = JSON.parse(localStorage.getItem("produtos")) || [];

    produtos.forEach((produto, index) => {
        doc.text(
            `${produto.nome} | Qtd: ${produto.quantidade} | Preço: R$ ${produto.preco}`,
            20,
            y
        );
        y += 8;
    });

    doc.save("relatorio_estoque.pdf");
}
async function exportarBalancetePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("RELATÓRIO DE BALANCETE", 20, 20);

    doc.setFontSize(10);
    doc.text("Gerado em: " + new Date().toLocaleString(), 20, 30);

    let y = 40;

    let movimentacoes = JSON.parse(localStorage.getItem("movimentacoes")) || [];

    movimentacoes.forEach((mov) => {
        doc.text(
            `${mov.data} | ${mov.tipo} | ${mov.nome} | Qtd: ${mov.quantidade}`,
            20,
            y
        );
        y += 8;
    });

    doc.save("relatorio_balancete.pdf");
}
