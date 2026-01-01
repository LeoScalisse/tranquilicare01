import React from 'react';
import { View } from '../types';
import { BrandedText } from '../utils';
import { ArrowRight, HeartHandshake, Globe, UserPlus, Play } from 'lucide-react';
interface HeroProps {
  setCurrentView: (view: View) => void;
}
const Hero: React.FC<HeroProps> = ({
  setCurrentView
}) => {
  return <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-white min-h-[calc(100vh-140px)] md:min-h-[calc(100vh-80px)] flex items-center">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-blue/5 skew-x-12 transform origin-top-right translate-x-32"></div>
      
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-24 relative z-10 w-full">
        <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
          <div className="space-y-4 md:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/20 text-yellow-700 text-xs md:text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse"></span>
              Cuidar faz bem
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold text-gray-900 leading-tight">
              <BrandedText text="Faça + pelo mundo, de forma simples." />
            </h1>
            
            <p className="text-base md:text-xl text-gray-600 max-w-lg leading-relaxed">
              Uma plataforma que conecta pessoas a organizações sem fins lucrativos de forma simples e intuitiva.
            </p>

            <div className="flex flex-col gap-3 md:flex-row md:gap-4">
              <button onClick={() => setCurrentView(View.MARKETPLACE)} className="px-6 py-3 md:px-8 md:py-4 bg-brand-blue text-white rounded-xl font-bold text-base md:text-lg shadow-xl hover:shadow-brand-blue/30 transition-all flex items-center justify-center gap-2 group">
                <BrandedText text="Apoiar Agora" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button onClick={() => setCurrentView(View.STORIES_FEED)} className="px-6 py-3 md:px-8 md:py-4 bg-brand-yellow text-yellow-900 rounded-xl font-bold text-base md:text-lg shadow-lg hover:bg-[#ffe680] transition-all flex items-center justify-center gap-2 group">
                <Play className="w-5 h-5 fill-yellow-900" />
                <BrandedText text="+ Histórias" />
              </button>
              
              <button onClick={() => setCurrentView(View.NGO_REGISTRATION)} className="px-6 py-3 md:px-8 md:py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-xl font-bold text-base md:text-lg hover:border-brand-yellow hover:text-gray-900 transition-all flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                Seja apoiado
              </button>
            </div>
          </div>
          
          <div className="relative hidden md:block">
            <div className="relative z-10 grid grid-cols-2 gap-4">
               <div className="space-y-4 translate-y-8">
                  <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-50">
                     <HeartHandshake className="w-12 h-12 text-brand-blue mb-4" />
                     <h3 className="font-bold text-xl mb-2">Conexão Real</h3>
                     <p className="text-gray-500 text-sm">Conecte-se diretamente com organizações que cuidam de pessoas reais</p>
                  </div>
                  <div className="bg-brand-yellow p-6 rounded-3xl shadow-xl">
                     <h3 className="font-bold text-xl mb-2 text-yellow-900">ONGs verificadas</h3>
                     <p className="text-yellow-800 text-sm">Parceiros verificados prontos para receber seu apoio.</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="bg-brand-blue p-6 rounded-3xl shadow-xl text-white">
                     <Globe className="w-12 h-12 text-brand-yellow mb-4" />
                     <h3 className="font-bold text-xl mb-2 text-white">Impacto Local</h3>
                     <p className="text-blue-100 text-sm">Descubra organizações próximas e gere impacto onde você vive.</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-50">
                     <div className="flex -space-x-2 mb-4">
                        <img className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://picsum.photos/100/100?random=1" alt="User Avatar 1" width="40" height="40" />
                        <img className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://picsum.photos/100/100?random=2" alt="User Avatar 2" width="40" height="40" />
                        <img className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://picsum.photos/100/100?random=3" alt="User Avatar 3" width="40" height="40" />
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">5k+</div>
                     </div>
                     <h3 className="font-bold text-xl mb-2">Comunidade</h3>
                     <p className="text-gray-500 text-sm">Pessoas fazendo o bem todos os dias.</p>
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