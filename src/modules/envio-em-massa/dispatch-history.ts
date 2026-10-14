import type { HistoryContact } from "./delivery-status";
export type DispatchHistoryEntry = {
  id: string; createdAt: string; title: string; mode: string; message?: string; sender: string;
  total: number; accepted: number; failed: number; uncertain: number; isTest: boolean;
  contacts: HistoryContact[]; missingContacts: number;
};
export type DispatchHistoryPage = { entries: DispatchHistoryEntry[]; total: number; offset: number; hasMore: boolean };
