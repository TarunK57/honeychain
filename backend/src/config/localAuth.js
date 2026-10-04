// Local development authentication used only when Supabase cannot be reached.
// Passwords are stored as scrypt hashes and bearer tokens are stored as hashes.
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../../.local-auth.json');
const bootstrapEmail = (process.env.HONEYCHAIN_SUPERADMIN_EMAIL || process.env.MEDITRACE_SUPERADMIN_EMAIL || 'Superadmin@gmail.com').toLowerCase();
const bootstrapPassword = process.env.HONEYCHAIN_SUPERADMIN_PASSWORD || process.env.MEDITRACE_SUPERADMIN_PASSWORD || 'Superadmin@123';

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { users: [], sessions: [] };
  }
}

function writeStore(store) {
  const temporaryPath = `${storePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, storePath);
}

function passwordHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    user_metadata: { full_name: user.full_name, role: user.role, company_name: user.company_name }
  };
}

function profileFor(user) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    company_name: user.company_name || null,
    created_at: user.created_at,
    local: true
  };
}

function ensureBootstrapSuperadmin() {
  const store = readStore();
  const existing = store.users.find(user => user.email.toLowerCase() === bootstrapEmail);
  if (!existing) {
    const salt = crypto.randomBytes(16).toString('hex');
    store.users.push({
      id: crypto.randomUUID(),
      email: process.env.HONEYCHAIN_SUPERADMIN_EMAIL || process.env.MEDITRACE_SUPERADMIN_EMAIL || 'Superadmin@gmail.com',
      full_name: 'KVIC SuperAdmin',
      company_name: 'KVIC Central Governance',
      role: 'superadmin',
      salt,
      password_hash: passwordHash(bootstrapPassword, salt),
      created_at: new Date().toISOString()
    });
    writeStore(store);
    console.log('Created local development superadmin account.');
    return;
  }

  // The local development superadmin uses the explicitly configured bootstrap
  // credentials so resetting them does not depend on remote Supabase access.
  const salt = crypto.randomBytes(16).toString('hex');
  existing.email = process.env.HONEYCHAIN_SUPERADMIN_EMAIL || process.env.MEDITRACE_SUPERADMIN_EMAIL || 'Superadmin@gmail.com';
  existing.full_name = 'KVIC SuperAdmin';
  existing.company_name = 'KVIC Central Governance';
  existing.role = 'superadmin';
  existing.salt = salt;
  existing.password_hash = passwordHash(bootstrapPassword, salt);
  writeStore(store);
  console.log('Reset local development superadmin credentials.');
}

function createUser({ email, password, full_name, role, company_name }) {
  const store = readStore();
  const normalizedEmail = email.trim().toLowerCase();
  if (store.users.some(user => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error('A user with this email address already exists.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const user = {
    id: crypto.randomUUID(),
    email: email.trim(),
    full_name: full_name.trim(),
    company_name: company_name || null,
    role,
    salt,
    password_hash: passwordHash(password, salt),
    created_at: new Date().toISOString()
  };
  store.users.push(user);
  writeStore(store);
  return { user: safeUser(user), profile: profileFor(user) };
}

function signIn(email, password) {
  const store = readStore();
  const user = store.users.find(candidate => candidate.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || !crypto.timingSafeEqual(
    Buffer.from(passwordHash(password, user.salt), 'hex'),
    Buffer.from(user.password_hash, 'hex')
  )) throw new Error('Invalid login credentials.');

  const token = crypto.randomBytes(32).toString('base64url');
  store.sessions = store.sessions.filter(session => session.expires_at > Date.now());
  store.sessions.push({
    token_hash: crypto.createHash('sha256').update(token).digest('hex'),
    user_id: user.id,
    expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000)
  });
  writeStore(store);
  return {
    session: { access_token: token, refresh_token: token, expires_in: 604800, token_type: 'bearer' },
    user: safeUser(user),
    profile: profileFor(user)
  };
}

function getSessionUser(token) {
  if (!token) return null;
  const store = readStore();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = store.sessions.find(item => item.token_hash === tokenHash && item.expires_at > Date.now());
  const user = session && store.users.find(item => item.id === session.user_id);
  return user ? { user: safeUser(user), profile: profileFor(user) } : null;
}

function revokeSession(token) {
  const store = readStore();
  const tokenHash = crypto.createHash('sha256').update(token || '').digest('hex');
  store.sessions = store.sessions.filter(session => session.token_hash !== tokenHash);
  writeStore(store);
}

function listProfiles() {
  return readStore().users.map(profileFor);
}

function deleteUser(userId) {
  const store = readStore();
  store.users = store.users.filter(user => user.id !== userId);
  store.sessions = store.sessions.filter(session => session.user_id !== userId);
  writeStore(store);
}

module.exports = { createUser, deleteUser, ensureBootstrapSuperadmin, getSessionUser, listProfiles, revokeSession, signIn };
