import { NGO } from '../types';

const svgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const profileImage = (initials: string, bg: string, accent: string) =>
  svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="56" fill="${bg}"/>
      <circle cx="190" cy="52" r="34" fill="${accent}" opacity=".85"/>
      <circle cx="48" cy="190" r="42" fill="#ffffff" opacity=".28"/>
      <text x="120" y="136" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="800" fill="#ffffff">${initials}</text>
    </svg>
  `);

const storyImage = (_title: string, bg: string, accent: string) =>
  svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1125">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${bg}" offset="0"/>
          <stop stop-color="${accent}" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1125" fill="url(#g)"/>
      <circle cx="710" cy="180" r="130" fill="#fff" opacity=".18"/>
      <circle cx="180" cy="900" r="180" fill="#fff" opacity=".14"/>
      <path d="M110 760c150-120 280-90 390 30s210 145 300 70v265H90z" fill="#fff" opacity=".1"/>
    </svg>
  `);

export const demoNgos: NGO[] = [
  {
    id: 'demo-abraco-sereno',
    name: 'Abraço Sereno',
    description:
      'Acolhimento emocional gratuito para pessoas em momentos de ansiedade, luto e vulnerabilidade social.',
    category: 'Saúde Mental',
    goal:
      'Criar rodas de conversa semanais e oferecer 200 atendimentos de escuta qualificada por mês.',
    image: '/images/tranquilicare-heart-transparent.png',
    coverImage: '/images/abraco-sereno-cover.webp',
    email: 'contato@abracosereno.org',
    instagram: '@abracosereno',
    phone: '(11) 98888-0101',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-abraco-story-1',
        url: storyImage('Roda de acolhimento', '#38b6ff', '#7dd3fc'),
        type: 'image',
        caption: 'Encontro aberto com voluntários e participantes da comunidade.',
        timestamp: Date.now() - 1000 * 60 * 60 * 3,
      },
    ],
  },
  {
    id: 'demo-casa-recomeco',
    name: 'Casa Recomeço',
    description:
      'Rede comunitária que conecta famílias a apoio psicossocial, oficinas de cuidado e orientação básica.',
    category: 'Social',
    goal:
      'Montar kits de cuidado e ampliar as oficinas para três bairros nos próximos meses.',
    image: profileImage('CR', '#172554', '#38b6ff'),
    email: 'ola@casarecomeco.org',
    instagram: '@casarecomeco',
    phone: '(21) 97777-0202',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-recomeco-story-1',
        url: storyImage('Oficina de cuidado', '#ffd957', '#38b6ff'),
        type: 'image',
        caption: 'Uma tarde de orientação, escuta e vínculos com as famílias atendidas.',
        timestamp: Date.now() - 1000 * 60 * 60 * 8,
      },
    ],
  },
  {
    id: 'demo-mente-em-flor',
    name: 'Mente em Flor',
    description:
      'Terapia acessível e grupos de apoio para jovens que enfrentam ansiedade e depressão.',
    category: 'Saúde Mental',
    goal: 'Subsidiar 300 sessões de terapia para adolescentes em situação de vulnerabilidade.',
    image: profileImage('MF', '#7c3aed', '#c4b5fd'),
    email: 'contato@menteemflor.org',
    instagram: '@menteemflor',
    phone: '(11) 96666-0303',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-menteflor-story-1',
        url: storyImage('Grupo de apoio', '#7c3aed', '#c4b5fd'),
        type: 'image',
        caption: 'Encontro semanal de jovens em rede de apoio e escuta.',
        timestamp: Date.now() - 1000 * 60 * 60 * 5,
      },
    ],
  },
  {
    id: 'demo-respire-bem',
    name: 'Respire Bem',
    description:
      'Programas de mindfulness e primeiros socorros emocionais em escolas públicas e postos de saúde.',
    category: 'Saúde',
    goal: 'Levar oficinas de respiração e autocuidado a 10 escolas neste semestre.',
    image: profileImage('RB', '#0ea5e9', '#bae6fd'),
    email: 'ola@respirebem.org',
    instagram: '@respirebem',
    phone: '(31) 95555-0404',
    verified: true,
    status: 'approved',
    posts: [],
  },
  {
    id: 'demo-maos-que-acolhem',
    name: 'Mãos que Acolhem',
    description:
      'Distribuição de refeições e apoio a pessoas em situação de rua com escuta e encaminhamento.',
    category: 'Social',
    goal: 'Servir 1.000 refeições quentes por mês e ampliar a equipe de voluntários.',
    image: profileImage('MA', '#f59e0b', '#fde68a'),
    email: 'contato@maosqueacolhem.org',
    instagram: '@maosqueacolhem',
    phone: '(41) 94444-0505',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-maos-story-1',
        url: storyImage('Refeições solidárias', '#f59e0b', '#fde68a'),
        type: 'image',
        caption: 'Voluntários preparando e servindo o jantar da comunidade.',
        timestamp: Date.now() - 1000 * 60 * 60 * 12,
      },
    ],
  },
  {
    id: 'demo-ponte-solidaria',
    name: 'Ponte Solidária',
    description:
      'Capacitação profissional e apoio à geração de renda para mulheres chefes de família.',
    category: 'Social',
    goal: 'Formar 120 mulheres em cursos profissionalizantes até o fim do ano.',
    image: profileImage('PS', '#059669', '#6ee7b7'),
    email: 'ola@pontesolidaria.org',
    instagram: '@pontesolidaria',
    phone: '(51) 93333-0606',
    verified: false,
    status: 'approved',
    posts: [],
  },
  {
    id: 'demo-patas-do-bem',
    name: 'Patas do Bem',
    description:
      'Resgate, cuidado veterinário e adoção responsável de animais abandonados.',
    category: 'Pets',
    goal: 'Custear castrações e tratamentos para 200 animais resgatados.',
    image: profileImage('PB', '#db2777', '#fbcfe8'),
    email: 'contato@patasdobem.org',
    instagram: '@patasdobem',
    phone: '(11) 92222-0707',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-patas-story-1',
        url: storyImage('Adoção responsável', '#db2777', '#fbcfe8'),
        type: 'image',
        caption: 'Mais um resgatado encontrando um novo lar cheio de amor.',
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
      },
    ],
  },
  {
    id: 'demo-verde-vivo',
    name: 'Verde Vivo',
    description:
      'Reflorestamento urbano e educação ambiental com escolas e comunidades locais.',
    category: 'Meio Ambiente',
    goal: 'Plantar 5.000 mudas nativas e criar 3 hortas comunitárias.',
    image: profileImage('VV', '#16a34a', '#bbf7d0'),
    email: 'ola@verdevivo.org',
    instagram: '@verdevivo',
    phone: '(48) 91111-0808',
    verified: false,
    status: 'approved',
    posts: [],
  },
  {
    id: 'demo-focinhos-felizes',
    name: 'Focinhos Felizes',
    description: 'Resgate e adoção de gatos, com feiras de adoção e campanhas de castração.',
    category: 'Pets',
    goal: 'Castrar 150 gatos e viabilizar 80 adoções responsáveis neste semestre.',
    image: profileImage('FF', '#f97316', '#fdba74'),
    email: 'contato@focinhosfelizes.org',
    instagram: '@focinhosfelizes',
    phone: '(11) 90000-0909',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-focinhos-story-1',
        url: storyImage('Feira de adoção', '#f97316', '#fdba74'),
        type: 'image',
        caption: 'Um sábado de encontros que terminam em novos lares.',
        timestamp: Date.now() - 1000 * 60 * 60 * 30,
      },
    ],
  },
  {
    id: 'demo-abrigo-peludo',
    name: 'Abrigo Peludo',
    description: 'Cuidado e acolhimento de cães idosos e com deficiência até a adoção definitiva.',
    category: 'Pets',
    goal: 'Manter alimentação e tratamentos para 60 cães resgatados por mês.',
    image: profileImage('AP', '#ea580c', '#fed7aa'),
    email: 'ola@abrigopeludo.org',
    instagram: '@abrigopeludo',
    phone: '(21) 90000-1010',
    verified: false,
    status: 'approved',
    posts: [],
  },
  {
    id: 'demo-rio-limpo',
    name: 'Rio Limpo',
    description: 'Mutirões de despoluição de rios e nascentes com comunidades ribeirinhas.',
    category: 'Meio Ambiente',
    goal: 'Realizar 12 mutirões e retirar 5 toneladas de resíduos das margens.',
    image: profileImage('RL', '#059669', '#6ee7b7'),
    email: 'contato@riolimpo.org',
    instagram: '@riolimpo',
    phone: '(31) 90000-1111',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-riolimpo-story-1',
        url: storyImage('Mutirão no rio', '#059669', '#6ee7b7'),
        type: 'image',
        caption: 'Voluntários devolvendo vida às margens do rio.',
        timestamp: Date.now() - 1000 * 60 * 60 * 40,
      },
    ],
  },
  {
    id: 'demo-semente-do-futuro',
    name: 'Semente do Futuro',
    description: 'Educação ambiental e hortas em escolas para crianças e adolescentes.',
    category: 'Educação',
    goal: 'Criar 5 hortas escolares e formar 300 crianças em cuidado ambiental.',
    image: profileImage('SF', '#16a34a', '#bbf7d0'),
    email: 'ola@sementedofuturo.org',
    instagram: '@sementedofuturo',
    phone: '(41) 90000-1212',
    verified: false,
    status: 'approved',
    posts: [],
  },
  {
    id: 'demo-futuro-em-foco',
    name: 'Futuro em Foco',
    description:
      'Reforço escolar, leitura e tecnologia para crianças e adolescentes da rede pública.',
    category: 'Educação',
    goal: 'Oferecer acompanhamento educacional contínuo para 240 estudantes neste ano.',
    image: profileImage('FF', '#1d4ed8', '#93c5fd'),
    email: 'contato@futuroemfoco.org',
    instagram: '@futuroemfoco',
    phone: '(41) 90000-1313',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-futuro-story-1',
        url: storyImage('Aprender em rede', '#1d4ed8', '#93c5fd'),
        type: 'image',
        caption: 'Uma tarde de leitura, experimentação e novas descobertas.',
        timestamp: Date.now() - 1000 * 60 * 60 * 16,
      },
    ],
  },
  {
    id: 'demo-saude-em-rede',
    name: 'Saúde em Rede',
    description:
      'Prevenção, orientação e acesso a cuidados básicos para comunidades com atendimento limitado.',
    category: 'Saúde',
    goal: 'Realizar 500 atendimentos preventivos e formar agentes comunitários de saúde.',
    image: profileImage('SR', '#047857', '#6ee7b7'),
    email: 'contato@saudeemrede.org',
    instagram: '@saudeemrede',
    phone: '(11) 90000-1414',
    verified: true,
    status: 'approved',
    posts: [
      {
        id: 'demo-saude-story-1',
        url: storyImage('Cuidado próximo', '#047857', '#6ee7b7'),
        type: 'image',
        caption: 'Orientação preventiva e cuidado chegando perto de quem precisa.',
        timestamp: Date.now() - 1000 * 60 * 60 * 10,
      },
    ],
  },
];
