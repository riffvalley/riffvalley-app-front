import Swal from "sweetalert2";
import type { SweetAlertOptions, SweetAlertResult } from "sweetalert2";
import messagesData from "./messagesData.json"; // Importamos el JSON

interface ConfirmOptions {
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

export default {
  /**
   * Muestra un mensaje de éxito (toast en la esquina superior).
   * @param message Texto a mostrar (opcional).
   */
  success(
    message: string = "Operación realizada con éxito"
  ): Promise<SweetAlertResult<any>> {
    const isDark = document.documentElement.classList.contains("dark");
    const textColor = isDark ? "#e2e8f0" : "#16112a";
    return Swal.fire({
      html: `
        <div style="display:flex;align-items:center;gap:10px;">
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

  /**
   * Muestra un mensaje de error (toast en la esquina superior).
   * @param message Texto a mostrar (opcional).
   */
  error(
    message: string = "Ha ocurrido un error"
  ): Promise<SweetAlertResult<any>> {
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
      position: "top-end",
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      customClass: { popup: "rv-toast rv-toast-error" },
    });
  },

  /**
   * Muestra un diálogo de confirmación con estilo de marca RV.
   * @param title Título del diálogo.
   * @param text Texto del diálogo (opcional).
   * @param confirmButtonText Texto del botón de confirmar.
   * @param cancelButtonText Texto del botón de cancelar.
   */
  confirm(
    title: string = "¿Estás seguro?",
    text: string = "",
    confirmButtonText: string = "Confirmar",
    cancelButtonText: string = "Cancelar"
  ): Promise<SweetAlertResult<any>> {
    const isDark = document.documentElement.classList.contains("dark");
    return Swal.fire({
      title,
      text: text || undefined,
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
      confirmButtonText,
      cancelButtonText,
      buttonsStyling: false,
      background: isDark ? "#16112a" : "#ffffff",
      color: isDark ? "#e2e8f0" : "#16112a",
    });
  },

  /**
   * Muestra un mensaje de éxito con una imagen aleatoria de la carpeta correspondiente.
   * @param category Número de carpeta en "assets/votaciones".
   */
  async successImage(category: number): Promise<SweetAlertResult<any>> {
    // Redondear la categoría a un número entero
    const roundedCategory = Math.round(category);

    // Obtener una imagen aleatoria de la carpeta correspondiente
    const imagePath = await this.getRandomImagePath(roundedCategory);
    // Obtener título y mensaje aleatorio desde el JSON
    const { title, message } = this.getRandomMessage(roundedCategory);

    return Swal.fire({
      html: `
              <div class="flex items-center">
                <img src="${imagePath}" alt="Imagen" class="w-24 h-24 mr-4">
                <div>
                  <h2 class="text-lg font-bold text-gray-800">${title}</h2>
                  <p class="text-base text-gray-600">${message}</p>
                </div>
              </div>
      `,
      position: "top-end",
      timer: 5000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
    });
  },

  /**
   * Obtiene una imagen aleatoria de la carpeta correspondiente en "assets/votaciones/{category}".
   * @param category Número de la carpeta.
   * @returns {Promise<string>} Ruta de la imagen seleccionada.
   */
  async getRandomImagePath(category: number): Promise<string> {
    const basePath = `/votaciones/${category}/`; // Funciona en Vite y Netlify
    const images = {
      1: ["brrrr.gif"],
      2: ["furiouskirby.gif"],
      3: ["homerhuir.gif"],
      4: ["sadpepe.gif"],
      5: ["mario.gif", "sherk.gif"],
      6: ["carlton.gif", "vaca.gif"],
      7: ["doggo.gif", "pepu.gif"],
      8: ["homeralegre.gif", "crash.gif"],
      9: ["calamardoanimado.gif", "meshuggoh.gif"],
      10: ["calamardios.gif"],
    };

    // Verificar si la categoría existe
    if (!images[category]) {
      console.warn(
        `Categoría ${category} no encontrada. Usando imagen por defecto.`
      );
      return `${basePath}default.gif`; // Imagen por defecto si no hay categoría válida
    }

    // Seleccionar una imagen aleatoria de la categoría
    const randomImage =
      images[category][Math.floor(Math.random() * images[category].length)];
    return `${basePath}${randomImage}`;
  },

  /**
   * Obtiene un título y mensaje aleatorio desde el JSON.
   * @param category Número de la categoría.
   * @returns {Object} Un objeto con title y message.
   */
  getRandomMessage(category: number): { title: string; message: string } {
    const categoryMessages = messagesData[category];

    if (!categoryMessages) {
      console.warn(
        `No hay mensajes para la categoría ${category}, usando valores por defecto.`
      );
      return {
        title: "¡Votación brutal!",
        message: "¡Las elecciones nunca fueron tan épicas!",
      };
    }

    // Selecciona un título y mensaje aleatorio de la categoría
    const randomTitle =
      categoryMessages.titles[
      Math.floor(Math.random() * categoryMessages.titles.length)
      ];
    const randomMessage =
      categoryMessages.messages[
      Math.floor(Math.random() * categoryMessages.messages.length)
      ];

    return { title: randomTitle, message: randomMessage };
  },
};
