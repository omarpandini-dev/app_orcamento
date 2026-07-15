const storedSession = window.localStorage.getItem('orcamentoJaSession');
const params = new URLSearchParams(window.location.search);
const movementsGrid = document.getElementById('movementsGrid');
const movementListTitle = document.getElementById('movementListTitle');
const movementListCopy = document.getElementById('movementListCopy');
const homeButton = document.getElementById('homeButton');

const idOrcamento = params.get('idOrcamento') || '';
const dsCategoria = params.get('dsCategoria') || '';

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
    createTextElement('span', '', 'ID')
  );
  movementsGrid.append(header);

  movements.forEach((movement) => {
    const row = document.createElement('article');
    row.className = 'movement-row';

    row.append(
      createMovementCell('Descricao', movement.descricao || 'Movimento sem descricao', 'movement-description'),
      createMovementCell('Valor', formatCurrency(movement.valor), 'movement-value'),
      createMovementCell('Data', formatMovementDate(movement.data_movimento), 'movement-date'),
      createMovementCell('ID', movement.id_movimento || '-', 'movement-id')
    );

    movementsGrid.append(row);
  });
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
    movementListCopy.textContent = `${movements.length} movimento${movements.length === 1 ? '' : 's'} encontrado${movements.length === 1 ? '' : 's'}.`;
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
