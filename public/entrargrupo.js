const sessionRaw = window.localStorage.getItem('orcamentoJaSession');
const joinGroupForm = document.getElementById('joinGroupForm');
const groupCodeInput = document.getElementById('groupCode');
const joinGroupButton = document.getElementById('joinGroupButton');
const joinGroupResult = document.getElementById('joinGroupResult');
const joinGroupActions = document.getElementById('joinGroupActions');
const homeButton = document.getElementById('homeButton');

let session = null;

function normalizeApiResult(result) {
  return Array.isArray(result) ? result[0] : result;
}

function showResult(message, hasError) {
  joinGroupResult.hidden = false;
  joinGroupResult.textContent = message;
  joinGroupResult.classList.toggle('api-result-success', !hasError);
  joinGroupResult.classList.toggle('api-result-error', hasError);
  joinGroupActions.hidden = hasError;
}

if (!sessionRaw) {
  window.location.href = '/';
} else {
  session = JSON.parse(sessionRaw);
}

joinGroupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const idUsuario = session?.profile?.sub;
  const idGrupo = groupCodeInput.value.trim();

  if (!idUsuario) {
    showResult('Nao foi possivel identificar o usuario logado.', true);
    return;
  }

  if (!idGrupo) {
    showResult('Informe o codigo do grupo.', true);
    groupCodeInput.focus();
    return;
  }

  try {
    joinGroupButton.disabled = true;
    joinGroupResult.hidden = true;
    joinGroupActions.hidden = true;

    const response = await fetch('/api/entra-grupo-usuario', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idGrupo,
        idUsuario
      })
    });

    const result = normalizeApiResult(await response.json());

    if (!response.ok) {
      throw new Error(result?.error || 'Nao foi possivel entrar no grupo.');
    }

    const hasError = result?.idErro === 'S';
    showResult(result?.retorno || 'Operacao concluida.', hasError);

    if (!hasError) {
      window.setTimeout(() => {
        window.location.href = '/main.html';
      }, 1200);
    }
  } catch (error) {
    showResult(error.message || 'Erro ao entrar no grupo.', true);
  } finally {
    joinGroupButton.disabled = false;
  }
});

homeButton.addEventListener('click', () => {
  window.location.href = '/main.html';
});
