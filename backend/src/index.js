const express = require('express');
const cors = require('cors');
require('dotenv').config();
if (process.env.NODE_ENV !== 'production') {
  require('./config/localAuth').ensureBootstrapSuperadmin();
}
const supabase = require('./config/supabase');
const authRoutes = require('./routes/auth');
const batchRoutes = require('./routes/batches');
const handoffRoutes = require('./routes/handoffs');
const scanRoutes = require('./routes/scans');
const adrRoutes = require('./routes/adr');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/batches', batchRoutes);
app.use('/handoffs', handoffRoutes);
app.use('/scans', scanRoutes);
app.use('/adr', adrRoutes);
app.use('/admin', adminRoutes);

let supabaseStatus = "connecting";

// Test Supabase Connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) throw error;
    supabaseStatus = "connected";
    console.log("Supabase connected successfully");
  } catch (err) {
    supabaseStatus = "error";
    console.error("Supabase connection failed:", err.message);
  }
}

testSupabaseConnection();

app.get('/health', (req, res) => {
  res.json({
    status: "ok",
    message: "Honey Chain backend running",
    supabase: supabaseStatus,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Honey Chain backend running on port ${PORT}`);
});
