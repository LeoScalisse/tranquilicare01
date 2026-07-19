import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NGO, FlashCampaign } from '../types';
import { Search, Star, Heart, HeartHandshake, ChevronRight, Clock, Zap } from 'lucide-react';
import { flashCampaigns } from '@/data/flashCampaigns';
import { formatBRL } from '@/lib/impact';

const SEARCH_PLACEHOLDERS = [
  'Busque por causas',
  'Busque por ONGs',
  "Busque por 'perto de mim'",
  'Busque por saúde mental',
  'Busque por impacto social',
];

// Friendly, exploration-first section titles per category (Airbnb-style rows).
const SECTION_TITLES: Record<string, string> = {
  'Saúde Mental': 'Cuidando da mente',
  Social: 'Impacto social pertinho de você',
  Pets: 'Amigos de quatro patas',
  'Meio Ambiente': 'Cuidando do planeta',
  Outros: 'Outras causas para abraçar',
};
const sectionTitle = (cat: string) => SECTION_TITLES[cat] ?? `Causas de ${cat}`;

const CATEGORY_ORDER = ['Saúde Mental', 'Social', 'Pets', 'Meio Ambiente', 'Outros'];

const FAV_KEY = 'tc-favorites';
const loadFavorites = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

interface MarketplaceProps {
  ngos: NGO[];
  onSelectNGO: (ngo: NGO) => void;
  onSupportNGO: (ngo: NGO) => void;
  /** Slim heading + capped sections for when embedded in the home dashboard */
  embedded?: boolean;
}

/**
 * Per-segment pastel theme. `text`/`bg`/`border` style the category pill under
 * each card; `chipText`/`chipBg` drive the neumorphic filter chips (chipBg is
 * the pastel fill shown when a chip is pressed/sunken).
 */
const getCategoryTheme = (cat: string) => {
  switch (cat) {
    case 'Todas':
      return { text: 'text-brand-ink', bg: 'bg-secondary', border: 'border-border', chipText: 'text-brand-ink', chipBg: 'bg-secondary' };
    case 'Saúde Mental':
      return { text: 'text-pink-600', bg: 'bg-pink-100', border: 'border-pink-200', chipText: 'text-pink-600', chipBg: 'bg-pink-100' };
    case 'Social':
      return { text: 'text-sky-600', bg: 'bg-sky-100', border: 'border-sky-200', chipText: 'text-sky-600', chipBg: 'bg-sky-100' };
    case 'Pets':
      return { text: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200', chipText: 'text-orange-600', chipBg: 'bg-orange-100' };
    case 'Meio Ambiente':
      return { text: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', chipText: 'text-emerald-600', chipBg: 'bg-emerald-100' };
    case 'Outros':
      return { text: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-200', chipText: 'text-violet-600', chipBg: 'bg-violet-100' };
    default:
      return { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', chipText: 'text-slate-600', chipBg: 'bg-slate-100' };
  }
};

/** Airbnb-style card content: image + save-heart, then name + colored category pill. */
const NgoCardContent: React.FC<{
  ngo: NGO;
  saved: boolean;
  onToggleSave: (id: string) => void;
  compact?: boolean;
}> = ({ ngo, saved, onToggleSave, compact = false }) => {
  const theme = getCategoryTheme(ngo.category);
  const storiesCount = ngo.posts?.length ?? 0;

  return (
    <>
      <div className="relative aspect-[20/19] overflow-hidden rounded-2xl bg-muted">
        <img
          src={ngo.image}
          alt={ngo.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(ngo.id);
          }}
          aria-label={saved ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
          aria-pressed={saved}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full transition-transform active:scale-90"
        >
          <Heart
            size={26}
            className={`drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-colors ${
              saved ? 'fill-brand-blue text-brand-blue' : 'fill-black/25 text-white'
            }`}
          />
        </button>
      </div>

      <div className="pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-[15px] font-semibold text-brand-ink">{ngo.name}</h3>
          {storiesCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-ink">
              <Star size={13} className="fill-brand-yellow text-brand-yellow" />
              {storiesCount}
            </span>
          )}
        </div>
        <span className={`mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${theme.bg} ${theme.text} ${theme.border}`}>
          {ngo.category}
        </span>
        {!compact && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground/90">{ngo.goal}</p>
        )}
      </div>
    </>
  );
};

/** Live countdown to a timestamp; re-ticks each minute (fine for d/h/m display). */
const useCountdown = (endsAt: number) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, endsAt - nowMs);
  return {
    done: diff <= 0,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
};

/** Flash-fundraiser card: goal-progress bar + a countdown "reloginho". */
const FlashCampaignCard: React.FC<{ campaign: FlashCampaign; onOpen: (c: FlashCampaign) => void }> = ({
  campaign,
  onOpen,
}) => {
  const { done, days, hours, minutes } = useCountdown(campaign.endsAt);
  const pct = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
  const urgent = !done && days < 1;
  const timeLabel = done
    ? 'Encerrada'
    : days >= 1
      ? `${days}d ${hours}h`
      : hours >= 1
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(campaign)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(campaign)}
      className="group w-[80%] sm:w-72 lg:w-80 shrink-0 snap-start cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 rounded-2xl"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
        <img
          src={campaign.image}
          alt={campaign.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-brand-yellow px-2.5 py-1 text-xs font-bold text-brand-ink shadow-sm">
          <Zap size={13} className="fill-brand-ink" />
          Relâmpago
        </span>
        <span
          className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur ${
            done ? 'bg-gray-500/90 text-white' : urgent ? 'bg-red-500/95 text-white' : 'bg-brand-ink/85 text-white'
          }`}
        >
          <Clock size={13} />
          {timeLabel}
        </span>
      </div>

      <div className="pt-3">
        <h3 className="line-clamp-1 font-display text-[15px] font-semibold text-brand-ink">{campaign.title}</h3>
        <p className="text-sm text-muted-foreground">{campaign.ngoName}</p>

        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-blue/70 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <span className="font-bold text-brand-ink">{formatBRL(campaign.raised)}</span> de {formatBRL(campaign.goal)}
          </span>
          <span className="font-bold text-brand-blue">{pct}%</span>
        </div>
      </div>
    </div>
  );
};

const Marketplace: React.FC<MarketplaceProps> = ({ ngos, onSelectNGO, embedded = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      } catch {
        /* storage may be unavailable — favorites simply won't persist */
      }
      return next;
    });
  };

  // Tesla-style rotating placeholder (only while the field is empty).
  useEffect(() => {
    if (searchTerm) return;
    const id = setInterval(() => setPlaceholderIndex((i) => (i + 1) % SEARCH_PLACEHOLDERS.length), 2800);
    return () => clearInterval(id);
  }, [searchTerm]);

  const categories = useMemo(() => {
    const present = Array.from(new Set(ngos.map((n) => n.category)));
    const ordered = [...CATEGORY_ORDER.filter((c) => present.includes(c)), ...present.filter((c) => !CATEGORY_ORDER.includes(c))];
    return ['Todas', ...ordered];
  }, [ngos]);

  const searchedNgos = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return ngos;
    return ngos.filter(
      (ngo) =>
        ngo.name.toLowerCase().includes(query) ||
        ngo.description.toLowerCase().includes(query) ||
        ngo.category.toLowerCase().includes(query) ||
        ngo.goal.toLowerCase().includes(query),
    );
  }, [ngos, searchTerm]);

  // Airbnb-style themed rows. A category becomes a carousel only when it has
  // enough cards to feel like a row; thin/leftover ones fold into a grid so a
  // single-card "carousel" never looks broken with sparse data.
  const { rows, leftovers } = useMemo(() => {
    const rows: { key: string; title: string; items: NGO[]; category: string | null }[] = [];
    const verified = ngos.filter((n) => n.verified);
    if (ngos.length >= 5 && verified.length >= 3) {
      rows.push({ key: 'featured', title: 'ONGs em destaque', items: verified, category: null });
    }
    const leftovers: NGO[] = [];
    for (const cat of categories.filter((c) => c !== 'Todas')) {
      const items = ngos.filter((n) => n.category === cat);
      if (items.length >= 2) rows.push({ key: cat, title: sectionTitle(cat), items, category: cat });
      else leftovers.push(...items);
    }
    return { rows: embedded ? rows.slice(0, 2) : rows, leftovers };
  }, [ngos, categories, embedded]);

  const isSearching = searchTerm.trim().length > 0;
  const isCategoryFilter = selectedCategory !== 'Todas';
  const mode: 'search' | 'category' | 'sections' = isSearching ? 'search' : isCategoryFilter ? 'category' : 'sections';

  const categoryNgos = ngos.filter((n) => selectedCategory === 'Todas' || n.category === selectedCategory);

  const openCampaign = (c: FlashCampaign) => {
    const ngo = ngos.find((n) => n.id === c.ngoId);
    if (ngo) onSelectNGO(ngo);
  };

  const cardProps = (ngo: NGO) => ({ ngo, saved: favorites.has(ngo.id), onToggleSave: toggleFavorite });

  const EmptyState = () => (
    <div className="py-16 flex flex-col items-center">
      <div className="bg-white border border-border rounded-3xl p-10 max-w-2xl text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-yellow/20">
          <HeartHandshake className="h-8 w-8 text-brand-ink/60" />
        </div>
        <p className="font-display text-xl font-semibold text-brand-ink mb-1">Nenhuma organização encontrada</p>
        <p className="text-muted-foreground text-sm">
          Tente outra busca ou explore uma categoria diferente — toda causa merece ser descoberta.
        </p>
      </div>
    </div>
  );

  return (
    <div className={`max-w-7xl mx-auto px-4 ${embedded ? 'py-6' : 'py-10 min-h-screen'}`}>
      <div className={`${embedded ? 'mb-6' : 'mb-8'} space-y-5`}>
        <div className="px-1 space-y-2">
          <h2 className={`font-display font-semibold text-brand-ink ${embedded ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'}`}>
            Causas esperando <em className="text-brand-blue">por você</em>
          </h2>
          {!embedded && (
            <p className="text-muted-foreground max-w-xl">
              Cada organização aqui passou por verificação. Explore, salve suas favoritas e faça parte da história.
            </p>
          )}
        </div>

        {/* Search — rotating placeholder while empty */}
        <div className="relative max-w-2xl bg-white border border-border rounded-full shadow-sm transition-all focus-within:ring-4 focus-within:ring-brand-blue/15 focus-within:border-brand-blue">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
            <Search className="h-5 w-5 text-brand-blue" />
          </div>
          {!searchTerm && (
            <div className="absolute inset-y-0 left-[3.25rem] right-5 flex items-center overflow-hidden pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIndex}
                  initial={{ opacity: 0, y: '0.6em' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '-0.6em' }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="block text-sm text-muted-foreground/70 truncate"
                >
                  {SEARCH_PLACEHOLDERS[placeholderIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
          <input
            type="text"
            aria-label="Buscar causas ou organizações"
            className="relative z-[1] block w-full pr-5 py-4 bg-transparent text-sm outline-none"
            style={{ paddingLeft: '3.25rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category quick-filters — neumorphic: selected sinks in (inset) and
            stays pressed; the others stay projected out (raised drop shadow). */}
        <div className="flex items-center gap-3 overflow-x-auto px-1 py-3 -mx-1 no-scrollbar">
          {categories.map((cat) => {
            const theme = getCategoryTheme(cat);
            const selected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                aria-pressed={selected}
                className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-all duration-300 ${theme.chipText} ${
                  selected
                    ? `${theme.chipBg} shadow-[inset_3px_3px_7px_rgba(16,42,67,0.20),inset_-3px_-3px_7px_rgba(255,255,255,0.75)]`
                    : 'bg-white shadow-[4px_4px_10px_rgba(16,42,67,0.12),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_3px_3px_6px_rgba(16,42,67,0.16)]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- SEARCH RESULTS: plain grid ---- */}
      {mode === 'search' &&
        (searchedNgos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {searchedNgos.map((ngo) => (
              <div
                key={ngo.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectNGO(ngo)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectNGO(ngo)}
                className="group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 rounded-2xl"
              >
                <NgoCardContent {...cardProps(ngo)} />
              </div>
            ))}
          </div>
        ))}

      {/* ---- CATEGORY FILTER: framer-motion layout grid (clean reflow) ---- */}
      {mode === 'category' &&
        (categoryNgos.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            layout
            className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8"
          >
            <AnimatePresence mode="popLayout">
              {categoryNgos.map((ngo) => (
                <motion.div
                  key={ngo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => onSelectNGO(ngo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectNGO(ngo)}
                  className="group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 rounded-2xl"
                >
                  <NgoCardContent {...cardProps(ngo)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ))}

      {/* ---- DEFAULT: flash fundraisers + Airbnb-style themed carousels ---- */}
      {mode === 'sections' && (
        <div className="space-y-10">
          {flashCampaigns.length > 0 && (
            <section>
              <div className="mb-1 flex items-center gap-2">
                <Zap size={22} className="fill-brand-yellow text-brand-yellow" />
                <h3 className="font-display text-xl md:text-2xl font-semibold text-brand-ink">Vaquinhas relâmpago</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">Campanhas com prazo — cada minuto conta.</p>
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory no-scrollbar">
                {flashCampaigns.map((c) => (
                  <FlashCampaignCard key={c.id} campaign={c} onOpen={openCampaign} />
                ))}
              </div>
            </section>
          )}

          {rows.map((row) => (
            <section key={row.key}>
              <button
                type="button"
                onClick={() => row.category && setSelectedCategory(row.category)}
                className={`group/head mb-4 flex items-center gap-1.5 ${row.category ? '' : 'cursor-default'}`}
                disabled={!row.category}
              >
                <h3 className="font-display text-xl md:text-2xl font-semibold text-brand-ink">{row.title}</h3>
                {row.category && (
                  <ChevronRight size={22} className="text-brand-ink transition-transform group-hover/head:translate-x-0.5" />
                )}
              </button>
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory no-scrollbar">
                {row.items.map((ngo) => (
                  <div
                    key={ngo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectNGO(ngo)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectNGO(ngo)}
                    className="group w-[44%] sm:w-56 lg:w-64 shrink-0 snap-start cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 rounded-2xl"
                  >
                    <NgoCardContent {...cardProps(ngo)} compact />
                  </div>
                ))}
              </div>
            </section>
          ))}

          {!embedded && leftovers.length > 0 && (
            <section>
              <h3 className="mb-4 font-display text-xl md:text-2xl font-semibold text-brand-ink">Mais causas para conhecer</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
                {leftovers.map((ngo) => (
                  <div
                    key={ngo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectNGO(ngo)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectNGO(ngo)}
                    className="group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 rounded-2xl"
                  >
                    <NgoCardContent {...cardProps(ngo)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {rows.length === 0 && leftovers.length === 0 && flashCampaigns.length === 0 && <EmptyState />}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
