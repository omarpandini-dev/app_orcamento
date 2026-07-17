const storedSession = window.localStorage.getItem('orcamentoJaSession');
const params = new URLSearchParams(window.location.search);
const budgetUpdateForm = document.getElementById('budgetUpdateForm');
const idOrcamentoInput = document.getElementById('idOrcamento');
const dsCategoriaInput = document.getElementById('dsCategoria');
const diaCorteInput = document.getElementById('diaCorte');
const valorMetaInput = document.getElementById('valorMeta');
const updateBudgetButton = document.getElementById('updateBudgetButton');
const deleteBudgetButton = document.getElementById('deleteBudgetButton');
const budgetUpdateResult = document.getElementById('budgetUpdateResult');
const homeButton = document.getElementById('homeButton');

function normalizeApiResult(result) {
  return Array.isArray(result) ? result[0] : result;
}

function showResult(message, hasError) {
  budgetUpdateResult.hidden = false;
  budgetUpdateResult.textContent = message;
  budgetUpdateResult.classList.toggle('api-result-success', !hasError);
  budgetUpdateResult.classList.toggle('api-result-error', hasError);
}

function validateBudgetFields() {
  const dsCategoria = dsCategoriaInput.value.trim();
  const diaCorte = Number(diaCorteInput.value);
  const valorMeta = MoneyInput.toNumber(valorMetaInput);

  if (!idOrcamentoInput.value) {
    showResult('Nao foi possivel identificar o orcamento.', true);
    return null;
  }

  if (!dsCategoria) {
    showResult('Informe a categoria.', true);
    dsCategoriaInput.focus();
    return null;
  }

  if (!Number.isInteger(diaCorte) || diaCorte < 1 || diaCorte > 30) {
    showResult('Informe um dia de corte entre 1 e 30.', true);
    diaCorteInput.focus();
    return null;
  }

  if (!Number.isFinite(valorMeta) || valorMeta <= 0) {
    showResult('Informe um valor meta positivo.', true);
    valorMetaInput.focus();
    return null;
  }

  return {
    idOrcamento: idOrcamentoInput.value,
    dsCategoria,
    diaCorte: String(diaCorte),
    valorMeta: MoneyInput.toDecimalString(valorMetaInput)
  };
}

async function sendBudgetRequest(url, payload, fallbackMessage) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = normalizeApiResult(await response.json());

  if (!response.ok) {
    throw new Error(result?.error || fallbackMessage);
  }

  return result;
}

function redirectHomeAfterSuccess(hasError) {
  if (!hasError) {
    window.setTimeout(() => {
      window.location.href = '/main.html';
    }, 1200);
  }
}

if (!storedSession) {
  window.location.href = '/';
} else {
  idOrcamentoInput.value = params.get('idOrcamento') || '';
  dsCategoriaInput.value = params.get('dsCategoria') || '';
  diaCorteInput.value = params.get('diaCorte') || '';
  valorMetaInput.value = params.get('valorMeta') || '';
  MoneyInput.attach(valorMetaInput);

  if (!idOrcamentoInput.value) {
    showResult('Nao foi possivel identificar o orcamento.', true);
    updateBudgetButton.disabled = true;
    deleteBudgetButton.disabled = true;
  }
}

budgetUpdateForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = validateBudgetFields();

  if (!payload) {
    return;
  }

  try {
    updateBudgetButton.disabled = true;
    deleteBudgetButton.disabled = true;
    budgetUpdateResult.hidden = true;

    const result = await sendBudgetRequest('/api/atualiza-orcamento', payload, 'Nao foi possivel atualizar o orcamento.');
    const hasError = result?.idErro === 'S';
    showResult(result?.retorno || 'Operacao concluida.', hasError);
    redirectHomeAfterSuccess(hasError);
  } catch (error) {
    showResult(error.message || 'Erro ao atualizar orcamento.', true);
  } finally {
    updateBudgetButton.disabled = false;
    deleteBudgetButton.disabled = false;
  }
});

deleteBudgetButton.addEventListener('click', async () => {
  if (!idOrcamentoInput.value) {
    showResult('Nao foi possivel identificar o orcamento.', true);
    return;
  }


  try {
    updateBudgetButton.disabled = true;
    deleteBudgetButton.disabled = true;
    budgetUpdateResult.hidden = true;

    const result = await sendBudgetRequest(
      '/api/exclui-orcamento',
      { idOrcamento: idOrcamentoInput.value },
      'Nao foi possivel excluir o orcamento.'
    );
    const hasError = result?.idErro === 'S';
    showResult(result?.retorno || 'Operacao concluida.', hasError);
    redirectHomeAfterSuccess(hasError);
  } catch (error) {
    showResult(error.message || 'Erro ao excluir orcamento.', true);
  } finally {
    updateBudgetButton.disabled = false;
    deleteBudgetButton.disabled = false;
  }
});

homeButton.addEventListener('click', () => {
  window.location.href = '/main.html';
});
