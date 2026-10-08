import { createToastManager } from "../components/ui/toast";

/** Dispara toasts de qualquer lugar (fora de componentes também): `toastManager.add({ title, type })`. */
export const toastManager = createToastManager();
