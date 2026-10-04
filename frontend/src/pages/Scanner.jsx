import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../config/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scan, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  ArrowLeft, 
  RefreshCw, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Camera,
  Keyboard,
  Share2,
  AlertCircle,
  X,
  User,
  ExternalLink,
  ChevronRight,
  Hexagon,
  Activity
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from '../context/AuthContext';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import HoneyAtmosphere from '../components/HoneyAtmosphere';

const parseQRValue = (raw) => {
  if (!raw) return { type: "unknown" };
  if (raw.startsWith("HONEYCHAIN_BATCH::") || raw.startsWith("MEDITRACE_BATCH::")) {
    const cleaned = raw.replace("HONEYCHAIN_BATCH::", "").replace("MEDITRACE_BATCH::", "");
    const parts = Object.fromEntries(
      cleaned.split("::").map(p => p.split("="))
    );
    return { type: "batch", batchId: parts.batchId, batchAddress: parts.batchAddress, medicine: parts.medicine };
  }
  if (raw.startsWith("HONEYCHAIN_HANDOFF::") || raw.startsWith("MEDITRACE_HANDOFF::")) {
    const cleaned = raw.replace("HONEYCHAIN_HANDOFF::", "").replace("MEDITRACE_HANDOFF::", "");
    const parts = Object.fromEntries(
      cleaned.split("::").map(p => p.split("="))
    );
    return { type: "handoff", batchAddress: parts.batch, stage: parts.stage, token: parts.token };
  }
  return { type: "batch", batchId: raw, batchAddress: raw };
};

const Scanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const queryParams = new URLSearchParams(window.location.search);
  const batchFromUrl = queryParams.get("batch");

  const [mode, setMode] = useState('camera'); // 'camera' or 'manual'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [manualId, setManualId] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [recordScanLocation, setRecordScanLocation] = useState(false);
  const [showADRModal, setShowADRModal] = useState(false);
  const [adrForm, setAdrForm] = useState({ claimedYield: '', hiveId: '', details: '', severity: 'moderate' });
  const [adrLoading, setAdrLoading] = useState(false);
  const [particlesReady, setParticlesReady] = useState(false);

  const particlesInitialized = useRef(false);
  useEffect(() => {
    document.body.className = 'theme-verify';
    if (!particlesInitialized.current) {
      particlesInitialized.current = true;
      initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      }).then(() => setParticlesReady(true));
    }

    // Handle batch ID from navigation state (Search) or URL params
    const batchFromUrl = queryParams.get("batch");
    const companyFromUrl = queryParams.get("company");

    if (location.state?.batchId) {
      handleScanResult(location.state.batchId, location.state.companyName);
    } else if (batchFromUrl) {
      handleScanResult(batchFromUrl, companyFromUrl);
    }
  }, [location.state, batchFromUrl]);

  const particleColor = profile?.role === 'superadmin' ? '#B8860B' : profile?.role === 'admin' ? '#F59E0B' : '#F59E0B';

  const particleOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: particleColor },
      links: {
        color: particleColor,
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
      number: { value: 24, density: { enable: true } },
      opacity: { value: 0.3 },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  };

  useEffect(() => {
    if (mode !== 'camera' || result || loading) return;
    const readerEl = document.getElementById('reader');
    if (!readerEl) return;
    
    readerEl.innerHTML = '';
    
    const html5QrCode = new Html5Qrcode("reader");
    let startPromise = null;
    let shouldStop = false;

    Html5Qrcode.getCameras().then(cameras => {
      if (cameras && cameras.length) {
        if (shouldStop) return;
        
        startPromise = html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            handleScanResult(decodedText);
            if (html5QrCode.isScanning) {
              html5QrCode.stop().catch(err => console.error(err));
            }
          },
          (error) => {}
        );

        startPromise.catch(err => console.error("Camera start error:", err));
      }
    }).catch(err => console.error("Get cameras error:", err));

    return () => {
      shouldStop = true;
      if (startPromise) {
        startPromise.then(() => {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
              const el = document.getElementById('reader');
              if (el) el.innerHTML = '';
            }).catch(err => console.error("Cleanup stop error:", err));
          } else {
            const el = document.getElementById('reader');
            if (el) el.innerHTML = '';
          }
        }).catch(err => {
          const el = document.getElementById('reader');
          if (el) el.innerHTML = '';
        });
      } else {
        const el = document.getElementById('reader');
        if (el) el.innerHTML = '';
      }
    };
  }, [mode, result, loading]);

  const handleScanResult = async (batchId, companyName = '') => {
    const parsed = parseQRValue(batchId);
    const lookupId = parsed.batchId || batchId;

    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const url = companyName
        ? `${API_BASE_URL}/batches/${lookupId}?company=${encodeURIComponent(companyName)}`
        : `${API_BASE_URL}/batches/${lookupId}`;
      const response = await axios.get(url);
      const raw = response.data;

      const rawBatchId = raw.batch?.batchId || batchId;
      const displayBatchId = rawBatchId.includes('_') 
        ? rawBatchId.split('_').slice(1).join('_') 
        : rawBatchId;

      const data = {
        ...raw.batch,
        id: displayBatchId,
        batchId: displayBatchId,
        floralSource: raw.batch?.floralSource || 'Organic Honey',
        beekeeperId: raw.batch?.beekeeperId || 'BEE-KVI-01',
        hiveId: raw.batch?.hiveId || 'HIVE-101',
        gpsLocation: raw.batch?.gpsLocation || 'GPS Location',
        quantityKg: raw.batch?.quantityKg || '50',
        harvestDate: raw.batch?.harvestDate || raw.batch?.manufacturingDate,
        handoffs: raw.handoffs || [],
        isBreached: raw.isBreached || false,
        geminiSummary: raw.geminiSummary || ''
      };
      
      if (user) {
        try {
          let scanLocation = { locationLat: null, locationLng: null };
          if (recordScanLocation && navigator.geolocation) {
            scanLocation = await new Promise(resolve => navigator.geolocation.getCurrentPosition(
              position => resolve({ locationLat: position.coords.latitude, locationLng: position.coords.longitude }),
              () => resolve({ locationLat: null, locationLng: null }),
              { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
            ));
          }
          await axios.post(`${API_BASE_URL}/scans`, {
            batchId: lookupId,
            userId: user.id,
            ...scanLocation
          });
        } catch (scanErr) {
          console.error("Failed to save scan history", scanErr);
        }
      }
      
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Honey Batch not found in the Honey Chain registry.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualId.trim() && manualCompany.trim()) {
      handleScanResult(manualId.trim(), manualCompany.trim());
    } else {
      alert("Both Batch ID and Collection Center Name are required for unique identification.");
    }
  };

  const submitYieldAnomaly = async () => {
    if (!adrForm.details) return;
    setAdrLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/adr`, {
        batch_address: result.id,
        claimed_yield: adrForm.claimedYield,
        hive_id: adrForm.hiveId || result.hiveId,
        details: adrForm.details,
        severity: adrForm.severity
      });
      alert("Yield anomaly & honey quality flag submitted successfully. KVIC auditors have been notified.");
      setShowADRModal(false);
      setAdrForm({ claimedYield: '', hiveId: '', details: '', severity: 'moderate' });
    } catch (err) {
      alert("Failed to report yield anomaly. Please try again later.");
    } finally {
      setAdrLoading(false);
    }
  };

  const shareResult = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Honey verification link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col items-center p-6 overflow-x-hidden">
      <HoneyAtmosphere variant="verify" />
      {particlesReady && (
        <Particles
          id="tsparticles"
          options={particleOptions}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 0,
            pointerEvents: "none"
          }}
        />
      )}

      {/* Header */}
      <header className="relative z-10 w-full max-w-2xl flex justify-between items-center mb-8 mt-4">
        <button 
          onClick={() => navigate('/')} 
          className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-sm backdrop-blur-sm"
        >
          <ArrowLeft size={18} /> Home
        </button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-amber-500/20">
            <Hexagon size={22} className="text-black fill-black" />
          </div>
          <h1 className="font-black text-xl tracking-tight">Verify Honey Batch</h1>
        </div>
        <div className="w-12" />
      </header>

      <main className="relative z-10 w-full max-w-2xl flex-1 flex flex-col items-center mb-20">
        {!result && !loading && !error && (
          <div className="w-full flex flex-col items-center">
            {/* Mode Toggle */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 mb-10 backdrop-blur-md">
              <button 
                onClick={() => setMode('camera')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === 'camera' ? 'bg-amber-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Camera size={18} /> Scan QR Code
              </button>
              <button 
                onClick={() => setMode('manual')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === 'manual' ? 'bg-amber-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Keyboard size={18} /> Enter Batch ID
              </button>
            </div>

            {user && (
              <label className="mb-8 flex max-w-md cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-white/90 px-4 py-3 text-left text-sm text-slate-600 shadow-sm">
                <input
                  type="checkbox"
                  checked={recordScanLocation}
                  onChange={event => setRecordScanLocation(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-500"
                />
                <span><span className="font-semibold text-slate-800">Add this scan to the map</span><br />Your browser will ask permission to attach your location to this verification.</span>
              </label>
            )}

            {mode === 'camera' ? (
              <div className="w-full flex flex-col items-center">
                <div style={{
                  width: "100%",
                  maxWidth: "400px",
                  aspectRatio: "1 / 1",
                  margin: "0 auto",
                  overflow: "hidden",
                  borderRadius: "12px",
                  border: "2px solid #f59e0b",
                  position: "relative",
                  background: "#000"
                }}>
                  <div
                    id="reader"
                    style={{ 
                      width: "100%", 
                      border: "none"
                    }}
                  />
                  {mode === 'camera' && (
                    <div style={{
                      position: "absolute",
                      top: "0",
                      left: "0",
                      right: "0",
                      height: "100%",
                      zIndex: 20,
                      pointerEvents: "none",
                      animation: "scanLine 2s linear infinite"
                    }}>
                      <div style={{
                        height: "2px",
                        backgroundColor: "#f59e0b",
                        boxShadow: "0 0 8px #f59e0b"
                      }} />
                    </div>
                  )}
                </div>
                <div className="mt-8 text-center space-y-2">
                  <p className="text-amber-500 font-bold">Point camera at honey jar QR code</p>
                  <p className="text-xs text-gray-500 tracking-widest uppercase">KVIC Verified · Instant Traceability · Free</p>
                </div>
              </div>
            ) : (
              <motion.form 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleManualSubmit}
                className="w-full max-w-md p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-6 text-center">Manual Batch Lookup</h3>
                <p className="mb-6 text-center text-xs leading-relaxed text-gray-400">
                  Enter the batch ID and collection center shown on the honey label or QR code.
                  Demo batch: <span className="font-bold text-amber-400">ABC</span> · <span className="font-bold text-amber-400">KVIC Collection Center</span>
                </p>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 ml-2 uppercase tracking-widest">Honey Batch ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ABC" 
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value.toUpperCase())}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-amber-500/50 outline-none transition-all placeholder-white/20 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 ml-2 uppercase tracking-widest">Collection Center Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. KVIC Collection Center" 
                      value={manualCompany}
                      onChange={(e) => setManualCompany(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-amber-500/50 outline-none transition-all placeholder-white/20 font-bold"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black text-lg hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    Verify Honey Purity
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="w-full max-w-lg p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col items-center animate-pulse">
            <div className="w-20 h-20 bg-amber-500/20 rounded-3xl flex items-center justify-center mb-8">
              <Loader2 className="animate-spin text-amber-500" size={40} />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">Verifying on Polygon Amoy</h3>
            <p className="text-gray-500 font-medium">Communicating with Honey Chain decentralized node...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-10 rounded-[40px] bg-red-500/10 border border-red-500/20 backdrop-blur-xl flex flex-col items-center text-center shadow-2xl shadow-red-500/10"
          >
            <div className="w-20 h-20 bg-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-red-500/30">
              <X size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight text-red-500">Verification Failed</h3>
            <p className="text-gray-400 font-medium mb-10">{error}</p>
            <button 
              onClick={() => { setError(null); setMode('camera'); }}
              className="w-full py-4 bg-white/10 border border-white/10 rounded-2xl font-bold hover:bg-white/20 transition-all"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Result Card */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full space-y-6"
            >
              {/* Status Header */}
              <div className={`p-1 rounded-[40px] shadow-2xl shadow-black/50 ${
                result.status === 'revoked' || result.isBreached ? 'bg-gradient-to-r from-red-600 to-red-400' :
                'bg-gradient-to-r from-amber-500 to-amber-300'
              }`}>
                <div className="bg-black/90 backdrop-blur-xl rounded-[39px] p-8 flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 shadow-2xl ${
                    result.status === 'revoked' || result.isBreached ? 'bg-red-500 text-white shadow-red-500/30' :
                    'bg-amber-500 text-black shadow-amber-500/30'
                  }`}>
                    {result.status === 'active' && !result.isBreached ? <CheckCircle2 size={40} /> : 
                     <XCircle size={40} />}
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className={`text-4xl font-black tracking-tight ${
                      result.status === 'revoked' || result.isBreached ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      {result.isBreached ? 'HIVE ANOMALY DETECTED' :
                       result.status === 'revoked' ? 'RECALLED BATCH' :
                       '100% PURE HONEY'}
                    </h2>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">
                      {result.isBreached ? 'Hive Sensor Anomaly Flagged' :
                       result.status === 'revoked' ? 'This batch has been revoked by KVIC' :
                       'Verified on Polygon Amoy Blockchain'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Honey Batch Info Section */}
              <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl">
                <div className="mb-8">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-3xl font-black tracking-tight">{result.floralSource} Honey</h3>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20 mt-1">
                      {result.companyName || 'KVIC Center'}
                    </span>
                  </div>
                  <p className="text-amber-400/90 italic font-medium leading-relaxed">
                    "{result.geminiSummary || 'Pure organic raw honey with verified origin.'}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <DetailItem label="Beekeeper ID" value={result.beekeeperId} />
                  <DetailItem label="Hive ID" value={result.hiveId} />
                  <DetailItem label="Floral Source" value={result.floralSource} />
                  <DetailItem label="Batch Quantity" value={`${result.quantityKg} kg`} />
                  <DetailItem label="GPS Location" value={result.gpsLocation} />
                  <DetailItem label="Harvest Date" value={new Date(parseInt(result.harvestDate) * 1000).toLocaleDateString()} />
                  <DetailItem label="Batch NFT ID" value={result.id} />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</span>
                    <span className={`text-xs font-bold uppercase ${
                      result.status === 'active' ? 'text-green-500' : 'text-red-500'
                    }`}>{result.status}</span>
                  </div>
                </div>
              </div>

              {/* Supply Chain Journey */}
              <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-xl">
                <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                  <MapPin size={22} className="text-amber-500" />
                  Beekeeper to Retail Journey
                </h3>
                
                <div className="space-y-0 relative">
                  {result.handoffs && result.handoffs.length > 0 ? (
                    result.handoffs.map((handoff, idx) => (
                      <div key={idx} className="flex gap-6">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 rounded-full bg-amber-500 border-4 border-amber-500/30" />
                          {idx !== result.handoffs.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                        </div>
                        <div className="pb-8">
                          <p className="font-bold flex items-center gap-2">
                            {handoff.fromName} <ChevronRight size={14} className="text-gray-600" /> {handoff.toName}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">
                            {new Date(handoff.timestamp * 1000).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-500 italic">
                      Direct harvest registered. No custody transfers logged yet.
                    </div>
                  )}
                </div>
              </div>

              {/* IoT Sensor Section */}
              <div className={`p-8 rounded-[40px] border backdrop-blur-xl flex items-center justify-between shadow-xl ${
                result.isBreached ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    result.isBreached ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                  }`}>
                    {result.isBreached ? <AlertTriangle size={28} /> : <Activity size={28} />}
                  </div>
                  <div>
                    <h4 className={`text-lg font-black ${result.isBreached ? 'text-red-500' : 'text-green-500'}`}>
                      {result.isBreached ? 'Hive Health Anomaly Detected' : 'IoT Hive Health Normal'}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">Acoustic Score, Temp & Weight Sensor Audit</p>
                  </div>
                </div>
                {result.isBreached && <div className="text-red-500 font-black text-xs animate-pulse">FLAGGED</div>}
              </div>

              {/* Actions Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {!user ? (
                  <button 
                    onClick={() => navigate('/login')}
                    className="py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
                  >
                    Save to Beekeeper History <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <div className="py-4 bg-green-500/10 border border-green-500/20 rounded-2xl font-black text-lg text-green-500 flex items-center justify-center gap-2">
                    <CheckCircle2 size={20} /> Saved to History
                  </div>
                )}
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowADRModal(true)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <AlertCircle size={18} /> Flag Yield Anomaly
                  </button>
                  <button 
                    onClick={shareResult}
                    className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black text-sm hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <Share2 size={18} /> Share Result
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Yield Anomaly Modal */}
      <AnimatePresence>
        {showADRModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowADRModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] p-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowADRModal(false)}
                className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <h3 className="text-2xl font-black mb-2 tracking-tight">Flag Yield Anomaly</h3>
              <p className="text-gray-500 text-sm mb-8 font-medium">Report yield inconsistency vs IoT hive weight or adulteration concerns.</p>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Claimed Yield (kg)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 100"
                      value={adrForm.claimedYield}
                      onChange={(e) => setAdrForm({...adrForm, claimedYield: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-amber-500/50 outline-none transition-all placeholder-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Hive ID</label>
                    <input 
                      type="text"
                      placeholder="e.g. HIVE-101"
                      value={adrForm.hiveId}
                      onChange={(e) => setAdrForm({...adrForm, hiveId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-amber-500/50 outline-none transition-all placeholder-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Anomaly Details</label>
                  <textarea 
                    rows={4}
                    placeholder="Details about claimed yield mismatch, suspected C4 syrup adulteration, or colony collapse..."
                    value={adrForm.details}
                    onChange={(e) => setAdrForm({...adrForm, details: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:border-amber-500/50 outline-none transition-all placeholder-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Severity Level</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['mild', 'moderate', 'severe'].map(level => (
                      <button
                        key={level}
                        onClick={() => setAdrForm({...adrForm, severity: level})}
                        className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${
                          adrForm.severity === level 
                            ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={submitYieldAnomaly}
                  disabled={adrLoading || !adrForm.details}
                  className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black text-lg hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {adrLoading ? <Loader2 className="animate-spin" /> : 'Submit Anomaly Report'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
    <span className="text-sm font-bold text-white truncate">{value}</span>
  </div>
);

export default Scanner;
