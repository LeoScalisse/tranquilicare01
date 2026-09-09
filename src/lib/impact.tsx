import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { loadProductionMetricBaseline } from './productionMetrics';

/**
 * Shared donation-impact primitives used by both the home dashboard
 * (ImpactDashboard) and the donor profile (DonorProfile).
 *
 * Single source of truth: every screen that shows "total doado", streaks,
 * or progress meters must derive from the SAME rows and helpers here, so the
 * numbers never contradict each other across the app.
 */

export interface DonationRow {
  id: string;
  amount: number;
  donor_id: string | null;
  donor_email: string | null;
  created_at: string;
  ngo_id?: string | null;
  payment_action_id?: string | null;
  is_test?: boolean;
}

export interface DonationImpact {
  rows: DonationRow[];
  communityTotal: number;
  communityDonationCount: number;
  personalTotal: number;
  personalDonationCount: number;
  receivedTotal: number;
  receivedDonationCount: number;
  verifiedOrganizationCount: number;
  dashboardStatsLoaded: boolean;
  isLive: boolean;
}

// Milestone ladders (in reais) — the meters chase the next round number.
export const COMMUNITY_STEPS = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000];
export const PERSONAL_STEPS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];

export const formatBRL = (centavos: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);

/** Next "nice" milestone strictly above the current total, in centavos. */
export const nextMilestone = (totalCentavos: number, steps: number[]): number => {
  const reais = totalCentavos / 100;
  const found = steps.find((s) => s > reais);
  if (found) return found * 100;
  const last = steps[steps.length - 1];
  return (Math.floor(reais / last) + 1) * last * 100;
};

/** Local-calendar day key (NOT UTC) so streaks match the user's wall clock. */
const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const midnight = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * Consecutive local-calendar days with >= 1 donation, anchored to today OR
 * yesterday (so a not-yet-donated-today doesn't reset a live streak).
 */
export const computeStreak = (isoDates: string[]): number => {
  const days = new Set(isoDates.map((iso) => dayKey(new Date(iso))));
  if (days.size === 0) return 0;

  const today = midnight(new Date());
  const cursor = new Date(today);

  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0; // last donation is 2+ days old
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export interface WeekDay {
  date: Date;
  donated: boolean;
  isToday: boolean;
}

/** The last 7 days ending today, flagged for donation activity (Peloton-style strip). */
export const weekStrip = (isoDates: string[]): WeekDay[] => {
  const days = new Set(isoDates.map((iso) => dayKey(new Date(iso))));
  const today = midnight(new Date());
  const out: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({ date: d, donated: days.has(dayKey(d)), isToday: i === 0 });
  }
  return out;
};

/**
 * DEV-only seed. Returns dated donation ROWS (not an aggregate) so that total,
 * count, streak, and the week strip all cohere and match the home dashboard.
 * Personal rows sum to R$185,00; community total lands on R$12.847,00.
 */
export const devDonationRows = (userEmail: string | null): DonationRow[] => {
  const now = Date.now();
  const DAY = 86_400_000;
  const mine: DonationRow[] = userEmail
    ? [
        { id: 'dev-mine-1', amount: 5000, donor_id: 'dev-user', donor_email: userEmail, created_at: new Date(now).toISOString() },
        { id: 'dev-mine-2', amount: 3500, donor_id: 'dev-user', donor_email: userEmail, created_at: new Date(now - DAY).toISOString() },
        { id: 'dev-mine-3', amount: 2500, donor_id: 'dev-user', donor_email: userEmail, created_at: new Date(now - 2 * DAY).toISOString() },
        { id: 'dev-mine-4', amount: 7500, donor_id: 'dev-user', donor_email: userEmail, created_at: new Date(now - 5 * DAY).toISOString() },
      ]
    : [];
  const mineSum = mine.reduce((s, d) => s + d.amount, 0);
  const community: DonationRow[] = [
    { id: 'dev-community-1', amount: 500000, donor_id: null, donor_email: 'ana@example.com', created_at: new Date(now - 3 * DAY).toISOString() },
    { id: 'dev-community-2', amount: 420000, donor_id: null, donor_email: 'bruno@example.com', created_at: new Date(now - 6 * DAY).toISOString() },
    { id: 'dev-community-3', amount: 1284700 - 500000 - 420000 - mineSum, donor_id: null, donor_email: 'carla@example.com', created_at: new Date(now - DAY).toISOString() },
  ];
  return [...mine, ...community];
};

/**
 * Donation rows powering the impact numbers. With no backend yet, these come
 * from a local seed so the dashboard and profile still show coherent totals,
 * streaks, and the week strip. When a real backend returns, fetch here instead
 * — every screen consumes this hook, so the figures stay identical everywhere.
 */
type DonationDatabaseRow = {
  id: string;
  donor_id: string | null;
  donor_profile_id: string | null;
  ngo_id: string | null;
  organization_id: string | null;
  amount_cents: number;
  created_at: string;
  provider_action_id: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  is_test: boolean;
};

type ImpactStatsRow = {
  donated_amount_cents: number;
  donation_count: number;
};

type HomeDashboardStatsRow = {
  community_amount_cents: number | string;
  community_donation_count: number | string;
  personal_amount_cents: number | string;
  personal_donation_count: number | string;
  received_amount_cents: number | string;
  received_donation_count: number | string;
  verified_organization_count: number | string;
};

const donationFromDatabase = (
  row: DonationDatabaseRow,
  userEmail: string | null,
): DonationRow => ({
  id: row.id,
  amount: Number(row.amount_cents) || 0,
  donor_id: row.donor_profile_id ?? row.donor_id,
  donor_email: userEmail,
  created_at: row.created_at,
  ngo_id: row.organization_id ?? row.ngo_id,
  payment_action_id: row.provider_action_id,
  is_test: row.is_test,
});

const upsertDonation = (rows: DonationRow[], donation: DonationRow): DonationRow[] => {
  const index = rows.findIndex((row) => row.id === donation.id);
  if (index === -1) return [donation, ...rows];
  const next = [...rows];
  next[index] = donation;
  return next;
};

/**
 * One source for every impact number:
 * - public, anonymous aggregate for the platform-wide counter;
 * - RLS-protected rows for the signed-in donor;
 * - Postgres Changes subscriptions for both.
 */
export const useDonationImpact = (
  userId: string | null,
  userEmail: string | null,
  confirmedDonation?: DonationRow | null,
): DonationImpact => {
  const fallbackRows = useMemo(() => devDonationRows(userEmail), [userEmail]);
  const [rows, setRows] = useState<DonationRow[]>(supabase ? [] : fallbackRows);
  const [communityTotal, setCommunityTotal] = useState(() =>
    supabase ? 0 : fallbackRows.reduce((sum, row) => sum + row.amount, 0),
  );
  const [communityDonationCount, setCommunityDonationCount] = useState(() =>
    supabase ? 0 : fallbackRows.length,
  );
  const [personalTotal, setPersonalTotal] = useState(0);
  const [personalDonationCount, setPersonalDonationCount] = useState(0);
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [receivedDonationCount, setReceivedDonationCount] = useState(0);
  const [verifiedOrganizationCount, setVerifiedOrganizationCount] = useState(0);
  const [dashboardStatsLoaded, setDashboardStatsLoaded] = useState(false);
  const channelKey = useRef(`impact-${crypto.randomUUID()}`);

  useEffect(() => {
    if (supabase) return;
    setRows(fallbackRows);
    setCommunityTotal(fallbackRows.reduce((sum, row) => sum + row.amount, 0));
    setCommunityDonationCount(fallbackRows.length);
  }, [fallbackRows]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    setRows([]);

    const statsChannel = supabase
      .channel(`${channelKey.current}-platform`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_impact_stats' },
        (payload) => {
          const next = payload.new as ImpactStatsRow;
          setCommunityTotal(Number(next.donated_amount_cents) || 0);
          setCommunityDonationCount(Number(next.donation_count) || 0);
        },
      )
      .subscribe();

    let donationChannel: RealtimeChannel | null = null;

    void supabase
      .from('platform_impact_stats')
      .select('donated_amount_cents, donation_count')
      .eq('singleton', true)
      .maybeSingle<ImpactStatsRow>()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Could not load platform impact totals:', error);
          return;
        }
        setCommunityTotal(Number(data?.donated_amount_cents) || 0);
        setCommunityDonationCount(Number(data?.donation_count) || 0);
      });

    void supabase
      .rpc('get_home_dashboard_stats')
      .then(({ data, error }) => {
        if (!active || error) return;
        const stats = (data?.[0] as HomeDashboardStatsRow | undefined);
        if (!stats) return;
        setCommunityTotal(Number(stats.community_amount_cents) || 0);
        setCommunityDonationCount(Number(stats.community_donation_count) || 0);
        setPersonalTotal(Number(stats.personal_amount_cents) || 0);
        setPersonalDonationCount(Number(stats.personal_donation_count) || 0);
        setReceivedTotal(Number(stats.received_amount_cents) || 0);
        setReceivedDonationCount(Number(stats.received_donation_count) || 0);
        setVerifiedOrganizationCount(Number(stats.verified_organization_count) || 0);
        setDashboardStatsLoaded(true);
      });
    if (userId) {
      void loadProductionMetricBaseline()
        .then((productionStartedAt) => {
          if (!active) return;
          donationChannel = supabase
            .channel(`${channelKey.current}-personal`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'donations' },
              (payload) => {
                const next = payload.new as DonationDatabaseRow | undefined;
                const previous = payload.old as Partial<DonationDatabaseRow> | undefined;

                if (payload.eventType === 'DELETE') {
                  if (previous?.id) setRows((current) => current.filter((row) => row.id !== previous.id));
                  return;
                }
                if (!next?.id) return;
                if (next.status !== 'succeeded' || next.is_test || next.created_at < productionStartedAt) {
                  setRows((current) => current.filter((row) => row.id !== next.id));
                  return;
                }
                setRows((current) => upsertDonation(current, donationFromDatabase(next, userEmail)));
              },
            )
            .subscribe();

          return supabase
            .from('donations')
            .select('id, donor_id, donor_profile_id, ngo_id, organization_id, amount_cents, created_at, provider_action_id, status, is_test')
            .eq('status', 'succeeded')
            .eq('is_test', false)
            .gte('created_at', productionStartedAt)
            .order('created_at', { ascending: false });
        })
        .then((result) => {
          if (!active || !result) return;
          if (result.error) {
            console.error('Could not load personal donation history:', result.error);
            return;
          }
          setRows(
            ((result.data ?? []) as DonationDatabaseRow[]).map((row) => donationFromDatabase(row, userEmail)),
          );
        })
        .catch((error) => {
          if (active) console.error('Could not load production donation history:', error);
        });
    }

    return () => {
      active = false;
      void supabase.removeChannel(statsChannel);
      if (donationChannel) void supabase.removeChannel(donationChannel);
    };
  }, [userId, userEmail]);

  useEffect(() => {
    if (!confirmedDonation || confirmedDonation.donor_id !== userId) return;
    setRows((current) => upsertDonation(current, confirmedDonation));
  }, [confirmedDonation, userId]);

  return {
    rows,
    communityTotal,
    communityDonationCount,
    personalTotal,
    personalDonationCount,
    receivedTotal,
    receivedDonationCount,
    verifiedOrganizationCount,
    dashboardStatsLoaded,
    isLive: Boolean(supabase),
  };
};

/** Animated count-up; finishes instantly when the user prefers reduced motion. */
export const useCountUp = (target: number, duration = 1400): number => {
  const [value, setValue] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || target === 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = value;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
};

interface ProgressRingProps {
  percent: number;
  trackClass: string;
  barClass: string;
  label: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}

/** Reusable circular progress meter (Badoo-style ring). */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  trackClass,
  barClass,
  label,
  size = 88,
  stroke = 8,
  children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(percent, 100));
  return (
    <div className="relative shrink-0" style={{ height: size, width: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} stroke="currentColor" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={barClass}
          stroke="currentColor"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * clamped) / 100 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {children ?? <span className="text-sm font-bold">{Math.round(clamped)}%</span>}
      </span>
    </div>
  );
};
