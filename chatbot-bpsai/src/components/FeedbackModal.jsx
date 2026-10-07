import { useState, useEffect, useId } from "react";
import Modal from "./Modal";
import Icon from "./Icon";

export default function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  feedbackType,
}) {
  const [comment, setComment] = useState("");
  const titleId = useId();
  const commentId = useId();
  useEffect(() => {
    if (isOpen) setComment("");
  }, [isOpen]);
  const positive = feedbackType === "positive";

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={titleId}>
      <div className="modal-heading">
        <h2 id={titleId}>
          {positive ? "Jawaban ini membantu" : "Bantu perbaiki jawaban"}
        </h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Tutup dialog"
        >
          <Icon name="close" size={19} />
        </button>
      </div>
      <p className="modal-description">
        Masukan Anda membantu kami meningkatkan kualitas layanan SIGAP.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(comment);
        }}
      >
        <label className="modal-label" htmlFor={commentId}>
          Masukan tambahan <span>(opsional)</span>
        </label>
        <textarea
          id={commentId}
          className="modal-textarea"
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={
            positive
              ? "Bagian mana yang paling membantu Anda?"
              : "Apa yang perlu diperbaiki dari jawaban ini?"
          }
        />
        <div className="modal-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={onClose}
          >
            Batal
          </button>
          <button type="submit" className="button">
            Kirim masukan
          </button>
        </div>
      </form>
    </Modal>
  );
}
