import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  Unplug,
} from "lucide-react";

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
}: {
  organizationId: string;
  api?: MercadoPagoConnectionApi;
  onNavigate?: (url: string) => void;
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
      if (url.protocol !== "https:" || url.hostname !== "auth.mercadopago.com.br") {
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
      <section className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando recebimentos…
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="overflow-hidden rounded-2xl border border-brand-blue/20 bg-gradient-to-br from-white via-sky-50/80 to-brand-yellow/10 shadow-[0_18px_50px_-34px_rgba(20,174,239,0.8)]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-blue text-white shadow-lg shadow-brand-blue/20">
              <CircleDollarSign size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-brand-ink">
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
                <p className="mt-2 text-sm font-medium text-red-600">
                  Não foi possível concluir esta ação. Tente novamente.
                </p>
              )}
            </div>
          </div>

          {status.connected ? (
            <button
              type="button"
              disabled={busy}
              onClick={disconnect}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-ink/15 bg-white px-4 text-sm font-bold text-brand-ink transition hover:border-red-300 hover:text-red-600 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug size={17} />}
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={connect}
              className="tc-button-3d inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 font-bold text-white disabled:opacity-60"
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
