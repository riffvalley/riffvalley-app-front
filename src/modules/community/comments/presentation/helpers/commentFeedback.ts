import Swal from "sweetalert2";
import { showErrorToast } from "@/shared/ui/errorToast";
import type { CommentConversationFeedback } from "../../application/commentFeedbackPort";

export const communityCommentFeedback: CommentConversationFeedback = {
  error(message) {
    void showErrorToast(message);
  },
  success(message) {
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#e2e8f0" : "#16112a";
    void Swal.fire({
      html: `<div style="display:flex;align-items:center;gap:10px;">
          <div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;
            background:linear-gradient(135deg,#e46e8a,#b0669f);
            display:flex;align-items:center;justify-content:center;">
            <i class="fa-solid fa-check" style="color:white;font-size:13px;"></i>
          </div>
          <span style="font-size:13px;font-weight:500;color:${textColor};line-height:1.4;">${message}</span>
        </div>`,
      position: "top-end",
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      customClass: { popup: "rv-toast" },
    });
  },
  async confirm(title, message, confirmLabel, cancelLabel) {
    const isDark = document.documentElement.classList.contains("dark");
    const result = await Swal.fire({
      title,
      text: message || undefined,
      iconHtml: `<div style="width:52px;height:52px;border-radius:50%;
        background:linear-gradient(135deg,#e46e8a,#b0669f);
        display:flex;align-items:center;justify-content:center;margin:0 auto;">
        <i class="fa-solid fa-triangle-exclamation" style="color:white;font-size:22px;"></i>
      </div>`,
      customClass: {
        popup: "rv-confirm",
        icon: "rv-confirm-icon",
        title: "rv-confirm-title",
        htmlContainer: "rv-confirm-text",
        confirmButton: "rv-confirm-btn-confirm",
        cancelButton: "rv-confirm-btn-cancel",
      },
      showCancelButton: true,
      confirmButtonText: confirmLabel,
      cancelButtonText: cancelLabel,
      buttonsStyling: false,
      background: isDark ? "#16112a" : "#ffffff",
      color: isDark ? "#e2e8f0" : "#16112a",
    });
    return { isConfirmed: result.isConfirmed };
  },
};
