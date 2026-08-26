import storyOne from "@/assets/stories/tranquilicare/historia-1.jpg";
import storyTwo from "@/assets/stories/tranquilicare/historia-2.jpg";
import logo from "@/assets/logo.png";
import type { DonorRelationship } from "@/lib/afterDonation";
import type { NGO, NGOPost } from "@/types";

export const TRANQUILICARE_PROTOTYPE_EMAIL = "tranquilimaiscare@gmail.com";

export const isTranquiliCarePrototypeAccount = (email?: string | null) =>
  email?.trim().toLowerCase() === TRANQUILICARE_PROTOTYPE_EMAIL;

export const isTranquiliCarePrototypeOrganization = (organization: Pick<NGO, "name" | "email">) =>
  isTranquiliCarePrototypeAccount(organization.email)
  || organization.name.trim().toLocaleLowerCase("pt-BR") === "tranquilicare";

export const TRANQUILICARE_PROTOTYPE_STORIES: NGOPost[] = [
  {
    id: "tranquilicare-story-care",
    url: storyOne,
    type: "image",
    caption:
      "Cuidado também é acompanhar cada história com presença, transparência e carinho.",
    timestamp: Date.parse("2026-08-24T15:30:00.000Z"),
  },
  {
    id: "tranquilicare-story-impact",
    url: storyTwo,
    type: "image",
    caption:
      "Quando confiança e tecnologia caminham juntas, cada apoio pode chegar mais longe.",
    timestamp: Date.parse("2026-08-22T18:15:00.000Z"),
  },
];

export const TRANQUILICARE_FOUNDER_NGO: NGO = {
  id: "founder-tranquilicare",
  name: "TranquiliCare",
  description:
    "Uma organização que aproxima pessoas e causas por meio de tecnologia, transparência e cuidado contínuo.",
  category: "Social",
  goal:
    "Transformar cada doação em uma história acompanhada, próxima e transparente.",
  objectives: [
    "Ajudar organizações a manterem seus doadores perto do impacto.",
    "Tornar a jornada de doação mais humana e confiável.",
  ],
  image: logo,
  email: TRANQUILICARE_PROTOTYPE_EMAIL,
  instagram: "@tranquilimaiscare",
  verified: true,
  status: "approved",
  posts: TRANQUILICARE_PROTOTYPE_STORIES,
};

type PrototypeRelationship = Omit<DonorRelationship, "organizationId">;

const PROTOTYPE_RELATIONSHIPS: PrototypeRelationship[] = [
  {
    id: "prototype-relationship-ana",
    donationId: "prototype-donation-ana",
    donorProfileId: "prototype-donor-ana",
    donorName: "Ana Clara",
    donorEmail: "ana.clara@exemplo.com",
    donorAvatarUrl: null,
    amountCents: 5000,
    donatedAt: "2026-08-25T13:20:00.000Z",
    stage: "new",
    position: 0,
    lastContactAt: null,
    nextContactAt: "2026-08-25T13:20:00.000Z",
    messages: [],
  },
  {
    id: "prototype-relationship-gabriel",
    donationId: "prototype-donation-gabriel",
    donorProfileId: "prototype-donor-gabriel",
    donorName: "Gabriel Martins",
    donorEmail: "gabriel.martins@exemplo.com",
    donorAvatarUrl: null,
    amountCents: 8500,
    donatedAt: "2026-08-25T10:05:00.000Z",
    stage: "new",
    position: 1,
    lastContactAt: null,
    nextContactAt: "2026-08-25T10:05:00.000Z",
    messages: [],
  },
  {
    id: "prototype-relationship-helena",
    donationId: "prototype-donation-helena",
    donorProfileId: "prototype-donor-helena",
    donorName: "Helena Costa",
    donorEmail: "helena.costa@exemplo.com",
    donorAvatarUrl: null,
    amountCents: 12000,
    donatedAt: "2026-08-23T16:40:00.000Z",
    stage: "thanks",
    position: 0,
    lastContactAt: "2026-08-23T18:00:00.000Z",
    nextContactAt: "2026-08-26T16:40:00.000Z",
    messages: [
      {
        id: "prototype-message-helena-1",
        relationshipId: "prototype-relationship-helena",
        direction: "organization_to_donor",
        body: "Helena, recebemos seu apoio. Obrigada por começar esta história com a gente!",
        sentAt: "2026-08-23T18:00:00.000Z",
        status: "read",
      },
    ],
  },
  {
    id: "prototype-relationship-rafael",
    donationId: "prototype-donation-rafael",
    donorProfileId: "prototype-donor-rafael",
    donorName: "Rafael Nunes",
    donorEmail: "rafael.nunes@exemplo.com",
    donorAvatarUrl: null,
    amountCents: 7500,
    donatedAt: "2026-08-21T11:10:00.000Z",
    stage: "story",
    position: 0,
    lastContactAt: "2026-08-24T11:10:00.000Z",
    nextContactAt: "2026-08-27T11:10:00.000Z",
    messages: [
      {
        id: "prototype-message-rafael-1",
        relationshipId: "prototype-relationship-rafael",
        direction: "organization_to_donor",
        body: "Rafael, queremos mostrar um pouco do cuidado que o seu apoio ajuda a construir.",
        sentAt: "2026-08-24T11:10:00.000Z",
        status: "sent",
      },
    ],
  },
  {
    id: "prototype-relationship-beatriz",
    donationId: "prototype-donation-beatriz",
    donorProfileId: "prototype-donor-beatriz",
    donorName: "Beatriz Almeida",
    donorEmail: "beatriz.almeida@exemplo.com",
    donorAvatarUrl: null,
    amountCents: 20000,
    donatedAt: "2026-08-18T14:25:00.000Z",
    stage: "follow_up",
    position: 0,
    lastContactAt: "2026-08-24T14:25:00.000Z",
    nextContactAt: "2026-08-28T14:25:00.000Z",
    messages: [
      {
        id: "prototype-message-beatriz-1",
        relationshipId: "prototype-relationship-beatriz",
        direction: "organization_to_donor",
        body: "Seu apoio já está fortalecendo novas conexões de cuidado, Beatriz.",
        sentAt: "2026-08-24T14:25:00.000Z",
        status: "read",
      },
      {
        id: "prototype-message-beatriz-2",
        relationshipId: "prototype-relationship-beatriz",
        direction: "donor_to_organization",
        body: "Que alegria acompanhar! Obrigada pela atualização.",
        sentAt: "2026-08-24T15:02:00.000Z",
        status: "read",
      },
    ],
  },
  {
    id: "prototype-relationship-lucas",
    donationId: "prototype-donation-lucas",
    donorProfileId: "prototype-donor-lucas",
    donorName: "Lucas Ferreira",
    donorEmail: "lucas.ferreira@exemplo.com",
    donorAvatarUrl: null,
    amountCents: 4500,
    donatedAt: "2026-08-12T09:45:00.000Z",
    stage: "impact",
    position: 0,
    lastContactAt: "2026-08-22T09:45:00.000Z",
    nextContactAt: "2026-08-29T09:45:00.000Z",
    messages: [
      {
        id: "prototype-message-lucas-1",
        relationshipId: "prototype-relationship-lucas",
        direction: "organization_to_donor",
        body: "Lucas, seu apoio já se transformou em mais uma história acompanhada com transparência.",
        sentAt: "2026-08-22T09:45:00.000Z",
        status: "sent",
      },
    ],
  },
  {
    id: "prototype-relationship-camila",
    donationId: "prototype-donation-camila",
    donorProfileId: "prototype-donor-camila",
    donorName: "Camila Ribeiro",
    donorEmail: "camila.ribeiro@exemplo.com",
    donorAvatarUrl: null,
    amountCents: 15000,
    donatedAt: "2026-07-24T17:30:00.000Z",
    stage: "closed",
    position: 0,
    lastContactAt: "2026-08-23T17:30:00.000Z",
    nextContactAt: null,
    messages: [
      {
        id: "prototype-message-camila-1",
        relationshipId: "prototype-relationship-camila",
        direction: "organization_to_donor",
        body: "Camila, este ciclo termina, mas a história que você ajudou a construir continua.",
        sentAt: "2026-08-23T17:30:00.000Z",
        status: "read",
      },
    ],
  },
];

export const getTranquiliCarePrototypeRelationships = (
  organizationId: string,
): DonorRelationship[] =>
  PROTOTYPE_RELATIONSHIPS.map((relationship) => ({
    ...relationship,
    organizationId,
    messages: relationship.messages.map((message) => ({ ...message })),
  }));
