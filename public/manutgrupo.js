const storedSession = window.localStorage.getItem('orcamentoJaSession');
const params = new URLSearchParams(window.location.search);
const idGrupoInput = document.getElementById('idGrupo');
const dsGrupoInput = document.getElementById('dsGrupo');
const deleteGroupButton = document.getElementById('deleteGroupButton');
const groupMaintenanceResult = document.getElementById('groupMaintenanceResult');
const homeButton = document.getElementById('homeButton');

function normalizeApiResult(result) {
  return Array.isArray(result) ? result[0] : result;
}

function showResult(message, hasError) {
  groupMaintenanceResult.hidden = false;
  groupMaintenanceResult.textContent = message;
  groupMaintenanceResult.classList.toggle('api-result-success', !hasError);
  groupMaintenanceResult.classList.toggle('api-result-error', hasError);
}

function redirectHomeAfterSuccess(hasError) {
  if (!hasError) {
    window.setTimeout(() => {
      window.location.href = '/main.html';
    }, 1200);
  }
}

async function deleteGroup(idGrupo) {
  const response = await fetch('/api/exclui-grupo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ idGrupo })
  });

  const result = normalizeApiResult(await response.json());

  if (!response.ok) {
    throw new Error(result?.error || 'Nao foi possivel excluir o grupo.');
  }

  return result;
}

if (!storedSession) {
  window.location.href = '/';
} else {
  idGrupoInput.value = params.get('idGrupo') || '';
  dsGrupoInput.value = params.get('dsGrupo') || '';

  if (!idGrupoInput.value) {
    showResult('Nao foi possivel identificar o grupo.', true);
    deleteGroupButton.disabled = true;
  }
}

deleteGroupButton.addEventListener('click', async () => {
  if (!idGrupoInput.value) {
    showResult('Nao foi possivel identificar o grupo.', true);
    return;
  }

  try {
    deleteGroupButton.disabled = true;
    groupMaintenanceResult.hidden = true;

    const result = await deleteGroup(idGrupoInput.value);
    const hasError = result?.sucesso === false || result?.idErro === 'S';
    showResult(result?.mensagem || result?.retorno || 'Operacao concluida.', hasError);
    redirectHomeAfterSuccess(hasError);
  } catch (error) {
    showResult(error.message || 'Erro ao excluir grupo.', true);
  } finally {
    deleteGroupButton.disabled = false;
  }
});

homeButton.addEventListener('click', () => {
  window.location.href = '/main.html';
});
