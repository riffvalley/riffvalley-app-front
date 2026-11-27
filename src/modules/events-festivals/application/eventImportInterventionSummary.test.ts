import { describe, expect, it } from "vitest";
import type { EventImportRow } from "./useEventImportRows";
import { summarizeEventImportIntervention } from "./eventImportInterventionSummary";

function row(id: string, startDateDraft = "15/05/2027"): EventImportRow {
  return {
    id,
    type: "concert",
    event: "",
    lineup: [],
    startDate: null,
    startDateDraft,
    endDate: null,
    endDateDraft: "",
    venue: { name: "", venueId: null, localityId: null },
    price: "",
    otherInfo: "",
    city: "",
    province: "",
    administrativeRegionId: null,
  };
}

describe("summarizeEventImportIntervention", () => {
  it("separates later-batch rows from unique intervention totals and allows overlapping reasons", () => {
    const summary = summarizeEventImportIntervention(
      [
        { rowKey: "ready-later", revision: 1, reasons: ["batch-limit-exceeded"] },
        {
          rowKey: "missing-and-pending",
          revision: 1,
          reasons: ["lineup-required", "artist-resolution-pending:item-1"],
        },
        {
          rowKey: "reference-error",
          revision: 1,
          reasons: ["locality-resolution-error"],
        },
        { rowKey: "uncertain", revision: 1, reasons: ["operation-uncertain"] },
      ],
      [row("missing-and-pending"), row("reference-error"), row("uncertain")]
    );

    expect(summary).toEqual({
      needsIntervention: 3,
      readyForLaterBatches: 1,
      reasons: [
        { id: "resolution-error", label: "Errores al resolver referencias", rowCount: 1 },
        { id: "required-data", label: "Faltan datos obligatorios", rowCount: 1 },
        {
          id: "blocked-operation",
          label: "Filas bloqueadas por una operación anterior",
          rowCount: 1,
        },
        { id: "resolution-incomplete", label: "Resoluciones pendientes", rowCount: 1 },
      ],
    });
  });

  it("distinguishes a missing start date from a malformed date and reports unclassified codes", () => {
    const summary = summarizeEventImportIntervention(
      [
        { rowKey: "missing-date", revision: 1, reasons: ["start-date-invalid"] },
        { rowKey: "bad-date", revision: 1, reasons: ["start-date-invalid"] },
        { rowKey: "unknown", revision: 1, reasons: ["new-unrecognized-reason"] },
      ],
      [row("missing-date", ""), row("bad-date", "31/02/2027"), row("unknown")]
    );
    expect(summary.needsIntervention).toBe(3);
    expect(summary.reasons).toContainEqual({
      id: "required-data",
      label: "Faltan datos obligatorios",
      rowCount: 1,
    });
    expect(summary.reasons).toContainEqual({
      id: "validation",
      label: "Errores de validación",
      rowCount: 1,
    });
    expect(summary.reasons).toContainEqual({ id: "other", label: "Otros motivos", rowCount: 1 });
  });
});
