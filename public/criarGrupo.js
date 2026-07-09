const sessionRaw = window.localStorage.getItem('orcamentoJaSession');
const createGroupForm = document.getElementById('createGroupForm');
const groupNameInput = document.getElementById('groupName');
const createGroupButton = document.getElementById('createGroupButton');
const createGroupResult = document.getElementById('createGroupResult');
const createGroupActions = document.getElementById('createGroupActions');
const homeButton = document.getElementById('homeButton');

let session = null;

function showResult(message, hasError) {
  createGroupResult.hidden = false;
  createGroupResult.textContent = message;
  createGroupResult.classList.toggle('api-result-success', !hasError);
  createGroupResult.classList.toggle('api-result-error', hasError);
  createGroupActions.hidden = hasError;
}

function normalizeApiResult(result) {
  return Array.isArray(result) ? result[0] : result;
}

if (!sessionRaw) {
  window.location.href = '/';
} else {
  session = JSON.parse(sessionRaw);
}

createGroupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const googleId = session?.profile?.sub;
  const nmGrupo = groupNameInput.value.trim();

  if (!googleId) {
    showResult('Nao foi possivel identificar o usuario logado.', true);
    return;
  }

  if (!nmGrupo) {
    showResult('Informe a descricao do grupo.', true);
    groupNameInput.focus();
    return;
  }

  try {
    createGroupButton.disabled = true;
    createGroupResult.hidden = true;
    createGroupActions.hidden = true;

    const response = await fetch('/api/cria-grupo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idUsuario: googleId,
        nmGrupo
      })
    });

    const result = normalizeApiResult(await response.json());

    if (!response.ok) {
      throw new Error(result?.error || 'Nao foi possivel criar o grupo.');
    }

    console.log('Retorno da api criação do grupo:');
    console.log(result);

    const hasError = result?.idErro === 'S';
    showResult(result?.retorno || 'Operacao concluida.', hasError);

    if (!hasError) {
      window.setTimeout(() => {
        window.location.href = '/main.html';
      }, 1200);
    }
  } catch (error) {
    showResult(error.message || 'Erro ao criar grupo.', true);
  } finally {
    createGroupButton.disabled = false;
  }
});

homeButton.addEventListener('click', () => {
  window.location.href = '/main.html';
});
