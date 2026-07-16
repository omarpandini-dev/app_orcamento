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

function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const input = document.createElement('input');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  document.execCommand('copy');
  input.remove();
  return Promise.resolve();
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

function createCopyGroupIdButton(group) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-id-button';
  button.textContent = 'Copiar ID';
  button.setAttribute('aria-label', 'Copiar ID do grupo');
  button.title = 'Copiar ID do grupo';
  button.addEventListener('click', async (event) => {
    event.stopPropagation();

    try {
      await copyTextToClipboard(group.idGrupo || '');
      button.textContent = 'Copiado';
    } catch (error) {
      button.textContent = 'Erro';
    }

    window.setTimeout(() => {
      button.textContent = 'Copiar ID';
    }, 1400);
  });

  return button;
}

function createBudgetButton(group) {
  const createBudgetButton = document.createElement('button');
  createBudgetButton.type = 'button';
  createBudgetButton.className = 'primary-button';
  createBudgetButton.textContent = 'Criar Orcamento';
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

function createEditGroupButton(group) {
  const button = document.createElement('button');
  const target = new URL('/manutgrupo.html', window.location.origin);

  target.searchParams.set('idGrupo', group.idGrupo || '');
  target.searchParams.set('dsGrupo', group.dsGrupo || '');

  button.type = 'button';
  button.className = 'icon-button';
  button.setAttribute('aria-label', 'Editar grupo');
  button.title = 'Editar grupo';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  button.addEventListener('click', (event) => {
    event.stopPropagation();
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

function createListMovementsButton(budget) {
  const button = document.createElement('button');
  const target = new URL('/listamovimentos.html', window.location.origin);
  const idOrcamento = budget.id_orcamento || budget.idOrcamento || '';
  const dsCategoria = budget.ds_categoria || budget.dsCategoria || '';

  target.searchParams.set('idOrcamento', idOrcamento);
  target.searchParams.set('dsCategoria', dsCategoria);

  button.type = 'button';
  button.className = 'icon-button';
  button.setAttribute('aria-label', 'Listar movimentos');
  button.title = 'Listar movimentos';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>';
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
   // actions.append(createJoinGroupButton());
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
    createTextElement('p', '', 'Nenhum grupo encontrado para este usuario.'),
   // createGroupButton(),
    createJoinGroupButton()
  );

  groupsGrid.append(card);
}

function renderNoBudgetsState(group) {
  clearElement(budgetsGrid);

  const card = document.createElement('article');
  card.className = 'empty-card empty-card-action';

  card.append(
    createTextElement('p', '', 'Nenhum orcamento encontrado para este grupo.')
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
  selectedGroupTitle.textContent = group ? `Orcamentos de ${group.dsGrupo}` : 'Orcamentos do grupo';
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
    cardActions.append(createMovementButton(budget), createListMovementsButton(budget));

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
      createTextElement('p', 'budget-meta', 'ID do orcamento'),
      createTextElement('p', 'budget-id', budget.id_orcamento || budget.idOrcamento || '-')
    );

    budgetsGrid.append(card);
  });
}

function selectGroup(group, groups) {
  selectedGroupId = group.idGrupo;
  renderGroups(groups);
}

function renderGroups(groups) {
  if (!groups.length) {
    renderNoGroupsState();
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
    const isAdmin = group.admin === 'S';
    const card = document.createElement('article');
    card.className = `group-card${isSelected ? ' is-selected' : ''}`;
    card.dataset.groupId = group.idGrupo;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const top = document.createElement('div');
    top.className = 'budget-card-top';
    const groupActions = document.createElement('div');
    groupActions.className = 'budget-card-actions';
    groupActions.append(
      createTextElement('span', 'budget-chip', `${budgets.length} orcamento${budgets.length === 1 ? '' : 's'}`),
      createCopyGroupIdButton(group)
    );

    if (isAdmin) {
      groupActions.append(createEditGroupButton(group));
    }

    top.append(
      createTextElement('p', 'budget-label', isAdmin ? 'Admin' : 'Participante'),
      groupActions
    );

    const groupTotal = budgets.reduce((sum, budget) => sum + (Number(budget.valor_meta) || 0), 0);

    card.append(
      top,
      createTextElement('h3', '', group.dsGrupo || 'Grupo sem nome'),
      createTextElement('p', 'group-card-copy', `Total do grupo: ${formatCurrency(groupTotal)}`)
    );

    card.addEventListener('click', () => {
      selectGroup(group, groups);
    });

    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      selectGroup(group, groups);
    });

     groupsGrid.append(card);
  });

  renderBudgets(groups.find((group) => group.idGrupo === selectedGroupId) || groups[0]);
}

function renderDashboard(userInfo) {
  const groups = userInfo.gruposOrcamentos || [];
  const budgets = getAllBudgets(groups);
  const totalValue = budgets.reduce((sum, budget) => sum + (Number(budget.valor_meta) || 0), 0);
  const firstName = (userInfo.nome || 'Usuario').split(' ')[0];

  welcomeTitle.textContent = `Ola, ${firstName}`;
  welcomeCopy.textContent = `${userInfo.nome || 'Usuario'}, voce possui ${groups.length} grupo${groups.length === 1 ? '' : 's'} de orcamento.`;
  summaryGroups.textContent = String(groups.length);
  summaryTotal.textContent = formatCurrency(totalValue);
  lastUpdated.textContent = `Atualizado as ${new Date().toLocaleTimeString('pt-BR', {
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
    welcomeCopy.textContent = 'Buscando informacoes atualizadas...';

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
      throw new Error(result?.error || 'Nao foi possivel buscar as informacoes do usuario.');
    }

    const userInfo = normalizeUserInfo(result);

    if (!userInfo) {
      throw new Error('Resposta da API em formato inesperado.');
    }

    renderDashboard(userInfo);
  } catch (error) {
    welcomeTitle.textContent = 'Nao foi possivel carregar';
    welcomeCopy.textContent = error.message || 'Tente atualizar a pagina em instantes.';
    renderEmptyState(groupsGrid, 'Os grupos nao puderam ser carregados agora.');
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
