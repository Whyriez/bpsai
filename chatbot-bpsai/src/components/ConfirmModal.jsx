import { useId } from "react";
import Modal from "./Modal";
import Icon from "./Icon";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi penghapusan",
  message = "Apakah Anda yakin ingin menghapus data ini?",
  confirmText = "Hapus",
  cancelText = "Batal",
  confirmVariant = "danger",
  isLoading = false,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const close = () => {
    if (!isLoading) onClose();
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          disabled={isLoading}
          aria-label="Tutup dialog"
        >
          <Icon name="close" size={19} />
        </button>
      </div>
      <p id={descriptionId} className="modal-description">
        {message}
      </p>
      <div className="modal-actions">
        <button
          type="button"
          className="button button-outline"
          onClick={close}
          disabled={isLoading}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`button ${confirmVariant === "danger" ? "button-danger" : confirmVariant === "warning" ? "button-warning" : ""}`}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading && <span className="spinner" />}
          {isLoading ? "Memproses…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
