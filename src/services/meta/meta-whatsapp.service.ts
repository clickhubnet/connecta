import { MetaService, type MetaConfig } from "@/services/meta/meta.service";

type SendTextInput = {
  phone: string;
  message: string;
  delayTypingSeconds?: number;
  config?: MetaConfig | null;
};

type SendMediaInput = {
  phone: string;
  config?: MetaConfig | null;
};

export class MetaWhatsappService {
  constructor(private readonly metaService = new MetaService()) {}

  private service(config?: MetaConfig | null) {
    return config ? new MetaService(() => config) : this.metaService;
  }

  async markAsRead(messageId: string, config?: MetaConfig | null) {
    return this.service(config).markAsRead(messageId).catch(() => false);
  }

  async sendText({ phone, message, delayTypingSeconds, config }: SendTextInput) {
    if (delayTypingSeconds) {
      await wait(Math.min(15, Math.max(1, Math.round(delayTypingSeconds))) * 1000);
    }
    return this.service(config).sendText(phone, message);
  }

  async sendImage({ phone, image, caption, config }: SendMediaInput & { image: string; caption?: string }) {
    return this.service(config).sendMedia({ phone, type: "image", media: image, caption, mimeType: mimeTypeFromDataUrl(image) });
  }

  async sendDocument({ phone, document, fileName, caption, config }: SendMediaInput & { document: string; fileName: string; caption?: string }) {
    return this.service(config).sendMedia({ phone, type: "document", media: document, fileName, caption, mimeType: mimeTypeFromDataUrl(document) });
  }

  async sendAudio({ phone, audio, config }: SendMediaInput & { audio: string }) {
    return this.service(config).sendMedia({ phone, type: "audio", media: audio, mimeType: mimeTypeFromDataUrl(audio) });
  }

  async sendVideo({ phone, video, caption, config }: SendMediaInput & { video: string; caption?: string }) {
    return this.service(config).sendMedia({ phone, type: "video", media: video, caption, mimeType: mimeTypeFromDataUrl(video) });
  }

  async downloadMediaAsDataUrl(mediaId: string, config?: MetaConfig | null) {
    return this.service(config).downloadMediaAsDataUrl(mediaId);
  }
}

function mimeTypeFromDataUrl(dataUrl: string) {
  return dataUrl.match(/^data:([^;,]+)/)?.[1];
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
