import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BrandedText } from '../utils';
import { 
  User, Edit2, Save, X, Image as ImageIcon, Upload, LogOut, 
  Instagram, Mail, Phone, Target, FileText, Plus, Trash2, Loader2, Video
} from 'lucide-react';
import { toast } from 'sonner';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Progress } from '@/components/ui/progress';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface NGOData {
  id: string;
  name: string;
  description: string;
  category: string;
  goal: string;
  image: string;
  email: string;
  instagram: string;
  phone: string | null;
}

interface NGOPost {
  id: string;
  url: string;
  type: string;
  caption: string | null;
  created_at: string;
}

const NGODashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [ngo, setNgo] = useState<NGOData | null>(null);
  const [posts, setPosts] = useState<NGOPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<NGOData | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPost, setNewPost] = useState({ file: null as File | null, type: 'image', caption: '' });
  const [postLoading, setPostLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/ngo/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/ngo/auth');
      } else {
        fetchNGOData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchNGOData = async (userId: string) => {
    const { data: ngoData, error } = await supabase
      .from('ngos')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'approved')
      .maybeSingle();

    if (error) {
      console.error('Error fetching NGO:', error);
    }

    if (ngoData) {
      setNgo(ngoData as NGOData);
      setEditData(ngoData as NGOData);
      fetchPosts(ngoData.id);
    } else {
      // Not approved or no NGO
      navigate('/ngo/pending');
    }

    setLoading(false);
  };

  const fetchPosts = async (ngoId: string) => {
    const { data, error } = await supabase
      .from('ngo_posts')
      .select('*')
      .eq('ngo_id', ngoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
  };

  const handleSave = async () => {
    if (!editData || !ngo) return;
    setSaving(true);

    const { error } = await supabase
      .from('ngos')
      .update({
        name: editData.name,
        description: editData.description,
        goal: editData.goal,
        image: editData.image,
        instagram: editData.instagram,
        phone: editData.phone,
      })
      .eq('id', ngo.id);

    if (error) {
      console.error('Error updating NGO:', error);
      toast.error('Erro ao salvar alterações');
    } else {
      setNgo(editData);
      setEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    }

    setSaving(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editData) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Max file sizes: 1.5GB for videos, 50MB for images
  const MAX_VIDEO_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5 GB
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB

  const handlePostFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast.error('Apenas imagens e vídeos são permitidos');
        return;
      }

      // Validate file size based on type
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        toast.error('Vídeos devem ter no máximo 1,5 GB');
        return;
      }
      
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        toast.error('Imagens devem ter no máximo 50 MB');
        return;
      }

      setNewPost({ 
        ...newPost, 
        file, 
        type: isImage ? 'image' : 'video' 
      });

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadFileWithProgress = (file: File, filePath: string): Promise<{ error: Error | null }> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ error: null });
        } else {
          resolve({ error: new Error(`Upload failed with status ${xhr.status}`) });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ error: new Error('Upload failed') });
      });

      const url = `${SUPABASE_URL}/storage/v1/object/ngo-posts/${filePath}`;
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_KEY}`);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.send(file);
    });
  };

  const handleAddPost = async () => {
    if (!ngo || !newPost.file) {
      toast.error('Selecione um arquivo para enviar');
      return;
    }
    
    setPostLoading(true);
    setUploadProgress(0);

    try {
      // Generate unique file name
      const fileExt = newPost.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${ngo.id}/${fileName}`;

      // Upload to storage with progress tracking
      const { error: uploadError } = await uploadFileWithProgress(newPost.file, filePath);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao enviar arquivo: ' + uploadError.message);
        setPostLoading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('ngo-posts')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Save post to database
      const { error: dbError } = await supabase.from('ngo_posts').insert({
        ngo_id: ngo.id,
        url: publicUrl,
        type: newPost.type,
        caption: newPost.caption || null,
      });

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Erro ao salvar história');
        // Try to delete uploaded file
        await supabase.storage.from('ngo-posts').remove([filePath]);
      } else {
        toast.success('História adicionada com sucesso!');
        setShowPostModal(false);
        setNewPost({ file: null, type: 'image', caption: '' });
        setPreviewUrl(null);
        setUploadProgress(0);
        fetchPosts(ngo.id);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro inesperado ao adicionar história');
    }

    setPostLoading(false);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta história?')) return;

    const postToDelete = posts.find(p => p.id === postId);
    
    // Try to delete from storage first if it's a storage URL
    if (postToDelete && postToDelete.url.includes('ngo-posts') && ngo) {
      try {
        // Extract file path from URL
        const urlParts = postToDelete.url.split('/ngo-posts/');
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('ngo-posts').remove([filePath]);
        }
      } catch (storageError) {
        console.warn('Could not delete file from storage:', storageError);
      }
    }

    const { error } = await supabase.from('ngo_posts').delete().eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      toast.error('Erro ao excluir história');
    } else {
      toast.success('História excluída!');
      setPosts(posts.filter(p => p.id !== postId));
    }
  };

  const closePostModal = () => {
    setShowPostModal(false);
    setNewPost({ file: null, type: 'image', caption: '' });
    setPreviewUrl(null);
    if (postFileInputRef.current) {
      postFileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (!ngo || !editData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <BrandedText text="Painel da ONG" />
            </h1>
            <p className="text-gray-500 text-sm">Gerencie seu perfil e histórias</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900">Perfil da ONG</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-xl font-medium hover:bg-brand-blue/20 transition-all"
              >
                <Edit2 size={16} />
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditData(ngo);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium"
                >
                  <X size={16} />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar
                </button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-[200px_1fr] gap-8">
            {/* Logo */}
            <div className="text-center">
              <div className="relative w-40 h-40 mx-auto">
                {editing && (
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                )}
                <img
                  src={editing ? editData.image : ngo.image}
                  alt={ngo.name}
                  className="w-full h-full object-cover rounded-3xl shadow-lg"
                />
                {editing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
                  >
                    <Upload size={16} className="text-gray-600" />
                  </button>
                )}
              </div>
              <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                ✓ Verificada
              </div>
            </div>

            {/* Info */}
            <div className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <FileText size={16} className="text-brand-blue" />
                      Nome
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue rounded-xl outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <Target size={16} className="text-brand-blue" />
                      Meta Atual
                    </label>
                    <input
                      type="text"
                      value={editData.goal}
                      onChange={(e) => setEditData({ ...editData, goal: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue rounded-xl outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Descrição</label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue rounded-xl outline-none h-24 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Instagram size={16} className="text-brand-blue" />
                        Instagram
                      </label>
                      <input
                        type="text"
                        value={editData.instagram}
                        onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Phone size={16} className="text-brand-blue" />
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={editData.phone || ''}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue rounded-xl outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-gray-900">{ngo.name}</h3>
                  <p className="text-gray-600">{ngo.description}</p>
                  
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm font-bold text-brand-blue mb-1">Meta Atual</p>
                    <p className="text-gray-700">{ngo.goal}</p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-2">
                      <Instagram size={16} className="text-brand-blue" />
                      {ngo.instagram}
                    </span>
                    <span className="flex items-center gap-2">
                      <Mail size={16} className="text-brand-blue" />
                      {ngo.email}
                    </span>
                    {ngo.phone && (
                      <span className="flex items-center gap-2">
                        <Phone size={16} className="text-brand-blue" />
                        {ngo.phone}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stories Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Histórias</h2>
            <button
              onClick={() => setShowPostModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-yellow text-yellow-900 rounded-xl font-medium hover:bg-yellow-400 transition-all"
            >
              <Plus size={16} />
              Nova História
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhuma história publicada ainda</p>
              <p className="text-gray-400 text-sm">Clique em "Nova História" para começar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map((post) => (
                <div key={post.id} className="relative group">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    {post.type === 'image' ? (
                      <img src={post.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={post.url} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                  {post.caption && (
                    <p className="text-xs text-gray-500 mt-2 truncate">{post.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Nova História</h3>
            
            <div className="space-y-4">
              {/* File Upload Area */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Arquivo</label>
                <input
                  type="file"
                  ref={postFileInputRef}
                  accept="image/*,video/*"
                  onChange={handlePostFileChange}
                  className="hidden"
                />
                
                {!previewUrl ? (
                  <button
                    type="button"
                    onClick={() => postFileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-brand-blue hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-12 h-12 bg-brand-blue/10 rounded-full flex items-center justify-center">
                      <Upload size={24} className="text-brand-blue" />
                    </div>
                    <span className="text-sm text-gray-500">Clique para selecionar</span>
                    <span className="text-xs text-gray-400">Imagem (máx. 50MB) • Vídeo (máx. 1,5GB)</span>
                  </button>
                ) : (
                  <div className="relative flex justify-center bg-gray-100 rounded-xl overflow-hidden">
                    {newPost.type === 'image' ? (
                      /* Aspect ratio 4:5 for images */
                      <div className="relative w-full" style={{ aspectRatio: '4/5', maxHeight: '400px' }}>
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      /* Aspect ratio 9:16 for videos */
                      <div className="relative" style={{ aspectRatio: '9/16', maxHeight: '400px' }}>
                        <video 
                          src={previewUrl} 
                          className="w-full h-full object-cover"
                          controls
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setNewPost({ ...newPost, file: null });
                        if (postFileInputRef.current) {
                          postFileInputRef.current.value = '';
                        }
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-lg flex items-center gap-1">
                      {newPost.type === 'image' ? <ImageIcon size={12} /> : <Video size={12} />}
                      {newPost.type === 'image' ? 'Imagem' : 'Vídeo'}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Legenda (opcional)</label>
                <textarea
                  value={newPost.caption}
                  onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                  placeholder="Conte sobre essa história..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-blue rounded-xl outline-none h-24 resize-none"
                />
              </div>
            </div>

            {/* Upload Progress Bar */}
            {postLoading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Enviando arquivo...</span>
                  <span className="text-brand-blue font-bold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-3" />
                {uploadProgress === 100 && (
                  <p className="text-xs text-green-600 font-medium">Upload completo! Salvando...</p>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={closePostModal}
                disabled={postLoading}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPost}
                disabled={!newPost.file || postLoading}
                className="flex-1 py-3 bg-brand-blue text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {postLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {uploadProgress < 100 ? 'Enviando...' : 'Salvando...'}
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Publicar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NGODashboard;
