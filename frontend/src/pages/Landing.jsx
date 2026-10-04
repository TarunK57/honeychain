import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scan, 
  Shield, 
  Link as LinkIcon, 
  Eye, 
  Activity, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Menu,
  X,
  Hexagon,
  Award
} from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import HoneyAtmosphere from '../components/HoneyAtmosphere';

const Landing = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [particlesReady, setParticlesReady] = useState(false);

  useEffect(() => {
    document.body.className = 'theme-public';
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setParticlesReady(true));
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
      number: { value: 34, density: { enable: true } },
      opacity: { value: 0.3 },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ 
      behavior: "smooth" 
    });
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    whileInView: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    },
    viewport: { once: true }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      <HoneyAtmosphere variant="public" />
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

      {/* Navbar */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-6 py-3 flex items-center gap-8 shadow-lg shadow-black/20 max-w-fit whitespace-nowrap">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform shadow-lg shadow-amber-500/30">
            <Hexagon size={20} className="text-black fill-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">Honey Chain</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</button>
          <button onClick={() => scrollToSection('contact')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Contact</button>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/scan" className="hidden sm:flex items-center gap-2 px-4 py-2 border border-white/10 rounded-full text-sm font-medium hover:bg-white/5 transition-colors">
            <Scan size={16} />
            Scan Honey
          </Link>
          <Link to="/login" className="px-5 py-2 bg-amber-500 text-black rounded-full text-sm font-bold hover:bg-amber-400 transition-colors">
            Log in
          </Link>
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-40 bg-black pt-24 px-6 md:hidden"
        >
          <div className="flex flex-col gap-6 text-2xl font-bold">
            <button className="text-left" onClick={() => { scrollToSection('scan'); setIsMenuOpen(false); }}>Scan</button>
            <button className="text-left" onClick={() => { scrollToSection('features'); setIsMenuOpen(false); }}>Features</button>
            <button className="text-left" onClick={() => { scrollToSection('contact'); setIsMenuOpen(false); }}>Contact</button>
            <Link to="/scan" className="flex items-center gap-2 text-amber-500">Scan Now <ArrowRight /></Link>
          </div>
        </motion.div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 pt-48 pb-32 px-6 flex flex-col items-center text-center">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/20 blur-[120px] rounded-full" />
          <div className="absolute top-40 right-1/4 w-[500px] h-[500px] bg-amber-600/10 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          {...fadeIn}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold mb-8 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          KVIC RURAL BEEKEEPING INITIATIVE
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 max-w-4xl"
        >
          Every Hive. <br />
          Every Harvest. <br />
          <span className="text-amber-500">Verified Pure.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed"
        >
          Blockchain + Smart Beekeeping platform eliminating honey adulteration & syrup blending for KVIC-supported rural beekeepers.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link to="/scan" className="px-8 py-4 bg-amber-500 text-black rounded-full font-bold text-lg hover:bg-amber-400 hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
            Scan Honey Batch <ArrowRight size={20} />
          </Link>
          <button onClick={() => scrollToSection('features')} className="px-8 py-4 bg-white/5 border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 transition-all">
            Learn More
          </button>
        </motion.div>

        {/* Floating Cards */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute hidden xl:block top-64 left-20 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-2xl max-w-[200px] text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Award size={16} className="text-amber-500" />
            </div>
            <span className="text-xs font-bold text-amber-500">APIARY NETWORK</span>
          </div>
          <p className="text-sm font-medium leading-tight">Supporting producer-led honey supply chains</p>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute hidden xl:block top-80 right-20 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-2xl max-w-[220px] text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Shield size={16} className="text-amber-500" />
            </div>
            <span className="text-xs font-bold text-amber-500">BATCH PROVENANCE</span>
          </div>
          <p className="text-sm font-medium leading-tight">Traceable harvest and custody records</p>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 py-20 overflow-hidden">
        <motion.div 
          {...fadeIn}
          className="max-w-5xl mx-auto bg-amber-500 rounded-[40px] p-8 md:p-16 flex flex-wrap justify-between items-center gap-12 text-black"
        >
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-black tracking-tighter">100%</span>
            <p className="text-black/70 font-bold leading-tight max-w-[150px]">On-Chain Purity Verification</p>
          </div>
          <div className="w-px h-16 bg-black/10 hidden lg:block" />
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-black tracking-tighter">10K+</span>
            <p className="text-black/70 font-bold leading-tight max-w-[150px]">KVIC Rural Beekeepers</p>
          </div>
          <div className="w-px h-16 bg-black/10 hidden lg:block" />
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-black tracking-tighter">0%</span>
            <p className="text-black/70 font-bold leading-tight max-w-[150px]">Adulterated C4 Sugar Syrups</p>
          </div>
          <div className="w-px h-16 bg-black/10 hidden lg:block" />
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-black tracking-tighter">5</span>
            <p className="text-black/70 font-bold leading-tight max-w-[150px]">Custody Transfer Stages</p>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-32 max-w-7xl mx-auto">
        <motion.div 
          {...fadeIn}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Smart Beekeeping & <br />Honey Traceability.</h2>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[
            { title: "On-Chain Honey NFT", icon: <Shield size={32} />, desc: "Immutable cryptographic Batch NFT for every honey harvest batch." },
            { title: "Beekeeper to Retail Journey", icon: <LinkIcon size={32} />, desc: "Complete chain of custody from rural apiaries to retail shelves." },
            { title: "AI Adulteration Detection", icon: <Eye size={32} />, desc: "AI spectral model detecting C4 syrup blending and pollen deficiency." },
            { title: "IoT Hive Sensors", icon: <Activity size={32} />, desc: "Real-time acoustic score, temperature, humidity, and hive weight monitoring." },
            { title: "Yield Anomaly Auditing", icon: <AlertTriangle size={32} />, desc: "Automated flagging when claimed yield exceeds IoT hive capacity." },
            { title: "Harvest Date & GPS Provenance", icon: <Clock size={32} />, desc: "Geo-tagged location & exact harvest timestamp recorded on Polygon." }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              variants={fadeIn}
              whileHover={{ y: -10, borderColor: "rgba(245, 158, 11, 0.5)" }}
              className="backdrop-blur-sm bg-white/5 border border-white/10 hover:border-amber-500/50 rounded-2xl p-6 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:bg-amber-500 group-hover:text-black transition-all">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it Works */}
      <section id="scan" className="relative z-10 px-6 py-32 bg-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.h2 {...fadeIn} className="text-4xl md:text-5xl font-black tracking-tighter mb-20">How Honey Chain Works</motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connection Lines */}
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 hidden md:block -translate-y-1/2 -z-10" />
            
            {[
              { step: "01", title: "Scan Honey QR", desc: "Use the Honey Chain scanner to scan the QR code on any honey jar." },
              { step: "02", title: "Verify Blockchain NFT", desc: "Cross-reference batch ID with KVIC collection center immutable ledger." },
              { step: "03", title: "View Hive Provenance", desc: "See beekeeper details, floral source, harvest date, GPS location, and purity score." }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="bg-black p-8 rounded-3xl border border-white/10"
              >
                <div className="text-amber-500 text-6xl font-black mb-6 opacity-30">{item.step}</div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="relative z-10 px-6 pt-32 pb-12 overflow-hidden border-t border-white/10">
        {/* Watermark */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[20vw] font-black text-white/[0.03] select-none pointer-events-none whitespace-nowrap">
          Honey Chain
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="lg:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-6">
                <Hexagon size={32} className="text-amber-500 fill-amber-500" />
                <span className="text-2xl font-black">Honey Chain</span>
              </Link>
              <p className="text-gray-400 leading-relaxed mb-8 max-w-sm">
                Empowering KVIC rural beekeepers and protecting consumers with blockchain honey traceability and AI purity verification.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-amber-500 hover:text-black transition-colors cursor-pointer">
                  <Shield size={18} />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-amber-500 hover:text-black transition-colors cursor-pointer">
                  <Scan size={18} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Platform</h4>
              <ul className="flex flex-col gap-4 text-gray-400">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('scan')} className="hover:text-white transition-colors">How it works</button></li>
                <li><Link to="/scan" className="hover:text-white transition-colors">Verify Honey</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Portal Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Roles</h4>
              <ul className="flex flex-col gap-4 text-gray-400">
                <li><span className="hover:text-white transition-colors">KVIC Governance (SuperAdmin)</span></li>
                <li><span className="hover:text-white transition-colors">Collection Center (Admin)</span></li>
                <li><span className="hover:text-white transition-colors">Rural Beekeeper</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Contact</h4>
              <ul className="flex flex-col gap-4 text-gray-400">
                <li className="flex items-center gap-2 underline">kvic-support@honeychain.org</li>
                <li>Khadi & Village Industries Commission (KVIC), India</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© 2026 Honey Chain. KVIC Rural Beekeeping Initiative.</p>
            <div className="flex gap-8">
              <span>All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
