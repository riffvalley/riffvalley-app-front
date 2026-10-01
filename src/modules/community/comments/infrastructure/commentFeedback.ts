import SwalService from "@services/swal/SwalService";
import type { CommentConversationFeedback } from "../application/commentFeedbackPort";

export const commentFeedback: CommentConversationFeedback = {
  error: (message) => SwalService.error(message),
  success: (message) => SwalService.success(message),
  confirm: (title, message, confirmLabel, cancelLabel) =>
    SwalService.confirm(title, message, confirmLabel, cancelLabel),
};
