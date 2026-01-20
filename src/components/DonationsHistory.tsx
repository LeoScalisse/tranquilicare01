import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Loader2,
  Heart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Donation {
  id: string;
  amount: number;
  platform_tip: number;
  donor_name: string | null;
  donor_email: string | null;
  created_at: string;
}

interface DonationsHistoryProps {
  ngoId: string;
}

interface ChartDataPoint {
  date: string;
  total: number;
  count: number;
}

const formatCurrency = (valueInCentavos: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInCentavos / 100);
};

const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
};

const formatShortDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateString));
};

const DonationsHistory: React.FC<DonationsHistoryProps> = ({ ngoId }) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    fetchDonations();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('donations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'donations',
          filter: `ngo_id=eq.${ngoId}`,
        },
        (payload) => {
          setDonations((prev) => [payload.new as Donation, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ngoId]);

  const fetchDonations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('ngo_id', ngoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching donations:', error);
    } else {
      setDonations(data || []);
    }
    setLoading(false);
  };

  // Filter donations based on period
  const filteredDonations = donations.filter((d) => {
    if (period === 'all') return true;
    const date = new Date(d.created_at);
    const now = new Date();
    const daysAgo = period === '7d' ? 7 : 30;
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return date >= cutoff;
  });

  // Calculate stats
  const totalAmount = filteredDonations.reduce((sum, d) => sum + d.amount, 0);
  const totalDonations = filteredDonations.length;
  const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;
  const uniqueDonors = new Set(
    filteredDonations.filter((d) => d.donor_email).map((d) => d.donor_email)
  ).size;

  // Prepare chart data - group by day
  const chartData: ChartDataPoint[] = [];
  const groupedByDay = filteredDonations.reduce((acc, d) => {
    const date = new Date(d.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { total: 0, count: 0 };
    }
    acc[date].total += d.amount;
    acc[date].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  // Fill in missing days for a smoother chart
  const days = period === '7d' ? 7 : period === '30d' ? 30 : Math.min(90, Math.ceil((Date.now() - new Date(donations[donations.length - 1]?.created_at || Date.now()).getTime()) / (24 * 60 * 60 * 1000)));
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    chartData.push({
      date,
      total: groupedByDay[date]?.total || 0,
      count: groupedByDay[date]?.count || 0,
    });
  }

  const displayedDonations = showAll ? filteredDonations : filteredDonations.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex gap-2">
        {(['7d', '30d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p
                ? 'bg-brand-blue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Tudo'}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <DollarSign size={18} />
            <span className="text-xs font-medium">Total Recebido</span>
          </div>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalAmount)}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Heart size={18} />
            <span className="text-xs font-medium">Doações</span>
          </div>
          <p className="text-xl font-bold text-blue-700">{totalDonations}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <TrendingUp size={18} />
            <span className="text-xs font-medium">Média</span>
          </div>
          <p className="text-xl font-bold text-purple-700">{formatCurrency(averageDonation)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Users size={18} />
            <span className="text-xs font-medium">Doadores</span>
          </div>
          <p className="text-xl font-bold text-orange-700">{uniqueDonors}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && totalDonations > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar size={16} />
            Evolução das Doações
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={(v) => formatCurrency(v).replace('R$', '')}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Donations List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700">Últimas Doações</h3>
        
        {filteredDonations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Heart size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nenhuma doação recebida ainda</p>
            <p className="text-sm">As doações aparecerão aqui em tempo real</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displayedDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Heart size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {donation.donor_name || 'Doador anônimo'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(donation.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(donation.amount)}
                    </p>
                    {donation.platform_tip > 0 && (
                      <p className="text-xs text-gray-400">
                        + {formatCurrency(donation.platform_tip)} gorjeta
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredDonations.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-3 flex items-center justify-center gap-2 text-brand-blue hover:bg-blue-50 rounded-xl transition-colors font-medium"
              >
                {showAll ? (
                  <>
                    <ChevronUp size={18} />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown size={18} />
                    Ver todas ({filteredDonations.length} doações)
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DonationsHistory;
