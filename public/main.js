const groupsGrid = document.getElementById('groupsGrid');
const budgetsGrid = document.getElementById('budgetsGrid');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeCopy = document.getElementById('welcomeCopy');
const summaryGroups = document.getElementById('summaryGroups');
const summaryTotal = document.getElementById('summaryTotal');
const groupsSectionTitle = document.getElementById('groupsSectionTitle');
const selectedGroupTitle = document.getElementById('selectedGroupTitle');
const lastUpdated = document.getElementById('lastUpdated');
const refreshButton = document.getElementById('refreshButton');
const logoutButton = document.getElementById('logoutButton');
const refreshIntervalMs = 5 * 60 * 1000;

let googleId = '';
let selectedGroupId = '';
let refreshTimer = null;

function getLoggedUserGoogleId() {
  const storedSession = window.localStorage.getItem('orcamentoJaSession');

  if (!storedSession) {
    return '';
  }

  const session = JSON.parse(storedSession);
  return session.profile?.sub || '';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function getNumericValue(value) {
  return Number(value) || 0;
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

function normalizeUserInfo(result) {
  const firstItem = Array.isArray(result) ? result[0] : result;
  return firstItem?.retorno || null;
}

function getAllBudgets(groups) {
  return groups.flatMap((group) => group.orcamentos || []);
}

function renderEmptyState(target, message) {
  clearElement(target);
  const card = document.createElement('article');
  card.className = 'empty-card';
  card.append(createTextElement('p', '', message));
  target.append(card);
}

function createGroupButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary-button';
  button.textContent = 'Criar Grupo';
  button.addEventListener('click', () => {
    window.location.href = '/criarGrupo.html';
  });

  return button;
}

function createJoinGroupButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-button';
  button.textContent = 'Entrar em um Grupo';
  button.addEventListener('click', () => {
    window.location.href = '/entrargrupo.html';
  });

  return button;
}

function createBudgetButton(group) {
  const createBudgetButton = document.createElement('button');
  createBudgetButton.type = 'button';
  createBudgetButton.className = 'primary-button';
  createBudgetButton.textContent = 'Criar Orçamento';
  createBudgetButton.addEventListener('click', () => {
    const target = new URL('/criarOrcamento.html', window.location.origin);

    if (group?.idGrupo) {
      target.searchParams.set('idGrupo', group.idGrupo);
    }

    window.location.href = target.pathname + target.search;
  });

  return createBudgetButton;
}

function createEditBudgetButton(budget) {
  const button = document.createElement('button');
  const target = new URL('/orcamentosalter.html', window.location.origin);
  const idOrcamento = budget.id_orcamento || budget.idOrcamento || '';
  const dsCategoria = budget.ds_categoria || budget.dsCategoria || '';
  const diaCorte = budget.nr_dia_corte || budget.diaCorte || '';
  const valorMeta = budget.valor_meta || budget.valorMeta || '';

  target.searchParams.set('idOrcamento', idOrcamento);
  target.searchParams.set('dsCategoria', dsCategoria);
  target.searchParams.set('diaCorte', diaCorte);
  target.searchParams.set('valorMeta', valorMeta);

  button.type = 'button';
  button.className = 'icon-button';
  button.setAttribute('aria-label', 'Editar orcamento');
  button.title = 'Editar orcamento';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  button.addEventListener('click', () => {
    window.location.href = target.pathname + target.search;
  });

  return button;
}

function createMovementButton(budget) {
  const button = document.createElement('button');
  const target = new URL('/movimentos.html', window.location.origin);
  const idOrcamento = budget.id_orcamento || budget.idOrcamento || '';
  const dsCategoria = budget.ds_categoria || budget.dsCategoria || '';

  target.searchParams.set('idOrcamento', idOrcamento);
  target.searchParams.set('dsCategoria', dsCategoria);

  button.type = 'button';
  button.className = 'icon-button';
  button.setAttribute('aria-label', 'Adicionar movimento');
  button.title = 'Adicionar movimento';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
  button.addEventListener('click', () => {
    window.location.href = target.pathname + target.search;
  });

  return button;
}

function renderGroupsSectionAction(showJoinGroupButton = false) {
  groupsSectionTitle.parentElement.classList.add('section-heading-with-action');
  groupsSectionTitle.parentElement.querySelector('.section-title-actions')?.remove();

  const actions = document.createElement('div');
  actions.className = 'section-title-actions section-title-action';

  actions.append(createGroupButton());

  if (showJoinGroupButton) {
    actions.append(createJoinGroupButton());
  }

  groupsSectionTitle.insertAdjacentElement('afterend', actions);
}

function renderSelectedGroupAction(group) {
  selectedGroupTitle.parentElement.classList.add('section-heading-with-action');
  selectedGroupTitle.parentElement.querySelector('.section-title-action')?.remove();

  const button = createBudgetButton(group);
  button.classList.add('section-title-action');
  selectedGroupTitle.insertAdjacentElement('afterend', button);
}

function renderNoGroupsState() {
  clearElement(groupsGrid);

  const card = document.createElement('article');
  card.className = 'empty-card empty-card-action';

  card.append(
    createTextElement('p', '', 'Nenhum grupo encontrado para este usuário.'),
    createGroupButton()
  );

  groupsGrid.append(card);
}

function renderNoBudgetsState(group) {
  clearElement(budgetsGrid);

  const card = document.createElement('article');
  card.className = 'empty-card empty-card-action';

  card.append(
    createTextElement('p', '', 'Nenhum orçamento encontrado para este grupo.'),
    //createBudgetButton(group)
  );

  budgetsGrid.append(card);
}

function createBudgetAmount(label, value, icon, isNegative = false) {
  const item = document.createElement('div');
  item.className = `budget-amount${isNegative ? ' is-negative' : ''}`;

  const header = document.createElement('div');
  header.className = 'budget-amount-header';
  header.append(
    createTextElement('span', 'budget-amount-icon', icon),
    createTextElement('p', 'budget-meta', label)
  );

  item.append(
    header,
    createTextElement('p', `budget-value${isNegative ? ' is-negative' : ''}`, formatCurrency(value))
  );

  return item;
}

function renderBudgets(group) {
  const budgets = group?.orcamentos || [];
  const isAdmin = group?.admin === 'S';
  selectedGroupTitle.textContent = group ? `Orçamentos de ${group.dsGrupo}` : 'Orçamentos do grupo';
  renderSelectedGroupAction(group);

  if (!budgets.length) {
    renderNoBudgetsState(group);
    return;
  }

  clearElement(budgetsGrid);

  budgets.forEach((budget) => {
    const card = document.createElement('article');
    card.className = 'budget-card';

    const top = document.createElement('div');
    top.className = 'budget-card-top';
    const cardActions = document.createElement('div');
    cardActions.className = 'budget-card-actions';
    cardActions.append(createMovementButton(budget));

    if (isAdmin) {
      cardActions.append(createEditBudgetButton(budget));
    }

    top.append(
      createTextElement('p', 'budget-label', 'Categoria'),
      cardActions
    );

    const valorTotal = getNumericValue(budget.valor_meta ?? budget.valorMeta);
    const valorGasto = getNumericValue(budget.valor_gasto ?? budget.valorGasto);
    const saldoRestante = valorTotal - valorGasto;
    const amounts = document.createElement('div');
    amounts.className = 'budget-values-grid';
    amounts.append(
      createBudgetAmount('Valor Total', valorTotal, '🎯'),
      createBudgetAmount('Valor Gasto', valorGasto, '💸'),
      createBudgetAmount('Saldo Restante', saldoRestante, saldoRestante < 0 ? '⚠️' : '✅', saldoRestante < 0)
    );

    card.append(
      top,
      createTextElement('h3', '', budget.ds_categoria || budget.dsCategoria || 'Categoria sem nome'),
      amounts,
      createTextElement('div', 'budget-divider', ''),
      createTextElement('p', 'budget-meta', 'Dia de corte'),
      createTextElement('p', 'budget-id', budget.nr_dia_corte || budget.diaCorte || '-'),
      createTextElement('div', 'budget-divider', ''),
      createTextElement('p', 'budget-meta', 'ID do orçamento'),
      createTextElement('p', 'budget-id', budget.id_orcamento || budget.idOrcamento || '-')
    );

    budgetsGrid.append(card);
  });
}

function renderGroups(groups) {
  if (!groups.length) {
    renderNoGroupsState();
   // groupsGrid.querySelector('.empty-card')?.append(createJoinGroupButton());
    renderBudgets(null);
    return;
  }

  if (!groups.some((group) => group.idGrupo === selectedGroupId)) {
    selectedGroupId = groups[0].idGrupo;
  }

  clearElement(groupsGrid);

  groups.forEach((group) => {
    const budgets = group.orcamentos || [];
    const isSelected = group.idGrupo === selectedGroupId;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `group-card${isSelected ? ' is-selected' : ''}`;
    button.dataset.groupId = group.idGrupo;

    const top = document.createElement('div');
    top.className = 'budget-card-top';
    top.append(
      createTextElement('p', 'budget-label', group.admin === 'S' ? 'Administrador' : 'Participante'),
      createTextElement('span', 'budget-chip', `${budgets.length} orçamento${budgets.length === 1 ? '' : 's'}`)
    );

    const groupTotal = budgets.reduce((sum, budget) => sum + (Number(budget.valor_meta) || 0), 0);

    button.append(
      top,
      createTextElement('h3', '', group.dsGrupo || 'Grupo sem nome'),
      createTextElement('p', 'group-card-copy', `Total do grupo: ${formatCurrency(groupTotal)}`)
    );

    button.addEventListener('click', () => {
      selectedGroupId = group.idGrupo;
      renderGroups(groups);
    });

    groupsGrid.append(button);
  });

  renderBudgets(groups.find((group) => group.idGrupo === selectedGroupId) || groups[0]);
}

function renderDashboard(userInfo) {
  const groups = userInfo.gruposOrcamentos || [];
  const budgets = getAllBudgets(groups);
  const totalValue = budgets.reduce((sum, budget) => sum + (Number(budget.valor_meta) || 0), 0);
  const firstName = (userInfo.nome || 'Usuário').split(' ')[0];

  welcomeTitle.textContent = `Olá, ${firstName}`;
  welcomeCopy.textContent = `${userInfo.nome || 'Usuário'}, você possui ${groups.length} grupo${groups.length === 1 ? '' : 's'} de orçamento.`;
  summaryGroups.textContent = String(groups.length);
  summaryTotal.textContent = formatCurrency(totalValue);
  lastUpdated.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  renderGroupsSectionAction(!groups.length);
  renderGroups(groups);
}

async function fetchUserInfo() {
  if (!googleId) {
    window.location.href = '/';
    return;
  }

  try {
    refreshButton.disabled = true;
    welcomeCopy.textContent = 'Buscando informações atualizadas...';

    const response = await fetch('/api/busca-info-usuario', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idUsuario: googleId
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'Não foi possível buscar as informações do usuário.');
    }

    const userInfo = normalizeUserInfo(result);

    if (!userInfo) {
      throw new Error('Resposta da API em formato inesperado.');
    }

    renderDashboard(userInfo);
  } catch (error) {
    welcomeTitle.textContent = 'Não foi possível carregar';
    welcomeCopy.textContent = error.message || 'Tente atualizar a página em instantes.';
    renderEmptyState(groupsGrid, 'Os grupos não puderam ser carregados agora.');
    renderEmptyState(budgetsGrid, 'Selecione atualizar para tentar novamente.');
  } finally {
    refreshButton.disabled = false;
  }
}

googleId = getLoggedUserGoogleId();

if (!googleId) {
  window.location.href = '/';
} else {
  fetchUserInfo();
  refreshTimer = window.setInterval(fetchUserInfo, refreshIntervalMs);
}

refreshButton.addEventListener('click', fetchUserInfo);

logoutButton.addEventListener('click', () => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }

  window.localStorage.removeItem('orcamentoJaSession');
  window.location.href = '/';
});
