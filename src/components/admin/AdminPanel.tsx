import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmoothInput } from '@/components/ui/smooth-input';
import { listAdminUsers, listAdminDonations, type AdminUser, type AdminDonation } from '@/lib/platformAdmin';
import AdminVerificationPanel from './AdminVerificationPanel';

const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents) / 100);
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
const statusLabels: Record<string, string> = { succeeded: 'Confirmada', pending: 'Pendente', processing: 'Processando', failed: 'Não concluída', refunded: 'Reembolsada', canceled: 'Cancelada', cancelled: 'Cancelada', expired: 'Expirada', partially_refunded: 'Reembolso parcial', disputed: 'Em contestação', charged_back: 'Estornada' };

export default function AdminPanel() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ search: '', type: 'all', page: 0 });
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<{total: number; users: AdminUser[]}>({total: 0, users: []});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [donationPage, setDonationPage] = useState(0);
  const [donations, setDonations] = useState<{total: number; donations: AdminDonation[]}>({total: 0, donations: []});
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationError, setDonationError] = useState(false);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    void listAdminUsers(filters.search, filters.type, filters.page).then(next => {
      if (active) setData(next);
    }).catch(() => { if (active) { setError(true); setData({total: 0, users: []}); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, revision]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setDonationLoading(true); setDonationError(false); setDonations({total: 0, donations: []});
    void listAdminDonations(selected.id, donationPage).then(next => { if (active) setDonations(next); })
      .catch(() => { if (active) setDonationError(true); })
      .finally(() => { if (active) setDonationLoading(false); });
    return () => { active = false; };
  }, [selected, donationPage, revision]);

  useEffect(() => { if (selected) detailRef.current?.focus(); }, [selected]);

  return <section aria-labelledby='admin-heading' className='space-y-8'>
    <div className='flex flex-wrap items-start justify-between gap-4'>
      <div><h2 id='admin-heading' className='font-display text-2xl font-semibold'>Admin</h2>
        <p className='mt-2 text-sm text-muted-foreground'>Acompanhe os cadastros e a participação da comunidade, do mais recente ao mais antigo.</p>
        <p className='mt-1 text-xs text-muted-foreground'>Valores de doações confirmadas, sem testes. Mensagens são contabilizadas; o conteúdo das conversas permanece privado.</p></div>
      <Button variant='secondary' onClick={() => setRevision(value => value + 1)} disabled={loading}><RefreshCw size={16} />Atualizar</Button>
    </div>
    <AdminVerificationPanel />
    <div className='border-t border-border pt-8'>
      <h3 className='font-display text-xl font-semibold'>Relatórios da comunidade</h3>
      <p className='mt-1 text-sm text-muted-foreground'>Consulte cadastros e doações sem acessar o conteúdo privado das conversas.</p>
    </div>
    <form className='flex flex-wrap items-end gap-3' onSubmit={event => { event.preventDefault(); setFilters(current => ({...current, search: search.trim(), page: 0})); }}>
      <div className='min-w-0 flex-1 basis-60'><label htmlFor='admin-search' className='mb-2 block text-sm font-semibold'>Nome ou e-mail</label><SmoothInput id='admin-search' value={search} onChange={event => setSearch(event.target.value)} maxLength={120} placeholder='Buscar na comunidade' className='w-full rounded-xl border border-border bg-white px-3 py-2.5' /></div>
      <div><label htmlFor='admin-type' className='mb-2 block text-sm font-semibold'>Tipo de conta</label><select id='admin-type' value={filters.type} onChange={event => setFilters(current => ({...current, type: event.target.value, page: 0}))} className='h-11 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-brand-blue'><option value='all'>Todas</option><option value='donor'>Doadores</option><option value='ngo'>ONGs</option></select></div>
      <Button type='submit' className='min-h-11'><Search size={16} />Buscar</Button>
    </form>
    {loading ? <p role='status' className='py-8 text-sm text-muted-foreground'>Carregando usuários…</p> : error ? <div role='alert' className='rounded-xl border border-border p-5'><p>Não foi possível consultar o painel. Verifique sua conexão e se sua conta continua autorizada.</p><Button variant='secondary' className='mt-3' onClick={() => setRevision(value => value + 1)}>Tentar novamente</Button></div> : <>
      <p role='status' className='text-sm text-muted-foreground'>{data.total} {data.total === 1 ? 'usuário encontrado' : 'usuários encontrados'}</p>
      <div className='overflow-x-auto rounded-2xl border border-border bg-white focus-visible:outline-brand-blue' role='region' aria-label='Tabela de usuários, role horizontalmente para ver todas as métricas' tabIndex={0}>
        <table className='w-full min-w-[1050px] text-left text-sm'><caption className='sr-only'>Cadastros, doações, histórias e conversas de doadores e ONGs</caption>
          <thead className='bg-secondary text-xs'><tr>{['Usuário', 'Cadastro', 'Doações feitas', 'Valor doado', 'Valor recebido', 'Histórias', 'Conversas', 'Mensagens enviadas / recebidas', 'Detalhes'].map(title => <th key={title} scope='col' className='px-4 py-3 font-semibold'>{title}</th>)}</tr></thead>
          <tbody>{data.users.map(person => <tr key={person.id} className='border-t border-border'>
            <th scope='row' className='max-w-64 px-4 py-4 font-normal'><span className='block font-semibold'>{person.name || 'Sem nome'}</span><span className='block break-all text-xs text-muted-foreground'>{person.email}</span><span className='mt-1 block text-xs text-brand-blue'>{person.account_type === 'ngo' ? 'ONG' : 'Doador'}</span></th>
            <td className='px-4 py-4'>{date(person.created_at)}</td><td className='px-4 py-4 tabular-nums'>{person.donation_count}</td><td className='whitespace-nowrap px-4 py-4 tabular-nums'>{money(person.donated_cents)}</td><td className='whitespace-nowrap px-4 py-4 tabular-nums'>{person.account_type === 'ngo' ? money(person.received_cents) : '—'}</td><td className='px-4 py-4'>{person.story_count}</td><td className='px-4 py-4'>{person.conversation_count}</td><td className='px-4 py-4'>{person.sent_message_count} / {person.received_message_count}</td>
            <td className='px-4 py-4'><Button variant='secondary' size='sm' onClick={() => { setDonationPage(0); setSelected(person); }} aria-label={`Ver doações de ${person.name}`}>Ver doações</Button></td>
          </tr>)}</tbody>
        </table>{data.users.length === 0 && <p className='p-6 text-sm text-muted-foreground'>Nenhum usuário corresponde a esses filtros.</p>}
      </div>
      <div className='flex items-center justify-end gap-3'><Button variant='secondary' disabled={filters.page === 0} onClick={() => setFilters(current => ({...current, page: current.page - 1}))}>Anterior</Button><span className='text-sm'>Página {filters.page + 1}</span><Button variant='secondary' disabled={(filters.page + 1) * 25 >= data.total} onClick={() => setFilters(current => ({...current, page: current.page + 1}))}>Próxima</Button></div>
    </>}
    {selected && <section ref={detailRef} tabIndex={-1} aria-labelledby='admin-donations-title' className='rounded-2xl border border-border bg-white p-5 focus-visible:outline-brand-blue'>
      <div className='flex items-center justify-between gap-3'><h3 id='admin-donations-title' className='font-semibold'>Doações de {selected.name}</h3><Button variant='secondary' size='icon' aria-label='Fechar detalhes das doações' onClick={() => setSelected(null)}><X size={18} /></Button></div>
      {donationLoading ? <p role='status' className='py-5'>Carregando doações…</p> : donationError ? <div role='alert'><p className='py-4'>Não foi possível carregar as doações.</p><Button variant='secondary' onClick={() => setRevision(value => value + 1)}>Tentar novamente</Button></div> : <>
        <ul className='mt-4 divide-y divide-border'>{donations.donations.map(donation => <li key={donation.id} className='flex flex-wrap items-center justify-between gap-3 py-3 text-sm'><span>{donation.organization_name || 'Organização'}<span className='block text-xs text-muted-foreground'>{date(donation.created_at)} · {donation.direction === 'sent' ? 'Doação feita' : 'Apoio recebido'}</span></span><span className='text-right font-semibold'>{money(donation.amount_cents)}<span className='block text-xs font-normal text-muted-foreground'>{statusLabels[donation.status] || 'Em análise'}</span></span></li>)}</ul>
        {!donations.total && <p className='py-5 text-sm text-muted-foreground'>Nenhuma doação registrada para esta conta.</p>}
        <div className='mt-4 flex items-center justify-end gap-3'><Button variant='secondary' disabled={!donationPage} onClick={() => setDonationPage(page => page - 1)}>Anteriores</Button><span className='text-sm'>{donationPage + 1} / {Math.max(1, Math.ceil(donations.total / 25))}</span><Button variant='secondary' disabled={(donationPage + 1) * 25 >= donations.total} onClick={() => setDonationPage(page => page + 1)}>Mais doações</Button></div>
      </>}
    </section>}
  </section>;
}
