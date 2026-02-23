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

    carregarProdutos();
    document.getElementById("quantidadeSaida").value = "";
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
