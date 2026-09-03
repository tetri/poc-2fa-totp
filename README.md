# 2FA Enterprise (TOTP RFC 6238)

Exemplo em Node.js de autenticação multifator moderna e segura: **Cadastro de Usuário + Senha (bcrypt) + TOTP (AES-256-GCM) + Códigos de Backup Descartáveis + Anti-Replay + Rate Limiting + Proteção CSRF + Auditoria de Segurança + Notificações Transacionais via Resend**.

Totalmente compatível com **Google Authenticator**, **Microsoft Authenticator**, **1Password**, **Bitwarden** e qualquer app TOTP padrão.

---

## Recursos de Segurança

- **Cadastro Completo:** Registro de usuário com validação de dados, unicidade de e-mail e hash bcrypt (12 rounds).
- **Criptografia em Repouso (AES-256-GCM):** O segredo TOTP (`otpauth://`) é armazenado cifrado com vetor de inicialização (IV) e tag de integridade no SQLite.
- **Prevenção Anti-Replay:** Controle de `last_totp_step` no banco para bloquear a reutilização do mesmo token dentro da mesma janela temporal de 30 segundos.
- **Defesa Anti-Brute-Force:** Rate limiting granular por IP/conta bloqueando temporariamente tentativas sucessivas de login e verificação de token.
- **Proteção Anti-CSRF:** Geração e validação de tokens criptográficos de sessão em todas as requisições POST.
- **Contingência e Códigos de Backup:** Geração de 8 códigos descartáveis de uso único com hash bcrypt na ativação do 2FA.
- **Recuperação e Alertas via Resend:** Envio transacional de e-mails para redefinição segura de segundo fator e alertas em tempo real de acessos por contingência.
- **Trilha de Auditoria:** Tabela `audit_logs` registrando eventos críticos (`REGISTER`, `LOGIN`, `TOTP_VERIFY`, `RECOVERY_CODE`, `2FA_RESET`, `LOGOUT`) com exibição no Painel de Controle.
- **Acessibilidade Web (WCAG AA):** Interface com semântica HTML5, estados de foco explícitos, alertas acessíveis (`role="alert"`, `aria-live="polite"`) e responsividade.

---

## Como Executar

### Pré-requisitos
- Node.js 20 ou superior
- Gerenciador de pacotes `npm`

### 1. Clonar e Instalar Dependências
```powershell
git clone <url-do-repositorio>
cd poc-2fa-totp
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e preencha suas variáveis:
```powershell
Copy-Item .env.example .env
```

Configurações disponíveis no `.env`:
```env
PORT=3000
APP_NAME=POC 2FA Enterprise
APP_URL=http://localhost:3000
SESSION_SECRET=coloque-um-segredo-de-sessao-forte-aqui
ENCRYPTION_KEY=coloque-uma-chave-de-criptografia-aqui
RESEND_API_KEY=re_123456789
EMAIL_FROM=onboarding@resend.dev
```

> **Dica para gerar chaves fortes:**
> ```bash
> node -e "console.log(crypto.randomBytes(32).toString('hex'))"
> ```

### 3. Iniciar o Servidor
```powershell
npm start
```
Acesse `http://localhost:3000` no navegador.

---

## Fluxo da Aplicação

1. **Registro (`/register`):** Crie uma conta com usuário, e-mail e senha.
2. **Ativação 2FA (`/enroll`):** Escaneie o QR Code no seu aplicativo autenticador, guarde os 8 códigos de backup descartáveis e confirme com o código de 6 dígitos.
3. **Login (`/`):** Entre com usuário e senha.
4. **Verificação (`/verify`):** Informe o código temporário do autenticador.
5. **Recuperação (`/verify/recovery` ou `/recover/email`):** Caso perca o aparelho, use um código de backup ou solicite o link de redefinição por e-mail.
6. **Painel de Controle (`/dashboard`):** Visualize detalhes de segurança, status da criptografia, contagem de códigos restantes e histórico de auditoria.

---

## Estrutura do Projeto

```text
├── src/
│   ├── server.js    # Servidor Express, banco SQLite, rotas, crypto AES e Resend
│   └── views.js     # Templates HTML semânticos e componentes de acessibilidade
├── data/            # Banco SQLite criado em tempo de execução (ignorado no Git)
├── .env.example     # Modelo de configuração de ambiente
├── .gitignore       # Proteção estrita para segredos e dados de runtime
└── README.md        # Documentação técnica do projeto
```

---

## Licença

MIT
