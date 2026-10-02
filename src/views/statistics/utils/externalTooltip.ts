import type { Chart, TooltipModel } from "chart.js";

const TOOLTIP_CLASS = "chartjs-external-tooltip";

function getOrCreateTooltipEl(chart: Chart): HTMLDivElement {
  const container = chart.canvas.parentNode as HTMLElement;
  let el = container.querySelector<HTMLDivElement>(`.${TOOLTIP_CLASS}`);
  if (!el) {
    el = document.createElement("div");
    el.className = `${TOOLTIP_CLASS} absolute z-20 pointer-events-none transition-opacity duration-100
      bg-white dark:bg-rv-darkSurface border border-gray-200 dark:border-white/10
      rounded-xl shadow-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-line`;
    container.appendChild(el);
  }
  return el;
}

/**
 * Reemplaza el tooltip de Chart.js dibujado dentro del canvas por un tooltip HTML
 * real. El de canvas queda por debajo de cualquier overlay del propio DOM (como las
 * portadas de disco superpuestas), así que aquí lo pintamos como un <div> normal con
 * su propio z-index, siempre por encima.
 */
export function externalTooltipHandler(context: { chart: Chart; tooltip: TooltipModel<"bar"> }) {
  const { chart, tooltip } = context;
  const el = getOrCreateTooltipEl(chart);

  if (tooltip.opacity === 0) {
    el.style.opacity = "0";
    return;
  }

  let html = "";
  (tooltip.title || []).forEach((line) => {
    html += `<div class="font-semibold text-gray-800 dark:text-white">${line}</div>`;
  });
  (tooltip.body || []).forEach((b) => {
    b.lines.forEach((line) => {
      html += `<div class="text-gray-600 dark:text-gray-300">${line || "&nbsp;"}</div>`;
    });
  });
  el.innerHTML = html;

  el.style.opacity = "1";
  el.style.left = `${chart.canvas.offsetLeft + tooltip.caretX}px`;
  el.style.top = `${chart.canvas.offsetTop + tooltip.caretY}px`;
  el.style.transform = "translate(-50%, -110%)";
}
