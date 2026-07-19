import React, { useState } from 'react';
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
  Camera,
  Video as VideoIcon,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';

interface NGOProfileProps {
  ngo: NGO;
}

/**
 * Read-only public cause detail. Backend-free: donations are a placeholder
 * until the new Stripe flow is wired up, and NGO editing/verification lives in
 * the (removed) organization backend.
 */
const NGOProfile: React.FC<NGOProfileProps> = ({ ngo }) => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [zoomedPost, setZoomedPost] = useState<NGOPost | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const copyPhone = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const getInstagramUrl = (handle: string) => {
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    return `https://www.instagram.com/${cleanHandle}`;
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
            onClick={(e) => e.stopPropagation()}
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
              <img src={zoomedPost.url} className="w-full h-full object-contain" alt="História ampliada" />
            )}

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
              <div className="flex items-center gap-3 mb-2">
                <img src={ngo.image} className="w-10 h-10 rounded-full border-2 border-white" alt={ngo.name} />
                <span className="font-bold">{ngo.name}</span>
              </div>
              {zoomedPost.caption && (
                <p className="text-sm text-gray-200 leading-relaxed max-w-lg">{zoomedPost.caption}</p>
              )}
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-24 bg-gradient-to-r from-brand-yellow to-yellow-400">
              <button onClick={() => setShowGoalModal(false)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-yellow-900 transition-colors">
                <X size={18} />
              </button>
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-32 bg-gradient-to-r from-brand-blue to-blue-400">
              <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors">
                <X size={18} />
              </button>
              <img src={ngo.image} className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" alt={ngo.name} />
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
                <a href={`mailto:${ngo.email}`} className="flex items-center gap-3 w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  <Mail size={20} className="text-gray-600" />
                  <span className="font-medium text-gray-700 truncate flex-1 text-left">{ngo.email}</span>
                  <ExternalLink size={14} className="text-gray-400" />
                </a>
                {ngo.phone && (
                  <button onClick={() => copyPhone(ngo.phone!)} className="flex items-center gap-3 w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
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
            <h2 className="text-xl font-semibold text-gray-800">{ngo.name.replace(/\s+/g, '').toLowerCase()}</h2>
          </div>

          <div className="flex gap-8 justify-center sm:justify-start text-sm">
            <div>
              <span className="font-bold">{ngo.posts?.length || 0}</span> histórias
            </div>
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

              <button
                onClick={() => toast('Doações estarão disponíveis em breve ✨')}
                className="flex items-center justify-center sm:justify-start gap-2 text-white bg-brand-blue hover:bg-blue-600 font-bold text-sm px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <Heart size={16} className="fill-white" />
                <span>Apoiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 mb-8">
        <div className="flex justify-center -mt-px">
          <button className="flex items-center gap-1.5 py-4 text-xs font-bold uppercase tracking-wider border-t border-gray-800 text-gray-800">
            <Grid size={14} />
            Histórias
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
                <img src={post.url} className="w-full h-full object-cover transition-all group-hover:scale-110" alt="História" />
              ) : (
                <div className="relative w-full h-full">
                  <video src={post.url} className="w-full h-full object-cover" preload="metadata" />
                  <div className="absolute top-2 right-2 text-white drop-shadow-md">
                    <VideoIcon size={20} />
                  </div>
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
            <h3 className="text-xl font-bold text-gray-400">Sem histórias no momento</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default NGOProfile;
