"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto mt-16 rounded-2xl border border-rose-500/20 bg-zinc-900/60 p-6 text-center space-y-4">
      <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto" />
      <div>
        <h2 className="text-lg font-bold text-white">No pudimos cargar tus datos</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Puede ser un problema de conexión. Tus datos no se perdieron.
        </p>
      </div>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors cursor-pointer"
      >
        <RotateCcw className="h-4 w-4" /> Reintentar
      </button>
    </div>
  );
}
