import { AnimatePresence, motion } from "motion/react";
import { EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "../ui/Button";

export function PrivacyCurtain({ open, onContinue }: { open: boolean; onContinue: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-[#080C14]/98 p-6"
        >
          <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="max-w-md text-center">
            <div className="mx-auto mb-6 grid size-20 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
              <EyeOff size={34} />
            </div>
            <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-amber-400">
              <ShieldCheck size={14} /> Cortina de privacidad activa
            </div>
            <h2 className="text-2xl font-semibold text-white">Maletín cerrado</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Pasa el control al Guardia (Jugador 2). El monto depositado ya no será visible.
            </p>
            <Button onClick={onContinue} className="mt-7 w-full">
              Continuar como Guardia
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
