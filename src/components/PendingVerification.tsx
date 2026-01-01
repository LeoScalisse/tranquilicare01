import React from 'react';
import { Clock, CheckCircle, Mail } from 'lucide-react';
import { BrandedText } from '../utils';
interface PendingVerificationProps {
  ngoName: string;
  onBackToHome: () => void;
}
const PendingVerification: React.FC<PendingVerificationProps> = ({
  ngoName,
  onBackToHome
}) => {
  return <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 md:p-12 text-center">
        <div className="w-24 h-24 bg-brand-yellow/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={48} className="text-brand-yellow" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          <BrandedText text="Recebemos suas informações com sucesso" />
        </h2>
        
        <p className="text-xl text-gray-700 mb-6">
          A <span className="font-bold text-brand-blue">{ngoName}</span> está quase lá!
        </p>
        
        <div className="bg-blue-50 rounded-2xl p-6 mb-8">
          <p className="text-gray-600 leading-relaxed">
            Logo sua instituição vai fazer parte da <span className="font-bold">Tranquili</span>
            <span className="font-bold text-brand-yellow">Care</span>, mas antes ela precisa passar 
            por uma <span className="font-bold text-brand-blue">avaliação</span> para garantir 
            que está tudo de acordo com nossos padrões de qualidade e confiança.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-800">Cadastro enviado</p>
              <p className="text-sm text-gray-500">Seus dados foram recebidos com sucesso</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-800">Em análise</p>
              <p className="text-sm text-gray-500">Nossa equipe está revisando suas informações com cuidado</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl opacity-50">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Mail size={20} className="text-gray-400" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-800">Aprovação</p>
              <p className="text-sm text-gray-500">Você será avisado assim que sua organização for aprovada
            </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Esse processo costuma levar até 3 dias úteis.
Fazemos isso para garantir um ambiente seguro e confiável para todos. ​
        </p>

        <button onClick={onBackToHome} className="px-8 py-4 bg-brand-blue text-white rounded-2xl font-bold hover:bg-blue-600 transition-all">
          Voltar ao Início
        </button>
      </div>
    </div>;
};
export default PendingVerification;