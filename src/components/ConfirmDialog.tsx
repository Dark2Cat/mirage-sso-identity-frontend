import { ShieldAlert, X } from 'lucide-react';

interface ConfirmDialogProps {
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function ConfirmDialog({ description, onCancel, onConfirm, title }: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="confirm-dialog" role="dialog">
        <div className="modal-title">
          <div>
            <span className="eyebrow">Confirm</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onCancel} type="button">
            <X size={16} />
          </button>
        </div>
        <div className="confirm-copy">
          <ShieldAlert size={22} />
          <p>{description}</p>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onCancel} type="button">取消</button>
          <button className="primary-button danger-action" onClick={onConfirm} type="button">确认执行</button>
        </div>
      </section>
    </div>
  );
}
