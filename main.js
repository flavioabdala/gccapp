// main.js - Código Completo e Otimizado

// Configuração de campos (Altere aqui se os nomes no seu Firestore forem diferentes)
const FIELDS = {
    processo: 'processoSei',     // Campo do número SEI
    objeto: 'objeto',            // Campo do objeto do contrato
    empresa: 'nomeEmpresa',      // Campo do nome da empresa
    vigencia: 'vigenciaAtual',   // Campo da data de vencimento (Formato YYYY-MM-DD)
    renovacaoCount: 'numeroRenovacao'
};

const renovacaoItems = [
    "Ofício", 
    "Memorando-circular", 
    "Resposta da Empresa", 
    "Resposta das Unidades", 
    "Memória de Cálculo", 
    "Pesquisa de Preço", 
    "Ausência de ETP", 
    "Check List", 
    "Justificativa"
];

// --- Inicialização ---
function initApp() {
    loadContracts();
    setupEventListeners();
}

function setupEventListeners() {
    // Busca em tempo real (Debounce para performance)
    const searchInput = document.getElementById('contractSearchInput');
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => loadContracts(e.target.value), 300);
    });

    document.getElementById('btnLogout').addEventListener('click', () => auth.signOut());
}

// --- Renderização dos Contratos ---
async function loadContracts(searchTerm = '') {
    const listContainer = document.getElementById('contractsList');
    
    try {
        let query = db.collection('contracts');
        // Nota: Filtros complexos no client-side para simplicidade sem índices compostos
        const snapshot = await query.get();
        
        const contracts = [];
        snapshot.forEach(doc => {
            contracts.push({ id: doc.id, ...doc.data() });
        });

        // Filtragem Client-Side (Case insensitive)
        const filtered = contracts.filter(c => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (c[FIELDS.processo] || '').toLowerCase().includes(term) ||
                   (c[FIELDS.objeto] || '').toLowerCase().includes(term) ||
                   (c[FIELDS.empresa] || '').toLowerCase().includes(term);
        });

        listContainer.innerHTML = '';
        
        if (filtered.length === 0) {
            listContainer.innerHTML = '<div class="text-center text-gray-500 mt-10">Nenhum contrato encontrado.</div>';
            return;
        }

        filtered.forEach(data => {
            const card = createContractCard(data);
            listContainer.innerHTML += card;
        });

    } catch (error) {
        console.error("Erro ao carregar:", error);
        listContainer.innerHTML = '<div class="text-red-500 text-center">Erro ao carregar dados.</div>';
    }
}

// Cria o HTML do Card (Sem a palavra SEI, layout ajustado)
function createContractCard(data) {
    const statusBadges = getStatusBadges(data[FIELDS.vigencia]);
    const objetoTexto = data[FIELDS.objeto] ? `- ${data[FIELDS.objeto]}` : '';

    return `
    <div class="contract-card">
        <div class="card-header">
            <div class="card-title-group">
                <span class="processo-numero">${data[FIELDS.processo]}</span>
                <span class="contrato-objeto">${objetoTexto}</span>
            </div>
            <div class="status-container">
                ${statusBadges}
            </div>
        </div>
        
        <div class="card-footer">
            <span class="font-medium text-gray-700">
                <i class="fas fa-building mr-1"></i> ${data[FIELDS.empresa]}
            </span>
            <div class="action-buttons">
                <button onclick="openHistory('${data.id}')" class="btn-history">
                    <i class="fas fa-history"></i> Histórico
                </button>
                <button onclick="startRenovacao('${data.id}', '${data[FIELDS.processo]}')" class="btn-renew">
                    <i class="fas fa-sync-alt"></i> Renovação
                </button>
            </div>
        </div>
    </div>`;
}

// Lógica de Status (Retorna múltiplos badges se necessário)
function getStatusBadges(dateString) {
    if (!dateString) return '<span class="badge bg-gray-400">Sem Data</span>';

    const hoje = new Date();
    // Zerar horas para comparação justa de dias
    hoje.setHours(0,0,0,0);
    
    const vencimento = new Date(dateString + "T00:00:00");
    const diffTime = vencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let badgesHtml = '';

    // 1. Status Vencido (Prioridade Máxima)
    if (diffDays < 0) {
        return '<span class="badge bg-expired">Vencido</span>';
    }

    // 2. Status Vigente (Base)
    // Se não está vencido, está vigente.
    badgesHtml += '<span class="badge bg-active">Vigente</span>';

    // 3. Status de Alerta (Crítico ou A Vencer) - Adiciona AO LADO do Vigente
    if (diffDays <= 30) {
        badgesHtml += '<span class="badge bg-critical">Crítico</span>';
    } else if (diffDays <= 90) {
        badgesHtml += '<span class="badge bg-warning">A Vencer</span>';
    }

    return badgesHtml;
}

// --- Lógica de Renovação ---

async function startRenovacao(contractId, processoNumero) {
    const modal = document.getElementById('renovacaoModal');
    document.getElementById('renovacao-contract-id').value = contractId;
    document.getElementById('renovacao-subtitle').innerText = `Processo: ${processoNumero}`;
    document.getElementById('renovacao-numero-aditivo').value = '';
    document.getElementById('renovacao-meses').value = '';
    
    const checklistContainer = document.getElementById('renovacao-checklist-container');
    checklistContainer.innerHTML = '<div class="col-span-2 text-center text-gray-400">Carregando progresso...</div>';
    
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Para centralizar com flexbox

    // Carregar progresso salvo
    try {
        const doc = await db.collection('contracts').doc(contractId).collection('renovacao_temp').doc('progresso').get();
        const savedProgress = doc.exists ? doc.data() : {};

        renderChecklist(contractId, savedProgress);
        checkRenovacaoStatus(savedProgress);
    } catch (e) {
        console.error("Erro ao carregar checklist", e);
        renderChecklist(contractId, {});
    }
}

function renderChecklist(contractId, savedData) {
    const container = document.getElementById('renovacao-checklist-container');
    container.innerHTML = '';

    renovacaoItems.forEach(item => {
        const key = item.toLowerCase().replace(/\s+/g, "_");
        const isChecked = savedData[key] === true;

        const div = document.createElement('div');
        div.className = `checklist-item ${isChecked ? 'bg-blue-50 border-blue-200' : ''}`;
        div.onclick = (e) => {
            // Previne clique duplo se clicar direto no input
            if (e.target.type !== 'checkbox') {
                const checkbox = div.querySelector('input');
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        };

        div.innerHTML = `
            <input type="checkbox" id="chk_${key}" ${isChecked ? 'checked' : ''}>
            <label class="checklist-label" for="chk_${key}">${item}</label>
        `;

        // Evento de Salvar
        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', async (e) => {
            const checked = e.target.checked;
            // Efeito visual imediato
            if(checked) div.classList.add('bg-blue-50', 'border-blue-200');
            else div.classList.remove('bg-blue-50', 'border-blue-200');

            await saveProgress(contractId, key, checked);
        });

        container.appendChild(div);
    });
}

async function saveProgress(contractId, key, isChecked) {
    try {
        await db.collection('contracts').doc(contractId).collection('renovacao_temp').doc('progresso').set({
            [key]: isChecked
        }, { merge: true });
        
        // Atualiza UI de status "Renovação Iniciada"
        document.getElementById('renovacao-status-box').classList.remove('hidden');
        
    } catch (e) {
        console.error("Erro ao salvar progresso:", e);
    }
}

function checkRenovacaoStatus(data) {
    const hasAny = Object.values(data).some(v => v === true);
    if (hasAny) {
        document.getElementById('renovacao-status-box').classList.remove('hidden');
    } else {
        document.getElementById('renovacao-status-box').classList.add('hidden');
    }
}

async function efetivarRenovacao() {
    const contractId = document.getElementById('renovacao-contract-id').value;
    const numeroAditivo = document.getElementById('renovacao-numero-aditivo').value;
    const meses = document.getElementById('renovacao-meses').value;

    if (!numeroAditivo) return alert("Por favor, informe o número do processo/aditivo.");
    if (!meses || isNaN(meses) || parseInt(meses) <= 0) return alert("Informe uma quantidade de meses válida.");

    // Validação Final do Checklist no Banco (Segurança)
    const docSnap = await db.collection('contracts').doc(contractId).collection('renovacao_temp').doc('progresso').get();
    const data = docSnap.exists ? docSnap.data() : {};
    
    // Verifica se TODOS os itens da lista oficial estão true no banco
    const pendentes = renovacaoItems.filter(item => {
        const key = item.toLowerCase().replace(/\s+/g, "_");
        return data[key] !== true;
    });

    if (pendentes.length > 0) {
        alert(`Não é possível renovar.\n\nItens pendentes:\n- ${pendentes.join('\n- ')}`);
        return;
    }

    // Processar Renovação
    try {
        const contractRef = db.collection('contracts').doc(contractId);
        const contractDoc = await contractRef.get();
        const currentData = contractDoc.data();

        // Calcular nova data
        const currentVigencia = new Date(currentData[FIELDS.vigencia] + "T00:00:00");
        currentVigencia.setMonth(currentVigencia.getMonth() + parseInt(meses));
        const newVigenciaStr = currentVigencia.toISOString().split('T')[0];

        const batch = db.batch();

        // 1. Atualizar contrato
        batch.update(contractRef, {
            [FIELDS.vigencia]: newVigenciaStr,
            [FIELDS.renovacaoCount]: (currentData[FIELDS.renovacaoCount] || 0) + 1,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Adicionar ao Histórico (Caminho corrigido)
        const historyRef = contractRef.collection('history').doc();
        batch.set(historyRef, {
            type: 'Renovação',
            description: `Renovação de ${meses} meses. Novo vencimento: ${newVigenciaStr}. Processo: ${numeroAditivo}`,
            date: new Date().toISOString().split('T')[0],
            user: auth.currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Para ordenação
        });

        // 3. Limpar progresso temporário
        const progressoRef = contractRef.collection('renovacao_temp').doc('progresso');
        batch.delete(progressoRef);

        await batch.commit();

        alert("Renovação realizada com sucesso!");
        closeModal('renovacaoModal');
        loadContracts(); // Recarrega lista

    } catch (e) {
        console.error("Erro fatal na renovação:", e);
        alert("Erro ao processar renovação. Verifique o console.");
    }
}

// --- Histórico ---

async function openHistory(contractId) {
    const modal = document.getElementById('historyModal');
    const content = document.getElementById('historyContent');
    content.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        // Ordena por timestamp descrescente (mais recente primeiro)
        const snapshot = await db.collection('contracts').doc(contractId).collection('history')
                                 .orderBy('timestamp', 'desc') 
                                 .get();

        if (snapshot.empty) {
            content.innerHTML = '<div class="text-gray-500 text-center">Nenhum histórico registrado.</div>';
            return;
        }

        let html = '<ul class="space-y-4">';
        snapshot.forEach(doc => {
            const h = doc.data();
            // Formatar data se for timestamp ou string
            let dateDisplay = h.date;
            if(h.timestamp && h.timestamp.toDate) {
                dateDisplay = h.timestamp.toDate().toLocaleDateString('pt-BR') + ' ' + h.timestamp.toDate().toLocaleTimeString('pt-BR');
            }

            html += `
                <li class="border-l-4 border-blue-500 bg-gray-50 p-3 rounded">
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>${dateDisplay || 'Data desc.'}</span>
                        <span class="font-semibold">${h.user || 'Sistema'}</span>
                    </div>
                    <div class="font-bold text-gray-800">${h.type || 'Ação'}</div>
                    <div class="text-sm text-gray-600">${h.description}</div>
                </li>
            `;
        });
        html += '</ul>';
        content.innerHTML = html;

    } catch (e) {
        console.error("Erro histórico:", e);
        // Fallback: tentar sem ordenação caso o índice não exista ainda
        try {
            const snapshotBackup = await db.collection('contracts').doc(contractId).collection('history').get();
            // Renderizar backup... (simplificado aqui)
            content.innerHTML = '<div class="text-yellow-600">Erro de índice. Histórico pode estar desordenado.</div>';
        } catch(e2) {
            content.innerHTML = '<div class="text-red-500">Não foi possível carregar o histórico.</div>';
        }
    }
}

// --- Utilitários ---
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
        event.target.classList.remove('flex');
    }
}
