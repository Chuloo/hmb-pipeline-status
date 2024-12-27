import { XCircle } from "lucide-react";

interface NotificationProps {
  message: string;
  onClose?: () => void;
}

export function Notification({ message, onClose }: NotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg animate-in fade-in">
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="hover:opacity-75">
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
