import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import {
  login,
  register,
  enroll,
  verify,
  verifyRecovery,
  recoverEmail,
  dashboard
} from './views.js';

const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const RECOVERY_COUNT = 8;
const BCRYPT_ROUNDS = 12;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const AES_ALGORITHM = 'aes-256-gcm';
const AES_IV_BYTES = 12;

const app = express();
const port = Number(process.env.PORT || 3000);
const appName = process.env.APP_NAME || 'POC 2FA Enterprise';
const appUrl = process.env.APP_URL || `http://localhost:${port}`;

const encSecret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || 'poc-2fa-default-key-32bytes';
const encKey = crypto.createHash('sha256').update(encSecret).digest();

mkdirSync('data', { recursive: true });
const db = new Database('data/auth.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    totp_secret TEXT,
    last_totp_step INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recovery_codes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec('ALTER TABLE users ADD COLUMN last_totp_step INTEGER DEFAULT 0');
} catch {
  // Coluna já existente
}

app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'sessao-segura-desenvolvimento-local',
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrf = req.session.csrfToken;

  if (req.method === 'POST') {
    const sentCsrf = req.body._csrf || req.headers['x-csrf-token'];
    if (!sentCsrf || sentCsrf !== req.session.csrfToken) {
      return res.status(403).send(`
        <!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Sessão Expirada</title>
        <style>body{font-family:system-ui,sans-serif;max-width:440px;margin:48px auto;padding:0 20px;color:#0f172a}
        .card{border:1px solid #cbd5e1;border-radius:12px;padding:24px;background:#fff}
        .btn{display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin-top:16px}</style></head>
        <body><main class="card"><h2>Sessão ou Token Expirado</h2>
        <p style="color:#475569;margin-top:8px;">O servidor foi reiniciado ou a sessão expirou. Atualize a página para continuar com segurança.</p>
        <a href="/" class="btn">Recarregar Página</a></main></body></html>
      `);
    }
  }
  next();
});

const userById = db.prepare('SELECT id, username, email, totp_secret, last_totp_step FROM users WHERE id = ?');
const userByLogin = db.prepare('SELECT id, username, email, password_hash, totp_secret, last_totp_step FROM users WHERE username = ? OR email = ?');
const unusedCodes = db.prepare('SELECT id, code_hash FROM recovery_codes WHERE user_id = ? AND used_at IS NULL');
const countCodes = db.prepare('SELECT COUNT(*) as count FROM recovery_codes WHERE user_id = ? AND used_at IS NULL');
const recentLogs = db.prepare('SELECT event_type, ip_address, details, created_at FROM audit_logs WHERE user_id = ? ORDER BY id DESC LIMIT 5');

function encryptSecret(plainText) {
  if (!plainText) {
    return null;
  }
  const iv = crypto.randomBytes(AES_IV_BYTES);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, encKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(encryptedPayload) {
  if (!encryptedPayload) {
    return null;
  }
  if (!encryptedPayload.includes(':')) {
    return encryptedPayload;
  }
  const [ivHex, tagHex, contentHex] = encryptedPayload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, encKey, iv);
  decipher.setAuthTag(tag);
  return decipher.update(contentHex, 'hex', 'utf8') + decipher.final('utf8');
}

const rateLimitMap = new Map();

function getRateKey(req, action) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip_local';
  return `${action}:${ip}`;
}

function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { attempts: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.attempts = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (entry.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    const secondsRemaining = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, secondsRemaining };
  }

  return { allowed: true, entry };
}

function recordRateLimit(key, success) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { attempts: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (success) {
    rateLimitMap.delete(key);
    return;
  }

  entry.attempts += 1;
  rateLimitMap.set(key, entry);
}

function logAudit(userId, eventType, req, details = '') {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ua = req.headers['user-agent'] || 'Desconhecido';
  db.prepare(`
    INSERT INTO audit_logs (user_id, event_type, ip_address, user_agent, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, eventType, String(ip).slice(0, 45), String(ua).slice(0, 150), details);
}

async function sendEmail({ to, subject, html }) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || 'onboarding@resend.dev').trim();

  if (!apiKey) {
    console.log(`[RESEND_SIMULATION] Para: ${to} | Assunto: ${subject}`);
    return { isLive: false, error: 'Chave RESEND_API_KEY não definida no ambiente.' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.message || errJson.error || response.statusText;
      console.error('[Resend Error]', msg);
      return { isLive: false, error: msg };
    }

    return { isLive: true };
  } catch (error) {
    console.error('[Resend Network Error]', error);
    return { isLive: false, error: error.message };
  }
}

function makeRecoveryCodes(count = RECOVERY_COUNT) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

function getPendingUser(req) {
  if (!req.session.pendingUserId) {
    return null;
  }
  return userById.get(req.session.pendingUserId);
}

function clearUser2FA(userId) {
  db.prepare('UPDATE users SET totp_secret = NULL, last_totp_step = 0 WHERE id = ?').run(userId);
  db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(userId);
}

function totpFor(user, plainSecret) {
  const secret = plainSecret || decryptSecret(user.totp_secret);
  return new OTPAuth.TOTP({
    issuer: appName,
    label: user.username,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret)
  });
}

function validateTotp(user, token, plainSecret = null) {
  if (!/^\d{6}$/.test(token || '')) {
    return { valid: false, reason: 'FORMAT' };
  }

  const totp = totpFor(user, plainSecret);
  const delta = totp.validate({ token, window: 1 });

  if (delta === null) {
    return { valid: false, reason: 'INVALID' };
  }

  const currentStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  const evaluatedStep = currentStep + delta;

  if (evaluatedStep <= (user.last_totp_step || 0)) {
    return { valid: false, reason: 'REPLAY' };
  }

  return { valid: true, step: evaluatedStep };
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  next();
}

app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.send(login({ csrf: res.locals.csrf }));
});

app.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.send(register({ csrf: res.locals.csrf }));
});

app.post('/register', (req, res) => {
  const { username, email, password, confirm_password } = req.body;
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanUser || !cleanEmail || !password) {
    return res.status(400).send(register({ error: 'Preencha todos os campos obrigatórios.', values: req.body, csrf: res.locals.csrf }));
  }

  if (cleanUser.length < 3 || cleanUser.length > 30) {
    return res.status(400).send(register({ error: 'O nome de usuário deve ter entre 3 e 30 caracteres.', values: req.body, csrf: res.locals.csrf }));
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).send(register({ error: 'Formato de e-mail inválido.', values: req.body, csrf: res.locals.csrf }));
  }

  if (password.length < 8) {
    return res.status(400).send(register({ error: 'A senha deve conter no mínimo 8 caracteres.', values: req.body, csrf: res.locals.csrf }));
  }

  if (password !== confirm_password) {
    return res.status(400).send(register({ error: 'As senhas informadas não coincidem.', values: req.body, csrf: res.locals.csrf }));
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(cleanUser, cleanEmail);
  if (existing) {
    return res.status(409).send(register({ error: 'Nome de usuário ou e-mail já cadastrado.', values: req.body, csrf: res.locals.csrf }));
  }

  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(cleanUser, cleanEmail, passwordHash);

  logAudit(result.lastInsertRowid, 'REGISTER', req, `Novo usuário registrado: ${cleanUser}`);

  req.session.pendingUserId = result.lastInsertRowid;
  res.redirect('/enroll');
});

app.post('/login', (req, res) => {
  const rateKey = getRateKey(req, 'login');
  const rateStatus = checkRateLimit(rateKey);

  if (!rateStatus.allowed) {
    return res.status(429).send(login({
      error: `Muitas tentativas falhas. Bloqueado por ${rateStatus.secondsRemaining} segundos.`,
      csrf: res.locals.csrf
    }));
  }

  const queryUser = (req.body.username || '').trim().toLowerCase();
  const user = userByLogin.get(queryUser, queryUser);

  if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash)) {
    recordRateLimit(rateKey, false);
    if (user) {
      logAudit(user.id, 'LOGIN_FAILED', req, 'Tentativa com credenciais inválidas');
    }
    return res.status(401).send(login({ error: 'Credenciais inválidas.', csrf: res.locals.csrf }));
  }

  recordRateLimit(rateKey, true);
  logAudit(user.id, 'LOGIN_PASSWORD_OK', req, 'Senha validada com sucesso');

  req.session.pendingUserId = user.id;
  res.redirect(user.totp_secret ? '/verify' : '/enroll');
});

app.get('/enroll', async (req, res) => {
  const user = getPendingUser(req);
  if (!user) {
    return res.redirect('/');
  }
  if (user.totp_secret) {
    return res.redirect('/verify');
  }

  if (!req.session.enrollmentSecret) {
    req.session.enrollmentSecret = new OTPAuth.Secret({ size: 20 }).base32;
    req.session.enrollmentRecoveryCodes = makeRecoveryCodes();
  }

  const totp = new OTPAuth.TOTP({
    issuer: appName,
    label: user.username,
    secret: OTPAuth.Secret.fromBase32(req.session.enrollmentSecret)
  });

  const error = req.session.enrollmentError;
  delete req.session.enrollmentError;

  res.send(enroll({
    qrCode: await QRCode.toDataURL(totp.toString()),
    secret: req.session.enrollmentSecret,
    recoveryCodes: req.session.enrollmentRecoveryCodes,
    error,
    csrf: res.locals.csrf
  }));
});

app.post('/enroll', (req, res) => {
  const user = getPendingUser(req);
  const secret = req.session.enrollmentSecret;
  const codes = req.session.enrollmentRecoveryCodes;

  if (!user || !secret || !codes) {
    return res.redirect('/');
  }

  const candidate = { ...user, last_totp_step: 0 };
  const validation = validateTotp(candidate, req.body.token, secret);

  if (!validation.valid) {
    req.session.enrollmentError = 'Código de verificação inválido. Aguarde a troca do código no app e tente novamente.';
    return res.redirect('/enroll');
  }

  const encryptedSecret = encryptSecret(secret);

  db.transaction(() => {
    db.prepare('UPDATE users SET totp_secret = ?, last_totp_step = ? WHERE id = ?').run(
      encryptedSecret,
      validation.step,
      user.id
    );
    db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(user.id);
    const insertCode = db.prepare('INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)');
    for (const code of codes) {
      insertCode.run(user.id, bcrypt.hashSync(code.trim().toUpperCase(), BCRYPT_ROUNDS));
    }
  })();

  logAudit(user.id, '2FA_ENROLLED', req, '2FA ativado com criptografia AES-256 e códigos de backup');

  req.session.userId = user.id;
  delete req.session.pendingUserId;
  delete req.session.enrollmentSecret;
  delete req.session.enrollmentRecoveryCodes;

  res.redirect('/dashboard');
});

app.get('/verify', (req, res) => {
  const user = getPendingUser(req);
  if (!user?.totp_secret) {
    return res.redirect('/');
  }
  res.send(verify({ csrf: res.locals.csrf }));
});

app.post('/verify', (req, res) => {
  const user = getPendingUser(req);
  if (!user?.totp_secret) {
    return res.redirect('/');
  }

  const rateKey = getRateKey(req, `totp:${user.id}`);
  const rateStatus = checkRateLimit(rateKey);

  if (!rateStatus.allowed) {
    return res.status(429).send(verify({
      error: `Muitas tentativas falhas. Bloqueado por ${rateStatus.secondsRemaining} segundos.`,
      csrf: res.locals.csrf
    }));
  }

  const validation = validateTotp(user, req.body.token);

  if (!validation.valid) {
    recordRateLimit(rateKey, false);

    if (validation.reason === 'REPLAY') {
      logAudit(user.id, 'TOTP_REPLAY_BLOCKED', req, 'Tentativa de reutilização de token bloqueada');
      return res.status(400).send(verify({ error: 'Este código já foi utilizado. Aguarde o próximo código no aplicativo.', csrf: res.locals.csrf }));
    }

    logAudit(user.id, 'TOTP_VERIFY_FAILED', req, 'Código TOTP incorreto');
    return res.status(401).send(verify({ error: 'Código inválido ou expirado.', csrf: res.locals.csrf }));
  }

  recordRateLimit(rateKey, true);
  db.prepare('UPDATE users SET last_totp_step = ? WHERE id = ?').run(validation.step, user.id);
  logAudit(user.id, 'TOTP_VERIFY_SUCCESS', req, 'Autenticação 2FA concluída');

  req.session.userId = user.id;
  delete req.session.pendingUserId;
  res.redirect('/dashboard');
});

app.get('/verify/recovery', (req, res) => {
  const user = getPendingUser(req);
  if (!user?.totp_secret) {
    return res.redirect('/');
  }
  res.send(verifyRecovery({ csrf: res.locals.csrf }));
});

app.post('/verify/recovery', async (req, res) => {
  const user = getPendingUser(req);
  if (!user?.totp_secret) {
    return res.redirect('/');
  }

  const rateKey = getRateKey(req, `recovery:${user.id}`);
  const rateStatus = checkRateLimit(rateKey);

  if (!rateStatus.allowed) {
    return res.status(429).send(verifyRecovery({
      error: `Muitas tentativas. Aguarde ${rateStatus.secondsRemaining}s.`,
      csrf: res.locals.csrf
    }));
  }

  const rawCode = (req.body.recovery_code || '').trim().toUpperCase();
  const available = unusedCodes.all(user.id);
  const match = available.find(c => bcrypt.compareSync(rawCode, c.code_hash));

  if (!match) {
    recordRateLimit(rateKey, false);
    logAudit(user.id, 'RECOVERY_CODE_FAILED', req, 'Código de contingência inválido');
    return res.status(401).send(verifyRecovery({ error: 'Código de recuperação inválido ou já utilizado.', csrf: res.locals.csrf }));
  }

  recordRateLimit(rateKey, true);
  db.prepare('UPDATE recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(match.id);
  logAudit(user.id, 'RECOVERY_CODE_USED', req, `Código de backup ID #${match.id} consumido`);

  await sendEmail({
    to: user.email,
    subject: 'Alerta de Segurança: Código de Recuperação 2FA Utilizado',
    html: `
      <h2>Alerta de Acesso com Código Reserva</h2>
      <p>Olá <strong>${user.username}</strong>,</p>
      <p>Um código de recuperação descartável foi utilizado para autenticar na sua conta.</p>
      <p>Se não foi você, acesse o painel imediatamente para redefinir suas credenciais.</p>
    `
  });

  req.session.userId = user.id;
  req.session.dashNotice = 'Atenção: Você utilizou um código de recuperação descartável. Um alerta foi enviado para seu e-mail.';
  delete req.session.pendingUserId;

  res.redirect('/dashboard');
});

app.get('/recover/email', (req, res) => {
  const user = getPendingUser(req);
  if (!user?.totp_secret) {
    return res.redirect('/');
  }
  res.send(recoverEmail({ email: user.email, sent: false, csrf: res.locals.csrf }));
});

app.post('/recover/email', async (req, res) => {
  const user = getPendingUser(req);
  if (!user?.totp_secret) {
    return res.redirect('/');
  }

  const token = crypto.randomBytes(24).toString('hex');
  req.session.resetToken = token;
  req.session.resetUserId = user.id;

  const resetLink = `${appUrl}/recover/reset?token=${token}`;
  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Redefinição de Segundo Fator (2FA)',
    html: `
      <h2>Solicitação de Redefinição de 2FA</h2>
      <p>Olá <strong>${user.username}</strong>,</p>
      <p>Recebemos uma solicitação para desvincular o autenticador atual e reconfigurar seu 2FA.</p>
      <p><a href="${resetLink}" style="background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px;display:inline-block;">Clique aqui para Redefinir seu 2FA</a></p>
      <p>Ou acesse o link: <code>${resetLink}</code></p>
    `
  });

  logAudit(user.id, '2FA_RESET_REQUEST', req, `Link de redefinição gerado para ${user.email}`);

  res.send(recoverEmail({
    email: user.email,
    token,
    sent: true,
    isLive: emailResult.isLive,
    resendError: emailResult.error,
    csrf: res.locals.csrf
  }));
});

app.get('/recover/reset', async (req, res) => {
  const token = req.query.token;
  if (!token || token !== req.session.resetToken || !req.session.resetUserId) {
    return res.redirect('/');
  }

  const userId = req.session.resetUserId;
  const user = userById.get(userId);

  clearUser2FA(userId);
  logAudit(userId, '2FA_RESET_SUCCESS', req, '2FA desvinculado com sucesso via token de recuperação');

  if (user) {
    await sendEmail({
      to: user.email,
      subject: '2FA Desvinculado com Sucesso',
      html: `<p>Olá <strong>${user.username}</strong>,</p><p>Seu dispositivo 2FA anterior foi desvinculado. Cadastre um novo dispositivo agora.</p>`
    });
  }

  req.session.pendingUserId = userId;
  delete req.session.resetToken;
  delete req.session.resetUserId;

  res.redirect('/enroll');
});

app.get('/dashboard', requireAuth, (req, res) => {
  const user = userById.get(req.session.userId);
  if (!user) {
    return res.redirect('/');
  }

  const remaining = countCodes.get(user.id)?.count || 0;
  const logs = recentLogs.all(user.id);
  const notice = req.session.dashNotice;
  delete req.session.dashNotice;

  res.send(dashboard({
    user,
    recoveryCount: remaining,
    auditLogs: logs,
    notice,
    csrf: res.locals.csrf
  }));
});

app.post('/reset-2fa', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const user = userById.get(userId);

  clearUser2FA(userId);
  logAudit(userId, '2FA_RESET_SELF', req, 'Usuário solicitou reset do 2FA pelo Painel');

  if (user) {
    await sendEmail({
      to: user.email,
      subject: '2FA Redefinido no Painel de Controle',
      html: `<p>Olá <strong>${user.username}</strong>,</p><p>Seu segundo fator foi desvinculado no painel. Configure o novo dispositivo.</p>`
    });
  }

  req.session.pendingUserId = userId;
  delete req.session.userId;
  res.redirect('/enroll');
});

app.post('/logout', requireAuth, (req, res) => {
  const userId = req.session.userId;
  logAudit(userId, 'LOGOUT', req, 'Sessão encerrada');
  req.session.destroy(() => res.redirect('/'));
});

app.listen(port, () => console.log(`2FA Enterprise rodando em ${appUrl}`));


