import ambienteSeal from '@/assets/selos/ambiente.png';
import educacaoSeal from '@/assets/selos/educacao.png';
import petsSeal from '@/assets/selos/pets.png';
import saudeMentalSeal from '@/assets/selos/saude-mental.png';
import saudeSeal from '@/assets/selos/saude.png';
import socialSeal from '@/assets/selos/social.png';

export interface VerificationSeal {
  id: string;
  src: string;
  label: string;
  impact: string;
  detail: string;
}

export const verificationSeals: VerificationSeal[] = [
  {
    id: 'ambiente',
    src: ambienteSeal,
    label: 'Meio ambiente',
    impact: '42 kg reaproveitados',
    detail: 'Recursos distribuídos com melhor aproveitamento por iniciativas acompanhadas.',
  },
  {
    id: 'educacao',
    src: educacaoSeal,
    label: 'Educação',
    impact: '12 estudantes alcançados',
    detail: 'Ações de aprendizagem receberam apoio para continuar chegando a crianças e jovens.',
  },
  {
    id: 'pets',
    src: petsSeal,
    label: 'Proteção animal',
    impact: '8 animais cuidados',
    detail: 'Apoios ajudaram a viabilizar alimentação, acolhimento e cuidado veterinário.',
  },
  {
    id: 'saude-mental',
    src: saudeMentalSeal,
    label: 'Saúde mental',
    impact: '6 acolhimentos apoiados',
    detail: 'Pessoas tiveram acesso a escuta e acompanhamento por organizações da área.',
  },
  {
    id: 'saude',
    src: saudeSeal,
    label: 'Saúde',
    impact: '9 atendimentos viabilizados',
    detail: 'Contribuições se transformaram em cuidado e acesso a serviços essenciais.',
  },
  {
    id: 'social',
    src: socialSeal,
    label: 'Desenvolvimento social',
    impact: '27 refeições viabilizadas',
    detail: 'Famílias receberam apoio por meio de iniciativas sociais acompanhadas.',
  },
];
