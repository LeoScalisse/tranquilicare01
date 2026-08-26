import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HeartHandshake, Loader2, MoveRight, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AFTER_DONATION_STAGES,
  type DonorRelationship,
  type DonorRelationshipStage,
} from "@/lib/afterDonation";
import { cn } from "@/lib/utils";

const messageSuggestions = [
  "Obrigado por fazer parte desta história.",
  "Temos uma nova história para compartilhar com você.",
  "Seu apoio já está gerando impacto. Veja esta atualização.",
];

export const DonorConversationDialog = ({
  relationship,
  onClose,
  onSend,
  onMove,
}: {
  relationship: DonorRelationship | null;
  onClose: () => void;
  onSend: (body: string) => Promise<void>;
  onMove: (stage: DonorRelationshipStage) => Promise<void>;
}) => {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!relationship) setBody("");
  }, [relationship]);

  const nextStageIndex = relationship
    ? AFTER_DONATION_STAGES.findIndex((stage) => stage.id === relationship.stage) + 1
    : -1;
  const nextStage = AFTER_DONATION_STAGES[nextStageIndex];

  const submit = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await onSend(body.trim());
      setBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={Boolean(relationship)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-hidden rounded-[28px] border-sky-100 p-0"
      >
        {relationship ? (
          <>
            <DialogHeader className="border-b border-slate-100 bg-sky-50/70 p-6 pr-14 text-left">
              <DialogTitle>Conversa com {relationship.donorName}</DialogTitle>
              <DialogDescription>
                Compartilhe histórias e resultados relacionados a esta doação.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[300px] px-6 py-5">
              <div className="space-y-3">
                {relationship.messages.length ? (
                  relationship.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        message.direction === "organization_to_donor"
                          ? "ml-auto rounded-br-md bg-sky-500 text-white"
                          : "rounded-bl-md bg-slate-100 text-slate-800",
                      )}
                    >
                      {message.body}
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          message.direction === "organization_to_donor"
                            ? "text-sky-100"
                            : "text-slate-400",
                        )}
                      >
                        {format(new Date(message.sentAt), "d MMM, HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="grid place-items-center rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 px-6 py-10 text-center">
                    <HeartHandshake className="h-8 w-8 text-sky-500" />
                    <p className="mt-3 text-sm font-bold text-slate-900">
                      Comece pelo acolhimento
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                      O doador poderá acompanhar aqui os conteúdos que mostram como o apoio
                      gerou impacto.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-slate-100 bg-white p-5">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {messageSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setBody(suggestion)}
                    className="shrink-0 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <label
                htmlFor={`relationship-message-${relationship.id}`}
                className="sr-only"
              >
                Mensagem para {relationship.donorName}
              </label>
              <textarea
                id={`relationship-message-${relationship.id}`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
                placeholder="Conte uma atualização com cuidado e transparência..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                {nextStage ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onMove(nextStage.id)}
                  >
                    Avançar para {nextStage.label}
                    <MoveRight />
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700">
                    Ciclo concluído
                  </span>
                )}
                <Button
                  type="button"
                  onClick={submit}
                  disabled={!body.trim() || sending}
                >
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                  Enviar atualização
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
