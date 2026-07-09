const installButton = document.getElementById('installButton');
const installMessage = document.getElementById('installMessage');
const googleButtonHost = document.getElementById('googleButtonHost');
const googleStatus = document.getElementById('googleStatus');
const googleError = document.getElementById('googleError');
const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
const googleClientId = window.APP_CONFIG?.googleClientId || '';

let deferredPrompt = null;

function decodeJwt(token) {
  const payload = token.split('.')[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = window.atob(normalized);
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

function setGoogleLoadingState(isLoading) {
  googleButtonHost.classList.toggle('is-loading', isLoading);
  googleButtonHost.setAttribute('aria-busy', String(isLoading));
}

function showGoogleError(message) {
  googleError.hidden = false;
  googleError.textContent = message;
}

function clearGoogleError() {
  googleError.hidden = true;
  googleError.textContent = '';
}

async function processGoogleLogin(response) {
  try {
    setGoogleLoadingState(true);
    clearGoogleError();
    googleStatus.textContent = 'Recebemos seu login. Validando dados com o servidor...';

    const profile = decodeJwt(response.credential);
    const payload = {
      google_id: profile.sub,
      name: profile.name,
      email: profile.email,
      picture: profile.picture
    };

    const apiResponse = await fetch('/api/google-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await apiResponse.json();

    if (!apiResponse.ok) {
      const details =
        typeof result?.details === 'string'
          ? result.details
          : result?.details?.message || result?.details?.error || '';
      const message = [result?.error || 'Nao foi possivel validar seu acesso.', details]
        .filter(Boolean)
        .join(' ');
      throw new Error(message);
    }

    const authData = Array.isArray(result) ? result[0]?.resposta : null;

    if (!authData) {
      throw new Error('Resposta da API em formato inesperado.');
    }

    const sessionPayload = {
      profile,
      authData
    };

    window.localStorage.setItem('orcamentoJaSession', JSON.stringify(sessionPayload));

    if (authData.idUsuarioNovo === 'S') {
      window.location.href = '/novoUsuario.html';
      return;
    }

    if (authData.idPossuiOrcamentos === 'S' && authData.idUsuarioNovo === 'N') {
      window.location.href = '/main.html';
      return;
    }

    googleStatus.textContent = 'Login concluido, mas nenhum fluxo automatico foi definido para esse retorno.';
  } catch (error) {
    showGoogleError(error.message || 'Falha ao processar o login com Google.');
    googleStatus.textContent = 'Nao foi possivel concluir o login. Tente novamente.';
  } finally {
    setGoogleLoadingState(false);
  }
}

function initializeGoogleLogin() {
  if (!googleClientId) {
    googleButtonHost.innerHTML = '';
    googleStatus.textContent = 'Defina GOOGLE_CLIENT_ID no servidor para habilitar o login.';
    return;
  }

  if (!window.google?.accounts?.id) {
    googleButtonHost.innerHTML = '';
    googleStatus.textContent = 'O script do Google nao carregou. Atualize a pagina para tentar novamente.';
    return;
  }

  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: processGoogleLogin,
    ux_mode: 'popup'
  });
  
  window.google.accounts.id.renderButton(googleButtonHost, {
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    width: googleButtonHost.offsetWidth || 320
  });

  window.google.accounts.id.prompt();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
      console.error('Falha ao registrar o service worker.', error);
    }
  });
}

if (isStandalone) {
  installMessage.textContent = 'O app ja esta instalado neste dispositivo.';
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.hidden = false;
  installMessage.textContent = 'Este dispositivo suporta instalacao direta. Clique para adicionar o app.';
});

installButton.addEventListener('click', async () => {
  if (!deferredPrompt) {
    return;
  }

  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.hidden = true;

  if (choice.outcome === 'accepted') {
    installMessage.textContent = 'Instalacao iniciada com sucesso.';
  } else {
    installMessage.textContent = 'Instalacao cancelada. Voce pode tentar novamente quando quiser.';
  }
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  installMessage.textContent = 'App instalado com sucesso.';
});

if (isIos && !isStandalone) {
  installMessage.textContent = 'No iPhone ou iPad, toque em Compartilhar e escolha Adicionar a Tela de Inicio.';
}

window.addEventListener('load', initializeGoogleLogin);
