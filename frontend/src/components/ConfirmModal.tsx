import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  onConfirm,
  onClose
}: ConfirmModalProps) {
  // Prevent clicks inside the modal card from closing it
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="confirm-modal-backdrop" onClick={onClose}>
      <div className={`confirm-modal-card ${isDanger ? 'danger' : ''}`} onClick={handleCardClick}>
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon-wrapper ${isDanger ? 'danger' : 'info'}`}>
            {isDanger ? <AlertTriangle size={18} /> : <HelpCircle size={18} />}
          </div>
          <h4 className="confirm-modal-title">{title}</h4>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
