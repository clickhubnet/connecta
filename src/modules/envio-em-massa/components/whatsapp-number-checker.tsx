"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clipboard, Download, ListChecks, RotateCcw, Trash2, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ParsedNumber = {
  original: string;
  formatted: string | null;
  reason?: string;
  duplicate?: boolean;
};

export function WhatsappNumberChecker() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");

  const result = useMemo(() => parseWhatsappList(input), [input]);
  const readyText = result.valid.map((item) => item.formatted).join("\n");

  async function copyReadyList() {
    if (!readyText) return;
    await navigator.clipboard.writeText(readyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function replaceWithReadyList() {
    setInput(readyText);
  }

  async function handleFileChange(file?: File | null) {
    if (!file) return;
    setFileName(file.name);
    setFileError("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension === "csv" || file.type.includes("csv")) {
        const text = await file.text();
        setInput((current) => mergePhoneText(current, text));
        return;
      }

      const buffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      const values: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });
        values.push(...rows.flatMap((row) => row.map((cell) => String(cell ?? ""))));
      }
      setInput((current) => mergePhoneText(current, values.join("\n")));
    } catch {
      setFileName("");
      setFileError("Não foi possível ler a planilha. Use .xlsx, .xls ou .csv.");
    }
  }

  async function downloadCleanSpreadsheet() {
    if (!result.valid.length) return;
    const XLSX = await import("xlsx");
    const rows = result.valid.map((item) => ({ WHATSAPP: item.formatted }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Com WhatsApp");
    XLSX.writeFile(workbook, `whatsapp-verificados-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="overview-card overview-red relative isolate min-w-0 overflow-hidden rounded-2xl border-border/70 bg-card">
        <CardHeader className="mb-0 border-0 bg-none p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Verificar WhatsApp</CardTitle>
              <CardDescription>
                Higienize sua lista antes do disparo: formata DDI 55, remove duplicados e separa números inválidos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            A API oficial da Meta não permite consultar silenciosamente se um telefone possui WhatsApp. A confirmação real acontece no retorno do disparo. Esta tela prepara a lista no formato correto e reduz falhas por número inválido ou duplicado.
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm font-medium text-primary transition hover:bg-primary/10">
            <Upload className="h-4 w-4" />
            {fileName ? `Planilha carregada: ${fileName}` : "Importar planilha .xlsx, .xls ou .csv"}
            <input
              className="hidden"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => void handleFileChange(event.target.files?.[0])}
            />
          </label>
          {fileError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{fileError}</p> : null}

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Lista de números</span>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={"Cole um número por linha, vírgula ou ponto e vírgula\n(11) 99999-9999\n+55 11 98888-7777\n5511977776666"}
              className="min-h-[360px] rounded-2xl bg-muted/20 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              Aceita números com máscara. Se vier sem DDI e tiver DDD brasileiro, o sistema adiciona 55.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void copyReadyList()} disabled={!readyText} className="rounded-xl">
              <Clipboard className="h-4 w-4" />
              {copied ? "Copiado" : "Copiar lista pronta"}
            </Button>
            <Button type="button" variant="outline" onClick={replaceWithReadyList} disabled={!readyText} className="rounded-xl">
              <RotateCcw className="h-4 w-4" />
              Substituir pela lista limpa
            </Button>
            <Button type="button" variant="outline" onClick={() => void downloadCleanSpreadsheet()} disabled={!readyText} className="rounded-xl">
              <Download className="h-4 w-4" />
              Baixar planilha limpa
            </Button>
            <Button type="button" variant="outline" onClick={() => setInput("")} disabled={!input.trim()} className="rounded-xl">
              <Trash2 className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <aside className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Prontos" value={result.valid.length} tone="text-emerald-600" />
          <StatCard label="Inválidos" value={result.invalid.length} tone="text-rose-600" />
          <StatCard label="Duplicados" value={result.duplicates.length} tone="text-amber-600" />
          <StatCard label="Entrada" value={result.total} tone="text-primary" />
        </div>

        <Card className="rounded-2xl border-border/70 bg-card">
          <CardHeader className="mb-0 border-0 bg-none p-5">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Lista pronta para disparo
            </CardTitle>
            <CardDescription className="text-xs">Copie e cole no campo Destinatários da aba Disparos.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Textarea readOnly value={readyText} placeholder="A lista limpa aparecerá aqui." className="min-h-56 rounded-2xl bg-muted/20 font-mono text-xs" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card">
          <CardHeader className="mb-0 border-0 bg-none p-5">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TriangleAlert className="h-4 w-4 text-amber-600" />
              Removidos da lista
            </CardTitle>
            <CardDescription className="text-xs">Números inválidos ou repetidos não entram na lista final.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-y-auto p-5 pt-0">
            {[...result.invalid, ...result.duplicates].length ? [...result.invalid, ...result.duplicates].map((item, index) => (
              <div key={`${item.original}-${index}`} className="rounded-xl border bg-muted/20 px-3 py-2 text-xs">
                <p className="font-medium">{item.original}</p>
                <p className="mt-1 text-muted-foreground">{item.duplicate ? "Duplicado" : item.reason}</p>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nenhum número removido até agora.
              </p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function mergePhoneText(current: string, next: string) {
  const currentLines = current.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const nextLines = extractPhoneCandidates(next);
  return [...currentLines, ...nextLines].join("\n");
}

function extractPhoneCandidates(value: string) {
  return value
    .split(/[\n,;|\t]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/\D/g, ""))
    .map((digits) => {
      if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
      const withoutZeros = digits.replace(/^0+/, "");
      if (withoutZeros.length === 10 || withoutZeros.length === 11) return `55${withoutZeros}`;
      return withoutZeros;
    })
    .filter((digits) => /^55\d{10,11}$/.test(digits));
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function parseWhatsappList(value: string) {
  const rows = value.split(/\r?\n|;|,/).map((item) => item.trim()).filter(Boolean);
  const seen = new Set<string>();
  const valid: Array<ParsedNumber & { formatted: string }> = [];
  const invalid: ParsedNumber[] = [];
  const duplicates: ParsedNumber[] = [];

  for (const row of rows) {
    const parsed = normalizePhone(row);
    if (!parsed.formatted) {
      invalid.push({ original: row, formatted: null, reason: parsed.reason });
      continue;
    }
    if (seen.has(parsed.formatted)) {
      duplicates.push({ original: row, formatted: parsed.formatted, duplicate: true });
      continue;
    }
    seen.add(parsed.formatted);
    valid.push({ original: row, formatted: parsed.formatted });
  }

  return { total: rows.length, valid, invalid, duplicates };
}

function normalizePhone(value: string): { formatted: string | null; reason?: string } {
  if (!/^[+\d\s().-]+$/.test(value)) return { formatted: null, reason: "Contém caracteres incompatíveis." };
  const international = value.trim().startsWith("+") || value.trim().startsWith("00");
  let digits = value.replace(/\D/g, "").replace(/^00/, "");
  if (!international && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(digits)) return { formatted: null, reason: "Telefone fora do padrão internacional." };
  return { formatted: digits };
}
