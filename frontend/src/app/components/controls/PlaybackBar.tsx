import { Eye, Megaphone, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { isRevealRound } from "../../../utils/formatters";

export function PlaybackBar({
  round,
  isPlaying,
  speed,
  onPlay,
  onSpeed,
  onSeek,
}: {
  round: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onSpeed: (speed: number) => void;
  onSeek: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSeek(round - 2)}
          className="rounded-md p-2 text-slate-500 hover:bg-white/5 hover:text-white"
        >
          <SkipBack size={15} />
        </button>
        <button
          onClick={onPlay}
          className="grid size-9 place-items-center rounded-full bg-emerald-500 text-[#05130e]"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
        </button>
        <button
          onClick={() => onSeek(round)}
          className="rounded-md p-2 text-slate-500 hover:bg-white/5 hover:text-white"
        >
          <SkipForward size={15} />
        </button>
        <div className="ml-2 flex-1">
          <div className="relative flex h-8 items-center">
            <div className="absolute inset-x-0 h-px bg-slate-700" />
            {Array.from({ length: 50 }, (_, i) => {
              const n = i + 1;
              const reveal = isRevealRound(n);
              return (
                <button
                  key={n}
                  title={`Ronda ${n}${reveal ? " · revelación pública" : ""}`}
                  onClick={() => onSeek(i)}
                  className={`relative z-10 grid flex-1 place-items-center ${n <= round ? "text-emerald-400" : "text-slate-700"}`}
                >
                  {reveal ? (
                    <span
                      className={`grid size-5 place-items-center rounded-full border ${n === round ? "border-amber-400 bg-amber-500/20 text-amber-300" : "border-slate-700 bg-[#111827]"}`}
                    >
                      {n === 50 ? <Megaphone size={9} /> : <Eye size={9} />}
                    </span>
                  ) : (
                    <span
                      className={`size-1 rounded-full ${n === round ? "ring-4 ring-emerald-500/20 bg-emerald-300" : n < round ? "bg-emerald-600" : "bg-slate-700"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] text-slate-600">
            <span>R01</span>
            <span>R10</span>
            <span>R20</span>
            <span>R30</span>
            <span>R40</span>
            <span>R50</span>
          </div>
        </div>
        <select
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
          className="ml-2 rounded-md border border-slate-700 bg-[#090E17] px-2 py-1.5 font-mono text-[10px] text-slate-300"
        >
          {[0.5, 1, 2, 3, 5].map((value) => (
            <option key={value} value={value}>
              {value}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
