import React, { useState, useEffect, useCallback, useRef } from 'react';
import API_BASE_URL from '../config/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Plus, 
  Package, 
  QrCode, 
  AlertTriangle, 
  BarChart, 
  LogOut, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2, 
  XCircle, 
  Menu, 
  X,
  User,
  Users,
  FileText,
  Activity,
  ChevronRight,
  Download,
  Clock,
  Loader2,
  Trash2,
  ShieldAlert,
  Shield,
  Calendar,
  Layers,
  MapPin,
  LocateFixed,
  Maximize2,
  Settings,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../config/supabase';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import HoneyAtmosphere from '../components/HoneyAtmosphere';
import { QRCodeCanvas as QRCode } from "qrcode.react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Legend as ChartLegend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart as RechartsBarChart, 
  Bar 
} from 'recharts';

// Fix Leaflet default icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createMarkerIcon = (color) => {
  return L.divIcon({
    html: `<div class="map-marker-dot" style="position: relative; width: 18px; height: 18px;">
             <div style="position: absolute; width: 18px; height: 18px; background-color: ${color}; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 10px ${color}88; z-index: 2;"></div>
             <div class="custom-leaflet-marker-ping" style="position: absolute; width: 16px; height: 16px; background-color: ${color}; border-radius: 50%; z-index: 1;"></div>
           </div>`,
    className: 'custom-leaflet-marker',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  });
};

const parseCoordinates = (location) => {
  if (location && typeof location === 'object') {
    const lat = Number(location.lat ?? location.latitude);
    const lng = Number(location.lng ?? location.lon ?? location.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
  }
  const coordinateText = String(location || '').replace(/^GPS\s*[-:]\s*/i, '');
  const match = coordinateText.match(/(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
};

const MapViewportControls = ({ locations }) => {
  const map = useMap();
  const [locationError, setLocationError] = useState('');
  const locationKey = locations.map(point => point.join(',')).join(';');

  useEffect(() => {
    if (!locationKey) return;
    const points = locationKey.split(';').map(point => point.split(',').map(Number));
    if (points.length === 1) map.setView(points[0], 11, { animate: true });
    else map.fitBounds(points, { padding: [36, 36], maxZoom: 11, animate: true });
  }, [map, locationKey]);

  const locateMe = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => map.flyTo([coords.latitude, coords.longitude], 12, { duration: 1.1 }),
      () => setLocationError('Allow location access to center the map on you.'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  return (
    <div className="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button type="button" onClick={locateMe} title="Center on my location" aria-label="Center map on my location" className="rounded-xl border border-slate-200 bg-white/95 p-2.5 text-slate-700 shadow-lg transition hover:bg-amber-50 hover:text-amber-800">
          <LocateFixed size={18} />
        </button>
        <button type="button" onClick={() => locations.length && map.fitBounds(locations, { padding: [36, 36], maxZoom: 11 })} title="Fit all marked locations" aria-label="Fit all marked locations" disabled={!locations.length} className="rounded-xl border border-slate-200 bg-white/95 p-2.5 text-slate-700 shadow-lg transition hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Maximize2 size={18} />
        </button>
      </div>
      {locationError && <span role="status" className="max-w-56 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-lg">{locationError}</span>}
    </div>
  );
};

const safeDownloadName = (value) => String(value || 'QR')
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '');

const getScansOverTime = (scansList) => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    data.push({ date: dateStr, count: 0 });
  }
  if (scansList && scansList.length > 0) {
    scansList.forEach(scan => {
      const scanDate = new Date(scan.scanned_at || scan.detected_at);
      const dateStr = scanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const found = data.find(item => item.date === dateStr);
      if (found) {
        found.count += 1;
      }
    });
  }
  return data;
};

const getScanDistribution = (scansList) => {
  const counts = { authentic: 0, expired: 0, flagged: 0, revoked: 0 };
  if (scansList && scansList.length > 0) {
    scansList.forEach(scan => {
      const res = (scan.result || '').toLowerCase();
      if (res === 'authentic') counts.authentic += 1;
      else if (res === 'expired') counts.expired += 1;
      else if (res === 'flagged') counts.flagged += 1;
      else if (res === 'revoked' || res === 'counterfeit') counts.revoked += 1;
    });
  }
  return [
    { name: 'Authentic', value: counts.authentic, color: '#10B981' },
    { name: 'Expired', value: counts.expired, color: '#1A73E8' },
    { name: 'Flagged', value: counts.flagged, color: '#9CA3AF' },
    { name: 'Revoked', value: counts.revoked, color: '#EF4444' }
  ];
};

const getBatchActivityByWeek = (batchesList) => {
  const data = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - (i * 7 + 6));
    const end = new Date(now);
    end.setDate(now.getDate() - (i * 7));
    const label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    data.push({ week: label, count: 0 });
  }

  if (batchesList && batchesList.length > 0) {
    batchesList.forEach(batch => {
      const mintDate = new Date(batch.mintedAt || batch.created_at);
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now);
        start.setDate(now.getDate() - (i * 7 + 6));
        const end = new Date(now);
        end.setDate(now.getDate() - (i * 7));
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        if (mintDate >= start && mintDate <= end) {
          data[5 - i].count += 1;
          break;
        }
      }
    });
  }
  return data;
};

const getStageDistribution = (batchesList) => {
  const counts = { manufacturer: 0, cnf_agent: 0, stockist: 0, pharmacy: 0 };
  if (batchesList && batchesList.length > 0) {
    batchesList.forEach(batch => {
      let stage = 'manufacturer';
      const qrs = batch.supplyChainQRs || [];
      const pharmacyUsed = qrs.some(q => q.handoff_stage === 'pharmacy' && q.is_used);
      const stockistUsed = qrs.some(q => q.handoff_stage === 'stockist' && q.is_used);
      const cnfUsed = qrs.some(q => q.handoff_stage === 'cnf_agent' && q.is_used);
      
      if (pharmacyUsed) stage = 'pharmacy';
      else if (stockistUsed) stage = 'stockist';
      else if (cnfUsed) stage = 'cnf_agent';
      
      counts[stage] += 1;
    });
  }
  return [
    { stage: 'Manufacturer', count: counts.manufacturer },
    { stage: 'CNF Agent', count: counts.cnf_agent },
    { stage: 'Stockist', count: counts.stockist },
    { stage: 'Retailer', count: counts.pharmacy }
  ];
};

const Admin = () => {
  const { user, profile, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // 1. ALL useState declarations
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [particlesReady, setParticlesReady] = useState(false);
  
  // Data states
  const [stats, setStats] = useState({ scans: 0, users: 0, alerts: 0, prescriptions: 0, reports: 0 });
  const [alerts, setAlerts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [alertFilter, setAlertFilter] = useState('unresolved'); // 'all', 'unresolved', 'resolved'
  const [operationsTab, setOperationsTab] = useState('mint');
  const [scans, setScans] = useState([]);
  const [activity, setActivity] = useState([]);

  // Form states
  const [mintForm, setMintForm] = useState({
    batch_id: '',
    drug_name: '',
    active_ingredient: '',
    dosage: '',
    manufacturer_name: '',
    company_name: '',
    cdsco_cert: '',
    mfg_date: '',
    exp_date: ''
  });
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState(null);

  const [handoffForm, setHandoffForm] = useState({
    batch_address: '',
    count: 4,
    stages: {
      manufacturer: true,
      cnf_agent: false,
      stockist: false,
      pharmacy: false
    }
  });
  const [isGeneratingHandoff, setIsGeneratingHandoff] = useState(false);
  const [handoffResults, setHandoffResults] = useState([]);

  // 2. Auth Protection Logic
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // 3. Particles Engine
  const particlesInitialized = useRef(false);
  useEffect(() => {
    document.body.className = 'theme-admin';

    // Add dynamic style element to override background overlay/tint
    const styleEl = document.createElement('style');
    styleEl.id = 'admin-theme-override';
    styleEl.innerHTML = `
      body.theme-admin::after {
        background-color: rgba(26, 115, 232, 0.0) !important;
      }
    `;
    document.head.appendChild(styleEl);

    if (!particlesInitialized.current) {
      particlesInitialized.current = true;
      initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      }).then(() => setParticlesReady(true));
    }
    return () => {
      document.body.className = '';
      const existingStyle = document.getElementById('admin-theme-override');
      if (existingStyle) {
        existingStyle.remove();
      }
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

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, batchesRes, scansRes, activityRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/admin/stats`),
        authFetch(`${API_BASE_URL}/admin/alerts`),
        authFetch(`${API_BASE_URL}/admin/batches`),
        authFetch(`${API_BASE_URL}/admin/scans`),
        authFetch(`${API_BASE_URL}/admin/activity`)
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setBatches(data.batches || []);
      }
      if (scansRes.ok) {
        const data = await scansRes.json();
        setScans(data.scans || []);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || []);
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (user && profile?.role === 'admin') fetchAdminData();
  }, [user, profile, fetchAdminData]);

  // 5. Action Handlers
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleMintBatch = async (e) => {
    e.preventDefault();
    setIsMinting(true);
    setMintResult(null);
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const mfgDateObj = new Date(mintForm.mfg_date);
      const expDateObj = new Date(mintForm.exp_date);

      // Check Manufacturing Date rules
      if (mfgDateObj > today) {
        throw new Error("Manufacturing Date cannot be in the future.");
      }
      
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      fiveYearsAgo.setHours(0, 0, 0, 0);
      if (mfgDateObj < fiveYearsAgo) {
        throw new Error("Manufacturing Date cannot be more than 5 years in the past.");
      }

      // Check Expiry Date rules
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (expDateObj < startOfToday) {
        throw new Error("Expiry Date cannot be in the past.");
      }

      const mfgPlus30 = new Date(mfgDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
      mfgPlus30.setHours(0, 0, 0, 0);
      if (expDateObj < mfgPlus30) {
        throw new Error("Expiry Date must be at least 30 days after the Manufacturing Date.");
      }

      const tenYearsFuture = new Date();
      tenYearsFuture.setFullYear(tenYearsFuture.getFullYear() + 10);
      tenYearsFuture.setHours(23, 59, 59, 999);
      if (expDateObj > tenYearsFuture) {
        throw new Error("Expiry Date cannot be more than 10 years in the future.");
      }

      const payload = {
        batchId: mintForm.batch_id,
        medicineName: mintForm.drug_name,
        activeIngredient: mintForm.active_ingredient,
        dosage: mintForm.dosage,
        manufacturer: mintForm.manufacturer_name,
        companyName: mintForm.company_name || mintForm.manufacturer_name,
        cdscoCertificate: mintForm.cdsco_cert,
        manufacturingDate: Math.floor(mfgDateObj.getTime() / 1000),
        expiryDate: Math.floor(expDateObj.getTime() / 1000)
      };

      const res = await authFetch(`${API_BASE_URL}/batches/mint`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        setMintResult({
          success: true,
          hash: data.txHash,
          batchId: mintForm.batch_id,
          batchAddress: data.onChainBatchId,
          medicineName: mintForm.drug_name,
          companyName: mintForm.company_name || mintForm.manufacturer_name
        });
        fetchAdminData();
      } else {
        throw new Error(data.error || "Minting failed");
      }
    } catch (err) {
      setMintResult({ success: false, error: err.message });
    } finally {
      setIsMinting(false);
    }
  };

  const handleGenerateHandoff = async (e, extraLabels = []) => {
    if (e) e.preventDefault();
    setIsGeneratingHandoff(true);
    try {
      const activeStages = Object.keys(handoffForm.stages).filter(s => handoffForm.stages[s]);
      if (activeStages.length === 0) throw new Error("Select at least one stage");

      const res = await authFetch(`${API_BASE_URL}/handoffs/generate-qr`, {
        method: 'POST',
        body: JSON.stringify({
          batchAddress: handoffForm.batch_address,
          count: handoffForm.count,
          stages: activeStages,
          extraLabels: extraLabels
        })
      });
      const data = await res.json();
      console.log("Handoff Data:", data);
      if (res.ok) {
        setHandoffResults(data.tokens || []);
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGeneratingHandoff(false);
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/admin/alerts/${id}/resolve`, { method: 'PUT' });
      if (res.ok) fetchAdminData();
    } catch (err) { alert("Failed to resolve alert"); }
  };

  const handleRevokeBatch = async (batchId) => {
    if (!window.confirm("Are you sure you want to revoke this batch? This action is permanent.")) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/batches/${batchId}/revoke`, { method: 'POST' });
      if (res.ok) fetchAdminData();
    } catch (err) { alert("Failed to revoke batch"); }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm("Remove this revoked batch from your inventory? It remains on the blockchain.")) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/batches/${batchId}`, { method: 'DELETE' });
      if (res.ok) fetchAdminData();
    } catch (err) {
      alert("Failed to remove batch");
    }
  };

  // 6. UI Helpers
  const particleOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: "#1A73E8" },
      links: {
        color: "#1A73E8",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.8,
        direction: "none",
        random: true,
        outModes: { default: "bounce" },
      },
      number: { value: 28, density: { enable: true } },
      opacity: { value: 0.3 },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  };

  // 7. Render Protection
  if (authLoading) return <LoadingScreen message="Verifying Identity..." />;
  if (!user) return null;
  if (profile?.role !== 'admin') return <AccessDenied />;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex relative overflow-hidden">
      <HoneyAtmosphere variant="admin" />
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#1A73E8]/20 blur-[120px] rounded-full" />
        <div className="absolute top-40 right-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {particlesReady && (
        <Particles id="tsparticles" options={particleOptions} className="absolute inset-0 z-0 pointer-events-none" />
      )}

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-6 right-6 z-50 p-3 bg-[#0c0c0c] border border-white/[0.06] rounded-xl shadow-xl text-white hover:bg-white/5 transition-all"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-40 w-20 h-screen border-r border-white/[0.06] bg-[#09090b] py-6 flex flex-col items-center shrink-0 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo at the top */}
        <div className="flex items-center justify-center mb-12 mt-4">
          <div className="w-10 h-10 bg-[#1A73E8] rounded-xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300 cursor-pointer">
            <Shield size={20} className="text-white" />
          </div>
        </div>

        {/* Navigation Icons in the middle */}
        <nav className="flex-1 space-y-6 w-full flex flex-col items-center">
          <NavBtn 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')} 
          />
          <NavBtn 
            icon={<Package size={20} />} 
            label="Operations" 
            active={activeTab === 'operations'} 
            onClick={() => setActiveTab('operations')} 
          />
          <NavBtn 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        {/* Logout at the bottom */}
        <div className="mt-auto w-full flex justify-center">
          <NavBtn 
            icon={<LogOut size={20} />} 
            label="Logout" 
            onClick={handleLogout} 
            isLogout={true}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-12 relative z-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading && activeTab === 'overview' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="animate-spin text-[var(--accent-color)] mb-4" size={48} />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Accessing Neural Ledger...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-[1600px] mx-auto"
            >
              {activeTab === 'overview' && (
                <OverviewTab 
                  stats={stats} 
                  alerts={alerts} 
                  scans={scans}
                  activity={activity}
                  onResolve={handleResolveAlert}
                  batches={batches}
                  profile={profile}
                />
              )}
              {activeTab === 'operations' && (
                <OperationsTab 
                  operationsTab={operationsTab}
                  setOperationsTab={setOperationsTab}
                  batches={batches}
                  stats={stats}
                  onRevoke={handleRevokeBatch}
                  onDelete={handleDeleteBatch}
                  mintForm={mintForm}
                  setMintForm={setMintForm}
                  handleMintBatch={handleMintBatch}
                  isMinting={isMinting}
                  mintResult={mintResult}
                  setHandoffForm={setHandoffForm}
                  handoffForm={handoffForm}
                  handleGenerateHandoff={handleGenerateHandoff}
                  isGeneratingHandoff={isGeneratingHandoff}
                  handoffResults={handoffResults}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsTab 
                  user={user}
                  profile={profile}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- Sub-Components ---

const NavBtn = ({ icon, label, active, onClick, isLogout = false }) => (
  <div className="relative group flex justify-center w-full">
    <button 
      onClick={onClick}
      className={`p-3.5 rounded-xl transition-all duration-300 border ${
        active 
          ? 'bg-[#151515] text-[var(--accent-color)] border-[var(--accent-color)]/30 shadow-lg' 
          : isLogout 
            ? 'text-gray-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/25 border-transparent'
            : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
      }`}
    >
      {icon}
    </button>
    {/* Tooltip */}
    <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-[#0c0c0c] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs font-bold text-gray-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300 shadow-xl z-50 whitespace-nowrap">
      {label}
    </div>
  </div>
);

const StatCard = ({ icon, label, value, color = "blue" }) => (
  <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-white/5 hover:border-[#1A73E8]/20 transition-all duration-300 shadow-2xl">
    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-gray-300">
      {React.cloneElement(icon, { size: 22 })}
    </div>
    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
    <h3 className="text-3xl font-black tracking-tighter text-white">{value}</h3>
  </div>
);

const LoadingScreen = ({ message }) => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
    <Loader2 className="animate-spin text-[#1A73E8] mb-6" size={48} />
    <p className="font-black uppercase tracking-widest text-xs text-gray-500">{message}</p>
  </div>
);

const AccessDenied = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
    <div className="w-20 h-20 bg-[#1A73E8]/20 text-[#1A73E8] rounded-3xl flex items-center justify-center mb-8 animate-pulse">
      <ShieldAlert size={48} />
    </div>
    <h2 className="text-4xl font-black tracking-tighter mb-4">Access Denied</h2>
    <p className="text-gray-500 max-w-md mb-10 font-medium">Your credentials do not grant access to the Honey Chain administrative portal. This event has been logged.</p>
    <Link to="/dashboard" className="px-10 py-4 bg-[#1A73E8] text-white rounded-2xl font-black hover:brightness-110 transition-all">Return to Dashboard</Link>
  </div>
);

// --- TAB: OVERVIEW ---
const KPIPill = ({ label, value, isAlert = false }) => (
  <div className={`px-4 py-2.5 backdrop-blur-md bg-white/5 border ${isAlert ? 'border-red-500/30' : 'border-white/10'} rounded-2xl flex items-center gap-3 shadow-md`}>
    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</span>
    <span className={`text-sm font-black ${isAlert ? 'text-red-500' : 'text-[#1A73E8]'}`}>{value}</span>
  </div>
);

const KPIStatPill = ({ label, value, isAlert = false }) => (
  <div className={`p-4 rounded-2xl backdrop-blur-md bg-white/5 border ${isAlert && value > 0 ? 'border-red-500/30' : 'border-white/10'} flex flex-col justify-between`}>
    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</span>
    <span className={`text-xl font-black ${isAlert && value > 0 ? 'text-red-500' : 'text-[#1A73E8]'}`}>{value}</span>
  </div>
);

const BlockchainTimeline = ({ activity }) => {
  const blockchainTxs = activity.filter(item => item.type === 'BATCH_MINTED' || item.type === 'HANDOFF_LOGGED' || item.type === 'HONEY_VERIFIED' || item.type === 'MEDICINE_VERIFIED');
  
  const getRelativeTime = (timestamp) => {
    const elapsed = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(elapsed / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6 pt-2">
      {blockchainTxs.slice(0, 10).map((tx, idx) => (
        <div key={tx.id || idx} className="flex gap-4 relative group">
          {idx !== blockchainTxs.length - 1 && (
            <div className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-white/10 group-hover:bg-white/20 transition-colors" />
          )}
          <div className="w-5 h-5 rounded-full border-2 border-[#1A73E8] bg-[#0a0a0a] flex items-center justify-center shrink-0 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8]" />
          </div>
          <div className="space-y-1 pb-4">
            <div className="flex items-center flex-wrap gap-x-2">
              <span className="text-xs font-bold text-gray-200 leading-snug">{tx.message}</span>
              {tx.batchId && (
                <span className="text-[10px] font-mono text-[#1A73E8]">{tx.batchId}</span>
              )}
            </div>
            <p className="text-[9px] text-gray-500 font-medium">{getRelativeTime(tx.timestamp)}</p>
          </div>
        </div>
      ))}
      {blockchainTxs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 h-full text-gray-500 text-xs">
          No blockchain activity found.
        </div>
      )}
    </div>
  );
};

const OverviewTab = ({ stats, alerts, scans, activity, onResolve, batches, profile }) => {
  const unresolvedAlerts = alerts.filter(a => !a.is_resolved);
  const verifiedToday = scans.filter(s => (Date.now() - new Date(s.scanned_at || s.detected_at).getTime()) < 24 * 60 * 60 * 1000).length;
  const batchLocations = batches.map(batch => ({ batch, position: parseCoordinates(batch.gpsLocation || batch.gps_location) })).filter(item => item.position);
  const scanLocations = scans.map(scan => ({ scan, position: parseCoordinates({ lat: scan.location_lat, lng: scan.location_lng }) })).filter(item => item.position);
  const mapLocations = [...batchLocations.map(item => item.position), ...scanLocations.map(item => item.position)];

  const scansData = getScansOverTime(scans);
  const distributionData = getScanDistribution(scans);
  const chartDistributionData = scans.length
    ? distributionData
    : [{ name: 'No scans yet', value: 1, color: '#e2e8f0' }];
  const weeklyData = getBatchActivityByWeek(batches);
  const stageData = getStageDistribution(batches);

  return (
    <div className="space-y-8">
      {/* HERO HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-4 text-white">
            Supply Chain Command Center
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-medium">
            Real-time surveillance & logistics intelligence.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <KPIPill label="Active Batches" value={batches.filter(b => b.isRevoked !== true && b.status !== 'revoked').length} />
          <KPIPill label="Verified Today" value={verifiedToday} />
          <KPIPill label="Security Alerts" value={unresolvedAlerts.length} isAlert={unresolvedAlerts.length > 0} />
          <KPIPill label="ADR Reports" value={stats.reports || 0} />
        </div>
      </div>

      {/* MAIN HERO CONTENT - MAP AND FEED SIDE-BY-SIDE */}
      <div className="dashboard-map-layout w-full h-[72vh] min-h-[560px] border border-white/10 rounded-2xl overflow-hidden shadow-xl bg-white flex">
        {/* Map (70% width) */}
        <div className="dashboard-map-panel w-[70%] h-full relative border-r border-white/10">
          <MapContainer 
            center={[20.5937, 78.9629]} 
            zoom={5} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%', background: '#e8eef3' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewportControls locations={mapLocations} />
            {batchLocations.map(({ batch, position }) => (
              <Marker
                key={`batch-${batch.batchId}`}
                position={position}
                icon={createMarkerIcon('#d89000')}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="min-w-44 space-y-1 p-1 text-slate-800">
                    <p className="font-bold">{batch.floralSource ? `${batch.floralSource} Honey` : (batch.drugName || 'Honey Batch')}</p>
                    <p className="font-mono text-xs text-slate-500">Batch {batch.batchId}</p>
                    <p className="text-xs">{batch.manufacturer || 'Collection center unavailable'}</p>
                    <p className="text-xs text-slate-500">Harvest site · {position[0].toFixed(4)}, {position[1].toFixed(4)}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            {scans.map((scan) => {
              const position = parseCoordinates({ lat: scan.location_lat, lng: scan.location_lng });
              if (!position) return null;

              const getMarkerColor = (result) => {
                if (result === 'authentic') return '#10B981'; // Green
                if (result === 'revoked' || result === 'counterfeit') return '#EF4444'; // Red
                return '#1A73E8'; // Blue for expired/flagged/default
              };

              return (
                <Marker 
                  key={scan.id} 
                  position={position} 
                  icon={createMarkerIcon(getMarkerColor(scan.result))}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="space-y-1 p-1 text-slate-800">
                      <p className="text-xs font-bold">{scan.floral_source || scan.medicine_name || 'Honey batch scan'}</p>
                      <p className="font-mono text-xs text-slate-500">{scan.batch_address}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                          scan.result === 'authentic' ? 'bg-green-100 text-green-800' :
                          scan.result === 'revoked' || scan.result === 'counterfeit' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {scan.result}
                        </span>
                      </div>
                      <p className="pt-1 text-xs text-slate-500">
                        Scan · {new Date(scan.scanned_at).toLocaleString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {mapLocations.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[800] flex items-center justify-center p-6">
              <div className="max-w-sm rounded-2xl border border-white/80 bg-white/95 p-5 text-center shadow-xl">
                <MapPin size={24} className="mx-auto mb-2 text-amber-600" />
                <p className="font-bold text-slate-800">No mapped locations yet</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Add GPS coordinates as latitude, longitude when minting a batch, or allow location when recording a verification scan.</p>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-4 top-4 z-[900] flex flex-wrap items-center gap-3 rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Harvest sites · {batchLocations.length}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Verifications · {scanLocations.length}</span>
          </div>

          {/* Floating Admin profile card in bottom-left */}
          <div className="absolute bottom-6 left-6 z-[1000] backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-3 shadow-xl flex items-center gap-3 pointer-events-auto">
            <div className="w-8 h-8 rounded-full bg-[#1A73E8]/20 border border-[#1A73E8]/30 flex items-center justify-center text-[#1A73E8] font-black text-xs">
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-xs font-black text-white">{profile?.full_name || 'System Admin'}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                Node Active
              </p>
            </div>
          </div>
        </div>

        {/* Live Feed panel (30% width) */}
        <div className="dashboard-feed-panel w-[30%] h-full backdrop-blur-md bg-white/5 p-6 flex flex-col pointer-events-auto">
          <ActivityFeed activity={activity} plain={true} />
        </div>
      </div>

      {/* SECTION 2 - ANALYTICS ROW */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Line Chart */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-[350px]">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-6">30-Day Verifications</h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scansData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#172033'
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#1A73E8" strokeWidth={2} dot={{ r: 1 }} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-[350px]">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-6">Scan Result Distribution</h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartDistributionData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#172033'
                  }}
                />
                <ChartLegend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={6}
                  formatter={(value) => <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-[350px]">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-6">Weekly Batch Minting</h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={7} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#172033'
                  }}
                />
                <Bar dataKey="count" fill="#1A73E8" radius={[3, 3, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* SECTION 3 - SECURITY AND BLOCKCHAIN */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Security Alerts */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-[400px]">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Unresolved Security Alerts
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            {unresolvedAlerts.map((alert, idx) => (
              <AlertCard key={idx} alert={alert} onResolve={onResolve} />
            ))}
            {unresolvedAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs py-12">
                <CheckCircle2 size={36} className="text-green-500 mb-3" />
                No unresolved security alerts.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Blockchain Transactions Timeline */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col h-[400px]">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2">
            <Layers size={16} className="text-[#1A73E8]" />
            On-Chain Ledger Activity
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            <BlockchainTimeline activity={activity} />
          </div>
        </div>
      </section>

      {/* SECTION 4 - SUPPLY CHAIN HEALTH */}
      <section className="grid grid-cols-1 gap-6 pb-12">
        {/* Stage Distribution Card */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Supply Chain Stage Distribution</h3>
          <div className="w-full h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                layout="vertical"
                data={stageData}
                margin={{ top: 10, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <YAxis dataKey="stage" type="category" stroke="#64748b" fontSize={10} tickLine={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <ChartTooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    color: '#172033'
                  }}
                />
                <Bar dataKey="count" fill="#1A73E8" radius={[0, 3, 3, 0]} barSize={16} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Batches Card */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Recent Batches</h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <th className="pb-3">Batch ID</th>
                  <th className="pb-3">Honey / Floral Source</th>
                  <th className="pb-3">Company</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs font-medium">
                {batches.slice(0, 10).map((batch, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 font-mono text-[#1A73E8]">{batch.batchId}</td>
                    <td className="py-4 text-gray-200">{batch.floralSource || batch.drugName || 'Honey Batch'}</td>
                    <td className="py-4 text-gray-400">{batch.manufacturer}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        batch.isRevoked === true || batch.status === 'revoked'
                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : 'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>
                        {batch.isRevoked === true || batch.status === 'revoked' ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td className="py-4 text-right text-gray-400">{new Date(batch.mintedAt || batch.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No batches created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- TAB: OPERATIONS CONTROL ---
const OperationsTab = ({ 
  operationsTab, 
  setOperationsTab, 
  batches, 
  stats, 
  onRevoke, 
  onDelete, 
  mintForm, 
  setMintForm, 
  handleMintBatch, 
  isMinting, 
  mintResult,
  setHandoffForm,
  handoffForm,
  handleGenerateHandoff,
  isGeneratingHandoff,
  handoffResults
}) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tighter mb-1">Operations Control</h2>
        <p className="text-gray-500 text-sm font-medium">Mint, manage, and trace honey batches.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 gap-6">
        {[
          { id: 'mint', label: 'Mint Batch', icon: <Plus size={16} /> },
          { id: 'manage', label: 'Manage Batches', icon: <Package size={16} /> },
          { id: 'handoff', label: 'Supply Chain QRs', icon: <QrCode size={16} /> },
          { id: 'stats', label: 'Batch History', icon: <BarChart size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setOperationsTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all ${
              operationsTab === tab.id
                ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {operationsTab === 'mint' && (
          <MintTab 
            form={mintForm} 
            setForm={setMintForm} 
            onSubmit={handleMintBatch} 
            loading={isMinting} 
            result={mintResult}
            onGoToHandoff={() => {
              setHandoffForm({ ...handoffForm, batch_address: mintResult.batchAddress });
              setOperationsTab('handoff');
            }}
          />
        )}
        {operationsTab === 'manage' && (
          <ManageTab 
            batches={batches} 
            onRevoke={onRevoke} 
            onDelete={onDelete} 
          />
        )}
        {operationsTab === 'handoff' && (
          <HandoffTab 
            form={handoffForm} 
            setForm={setHandoffForm} 
            onSubmit={handleGenerateHandoff} 
            loading={isGeneratingHandoff} 
            results={handoffResults}
          />
        )}
        {operationsTab === 'stats' && (
          <StatsTab 
            stats={stats} 
            batches={batches} 
          />
        )}
      </div>
    </div>
  );
};

// --- TAB: SETTINGS ---
const SettingsTab = ({ user, profile }) => {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatar, setAvatar] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const originalAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';

  const isModified = 
    fullName !== (profile?.full_name || '') ||
    password !== '' ||
    confirmPassword !== '' ||
    avatar !== originalAvatar;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (password) {
        if (password !== confirmPassword) {
          setErrorMsg("Passwords do not match");
          setIsSaving(false);
          return;
        }
        if (password.length < 8) {
          setErrorMsg("Password must be at least 8 characters");
          setIsSaving(false);
          return;
        }
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
      }

      // Update full_name in the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update avatar_url in the user metadata
      const { error: avatarError } = await supabase.auth.updateUser({
        data: {
          avatar_url: avatar
        }
      });

      if (avatarError) throw avatarError;

      setSuccessMsg("Changes saved successfully! Refreshing portal...");
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tighter mb-1 text-white">Portal Settings</h2>
          <p className="text-gray-500 text-sm font-medium">Manage your system credentials and corporate registry details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT CARD: Administrator Profile (Editable) */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <User size={18} className="text-[var(--accent-color)]" />
              Administrator Profile
            </h3>
            
            {/* 1. Avatar Circle and Upload Photo Button */}
            <div className="flex flex-col items-center space-y-3 pb-4 border-b border-white/10">
              <div className="relative">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-[var(--accent-color)] shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[var(--accent-color)]/20 border border-[var(--accent-color)]/30 flex items-center justify-center text-[var(--accent-color)] font-black text-3xl shadow-lg">
                    {fullName?.charAt(0) || profile?.full_name?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              <button 
                type="button"
                onClick={() => document.getElementById('avatar-upload-input').click()}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center gap-1.5"
              >
                <Upload size={12} className="text-[var(--accent-color)]" /> Upload Photo
              </button>
              <input 
                id="avatar-upload-input" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </div>

            {/* Editable and Read-only profile details */}
            <div className="space-y-4">
              {/* 2. Full Name Input */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full mt-1 bg-[#0c0c0c] border border-white/10 rounded-xl px-4 py-2.5 focus:border-[var(--accent-color)]/30 outline-none transition-all font-bold text-sm text-white"
                  required
                />
              </div>

              {/* 5. Email (Read-only) */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                <p className="text-sm font-bold text-gray-400 mt-1 px-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl">{user?.email}</p>
              </div>

              {/* 3. Change Password inputs side-by-side with show/hide eye toggle */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full mt-1 bg-[#0c0c0c] border border-white/10 rounded-xl px-4 py-2.5 pr-10 focus:border-[var(--accent-color)]/30 outline-none transition-all font-bold text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full mt-1 bg-[#0c0c0c] border border-white/10 rounded-xl px-4 py-2.5 pr-10 focus:border-[var(--accent-color)]/30 outline-none transition-all font-bold text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Role Badge (Read-only) */}
              <div className="pt-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Security Role</label>
                <div className="mt-1">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--accent-color)] px-2.5 py-1 bg-white/5 border border-white/10 rounded-full w-fit">
                    {profile?.role || 'Admin'}
                  </span>
                </div>
              </div>

              {/* 5. Account Created (Read-only) */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Account Created</label>
                <p className="text-xs font-mono text-gray-400 mt-1 px-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Success / Error Messages inside the card context */}
          <div className="space-y-3 pt-4">
            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                <XCircle size={16} /> {errorMsg}
              </div>
            )}

            {/* 4. Save Changes button at the bottom of the card */}
            <button
              type="submit"
              disabled={!isModified || isSaving}
              className="w-full py-3 bg-[var(--accent-color)] text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent-color)]/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </div>

        {/* RIGHT CARD: Corporate Registry (Read-only) */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl flex flex-col justify-start">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
            <ShieldCheck size={18} className="text-green-500" />
            Corporate Registry
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Company Name</label>
              <p className="text-sm font-bold text-gray-400 mt-1 px-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl">{profile?.company_name || 'Collection Center'}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Registry ID</label>
              <p className="text-xs font-mono text-gray-400 mt-1 px-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl">CENTER-{profile?.company_name ? profile.company_name.toUpperCase().replace(/\s+/g, '-') : 'UNREGISTERED'}-2026</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">System Node Status</label>
              <p className="text-xs font-bold text-green-500 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                Active & Synchronized
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Blockchain Network</label>
              <p className="text-xs font-bold text-gray-400 mt-1 px-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl">Honey Chain Ledger (Local Network)</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

// --- COMPONENT: ACTIVITY FEED ---
const ActivityFeed = ({ activity, plain = false }) => {
  const [feedFilter, setFeedFilter] = useState('ALL');

  const getStatusColor = (type) => {
    switch (type) {
      case 'BATCH_MINTED': return { dot: 'bg-[#1A73E8]', text: 'text-[#1A73E8]', bg: 'bg-[#1A73E8]/10' };
      case 'HANDOFF_LOGGED': return { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/10' };
      case 'HONEY_VERIFIED':
      case 'MEDICINE_VERIFIED': return { dot: 'bg-green-500', text: 'text-green-500', bg: 'bg-green-500/10' };
      case 'ALERT_TRIGGERED': return { dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10' };
      default: return { dot: 'bg-gray-500', text: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const getEventLabel = (type) => {
    switch (type) {
      case 'BATCH_MINTED': return 'Minted';
      case 'HANDOFF_LOGGED': return 'Dispatched';
      case 'HONEY_VERIFIED':
      case 'MEDICINE_VERIFIED': return 'Verified';
      case 'ALERT_TRIGGERED': return 'Alert';
      default: return 'System Event';
    }
  };

  const getRelativeTime = (timestamp) => {
    const elapsed = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(elapsed / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getEventRoute = (item) => {
    const msg = (item.message || '').toLowerCase();
    if (item.type === 'BATCH_MINTED') {
      return {
        from: 'Collection Center',
        to: 'Blockchain Ledger',
        icon: 'blockchain'
      };
    }
    if (item.type === 'HONEY_VERIFIED' || item.type === 'MEDICINE_VERIFIED') {
      return {
        from: 'Scan Node',
        to: 'Verified Match',
        icon: 'check'
      };
    }
    if (item.type === 'ALERT_TRIGGERED') {
      return {
        from: 'Alert Source',
        to: 'Security Node',
        icon: 'alert'
      };
    }
    if (item.type === 'HANDOFF_LOGGED') {
      let from = 'Manufacturer';
      let to = 'Distributor';
      if (msg.includes('cnf_agent')) {
        from = 'Manufacturer';
        to = 'CNF Agent';
      } else if (msg.includes('stockist')) {
        from = 'CNF Agent';
        to = 'Stockist';
      } else if (msg.includes('pharmacy')) {
        from = 'Stockist';
        to = 'Retailer';
      }
      return {
        from,
        to,
        icon: 'truck'
      };
    }
    return {
      from: 'System Node',
      to: 'Ledger',
      icon: 'sync'
    };
  };

  const filteredActivity = activity.filter(item => {
    if (feedFilter === 'ALL') return true;
    if (feedFilter === 'MINTS') return item.type === 'BATCH_MINTED';
    if (feedFilter === 'HANDOFFS') return item.type === 'HANDOFF_LOGGED';
    if (feedFilter === 'SCANS') return item.type === 'HONEY_VERIFIED' || item.type === 'MEDICINE_VERIFIED';
    if (feedFilter === 'ALERTS') return item.type === 'ALERT_TRIGGERED';
    return true;
  });

  return (
    <div className={plain ? "flex flex-col h-full" : "backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col h-full shadow-2xl"}>
      {/* Title */}
      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
        <Activity size={16} className="text-[#1A73E8]" />
        Operational Live Feed
      </h3>

      {/* Tabs / Filters (reference-style) */}
      <div className="flex gap-1 bg-[#121214] p-1 rounded-xl border border-white/5 text-[9px] font-bold uppercase tracking-wider mb-4 overflow-x-auto shrink-0 custom-scrollbar">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'MINTS', label: 'Mints' },
          { id: 'HANDOFFS', label: 'Transfers' },
          { id: 'SCANS', label: 'Scans' },
          { id: 'ALERTS', label: 'Alerts' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFeedFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              feedFilter === tab.id 
                ? 'bg-white text-black font-black' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {filteredActivity.map((item, idx) => {
          const colors = getStatusColor(item.type);
          const route = getEventRoute(item);
          const isFirst = idx === 0;

          return (
            <div 
              key={item.id || idx} 
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all space-y-3 group relative"
            >
              {/* Top line with code and status */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  #{item.batchId ? item.batchId.substring(0, 12) : 'BATCH'}
                  {isFirst && (
                    <span className="w-1.5 h-1.5 bg-[#1A73E8] rounded-full animate-pulse" />
                  )}
                </span>
                
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${colors.bg} ${colors.text} flex items-center gap-1`}>
                  <span className={`w-1 h-1 rounded-full ${colors.dot}`} />
                  {getEventLabel(item.type)}
                </span>
              </div>

              {/* Message */}
              <p className="text-[11px] text-gray-300 font-bold leading-normal">{item.message}</p>

              {/* Route line visual matching reference image */}
              <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider pt-1 border-t border-white/[0.03]">
                <span className="truncate max-w-[90px]">{route.from}</span>
                
                <div className="flex-1 flex items-center justify-center px-3 relative">
                  <div className="absolute inset-x-2 border-t border-dashed border-white/10 top-1/2 -translate-y-1/2" />
                  <div className="bg-transparent px-1 relative z-10 text-gray-500">
                    {route.icon === 'truck' && <Package size={10} />}
                    {route.icon === 'blockchain' && <Layers size={10} />}
                    {route.icon === 'check' && <ShieldCheck size={10} />}
                    {route.icon === 'alert' && <AlertTriangle size={10} />}
                    {route.icon === 'sync' && <Activity size={10} />}
                  </div>
                </div>

                <span className="truncate max-w-[90px] text-right">{route.to}</span>
              </div>

              {/* Relative Time */}
              <div className="text-[8px] text-gray-600 font-medium text-right mt-1">
                {getRelativeTime(item.timestamp)}
              </div>
            </div>
          );
        })}

        {filteredActivity.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 h-full text-gray-500 text-xs">
            No live events found matching this filter.
          </div>
        )}
      </div>
    </div>
  );
};

// --- TAB: MINT ---
const MintTab = ({ form, setForm, onSubmit, loading, result, onGoToHandoff }) => {
  const formatDateYYYYMMDD = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  // Manufacturing Date bounds
  const today = new Date();
  const mfgMax = formatDateYYYYMMDD(today);
  
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const mfgMin = formatDateYYYYMMDD(fiveYearsAgo);

  // Expiry Date bounds
  let minExpDate = formatDateYYYYMMDD(today);
  if (form.mfg_date) {
    const mfgDate = new Date(form.mfg_date);
    const mfgPlus30 = new Date(mfgDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const boundary = mfgPlus30 > today ? mfgPlus30 : today;
    minExpDate = formatDateYYYYMMDD(boundary);
  } else {
    const defaultMin = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    minExpDate = formatDateYYYYMMDD(defaultMin);
  }

  const tenYearsFuture = new Date();
  tenYearsFuture.setFullYear(tenYearsFuture.getFullYear() + 10);
  const expMax = formatDateYYYYMMDD(tenYearsFuture);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white">Mint Batch on Blockchain</h2>
        <p className="text-gray-500">Initialize a secure honey batch in the immutable ledger.</p>
      </div>

      {result && result.success ? (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="p-12 rounded-2xl bg-green-500/10 border border-green-500/20 text-center space-y-8"
        >
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h3 className="text-4xl font-black tracking-tighter">Batch Minted Successfully!</h3>
          <div className="bg-black/40 p-6 rounded-3xl border border-white/5 font-mono text-xs text-gray-400 break-all space-y-2">
            <p><span className="text-green-500 font-bold mr-2">Blockchain Receipt:</span> {result.hash}</p>
            <p><span className="text-green-500 font-bold mr-2">BATCH:</span> {result.batchId}</p>
          </div>
          <div className="p-8 bg-white rounded-2xl w-fit mx-auto shadow-2xl flex flex-col items-center gap-6">
            <QRCode 
              id="mint-qr-canvas"
              value={`http://localhost:3000/scan?batch=${result.batchId}&company=${encodeURIComponent(result.companyName || '')}`} 
              size={200} 
            />
            <button
              onClick={() => {
                const canvas = document.getElementById("mint-qr-canvas");
                if (canvas) {
                  const url = canvas.toDataURL("image/png");
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `HoneyChain-${safeDownloadName(result.batchId)}.png`;
                  a.click();
                }
              }}
              className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-[var(--accent-color)] transition-all text-sm shadow-xl"
            >
              <Download size={18} /> Download QR (.png)
            </button>
          </div>
          <div className="flex justify-center gap-4 pt-6">
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold">Mint Another</button>
            <button onClick={onGoToHandoff} className="px-8 py-4 bg-[var(--accent-color)] text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-[var(--accent-color)]/20">
              <QrCode size={20} /> Generate Driver QRs
            </button>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="p-8 rounded-2xl bg-[#0c0c0c] border border-white/[0.06] space-y-8 shadow-2xl">
          {result && !result.success && (
            <div className="p-4 bg-[var(--accent-light)]/20 border border-[var(--accent-color)]/25 rounded-2xl text-[var(--accent-color)] text-sm font-bold flex items-center gap-3">
              <XCircle size={20} /> {result.error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Honey Batch ID" placeholder="e.g. HONEY-BATCH-101" value={form.batch_id} onChange={e => setForm({...form, batch_id: e.target.value})} required />
            <Input label="Floral Source" placeholder="e.g. Mustard / Acacia / Wildflower" value={form.drug_name} onChange={e => setForm({...form, drug_name: e.target.value})} required />
            <Input label="Beekeeper ID" placeholder="e.g. BEE-KVI-108" value={form.active_ingredient} onChange={e => setForm({...form, active_ingredient: e.target.value})} required />
            <Input label="Hive ID" placeholder="e.g. HIVE-204" value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} required />
            <Input label="Collection Center Name" placeholder="e.g. KVIC Northern Apiary Center" value={form.manufacturer_name} onChange={e => setForm({...form, manufacturer_name: e.target.value})} required />
            <div className="space-y-2">
              <Input label="GPS Location / Geo-Tag" placeholder="Latitude, longitude" value={form.cdsco_cert} onChange={e => setForm({...form, cdsco_cert: e.target.value})} required />
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) return window.alert('Location is not available in this browser.');
                  navigator.geolocation.getCurrentPosition(
                    ({ coords }) => setForm(current => ({ ...current, cdsco_cert: `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` })),
                    () => window.alert('Allow location access or enter coordinates as latitude, longitude.'),
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
                  );
                }}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
              >
                <LocateFixed size={14} /> Use current location
              </button>
              <p className="text-xs text-slate-500">Coordinates in latitude, longitude format place this harvest on the map.</p>
            </div>
            <Input 
              label="Harvest Date" 
              type="date" 
              value={form.mfg_date} 
              min={mfgMin}
              max={mfgMax}
              onChange={e => setForm({...form, mfg_date: e.target.value})} 
              required 
            />
            <Input 
              label="Batch Quantity (kg) / Expiry Target" 
              type="date" 
              value={form.exp_date} 
              min={minExpDate}
              max={expMax}
              onChange={e => setForm({...form, exp_date: e.target.value})} 
              required 
            />
          </div>
          <button 
            disabled={loading}
            className="w-full py-5 bg-[var(--accent-color)] text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-[var(--accent-color)]/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <><Loader2 size={24} className="animate-spin" /> Minting on Polygon Amoy...</> : <><ShieldCheck size={24} /> Mint Honey Batch NFT on Blockchain</>}
          </button>
        </form>
      )}
    </div>
  );
};

// --- TAB: HANDOFF ---
const HandoffTab = ({ form, setForm, onSubmit, loading, results }) => {
  const [extraTokenLabels, setExtraTokenLabels] = useState(Array(Math.max(0, form.count - 4)).fill(''));

  const handleLabelChange = (idx, val) => {
    const newLabels = [...extraTokenLabels];
    newLabels[idx] = val;
    setExtraTokenLabels(newLabels);
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white">Supply Chain QR Generation</h2>
        <p className="text-gray-500">Generate QR codes for each stage of the supply chain</p>
      </div>

      <form 
        onSubmit={(e) => onSubmit(e, extraTokenLabels)} 
        className="p-8 rounded-2xl bg-[#0c0c0c] border border-white/[0.06] grid grid-cols-1 md:grid-cols-4 gap-8 shadow-2xl"
      >
        <div className="md:col-span-2">
          <Input label="Batch Address" placeholder="0x..." value={form.batch_address} onChange={e => setForm({...form, batch_address: e.target.value})} required />
        </div>
        <div>
          <Input 
            label="Tokens Per Stage" type="number" min="1" max="10" 
            value={form.count} 
            onChange={e => {
              const raw = e.target.value;
              if (raw === '' || raw === '-') { setForm({...form, count: raw}); return; }
              const newCount = parseInt(raw);
              if (isNaN(newCount) || newCount < 1) return;
              const clamped = Math.min(newCount, 10);
              setForm({...form, count: clamped});
              setExtraTokenLabels(Array(Math.max(0, clamped - 4)).fill(''));
            }} 
            required 
          />
        </div>
        <div className="flex items-end">
          <button disabled={loading} className="w-full py-4 bg-[var(--accent-color)] text-white rounded-xl font-bold shadow-lg shadow-[var(--accent-color)]/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
            {loading ? <Loader2 className="animate-spin" /> : <QrCode size={18} />} Generate QRs
          </button>
        </div>
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.keys(form.stages).map(stage => (
            <label key={stage} className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${form.stages[stage] ? 'bg-white/5 border-[#1A73E8]/30 text-white' : 'bg-white/[0.02] border-white/[0.06] text-gray-500'}`}>
              <input 
                type="checkbox" className="hidden" 
                checked={form.stages[stage]} 
                onChange={() => setForm({...form, stages: {...form.stages, [stage]: !form.stages[stage]}})}
              />
              {form.stages[stage] ? <CheckCircle2 size={18} className="text-[#1A73E8]" /> : <Layers size={18} />}
              <span className="text-xs font-black uppercase tracking-widest">{stage.replace('_', ' ')}</span>
            </label>
          ))}
        </div>

        {form.count > 4 && (
          <div className="md:col-span-4 space-y-6 pt-4 border-t border-white/[0.06]">
            <div>
              <h4 className="text-lg font-black text-[#1A73E8]">Extra Tokens — Add Custom Labels</h4>
              <p className="text-xs text-gray-500 font-medium italic">These are in addition to the 4 standard supply chain stages. Give each a name.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extraTokenLabels.map((label, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Extra Token {i+1} Label</label>
                  <input 
                    type="text"
                    placeholder="e.g. Driver name, route, cold storage unit..."
                    value={label}
                    onChange={(e) => handleLabelChange(i, e.target.value)}
                    className="w-full bg-[#0c0c0c] border border-white/[0.06] rounded-xl px-4 py-3 focus:border-[#1A73E8]/30 outline-none transition-all placeholder-white/10 text-sm font-bold text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </form>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {results.map((token, idx) => {
            const shortBatch = token.batchAddress.startsWith("0x") 
              ? token.batchAddress.slice(0, 10) + "..." 
              : token.batchAddress;

            return (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                key={idx} className="p-6 rounded-2xl bg-white text-black text-center space-y-4 shadow-2xl relative group overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-[#1A73E8]" />
                <p className="text-sm font-black uppercase tracking-tight text-[#1A73E8]">
                  {token.stage.replace(/_/g,' ').toUpperCase()}
                </p>
                <p className="text-[10px] font-mono text-gray-400 break-all leading-none">{shortBatch}</p>
                
                {token.label && token.label !== token.stage && (
                  <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">{token.label}</p>
                )}

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 inline-block">
                  <QRCode 
                    id={"qr-canvas-" + idx}
                    value={token.qrValue} 
                    size={140} 
                  />
                </div>
                
                <p className="text-[8px] font-mono text-gray-300 break-all px-2">
                  {token.token.substring(0, 18)}...
                </p>
                
                <button 
                  onClick={() => {
                    const canvas = document.getElementById("qr-canvas-" + idx);
                    if (canvas) {
                      const url = canvas.toDataURL("image/png");
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `HoneyChain-${safeDownloadName(token.stage)}-${safeDownloadName(token.batchAddress)}.png`;
                      a.click();
                    }
                  }}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-[#1A73E8] transition-all"
                >
                  <Download size={14} /> Download QR (.png)
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- TAB: ALERTS ---
const AlertsTab = ({ alerts, filter, setFilter, onResolve }) => {
  const filtered = alerts.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !a.is_resolved;
    if (filter === 'resolved') return a.is_resolved;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">Global Security Alerts</h2>
          <p className="text-gray-500">Real-time incident response management.</p>
        </div>
        <div className="flex bg-[#0c0c0c] p-1 rounded-xl border border-white/[0.06]">
          {['all', 'unresolved', 'resolved'].map(f => (
            <button 
              key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-[#1A73E8] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((alert, idx) => (
          <AlertCard key={idx} alert={alert} onResolve={onResolve} />
        ))}
        {filtered.length === 0 && <EmptyState text="No alerts matching filters." />}
      </div>
    </div>
  );
};

// --- TAB: MANAGE ---
const ManageTab = ({ batches, onRevoke, onDelete }) => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <h2 className="text-3xl font-black tracking-tight text-white">Batch Inventory</h2>
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{batches.length} Total Batches</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {batches.map((batch, idx) => (
        <div key={idx} className="p-6 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 group hover:border-[#1A73E8]/25 transition-all duration-300 shadow-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
                <Package size={22} />
              </div>
              <StatusBadge status={batch.isRevoked === true || batch.status === 'revoked' ? 'REVOKED' : 'ACTIVE'} />
            </div>
            <div>
              <h4 className="text-xl font-black mb-1 text-white">{batch.floralSource ? `${batch.floralSource} Honey` : (batch.drugName || 'Honey Batch')}</h4>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Batch: {batch.batchId}</p>
            </div>
            
            <div className="space-y-2 py-4 border-y border-white/[0.06] text-[10px]">
              <div className="flex justify-between font-bold">
                <span className="text-gray-500 uppercase tracking-widest">Manufacturer</span>
                <span className="text-white uppercase">{batch.manufacturer || 'N/A'}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-500 uppercase tracking-widest">Dosage</span>
                <span className="text-white uppercase">{batch.dosage || 'N/A'}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-500 uppercase tracking-widest">Expires</span>
                <span className="text-red-500 uppercase font-mono">
                  {batch.expiryDate ? new Date(parseInt(batch.expiryDate) * 1000).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-mono break-all text-gray-500">{batch.batchId}</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-2 font-bold uppercase tracking-widest">
                <Clock size={12} className="text-[#1A73E8]" /> {batch.scanCount || 0} Verifications
              </p>
            </div>
          </div>
          {batch.isRevoked === true || batch.status === 'revoked' ? (
            <div className="flex flex-col gap-2 mt-6">
              <div className="w-full py-2.5 rounded-xl bg-gray-500/10 text-gray-500 font-bold text-xs flex items-center justify-center gap-2 border border-gray-500/10">
                <XCircle size={14} /> Revoked on Blockchain
              </div>
              <button
                onClick={() => onDelete(batch.batchId)}
                className="w-full py-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-650 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-red-500/20"
              >
                <Trash2 size={14} /> Remove from List
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRevoke(batch.batchId)}
              className="w-full mt-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-red-500/10 text-red-500 hover:bg-red-650 hover:text-white border border-red-500/20"
            >
              <Trash2 size={16} /> Revoke Batch
            </button>
          )}
        </div>
      ))}
      {batches.length === 0 && <EmptyState text="No batches deployed to blockchain." />}
    </div>
  </div>
);

// --- TAB: STATS ---
const StatsTab = ({ stats, batches }) => (
  <div className="space-y-12">
    <div>
      <h2 className="text-3xl font-black tracking-tight text-white">Network Statistics</h2>
      <p className="text-gray-500 font-medium">Deep analytics of supply chain movement.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <StatCard icon={<QrCode size={28} />} label="Total Scans" value={stats.scans} color="blue" />
      <StatCard icon={<Users size={28} />} label="Total Users" value={stats.users} color="green" />
      <StatCard icon={<AlertTriangle size={28} />} label="Total Alerts" value={stats.alerts} color="red" />
      <StatCard icon={<FileText size={28} />} label="Minted Today" value={batches.filter(batch => new Date(batch.mintedAt || batch.created_at || batch.createdAt || 0).toDateString() === new Date().toDateString()).length} color="purple" />
      <StatCard icon={<Activity size={28} />} label="ADR Reports" value={stats.reports} color="blue" />
      <StatCard icon={<Package size={28} />} label="Total Batches" value={batches.length} color="blue" />
      <StatCard icon={<CheckCircle2 size={28} />} label="Active Batches" value={batches.filter(b => b.isRevoked !== true && b.status !== 'revoked').length} color="green" />
      <StatCard icon={<ShieldAlert size={28} />} label="Revoked Batches" value={batches.filter(b => b.isRevoked === true || b.status === 'revoked').length} color="red" />
    </div>

    <div className="p-8 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
      <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-white"><Clock size={20} className="text-[#1A73E8]" /> Recent Batch Activity</h3>
      <div className="space-y-4">
        {batches.slice(0, 5).map((batch, idx) => (
          <div key={idx} className="flex items-center justify-between p-5 rounded-xl bg-[#0a0a0a] hover:bg-[#111] transition-all border border-white/[0.06]">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
                <Package size={24} />
              </div>
              <div className="space-y-1">
                <p className="font-black text-lg text-white">{batch.floralSource ? `${batch.floralSource} Honey` : (batch.drugName || 'Honey Batch')}</p>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <span className="text-[#1A73E8]">{batch.batchId}</span>
                  <span>•</span>
                  <span>{batch.manufacturer}</span>
                  <span>•</span>
                  <span className="text-red-500 font-mono">
                    Expires: {batch.expiryDate ? new Date(parseInt(batch.expiryDate) * 1000).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-sm font-black text-[#1A73E8]">{batch.scanCount || 0} Verifications</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Network Traffic</p>
              </div>
              <StatusBadge status={batch.isRevoked === true || batch.status === 'revoked' ? 'REVOKED' : 'ACTIVE'} />
            </div>
          </div>
        ))}
        {batches.length === 0 && <EmptyState text="No activity logs." />}
      </div>
    </div>
  </div>
);

// --- Helper Components ---

const AlertCard = ({ alert, onResolve }) => {
  const type = alert.alert_type || alert.type || 'ALERT';
  const isCritical = alert.severity === 'high' || alert.severity === 'critical' || type === 'DUPLICATE_ID' || type === 'duplicate_scan';
  
  return (
    <div className={`p-4 rounded-xl bg-[#0a0a0a] border ${isCritical ? 'border-red-500/20' : 'border-blue-500/20'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-md`}>
      <div className="flex gap-4">
        <div className={`w-9 h-9 rounded-lg ${isCritical ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-400'} flex items-center justify-center shrink-0`}>
          <AlertTriangle size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
              isCritical 
                ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {isCritical ? 'Critical' : 'Warning'}
            </span>
            <span className="text-[9px] text-gray-400 font-mono">Type: {type}</span>
          </div>
          <h4 className="font-bold text-xs text-gray-200">{alert.details || alert.message}</h4>
          {alert.batch_id && <p className={`text-[9px] font-mono mt-0.5 ${isCritical ? 'text-red-400' : 'text-blue-400'}`}>{alert.batch_id}</p>}
          <p className="text-[9px] text-gray-500">
            {new Date(alert.detected_at || alert.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
      {!alert.is_resolved && (
        <button 
          onClick={() => onResolve(alert.id)}
          className={`px-4 py-2 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider ${
            isCritical 
              ? 'bg-red-500/15 border border-red-500/30 text-red-500 hover:bg-red-500/25' 
              : 'bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
          }`}
        >
          Resolve
        </button>
      )}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const isOk = status === 'ACTIVE' || status === 'AUTHENTIC';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
      isOk ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
    }`}>
      {isOk ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {status}
    </span>
  );
};

const Input = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
    <input 
      className="w-full bg-[#0c0c0c] border border-white/[0.06] rounded-xl px-4 py-3 focus:border-[var(--accent-color)]/30 outline-none transition-all placeholder-white/10 font-bold text-sm text-white"
      {...props}
    />
  </div>
);

const EmptyState = ({ text }) => (
  <div className="p-12 rounded-xl border border-dashed border-white/[0.06] flex flex-col items-center justify-center text-center w-full bg-[#0c0c0c]">
    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 text-gray-600">
      <Package size={32} />
    </div>
    <p className="text-gray-500 font-bold">{text}</p>
  </div>
);

export default Admin;
