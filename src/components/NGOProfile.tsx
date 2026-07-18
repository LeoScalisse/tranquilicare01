import React, { useState, useRef, useEffect } from 'react';
import { NGO, NGOPost } from '../types';
import { BrandedText } from '../utils';
import { 
  Grid, 
  Heart, 
  MessageCircle, 
  Target,
  X,
  Instagram,
  Mail,
  Phone,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Camera,
  Video as VideoIcon,
  Upload,
  Play,
  Send,
  Loader2,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DonationModal from './DonationModal';

interface NGOProfileProps {
  ngo: NGO;
  isOwner: boolean;
  onUpdate: (ngo: NGO) => void;
  viewerAccountType?: 'ngo' | 'donor' | null;
  onRequireDonorAuth?: () => void;
}

const NGOProfile: React.FC<NGOProfileProps> = ({
  ngo,
  isOwner,
  onUpdate,
  viewerAccountType,
  onRequireDonorAuth,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [zoomedPost, setZoomedPost] = useState<NGOPost | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [editedData, setEditedData] = useState(ngo);
  const [canReceiveDonations, setCanReceiveDonations] = useState(false);
  const [checkingDonations, setCheckingDonations] = useState(true);
  
  // States for new post upload simulation
  const [newPostFile, setNewPostFile] = useState<{url: string, type: 'image' | 'video', file: File} | null>(null);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'uploading' | 'optimizing' | 'done'>('uploading');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if NGO can receive donations
  useEffect(() => {
    const checkDonationStatus = async () => {
      try {
        const { data } = await supabase.functions.invoke('stripe-check-onboarding', {
          body: { ngoId: ngo.id },
        });
        setCanReceiveDonations(data?.onboardingComplete || false);
      } catch (err) {
        console.error('Error checking donation status:', err);
      } finally {
        setCheckingDonations(false);
      }
    };

    if (ngo.id.startsWith('demo-')) {
      setCanReceiveDonations(false);
      setCheckingDonations(false);
      return;
    }

    if (ngo.verified) {
      checkDonationStatus();
    } else {
      setCheckingDonations(false);
    }
  }, [ngo.id, ngo.verified]);

  const handleSave = () => {
    onUpdate(editedData);
    setIsEditing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      
      setNewPostFile({
        url: url,
        type: isVideo ? 'video' : 'image',
        file: file
      });
    }
  };

  const handlePublishPost = async () => {
    if (!newPostFile || isUploading) return;

    setIsUploading(true);
    setUploadStep('uploading');
    setUploadProgress(0);

    // Stage 1: Upload simulation
    const isVideo = newPostFile.type === 'video';
    const uploadInterval = isVideo ? 100 : 50;
    
    for (let i = 0; i <= 70; i += 5) {
      await new Promise(resolve => setTimeout(resolve, uploadInterval));
      setUploadProgress(i);
    }

    // Stage 2: Optimization simulation
    setUploadStep('optimizing');
    const optimizeInterval = isVideo ? 200 : 100;
    for (let i = 71; i <= 100; i += 2) {
      await new Promise(resolve => setTimeout(resolve, optimizeInterval));
      setUploadProgress(i);
    }

    const newPost: NGOPost = {
      id: Math.random().toString(36).substr(2, 9),
      url: newPostFile.url,
      type: newPostFile.type,
      caption: newPostCaption,
      timestamp: Date.now()
    };

    setUploadStep('done');
    
    setTimeout(() => {
      onUpdate({
        ...ngo,
        posts: [newPost, ...ngo.posts]
      });

      setNewPostFile(null);
      setNewPostCaption('');
      setIsUploading(false);
      setUploadProgress(0);
      setShowPostModal(false);
    }, 800);
  };

  const copyToClipboard = (text: string, isPhone = false) => {
    navigator.clipboard.writeText(text);
    if (isPhone) {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInstagramUrl = (handle: string) => {
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    return `https://www.instagram.com/${cleanHandle}`;
  };

  const getEmailUrl = (email: string) => {
    return `mailto:${email}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-16">
      {/* Zoomed Post Modal */}
      {zoomedPost && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setZoomedPost(null)}
        >
          <button 
            onClick={() => setZoomedPost(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[130]"
          >
            <X size={24} />
          </button>
          
          <div 
            className={`relative w-full bg-black rounded-3xl overflow-hidden shadow-2xl animate-scale-up ${
              zoomedPost.type === 'video' ? 'max-w-md' : 'max-w-lg'
            }`}
            style={{ aspectRatio: zoomedPost.type === 'video' ? '9/16' : '4/5' }}
            onClick={e => e.stopPropagation()}
          >
            {zoomedPost.type === 'video' ? (
              <video 
                src={zoomedPost.url} 
                className="w-full h-full object-contain" 
                controls 
                autoPlay 
                loop 
                playsInline
                preload="auto"
                onLoadedData={(e) => (e.target as HTMLVideoElement).play()}
              />
            ) : (
              <img src={zoomedPost.url} className="w-full h-full object-contain" alt="Zoomed Story" />
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
              <div className="flex items-center gap-3 mb-2">
                 <img src={ngo.image} className="w-10 h-10 rounded-full border-2 border-white" />
                 <span className="font-bold">{ngo.name}</span>
              </div>
              {zoomedPost.caption && (
                <p className="text-sm text-gray-200 leading-relaxed max-w-lg">
                  {zoomedPost.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-brand-ink">Nova história</h3>
              <button 
                disabled={isUploading}
                onClick={() => { setShowPostModal(false); setNewPostFile(null); setNewPostCaption(''); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <input 
                type="file"
                accept="image/*,video/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              
              {!newPostFile ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-brand-blue hover:bg-blue-50/50 transition-all group"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-brand-blue/10 transition-colors">
                    <Upload size={32} className="text-gray-300 group-hover:text-brand-blue transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-700">Escolha uma foto ou vÃ­deo</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, MP4 atÃ© 100MB</p>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-square rounded-3xl overflow-hidden bg-black">
                  {isUploading && (
                    <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
                      <div className="w-16 h-16 relative">
                        <svg className="animate-spin" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#38b6ff" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${uploadProgress * 2.8}, 283`} transform="rotate(-90 50 50)" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">{uploadProgress}%</div>
                      </div>
                      <p className="text-sm font-medium">
                        {uploadStep === 'uploading' && 'Enviando...'}
                        {uploadStep === 'optimizing' && 'Otimizando...'}
                        {uploadStep === 'done' && 'Pronto!'}
                      </p>
                    </div>
                  )}
                  {newPostFile.type === 'video' ? (
                    <video src={newPostFile.url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  ) : (
                    <img src={newPostFile.url} className="w-full h-full object-cover" alt="Preview" />
                  )}
                  {!isUploading && (
                    <button 
                      onClick={() => setNewPostFile(null)}
                      className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                  <MessageCircle size={16} className="text-brand-blue" />
                  Legenda da histÃ³ria
                </label>
                <textarea 
                  disabled={isUploading}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all resize-none text-sm h-24 disabled:opacity-50"
                  placeholder="Conte um pouco sobre este momento..."
                  value={newPostCaption}
                  onChange={e => setNewPostCaption(e.target.value)}
                />
              </div>

              <button 
                onClick={handlePublishPost}
                disabled={isUploading || !newPostFile}
                className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold shadow-lg hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                {isUploading ? 'Publicando...' : 'Publicar histÃ³ria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowGoalModal(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-24 bg-gradient-to-r from-brand-yellow to-yellow-400">
              <button onClick={() => setShowGoalModal(false)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-yellow-900 transition-colors"><X size={18} /></button>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center">
                <Target size={28} className="text-brand-yellow" />
              </div>
            </div>
            <div className="pt-12 pb-8 px-6 text-center">
              <h3 className="font-bold text-xl text-gray-800">Nossa Meta</h3>
              <p className="text-gray-600 mt-4 leading-relaxed">{ngo.goal}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowContactModal(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-32 bg-gradient-to-r from-brand-blue to-blue-400">
              <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"><X size={18} /></button>
              <img src={ngo.image} className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
            </div>
            <div className="pt-14 pb-8 px-6 text-center">
              <h3 className="font-bold text-xl">{ngo.name}</h3>
              <p className="text-gray-500 text-sm mt-1">{ngo.category}</p>
              <div className="mt-6 space-y-3">
                <a href={getInstagramUrl(ngo.instagram)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity">
                  <Instagram size={20} />
                  <span className="font-medium">{ngo.instagram}</span>
                  <ExternalLink size={14} className="ml-auto opacity-70" />
                </a>
                <a href={getEmailUrl(ngo.email)} className="flex items-center gap-3 w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  <Mail size={20} className="text-gray-600" />
                  <span className="font-medium text-gray-700 truncate flex-1 text-left">{ngo.email}</span>
                  <ExternalLink size={14} className="text-gray-400" />
                </a>
                {ngo.phone && (
                  <button onClick={() => copyToClipboard(ngo.phone!, true)} className="flex items-center gap-3 w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                    <Phone size={20} className="text-gray-600" />
                    <span className="font-medium text-gray-700">{ngo.phone}</span>
                    {copiedPhone ? <Check size={16} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 mb-8">
        <div className="relative shrink-0">
          <img src={ngo.image} className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-white shadow-xl" alt={ngo.name} />
          {ngo.verified && (
            <div className="absolute bottom-1 right-1 bg-brand-blue text-white p-1.5 rounded-full border-2 border-white shadow-sm">
              <Check size={14} />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-3">
          <div className="flex items-center justify-center sm:justify-start gap-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {ngo.name.replace(/\s+/g, '').toLowerCase()}
            </h2>
            <div className="flex gap-2">
              {isOwner && (
                <>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold px-4 py-1.5 rounded-lg transition-colors"
                  >
                    {isEditing ? 'Cancelar' : 'Editar perfil'}
                  </button>
                  <button 
                    onClick={() => setShowPostModal(true)}
                    className="bg-brand-yellow hover:opacity-90 text-yellow-900 text-sm font-bold px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={16} />
                    <BrandedText text="+ HistÃ³rias" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-8 justify-center sm:justify-start text-sm">
            <div><span className="font-bold">{ngo.posts?.length || 0}</span> histÃ³rias</div>
            <button 
              onClick={() => setShowGoalModal(true)}
              className="text-brand-blue hover:text-blue-600 font-medium cursor-pointer transition-colors flex items-center gap-1"
            >
              <Target size={14} />
              <span className="truncate max-w-[150px]">Nossa meta</span>
            </button>
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <h1 className="font-bold text-sm">{ngo.name}</h1>
            <div className="text-sm text-gray-500 font-medium mb-1">
              <BrandedText text={ngo.category} />
            </div>
            
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{ngo.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button 
                onClick={() => setShowContactModal(true)}
                className="flex items-center justify-center sm:justify-start gap-2 text-white bg-brand-blue hover:bg-blue-600 font-bold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <MessageCircle size={16} />
                <span>Contato</span>
              </button>
              
              {/* Donation button - only show if NGO can receive donations */}
              {!isOwner && canReceiveDonations && (
                <button 
                  onClick={() => {
                    if (viewerAccountType !== 'donor') {
                      onRequireDonorAuth?.();
                      return;
                    }
                    setShowDonationModal(true);
                  }}
                  className="flex items-center justify-center sm:justify-start gap-2 text-white bg-green-500 hover:bg-green-600 font-bold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm"
                >
                  <Heart size={16} />
                  <span>Doar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 mb-8">
        <div className="flex justify-center -mt-px">
          <button className="flex items-center gap-1.5 py-4 text-xs font-bold uppercase tracking-wider border-t border-gray-800 text-gray-800">
            <Grid size={14} />
            HistÃ³rias
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 md:gap-6">
        {ngo.posts && ngo.posts.length > 0 ? (
          ngo.posts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => setZoomedPost(post)}
              className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-100 rounded-lg sm:rounded-2xl"
            >
              {post.type === 'image' ? (
                <img src={post.url} className="w-full h-full object-cover transition-all group-hover:scale-110" alt="HistÃ³ria" />
              ) : (
                <div className="relative w-full h-full">
                  <video 
                    src={post.url} 
                    className="w-full h-full object-cover" 
                    preload="metadata"
                  />
                  <div className="absolute top-2 right-2 text-white drop-shadow-md"><VideoIcon size={20} /></div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Play size={32} className="text-white fill-white" />
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-300 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Camera size={32} className="text-gray-200" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">Sem histÃ³rias no momento</h3>
          </div>
        )}
      </div>

      {/* Donation Modal */}
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        ngoId={ngo.id}
        ngoName={ngo.name}
      />
    </div>
  );
};

export default NGOProfile;
