import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from "vue";

/**
 * Bloqueo del scroll de la página mientras hay un modal abierto.
 *
 * Se bloquea en `<html>` además de en `<body>`: como `html` tiene `overflow-x: clip`
 * (src/style.css), un `overflow: hidden` solo en `body` no llega al viewport y la página
 * de detrás seguía desplazándose. Los bloqueos se cuentan, así que con modales apilados
 * (p. ej. artista → ficha del disco) el scroll solo vuelve cuando se cierra el último.
 * También se compensa el ancho de la barra de scroll para que el contenido no salte.
 */
let activeLocks = 0;
let saved: { htmlOverflow: string; bodyOverflow: string; paddingRight: string } | null = null;

export function lockPageScroll(): () => void {
  if (typeof document === "undefined") return () => {};
  const html = document.documentElement;
  const body = document.body;

  if (activeLocks === 0) {
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    saved = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      paddingRight: html.style.paddingRight,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) html.style.paddingRight = `${scrollbarWidth}px`;
  }
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks -= 1;
    if (activeLocks > 0 || !saved) return;
    html.style.overflow = saved.htmlOverflow;
    body.style.overflow = saved.bodyOverflow;
    html.style.paddingRight = saved.paddingRight;
    saved = null;
  };
}

/** Bloquea el scroll mientras `active` sea `true` (por defecto, mientras el componente viva). */
export function usePageScrollLock(active: MaybeRefOrGetter<boolean> = true): void {
  let release: (() => void) | null = null;
  watch(
    () => toValue(active),
    (isActive) => {
      if (isActive && !release) release = lockPageScroll();
      else if (!isActive && release) {
        release();
        release = null;
      }
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    release?.();
    release = null;
  });
}
