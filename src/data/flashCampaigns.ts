import { FlashCampaign } from '../types';

const svgDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** Landscape gradient banner with a short title — demo art for flash campaigns. */
const campaignImage = (title: string, from: string, to: string) =>
  svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${from}" offset="0"/>
          <stop stop-color="${to}" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="800" height="480" fill="url(#g)"/>
      <circle cx="650" cy="110" r="150" fill="#ffffff" opacity=".14"/>
      <circle cx="120" cy="410" r="130" fill="#ffffff" opacity=".12"/>
      <text x="52" y="300" font-family="Arial, sans-serif" font-size="50" font-weight="800" fill="#ffffff">${title}</text>
    </svg>
  `);

const DAY = 1000 * 60 * 60 * 24;
const HOUR = 1000 * 60 * 60;
const now = Date.now();

// Money is stored in cents across the app (formatBRL divides by 100).
const reais = (v: number) => v * 100;

export const flashCampaigns: FlashCampaign[] = [
  {
    id: 'flash-inverno-acolhedor',
    title: 'Inverno Acolhedor',
    ngoId: 'demo-abraco-sereno',
    ngoName: 'Abraço Sereno',
    category: 'Saúde Mental',
    image: campaignImage('Inverno Acolhedor', '#38b6ff', '#0369a1'),
    raised: reais(3200),
    goal: reais(5000),
    endsAt: now + 3 * DAY + 4 * HOUR,
  },
  {
    id: 'flash-comida-na-mesa',
    title: 'Comida na Mesa',
    ngoId: 'demo-maos-que-acolhem',
    ngoName: 'Mãos que Acolhem',
    category: 'Social',
    image: campaignImage('Comida na Mesa', '#f59e0b', '#b45309'),
    raised: reais(8400),
    goal: reais(10000),
    endsAt: now + 1 * DAY + 6 * HOUR,
  },
  {
    id: 'flash-resgate-urgente',
    title: 'Resgate Urgente',
    ngoId: 'demo-patas-do-bem',
    ngoName: 'Patas do Bem',
    category: 'Pets',
    image: campaignImage('Resgate Urgente', '#db2777', '#9d174d'),
    raised: reais(1500),
    goal: reais(4000),
    endsAt: now + 5 * DAY,
  },
  {
    id: 'flash-terapia-para-todos',
    title: 'Terapia para Todos',
    ngoId: 'demo-mente-em-flor',
    ngoName: 'Mente em Flor',
    category: 'Saúde Mental',
    image: campaignImage('Terapia para Todos', '#7c3aed', '#4c1d95'),
    raised: reais(6700),
    goal: reais(8000),
    endsAt: now + 18 * HOUR,
  },
];
