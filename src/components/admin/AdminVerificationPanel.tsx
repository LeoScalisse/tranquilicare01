import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { SmoothTextarea } from '@/components/ui/smooth-textarea';
import {
  listAdminOrganizationVerifications,
  reviewAdminOrganizationVerification,
  type AdminOrganizationVerification,
  type OrganizationVerificationStatus,
} from '@/lib/platformAdmin';

type Filter = 'queue' | OrganizationVerificationStatus | 'all';
type Decision = 'approved' | 'rejected';

const filters: Array<{ value: Filter; label: string }> = [
  { value: 'queue', label: 'Em análise' },
  { value: 'approved', label: 'Aprovadas' },
  { value: 'rejected', label: 'Correções solicitadas' },
  { value: 'all', label: 'Todas' },
];

const formatCnpj = (value: string | null) => {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length === 14
    ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : value || 'Não informado';
};

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Ainda não enviada';

const statusCopy: Record<OrganizationVerificationStatus, string> = {
  pending: 'Pendente',
  in_review: 'Em análise',
  approved: 'Aprovada',
  rejected: 'Correções solicitadas',
};

export default function AdminVerificationPanel() {
  const [filter, setFilter] = useState<Filter>('queue');
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<AdminOrganizationVerification[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<{ item: AdminOrganizationVerification; decision: Decision } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void listAdminOrganizationVerifications(filter, page)
      .then((result) => {
        if (!active) return;
        setItems(result.verifications);
        setTotal(result.total);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setTotal(0);
        setError(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, page, revision]);

  const confirmDecision = async () => {
    if (!confirming) return;
    const { item, decision } = confirming;
    const reviewNotes = notes[item.organization_id]?.trim() ?? '';
    if (decision === 'rejected' && !reviewNotes) {
      toast.error('Explique quais correções a organização precisa fazer.');
      return;
    }
    setSavingId(item.organization_id);
    try {
      await reviewAdminOrganizationVerification(item.organization_id, decision, reviewNotes);
      toast.success(decision === 'approved'
        ? `${item.name} foi aprovada e já pode receber apoios quando os pagamentos estiverem ativos.`
        : `As correções foram solicitadas para ${item.name}.`);
      setConfirming(null);
      setNotes((current) => ({ ...current, [item.organization_id]: '' }));
      setRevision((current) => current + 1);
    } catch {
      toast.error('Não foi possível salvar a decisão. Verifique sua conexão e tente novamente.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section aria-labelledby='verification-heading' className='space-y-5 rounded-[28px] border border-brand-blue/15 bg-white p-5 shadow-sm sm:p-7'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-blue'><ShieldCheck size={16} />Verificação institucional</p>
          <h2 id='verification-heading' className='mt-2 font-display text-2xl font-semibold'>Organizações aguardando análise</h2>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>Confira os dados institucionais e a conta de recebimento antes de liberar doações reais.</p>
        </div>
        <Button variant='secondary' onClick={() => setRevision((value) => value + 1)} disabled={loading || Boolean(savingId)}><RefreshCw size={16} />Atualizar</Button>
      </div>

      <div className='flex flex-wrap gap-2' aria-label='Filtrar verificações'>
        {filters.map((option) => (
          <Button
            key={option.value}
            type='button'
            size='sm'
            variant={filter === option.value ? 'default' : 'secondary'}
            aria-pressed={filter === option.value}
            onClick={() => { setFilter(option.value); setPage(0); }}
          >{option.label}</Button>
        ))}
      </div>

      {loading ? (
        <p role='status' className='py-10 text-sm text-muted-foreground'>Carregando verificações…</p>
      ) : error ? (
        <div role='alert' className='rounded-2xl border border-destructive/25 bg-destructive/5 p-5'>
          <p className='font-semibold'>Não foi possível consultar as verificações.</p>
          <p className='mt-1 text-sm text-muted-foreground'>Sua decisão não foi alterada. Confira a conexão e tente novamente.</p>
          <Button variant='secondary' className='mt-4' onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>
        </div>
      ) : items.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-brand-blue/30 bg-brand-blue/5 px-5 py-10 text-center'>
          <CheckCircle2 className='mx-auto text-brand-blue' size={30} />
          <p className='mt-3 font-semibold'>Nenhuma organização neste filtro.</p>
          <p className='mt-1 text-sm text-muted-foreground'>Quando houver uma nova solicitação, ela aparecerá aqui.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {items.map((item) => {
            const canReview = item.verification_status === 'pending' || item.verification_status === 'in_review';
            const address = [item.address, item.city, item.state].filter(Boolean).join(', ') || 'Não informado';
            return (
              <article key={item.organization_id} className='rounded-2xl border border-border bg-background p-5'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='flex min-w-0 gap-3'>
                    <span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue'><Building2 size={21} /></span>
                    <div className='min-w-0'>
                      <h3 className='truncate font-display text-xl font-semibold'>{item.name || 'Organização sem nome'}</h3>
                      <p className='mt-1 text-xs text-muted-foreground'>Enviada em {formatDate(item.submitted_at)}</p>
                    </div>
                  </div>
                  <span className='inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1.5 text-xs font-bold text-brand-blue'><Clock3 size={14} />{statusCopy[item.verification_status]}</span>
                </div>

                <dl className='mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3'>
                  <div><dt className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>CNPJ</dt><dd className='mt-1 font-semibold'>{formatCnpj(item.cnpj)}</dd></div>
                  <div><dt className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>E-mail público</dt><dd className='mt-1 break-all font-semibold'>{item.public_email || 'Não informado'}</dd></div>
                  <div><dt className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>Endereço</dt><dd className='mt-1 font-semibold'>{address}</dd></div>
                  <div><dt className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>Documentos</dt><dd className='mt-1 font-semibold'>{item.accepted_document_count} aceitos de {item.document_count}</dd></div>
                  <div><dt className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>Mercado Pago</dt><dd className={`mt-1 font-semibold ${item.mercado_pago_connected ? 'text-emerald-700' : 'text-amber-700'}`}>{item.mercado_pago_connected ? 'Conectado em produção' : 'Ainda não conectado'}</dd></div>
                  <div><dt className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>Recebimentos</dt><dd className='mt-1 font-semibold'>{item.payment_status === 'enabled' ? 'Ativos' : 'Aguardando aprovação'}</dd></div>
                </dl>

                {canReview ? (
                  <div className='mt-5 border-t border-border pt-5'>
                    <label htmlFor={`review-notes-${item.organization_id}`} className='text-sm font-bold'>Observações da análise</label>
                    <SmoothTextarea
                      id={`review-notes-${item.organization_id}`}
                      value={notes[item.organization_id] ?? ''}
                      maxLength={2000}
                      rows={3}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.organization_id]: event.target.value }))}
                      placeholder='Obrigatório ao solicitar correções; opcional ao aprovar.'
                      className='mt-2 w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20'
                    />
                    <div className='mt-4 flex flex-wrap justify-end gap-3'>
                      <Button variant='secondary' disabled={savingId === item.organization_id} onClick={() => setConfirming({ item, decision: 'rejected' })}><XCircle size={17} />Solicitar correções</Button>
                      <Button disabled={savingId === item.organization_id} onClick={() => setConfirming({ item, decision: 'approved' })}><CheckCircle2 size={17} />Aprovar organização</Button>
                    </div>
                  </div>
                ) : item.internal_notes ? (
                  <div className='mt-5 rounded-xl bg-secondary p-4 text-sm'><strong>Observações:</strong> {item.internal_notes}</div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div className='flex items-center justify-end gap-3'>
          <Button variant='secondary' disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
          <span className='text-sm'>Página {page + 1} de {Math.max(1, Math.ceil(total / 20))}</span>
          <Button variant='secondary' disabled={(page + 1) * 20 >= total} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
        </div>
      )}

      <AlertDialog open={Boolean(confirming)} onOpenChange={(open) => { if (!open && !savingId) setConfirming(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming?.decision === 'approved' ? 'Aprovar esta organização?' : 'Solicitar correções?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming?.decision === 'approved'
                ? 'A organização ficará pública e, se o Mercado Pago estiver conectado em produção, poderá receber doações reais.'
                : 'A organização continuará sem receber doações até corrigir os dados e passar por uma nova análise.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(savingId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={Boolean(savingId)} onClick={(event) => { event.preventDefault(); void confirmDecision(); }}>
              {savingId ? 'Salvando…' : confirming?.decision === 'approved' ? 'Confirmar aprovação' : 'Enviar solicitação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
