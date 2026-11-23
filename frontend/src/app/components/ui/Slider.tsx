import type { InputHTMLAttributes } from "react";

export function Slider(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input type="range" className="h-1.5 w-full cursor-pointer accent-emerald-500" {...props} />
  );
}
