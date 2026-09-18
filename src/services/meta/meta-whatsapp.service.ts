import { MetaService } from "@/services/meta/meta.service";

type SendTextInput = {
  phone: string;
  message: string;
  delayTypingSeconds?: number;
  config?: unknown;
};

type SendMediaInput = {
  phone: string;
  config?: unknown;
};

export class MetaWhatsappService {
  constructor(private readonly metaService = new MetaService()) {}

  async markAsRead(messageId: string) {
    return this.metaService.markAsRead(messageId).catch(() => false);
  }

  async sendText({ phone, message, delayTypingSeconds }: SendTextInput) {
    if (delayTypingSeconds) {
      await wait(Math.min(15, Math.max(1, Math.round(delayTypingSeconds))) * 1000);
    }
    return this.metaService.sendText(phone, message);
  }

  async sendImage({ phone, image, caption }: SendMediaInput & { image: string; caption?: string }) {
    return this.metaService.sendMedia({ phone, type: "image", media: image, caption, mimeType: mimeTypeFromDataUrl(image) });
  }

  async sendDocument({ phone, document, fileName, caption }: SendMediaInput & { document: string; fileName: string; caption?: string }) {
    return this.metaService.sendMedia({ phone, type: "document", media: document, fileName, caption, mimeType: mimeTypeFromDataUrl(document) });
  }

  async sendAudio({ phone, audio }: SendMediaInput & { audio: string }) {
    return this.metaService.sendMedia({ phone, type: "audio", media: audio, mimeType: mimeTypeFromDataUrl(audio) });
  }

  async sendVideo({ phone, video, caption }: SendMediaInput & { video: string; caption?: string }) {
    return this.metaService.sendMedia({ phone, type: "video", media: video, caption, mimeType: mimeTypeFromDataUrl(video) });
  }

  async downloadMediaAsDataUrl(mediaId: string) {
    return this.metaService.downloadMediaAsDataUrl(mediaId);
  }
}

function mimeTypeFromDataUrl(dataUrl: string) {
  return dataUrl.match(/^data:([^;,]+)/)?.[1];
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
