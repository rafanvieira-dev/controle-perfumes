function getEstoque() {
    return JSON.parse(localStorage.getItem("estoque")) || [];
}

function salvarEstoque(estoque) {
    localStorage.setItem("estoque", JSON.stringify(estoque));
}

// ===============================
// DASHBOARD (NOVO)
// ===============================
function carregarDashboard() {
    const estoque = getEstoque();
    let totalQtd = 0;
    let totalValor = 0;
    let alertas = 0;

    estoque.forEach(p => {
        totalQtd += p.quantidade;
        totalValor += (p.quantidade * p.preco);
        if(p.quantidade < 3) alertas++; // Alerta se tiver menos de 3 frascos
    });

    const elQtd = document.getElementById('dash-qtd');
    const elValor = document.getElementById('dash-valor');
    const elAlertas = document.getElementById('dash-alertas');

    if(elQtd) elQtd.innerText = totalQtd + " frascos";
    if(elValor) elValor.innerText = "R$ " + totalValor.toFixed(2);
    if(elAlertas) elAlertas.innerText = alertas + " produto(s)";
}

// ===============================
// CADASTRO
// ===============================
function cadastrarProduto() {
    const nome = document.getElementById("nome").value.trim();
    const marca = document.getElementById("marca").value.trim();
    const tamanho = document.getElementById("tamanho").value.trim();
    const quantidade = parseInt(document.getElementById("quantidade").value);
    const preco = parseFloat(document.getElementById("preco").value);

    if (!nome || quantidade <= 0 || preco <= 0) {
        Swal.fire('Atenção!', 'Preencha os campos obrigatórios corretamente!', 'warning');
        return;
    }

    let estoque = getEstoque();
    // Verifica se já existe um perfume com o mesmo nome, marca e tamanho
    const produtoExistente = estoque.find(p => p.nome === nome && p.marca === marca && p.tamanho === tamanho);

    if (produtoExistente) {
        produtoExistente.quantidade += quantidade;
    } else {
        estoque.push({ nome, marca, tamanho, quantidade, preco });
    }

    salvarEstoque(estoque);

    Swal.fire({
        title: 'Sucesso!',
        text: 'Produto cadastrado com sucesso!',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });

    // 🔥 Limpar campos para permitir novo cadastro sem recarregar a página
    document.getElementById("nome").value = "";
    document.getElementById("marca").value = "";
    document.getElementById("tamanho").value = "";
    document.getElementById("quantidade").value = "";
    document.getElementById("preco").value = "";
    document.getElementById("nome").focus();
}

// ===============================
// CARREGAR PRODUTOS NA LISTA (SAÍDA)
// ===============================
function carregarProdutos() {
    const estoque = getEstoque();
    const select = document.getElementById("produtoSelect");

    if (!select) return;

    select.innerHTML = '<option value="">Selecione o perfume</option>';

    estoque.forEach((produto, index) => {
        if (produto.quantidade > 0) {
            // Usamos o index como valor para identificar exatamente o produto
            select.innerHTML += `
                <option value="${index}">
                    ${produto.nome} ${produto.marca ? '- ' + produto.marca : ''} ${produto.tamanho ? '('+produto.tamanho+')' : ''} (Estoque: ${produto.quantidade})
                </option>
            `;
        }
    });
}

// ===============================
// SAÍDA
// ===============================
function retirarProduto() {
    const index = document.getElementById("produtoSelect").value;
    const quantidade = parseInt(document.getElementById("quantidadeSaida").value);

    if (index === "" || quantidade <= 0) {
        Swal.fire('Atenção!', 'Selecione um produto e informe a quantidade!', 'warning');
        return;
    }

    let estoque = getEstoque();
    const produto = estoque[index];

    if (!produto) {
        Swal.fire('Erro!', 'Produto não encontrado!', 'error');
        return;
    }

    if (produto.quantidade < quantidade) {
        Swal.fire('Ops!', 'Estoque insuficiente para esta saída!', 'error');
        return;
    }

    produto.quantidade -= quantidade;
    salvarEstoque(estoque);

    Swal.fire({
        title: 'Sucesso!',
        text: 'Saída registrada com sucesso!',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });

    document.getElementById("quantidadeSaida").value = "";
    carregarProdutos(); // Atualiza a lista dropdown
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
                <td>${produto.nome} ${produto.tamanho ? '('+produto.tamanho+')' : ''}</td>
                <td>${produto.marca || '-'}</td>
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
        
        // Aplica classe de alerta se o estoque for menor que 3
        const trClass = produto.quantidade < 3 ? 'class="low-stock" title="Estoque Baixo!"' : '';

        tabela.innerHTML += `
            <tr ${trClass}>
                <td>${produto.nome}</td>
                <td>${produto.marca || '-'}</td>
                <td>${produto.tamanho || '-'}</td>
                <td>${produto.quantidade}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td>R$ ${totalProduto.toFixed(2)}</td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="editarProduto(${index})"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-icon btn-danger" title="Excluir" onclick="excluirProduto(${index})"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `;
    });

    document.getElementById("totalEstoque").innerText =
        "Valor Total do Estoque: R$ " + totalGeral.toFixed(2);
}

// Função de Busca no Estoque (NOVO)
function filtrarEstoque() {
    const termo = document.getElementById("buscaEstoque").value.toLowerCase();
    const linhas = document.querySelectorAll("#tabelaEstoque tr");

    linhas.forEach(linha => {
        const texto = linha.innerText.toLowerCase();
        linha.style.display = texto.includes(termo) ? "" : "none";
    });
}

// ===============================
// EXCLUIR PRODUTO
// ===============================
function excluirProduto(index) {
    Swal.fire({
        title: 'Tem certeza?',
        text: "Você não poderá reverter a exclusão deste produto!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#1F5C46',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            let estoque = getEstoque();
            estoque.splice(index, 1);
            salvarEstoque(estoque);
            carregarEstoque();
            Swal.fire('Excluído!', 'O produto foi removido do estoque.', 'success');
        }
    });
}

// ===============================
// EDITAR PRODUTO
// ===============================
function editarProduto(index) {
    let estoque = getEstoque();
    let produto = estoque[index];

    let novoNome = prompt("Editar nome:", produto.nome);
    if (novoNome === null) return;
    
    let novaMarca = prompt("Editar marca:", produto.marca || "");
    if (novaMarca === null) return;
    
    let novoTamanho = prompt("Editar tamanho (ex: 50ml, 100ml):", produto.tamanho || "");
    if (novoTamanho === null) return;

    let novaQuantidade = prompt("Editar quantidade:", produto.quantidade);
    if (novaQuantidade === null) return;

    let novoPreco = prompt("Editar preço unitário:", produto.preco);
    if (novoPreco === null) return;

    estoque[index] = {
        nome: novoNome,
        marca: novaMarca,
        tamanho: novoTamanho,
        quantidade: parseInt(novaQuantidade),
        preco: parseFloat(novoPreco)
    };

    salvarEstoque(estoque);
    carregarEstoque();
    Swal.fire('Atualizado!', 'Os dados do produto foram alterados.', 'success');
}

// ===============================
// EXPORTAÇÃO PDF
// ===============================
function exportarEstoquePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let produtos = getEstoque();

    if (!produtos || produtos.length === 0) {
        Swal.fire('Atenção!', 'Nenhum produto no estoque para exportar.', 'warning');
        return;
    }

    doc.setFontSize(16);
    doc.text("RELATÓRIO DE ESTOQUE", 20, 20);
    doc.setFontSize(10);
    doc.text("Gerado em: " + new Date().toLocaleString(), 20, 30);

    let y = 40;
    produtos.forEach((produto) => {
        doc.text(
            `${produto.nome} ${produto.marca ? '- '+produto.marca : ''} ${produto.tamanho ? '('+produto.tamanho+')' : ''} | Qtd: ${produto.quantidade} | Preço: R$ ${produto.preco.toFixed(2)}`,
            20, y
        );
        y += 8;
    });

    doc.save("relatorio_estoque.pdf");
}

function exportarBalancetePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const estoque = getEstoque();

    if (!estoque || estoque.length === 0) {
        Swal.fire('Atenção!', 'Nenhum produto no estoque para exportar.', 'warning');
        return;
    }

    doc.setFontSize(16);
    doc.text("RELATÓRIO DE BALANCETE", 20, 20);
    doc.setFontSize(10);
    doc.text("Gerado em: " + new Date().toLocaleString(), 20, 30);

    let y = 40;
    let totalFinanceiro = 0;

    estoque.forEach(produto => {
        const totalProduto = produto.quantidade * produto.preco;
        totalFinanceiro += totalProduto;
        doc.text(
            `${produto.nome} | Qtd: ${produto.quantidade} | R$ ${produto.preco.toFixed(2)} | Total: R$ ${totalProduto.toFixed(2)}`,
            20, y
        );
        y += 8;
    });

    y += 10;
    doc.setFontSize(12);
    doc.text("TOTAL EM ESTOQUE: R$ " + totalFinanceiro.toFixed(2), 20, y);
    doc.save("relatorio_balancete.pdf");
}
