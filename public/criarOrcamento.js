const storedSession = window.localStorage.getItem('orcamentoJaSession');
const params = new URLSearchParams(window.location.search);
const createBudgetForm = document.getElementById('createBudgetForm');
const idGrupoInput = document.getElementById('idGrupo');
const idUsuarioInput = document.getElementById('idUsuario');
const dsCategoriaInput = document.getElementById('dsCategoria');
const diaCorteInput = document.getElementById('diaCorte');
const valorMetaInput = document.getElementById('valorMeta');
const createBudgetButton = document.getElementById('createBudgetButton');
const createBudgetResult = document.getElementById('createBudgetResult');
const createBudgetActions = document.getElementById('createBudgetActions');
const homeButton = document.getElementById('homeButton');

function normalizeApiResult(result) {
  return Array.isArray(result) ? result[0] : result;
}

function showResult(message, hasError) {
  createBudgetResult.hidden = false;
  createBudgetResult.textContent = message;
  createBudgetResult.classList.toggle('api-result-success', !hasError);
  createBudgetResult.classList.toggle('api-result-error', hasError);
  createBudgetActions.hidden = hasError;
}

function formatDecimal(value) {
  return Number(value).toFixed(2);
}

if (!storedSession) {
  window.location.href = '/';
} else {
  const session = JSON.parse(storedSession);
  idGrupoInput.value = params.get('idGrupo') || '';
  idUsuarioInput.value = session.profile?.sub || '';

  if (!idGrupoInput.value || !idUsuarioInput.value) {
    showResult('Nao foi possivel identificar o grupo ou usuario logado.', true);
    createBudgetButton.disabled = true;
  }
}

createBudgetForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const idGrupo = idGrupoInput.value;
  const idUsuario = idUsuarioInput.value;
  const dsCategoria = dsCategoriaInput.value.trim();
  const diaCorte = Number(diaCorteInput.value);
  const valorMeta = Number(valorMetaInput.value);

  if (!dsCategoria) {
    showResult('Informe a categoria.', true);
    dsCategoriaInput.focus();
    return;
  }

  if (!Number.isInteger(diaCorte) || diaCorte < 1 || diaCorte > 30) {
    showResult('Informe um dia de corte entre 1 e 30.', true);
    diaCorteInput.focus();
    return;
  }

  if (!Number.isFinite(valorMeta) || valorMeta <= 0) {
    showResult('Informe um valor meta positivo.', true);
    valorMetaInput.focus();
    return;
  }

  try {
    createBudgetButton.disabled = true;
    createBudgetResult.hidden = true;
    createBudgetActions.hidden = true;

    const response = await fetch('/api/cria-orcamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idGrupo,
        idUsuario,
        dsCategoria,
        diaCorte: String(diaCorte),
        valorMeta: formatDecimal(valorMeta)
      })
    });

    const result = normalizeApiResult(await response.json());

    if (!response.ok) {
      throw new Error(result?.error || 'Nao foi possivel criar o orcamento.');
    }

    const hasError = result?.idErro === 'S';
    showResult(result?.retorno || 'Operacao concluida.', hasError);

    if (!hasError) {
      window.setTimeout(() => {
        window.location.href = '/main.html';
      }, 1200);
    }
  } catch (error) {
    showResult(error.message || 'Erro ao criar orcamento.', true);
  } finally {
    createBudgetButton.disabled = false;
  }
});

homeButton.addEventListener('click', () => {
  window.location.href = '/main.html';
});
