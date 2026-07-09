const sessionRaw = window.localStorage.getItem('orcamentoJaSession');
const newUserMessage = document.getElementById('newUserMessage');
const createBudgetButton = document.getElementById('createBudgetButton');
const joinGroupButton = document.getElementById('joinGroupButton');
const homeButton = document.getElementById('homeButton');

if (!sessionRaw) {
  window.location.href = '/';
} else {
  const session = JSON.parse(sessionRaw);
  const firstName = session.profile?.name?.split(' ')[0] || 'Usuario';
  newUserMessage.textContent = `${firstName}, seu primeiro acesso foi identificado. Escolha uma opcao para continuar no Orçamento Já.`;
    
    console.log( session.profile?.sub );
}


createBudgetButton.addEventListener('click', () => {
  window.location.href = '/criarGrupo.html';
});

joinGroupButton.addEventListener('click', () => {
  window.alert('Fluxo "Entrar em um Grupo" ainda sera implementado.');
});

homeButton.addEventListener('click', () => {
  window.location.href = '/';
});
