import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "green" | "cyan" | "amber" | "red" | "slate";
}) {
  const tones = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    slate: "border-slate-600 bg-slate-800 text-slate-300",
  };
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
