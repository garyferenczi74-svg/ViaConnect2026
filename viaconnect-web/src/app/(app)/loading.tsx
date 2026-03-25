import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-4" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  );
}
