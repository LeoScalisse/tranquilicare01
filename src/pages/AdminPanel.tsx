import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BrandedText } from '../utils';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  LogOut, 
  Building2, 
  Mail, 
  Phone, 
  Instagram,
  Eye,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface NGOData {
  id: string;
  name: string;
  description: string;
  category: string;
  goal: string;
  image: string | null;
  email: string;
  instagram: string;
  phone: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const [ngos, setNgos] = useState<NGOData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedNGO, setSelectedNGO] = useState<NGOData | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchNGOs();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/admin/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      navigate('/admin/login');
    }
  };

  const fetchNGOs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ngos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar ONGs');
      console.error(error);
    } else {
      setNgos(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (ngo: NGOData) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('ngos')
      .update({ status: 'approved', verified: true })
      .eq('id', ngo.id);

    if (error) {
      toast.error('Erro ao aprovar ONG');
    } else {
      toast.success(`${ngo.name} foi aprovada!`);
      fetchNGOs();
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedNGO || !rejectionReason.trim()) {
      toast.error('Por favor, informe o motivo da rejeição');
      return;
    }

    setActionLoading(true);
    
    // Primeiro, limpa o owner_id para liberar o email para novo cadastro
    const { error } = await supabase
      .from('ngos')
      .update({ 
        status: 'rejected', 
        verified: false,
        rejection_reason: rejectionReason,
        owner_id: null // Libera o email para novo cadastro
      })
      .eq('id', selectedNGO.id);

    if (error) {
      toast.error('Erro ao rejeitar ONG');
    } else {
      toast.success(`${selectedNGO.name} foi rejeitada`);
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedNGO(null);
      fetchNGOs();
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedNGO) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('ngos')
      .delete()
      .eq('id', selectedNGO.id);

    if (error) {
      toast.error('Erro ao remover ONG');
    } else {
      toast.success(`${selectedNGO.name} foi removida`);
      setShowDeleteDialog(false);
      setSelectedNGO(null);
      fetchNGOs();
    }
    setActionLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const filteredNGOs = ngos.filter(ngo => {
    if (filter === 'all') return true;
    return ngo.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1"><Clock size={14} /> Pendente</span>;
      case 'approved':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1"><CheckCircle size={14} /> Aprovada</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1"><XCircle size={14} /> Rejeitada</span>;
      default:
        return null;
    }
  };

  const counts = {
    pending: ngos.filter(n => n.status === 'pending').length,
    approved: ngos.filter(n => n.status === 'approved').length,
    rejected: ngos.filter(n => n.status === 'rejected').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <BrandedText text="Painel Administrativo" />
            </h1>
            <p className="text-sm text-gray-500">Gerenciamento de ONGs</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-700">{counts.pending}</p>
                <p className="text-sm text-yellow-600">Pendentes</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700">{counts.approved}</p>
                <p className="text-sm text-green-600">Aprovadas</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-red-700">{counts.rejected}</p>
                <p className="text-sm text-red-600">Rejeitadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                filter === status
                  ? 'bg-brand-blue text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'pending' && 'Pendentes'}
              {status === 'approved' && 'Aprovadas'}
              {status === 'rejected' && 'Rejeitadas'}
              {status === 'all' && 'Todas'}
            </button>
          ))}
        </div>

        {/* NGO List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Carregando...</p>
          </div>
        ) : filteredNGOs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma ONG encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNGOs.map((ngo) => (
              <div key={ngo.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Image */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {ngo.image ? (
                      <img src={ngo.image} alt={ngo.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 size={32} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{ngo.name}</h3>
                        <p className="text-sm text-brand-blue font-medium">{ngo.category}</p>
                      </div>
                      {getStatusBadge(ngo.status)}
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">{ngo.description}</p>
                    
                    <p className="text-sm text-gray-500 mb-3">
                      <strong>Meta:</strong> {ngo.goal}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail size={14} /> {ngo.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Instagram size={14} /> {ngo.instagram}
                      </span>
                      {ngo.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={14} /> {ngo.phone}
                        </span>
                      )}
                    </div>

                    {ngo.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 rounded-xl flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700">
                          <strong>Motivo da rejeição:</strong> {ngo.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2 flex-shrink-0">
                    {ngo.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(ngo)}
                          disabled={actionLoading}
                          className="flex-1 lg:flex-none px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={18} />
                          Aprovar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedNGO(ngo);
                            setShowRejectDialog(true);
                          }}
                          disabled={actionLoading}
                          className="flex-1 lg:flex-none px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle size={18} />
                          Rejeitar
                        </button>
                      </>
                    )}
                    {ngo.status === 'approved' && (
                      <button
                        onClick={() => {
                          setSelectedNGO(ngo);
                          setShowDeleteDialog(true);
                        }}
                        disabled={actionLoading}
                        className="flex-1 lg:flex-none px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={18} />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar ONG</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para {selectedNGO?.name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Ex: Documentação incompleta, informações inconsistentes..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover ONG</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{selectedNGO?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={actionLoading}
            >
              <Trash2 size={16} className="mr-2" />
              Confirmar Remoção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
