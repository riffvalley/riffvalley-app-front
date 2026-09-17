import type { Plugin } from "chart.js";

export interface DiscCoverPosition {
  index: number;
  /** Centro (en px, relativo al canvas) de donde debe ir la portada de esa barra. */
  x: number;
  y: number;
}

/**
 * Plugin de Chart.js que NO dibuja nada: solo calcula, en cada redibujado, dónde
 * debería ir la portada de cada barra (encima, para barras verticales; al final,
 * para horizontales) y se lo pasa al componente vía `onPositions`.
 *
 * La portada se renderiza luego como una <img> real posicionada con CSS sobre el
 * canvas, en vez de dibujarse en el propio canvas — así el hover es el hover nativo
 * del navegador (fiable) y no depende de si el punto cae dentro del área dibujable
 * de Chart.js (que con padding puede dar problemas de hit-testing).
 */
export function createDiscCoverPositionsPlugin(
  orientation: "top" | "end",
  gap: number,
  onPositions: (positions: DiscCoverPosition[]) => void,
): Plugin<"bar"> {
  return {
    id: "discCoverPositions",
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      const positions: DiscCoverPosition[] = meta.data.map((bar, index) => {
        const point = bar.getProps(["x", "y"], true);
        return {
          index,
          x: orientation === "top" ? point.x : point.x + gap,
          y: orientation === "top" ? point.y - gap : point.y,
        };
      });
      onPositions(positions);
    },
  };
}
