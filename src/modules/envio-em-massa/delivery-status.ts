export type DeliveryState = "accepted" | "sent" | "delivered" | "read" | "failed" | "uncertain";
export type DeliveryEvent = { providerMessageId: string; status: "sent" | "delivered" | "read" | "failed"; at: string; errorCode?: number };
export type HistoryContact = {
  phone: string; status: DeliveryState; detail: string; providerMessageId?: string;
  attemptedAt?: string; processedAt?: string; errorCode?: number;
  sentAt?: string; deliveredAt?: string; readAt?: string; failedAt?: string;
  whatsapp: "confirmed" | "unknown";
};

export function failureExplanation(code?: number, detail = "") {
  const explanations: Record<number, string> = {
    190: "A autorização da conta de envio expirou. Renove a conexão com o WhatsApp antes de tentar novamente.",
    10: "A conta de envio não tem autorização para enviar esta mensagem. Peça ao administrador para revisar a conexão.",
    200: "A conta de envio não tem autorização suficiente. Peça ao administrador para revisar a conexão.",
    130429: "O limite de envios foi atingido. Aguarde antes de tentar novamente.",
    131048: "O WhatsApp limitou os envios desta conta. Revise a qualidade das mensagens antes de tentar novamente.",
    131026: "A mensagem não chegou ao destinatário. O número pode não usar WhatsApp, estar indisponível ou precisar atualizar o aplicativo. Essa falha não confirma que o número está sem WhatsApp.",
    131047: "O cliente não respondeu nas últimas 24 horas. Use uma mensagem previamente aprovada pelo WhatsApp ou aguarde uma resposta.",
    131049: "O WhatsApp limitou mensagens promocionais para este destinatário. Aguarde; não reenvie imediatamente.",
    131050: "Este destinatário optou por não receber mensagens promocionais. Respeite a preferência dele.",
    131051: "Este tipo de mensagem não é aceito pelo WhatsApp. Revise o conteúdo antes de tentar novamente.",
    131052: "Não foi possível obter o arquivo da mensagem. Verifique o arquivo antes de tentar novamente.",
    131053: "O arquivo não pôde ser enviado. Verifique o formato e o tamanho.",
    131042: "Existe uma pendência de pagamento na conta de envio. Peça ao administrador para regularizá-la.",
    132000: "Os dados preenchidos não correspondem à mensagem aprovada. Confira os campos da mensagem.",
    132001: "A mensagem aprovada não foi encontrada no idioma escolhido. Escolha outra mensagem ou idioma.",
    132015: "A mensagem aprovada está pausada pelo WhatsApp. Escolha outra mensagem.",
    132016: "A mensagem aprovada foi desativada pelo WhatsApp. Escolha outra mensagem.",
  };
  const parsedCode = code ?? Number(detail.match(/Meta\s*\((\d+)\)/)?.[1]);
  if (explanations[parsedCode]) return explanations[parsedCode];
  if (/bloqueado nas conversas/i.test(detail)) return "O contato está bloqueado no sistema. Desbloqueie a conversa apenas se desejar retomar o atendimento.";
  if (/sem confirmação|resposta inválida/i.test(detail)) return "Não recebemos a confirmação do envio. Confira a conversa antes de tentar novamente para evitar mensagens repetidas.";
  return "O envio não foi concluído e o WhatsApp não informou um motivo específico. Confira o número e a conexão da conta antes de tentar novamente.";
}

export function applyDeliveryEvents(contact: Omit<HistoryContact, "whatsapp">, events: DeliveryEvent[], hasReply = false): HistoryContact {
  const result: HistoryContact = { ...contact, whatsapp: hasReply ? "confirmed" : "unknown" };
  if (contact.status === "failed" && contact.processedAt) result.failedAt ??= contact.processedAt;
  for (const event of events.filter(item => item.providerMessageId === contact.providerMessageId).sort((a, b) => a.at.localeCompare(b.at))) {
    if (event.status === "sent") result.sentAt ??= event.at;
    if (event.status === "delivered") result.deliveredAt ??= event.at;
    if (event.status === "read") result.readAt ??= event.at;
    if (event.status === "failed") { result.failedAt = event.at; result.errorCode = event.errorCode; }
  }
  if (result.readAt) { result.status = "read"; result.detail = "O destinatário leu a mensagem."; }
  else if (result.deliveredAt) { result.status = "delivered"; result.detail = "A mensagem chegou ao WhatsApp do destinatário."; }
  else if (result.failedAt || contact.status === "failed") { result.status = "failed"; result.detail = failureExplanation(result.errorCode, contact.detail); }
  else if (result.sentAt) { result.status = "sent"; result.detail = "O WhatsApp confirmou o envio. Ainda aguardamos a confirmação de entrega."; }
  else if (contact.status === "accepted") result.detail = "O WhatsApp recebeu o pedido de envio. Ainda não confirmou se a mensagem chegou ao destinatário.";
  else result.detail = "Não recebemos a confirmação do envio. Confira a conversa antes de reenviar para evitar mensagens repetidas.";
  if (result.deliveredAt || result.readAt) result.whatsapp = "confirmed";
  return result;
}
