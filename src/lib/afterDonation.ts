import type { AccountType } from "@/lib/authTypes";

export type DonorRelationshipStage = "new" | "thanks" | "story" | "follow_up" | "impact" | "closed";

export interface AfterDonationStageDefinition {
  id: DonorRelationshipStage;
  label: string;
  description: string;
  accent: string;
}

export interface DonorRelationshipMessage {
  id: string;
  relationshipId: string;
  direction: "organization_to_donor" | "donor_to_organization";
  body: string;
  sentAt: string;
  status: "draft" | "sent" | "read";
}

export interface DonorRelationship {
  id: string;
  organizationId: string;
  donationId: string;
  donorProfileId: string | null;
  donorName: string;
  donorEmail: string | null;
  donorAvatarUrl: string | null;
  amountCents: number;
  donatedAt: string;
  stage: DonorRelationshipStage;
  position: number;
  lastContactAt: string | null;
  nextContactAt: string | null;
  isTest?: boolean;
  messages: DonorRelationshipMessage[];
}

export type ContactKind = "thanks" | "story" | "update" | "impact" | "closing";

export interface RecommendedContact {
  id: string;
  relationshipId: string;
  donorName: string;
  scheduledFor: string;
  kind: ContactKind;
  title: string;
  status: "recommended" | "scheduled" | "completed" | "skipped";
}

export const AFTER_DONATION_STAGES: AfterDonationStageDefinition[] = [
  { id: "new", label: "Doações novas", description: "Apoios que acabaram de chegar.", accent: "bg-sky-500" },
  { id: "thanks", label: "1º agradecimento", description: "Primeiro contato de acolhimento.", accent: "bg-amber-400" },
  { id: "story", label: "História enviada", description: "Uma história da causa foi compartilhada.", accent: "bg-violet-500" },
  { id: "follow_up", label: "Acompanhamento", description: "Relacionamento em andamento.", accent: "bg-blue-600" },
  { id: "impact", label: "Impacto compartilhado", description: "Resultados já chegaram ao doador.", accent: "bg-emerald-500" },
  { id: "closed", label: "Fim dessa história", description: "Ciclo concluído com transparência.", accent: "bg-slate-500" },
];

export const canRenderAfterDonationTab = (input: {
  ownerMode: boolean;
  accountType: AccountType | null;
  currentUserId: string | null;
  organizationId: string;
}): boolean =>
  input.ownerMode &&
  input.accountType === "ngo" &&
  Boolean(input.currentUserId) &&
  input.currentUserId === input.organizationId;

export const buildRecommendedContactPlan = (input: {
  relationshipId: string;
  donorName: string;
  donatedAt: string;
}): RecommendedContact[] => {
  const schedule: Array<{ offset: number; kind: ContactKind; title: string }> = [
    { offset: 0, kind: "thanks", title: "Primeiro agradecimento" },
    { offset: 3, kind: "story", title: "Uma história para começar" },
    { offset: 6, kind: "update", title: "Como estamos usando o apoio" },
    { offset: 10, kind: "story", title: "Bastidores da causa" },
    { offset: 13, kind: "update", title: "Uma pequena conquista" },
    { offset: 17, kind: "impact", title: "Impacto em andamento" },
    { offset: 20, kind: "story", title: "História da comunidade" },
    { offset: 24, kind: "update", title: "Próximo passo da causa" },
    { offset: 27, kind: "impact", title: "Resultado do mês" },
    { offset: 30, kind: "closing", title: "Fechamento desta história" },
  ];

  const donationDate = new Date(input.donatedAt);
  if (Number.isNaN(donationDate.getTime())) return [];

  return schedule.map(({ offset, kind, title }) => {
    const scheduledDate = new Date(donationDate);
    scheduledDate.setUTCDate(scheduledDate.getUTCDate() + offset);
    return {
      id: `${input.relationshipId}-${offset}`,
      relationshipId: input.relationshipId,
      donorName: input.donorName,
      scheduledFor: scheduledDate.toISOString().slice(0, 10),
      kind,
      title,
      status: "recommended",
    };
  });
};

export const groupContactsByDate = (contacts: RecommendedContact[]): Map<string, RecommendedContact[]> => {
  const grouped = new Map<string, RecommendedContact[]>();
  contacts.forEach((contact) => {
    const entries = grouped.get(contact.scheduledFor) ?? [];
    entries.push(contact);
    grouped.set(contact.scheduledFor, entries);
  });
  return grouped;
};

export const DEMO_DONOR_RELATIONSHIPS: DonorRelationship[] = [
  {
    id: "relationship-ana", organizationId: "demo-organization", donationId: "donation-ana",
    donorProfileId: "donor-ana", donorName: "Ana Souza", donorEmail: "ana@exemplo.com",
    donorAvatarUrl: null, amountCents: 5000, donatedAt: "2026-08-03T14:30:00.000Z",
    stage: "new", position: 0, lastContactAt: null, nextContactAt: "2026-08-03T14:30:00.000Z", messages: [],
  },
  {
    id: "relationship-carlos", organizationId: "demo-organization", donationId: "donation-carlos",
    donorProfileId: "donor-carlos", donorName: "Carlos Lima", donorEmail: "carlos@exemplo.com",
    donorAvatarUrl: null, amountCents: 8500, donatedAt: "2026-08-03T18:10:00.000Z",
    stage: "thanks", position: 0, lastContactAt: "2026-08-03T19:00:00.000Z",
    nextContactAt: "2026-08-06T12:00:00.000Z",
    messages: [{
      id: "message-carlos-1", relationshipId: "relationship-carlos",
      direction: "organization_to_donor", body: "Carlos, recebemos seu apoio. Obrigado por fazer parte desta história.",
      sentAt: "2026-08-03T19:00:00.000Z", status: "sent",
    }],
  },
  {
    id: "relationship-marina", organizationId: "demo-organization", donationId: "donation-marina",
    donorProfileId: "donor-marina", donorName: "Marina Rocha", donorEmail: "marina@exemplo.com",
    donorAvatarUrl: null, amountCents: 12000, donatedAt: "2026-08-08T10:00:00.000Z",
    stage: "story", position: 0, lastContactAt: "2026-08-11T10:00:00.000Z",
    nextContactAt: "2026-08-14T10:00:00.000Z", messages: [],
  },
  {
    id: "relationship-joao", organizationId: "demo-organization", donationId: "donation-joao",
    donorProfileId: "donor-joao", donorName: "João Pedro", donorEmail: "joao@exemplo.com",
    donorAvatarUrl: null, amountCents: 2500, donatedAt: "2026-08-12T09:20:00.000Z",
    stage: "follow_up", position: 0, lastContactAt: "2026-08-22T09:20:00.000Z",
    nextContactAt: "2026-08-29T09:20:00.000Z", messages: [],
  },
  {
    id: "relationship-luiza", organizationId: "demo-organization", donationId: "donation-luiza",
    donorProfileId: "donor-luiza", donorName: "Luiza Martins", donorEmail: "luiza@exemplo.com",
    donorAvatarUrl: null, amountCents: 20000, donatedAt: "2026-07-18T16:40:00.000Z",
    stage: "impact", position: 0, lastContactAt: "2026-08-14T16:40:00.000Z",
    nextContactAt: "2026-08-17T16:40:00.000Z", messages: [],
  },
];
