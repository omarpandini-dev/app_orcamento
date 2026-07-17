const storedSession = window.localStorage.getItem('orcamentoJaSession');
const params = new URLSearchParams(window.location.search);
const movementsGrid = document.getElementById('movementsGrid');
const movementListTitle = document.getElementById('movementListTitle');
const movementListCopy = document.getElementById('movementListCopy');
const movementListResult = document.getElementById('movementListResult');
const homeButton = document.getElementById('homeButton');

const idOrcamento = params.get('idOrcamento') || '';
const dsCategoria = params.get('dsCategoria') || '';
let movementCount = 0;

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function formatMovementDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function clearElement(element) {
  element.replaceChildren();
}

function normalizeApiResult(result) {
  return Array.isArray(result) ? result[0] : result;
}

function showMovementResult(message, hasError) {
  movementListResult.hidden = false;
  movementListResult.textContent = message;
  movementListResult.classList.toggle('api-result-success', !hasError);
  movementListResult.classList.toggle('api-result-error', hasError);
}

function renderEmptyState(message) {
  clearElement(movementsGrid);

  const card = document.createElement('article');
  card.className = 'empty-card movement-empty-card';
  card.append(createTextElement('p', '', message));
  movementsGrid.append(card);
}

function createMovementCell(label, value, className = '') {
  const cell = document.createElement('div');
  cell.className = `movement-cell${className ? ` ${className}` : ''}`;
  cell.dataset.label = label;
  cell.textContent = value;
  return cell;
}

function createDeleteMovementButton(row) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button movement-delete-button';
  button.setAttribute('aria-label', 'Excluir movimento');
  button.title = 'Excluir movimento';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  button.addEventListener('click', () => {
    deleteMovement(row, button);
  });
  return button;
}

function createMovementActionCell(row) {
  const cell = document.createElement('div');
  cell.className = 'movement-action-cell';
  cell.append(createDeleteMovementButton(row));
  return cell;
}

function updateMovementCount(count) {
  movementCount = count;
  movementListCopy.textContent = `${movementCount} movimento${movementCount === 1 ? '' : 's'} encontrado${movementCount === 1 ? '' : 's'}.`;
}

function renderMovements(movements) {
  clearElement(movementsGrid);

  if (!movements.length) {
    renderEmptyState('Nenhum movimento encontrado para este orcamento.');
    return;
  }

  const header = document.createElement('div');
  header.className = 'movement-table-header';
  header.append(
    createTextElement('span', '', 'Descricao'),
    createTextElement('span', '', 'Valor'),
    createTextElement('span', '', 'Data'),
    createTextElement('span', 'movement-header-action', 'Excluir')
  );
  movementsGrid.append(header);

  movements.forEach((movement) => {
    const row = document.createElement('article');
    row.className = 'movement-row';
    row.dataset.idMovimento = movement.id_movimento || '';

    row.append(
      createMovementCell('Descricao', movement.descricao || 'Movimento sem descricao', 'movement-description'),
      createMovementCell('Valor', formatCurrency(movement.valor), 'movement-value'),
      createMovementCell('Data', formatMovementDate(movement.data_movimento), 'movement-date'),
      createMovementActionCell(row)
    );

    movementsGrid.append(row);
  });
}

async function deleteMovement(row, button) {
  const idMovimento = row.dataset.idMovimento;

  if (!idMovimento) {
    showMovementResult('Nao foi possivel identificar o movimento.', true);
    return;
  }

  try {
    button.disabled = true;
    movementListResult.hidden = true;

    const response = await fetch('/api/exclui-movimento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idMovimento })
    });

    const result = normalizeApiResult(await response.json());

    if (!response.ok) {
      throw new Error(result?.error || 'Nao foi possivel excluir o movimento.');
    }

    const hasError = result?.idErro === 'S';
    showMovementResult(result?.retorno || 'Operacao concluida.', hasError);

    if (!hasError) {
      row.remove();
      updateMovementCount(Math.max(movementCount - 1, 0));

      if (movementCount === 0) {
        renderEmptyState('Nenhum movimento encontrado para este orcamento.');
      }
    }
  } catch (error) {
    showMovementResult(error.message || 'Erro ao excluir movimento.', true);
  } finally {
    button.disabled = false;
  }
}

async function fetchMovements() {
  if (!idOrcamento) {
    movementListTitle.textContent = 'Orcamento nao identificado';
    movementListCopy.textContent = 'Volte para a home e abra a lista pelo card do orcamento.';
    renderEmptyState('Nao foi possivel identificar o orcamento.');
    return;
  }

  try {
    movementListTitle.textContent = dsCategoria || 'Movimentos do orcamento';
    movementListCopy.textContent = 'Buscando movimentos deste orcamento.';
    renderEmptyState('Carregando movimentos...');

    const response = await fetch('/api/busca-movimentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idOrcamento })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'Nao foi possivel buscar os movimentos.');
    }

    const movements = Array.isArray(result) ? result : [];
    updateMovementCount(movements.length);
    renderMovements(movements);
  } catch (error) {
    movementListTitle.textContent = 'Nao foi possivel carregar';
    movementListCopy.textContent = error.message || 'Tente novamente em instantes.';
    renderEmptyState('Os movimentos nao puderam ser carregados agora.');
  }
}

if (!storedSession) {
  window.location.href = '/';
} else {
  fetchMovements();
}

homeButton.addEventListener('click', () => {
  window.location.href = '/main.html';
});
