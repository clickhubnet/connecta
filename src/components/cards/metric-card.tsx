import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  href?: string;
  tone?: "red" | "teal" | "indigo" | "amber";
};

const tones = {
  red: { ink: "text-red-700 dark:text-red-300", icon: "bg-red-50 dark:bg-red-950/60", chart: "text-red-500", heights: [24, 38, 30, 52, 40, 64, 55, 78, 67, 91, 82, 106] },
  teal: { ink: "text-teal-700 dark:text-teal-300", icon: "bg-teal-50 dark:bg-teal-950/60", chart: "text-teal-500", heights: [35, 25, 43, 36, 60, 48, 76, 62, 83, 73, 99, 110] },
  indigo: { ink: "text-indigo-700 dark:text-indigo-300", icon: "bg-indigo-50 dark:bg-indigo-950/60", chart: "text-indigo-500", heights: [20, 33, 29, 47, 58, 43, 69, 85, 71, 98, 88, 115] },
  amber: { ink: "text-amber-800 dark:text-amber-300", icon: "bg-amber-50 dark:bg-amber-950/60", chart: "text-amber-500", heights: [49, 70, 54, 81, 64, 90, 74, 60, 83, 69, 98, 79] },
};

export function MetricCard({ title, value, helper, icon: Icon, href, tone = "red" }: MetricCardProps) {
  const color = tones[tone];
  const card = (
    <Card className="metric-card group relative isolate h-full overflow-hidden rounded-2xl border-border/70 bg-card">
      {/* Decorative motion only: these shapes do not represent historical data. */}
      <div aria-hidden="true" className={`metric-chart pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[145px] ${color.chart}`}>
        <svg viewBox="0 0 320 140" preserveAspectRatio="none" className="h-full w-full" focusable="false">
          <path d="M0 35H320 M0 70H320 M0 105H320" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
          {color.heights.map((height, index) => (
            <rect key={index} className="metric-bar" x={index * 28} y={140 - height} width="17" height={height} rx="4" fill="currentColor" opacity="0.28" style={{ "--bar-delay": `${index * -0.38}s` } as CSSProperties} />
          ))}
          <polyline className="metric-chart-line" points={color.heights.map((height, index) => `${index * 28 + 8},${132 - height}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
        </svg>
      </div>
      <CardContent className="relative p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${color.icon} ${color.ink}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" /></div>
          <p className="text-sm font-bold tracking-wide text-foreground">{title}</p>
          {href ? <ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" /> : null}
        </div>
        <div className="min-w-0">
          <p className="relative w-fit max-w-full break-words rounded-lg bg-card pr-2 text-2xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">{value}</p>
          <p className="mt-4 w-fit rounded-md bg-card px-1 py-0.5 text-xs font-medium text-foreground/80">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block h-full rounded-2xl">{card}</Link>;
  }

  return card;
}
