import { z } from "zod";

export const MAX_BATCH_CONTACTS = 100;

export const massMessageSchema = z.object({
  contactsText: z.string().trim().min(1, "Informe os contatos.").max(20_000),
  templateId: z.string().regex(/^\d+$/, "Selecione um template aprovado."),
  headerValues: z.array(z.string().trim().min(1).max(1024)).max(10).default([]),
  bodyValues: z.array(z.string().trim().min(1).max(1024)).max(100).default([]),
  mediaUrl: z.string().max(2048).default(""),
  consentConfirmed: z.literal(true, { errorMap: () => ({ message: "Confirme a autorização dos contatos para receber mensagens." }) }),
});

export type MassMessageInput = z.infer<typeof massMessageSchema>;

export function parseContacts(value: string) {
  const entries = value.split(/\r?\n|;|,/).map((item) => item.trim()).filter(Boolean);
  const unique = new Set<string>();
  for (const entry of entries) {
    if (!/^[+\d\s().-]+$/.test(entry)) throw new Error("Há um contato inválido. Informe apenas números de telefone.");
    const international = entry.startsWith("+") || entry.startsWith("00");
    let digits = entry.replace(/\D/g, "").replace(/^00/, "");
    if (!international && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
    if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error("Há um telefone inválido. Use DDI e número, por exemplo +5511999999999.");
    unique.add(digits);
  }
  if (!unique.size) throw new Error("Informe pelo menos um contato válido.");
  if (unique.size > MAX_BATCH_CONTACTS) throw new Error(`Envie no máximo ${MAX_BATCH_CONTACTS} contatos por lote nesta etapa.`);
  return [...unique];
}
