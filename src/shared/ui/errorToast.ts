import Swal from "sweetalert2";

export function showErrorToast(message = "Ha ocurrido un error") {
  const isDark = document.documentElement.classList.contains("dark");
  const textColor = isDark ? "#e2e8f0" : "#16112a";
  return Swal.fire({
    html: `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;
            background:linear-gradient(135deg,#ef4444,#dc2626);
            display:flex;align-items:center;justify-content:center;">
            <i class="fa-solid fa-xmark" style="color:white;font-size:13px;"></i>
          </div>
          <span style="font-size:13px;font-weight:500;color:${textColor};line-height:1.4;">${message}</span>
        </div>`,
    position: "top-end", timer: 4000, timerProgressBar: true, showConfirmButton: false,
    toast: true, customClass: { popup: "rv-toast rv-toast-error" },
  });
}
