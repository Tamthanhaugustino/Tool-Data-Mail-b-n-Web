import { cn } from "@/lib/utils";

export function ConfidenceBadge({ value }: { value: number }) {
  const level = value >= 80 ? "high" : value >= 50 ? "mid" : "low";
  const barColor =
    level === "high" ? "bg-green-500" : level === "mid" ? "bg-amber-500" : "bg-red-500";

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200">
        <span className={cn("block h-full rounded-full", barColor)} style={{ width: `${value}%` }} />
      </span>
      <span className="font-mono tabular-nums">{value}%</span>
    </span>
  );
}
