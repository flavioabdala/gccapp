// main.js

// Certifique-se de que 'auth' e 'db' foram inicializados em firebase-config.js
// e que ADMIN_UIDS também está definido lá.

document.addEventListener('DOMContentLoaded', async () => {
    // --- Referências DOM Comuns ---
    const btnLogout = document.getElementById('btnLogout');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const adminOnlyElements = document.querySelectorAll('.admin-only'); // Elementos visíveis apenas para admin

    // --- Elementos do Modal de Contrato ---
    const contractModal = document.getElementById('contractModal');
    const contractForm = document.getElementById('contractForm');
    const closeButtons = document.querySelectorAll('.close-button'); // Botões de fechar de todos os modais
    const btnAddContract = document.getElementById('btnAddContract');
    const contractsList = document.getElementById('contractsList');

    const processoSeiInput = document.getElementById('processoSei');
    const numeroContratoInput = document.getElementById('numeroContrato');
    const nomeEmpresaInput = document.getElementById('nomeEmpresa');
    const objetoInput = document.getElementById('objeto');
    const dataInicialProcessoInput = document.getElementById('dataInicialProcesso');
    const tipoLeiSelect = document.getElementById('tipoLei');
    const prazoMaximoDisplay = document.getElementById('prazoMaximoDisplay');
    const vigenciaAtualInput = document.getElementById('vigenciaAtual');
    const numeroRenovacaoInput = document.getElementById('numeroRenovacao');
    const valorAtualizadoInput = document.getElementById('valorAtualizado');
    const unidadesParticipantesDiv = document.getElementById('unidadesParticipantes');
    let editingContractId = null; // Para saber se estamos adicionando ou editando

    // --- Elementos do Modal de Seleção de Movimentação ---
    const movimentacaoSelectionModal = document.getElementById('movimentacaoSelectionModal');
    const btnSelectAditivo = document.getElementById('btnSelectAditivo');
    const btnSelectApostilamento = document.getElementById('btnSelectApostilamento');
    let currentContractForMovimentacao = null; // O contrato que está sendo movimentado

    // --- Elementos do Modal de Aditivo ---
    const aditivoModal = document.getElementById('aditivoModal');
    const aditivoForm = document.getElementById('aditivoForm');
    const aditivoTipoSelect = document.getElementById('aditivoTipo');
    const aditivoNumeroInput = document.getElementById('aditivoNumero');
    const aditivoObjetoInput = document.getElementById('aditivoObjeto');
    const renovacaoFields = document.getElementById('renovacaoFields');
    const renovacaoVigenciaMesesInput = document.getElementById('renovacaoVigenciaMeses');
    const proximoVencimentoDisplay = document.getElementById('proximoVencimentoDisplay');
    const renovacaoValorInput = document.getElementById('renovacaoValor');
    const unidadesRenovacaoDiv = document.getElementById('unidadesRenovacao');
    const supressaoFields = document.getElementById('supressaoFields');
    const supressaoValorInput = document.getElementById('supressaoValor');
    const unidadesSupressaoDiv = document.getElementById('unidadesSupressao');
    const acrescimoFields = document.getElementById('acrescimoFields');
    const acrescimoValorInput = document.getElementById('acrescimoValor');
    const outrosAditivoFields = document.getElementById('outrosAditivoFields');
    const aditivoOutrosDescTextarea = document.getElementById('aditivoOutrosDesc');

    // --- Elementos do Modal de Apostilamento ---
    const apostilamentoModal = document.getElementById('apostilamentoModal');
    const apostilamentoForm = document.getElementById('apostilamentoForm');
    const apostilamentoTipoSelect = document.getElementById('apostilamentoTipo');
    const apostilamentoNumeroInput = document.getElementById('apostilamentoNumero');
    const apostilamentoObjetoInput = document.getElementById('apostilamentoObjeto');
    const outrosApostilamentoFields = document.getElementById('outrosApostilamentoFields');
    const apostilamentoOutrosDescTextarea = document.getElementById('apostilamentoOutrosDesc');

    // --- Elementos do Modal de Encerramento ---
    const deleteReasonModal = document.getElementById('deleteReasonModal');
    const deleteReasonForm = document.getElementById('deleteReasonForm');
    const deleteReasonTextarea = document.getElementById('deleteReasonText');
    let contractToDeleteId = null;

    // --- Elementos do Lembrete ---
    const remindersList = document.getElementById('remindersList');
    const btnAddReminder = document.getElementById('btnAddReminder');
    const reminderModal = document.getElementById('reminderModal');
    const reminderForm = document.getElementById('reminderForm');
    const reminderTitleInput = document.getElementById('reminderTitle');
    const reminderDescriptionTextarea = document.getElementById('reminderDescription');
    const reminderDateInput = document.getElementById('reminderDate');
    const reminderUrgencySelect = document.getElementById('reminderUrgency');
    let editingReminderId = null;

    // --- Elementos da Busca ---
    const contractSearchInput = document.getElementById('contractSearchInput');

    // --- Variáveis Globais de Estado ---
    let currentUserIsAdmin = false;
    const UNIDADES = [
        'Unidade A', 'Unidade B', 'Unidade C', 'Unidade D',
        'Unidade E', 'Unidade F', 'Unidade G', 'Unidade H',
        'Unidade I', 'Unidade J'
    ]; // Exemplo de unidades


    // --- Funções Auxiliares ---

    // Formata data para dd/mm/aaaa
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
        if (isNaN(date.getTime())) return dateString; // Retorna original se inválido

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Calcula prazo máximo baseado na lei
    const calcularPrazoMaximo = (dataInicial, tipoLei) => {
        if (!dataInicial) return '';
        const data = new Date(dataInicial + 'T00:00:00');
        if (isNaN(data.getTime())) return '';

        let mesesMaximo = 0;
        if (tipoLei === '8666') {
            mesesMaximo = 60; // 5 anos
        } else if (tipoLei === 'nova') {
            mesesMaximo = 120; // 10 anos
        }

        if (mesesMaximo > 0) {
            data.setMonth(data.getMonth() + mesesMaximo);
            return formatDate(data.toISOString().split('T')[0]);
        }
        return '';
    };

    // Calcula o próximo vencimento para renovação
    const calcularProximoVencimento = (vigenciaAtual, mesesRenovacao) => {
        if (!vigenciaAtual || !mesesRenovacao) return '';
        const data = new Date(vigenciaAtual + 'T00:00:00');
        if (isNaN(data.getTime())) return '';

        data.setMonth(data.getMonth() + parseInt(mesesRenovacao, 10));
        return formatDate(data.toISOString().split('T')[0]);
    };

    // Preenche checkboxes de unidades
    const populateUnidadesCheckboxes = (containerDiv, selectedUnidades = []) => {
        containerDiv.innerHTML = '';
        UNIDADES.forEach(unidade => {
            const checkboxId = `${containerDiv.id}-${unidade.replace(/\s/g, '-')}`;
            const isChecked = selectedUnidades.includes(unidade);
            containerDiv.innerHTML += `
                <label for="${checkboxId}">
                    <input type="checkbox" id="${checkboxId}" value="${unidade}" ${isChecked ? 'checked' : ''}>
                    ${unidade}
                </label>
            `;
        });
    };

    // Fecha todos os modais
    const closeAllModals = () => {
        contractModal.style.display = 'none';
        movimentacaoSelectionModal.style.display = 'none';
        aditivoModal.style.display = 'none';
        apostilamentoModal.style.display = 'none';
        deleteReasonModal.style.display = 'none';
        reminderModal.style.display = 'none';
    };

    // Abre um modal específico
    const openModal = (modal) => {
        modal.style.display = 'flex'; // Usar flex para centralizar
    };

    // Define visibilidade de elementos para admin
    const setAdminVisibility = () => {
        adminOnlyElements.forEach(el => {
            if (currentUserIsAdmin) {
                el.style.display = 'block'; // Mostra se admin
            } else {
                el.style.display = 'none'; // Esconde se não admin
            }
        });
    };

    // --- Listener de Autenticação (para gerenciar proteção do dashboard) ---
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Se não houver usuário logado, redireciona para a página de login
            window.location.href = 'index.html';
            return;
        }

        // Verifica se o usuário é administrador
        // A coleção 'users' deve ter sido criada ao cadastrar usuários
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUserIsAdmin = userDoc.data().isAdmin || ADMIN_UIDS.includes(user.uid);
            // Se for admin, mas o campo isAdmin no Firestore for false,
            // ou se for um UID admin da lista, mas não tiver o campo isAdmin no Firestore,
            // pode-se atualizar o campo isAdmin no Firestore para manter consistência.
            if (ADMIN_UIDS.includes(user.uid) && !userDoc.data().isAdmin) {
                await db.collection('users').doc(user.uid).update({ isAdmin: true });
                currentUserIsAdmin = true; // Garante que a flag esteja atualizada
            }
        } else {
            // Se o documento do usuário não existir (usuário logou mas não foi cadastrado no Firestore),
            // Isso pode acontecer se usuários foram criados diretamente no console ou por outro método.
            // Para garantir consistência, crie o documento aqui.
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                isAdmin: ADMIN_UIDS.includes(user.uid), // Define admin com base na lista global
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            currentUserIsAdmin = ADMIN_UIDS.includes(user.uid);
        }

        setAdminVisibility(); // Ajusta a visibilidade dos elementos de admin
        fetchContracts(); // Carrega os contratos após a autenticação
        fetchReminders(); // Carrega os lembretes
    });

    // --- Logout ---
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await auth.signOut();
                alert('Você foi desconectado.');
                window.location.href = 'index.html'; // Redireciona para a página de login
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
                alert("Erro ao fazer logout: " + error.message);
            }
        });
    }

    // --- Navegação entre Abas ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tab).classList.add('active');

            // Recarregar dados se a aba for de contratos encerrados ou lembretes
            if (tab === 'processos-encerrados') {
                fetchEndedContracts();
            } else if (tab === 'lembretes') {
                fetchReminders();
            } else if (tab === 'contratos') {
                fetchContracts();
            }
        });
    });

    // --- Contratos (CRUD) ---

    // Abrir Modal de Adicionar Contrato
    if (btnAddContract) {
        btnAddContract.addEventListener('click', () => {
            editingContractId = null;
            contractForm.reset();
            prazoMaximoDisplay.textContent = '';
            valorAtualizadoInput.value = ''; // Garante que o valor esteja vazio
            populateUnidadesCheckboxes(unidadesParticipantesDiv);
            openModal(contractModal);
        });
    }

    // Calcular Prazo Máximo ao mudar data inicial ou tipo de lei
    tipoLeiSelect.addEventListener('change', () => {
        prazoMaximoDisplay.textContent = calcularPrazoMaximo(dataInicialProcessoInput.value, tipoLeiSelect.value);
    });
    dataInicialProcessoInput.addEventListener('change', () => {
        prazoMaximoDisplay.textContent = calcularPrazoMaximo(dataInicialProcessoInput.value, tipoLeiSelect.value);
    });

    // Submissão do Formulário de Contrato
    if (contractForm) {
        contractForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const selectedUnidades = Array.from(unidadesParticipantesDiv.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value);

            const contractData = {
                processoSei: processoSeiInput.value,
                numeroContrato: numeroContratoInput.value,
                nomeEmpresa: nomeEmpresaInput.value,
                objeto: objetoInput.value,
                dataInicialProcesso: dataInicialProcessoInput.value,
                tipoLei: tipoLeiSelect.value,
                vigenciaAtual: vigenciaAtualInput.value,
                numeroRenovacao: parseInt(numeroRenovacaoInput.value, 10),
                valorAtualizado: parseFloat(valorAtualizadoInput.value),
                unidadesParticipantes: selectedUnidades,
                status: 'Ativo',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                if (editingContractId) {
                    await db.collection('contracts').doc(editingContractId).update(contractData);
                    alert('Contrato atualizado com sucesso!');
                } else {
                    await db.collection('contracts').add(contractData);
                    alert('Contrato adicionado com sucesso!');
                }
                closeAllMod