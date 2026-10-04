import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, X, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import HoneyAtmosphere from '../components/HoneyAtmosphere';

const Login = ({ initialShowRegister = false }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [particlesReady, setParticlesReady] = useState(false);
  const [showRegister, setShowRegister] = useState(initialShowRegister);
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);

  useEffect(() => {
    setShowRegister(initialShowRegister);
  }, [initialShowRegister]);

  const particlesInitialized = useRef(false);
  useEffect(() => {
    document.body.className = 'theme-account';
    if (!particlesInitialized.current) {
      particlesInitialized.current = true;
      initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      }).then(() => setParticlesReady(true));
    }
  }, []);

  const particleOptions = {
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    particles: {
      color: { value: "#F59E0B" },
      links: {
        color: "#F59E0B",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);
      const role = data?.profile?.role;
      
      if (role === 'superadmin') navigate('/superadmin');
      else if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      return;
    }
    setRegLoading(true);
    setRegError(null);
    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: regEmail, 
          password: regPassword, 
          full_name: regFullName, 
          role: 'beekeeper' 
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      setRegError(null);
      alert('Beekeeper account created successfully! Please login.');
      setRegFullName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setShowRegister(false);
      navigate('/login');
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-11 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 backdrop-blur-sm transition-all appearance-none";

  return (
    <div className="min-h-screen bg-black text-white relative flex items-center justify-center p-6 overflow-hidden">
      <HoneyAtmosphere variant="account" />
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:border-amber-500/40 hover:text-white"
      >
        <ArrowLeft size={18} />
        Home
      </Link>

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

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center rotate-3 mb-6 shadow-lg shadow-amber-500/30">
              <Hexagon size={36} className="text-black fill-black" />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Honey Chain</h1>
            <p className="text-gray-400 font-medium">Smart Beekeeping & Honey Traceability</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div style={{
                color: '#ef4444',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-amber-500 text-black rounded-xl font-bold text-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
            <p className="text-center text-gray-400 text-sm">
              Don't have a beekeeper account?{' '}
              <button 
                type="button"
                onClick={() => {
                  setShowRegister(true);
                  navigate('/register');
                }}
                className="text-amber-500 font-bold hover:underline"
              >
                Register
              </button>
            </p>
            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/20 uppercase font-bold tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <Link 
              to="/scan" 
              className="flex items-center justify-center gap-2 text-white/50 hover:text-white text-sm font-medium transition-colors"
            >
              Continue as Guest → Scan Honey Batch
            </Link>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowRegister(false);
                navigate('/login');
              }}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => {
                  setShowRegister(false);
                  navigate('/login');
                }}
                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center rotate-3 mb-6 shadow-lg shadow-amber-500/30">
                  <Hexagon size={36} className="text-black fill-black" />
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-2">Join Honey Chain</h1>
                <p className="text-gray-400 font-medium text-sm">Register as a KVIC rural beekeeper</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className={inputClasses}
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className={inputClasses}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type={regShowPassword ? "text" : "password"}
                    placeholder="Password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    onClick={() => setRegShowPassword(!regShowPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {regShowPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type={regShowPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className={inputClasses}
                  />
                </div>

                {regError && (
                  <div style={{
                    color: '#ef4444',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    {regError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-4 bg-amber-500 text-black rounded-xl font-bold text-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-2"
                >
                  {regLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    'Create Beekeeper Account'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-center text-gray-400 text-sm">
                  Already have an account?{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setShowRegister(false);
                      navigate('/login');
                    }}
                    className="text-amber-500 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
