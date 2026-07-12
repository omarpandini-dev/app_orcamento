const storedSession = window.localStorage.getItem('orcamentoJaSession');
const params = new URLSearchParams(window.location.search);
const movementForm = document.getElementById('movementForm');
const idOrcamentoInput = document.getElementById('idOrcamento');
const idUsuarioInput = document.getElementById('idUsuario');
const valorInput = document.getElementById('valor');
const descricaoInput = document.getElementById('descricao');
const createMovementButton = document.getElementById('createMovementButton');
const movementResult = document.getElementById('movementResult');
const movementCategory = document.getElementById('movementCategory');
const homeButton = document.getElementById('homeButton');

function normalizeApiResult(result) {
  return Array.isArray(result) ? result[0] : result;
}

function showResult(message, hasError) {
  movementResult.hidden = false;
  movementResult.textContent = message;
  movementResult.classList.toggle('api-result-success', !hasError);
  movementResult.classList.toggle('api-result-error', hasError);
}

function formatDecimal(value) {
  return Number(value).toFixed(2);
}

if (!storedSession) {
  window.location.href = '/';
} else {
  const session = JSON.parse(storedSession);
  const dsCategoria = params.get('dsCategoria') || '';

  idOrcamentoInput.value = params.get('idOrcamento') || '';
  idUsuarioInput.value = session.profile?.sub || '';

  if (dsCategoria) {
    movementCategory.textContent = `Informe o valor e a descricao para ${dsCategoria}.`;
  }

  if (!idOrcamentoInput.value || !idUsuarioInput.value) {
    showResult('Nao foi possivel identificar o orcamento ou usuario logado.', true);
    createMovementButton.disabled = true;
  }
}

movementForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const idOrcamento = idOrcamentoInput.value;
  const idUsuario = idUsuarioInput.value;
  const valor = Number(valorInput.value);
  const descricao = descricaoInput.value.trim();

  if (!idOrcamento || !idUsuario) {
    showResult('Nao foi possivel identificar o orcamento ou usuario logado.', true);
    return;
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    showResult('Informe um valor positivo.', true);
    valorInput.focus();
    return;
  }

  if (!descricao) {
    showResult('Informe a descricao.', true);
    descricaoInput.focus();
    return;
  }

  try {
    createMovementButton.disabled = true;
    movementResult.hidden = true;

    const response = await fetch('/api/cria-movimento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idOrcamento,
        idUsuario,
        valor: formatDecimal(valor),
        descricao
      })
    });

    const result = normalizeApiResult(await response.json());

    if (!response.ok) {
      throw new Error(result?.error || 'Nao foi possivel criar o movimento.');
    }

    const hasError = result?.idErro === 'S';
    showResult(result?.retorno || 'Operacao concluida.', hasError);

    if (!hasError) {
      window.setTimeout(() => {
        window.location.href = '/main.html';
      }, 1200);
    }
  } catch (error) {
    showResult(error.message || 'Erro ao criar movimento.', true);
  } finally {
    createMovementButton.disabled = false;
  }
});

homeButton.addEventListener('click', () => {
  window.location.href = '/main.html';
});
