const sessionRaw = window.localStorage.getItem('orcamentoJaSession');
const categoriesGrid = document.getElementById('categoriesGrid');
const welcomeTitle = document.getElementById('welcomeTitle');
const welcomeCopy = document.getElementById('welcomeCopy');
const summaryCategories = document.getElementById('summaryCategories');
const summaryTotal = document.getElementById('summaryTotal');
const logoutButton = document.getElementById('logoutButton');

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function renderEmptyState(message) {
  categoriesGrid.innerHTML = `<article class="empty-card"><p>${message}</p></article>`;
}

if (!sessionRaw) {
  window.location.href = '/';
} else {
  const session = JSON.parse(sessionRaw);
  const categories = session.authData?.arrCategorias || [];
  const firstName = session.profile?.name?.split(' ')[0] || 'Usuario';
  const totalValue = categories.reduce((sum, category) => sum + (Number(category.valor_meta) || 0), 0);

  welcomeTitle.textContent = `Ola, ${firstName}`;
  welcomeCopy.textContent = `Voce possui ${categories.length} categoria${categories.length === 1 ? '' : 's'} ativa${categories.length === 1 ? '' : 's'} no momento.`;
  summaryCategories.textContent = String(categories.length);
  summaryTotal.textContent = formatCurrency(totalValue);

  if (!categories.length) {
    renderEmptyState('Nenhuma categoria encontrada para este usuario.');
  } else {
    categoriesGrid.innerHTML = categories
      .map(
        (category) => `
          <article class="budget-card">
            <div class="budget-card-top">
              <p class="budget-label">Categoria</p>
              <span class="budget-chip">Ativa</span>
            </div>
            <h3>${category.ds_categoria}</h3>
            <p class="budget-value">${formatCurrency(category.valor_meta)}</p>
            <div class="budget-divider"></div>
            <p class="budget-meta">ID do orçamento</p>
            <p class="budget-id">${category.id_orcamento}</p>
          </article>
        `
      )
      .join('');
  }
}

logoutButton.addEventListener('click', () => {
  window.localStorage.removeItem('orcamentoJaSession');
  window.location.href = '/';
});
