function layout(title, body) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | 2FA Enterprise</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #475569;
      --border: #cbd5e1;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --error-bg: #fef2f2;
      --error-text: #b91c1c;
      --success-bg: #f0fdf4;
      --success-text: #15803d;
      --warning-bg: #fffbeb;
      --warning-text: #b45309;
      --focus-ring: 2px solid #2563eb;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px 16px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .container { width: 100%; max-width: 900px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .grid-2 { display: grid; grid-template-columns: 1fr; gap: 32px; }
    @media (min-width: 768px) { .grid-2 { grid-template-columns: 1fr 1fr; } }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; color: var(--text); }
    h2 { font-size: 1.15rem; font-weight: 600; margin-bottom: 12px; color: var(--text); }
    p { margin-bottom: 16px; color: var(--text-muted); }
    form { display: grid; gap: 14px; }
    .form-group { display: grid; gap: 6px; }
    label { font-weight: 600; font-size: 0.875rem; color: var(--text); }
    input {
      font: inherit;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus-visible {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }
    button, .btn-link {
      font: inherit;
      font-weight: 600;
      padding: 12px 16px;
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    button:hover, button:focus-visible, .btn-link:hover, .btn-link:focus-visible {
      background: var(--primary-hover);
      outline: var(--focus-ring);
      outline-offset: 2px;
    }
    .button-secondary { background: #e2e8f0; color: #1e293b; }
    .button-secondary:hover, .button-secondary:focus-visible { background: #cbd5e1; }
    .button-danger { background: #dc2626; color: #fff; }
    .button-danger:hover, .button-danger:focus-visible { background: #b91c1c; }
    .alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 0.875rem; }
    .alert-error { background: var(--error-bg); color: var(--error-text); border: 1px solid #fecaca; }
    .alert-success { background: var(--success-bg); color: var(--success-text); border: 1px solid #bbf7d0; }
    .alert-warning { background: var(--warning-bg); color: var(--warning-text); border: 1px solid #fde68a; }
    .tutorial { background: #f1f5f9; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; }
    .tutorial ol { padding-left: 20px; display: grid; gap: 10px; font-size: 0.875rem; color: var(--text-muted); }
    .tutorial li strong { color: var(--text); }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 4px;
      background: #e2e8f0;
      color: #334155;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-primary { background: #dbeafe; color: #1e40af; }
    .qr-container { text-align: center; margin: 16px 0; }
    .qr-container img { max-width: 220px; height: auto; border: 1px solid var(--border); border-radius: 8px; }
    code {
      font-family: monospace;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      word-break: break-all;
      font-size: 0.875rem;
    }
    .codes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      background: #f8fafc;
      padding: 12px;
      border: 1px dashed var(--border);
      border-radius: 6px;
      margin: 12px 0;
      font-family: monospace;
      font-size: 0.875rem;
    }
    .panel-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .panel-item:last-child { border-bottom: none; }
    .link { color: var(--primary); text-decoration: underline; font-size: 0.875rem; }
    .link:hover { color: var(--primary-hover); }
    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
      margin-top: 10px;
    }
    .audit-table th, .audit-table td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .audit-table th { background: #f8fafc; color: var(--text-muted); font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <main class="card" id="main-content">
      ${body}
    </main>
  </div>
</body>
</html>`;
}

export function login({ error = '', csrf = '' } = {}) {
  return layout('Autenticação', `
    <div class="grid-2">
      <section aria-labelledby="login-heading">
        <h1 id="login-heading">Entrar na Conta</h1>
        <p>Acesse o sistema com suas credenciais para validação em duas etapas.</p>
        
        ${error ? `<div role="alert" aria-live="polite" class="alert alert-error">${error}</div>` : ''}
        
        <form method="post" action="/login" autocomplete="off">
          <input type="hidden" name="_csrf" value="${csrf}">
          <div class="form-group">
            <label for="username">Usuário ou E-mail</label>
            <input id="username" name="username" autocomplete="off" required autofocus>
          </div>
          <div class="form-group">
            <label for="password">Senha</label>
            <input id="password" name="password" type="password" autocomplete="new-password" required>
          </div>
          <button type="submit">Entrar</button>
        </form>
        
        <div style="margin-top: 20px; font-size: 0.875rem;">
          Não possui uma conta? <a href="/register" class="link">Criar conta completa</a>
        </div>
      </section>

      <section class="tutorial" aria-labelledby="tutorial-heading">
        <h2 id="tutorial-heading">Como funciona o 2FA (TOTP)?</h2>
        <p>O Time-based One-Time Password adiciona uma camada extra de proteção:</p>
        <ol>
          <li><strong>Hash da Senha:</strong> Senha validada via hash bcrypt seguro.</li>
          <li><strong>Segredo Criptografado (AES-256-GCM):</strong> Servidor gera chave, cifra em repouso e exibe QR Code (URI <code>otpauth://</code>).</li>
          <li><strong>Código Dinâmico:</strong> Aplicativos autenticadores geram tokens a cada 30 segundos.</li>
          <li><strong>Anti-Replay:</strong> Validação impede reutilização de códigos dentro da mesma janela temporal.</li>
          <li><strong>Contingência:</strong> Códigos de backup e recuperação segura via Resend.</li>
        </ol>
      </section>
    </div>
  `);
}

export function register({ error = '', values = {}, csrf = '' } = {}) {
  return layout('Criar Conta', `
    <div class="grid-2">
      <section aria-labelledby="register-heading">
        <h1 id="register-heading">Criar Nova Conta</h1>
        <p>Cadastre seus dados para habilitar o fluxo 2FA com proteção empresarial.</p>
        
        ${error ? `<div role="alert" aria-live="polite" class="alert alert-error">${error}</div>` : ''}
        
        <form method="post" action="/register" autocomplete="off">
          <input type="hidden" name="_csrf" value="${csrf}">
          <div class="form-group">
            <label for="username">Nome de Usuário</label>
            <input id="username" name="username" value="${values.username || ''}" minlength="3" maxlength="30" required autofocus>
          </div>
          <div class="form-group">
            <label for="email">E-mail (para alertas e recuperação Resend)</label>
            <input id="email" name="email" type="email" value="${values.email || ''}" required>
          </div>
          <div class="form-group">
            <label for="password">Senha (mínimo 8 caracteres)</label>
            <input id="password" name="password" type="password" minlength="8" autocomplete="new-password" required>
          </div>
          <div class="form-group">
            <label for="confirm_password">Confirmar Senha</label>
            <input id="confirm_password" name="confirm_password" type="password" minlength="8" autocomplete="new-password" required>
          </div>
          <button type="submit">Cadastrar e Configurar 2FA</button>
        </form>

        <div style="margin-top: 20px; font-size: 0.875rem;">
          Já possui uma conta? <a href="/" class="link">Voltar ao Login</a>
        </div>
      </section>

      <section class="tutorial" aria-labelledby="security-heading">
        <h2 id="security-heading">Padrões de Segurança Ativos</h2>
        <ol>
          <li><strong>Criptografia em Repouso:</strong> O segredo TOTP é cifrado com AES-256-GCM.</li>
          <li><strong>Códigos de Backup Hashed:</strong> Chaves de contingência descartáveis geradas na ativação.</li>
          <li><strong>Proteção Anti-Brute-Force:</strong> Rate limiting com bloqueio temporário após falhas sucessivas.</li>
          <li><strong>Notificações Resend:</strong> Alertas em tempo real para eventos de contingência.</li>
        </ol>
      </section>
    </div>
  `);
}

export function enroll({ qrCode, secret, recoveryCodes = [], error = '', csrf = '' } = {}) {
  return layout('Configurar 2FA', `
    <section aria-labelledby="enroll-heading">
      <h1 id="enroll-heading">Configurar Segundo Fator (2FA)</h1>
      <p>Conecte seu aplicativo autenticador e guarde seus códigos de recuperação.</p>
      
      ${error ? `<div role="alert" aria-live="polite" class="alert alert-error">${error}</div>` : ''}
      
      <div class="grid-2">
        <div>
          <ol style="display: grid; gap: 12px; margin-bottom: 16px; padding-left: 20px;">
            <li>Escaneie o código QR no <strong>Google Authenticator</strong> ou <strong>Microsoft Authenticator</strong>.</li>
            <li><strong>Guarde os códigos de backup:</strong> Chaves de uso único se perder o aparelho.</li>
            <li>Insira o código de 6 dígitos gerado pelo aplicativo.</li>
          </ol>

          <fieldset style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <legend style="font-size: 0.8125rem; font-weight: 600; padding: 0 4px; color: var(--warning-text);">Códigos de Backup Descartáveis</legend>
            <div class="codes-grid">
              ${recoveryCodes.map(code => `<code>${code}</code>`).join('')}
            </div>
            <p style="font-size: 0.75rem; margin-bottom: 0;">Cada código é válido uma única vez.</p>
          </fieldset>
          
          <form method="post" action="/enroll" autocomplete="off">
            <input type="hidden" name="_csrf" value="${csrf}">
            <div class="form-group">
              <label for="token">Código de 6 dígitos gerado pelo app</label>
              <input id="token" name="token" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
            </div>
            <button type="submit">Ativar 2FA e Entrar</button>
          </form>
        </div>

        <div class="qr-container">
          <img src="${qrCode}" alt="QR Code para escaneamento no aplicativo autenticador">
          <p style="font-size: 0.8125rem; margin-top: 8px;">Chave manual: <code>${secret}</code></p>
        </div>
      </div>
    </section>
  `);
}

export function verify({ error = '', csrf = '' } = {}) {
  return layout('Verificação 2FA', `
    <section aria-labelledby="verify-heading" style="max-width: 440px; margin: 0 auto;">
      <h1 id="verify-heading">Verificação em Duas Etapas</h1>
      <p>Abra seu aplicativo autenticador e informe o código temporário de 6 dígitos.</p>
      
      ${error ? `<div role="alert" aria-live="polite" class="alert alert-error">${error}</div>` : ''}
      
      <form method="post" action="/verify" autocomplete="off">
        <input type="hidden" name="_csrf" value="${csrf}">
        <div class="form-group">
          <label for="token">Código de 6 dígitos</label>
          <input id="token" name="token" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
        </div>
        <button type="submit">Validar Código</button>
      </form>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); display: grid; gap: 8px;">
        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text);">Problemas com o autenticador?</span>
        <a href="/verify/recovery" class="link">Usar código de recuperação de backup</a>
        <a href="/recover/email" class="link">Redefinir 2FA via e-mail cadastrado</a>
      </div>
    </section>
  `);
}

export function verifyRecovery({ error = '', csrf = '' } = {}) {
  return layout('Código de Recuperação', `
    <section aria-labelledby="recovery-heading" style="max-width: 440px; margin: 0 auto;">
      <h1 id="recovery-heading">Código de Backup</h1>
      <p>Informe um dos códigos de recuperação de uso único gerados na ativação.</p>
      
      ${error ? `<div role="alert" aria-live="polite" class="alert alert-error">${error}</div>` : ''}
      
      <form method="post" action="/verify/recovery" autocomplete="off">
        <input type="hidden" name="_csrf" value="${csrf}">
        <div class="form-group">
          <label for="recovery_code">Código de Recuperação (ex: ABCD-EFGH)</label>
          <input id="recovery_code" name="recovery_code" placeholder="XXXX-XXXX" required autofocus style="text-transform: uppercase; font-family: monospace;">
        </div>
        <button type="submit">Entrar com Código Reserva</button>
      </form>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); display: grid; gap: 8px;">
        <a href="/verify" class="link">Voltar para código do autenticador</a>
        <a href="/recover/email" class="link">Redefinir 2FA por e-mail</a>
      </div>
    </section>
  `);
}

export function recoverEmail({ email, token = '', error = '', resendError = '', sent = false, isLive = false, csrf = '' } = {}) {
  return layout('Recuperação por E-mail', `
    <section aria-labelledby="email-recovery-heading" style="max-width: 480px; margin: 0 auto;">
      <h1 id="email-recovery-heading">Recuperação de 2FA</h1>
      <p>Redefina o segundo fator caso tenha perdido o dispositivo autenticador e os códigos de backup.</p>
      
      ${error ? `<div role="alert" aria-live="polite" class="alert alert-error">${error}</div>` : ''}
      
      ${sent ? `
        ${isLive ? `
          <div class="alert alert-success" role="status">
            E-mail de redefinição enviado com sucesso via <strong>Resend</strong> para <strong>${email}</strong>.
          </div>
          <p style="font-size: 0.875rem;">Verifique sua caixa de entrada (ou spam) em <strong>${email}</strong> e clique no link de redefinição recebido.</p>
        ` : `
          ${resendError ? `
            <div class="alert alert-warning" role="alert">
              <strong>Aviso da API Resend:</strong> ${resendError}
            </div>
          ` : `
            <div class="alert alert-warning" role="status">
              Modo Simulação: <code>RESEND_API_KEY</code> não detectada no arquivo <code>.env</code> ao iniciar o servidor.
            </div>
          `}
          <div style="background: #eff6ff; border-left: 4px solid var(--primary); padding: 12px; border-radius: 4px; margin-bottom: 20px; font-size: 0.875rem;">
            <strong>Link de Contingência Direto:</strong>
            <p style="margin: 8px 0 12px 0;">Como o e-mail não pôde ser despachado, utilize o link de contingência abaixo:</p>
            <a href="/recover/reset?token=${token}" class="btn-link" style="width: 100%;">Acessar Link de Redefinição</a>
          </div>
        `}
      ` : `
        <form method="post" action="/recover/email">
          <input type="hidden" name="_csrf" value="${csrf}">
          <p>Confirme o envio do link de contingência para <strong>${email}</strong>:</p>
          <button type="submit">Enviar Link de Recuperação</button>
        </form>
      `}

      <div style="margin-top: 20px; text-align: center;">
        <a href="/" class="link">Voltar ao início</a>
      </div>
    </section>
  `);
}

export function dashboard({ user, recoveryCount = 0, auditLogs = [], notice = '', error = '', csrf = '' } = {}) {
  return layout('Painel de Controle', `
    <section aria-labelledby="dash-heading">
      <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 id="dash-heading">Painel de Controle</h1>
          <p style="margin-bottom: 0;">Visão geral da sua sessão segura.</p>
        </div>
        <form method="post" action="/logout">
          <input type="hidden" name="_csrf" value="${csrf}">
          <button type="submit" class="button-secondary">Encerrar Sessão</button>
        </form>
      </header>

      ${notice ? `<div role="status" class="alert alert-warning">${notice}</div>` : ''}
      ${error ? `<div role="alert" class="alert alert-error">${error}</div>` : ''}

      <div role="status" class="alert alert-success">
        Autenticação concluída com sucesso via <strong>Senha + TOTP (AES-256 Encrypted)</strong>.
      </div>

      <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-top: 20px;">
        <h2 style="font-size: 1.1rem; margin-bottom: 16px;">Detalhes de Segurança da Conta</h2>
        
        <div class="panel-item">
          <span style="color: var(--text-muted); font-size: 0.875rem;">Usuário</span>
          <strong>${user.username}</strong>
        </div>

        <div class="panel-item">
          <span style="color: var(--text-muted); font-size: 0.875rem;">E-mail Cadastrado</span>
          <span>${user.email}</span>
        </div>
        
        <div class="panel-item">
          <span style="color: var(--text-muted); font-size: 0.875rem;">Status do 2FA</span>
          <span class="badge badge-success">Ativo (TOTP SHA-1 + Anti-Replay)</span>
        </div>

        <div class="panel-item">
          <span style="color: var(--text-muted); font-size: 0.875rem;">Criptografia em Repouso</span>
          <span class="badge badge-primary">AES-256-GCM</span>
        </div>

        <div class="panel-item">
          <span style="color: var(--text-muted); font-size: 0.875rem;">Códigos de Backup Disponíveis</span>
          <span class="badge ${recoveryCount > 2 ? 'badge-success' : 'badge-warning'}">${recoveryCount} restante(s)</span>
        </div>
      </div>

      <div style="margin-top: 24px;">
        <h2>Últimos Eventos de Auditoria</h2>
        <div style="overflow-x: auto; background: #ffffff; border: 1px solid var(--border); border-radius: 8px;">
          <table class="audit-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Evento</th>
                <th>IP</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogs.length ? auditLogs.map(log => `
                <tr>
                  <td>${log.created_at}</td>
                  <td><strong>${log.event_type}</strong></td>
                  <td><code>${log.ip_address}</code></td>
                  <td>${log.details || '-'}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhum evento registrado</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-top: 24px; padding: 20px; border: 1px solid #fecaca; border-radius: 8px; background: #fff5f5;">
        <h2 style="font-size: 1rem; color: var(--error-text); margin-bottom: 8px;">Gerenciamento do Dispositivo 2FA</h2>
        <p style="font-size: 0.875rem; margin-bottom: 12px;">Trocou de celular ou deseja revogar o autenticador atual? Desvincule o 2FA para registrar uma nova chave.</p>
        <form method="post" action="/reset-2fa" onsubmit="return confirm('Deseja redefinir seu 2FA? Você precisará cadastrar um novo QR Code.');">
          <input type="hidden" name="_csrf" value="${csrf}">
          <button type="submit" class="button-danger" style="font-size: 0.875rem; padding: 8px 14px;">Redefinir e Gerar Novo 2FA</button>
        </form>
      </div>
    </section>
  `);
}
