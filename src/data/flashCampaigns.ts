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
    description: 'Ajude a preparar 40 kits de inverno até 30 de julho.',
    image: campaignImage('Inverno Acolhedor', '#38b6ff', '#0369a1'),
    raised: reais(3200),
    goal: reais(5000),
    endsAt: now + 3 * DAY + 60 * 60 * 1000,
  },
];
