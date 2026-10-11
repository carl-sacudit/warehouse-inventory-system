import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import "./Toast.css";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

type Notify = (type: ToastType, message: string) => void;

const ToastContext = createContext<Notify | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  const notify = useCallback<Notify>((type, message) => {
    nextId.current += 1;
    setToast({ id: nextId.current, type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timerId = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  const Icon = toast?.type === "success"
    ? CheckCircle2
    : toast?.type === "error"
      ? AlertCircle
      : Info;

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className={`app-toast app-toast-${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast must be used inside ToastProvider.");
  return notify;
}