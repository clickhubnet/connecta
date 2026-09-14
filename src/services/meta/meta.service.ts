import type { MetaTemplate } from "./template";

type MetaConfig = { accessToken: string; phoneNumberId: string; businessAccountId: string; apiVersion: string };

export class MetaApiError extends Error {
  constructor(message: string, public readonly uncertain = false, public readonly statusCode = 502) { super(message); }
}

export function getMetaConfig(): MetaConfig {
  const config = {
    accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN?.trim() ?? "",
    phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "",
    businessAccountId: process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() ?? "",
    apiVersion: process.env.META_GRAPH_API_VERSION?.trim() ?? "",
  };
  if (!config.accessToken || !/^\d+$/.test(config.phoneNumberId) || !/^\d+$/.test(config.businessAccountId) || !/^v\d+\.0$/.test(config.apiVersion)) {
    throw new MetaApiError("Configure no servidor o token, Phone Number ID, WABA ID e a versão da API da Meta. Consulte docs/meta-envio-em-massa.md.", false, 503);
  }
  return config;
}

export class MetaService {
  constructor(private readonly configProvider = getMetaConfig, private readonly fetcher: typeof fetch = fetch) {}

  private async request<T>(path: string, body?: unknown): Promise<T> {
    const config = this.configProvider();
    const sending = body !== undefined;
    let response: Response;
    try {
      response = await this.fetcher(`https://graph.facebook.com/${config.apiVersion}/${path}`, {
        method: sending ? "POST" : "GET",
        headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
        ...(sending ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new MetaApiError(sending ? "Sem confirmação da Meta. Verifique antes de reenviar para evitar duplicidade." : "Não foi possível consultar a Meta. Tente novamente.", sending);
    }
    let payload: T & { error?: { code?: number } };
    try { payload = await response.json(); } catch {
      throw new MetaApiError("Resposta inválida da Meta. Verifique o status antes de reenviar.", sending);
    }
    if (!response.ok || payload?.error) {
      const code = payload?.error?.code;
      const hints: Record<number, string> = {
        190: "Token inválido ou expirado.", 10: "Token sem permissão para esta operação.",
        200: "Verifique as permissões e os ativos vinculados ao token.",
        130429: "Limite de envio da Meta atingido.", 131048: "Envio limitado pela qualidade da conta.",
        131026: "Mensagem não pôde ser entregue a este contato.",
        132000: "As variáveis não correspondem ao template.", 132001: "Template ou idioma não encontrado.",
        132015: "Template pausado.", 132016: "Template desativado.",
      };
      // Do not expose provider response bodies: they may contain tokens or personal data.
      throw new MetaApiError(`Meta${typeof code === "number" ? ` (${code})` : ` (HTTP ${response.status})`}: ${hints[code ?? 0] ?? "A solicitação não foi concluída. Verifique a conta e o template no WhatsApp Manager."}`, sending && response.status >= 500);
    }
    return payload;
  }

  async listTemplates(name?: string): Promise<MetaTemplate[]> {
    const config = this.configProvider();
    const templates: MetaTemplate[] = [];
    let after: string | undefined;
    for (let page = 0; page < 50; page++) {
      const query = new URLSearchParams({ fields: "id,name,language,status,category,components,parameter_format", limit: "100" });
      if (name) query.set("name", name);
      if (after) query.set("after", after);
      const result = await this.request<{ data: MetaTemplate[]; paging?: { next?: string; cursors?: { after?: string } } }>(`${config.businessAccountId}/message_templates?${query}`);
      if (!Array.isArray(result?.data)) throw new MetaApiError("A Meta retornou uma lista de templates inválida.");
      templates.push(...result.data.filter((item) => item.status === "APPROVED"));
      if (!result.paging?.next) return templates;
      const cursor = result.paging.cursors?.after;
      if (!cursor || cursor === after) throw new MetaApiError("Não foi possível carregar todas as páginas de templates.");
      after = cursor;
    }
    throw new MetaApiError("A conta possui templates demais para carregar nesta etapa.");
  }

  async sendTemplate(phone: string, template: Record<string, unknown>) {
    const config = this.configProvider();
    const result = await this.request<{ messages?: Array<{ id?: string }> }>(`${config.phoneNumberId}/messages`, {
      messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "template", template,
    });
    const id = result?.messages?.[0]?.id;
    if (!id) throw new MetaApiError("A Meta não confirmou o identificador da mensagem. Verifique antes de reenviar.", true);
    return id;
  }
}
