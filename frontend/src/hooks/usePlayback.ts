import { useCallback, useState } from "react";

export function usePlayback(total = 50) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [roundIndex, setRoundIndex] = useState(0);
  const seek = useCallback(
    (index: number) => setRoundIndex(Math.max(0, Math.min(total - 1, index))),
    [total],
  );
  return {
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    roundIndex,
    setRoundIndex,
    seek,
    previous: () => seek(roundIndex - 1),
    next: () => seek(roundIndex + 1),
  };
}
