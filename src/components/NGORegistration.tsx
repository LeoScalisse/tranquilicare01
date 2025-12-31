import React, { useState, useRef } from 'react';
import { NGO } from '../types';
import { BrandedText } from '../utils';
import { FileText, Tag, Info, Target, Image as ImageIcon, Instagram, Mail, Phone, Upload, X } from 'lucide-react';

interface NGORegistrationProps {
  onRegister: (ngo: NGO) => void;
}

const NGORegistration: React.FC<NGORegistrationProps> = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Saúde Mental',
    goal: '',
    image: '',
    email: '',
    instagram: '',
    phone: ''
  });

  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalSteps = 2;

  const categories = ['Saúde Mental', 'Social', 'Outros'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newNGO: NGO = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      verified: false,
      posts: []
    };
    onRegister(newNGO);
  };

  const isStep1Valid = formData.name && formData.description && formData.category;
  const isStep2Valid = formData.goal && formData.image && formData.email && formData.instagram;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
          <span>Área da Organização</span>
        </div>
        <h2 className="text-4xl font-bold text-gray-900 mb-2">
          <BrandedText text="Vamos cuidar juntos de quem precisa" />
        </h2>
        <p className="text-gray-600">
          A Tranquili<span className="text-brand-yellow font-bold">Care</span> conecta sua organização a pessoas que acreditam no cuidado com a saúde mental.
        </p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
          <div 
            className="h-full bg-brand-blue transition-all duration-500 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 mt-4">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <FileText size={18} className="text-brand-blue" />
                  Nome da Organização
                </label>
                <input 
                  type="text"
                  required
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all"
                  placeholder="Ex: Instituto Esperança"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Tag size={18} className="text-brand-blue" />
                  Categoria de Atuação
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({...formData, category: cat})}
                      className={`py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        formData.category === cat 
                        ? 'border-brand-blue bg-blue-50 text-brand-blue' 
                        : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Info size={18} className="text-brand-blue" />
                  Descrição da Causa
                </label>
                <textarea 
                  required
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all h-32 resize-none"
                  placeholder="Conte quem vocês cuidam, como fazem isso e por que esse apoio é importante."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <button 
                type="button"
                disabled={!isStep1Valid}
                onClick={() => setStep(2)}
                className="w-full py-4 bg-brand-blue text-white rounded-2xl font-bold shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                Próximo Passo
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Target size={18} className="text-brand-blue" />
                  Objetivo Principal (Meta Atual)
                </label>
                <input 
                  type="text"
                  required
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all"
                  placeholder="Ex: Garantir atendimentos psicológicos gratuitos este mês"
                  value={formData.goal}
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <ImageIcon size={18} className="text-brand-blue" />
                  Logo da Organização
                </label>
                
                <div className="flex justify-center sm:justify-start">
                  <div className="relative w-40 h-40">
                    <input 
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    
                    {!formData.image ? (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-all group overflow-hidden"
                      >
                        <Upload size={20} className="text-gray-400 group-hover:text-brand-blue" />
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Logo</span>
                      </div>
                    ) : (
                      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-md group">
                        <img src={formData.image} alt="Logo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white p-2 rounded-lg"><Upload size={16} /></button>
                          <button type="button" onClick={removeImage} className="bg-red-500 text-white p-2 rounded-lg"><X size={16} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Instagram size={18} className="text-brand-blue" />
                    Instagram (@)
                  </label>
                  <input 
                    type="text"
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all"
                    placeholder="@suaong"
                    value={formData.instagram}
                    onChange={e => setFormData({...formData, instagram: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Mail size={18} className="text-brand-blue" />
                    E-mail Oficial
                  </label>
                  <input 
                    type="email"
                    required
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all"
                    placeholder="exemplo@ong.org"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Phone size={18} className="text-brand-blue" />
                  Telefone (Opcional)
                </label>
                <input 
                  type="tel"
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl outline-none transition-all"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="flex gap-4">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold">Voltar</button>
                <button type="submit" disabled={!isStep2Valid} className="flex-[2] py-4 bg-brand-yellow text-yellow-900 rounded-2xl font-bold shadow-lg">Concluir parceria</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default NGORegistration;
