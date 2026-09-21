export type CampaignHistory = {
  id: string;
  createdAt: string;
  title: string;
  mode: "text" | "template";
  result: {
    total: number; accepted: number; failed: number; uncertain: number;
    contacts: Array<{ phone: string; status: "accepted" | "failed" | "uncertain"; detail: string; providerMessageId?: string }>;
  };
};

const key = (userId: string) => `connecta:campaign-history:${userId}`;
export function readCampaignHistory(userId: string): CampaignHistory[] {
  const raw = localStorage.getItem(key(userId));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Histórico local inválido.");
  return parsed.filter((item): item is CampaignHistory => Boolean(item && typeof item.id === "string" && typeof item.createdAt === "string" && item.result && Array.isArray(item.result.contacts)));
}
export function writeCampaignHistory(userId: string, entries: CampaignHistory[]) {
  localStorage.setItem(key(userId), JSON.stringify(entries));
}
export function addCampaignHistory(userId: string, entry: CampaignHistory) {
  writeCampaignHistory(userId, [entry, ...readCampaignHistory(userId)]);
}
