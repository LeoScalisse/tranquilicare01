import React, { useState } from 'react';
import { NGO } from '../types';
import { Search, Filter, Star, MapPin, CircleCheck } from 'lucide-react';

interface MarketplaceProps {
  ngos: NGO[];
  onSelectNGO: (ngo: NGO) => void;
  onSupportNGO: (ngo: NGO) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ ngos, onSelectNGO, onSupportNGO }) => {
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

  const filteredNgos = ngos.filter((ngo) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      ngo.name.toLowerCase().includes(query) ||
      ngo.description.toLowerCase().includes(query) ||
      ngo.goal.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'Todas' || ngo.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 bg-white min-h-screen">
      <div className="mb-10 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 px-1">
          Organizações para você apoiar
        </h2>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-brand-blue group-focus-within:text-brand-blue/70 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Busque por causas ou organizações"
            className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:bg-white focus:border-brand-blue transition-all text-sm outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors shrink-0">
            <Filter size={16} className="text-brand-blue" />
            <span>Filtros</span>
          </div>
          {categories.map((cat) => {
            const theme = getCategoryTheme(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2 rounded-lg whitespace-nowrap text-sm font-bold border transition-all shrink-0 ${
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNgos.length > 0 ? (
          filteredNgos.map((ngo) => {
            const theme = getCategoryTheme(ngo.category);
            const storiesCount = ngo.posts?.length ?? 0;

            return (
              <article
                key={ngo.id}
                onClick={() => onSelectNGO(ngo)}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-lg focus-within:ring-2 focus-within:ring-brand-blue/30 cursor-pointer"
              >
                <div className="relative h-40 bg-gray-100">
                  <img
                    src={ngo.image}
                    alt={ngo.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  {ngo.verified && (
                    <div className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-brand-blue shadow-sm">
                      <CircleCheck size={14} />
                      Verificada
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-white/80">ONG demo</p>
                      <h3 className="line-clamp-1 text-lg font-black text-white drop-shadow-sm">{ngo.name}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-md bg-black/35 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      <Star size={13} className="fill-brand-yellow text-brand-yellow" />
                      {storiesCount}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-md border px-3 py-1 text-xs font-bold ${theme.bg} ${theme.text} ${theme.border}`}>
                      {ngo.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                      <MapPin size={13} className="text-brand-blue" />
                      Brasil
                    </span>
                  </div>

                  <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-relaxed text-gray-600">
                    {ngo.description}
                  </p>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-bold uppercase text-gray-400">Meta atual</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-gray-700">{ngo.goal}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectNGO(ngo);
                      }}
                      className="text-sm font-bold text-brand-blue hover:text-blue-600"
                    >
                      Ver perfil
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSupportNGO(ngo);
                      }}
                      className="rounded-md bg-brand-blue px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500"
                    >
                      Apoiar
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="col-span-full py-16 flex flex-col items-center">
            <div className="bg-brand-yellow/15 border-2 border-brand-yellow rounded-lg p-8 max-w-2xl text-center">
              <p className="font-semibold text-lg leading-relaxed text-sidebar-ring">
                Nenhuma organização encontrada para esta busca.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;