import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { massMessageSchema, parseContacts, type MassMessageInput } from "@/modules/envio-em-massa/schemas/mass-message.schema";
import { MetaApiError, MetaService } from "@/services/meta/meta.service";
import { buildTemplate, unsupportedTemplateReason, type MetaTemplate } from "@/services/meta/template";

type ContactResult = {
  phone: string;
  status: "accepted" | "failed" | "uncertain";
  detail: string;
  providerMessageId?: string;
};

export type MassTemplateOption = MetaTemplate & {
  unsupportedReason: string | null;
  headerVariables: string[];
  bodyVariables: string[];
  hasMediaHeader: boolean;
  previewText: string;
};

export type MassMessageResult = {
  total: number;
  accepted: number;
  failed: number;
  uncertain: number;
  contacts: ContactResult[];
};

export class MassMessageValidationError extends Error {
  readonly statusCode = 400;
}

const CONCURRENCY = 5;

export class MassMessageService {
  constructor(private readonly metaService = new MetaService()) {}

  async listTemplates(): Promise<MassTemplateOption[]> {
    const templates = await this.metaService.listTemplates();
    return templates.map((template) => toTemplateOption(template));
  }

  async send(rawInput: unknown, user?: { id: string; role: string }): Promise<MassMessageResult> {
    const input = parseInput(rawInput);
    const contacts = parseValidation(() => parseContacts(input.contactsText));
    let templatePayload: Record<string, unknown> | undefined;
    let templateName = input.templateName;
    if (input.mode === "template") {
    const templates = await this.metaService.listTemplates();
    const template = templates.find((item) => input.templateId ? item.id === input.templateId : item.name === input.templateName && item.language === input.language);

    if (!template) {
      throw new MassMessageValidationError("Template aprovado não encontrado nesta conta da Meta.");
    }
    templateName = template.name;

    const headerFormat = template.components.find((item) => item.type === "HEADER")?.format?.toLowerCase();
    if (input.mediaType && input.mediaType !== headerFormat) throw new MassMessageValidationError("O tipo de mídia não corresponde ao cabeçalho do template aprovado.");
    templatePayload = parseValidation(() => buildTemplate(template, {
      headerValues: input.headerValues,
      bodyValues: input.bodyValues,
      mediaUrl: input.mediaUrl.trim(),
    }));
    }

    const results = await mapWithConcurrency(contacts, CONCURRENCY, async (phone): Promise<ContactResult> => {
      try {
        const providerMessageId = input.mode === "text"
          ? await this.metaService.sendText(phone, input.message)
          : await this.metaService.sendTemplate(phone, templatePayload!);
        await registerDispatchConversation({
          phone,
          user,
          body: input.mode === "text" ? input.message : `Template Meta: ${templateName}`,
          providerMessageId,
          mode: input.mode,
          templateName: input.mode === "template" ? templateName : undefined,
        });
        return {
          phone,
          status: "accepted",
          detail: "Mensagem aceita pela Meta para processamento.",
          providerMessageId,
        };
      } catch (error) {
        if (isUncertainMetaError(error)) {
          return {
            phone,
            status: "uncertain",
            detail: error instanceof Error ? error.message : "Sem confirmação da Meta. Verifique antes de reenviar.",
          };
        }

        return {
          phone,
          status: "failed",
          detail: error instanceof Error ? error.message : "Falha ao enviar.",
        };
      }
    });

    return {
      total: results.length,
      accepted: results.filter((item) => item.status === "accepted").length,
      failed: results.filter((item) => item.status === "failed").length,
      uncertain: results.filter((item) => item.status === "uncertain").length,
      contacts: results,
    };
  }
}

async function registerDispatchConversation(input: {
  phone: string;
  user?: { id: string; role: string };
  body: string;
  providerMessageId?: string;
  mode: "text" | "template";
  templateName?: string;
}) {
  const lead = await prisma.lead.findFirst({
    where: { phone: input.phone, deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  const existing = await prisma.chatConversation.findFirst({
    where: {
      phone: input.phone,
      deletedAt: null,
      memory: { path: ["source"], equals: "mass-message" },
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });

  const conversation = existing
    ? await prisma.chatConversation.update({
        where: { id: existing.id },
        data: {
          updatedAt: new Date(),
          ...(lead ? { leadId: lead.id } : {}),
        },
        select: { id: true },
      })
    : await prisma.chatConversation.create({
        data: {
          phone: input.phone,
          state: "START",
          memory: { source: "mass-message" },
          ownerUserId: input.user?.role === "EMPLOYEE" ? input.user.id : null,
          leadId: lead?.id,
        },
        select: { id: true },
      });

  try {
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        direction: "outbound",
        body: input.body,
        providerId: input.providerMessageId,
        rawPayload: {
          kind: "mass-dispatch",
          mode: input.mode,
          templateName: input.templateName,
        } as Prisma.InputJsonValue,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
}

function parseInput(input: unknown): MassMessageInput {
  try {
    return massMessageSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new MassMessageValidationError(error.issues[0]?.message ?? "Dados inválidos para o envio em massa.");
    }
    throw error;
  }
}

function parseValidation<T>(callback: () => T) {
  try {
    return callback();
  } catch (error) {
    throw new MassMessageValidationError(error instanceof Error ? error.message : "Dados inválidos para o envio em massa.");
  }
}

function toTemplateOption(template: MetaTemplate): MassTemplateOption {
  const header = template.components.find((item) => item.type === "HEADER");
  const body = template.components.find((item) => item.type === "BODY");
  const headerVariables = extractVariables(header?.text);
  const bodyVariables = extractVariables(body?.text);

  return {
    ...template,
    unsupportedReason: unsupportedTemplateReason(template),
    headerVariables,
    bodyVariables,
    hasMediaHeader: Boolean(header?.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(header.format)),
    previewText: body?.text ?? "",
  };
}

function extractVariables(text = "") {
  return [...new Set(Array.from(text.matchAll(/\{\{([^{}]+)\}\}/g), (match) => match[1].trim()))].sort(
    (a, b) => Number(a) - Number(b),
  );
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function isUncertainMetaError(error: unknown) {
  return (
    (error instanceof MetaApiError && error.uncertain) ||
    (error instanceof Error && "uncertain" in error && Boolean((error as { uncertain?: unknown }).uncertain))
  );
}
