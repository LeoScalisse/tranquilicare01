export const PROFILE_PROMPTS = [
  { id: 'motivation', question: 'O que me inspira a ajudar', placeholder: 'Uma pessoa, uma experiência, uma vontade…', icon: 'heart' },
  { id: 'joy', question: 'Uma coisa que alegra meu dia', placeholder: 'Pode ser algo bem simples.', icon: 'sun' },
  { id: 'talent', question: 'Um talento que posso compartilhar', placeholder: 'Cozinhar, ensinar, ouvir, fotografar…', icon: 'sparkles' },
  { id: 'learning', question: 'Algo que quero aprender', placeholder: 'Sempre há espaço para descobrir.', icon: 'book' },
  { id: 'weekend', question: 'Onde me encontrar nas horas livres', placeholder: 'Na trilha, com a família, cuidando das plantas…', icon: 'map' },
  { id: 'music', question: 'A trilha sonora da minha vida', placeholder: 'Uma música, um artista ou um estilo.', icon: 'music' },
  { id: 'connection', question: 'Uma causa que faz parte da minha história', placeholder: 'Conte o que aproxima você dessa causa.', icon: 'heart' },
  { id: 'curiosity', question: 'Uma curiosidade sobre mim', placeholder: 'Algo que as pessoas não costumam imaginar.', icon: 'sparkles' },
] as const;

export type ProfileAnswers = Partial<Record<typeof PROFILE_PROMPTS[number]['id'], string>>;

export function normalizeProfileAnswers(value: unknown): ProfileAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return Object.fromEntries(PROFILE_PROMPTS.flatMap(({ id }) => {
    const answer = typeof record[id] === 'string' ? record[id].trim().slice(0, 240) : '';
    return answer ? [[id, answer]] : [];
  }));
}
