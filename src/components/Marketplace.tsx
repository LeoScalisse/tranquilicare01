import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { NGO, FlashCampaign } from "../types";
import { Search, HeartHandshake, ChevronRight } from "lucide-react";
import { flashCampaigns } from "@/data/flashCampaigns";
import {
  getNgoCategorySectionTitle,
  getNgoCategoryTheme,
  getNgoCategory,
  NGO_CATEGORY_ORDER,
} from "@/data/ngoCategories";
import { formatBRL } from "@/lib/impact";
import { SmoothInput } from "@/components/ui/smooth-input";
import CauseShowcaseCard from "@/components/marketplace/CauseShowcaseCard";
import FundraiserDisclosureCard from "@/components/ui/fundraiser-disclosure-card";
import cowHead from "@/assets/cow-head.png";

const SEARCH_PLACEHOLDERS = [
  "Busque uma causa...",
  "Uma ONG...",
  "Algo perto de você...",
  "Saúde mental...",
  "Educação...",
];

const FAV_KEY = "tc-favorites";
const loadFavorites = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
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

const getSectionBackground = (key: string, category: string | null) => {
  if (category) return getNgoCategoryTheme(category).sectionBg;
  if (key === "featured") return "bg-[#CBEAF1]";
  if (key === "new-stories") return "bg-[#FFDFAB]";
  return "bg-[#DDE6EA]";
};

const CowCampaignSection: React.FC<{
  campaigns: FlashCampaign[];
  onOpen: (campaign: FlashCampaign) => void;
}> = ({ campaigns, onOpen }) => {
  const reduceMotion = useReducedMotion();
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(
    () => new Set(),
  );
  const layoutTransition = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, bounce: 0.08, duration: 0.38 };
  const expansionKey = [...expandedCampaignIds].sort().join("|");

  const handleExpandedChange = (campaignId: string, expanded: boolean) => {
    setExpandedCampaignIds((current) => {
      const next = new Set(current);
      if (expanded) next.add(campaignId);
      else next.delete(campaignId);
      return next;
    });
  };

  return (
    <motion.section
      layout="size"
      layoutDependency={expansionKey}
      transition={layoutTransition}
      data-cow-campaign-section
      className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] border border-brand-ink/10 bg-white pb-9 pt-16 shadow-[0_18px_45px_-36px_rgba(13,45,65,0.5)] md:rounded-[34px] md:pt-[4.5rem]"
    >
      <span
        data-cow-spot
        aria-hidden="true"
        className="absolute -left-10 top-8 h-24 w-40 rotate-[-18deg] rounded-[48%_52%_42%_58%] bg-black"
      />
      <span
        data-cow-spot
        aria-hidden="true"
        className="absolute left-[18%] top-5 h-12 w-20 rotate-[12deg] rounded-[58%_42%_64%_36%] bg-black"
      />
      <span
        data-cow-spot
        aria-hidden="true"
        className="absolute right-[20%] top-10 h-16 w-28 rotate-[-14deg] rounded-[44%_56%_38%_62%] bg-black"
      />
      <span
        data-cow-spot
        aria-hidden="true"
        className="absolute -right-8 top-[34%] h-24 w-36 rotate-[18deg] rounded-[62%_38%_48%_52%] bg-black"
      />
      <span
        data-cow-spot
        aria-hidden="true"
        className="absolute left-[43%] top-[42%] h-16 w-24 rotate-[-10deg] rounded-[62%_38%_54%_46%] bg-black"
      />
      <span
        data-cow-spot
        aria-hidden="true"
        className="absolute left-[8%] bottom-7 h-20 w-32 rotate-[8deg] rounded-[38%_62%_57%_43%] bg-black"
      />
      <span
        data-cow-spot
        aria-hidden="true"
        className="absolute left-[61%] bottom-5 h-14 w-24 rotate-[-20deg] rounded-[56%_44%_35%_65%] bg-black"
      />
      <span
        data-cow-spot
        aria-hidden="true"
        className="absolute -right-8 bottom-10 h-32 w-48 rotate-[16deg] rounded-[55%_45%_60%_40%] bg-black"
      />

      <img
        data-cow-head
        src={cowHead}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-2 z-20 w-28 -translate-x-1/2 object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.14)] md:w-32"
      />

      <motion.div
        layout="size"
        layoutDependency={expansionKey}
        transition={layoutTransition}
        className="relative z-10 mx-auto max-w-7xl px-4"
      >
        <div className="mb-5 w-fit rounded-lg bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
          <h3 className="font-display text-xl font-semibold text-brand-ink md:text-2xl">
            Vaquinhas
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Campanhas com um objetivo e um tempo para acontecer.
          </p>
        </div>
        <motion.div
          layout="size"
          layoutDependency={expansionKey}
          transition={layoutTransition}
          className="-mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-3 no-scrollbar"
        >
          {campaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              layout="position"
              transition={layoutTransition}
              className="shrink-0 snap-start"
            >
              <FundraiserDisclosureCard
                campaign={campaign}
                onOpen={onOpen}
                onExpandedChange={(expanded) =>
                  handleExpandedChange(campaign.id, expanded)
                }
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.section>
  );
};
const Marketplace: React.FC<MarketplaceProps> = ({
  ngos,
  onSelectNGO,
  embedded = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
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
    const id = setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % SEARCH_PLACEHOLDERS.length),
      2800,
    );
    return () => clearInterval(id);
  }, [searchTerm]);

  const categories = useMemo(() => {
    const present = Array.from(new Set(ngos.map((n) => n.category)));
    const ordered = [
      ...NGO_CATEGORY_ORDER.filter((c) => present.includes(c)),
      ...present.filter((c) => !NGO_CATEGORY_ORDER.includes(c)),
    ];
    return ["Todas", ...ordered];
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
    const rows: {
      key: string;
      title: string;
      items: NGO[];
      category: string | null;
      storyPreview?: boolean;
    }[] = [];
    const verified = ngos.filter((n) => n.verified);
    if (ngos.length >= 5 && verified.length >= 3) {
      rows.push({
        key: "featured",
        title: "Causas para conhecer",
        items: verified,
        category: null,
      });
    }
    const withRecentStories = ngos
      .filter((ngo) => ngo.posts?.length)
      .sort(
        (a, b) =>
          Math.max(...b.posts.map((post) => post.timestamp)) -
          Math.max(...a.posts.map((post) => post.timestamp)),
      );
    if (withRecentStories.length > 0) {
      rows.push({
        key: "new-stories",
        title: "Novas histórias por aqui",
        items: withRecentStories,
        category: null,
        storyPreview: true,
      });
    }
    const leftovers: NGO[] = [];
    for (const cat of categories.filter((c) => c !== "Todas")) {
      const items = ngos.filter((n) => n.category === cat);
      if (items.length >= 2)
        rows.push({
          key: cat,
          title: getNgoCategorySectionTitle(cat),
          items,
          category: cat,
        });
      else leftovers.push(...items);
    }
    return { rows, leftovers };
  }, [ngos, categories]);

  const isSearching = searchTerm.trim().length > 0;
  const isCampaignFilter = selectedCategory === "Vaquinhas";
  const isCategoryFilter = selectedCategory !== "Todas" && !isCampaignFilter;
  const mode: "search" | "campaigns" | "category" | "sections" = isSearching
    ? "search"
    : isCampaignFilter
      ? "campaigns"
      : isCategoryFilter
        ? "category"
        : "sections";

  const categoryNgos = ngos.filter(
    (n) => selectedCategory === "Todas" || n.category === selectedCategory,
  );

  const openCampaign = (c: FlashCampaign) => {
    const ngo = ngos.find((n) => n.id === c.ngoId);
    if (ngo) onSelectNGO(ngo);
  };

  const cardProps = (ngo: NGO) => ({
    ngo,
    saved: favorites.has(ngo.id),
    onToggleSave: toggleFavorite,
    onOpen: onSelectNGO,
  });

  const EmptyState = () => (
    <div className="py-16 flex flex-col items-center">
      <div className="bg-background border border-border rounded-3xl p-10 max-w-2xl text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-yellow/20">
          <HeartHandshake className="h-8 w-8 text-brand-ink/60" />
        </div>
        <p className="font-display text-xl font-semibold text-brand-ink mb-1">
          Não encontramos nenhuma causa por aqui.
        </p>
        <p className="text-muted-foreground text-sm">
          Tente outro termo ou explore uma categoria.
        </p>
      </div>
    </div>
  );

  return (
    <div
      id={embedded ? "causas" : undefined}
      className={`w-full scroll-mt-24 ${embedded ? "pt-6" : "min-h-screen pt-10"}`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className={`${embedded ? "mb-6" : "mb-8"} space-y-5`}>
          <div className="px-1 space-y-2">
            <h2
              className={`font-display font-semibold text-brand-ink ${embedded ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}
            >
              Descubra causas que{" "}
              <em className="text-brand-blue">combinam com você</em>
            </h2>
            {!embedded && (
              <p className="text-muted-foreground max-w-xl">
                Explore organizações, salve suas causas favoritas e acompanhe
                novas histórias.
              </p>
            )}
          </div>

          {/* Search — rotating placeholder while empty */}
          <div
            className="marketplace-search-shell relative mx-auto h-14 w-[86%] max-w-xl rounded-full border border-transparent bg-[linear-gradient(143deg,rgba(217,240,244,0.76)_15%,rgba(243,253,255,0.9)_88%)] shadow-[0_12px_24px_-1px_rgba(11,57,84,0.16)] transition-[width,max-width,box-shadow,border-color] focus-within:w-full focus-within:max-w-2xl focus-within:border-brand-blue/35 focus-within:shadow-[0_16px_34px_-4px_rgba(11,96,148,0.22)] focus-within:ring-4 focus-within:ring-brand-blue/10 md:w-[72%] lg:mx-0"
            style={{
              transitionDuration: "280ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
              <Search className="h-5 w-5 text-brand-blue" />
            </div>
            {!searchTerm && (
              <div className="absolute inset-y-0 left-[3.25rem] right-5 flex items-center overflow-hidden pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ opacity: 0, y: "0.6em" }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: "-0.6em" }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="block text-sm text-muted-foreground/70 truncate"
                  >
                    {SEARCH_PLACEHOLDERS[placeholderIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
            <SmoothInput
              type="text"
              aria-label="Buscar causas ou organizações"
              wrapperClassName="h-full w-full"
              className="relative z-[1] block h-full w-full bg-transparent py-4 pr-5 text-sm text-brand-ink outline-none"
              style={{ paddingLeft: "3.25rem" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category quick-filters — neumorphic: selected sinks in (inset) and
            stays pressed; the others stay projected out (raised drop shadow). */}
          <div className="flex items-center gap-3 overflow-x-auto px-1 py-3 -mx-1 no-scrollbar">
            {categories.map((cat) => {
              const theme = getNgoCategoryTheme(cat);
              const selected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setSelectedCategory((current) =>
                      current === cat && cat !== "Todas" ? "Todas" : cat,
                    )
                  }
                  aria-pressed={selected}
                  className={`tc-motion-control shrink-0 rounded-full px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-[color,background-color,box-shadow,transform] ${theme.chipText} ${
                    selected
                      ? `${theme.chipBg} shadow-[inset_3px_3px_7px_rgba(16,42,67,0.20),inset_-3px_-3px_7px_rgba(255,255,255,0.75)]`
                      : "bg-background shadow-[4px_4px_10px_rgba(16,42,67,0.12),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_3px_3px_6px_rgba(16,42,67,0.16)]"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                setSelectedCategory((current) =>
                  current === "Vaquinhas" ? "Todas" : "Vaquinhas",
                )
              }
              aria-label="Vaquinhas"
              title="Vaquinhas"
              aria-pressed={isCampaignFilter}
              className={`tc-motion-control relative grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-brand-ink/10 transition-[background-color,border-color,box-shadow,transform] ${
                isCampaignFilter
                  ? "bg-white shadow-[inset_3px_3px_7px_rgba(16,42,67,0.18),inset_-3px_-3px_7px_rgba(255,255,255,0.9)]"
                  : "bg-white shadow-[4px_4px_10px_rgba(16,42,67,0.12),-4px_-4px_10px_rgba(255,255,255,0.95)] hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              <span
                aria-hidden="true"
                className="absolute -left-2 top-1 h-5 w-8 rotate-[-20deg] rounded-full bg-black"
              />
              <span
                aria-hidden="true"
                className="absolute -right-2 bottom-0 h-6 w-8 rotate-[15deg] rounded-full bg-black"
              />
              <img
                data-cow-head
                src={cowHead}
                alt=""
                className="relative z-10 h-9 w-10 object-contain"
              />
            </button>
          </div>
        </div>
      </div>

      {mode === "search" && (
        <div className="mx-auto max-w-7xl px-4 pb-12">
          {searchedNgos.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {searchedNgos.map((ngo) => (
                <CauseShowcaseCard
                  key={ngo.id}
                  {...cardProps(ngo)}
                  className="w-full"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "category" && (
        <div className="mx-auto max-w-7xl px-4 pb-12">
          {categoryNgos.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.div
              layout
              className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <AnimatePresence mode="popLayout">
                {categoryNgos.map((ngo) => (
                  <motion.div
                    key={ngo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <CauseShowcaseCard {...cardProps(ngo)} className="w-full" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      )}

      {mode === "campaigns" && (
        <div className="px-3 pb-28 pt-14 md:px-5 md:pb-12 md:pt-16">
          <CowCampaignSection
            campaigns={flashCampaigns}
            onOpen={openCampaign}
          />
        </div>
      )}

      {mode === "sections" && (
        <div className="space-y-6 px-3 pb-28 pt-14 md:px-5 md:pb-12 md:pt-16">
          {flashCampaigns.length > 0 && (
            <CowCampaignSection
              campaigns={flashCampaigns}
              onOpen={openCampaign}
            />
          )}

          {rows.map((row) => {
            const categoryDefinition = row.category
              ? getNgoCategory(row.category)
              : null;
            return (
              <section
                key={row.key}
                className={`mx-auto max-w-[1400px] overflow-hidden rounded-[28px] py-9 md:rounded-[34px] ${getSectionBackground(row.key, row.category)}`}
              >
                <div className="mx-auto max-w-7xl px-4">
                  <div className="mb-5 flex items-start gap-3">
                    {categoryDefinition && (
                      <img
                        src={categoryDefinition.sealSrc}
                        alt=""
                        className="h-9 w-9 shrink-0 object-contain"
                      />
                    )}
                    {row.category ? (
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCategory((current) =>
                              current === row.category
                                ? "Todas"
                                : row.category!,
                            )
                          }
                          className="group/head flex min-w-0 items-center gap-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-blue"
                        >
                          <h3 className="text-balance font-display text-xl font-semibold text-brand-ink md:text-2xl">
                            {row.title}
                          </h3>
                          <ChevronRight
                            size={22}
                            className="shrink-0 text-brand-ink transition-transform group-hover/head:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-balance font-display text-xl font-semibold text-brand-ink md:text-2xl">
                        {row.title}
                      </h3>
                    )}
                  </div>
                  <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 no-scrollbar md:gap-5">
                    {row.items.map((ngo) => (
                      <CauseShowcaseCard
                        key={ngo.id}
                        {...cardProps(ngo)}
                        storyPreview={row.storyPreview}
                        className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[300px]"
                      />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}

          {leftovers.length > 0 && (
            <section className="mx-auto max-w-[1400px] overflow-hidden rounded-[28px] bg-[#E3D5F0] py-9 md:rounded-[34px]">
              <div className="mx-auto max-w-7xl px-4">
                <h3 className="mb-5 font-display text-xl font-semibold text-brand-ink md:text-2xl">
                  Mais causas para conhecer
                </h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {leftovers.map((ngo) => (
                    <CauseShowcaseCard
                      key={ngo.id}
                      {...cardProps(ngo)}
                      className="w-full"
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {rows.length === 0 &&
            leftovers.length === 0 &&
            flashCampaigns.length === 0 && (
              <div className="mx-auto max-w-7xl px-4">
                <EmptyState />
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
