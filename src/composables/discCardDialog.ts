import type { InjectionKey, Ref } from "vue";

/**
 * Contrato neutro para abrir la ficha votable de un disco (tarjeta DiscCard en un modal).
 * Lo provee el shell de la app y lo consume quien lo necesite —por ejemplo, el modal de
 * artista— sin importar al owner que la implementa, para no crear ciclos con DiscCard.
 */
export interface DiscCardDialogOpener {
  /** Indica si la ficha está abierta, para que los modales de debajo cedan teclado y foco. */
  readonly isOpen: Readonly<Ref<boolean>>;
  /** Abre la ficha; `onClose` recibe `true` si se votó o se cambió algo en la tarjeta. */
  open(discId: string, options?: { onClose?: (changed: boolean) => void }): void;
}

export const discCardDialogKey: InjectionKey<DiscCardDialogOpener> = Symbol("discCardDialog");
