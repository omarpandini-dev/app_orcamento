const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const publicDir = path.join(__dirname, 'public');
const port = process.env.PORT || 3000;
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const webhookUrl = process.env.WEBHOOK_URL || '';
const webhookAuthorization = process.env.WEBHOOK_AUTHORIZATION || '';
const createGroupWebhookUrl = process.env.CREATE_GROUP_WEBHOOK_URL || '';
const createGroupWebhookAuthorization = process.env.CREATE_GROUP_WEBHOOK_AUTHORIZATION || '';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function resolveFile(urlPath) {
  const cleanPath = urlPath === '/' ? '/index.html' : urlPath;
  const normalizedPath = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, '');
  return path.join(publicDir, normalizedPath);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk.toString();
    });

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'GET' && requestUrl.pathname === '/app-config.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    response.end(`window.APP_CONFIG = ${JSON.stringify({ googleClientId })};`);
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/google-login') {
    readJsonBody(request)
      .then(async (payload) => {
        const requiredFields = ['google_id', 'name', 'email', 'picture'];
        const missingField = requiredFields.find((field) => !payload[field]);

        if (missingField) {
          sendJson(response, 400, { error: `Campo obrigatorio ausente: ${missingField}` });
          return;
        }

        if (!webhookUrl || !webhookAuthorization) {
          sendJson(response, 500, {
            error: 'WEBHOOK_URL e WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': webhookAuthorization
          },
          body: JSON.stringify(payload)
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao consultar o webhook.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao processar login Google.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/cria-grupo') {
    readJsonBody(request)
      .then(async (payload) => {
        const requiredFields = ['idUsuario', 'nmGrupo'];
        const missingField = requiredFields.find((field) => !payload[field]);

        if (missingField) {
          sendJson(response, 400, { error: `Campo obrigatorio ausente: ${missingField}` });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'CRIA_GRUPO',
            idUsuario: payload.idUsuario,
            nmGrupo: payload.nmGrupo
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao criar grupo.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao criar grupo.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/busca-info-usuario') {
    readJsonBody(request)
      .then(async (payload) => {
        if (!payload.idUsuario) {
          sendJson(response, 400, { error: 'Campo obrigatorio ausente: idUsuario' });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'BUSCA_INFO_USUARIO',
            idUsuario: payload.idUsuario
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao buscar informacoes do usuario.',
            details: responseData
          });
          return;
        }

       // console.log('Retorno json API BUSCA_INFO_USUARIO');
       // console.log( responseData);

       // console.log(JSON.stringify(responseData, null, 2));

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao buscar informacoes do usuario.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/cria-orcamento') {
    readJsonBody(request)
      .then(async (payload) => {
        const requiredFields = ['idGrupo', 'idUsuario', 'dsCategoria', 'diaCorte', 'valorMeta'];
        const missingField = requiredFields.find((field) => !payload[field]);

        if (missingField) {
          sendJson(response, 400, { error: `Campo obrigatorio ausente: ${missingField}` });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'CRIA_ORCAMENTO',
            idGrupo: payload.idGrupo,
            idUsuario: payload.idUsuario,
            dsCategoria: payload.dsCategoria,
            diaCorte: payload.diaCorte,
            valorMeta: payload.valorMeta
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao criar orcamento.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao criar orcamento.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/atualiza-orcamento') {
    readJsonBody(request)
      .then(async (payload) => {
        const requiredFields = ['idOrcamento', 'dsCategoria', 'diaCorte', 'valorMeta'];
        const missingField = requiredFields.find((field) => !payload[field]);

        if (missingField) {
          sendJson(response, 400, { error: `Campo obrigatorio ausente: ${missingField}` });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'ATUALIZA_ORCAMENTO',
            idOrcamento: payload.idOrcamento,
            dsCategoria: payload.dsCategoria,
            diaCorte: payload.diaCorte,
            valorMeta: payload.valorMeta
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao atualizar orcamento.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao atualizar orcamento.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/exclui-orcamento') {
    readJsonBody(request)
      .then(async (payload) => {
        if (!payload.idOrcamento) {
          sendJson(response, 400, { error: 'Campo obrigatorio ausente: idOrcamento' });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'EXCLUI_ORCAMENTO',
            idOrcamento: payload.idOrcamento
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao excluir orcamento.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao excluir orcamento.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/exclui-grupo') {
    readJsonBody(request)
      .then(async (payload) => {
        if (!payload.idGrupo) {
          sendJson(response, 400, { error: 'Campo obrigatorio ausente: idGrupo' });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'EXCLUI_GRUPO',
            idGrupo: payload.idGrupo
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao excluir grupo.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao excluir grupo.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/exclui-movimento') {
    readJsonBody(request)
      .then(async (payload) => {
        if (!payload.idMovimento) {
          sendJson(response, 400, { error: 'Campo obrigatorio ausente: idMovimento' });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'EXCLUI_MOVIMENTO',
            idMovimento: payload.idMovimento
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao excluir movimento.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao excluir movimento.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/busca-movimentos') {
    readJsonBody(request)
      .then(async (payload) => {
        if (!payload.idOrcamento) {
          sendJson(response, 400, { error: 'Campo obrigatorio ausente: idOrcamento' });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'BUSCA_MOVIMENTOS',
            idOrcamento: payload.idOrcamento
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao buscar movimentos.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao buscar movimentos.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/cria-movimento') {
    readJsonBody(request)
      .then(async (payload) => {
        const requiredFields = ['idOrcamento', 'idUsuario', 'valor', 'descricao'];
        const missingField = requiredFields.find((field) => !payload[field]);

        if (missingField) {
          sendJson(response, 400, { error: `Campo obrigatorio ausente: ${missingField}` });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'CRIA_MOVIMENTO',
            idOrcamento: payload.idOrcamento,
            idUsuario: payload.idUsuario,
            valor: payload.valor,
            descricao: payload.descricao
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao criar movimento.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao criar movimento.'
        });
      });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/entra-grupo-usuario') {
    readJsonBody(request)
      .then(async (payload) => {
        const requiredFields = ['idGrupo', 'idUsuario'];
        const missingField = requiredFields.find((field) => !payload[field]);

        if (missingField) {
          sendJson(response, 400, { error: `Campo obrigatorio ausente: ${missingField}` });
          return;
        }

        if (!createGroupWebhookUrl || !createGroupWebhookAuthorization) {
          sendJson(response, 500, {
            error: 'CREATE_GROUP_WEBHOOK_URL e CREATE_GROUP_WEBHOOK_AUTHORIZATION precisam estar configurados no servidor.'
          });
          return;
        }

        const webhookResponse = await fetch(createGroupWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': createGroupWebhookAuthorization
          },
          body: JSON.stringify({
            operacao: 'ENTRA_GRUPO_USUARIO',
            idGrupo: payload.idGrupo,
            idUsuario: payload.idUsuario
          })
        });

        const responseText = await webhookResponse.text();
        let responseData;

        try {
          responseData = responseText ? JSON.parse(responseText) : null;
        } catch (error) {
          responseData = responseText;
        }

        if (!webhookResponse.ok) {
          sendJson(response, webhookResponse.status, {
            error: 'Falha ao entrar no grupo.',
            details: responseData
          });
          return;
        }

        sendJson(response, 200, responseData);
      })
      .catch((error) => {
        const statusCode = error instanceof SyntaxError ? 400 : 500;
        sendJson(response, statusCode, {
          error: statusCode === 400 ? 'JSON invalido.' : 'Erro interno ao entrar no grupo.'
        });
      });
    return;
  }

  const filePath = resolveFile(requestUrl.pathname);

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': ['.html', '.js', '.css'].includes(extension)
        ? 'no-cache'
        : 'public, max-age=31536000, immutable'
    };

    if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
      headers['Cache-Control'] = 'no-cache';
    }

    response.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, () => {
  console.log(`Orçamento Já disponível em http://localhost:${port}`);
});
