import React from 'react';
import { View } from '../types';
import { BrandedText } from '../utils';
import { ArrowRight, HeartHandshake, Globe, UserPlus, Play } from 'lucide-react';
import logo from '@/assets/logo.png';
interface HeroProps {
  setCurrentView: (view: View) => void;
}
const Hero: React.FC<HeroProps> = ({
  setCurrentView
}) => {
  return <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-white min-h-[calc(100vh-80px)] flex items-center">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-blue/5 skew-x-12 transform origin-top-right translate-x-32"></div>
      
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-24 relative z-10 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
           <div className="space-y-8">
            <div className="flex items-center gap-4 mb-4">
              <img src={logo} alt="TranquiliCare" className="w-16 h-16 rounded-2xl shadow-lg" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/20 text-yellow-700 text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse"></span>
                Cuidar faz bem
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              <BrandedText text="Faça + pelo mundo, de forma simples." />
            </h1>
            
            <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
              Uma plataforma que conecta pessoas a organizações sem fins lucrativos de forma simples e intuitiva. Doe ou inscreva sua organização.


            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setCurrentView(View.MARKETPLACE)} className="px-8 py-4 bg-brand-blue text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-brand-blue/30 transition-all flex items-center justify-center gap-2 group">
                <BrandedText text="Apoiar Agora" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button onClick={() => setCurrentView(View.STORIES_FEED)} className="px-8 py-4 bg-brand-yellow text-yellow-900 rounded-xl font-bold text-lg shadow-lg hover:bg-[#ffe680] transition-all flex items-center justify-center gap-2 group">
                <Play className="w-5 h-5 fill-yellow-900" />
                <BrandedText text="+ Histórias" />
              </button>
              
              <button onClick={() => setCurrentView(View.NGO_REGISTRATION)} className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-xl font-bold text-lg hover:border-brand-yellow hover:text-gray-900 transition-all flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                Seja apoiado
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="relative z-10 grid grid-cols-2 gap-4">
               <div className="space-y-4 translate-y-16">
                  <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-50">
                     <HeartHandshake className="w-12 h-12 text-brand-blue mb-4" />
                     <h3 className="font-bold text-xl mb-2">Conexão Real</h3>
                     <p className="text-gray-500 text-sm">Conecte-se diretamente com organizações que cuidam de pessoas reais</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="bg-brand-blue p-6 rounded-3xl shadow-xl text-white">
                     <Globe className="w-12 h-12 text-brand-yellow mb-4" />
                     <h3 className="font-bold text-xl mb-2 text-white">Impacto Local</h3>
                     <p className="text-blue-100 text-sm">Descubra organizações próximas e gere impacto onde você vive.</p>
                  </div>
                  <div className="bg-brand-yellow p-6 rounded-3xl shadow-xl">
                     <h3 className="font-bold text-xl mb-2 text-yellow-900">ONGs verificadas</h3>
                     <p className="text-yellow-800 text-sm">Parceiros verificados prontos para receber seu apoio.</p>
                  </div>
               </div>
            </div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-brand-blue/20 to-brand-yellow/20 blur-3xl rounded-full -z-10"></div>
          </div>
        </div>
      </div>
    </div>;
};
export default Hero;