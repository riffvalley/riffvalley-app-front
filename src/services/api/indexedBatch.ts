/** Batch limit shared by the CON-B04g entity inspectors. */
export const ENTITY_RESOLUTION_BATCH_LIMIT = 100;

/** A response violated the indexed batch HTTP contract. */
export class IndexedBatchProtocolError extends Error {
  readonly category = "protocol-error";

  constructor(message: string) {
    super(message);
    this.name = "IndexedBatchProtocolError";
  }
}

/** Validates index coverage and echoed inputs, then restores request order. */
export function orderIndexedResults<Input, Result extends { index: number }>(
  inputs: readonly Input[],
  results: readonly Result[],
  matchesInput: (input: Input, result: Result) => boolean
): Result[] {
  if (results.length !== inputs.length) {
    throw new IndexedBatchProtocolError(
      "La respuesta del inspector no contiene un resultado por entrada."
    );
  }

  const ordered: Array<Result | undefined> = Array.from({ length: inputs.length });
  for (const result of results) {
    if (!Number.isInteger(result.index) || result.index < 0 || result.index >= inputs.length) {
      throw new IndexedBatchProtocolError(
        "La respuesta del inspector contiene un índice fuera de rango."
      );
    }
    if (ordered[result.index] !== undefined) {
      throw new IndexedBatchProtocolError(
        "La respuesta del inspector contiene índices duplicados."
      );
    }
    if (!matchesInput(inputs[result.index], result)) {
      throw new IndexedBatchProtocolError(
        "La respuesta del inspector no coincide con la entrada asociada al índice."
      );
    }
    ordered[result.index] = result;
  }

  const complete: Result[] = [];
  for (const result of ordered) {
    if (result === undefined) {
      throw new IndexedBatchProtocolError("La respuesta del inspector omite índices de entrada.");
    }
    complete.push(result);
  }
  return complete;
}
