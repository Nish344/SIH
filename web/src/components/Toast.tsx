type ToastProps = {
  message: string;
  onDismiss: () => void;
};

export function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button type="button" className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
