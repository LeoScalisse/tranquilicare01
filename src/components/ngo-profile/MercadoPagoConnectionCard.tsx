import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  Unplug,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export interface MercadoPagoConnectionStatus {
  connected: boolean;
  status?: string | null;
  liveMode?: boolean;
  expiresAt?: string | null;
}

export interface MercadoPagoConnectionApi {
  status(organizationId: string): Promise<MercadoPagoConnectionStatus>;
  connect(organizationId: string): Promise<{ authorizationUrl: string }>;
  disconnect(organizationId: string): Promise<void>;
}

const invoke = async <T,>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> => {
  if (!supabase) throw new Error("payments-not-configured");
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
  });
  if (error) throw error;
  if (!data) throw new Error("mercado-pago-empty-response");
  return data;
};

const defaultApi: MercadoPagoConnectionApi = {
  status: (organizationId) =>
    invoke<MercadoPagoConnectionStatus>("mercado-pago-connection", {
      organizationId,
      action: "status",
    }),
  connect: (organizationId) =>
    invoke<{ authorizationUrl: string }>("mercado-pago-connect", {
      organizationId,
    }),
  disconnect: async (organizationId) => {
    await invoke<MercadoPagoConnectionStatus>("mercado-pago-connection", {
      organizationId,
      action: "disconnect",
    });
  },
};

export const MercadoPagoConnectionCard = ({
  organizationId,
  api = defaultApi,
  onNavigate = (url: string) => window.location.assign(url),
  embedded = false,
}: {
  organizationId: string;
  api?: MercadoPagoConnectionApi;
  onNavigate?: (url: string) => void;
  embedded?: boolean;
}) => {
  const [status, setStatus] = useState<MercadoPagoConnectionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    api.status(organizationId).then(
      (next) => active && setStatus(next),
      () => {
        if (active) {
          setStatus({ connected: false });
          setError(true);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [api, organizationId]);

  const connect = async () => {
    setBusy(true);
    setError(false);
    try {
      const result = await api.connect(organizationId);
      const url = new URL(result.authorizationUrl);
      if (url.protocol !== "https:" || url.hostname !== "auth.mercadopago.com") {
        throw new Error("mercado-pago-authorization-url-invalid");
      }
      onNavigate(url.toString());
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(false);
    try {
      await api.disconnect(organizationId);
      setStatus({ connected: false, liveMode: status?.liveMode });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <section
        className={cn("w-full", !embedded && "mx-auto max-w-6xl px-4 pt-6")}
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex min-h-32 items-center gap-3 rounded-2xl border border-brand-blue/20 bg-white/75 px-5 py-6 text-sm font-medium text-muted-foreground shadow-[0_18px_45px_-36px_rgba(20,174,239,0.75)]">
          <Loader2 className="h-5 w-5 animate-spin text-brand-blue" />
          Verificando a configuração dos recebimentos…
        </div>
      </section>
    );
  }

  return (
    <section className={cn("w-full", !embedded && "mx-auto max-w-6xl px-4 pt-6")}>
      <div className="relative overflow-hidden rounded-[24px] border-2 border-brand-blue/25 bg-[radial-gradient(circle_at_100%_0%,rgba(255,219,72,0.28),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(232,248,255,0.96))] shadow-[0_24px_55px_-35px_rgba(20,174,239,0.85)]">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full border-[24px] border-brand-yellow/15" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-blue text-white shadow-[0_12px_26px_-12px_rgba(20,174,239,0.9)]">
              <CircleDollarSign size={24} />
            </div>
            <div>
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-brand-blue">
                Conta de recebimento
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-brand-ink">
                  {status.connected
                    ? "Mercado Pago conectado"
                    : "Mercado Pago ainda não conectado"}
                </h2>
                {status.connected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> Ativo
                  </span>
                )}
                <span className="rounded-full bg-brand-ink/5 px-2.5 py-1 text-xs font-bold text-brand-ink/65">
                  {status.liveMode ? "Produção" : "Teste"}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {status.connected
                  ? "Sua conta está pronta para receber doações via PIX com a taxa do TranquiliCare separada automaticamente."
                  : "Conecte a conta verificada da organização para receber doações reais diretamente pelo Split 1:1."}
              </p>
              {error && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
                  Não foi possível concluir esta ação. Verifique sua conexão e tente novamente.
                </p>
              )}
            </div>
          </div>

          {status.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={disconnect}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-ink/15 bg-white px-5 text-sm font-bold text-brand-ink transition-[border-color,color,transform,box-shadow] duration-200 hover:border-red-300 hover:text-red-600 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/20 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug size={17} />}
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={connect}
              className="tc-button-3d inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl px-6 font-bold text-white transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink size={17} />}
              Conectar Mercado Pago
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default MercadoPagoConnectionCard;
