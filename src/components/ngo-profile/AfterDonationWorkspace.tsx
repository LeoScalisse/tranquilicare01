import { useEffect, useState, type DragEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  HeartHandshake,
  Loader2,
  Mail,
  MessageCircleMore,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { DonorConversationDialog } from "@/components/ngo-profile/DonorConversationDialog";
import { RelationshipContactCalendar } from "@/components/ngo-profile/RelationshipContactCalendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  AFTER_DONATION_STAGES,
  buildRecommendedContactPlan,
  type DonorRelationship,
  type DonorRelationshipMessage,
  type DonorRelationshipStage,
  type RecommendedContact,
} from "@/lib/afterDonation";
import {
  loadDonorRelationships,
  loadRecommendedContacts,
  moveDonorRelationship,
  sendDonorRelationshipMessage,
} from "@/lib/afterDonationRepository";
import { cn } from "@/lib/utils";

interface SendMessageInput {
  organizationId: string;
  relationshipId: string;
  body: string;
}

interface AfterDonationWorkspaceProps {
  organizationId: string;
  initialRelationships?: DonorRelationship[];
  /** Public-only fixture mode: shows the workspace without changing data. */
  demoMode?: boolean;
  onSendMessage?: (
    input: SendMessageInput,
  ) =>
    | Promise<DonorRelationshipMessage | void>
    | DonorRelationshipMessage
    | void;
}

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const RelationshipCard = ({
  relationship,
  onOpen,
  onNativeDragStart,
  readOnly = false,
}: {
  relationship: DonorRelationship;
  onOpen: () => void;
  onNativeDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  readOnly?: boolean;
}) => (
  <motion.button
    layout
    type="button"
    draggable={!readOnly}
    disabled={readOnly}
    onDragStartCapture={onNativeDragStart}
    onClick={onOpen}
    aria-label={`Abrir relacionamento com ${relationship.donorName}`}
    className={cn(
      "group w-full rounded-[20px] border border-slate-200/90 bg-white p-4 text-left shadow-[0_10px_28px_-20px_rgba(15,23,42,0.45)] transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
      readOnly
        ? "cursor-default opacity-90"
        : "cursor-grab hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_16px_36px_-22px_rgba(14,165,233,0.55)] active:cursor-grabbing",
    )}
  >
    <div className="flex items-start gap-3">
      <Avatar className="h-10 w-10 border border-sky-100">
        {relationship.donorAvatarUrl ? (
          <AvatarImage src={relationship.donorAvatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="bg-sky-50 text-xs font-bold text-sky-700">
          {initials(relationship.donorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-900">
            {relationship.donorName}
          </p>
          {relationship.isTest ? (
            <span className="shrink-0 rounded-full bg-brand-yellow/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-800">
              Teste
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {format(new Date(relationship.donatedAt), "d 'de' MMMM", {
            locale: ptBR,
          })}
        </p>
      </div>
      <MessageCircleMore className="h-4 w-4 text-slate-300 transition-colors group-hover:text-sky-500" />
    </div>
    <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Doação
        </p>
        <p className="mt-0.5 text-base font-black text-slate-900">
          {money.format(relationship.amountCents / 100)}
        </p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
        <Clock3 className="h-3 w-3" />
        {relationship.messages.length
          ? `${relationship.messages.length} contato${relationship.messages.length > 1 ? "s" : ""}`
          : "Novo apoio"}
      </span>
    </div>
  </motion.button>
);

export const AfterDonationWorkspace = ({
  organizationId,
  initialRelationships,
  demoMode = false,
  onSendMessage,
}: AfterDonationWorkspaceProps) => {
  const isLocalPrototype = initialRelationships !== undefined;
  const [relationships, setRelationships] = useState<DonorRelationship[]>(
    initialRelationships ?? [],
  );
  const [contacts, setContacts] = useState<RecommendedContact[]>(() =>
    (initialRelationships ?? []).flatMap((relationship) =>
      buildRecommendedContactPlan({
        relationshipId: relationship.id,
        donorName: relationship.donorName,
        donatedAt: relationship.donatedAt,
      }),
    ),
  );
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(
    null,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(!initialRelationships);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (initialRelationships) return;
    let cancelled = false;

    const load = async () => {
      try {
        const nextRelationships = await loadDonorRelationships(organizationId);
        const nextContacts = await loadRecommendedContacts(
          organizationId,
          nextRelationships,
        );
        if (!cancelled) {
          setRelationships(nextRelationships);
          setContacts(nextContacts);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialRelationships, organizationId]);

  const selectedRelationship =
    relationships.find(
      (relationship) => relationship.id === selectedRelationshipId,
    ) ?? null;

  const moveRelationship = async (
    relationshipId: string,
    stage: DonorRelationshipStage,
  ) => {
    const previous = relationships;
    const position = relationships.filter((item) => item.stage === stage).length;
    setRelationships((current) =>
      current.map((item) =>
        item.id === relationshipId ? { ...item, stage, position } : item,
      ),
    );

    try {
      if (!isLocalPrototype) {
        await moveDonorRelationship({
          organizationId,
          relationshipId,
          stage,
          position,
        });
      }
    } catch {
      setRelationships(previous);
      toast.error("Não foi possível mover este relacionamento.");
    }
  };

  const sendMessage = async (body: string) => {
    if (!selectedRelationship) return;
    const input = {
      organizationId,
      relationshipId: selectedRelationship.id,
      body,
    };
    const result = onSendMessage
      ? await onSendMessage(input)
      : isLocalPrototype
        ? undefined
        : await sendDonorRelationshipMessage(input);
    const message: DonorRelationshipMessage =
      result && typeof result === 'object' ? result : {
        id: `optimistic-${Date.now()}`,
        relationshipId: selectedRelationship.id,
        direction: "organization_to_donor",
        body,
        sentAt: new Date().toISOString(),
        status: "sent",
      };

    setRelationships((current) =>
      current.map((item) =>
        item.id === selectedRelationship.id
          ? {
              ...item,
              messages: [...item.messages, message],
              lastContactAt: message.sentAt,
            }
          : item,
      ),
    );
  };

  const totalAmount = relationships.reduce(
    (total, relationship) => total + relationship.amountCents,
    0,
  );

  return (
    <section className="overflow-hidden rounded-[30px] border border-sky-100 bg-[linear-gradient(145deg,#f8fdff_0%,#eefaff_48%,#ffffff_100%)] shadow-[0_24px_80px_-50px_rgba(2,132,199,0.45)]">
      <div className="flex flex-col gap-5 border-b border-sky-100 px-5 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-sky-700 shadow-sm ring-1 ring-sky-100">
            <Sparkles className="h-3.5 w-3.5" />
            {demoMode ? "Demonstração visual" : "Depois da doação"}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Radar de relacionamento
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            {demoMode
              ? "Uma prévia visual de como a organização acompanha apoios, contatos e próximos passos."
              : "Acompanhe cada apoio com cuidado, compartilhe impacto e mantenha a história viva por 30 dias."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setCalendarOpen(true)}
          aria-label="Abrir calendário de contatos"
          className="h-11 rounded-full border-sky-200 bg-white px-5 text-sky-700 hover:bg-sky-50"
        >
          <CalendarDays />
          Calendário de contatos
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-sky-100 bg-sky-100 sm:grid-cols-3">
        {[
          {
            label: "Doadores no radar",
            value: relationships.length.toString(),
            icon: HeartHandshake,
          },
          {
            label: "Apoios acompanhados",
            value: money.format(totalAmount / 100),
            icon: Sparkles,
          },
          {
            label: "Contatos planejados",
            value: contacts.length.toString(),
            icon: CalendarDays,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-white/80 px-5 py-4 last:col-span-2 sm:last:col-span-1"
          >
            <metric.icon className="h-4 w-4 text-sky-500" />
            <p className="mt-2 text-lg font-black text-slate-900">{metric.value}</p>
            <p className="text-xs text-slate-500">{metric.label}</p>
          </div>
        ))}
      </div>

      {demoMode && (
        <div className="border-b border-sky-100 bg-white px-5 py-6 sm:px-7">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h3 className="text-base font-black text-slate-900">Visão dos doadores</h3>
            <span className="text-xs text-slate-500">Dados demonstrativos</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-left text-sm" aria-label="Resumo demonstrativo de doadores">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Pessoa</th>
                  <th className="px-4 py-3 font-bold">Apoio</th>
                  <th className="px-4 py-3 font-bold">Último contato</th>
                  <th className="px-4 py-3 font-bold">Próximo passo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {relationships.slice(0, 5).map((relationship) => (
                  <tr key={`demo-table-${relationship.id}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{relationship.donorName}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money.format(relationship.amountCents / 100)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{relationship.lastContactAt ? format(new Date(relationship.lastContactAt), "d MMM", { locale: ptBR }) : "Ainda sem contato"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{relationship.nextContactAt ? format(new Date(relationship.nextContactAt), "d MMM", { locale: ptBR }) : "Ciclo concluído"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          Organizando relacionamentos...
        </div>
      ) : loadError ? (
        <div className="m-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Não foi possível carregar o Radar. Confira se a migration foi aplicada no
          Supabase.
        </div>
      ) : relationships.length === 0 ? (
        <div className="m-6 grid min-h-64 place-items-center rounded-[24px] border border-dashed border-sky-200 bg-white/70 p-8 text-center">
          <div>
            <Mail className="mx-auto h-9 w-9 text-sky-400" />
            <h3 className="mt-3 font-bold text-slate-900">
              O primeiro apoio vai aparecer aqui
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Quando uma doação for confirmada, o relacionamento e o plano de
              contatos serão criados automaticamente.
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="w-full">
          <div className="flex min-w-max gap-4 p-5 sm:p-7">
            {AFTER_DONATION_STAGES.map((stage) => {
              const stageRelationships = relationships
                .filter((relationship) => relationship.stage === stage.id)
                .sort((a, b) => a.position - b.position);

              return (
                <div
                  key={stage.id}
                  className="w-[272px] shrink-0 rounded-[24px] border border-white/90 bg-white/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                  onDragOver={demoMode ? undefined : (event) => event.preventDefault()}
                  onDrop={(event) => {
                    if (demoMode) return;
                    event.preventDefault();
                    const relationshipId = event.dataTransfer.getData(
                      "text/relationship-id",
                    );
                    if (relationshipId) {
                      void moveRelationship(relationshipId, stage.id);
                    }
                  }}
                >
                  <div className="px-1 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-2.5 w-2.5 rounded-full", stage.accent)}
                      />
                      <h3 className="text-sm font-black text-slate-900">
                        {stage.label}
                      </h3>
                      <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                        {stageRelationships.length}
                      </span>
                    </div>
                    <p className="mt-1 pl-[18px] text-[11px] text-slate-500">
                      {stage.description}
                    </p>
                  </div>
                  <div className="min-h-28 space-y-2">
                    <AnimatePresence>
                      {stageRelationships.map((relationship) => (
                        <RelationshipCard
                          key={relationship.id}
                          relationship={relationship}
                          onOpen={() =>
                            setSelectedRelationshipId(relationship.id)
                          }
                          onNativeDragStart={(event) => {
                            if (demoMode) return;
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData(
                              "text/relationship-id",
                              relationship.id,
                            );
                          }}
                          readOnly={demoMode}
                        />
                      ))}
                    </AnimatePresence>
                    {!stageRelationships.length ? (
                      <div className="grid min-h-24 place-items-center rounded-2xl border border-dashed border-slate-200 text-center text-[11px] text-slate-400">
                        Arraste uma história para cá
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <DonorConversationDialog
        relationship={selectedRelationship}
        onClose={() => setSelectedRelationshipId(null)}
        onSend={sendMessage}
        onMove={(stage) =>
          selectedRelationship
            ? moveRelationship(selectedRelationship.id, stage)
            : Promise.resolve()
        }
      />

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent
          className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-[28px] border-sky-100 p-5 sm:p-7"
          aria-describedby="contact-calendar-description"
        >
          <DialogHeader className="pr-10 text-left">
            <DialogTitle>Calendário de contatos</DialogTitle>
            <DialogDescription>
              Um guia de 2 a 3 contatos por semana. A ONG decide quando enviar cada
              conteúdo.
            </DialogDescription>
          </DialogHeader>
          <RelationshipContactCalendar contacts={contacts} />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AfterDonationWorkspace;
