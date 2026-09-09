import {
  DEMO_DONOR_RELATIONSHIPS,
  buildRecommendedContactPlan,
  type DonorRelationship,
  type DonorRelationshipMessage,
  type DonorRelationshipStage,
  type RecommendedContact,
} from "@/lib/afterDonation";
import { supabase } from "@/lib/supabase";
import { loadProductionMetricBaseline } from "@/lib/productionMetrics";

interface MessageRow {
  id: string;
  relationship_id: string;
  direction: DonorRelationshipMessage["direction"];
  body: string;
  sent_at: string;
  status: DonorRelationshipMessage["status"];
}

interface RelationshipRow {
  id: string;
  organization_id: string;
  donation_id: string;
  donor_profile_id: string | null;
  donor_name: string;
  donor_email: string | null;
  donor_avatar_url: string | null;
  amount_cents: number;
  donated_at: string;
  stage: DonorRelationshipStage;
  position: number;
  last_contact_at: string | null;
  next_contact_at: string | null;
  is_test: boolean;
  donor_relationship_messages?: MessageRow[];
}

interface ScheduleRow {
  id: string;
  relationship_id: string;
  scheduled_for: string;
  contact_kind: RecommendedContact["kind"];
  title: string;
  status: RecommendedContact["status"];
  donor_relationships?: { donor_name?: string } | Array<{ donor_name?: string }> | null;
}

const mapMessage = (row: MessageRow): DonorRelationshipMessage => ({
  id: row.id,
  relationshipId: row.relationship_id,
  direction: row.direction,
  body: row.body,
  sentAt: row.sent_at,
  status: row.status,
});

const mapRelationship = (row: RelationshipRow): DonorRelationship => ({
  id: row.id,
  organizationId: row.organization_id,
  donationId: row.donation_id,
  donorProfileId: row.donor_profile_id,
  donorName: row.donor_name,
  donorEmail: row.donor_email,
  donorAvatarUrl: row.donor_avatar_url,
  amountCents: row.amount_cents,
  donatedAt: row.donated_at,
  stage: row.stage,
  position: row.position,
  lastContactAt: row.last_contact_at,
  nextContactAt: row.next_contact_at,
  isTest: row.is_test,
  messages: (row.donor_relationship_messages ?? []).map(mapMessage),
});

export const loadDonorRelationships = async (
  organizationId: string,
): Promise<DonorRelationship[]> => {
  if (!supabase) {
    return DEMO_DONOR_RELATIONSHIPS.map((relationship) => ({
      ...relationship,
      organizationId,
    }));
  }

  const productionStartedAt = await loadProductionMetricBaseline();
  const { data, error } = await supabase
    .from("donor_relationships")
    .select(
      "id,organization_id,donation_id,donor_profile_id,donor_name,donor_email,donor_avatar_url,amount_cents,donated_at,stage,position,last_contact_at,next_contact_at,is_test,donor_relationship_messages(id,relationship_id,direction,body,sent_at,status)",
    )
    .eq("organization_id", organizationId)
    .eq("is_test", false)
    .gte("donated_at", productionStartedAt)
    .order("position", { ascending: true })
    .order("donated_at", { ascending: false });

  if (error) throw new Error(`after-donation-load-failed:${error.message}`);
  return ((data ?? []) as unknown as RelationshipRow[]).map(mapRelationship);
};

export const loadRecommendedContacts = async (
  organizationId: string,
  relationships: DonorRelationship[],
): Promise<RecommendedContact[]> => {
  if (!supabase) {
    return relationships.flatMap((relationship) =>
      buildRecommendedContactPlan({
        relationshipId: relationship.id,
        donorName: relationship.donorName,
        donatedAt: relationship.donatedAt,
      }),
    );
  }

  if (relationships.length === 0) return [];

  const { data, error } = await supabase
    .from("donor_contact_schedule")
    .select(
      "id,relationship_id,scheduled_for,contact_kind,title,status,donor_relationships(donor_name)",
    )
    .eq("organization_id", organizationId)
    .in("relationship_id", relationships.map((relationship) => relationship.id))
    .order("scheduled_for", { ascending: true });

  if (error) throw new Error(`after-donation-schedule-failed:${error.message}`);

  return ((data ?? []) as unknown as ScheduleRow[]).map((row) => {
    const joined = Array.isArray(row.donor_relationships)
      ? row.donor_relationships[0]
      : row.donor_relationships;

    return {
      id: row.id,
      relationshipId: row.relationship_id,
      donorName: joined?.donor_name ?? "Apoiador",
      scheduledFor: row.scheduled_for,
      kind: row.contact_kind,
      title: row.title,
      status: row.status,
    };
  });
};

export const moveDonorRelationship = async (input: {
  organizationId: string;
  relationshipId: string;
  stage: DonorRelationshipStage;
  position: number;
}): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase
    .from("donor_relationships")
    .update({ stage: input.stage, position: input.position })
    .eq("id", input.relationshipId)
    .eq("organization_id", input.organizationId);

  if (error) throw new Error(`after-donation-move-failed:${error.message}`);
};

export const sendDonorRelationshipMessage = async (input: {
  organizationId: string;
  relationshipId: string;
  body: string;
}): Promise<DonorRelationshipMessage> => {
  const sentAt = new Date().toISOString();

  if (!supabase) {
    return {
      id: `local-message-${Date.now()}`,
      relationshipId: input.relationshipId,
      direction: "organization_to_donor",
      body: input.body,
      sentAt,
      status: "sent",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("after-donation-auth-required");

  const { data, error } = await supabase
    .from("donor_relationship_messages")
    .insert({
      organization_id: input.organizationId,
      relationship_id: input.relationshipId,
      sender_profile_id: user.id,
      direction: "organization_to_donor",
      message_kind: "text",
      body: input.body.trim(),
      status: "sent",
      sent_at: sentAt,
    })
    .select("id,relationship_id,direction,body,sent_at,status")
    .single();

  if (error) throw new Error(`after-donation-message-failed:${error.message}`);
  return mapMessage(data as MessageRow);
};
