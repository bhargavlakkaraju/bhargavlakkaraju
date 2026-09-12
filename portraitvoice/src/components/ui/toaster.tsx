import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return <Sonner position="top-center" theme="dark" richColors closeButton toastOptions={{ className: "rounded-xl border border-line bg-panel text-white" }} />;
}
