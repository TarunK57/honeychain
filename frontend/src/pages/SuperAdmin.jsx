import React, { useState, useEffect, useCallback, useRef } from 'react';
import API_BASE_URL from '../config/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Building, 
  UserPlus, 
  Globe, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X,
  Users,
  Activity,
  Package,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Plus,
  Search,
  CheckCircle2,
  BarChart4,
  Hexagon,
  Award
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../config/supabase';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import HoneyAtmosphere from '../components/HoneyAtmosphere';

const SuperAdmin = () => {
  const { user, profile, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // 1. ALL useState declarations
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [particlesReady, setParticlesReady] = useState(false);
  
  // Data states
  const [stats, setStats] = useState({ totalCompanies: 0, totalAdmins: 0, totalScans: 0, totalBatches: 0, totalAlerts: 0 });
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  
  // Form states
  const [adminForm, setAdminForm] = useState({
    company_name: '',
    full_name: '',
    email: '',
    password: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // 2. Auth Protection Logic
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // 3. Particles Engine
  const particlesInitialized = useRef(false);
  useEffect(() => {
    document.body.className = 'theme-superadmin';
    if (!particlesInitialized.current) {
      particlesInitialized.current = true;
      initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      }).then(() => setParticlesReady(true));
    }
    return () => {
      document.body.className = '';
    };
  }, []);

  // 4. ALL useCallback hooks
  const authFetch = useCallback(async (url, options = {}) => {
    let token = localStorage.getItem('honeychain_token');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch (e) {}
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
  }, []);

  const fetchSuperData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, companiesRes, adminsRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/admin/global-stats`),
        authFetch(`${API_BASE_URL}/admin/companies`),
        authFetch(`${API_BASE_URL}/admin/all-admins`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data.companies || []);
      }
      if (adminsRes.ok) {
        const data = await adminsRes.json();
        setAdmins(data.admins || []);
      }
    } catch (err) {
      console.error("SuperAdmin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (user && profile?.role === 'superadmin') fetchSuperData();
  }, [user, profile, fetchSuperData]);

  // 5. Action Handlers
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          email: adminForm.email,
          password: adminForm.password,
          full_name: adminForm.full_name,
          company_name: adminForm.company_name,
          role: 'admin'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Collection Center Admin created successfully for ' + adminForm.company_name, type: 'success' });
        setAdminForm({ company_name: '', full_name: '', email: '', password: '' });
        fetchSuperData();
      } else {
        throw new Error(data.error || 'Failed to create admin');
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAdmin = async (userId) => {
    if (!window.confirm("Permanently delete this Collection Center administrator account?")) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/admin/delete-account/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSuperData();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete account");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const particleOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: "#B8860B" },
      links: { color: "#B8860B", distance: 150, enable: true, opacity: 0.1, width: 1 },
      move: { enable: true, speed: 0.5, direction: "none", random: true, outModes: { default: "bounce" } },
      number: { value: 28, density: { enable: true } },
      opacity: { value: 0.2 },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  };

  if (authLoading) return <LoadingScreen />;
  if (!user) return null;
  if (profile?.role !== 'superadmin') return <AccessDenied />;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex relative overflow-hidden">
      <HoneyAtmosphere variant="governance" />
      {particlesReady && (
        <Particles id="tsparticles" options={particleOptions} className="absolute inset-0 z-0 pointer-events-none" />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-40 w-72 h-screen border-r border-white/5 bg-black/40 backdrop-blur-3xl p-8 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-amber-500/20">
            <Globe size={24} className="text-black" />
          </div>
          <h1 className="font-black text-2xl tracking-tighter text-amber-500">KVIC SuperAdmin</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavBtn icon={<LayoutDashboard size={20} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavBtn icon={<Building size={20} />} label="Collection Centers" active={activeTab === 'companies'} onClick={() => setActiveTab('companies')} />
          <NavBtn icon={<UserPlus size={20} />} label="Provision Center Admin" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
          <NavBtn icon={<BarChart4 size={20} />} label="Global Honey Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-6 py-4 w-full rounded-2xl text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all font-bold group"
        >
          <LogOut size={20} />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-12 relative z-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading && activeTab !== 'create' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Synchronizing Honey Chain Network Data...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto"
            >
              {activeTab === 'overview' && <OverviewTab stats={stats} admins={admins} />}
              {activeTab === 'companies' && <CompaniesTab companies={companies} admins={admins} onDeleteAdmin={handleDeleteAdmin} />}
              {activeTab === 'create' && <CreateAdminTab form={adminForm} setForm={setAdminForm} onSubmit={handleCreateAdmin} loading={isCreating} message={message} />}
              {activeTab === 'stats' && <GlobalStatsTab stats={stats} admins={admins} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- SUB COMPONENTS ---

const NavBtn = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
      active 
        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
    }`}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ icon, label, value }) => (
  <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl group hover:border-amber-500/30 transition-all shadow-xl">
    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 text-amber-500 shadow-inner">
      {icon}
    </div>
    <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-4xl font-black tracking-tighter">{value}</h3>
  </div>
);

const OverviewTab = ({ stats, admins }) => {
  const uniqueCompanies = [...new Set(admins.map(a => a.company_name).filter(Boolean))].length;
  
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-4xl font-black tracking-tighter mb-2 text-amber-500">KVIC Governance Overview</h2>
        <p className="text-gray-500 font-medium">Aggregated Honey Chain metrics across all collection centers and rural beekeeping clusters.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard icon={<Building size={28} />} label="Active Collection Centers" value={uniqueCompanies} />
        <StatCard icon={<Users size={28} />} label="Center Admins" value={admins.length} />
        <StatCard icon={<Activity size={28} />} label="Global Verifications" value={stats.totalScans || 0} />
      </div>
    </div>
  );
};

const CompaniesTab = ({ companies, admins, onDeleteAdmin }) => (
  <div className="space-y-8">
    <h2 className="text-3xl font-black tracking-tight">KVIC Collection Centers</h2>
    <div className="grid grid-cols-1 gap-8">
      {companies.map((company, idx) => {
        const companyAdmins = admins.filter(a => a.company_name === company.company_name);
        return (
          <div key={idx} className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl hover:border-amber-500/30 transition-all space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-amber-500/20 rounded-[24px] flex items-center justify-center text-amber-500 shadow-inner">
                  <Building size={32} />
                </div>
                <div>
                  <h4 className="text-2xl font-black">{company.company_name}</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{companyAdmins.length} Authorized Center Administrators</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companyAdmins.map((admin, aidx) => (
                <div key={aidx} className="p-6 rounded-3xl bg-black/40 border border-white/5 flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-black text-sm">{admin.full_name}</p>
                      <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded-full text-gray-500 font-black">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4 truncate">{admin.email}</p>
                  </div>
                  <button 
                    onClick={() => onDeleteAdmin(admin.id)}
                    className="flex items-center justify-center gap-2 py-3 w-full rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} /> Delete Admin
                  </button>
                </div>
              ))}
              {companyAdmins.length === 0 && (
                <div className="col-span-full py-8 text-center text-gray-600 font-bold italic text-sm">
                  No center administrators provisioned for this node yet.
                </div>
              )}
            </div>
          </div>
        );
      })}
      {companies.length === 0 && <p className="text-gray-500 font-bold">No collection centers registered on the network yet.</p>}
    </div>
  </div>
);

const CreateAdminTab = ({ form, setForm, onSubmit, loading, message }) => (
  <div className="max-w-2xl mx-auto space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-black tracking-tight">Provision Collection Center Admin</h2>
      <p className="text-gray-500">Onboard a new KVIC regional collection center to Honey Chain.</p>
    </div>

    <form onSubmit={onSubmit} className="p-10 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl space-y-6">
      {message.text && (
        <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}
      <Input label="Collection Center Name" placeholder="e.g. KVIC North Apiary Collection Center" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} required />
      <Input label="Admin Full Name" placeholder="e.g. Dr. Rajesh Kumar" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
      <Input label="Email Address" type="email" placeholder="admin@kvic-center.org" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
      <Input label="Temporary Password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
      
      <button 
        disabled={loading}
        className="w-full py-5 bg-amber-500 text-black rounded-2xl font-black text-lg hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Provision Collection Center Admin'}
      </button>
    </form>
  </div>
);

const GlobalStatsTab = ({ stats, admins }) => (
  <div className="space-y-12">
    <h2 className="text-3xl font-black tracking-tight">Global Honey Chain Metrics</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard icon={<Package size={28} />} label="Honey Batches Minted" value={stats.totalBatches || 0} />
      <StatCard icon={<Activity size={28} />} label="Global Verifications" value={stats.totalScans || 0} />
      <StatCard icon={<AlertTriangle size={28} />} label="Hive Anomaly Alerts" value={stats.totalAlerts || 0} />
      <StatCard icon={<Users size={28} />} label="Center Admins" value={admins.length} />
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <input 
      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-amber-500/50 outline-none transition-all placeholder-white/10 font-bold"
      {...props}
    />
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center">
    <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
    <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Authenticating KVIC SuperUser...</p>
  </div>
);

const AccessDenied = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white text-center p-8">
    <h2 className="text-4xl font-black tracking-tighter text-amber-500 mb-4">Unauthorized Access</h2>
    <p className="text-gray-500 font-medium mb-8">This portal is reserved for KVIC Central Governance only.</p>
    <Link to="/dashboard" className="px-8 py-4 bg-amber-500 text-black rounded-2xl font-black transition-all">Return to Dashboard</Link>
  </div>
);

export default SuperAdmin;
