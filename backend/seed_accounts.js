require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const email = process.env.MEDITRACE_SUPERADMIN_EMAIL || 'Superadmin@gmail.com';
const password = process.env.MEDITRACE_SUPERADMIN_PASSWORD;
const fullName = 'KVIC SuperAdmin';
const companyName = 'KVIC Central Governance';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !password) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_KEY, and MEDITRACE_SUPERADMIN_PASSWORD in backend/.env first.');
  process.exit(1);
}

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findUserByEmail() {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 1000) return null;
  }
}

async function setupSuperadmin() {
  let user = await findUserByEmail();
  const userAttributes = {
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'superadmin', company_name: companyName }
  };

  if (user) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, userAttributes);
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser(userAttributes);
    if (error) throw error;
    user = data.user;
  }

  const { error } = await supabaseAdmin.from('profiles').upsert({
    id: user.id,
    email,
    full_name: fullName,
    company_name: companyName,
    role: 'superadmin'
  }, { onConflict: 'id' });
  if (error) throw error;

  console.log(`Configured superadmin account: ${email}`);
}

setupSuperadmin().catch(error => {
  console.error('Could not configure superadmin:', error.message);
  process.exitCode = 1;
});
