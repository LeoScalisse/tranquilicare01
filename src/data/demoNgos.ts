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

const storyImage = (title: string, bg: string, accent: string) =>
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
      <rect x="92" y="740" width="716" height="240" rx="42" fill="#fff" opacity=".92"/>
      <text x="450" y="850" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="#172554">${title}</text>
      <text x="450" y="925" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#475569">TranquiliCare demo</text>
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
    image: profileImage('AS', '#38b6ff', '#ffd957'),
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
];