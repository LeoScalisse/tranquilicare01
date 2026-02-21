import React, { useState } from 'react';
import { NGO } from '../types';
import { Search, Filter, Star, MapPin, CircleCheck } from 'lucide-react';

interface MarketplaceProps {
  ngos: NGO[];
  onSelectNGO: (ngo: NGO) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ ngos, onSelectNGO }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const categories = ['Todas', 'Saúde Mental', 'Social', 'Outros'];

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'Saúde Mental':
        return {
          text: 'text-pink-600',
          bg: 'bg-pink-50',
          border: 'border-pink-100',
          active: 'bg-pink-500 text-white border-pink-500 shadow-pink-100',
        };
      case 'Social':
        return {
          text: 'text-brand-blue',
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          active: 'bg-brand-blue text-white border-brand-blue shadow-blue-100',
        };
      case 'Outros':
        return {
          text: 'text-blue-900',
          bg: 'bg-blue-100/50',
          border: 'border-blue-200',
          active: 'bg-blue-900 text-white border-blue-900 shadow-blue-200',
        };
      default:
        return {
          text: 'text-gray-500',
          bg: 'bg-gray-50',
          border: 'border-gray-100',
          active: 'bg-brand-blue text-white border-brand-blue shadow-blue-100',
        };
    }
  };

  const filteredNgos = ngos.filter(ngo => {
    const matchesSearch = ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         ngo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || ngo.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-white min-h-screen">
      {/* Header section */}
      <div className="mb-10 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 px-1">
          Organizações para você apoiar
        </h2>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-brand-blue group-focus-within:text-brand-blue/70 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Busque por causas ou organizações" 
            className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/20 focus:bg-white focus:border-brand-blue transition-all text-sm outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm font-bold text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors shrink-0">
            <Filter size={16} className="text-brand-blue" />
            <span>Filtros</span>
          </div>
          {categories.map(cat => {
            const theme = getCategoryTheme(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold border transition-all shrink-0 ${
                  selectedCategory === cat 
                  ? `${theme.active} shadow-md` 
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNgos.map(ngo => {
          const theme = getCategoryTheme(ngo.category);
          return (
            <div 
              key={ngo.id} 
              onClick={() => onSelectNGO(ngo)}
              className="flex items-start gap-4 p-4 hover:bg-slate-50 rounded-3xl transition-all cursor-pointer group border border-transparent hover:border-gray-100 shadow-sm hover:shadow-md"
            >
              {/* NGO Image */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
                  <img 
                    src={ngo.image} 
                    alt={ngo.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>
                {ngo.verified && (
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <CircleCheck className="text-brand-blue w-5 h-5 fill-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 truncate leading-tight group-hover:text-brand-blue transition-colors mb-1">
                  {ngo.name}
                </h3>

                <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] sm:text-[11px] text-gray-500 mb-1.5 font-bold uppercase tracking-wider">
                  <div className="flex items-center text-brand-yellow">
                    <Star size={12} className="fill-brand-yellow mr-0.5" />
                    4.9
                  </div>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-400 normal-case font-medium">Avaliada pela comunidade</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-bold uppercase tracking-wider">
                  <span className={`truncate px-2 py-0.5 rounded-md border ${theme.bg} ${theme.text} ${theme.border}`}>
                    {ngo.category}
                  </span>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-0.5 text-gray-400">
                    <MapPin size={10} />
                    0.8 km
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-400 line-clamp-1 italic">
                  {ngo.goal}
                </p>
              </div>
            </div>
          );
        })}

        {filteredNgos.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center gap-8">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
              <Search className="text-gray-200 w-12 h-12" />
            </div>
            <div className="bg-brand-yellow/15 border-2 border-brand-yellow rounded-2xl p-6 max-w-lg text-center">
              <p className="text-gray-800 font-medium leading-relaxed">
                Estamos selecionando as primeiras organizações parceiras da TranquiliCare. Se você está lendo isso, saiba que está no nascimento de algo que vai mudar vidas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
