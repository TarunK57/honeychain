const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');
const localAuth = require('../config/localAuth');

function isNetworkError(error) {
  return error instanceof TypeError || /fetch failed|ENOTFOUND|ECONN/i.test(error.message || '');
}

async function getRequestProfile(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  const localSession = localAuth.getSessionUser(token);
  if (localSession) return { ...localSession, local: true };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) return null;
  return { user, profile };
}

// Public registration always creates a regular beekeeper account. Only a
// signed-in superadmin can request an admin account.
router.post('/register', async (req, res) => {
  const { email, password, full_name, company_name } = req.body || {};
  const requestedRole = req.body?.role;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  let finalRole = 'beekeeper';
  let actor = null;
  if (req.headers.authorization) {
    try {
      actor = await getRequestProfile(req);
    } catch (err) {
      console.warn('Could not validate registration authorization:', err.message);
    }
  }

  if (requestedRole && requestedRole !== 'beekeeper' && requestedRole !== 'user') {
    if (requestedRole !== 'admin' || actor?.profile.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only a superadmin can create admin accounts.' });
    }
    finalRole = 'admin';
  } else if (requestedRole === 'user') {
    finalRole = 'beekeeper';
  }

  try {
    let user;
    let profile;
    if (finalRole === 'admin') {
      if (actor?.local) {
        ({ user, profile } = localAuth.createUser({ email, password, full_name, role: finalRole, company_name }));
      } else {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name, role: finalRole, company_name: company_name || null }
        });
        if (error) throw error;
        user = data.user;
      }
    } else {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name, role: finalRole } }
        });
        if (error) throw error;
        user = data.user;
      } catch (error) {
        if (!isNetworkError(error) || process.env.NODE_ENV === 'production') throw error;
        ({ user, profile } = localAuth.createUser({ email, password, full_name, role: finalRole }));
      }
    }

    if (!user) throw new Error('Authentication provider did not return a user.');

    if (profile) return res.status(201).json({ success: true, user, profile, role: finalRole, storage: 'local' });

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || email,
        full_name,
        company_name: finalRole === 'admin' ? (company_name || null) : null,
        role: finalRole
      }, { onConflict: 'id' });
    if (profileError) throw profileError;

    return res.status(201).json({ success: true, user, role: finalRole });
  } catch (error) {
    console.error('Registration failed:', error.message);
    const isUnavailable = isNetworkError(error);
    const status = isUnavailable ? 503 : (/already registered|already exists|duplicate/i.test(error.message) ? 409 : 400);
    const message = isUnavailable
      ? 'Registration service is unavailable. Check the Supabase connection and try again.'
      : (error.message || 'Registration failed.');
    return res.status(status).json({ error: message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profileError) throw profileError;

    return res.json({ success: true, session: data.session, user: data.user, profile });
  } catch (error) {
    const isUnavailable = isNetworkError(error);
    if (process.env.NODE_ENV !== 'production') {
      try {
        return res.json({ success: true, ...localAuth.signIn(email, password), storage: 'local' });
      } catch (localError) {
        if (!isUnavailable && !/Invalid login credentials/i.test(error.message || '')) {
          return res.status(401).json({ error: error.message || 'Login failed.' });
        }
        return res.status(401).json({ error: localError.message || 'Login failed.' });
      }
    }
    return res.status(isUnavailable ? 503 : 401).json({
      error: isUnavailable ? 'Login service is unavailable. Check the Supabase connection and try again.' : (error.message || 'Login failed.')
    });
  }
});

router.post('/logout', async (req, res) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (token) localAuth.revokeSession(token);
  return res.json({ success: true });
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'No valid bearer token provided.' });

  const localSession = localAuth.getSessionUser(token);
  if (localSession) return res.json(localSession);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw error || new Error('Invalid session.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    return res.json({ user, profile });
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Invalid session.' });
  }
});

module.exports = router;
