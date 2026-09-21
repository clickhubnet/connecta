import type { MetaTemplate } from "./template";

type MetaConfig = { accessToken: string; phoneNumberId: string; businessAccountId: string; apiVersion: string };
type MediaKind = "image" | "video" | "audio" | "document";

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

  private graphUrl(path: string) {
    const config = this.configProvider();
    return `https://graph.facebook.com/${config.apiVersion}/${path}`;
  }

  private bearerHeaders(extra?: HeadersInit) {
    const config = this.configProvider();
    return { Authorization: `Bearer ${config.accessToken}`, ...extra };
  }

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
        131047: "A janela de atendimento de 24 horas está fechada. Envie um template aprovado ou aguarde o cliente responder.",
        132000: "As variáveis não correspondem ao template.", 132001: "Template ou idioma não encontrado.",
        132015: "Template pausado.", 132016: "Template desativado.",
      };
      // Do not expose provider response bodies: they may contain tokens or personal data.
      throw new MetaApiError(`Meta${typeof code === "number" ? ` (${code})` : ` (HTTP ${response.status})`}: ${hints[code ?? 0] ?? "A solicitação não foi concluída. Verifique a conta e o template no WhatsApp Manager."}`, sending && response.status >= 500);
    }
    return payload;
  }

  private async requestRaw<T>(path: string, init: RequestInit, sending = false): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(this.graphUrl(path), {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
        ...init,
      });
    } catch {
      throw new MetaApiError(sending ? "Sem confirmação da Meta. Verifique antes de reenviar para evitar duplicidade." : "Não foi possível consultar a Meta. Tente novamente.", sending);
    }

    const text = await response.text();
    let payload: (T & { error?: { code?: number } }) | null = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new MetaApiError("Resposta inválida da Meta. Verifique o status antes de reenviar.", sending);
    }

    if (!response.ok || payload?.error) {
      const code = payload?.error?.code;
      throw new MetaApiError(`Meta${typeof code === "number" ? ` (${code})` : ` (HTTP ${response.status})`}: A solicitação não foi concluída. Verifique a conta e as permissões no WhatsApp Manager.`, sending && response.status >= 500);
    }

    return payload as T;
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

  async sendText(phone: string, message: string) {
    const config = this.configProvider();
    const result = await this.request<{ messages?: Array<{ id?: string }> }>(`${config.phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "text",
      text: { preview_url: false, body: message },
    });
    const id = result?.messages?.[0]?.id;
    if (!id) throw new MetaApiError("A Meta não confirmou o identificador da mensagem. Verifique antes de reenviar.", true);
    return id;
  }

  async markAsRead(messageId: string) {
    const config = this.configProvider();
    await this.request(`${config.phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
    return true;
  }

  async sendMedia(input: {
    phone: string;
    type: MediaKind;
    media: string;
    fileName?: string;
    caption?: string;
    mimeType?: string;
  }) {
    const config = this.configProvider();
    const mediaObject = input.media.startsWith("http://") || input.media.startsWith("https://")
      ? { link: input.media }
      : { id: await this.uploadMedia(input.media, input.mimeType, input.fileName) };
    const payloadMedia = {
      ...mediaObject,
      ...(input.caption && input.type !== "audio" ? { caption: input.caption } : {}),
      ...(input.fileName && input.type === "document" ? { filename: input.fileName } : {}),
    };
    const result = await this.request<{ messages?: Array<{ id?: string }> }>(`${config.phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.phone,
      type: input.type,
      [input.type]: payloadMedia,
    });
    const id = result?.messages?.[0]?.id;
    if (!id) throw new MetaApiError("A Meta não confirmou o identificador da mídia. Verifique antes de reenviar.", true);
    return id;
  }

  async uploadMedia(dataUrl: string, mimeType?: string, fileName?: string) {
    const config = this.configProvider();
    const parsed = parseDataUrl(dataUrl, mimeType, fileName);
    const formData = new FormData();
    formData.set("messaging_product", "whatsapp");
    formData.set("file", new File([parsed.bytes], parsed.fileName, { type: parsed.mimeType }));
    const result = await this.requestRaw<{ id?: string }>(`${config.phoneNumberId}/media`, {
      method: "POST",
      headers: this.bearerHeaders(),
      body: formData,
    }, true);
    if (!result.id) throw new MetaApiError("A Meta não confirmou o upload da mídia.");
    return result.id;
  }

  async getMediaUrl(mediaId: string) {
    const result = await this.request<{ url?: string; mime_type?: string; sha256?: string; file_size?: number }>(mediaId);
    if (!result.url) throw new MetaApiError("A Meta não retornou a URL da mídia recebida.");
    return result;
  }

  async downloadMediaAsDataUrl(mediaId: string) {
    const media = await this.getMediaUrl(mediaId);
    const mediaUrl = media.url;
    if (!mediaUrl) throw new MetaApiError("A Meta não retornou a URL da mídia recebida.");
    const response = await this.fetcher(mediaUrl, {
      headers: this.bearerHeaders(),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new MetaApiError("Não foi possível baixar a mídia recebida da Meta.");
    const mimeType = media.mime_type ?? response.headers.get("content-type") ?? "application/octet-stream";
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
      mimeType,
      size: bytes.byteLength,
    };
  }
}

function parseDataUrl(dataUrl: string, fallbackMimeType?: string, fallbackFileName?: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!match) {
    throw new MetaApiError("A mídia precisa estar em formato data URL ou URL pública HTTPS.");
  }

  const mimeType = match[1] || fallbackMimeType || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  const bytes = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
  const fileName = fallbackFileName || `media.${extensionFromMime(mimeType)}`;
  return { bytes, mimeType, fileName };
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("pdf")) return "pdf";
  return "bin";
}
