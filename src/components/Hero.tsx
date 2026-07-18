import React from 'react';
import { motion } from 'framer-motion';
import { View } from '../types';
import { BrandedText } from '../utils';
import { ArrowRight, HeartHandshake, Globe, UserPlus, Play, Sparkles, ShieldCheck } from 'lucide-react';
import logo from '@/assets/logo.png';

interface HeroProps {
  setCurrentView: (view: View) => void;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const sparkles = [
  { top: '12%', left: '6%', size: 'text-2xl', delay: '0s' },
  { top: '24%', left: '46%', size: 'text-lg', delay: '0.8s' },
  { top: '68%', left: '10%', size: 'text-xl', delay: '1.6s' },
  { top: '14%', left: '88%', size: 'text-3xl', delay: '0.4s' },
  { top: '80%', left: '52%', size: 'text-lg', delay: '2.2s' },
];

const Hero: React.FC<HeroProps> = ({ setCurrentView }) => {
  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-80px)] flex items-center grain">
      <div className="aurora" aria-hidden="true" />

      {/* Floating brand "+" sparkles */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {sparkles.map((s, i) => (
          <span
            key={i}
            className={`absolute font-bold text-brand-yellow animate-sparkle select-none ${s.size}`}
            style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          >
            +
          </span>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 md:py-24 relative z-10 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
            <motion.div variants={item} className="flex items-center gap-4">
              <img src={logo} alt="TranquiliCare" className="w-16 h-16 rounded-2xl shadow-lg" />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur border border-brand-yellow/50 text-brand-ink text-sm font-semibold shadow-sm">
                <Sparkles className="w-4 h-4 text-brand-yellow fill-brand-yellow" />
                Cuidar faz bem
              </div>
            </motion.div>

            <motion.h1
              variants={item}
              className="font-display text-4xl md:text-6xl font-semibold text-brand-ink leading-[1.05]"
            >
              Faça <span className="text-brand-yellow font-bold">+</span> pelo mundo,
              <br />
              <em className="text-brand-blue">de forma simples.</em>
            </motion.h1>

            <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
              O marketplace do bem: descubra organizações verificadas, acompanhe histórias reais
              e transforme generosidade em impacto — em poucos cliques.
            </motion.p>

            <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setCurrentView(View.MARKETPLACE)}
                className="btn-shine px-8 py-4 bg-brand-blue text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-blue/30 hover:shadow-2xl hover:shadow-brand-blue/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <BrandedText text="Apoiar Agora" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>

              <button
                onClick={() => setCurrentView(View.STORIES_FEED)}
                className="px-8 py-4 bg-brand-yellow text-brand-ink rounded-2xl font-bold text-lg shadow-lg shadow-brand-yellow/40 hover:shadow-xl hover:-translate-y-0.5 hover:bg-[#ffe680] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <BrandedText text="+ Histórias" />
              </button>

              <button
                onClick={() => setCurrentView(View.NGO_REGISTRATION)}
                className="px-8 py-4 bg-white/80 backdrop-blur text-brand-ink border border-border rounded-2xl font-bold text-lg hover:border-brand-yellow hover:bg-white transition-all duration-300 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Seja apoiado
              </button>
            </motion.div>

            <motion.div variants={item} className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                ONGs verificadas
              </span>
              <span className="flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-brand-blue" />
                100% direto para a causa
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden md:block"
          >
            <div className="relative z-10 grid grid-cols-2 gap-4">
              <div className="space-y-4 translate-y-16">
                <div className="bg-white/90 backdrop-blur p-6 rounded-3xl shadow-xl border border-white animate-float-soft">
                  <HeartHandshake className="w-12 h-12 text-brand-blue mb-4" />
                  <h3 className="font-display font-semibold text-xl mb-2 text-brand-ink">Conexão Real</h3>
                  <p className="text-muted-foreground text-sm">
                    Conecte-se diretamente com organizações que cuidam de pessoas reais.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-brand-blue p-6 rounded-3xl shadow-xl shadow-brand-blue/30 text-white animate-float-soft" style={{ animationDelay: '1.2s' }}>
                  <Globe className="w-12 h-12 text-brand-yellow mb-4" />
                  <h3 className="font-display font-semibold text-xl mb-2 text-white">Impacto Local</h3>
                  <p className="text-blue-100 text-sm">
                    Descubra organizações próximas e gere impacto onde você vive.
                  </p>
                </div>
                <div className="bg-brand-yellow p-6 rounded-3xl shadow-xl shadow-brand-yellow/40 animate-float-soft" style={{ animationDelay: '2.4s' }}>
                  <ShieldCheck className="w-10 h-10 text-brand-ink mb-3" />
                  <h3 className="font-display font-semibold text-xl mb-2 text-brand-ink">ONGs verificadas</h3>
                  <p className="text-brand-ink/70 text-sm">
                    Parceiros verificados prontos para receber seu apoio.
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-brand-blue/20 to-brand-yellow/20 blur-3xl rounded-full -z-10" />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
