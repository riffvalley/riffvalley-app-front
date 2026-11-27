<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { computed, nextTick, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import EventImportTable from "../components/EventImportTable.vue";
import EventImportCountrySelector from "../components/EventImportCountrySelector.vue";
import EventImportStageNavigation, {
  type EventImportStageId,
  type EventImportStageItem,
} from "../components/EventImportStageNavigation.vue";
import EventImportFileSummary from "../components/EventImportFileSummary.vue";
import EventImportResolutionProgress from "../components/EventImportResolutionProgress.vue";
import EventImportAnalysisSummary from "../components/EventImportAnalysisSummary.vue";
import EventImportReviewControls from "../components/EventImportReviewControls.vue";
import {
  useEventImportRows,
  type EventImportResolutionPhase,
  type EventImportRow,
  type EventImportRowsWorkspace,
} from "../../application/useEventImportRows";
import { useEventImportGeography } from "../../application/useEventImportGeography";
import {
  createEventImportPreparer,
  type ImportPreparation,
} from "../../application/eventImportPreparation";
import {
  eventImportErrorCanRetry,
  eventImportGlobalErrorMessage,
  useEventImportBatchMutation,
} from "../../application/useEventImportBatchMutation";
import {
  countDistinctCreatedEvents,
  reconcileEventImportResults,
} from "../../application/eventImportReconciliation";
import type { ImportBatchResponse } from "../../api/eventImport";
import {
  createEventImportConflictPresentation,
  type EventImportConflictPresentation,
} from "../../application/eventImportConflicts";
import { createEventLineupExpansionPreparer } from "../../application/eventLineupExpansionPreparation";
import type { CorrelatedImportResult } from "../../api/eventImport";
import { existingEventDetailQueryOptions } from "../../api/eventImport";
import SwalService from "@/services/swal/SwalService";
import {
  authorizeLineupExpansion,
  lineupExpansionErrorMessage,
  lineupExpansionFailureKind,
  useEventLineupExpansionMutation,
  type ConfirmedLineupExpansion,
  type EventLineupExpansionExecution,
} from "../../application/useEventLineupExpansionMutation";
import {
  lineupExpansionOperationKey,
  reconcileLineupExpansionResult,
} from "../../application/eventLineupExpansionReconciliation";
import { lineupExpansionConfirmationSignature } from "../../application/eventLineupExpansionPreparation";
import type { EventLineupExpansionResponse } from "../../api/eventLineupExpansion";
import { useEventImportSession } from "../../application/useEventImportSession";
import {
  buildEventImportReviewEntries,
  filterEventImportReviewEntries,
  type EventImportReviewFilter,
} from "../../application/eventImportReview";
import { summarizeEventImportIntervention } from "../../application/eventImportInterventionSummary";
import { createEventImportSessionPayload } from "../../application/eventImportSessionPayload";
import { EVENT_IMPORT_SESSION_FORMAT_VERSION } from "../../infrastructure/eventImportSessionStorage";
import {
  parseScrapedEventJson,
  scrapedEventFingerprint,
  SCRAPED_EVENT_JSON_MAX_BYTES,
  type ScrapedEventJsonDocument,
} from "../../application/scrapedEventJson";
import { summarizeEventImportAnalysis } from "../../application/eventImportAnalysisSummary";

const queryClient = useQueryClient();
const auth = useAuthStore();
const eventImport = useEventImportRows(queryClient);
type ImportMode = "manual" | "json";
const activeImportMode = shallowRef<ImportMode>("manual");
const switchingImportMode = shallowRef(false);
const modeSwitchAttempt = shallowRef(0);
const {
  rows,
  lineupStates,
  geographyStates,
  tourStates,
  bulkResolutionStatus,
  bulkResolutionPhases,
  addRow,
  removeRow,
  removeRows,
} = eventImport;
const jsonDocument = shallowRef<ScrapedEventJsonDocument | null>(null);
const jsonFileName = shallowRef("");
const jsonFileSizeBytes = shallowRef(0);
const jsonAnalyzedRowIds = shallowRef<Record<number, string>>({});
const jsonError = shallowRef("");
const jsonNotice = shallowRef("");
const jsonLoading = shallowRef(false);
const jsonDragging = shallowRef(false);
const activeImportStage = shallowRef<EventImportStageId>("review");
const jsonReviewFilter = shallowRef<EventImportReviewFilter>("needs-review");
const jsonReviewSearch = shallowRef("");
const jsonReviewNotice = shallowRef("");
const jsonReviewInitialized = shallowRef(false);
const analyzedJsonDocument = shallowRef<ScrapedEventJsonDocument | null>(null);
const jsonResolutionInProgress = shallowRef(false);
const jsonResolutionError = shallowRef("");
const manualEditorAccessed = shallowRef(false);
const loadedScrapedEventFingerprints = new Set<string>();
const inMemoryModeWorkspaces = new Map<ImportMode, ImportModeWorkspace>();
const persistedModeWorkspaces = shallowRef<
  Partial<Record<ImportMode, SerializedImportModeWorkspace>>
>({});
const modeBatchErrors = shallowRef<Partial<Record<ImportMode, string>>>({});
const geography = useEventImportGeography(eventImport.invalidateGeographicAssociations);
const preparer = createEventImportPreparer();
const lineupExpansionPreparer = createEventLineupExpansionPreparer();
const initialPreparation: ImportPreparation = {
  payload: null,
  snapshot: null,
  eligibleRows: [],
  pendingRows: [],
  errors: [],
  correlation: {},
};
const preparation = shallowRef(initialPreparation);
const batchMutation = useEventImportBatchMutation();
const visibleBatchError = computed(
  () =>
    (batchMutation.isError.value
      ? eventImportGlobalErrorMessage(batchMutation.error.value)
      : modeBatchErrors.value[activeImportMode.value]) || ""
);
const expansionMutation = useEventLineupExpansionMutation();
const uncertainSnapshots = shallowRef<NonNullable<ImportPreparation["snapshot"]>[]>([]);
const handledOperations = new Set<string>();
const handledOperationOrder: string[] = [];
const createdDrafts = shallowRef<Record<string, { eventId: string; operationRowId: string }>>({});
const lastImport = shallowRef<{
  response: ImportBatchResponse;
  rows: ReturnType<typeof reconcileEventImportResults>["results"];
  rowLabels?: Record<string, string>;
} | null>(null);
type LastImportState = NonNullable<typeof lastImport.value>;
interface ConflictOperation {
  snapshot: NonNullable<ImportPreparation["snapshot"]>;
  results: CorrelatedImportResult[];
}
const conflictOperations = shallowRef<ConflictOperation[]>([]);
interface AutomaticImportRun {
  id: string;
  ownerId: string;
  countryId: string;
  excludedRowKeys: Set<string>;
  completedBatches: number;
  completedRows: number;
  totalRows: number;
  totalBatches: number;
  createdEventIds: Set<string>;
  unchangedRows: number;
  conflicts: number;
  invalidRows: number;
  failedRows: number;
  stopRequested: boolean;
}
interface ImportModeWorkspace {
  rows: EventImportRowsWorkspace;
  countryId: string;
  preparation: ImportPreparation;
  uncertainSnapshots: NonNullable<ImportPreparation["snapshot"]>[];
  protectedSnapshots: NonNullable<ImportPreparation["snapshot"]>[];
  handledOperations: Set<string>;
  handledOperationOrder: string[];
  createdDrafts: Record<string, { eventId: string; operationRowId: string }>;
  lastImport: LastImportState | null;
  conflictOperations: ConflictOperation[];
  selectedRowKeys: Set<string>;
  confirmedExpansionSignatures: Record<string, string>;
  selectedExpansionEventIds: Record<string, string>;
  expansionExecutions: Record<string, EventLineupExpansionExecution>;
  expansionAuthorizations: Record<string, ConfirmedLineupExpansion>;
  handledExpansionOperations: Set<string>;
  appliedExpansionsByRow: Record<string, { eventId: string; operationKey: string }>;
  expansionHistory: Array<{
    operationKey: string;
    rowKey: string;
    eventId: string;
    startDate: string;
    result: EventLineupExpansionResponse;
    reconciliation: "removed" | "kept" | "already-handled";
  }>;
  protectedExpansionSnapshots: Record<
    string,
    import("../../application/eventLineupExpansionPreparation").LineupExpansionSnapshot
  >;
  pendingSnapshotBatchIds: Set<string>;
  jsonDocument: ScrapedEventJsonDocument | null;
  jsonFileName: string;
  jsonFileSizeBytes: number;
  jsonAnalyzedRowIds: Record<number, string>;
  jsonError: string;
  jsonNotice: string;
  jsonResolutionError: string;
  activeImportStage: EventImportStageId;
  analyzedJsonDocument: ScrapedEventJsonDocument | null;
  manualEditorAccessed: boolean;
  loadedScrapedEventFingerprints: Set<string>;
}
interface SerializedImportModeWorkspace {
  state: SerializedImportState;
  stage: EventImportStageId;
  jsonDocument: ScrapedEventJsonDocument | null;
  jsonFileName: string;
  jsonFileSizeBytes: number;
  jsonAnalyzedRowIds?: Record<number, string>;
  resolutionPhases?: EventImportResolutionPhase[];
}
interface SerializedImportState {
  countryId: string;
  rows: EventImportRow[];
  lineupStates: Record<string, { draft: string }>;
  tourStates: Record<
    string,
    { confirmedTourId: string | null; selectedCandidateId: string | null }
  >;
  uncertainSnapshots: unknown[];
  createdDrafts: Record<string, unknown>;
  appliedExpansionsByRow: Record<string, unknown>;
  protectedExpansionSnapshots: Record<string, unknown>;
  conflictOperation: unknown;
  lastImport: unknown;
}
interface ImportSessionPayload extends SerializedImportState {
  activeMode?: ImportMode;
  modeWorkspaces?: Partial<Record<ImportMode, SerializedImportModeWorkspace>>;
}
const automaticImportRun = shallowRef<AutomaticImportRun | null>(null);
const selectedRowKeys = shallowRef<Set<string>>(new Set());
const discardInProgress = shallowRef(false);
const confirmedExpansionSignatures = shallowRef<Record<string, string>>({});
const selectedExpansionEventIds = shallowRef<Record<string, string>>({});
const expansionExecutions = shallowRef<Record<string, EventLineupExpansionExecution>>({});
const expansionAuthorizations = shallowRef<Record<string, ConfirmedLineupExpansion>>({});
const handledExpansionOperations = new Set<string>();
const appliedExpansionsByRow = shallowRef<
  Record<string, { eventId: string; operationKey: string }>
>({});
const expansionHistory = shallowRef<
  Array<{
    operationKey: string;
    rowKey: string;
    eventId: string;
    startDate: string;
    result: EventLineupExpansionResponse;
    reconciliation: "removed" | "kept" | "already-handled";
  }>
>([]);
const session = useEventImportSession();
const recoverySession = shallowRef<unknown | null>(null);
const recoveryError = shallowRef("");
const identityReady = shallowRef(false);
const criticalStorageError = shallowRef("");
const protectedSnapshots = shallowRef<NonNullable<ImportPreparation["snapshot"]>[]>([]);
const pendingSnapshotBatchIds = shallowRef<Set<string>>(new Set());
const protectedExpansionSnapshots = shallowRef<
  Record<
    string,
    import("../../application/eventLineupExpansionPreparation").LineupExpansionSnapshot
  >
>({});
const sessionOwnerId = computed(() =>
  auth.authStatus === "authenticated" && auth.userId && isUuid(auth.userId) ? auth.userId : null
);
const currentJsonAnalyzed = computed(() =>
  Boolean(jsonDocument.value && analyzedJsonDocument.value === jsonDocument.value)
);
const selectedCountryLabel = computed(
  () =>
    geography.countryOptions.value.find(({ id }) => id === geography.selectedCountryId.value)
      ?.label ?? ""
);
const jsonPreviewEvents = computed(() => jsonDocument.value?.events.slice(0, 5) ?? []);
const unresolvedJsonReferenceErrors = computed(() => {
  const sourceRowIds = Object.values(jsonAnalyzedRowIds.value);
  return sourceRowIds.reduce((total, rowId) => {
    const artistErrors = Object.values(lineupStates[rowId]?.itemStatus ?? {}).filter(
      (status) => status === "error"
    ).length;
    const geography = geographyStates[rowId];
    const geographyErrors =
      Number(geography?.localityStatus === "error") + Number(geography?.venueStatus === "error");
    const tourErrors = Number(tourStates[rowId]?.status === "error");
    return total + artistErrors + geographyErrors + tourErrors;
  }, 0);
});
const importStageAvailable = computed(() =>
  Boolean(
    preparation.value.snapshot ||
    lastImport.value ||
    uncertainSnapshots.value.length ||
    protectedSnapshots.value.length ||
    automaticImportRun.value
  )
);
const importWriteInProgress = computed(() =>
  Boolean(
    automaticImportRun.value || batchMutation.isPending.value || pendingSnapshotBatchIds.value.size
  )
);
const stageNavigationBusy = computed(
  () =>
    jsonResolutionInProgress.value ||
    Boolean(automaticImportRun.value) ||
    batchMutation.isPending.value ||
    pendingSnapshotBatchIds.value.size > 0
);
const importStages = computed<EventImportStageItem[]>(() => {
  const manualFlow = manualEditorAccessed.value && !currentJsonAnalyzed.value;
  const analysisComplete = currentJsonAnalyzed.value || manualFlow;
  const reviewComplete = activeImportStage.value === "import" || Boolean(lastImport.value);
  return [
    {
      id: "load",
      label: "Cargar archivo",
      status:
        activeImportStage.value === "load"
          ? "current"
          : manualFlow && !currentJsonAnalyzed.value
            ? "skipped"
            : "complete",
      disabled: stageNavigationBusy.value,
      disabledReason: stageNavigationBusy.value
        ? "Espera a que finalice la operación en curso antes de cambiar el archivo."
        : undefined,
    },
    {
      id: "resolve",
      label: "Resolver y analizar",
      status: jsonResolutionInProgress.value
        ? "current"
        : analysisComplete
          ? manualFlow
            ? "skipped"
            : "complete"
          : "pending",
      disabled:
        activeImportStage.value === "resolve" ||
        !jsonDocument.value ||
        (!currentJsonAnalyzed.value && !jsonResolutionInProgress.value) ||
        stageNavigationBusy.value,
      disabledReason: jsonResolutionInProgress.value
        ? "La resolución está en curso."
        : !jsonDocument.value
          ? "Carga y valida un archivo JSON antes de analizarlo."
          : !currentJsonAnalyzed.value
            ? "Pulsa «Analizar y resolver eventos» para iniciar esta etapa."
            : undefined,
    },
    {
      id: "review",
      label: "Revisar eventos",
      status:
        activeImportStage.value === "review" ? "current" : reviewComplete ? "complete" : "pending",
      disabled:
        !analysisComplete ||
        jsonResolutionInProgress.value ||
        (activeImportStage.value === "review" && !importWriteInProgress.value),
      disabledReason: !analysisComplete
        ? "Analiza el JSON antes de revisar sus filas."
        : jsonResolutionInProgress.value
          ? "Espera a que termine la resolución antes de revisar."
          : undefined,
    },
    {
      id: "import",
      label: "Importar y resultados",
      status:
        activeImportStage.value === "import"
          ? "current"
          : lastImport.value
            ? "complete"
            : "pending",
      disabled:
        !importStageAvailable.value ||
        (activeImportStage.value === "import" && !importWriteInProgress.value),
      disabledReason: importStageAvailable.value
        ? undefined
        : "Prepara las filas listas antes de abrir la etapa de importación.",
    },
  ];
});
const previousSessionOwnerId = shallowRef<string | null>(null);
const saveStatusLabel = computed(
  () =>
    ({
      saved: "Guardado",
      dirty: "Cambios pendientes",
      saving: "Guardando…",
      error: "Error al guardar",
    })[session.status.value]
);
const lastSavedLabel = computed(() =>
  session.lastSavedAt.value ? new Date(session.lastSavedAt.value).toLocaleString("es-ES") : ""
);
const recoveryStats = computed(() => {
  const payload = session.storedSession.value?.payload;
  if (!isRecoverablePayload(payload)) return null;
  return {
    rows: payload.rows.length,
    uncertain:
      (Array.isArray(payload.uncertainSnapshots) ? payload.uncertainSnapshots.length : 0) +
      (isRecord(payload.protectedExpansionSnapshots)
        ? Object.keys(payload.protectedExpansionSnapshots).length
        : 0),
  };
});

function rowHasDraftContent(row: (typeof rows.value)[number]): boolean {
  const lineupState = lineupStates[row.id];
  return Boolean(
    row.event.trim() ||
    row.lineup.length ||
    lineupState?.draft.trim() ||
    row.startDateDraft.trim() ||
    row.endDateDraft.trim() ||
    row.city.trim() ||
    row.province.trim() ||
    row.venue.name.trim() ||
    row.price.trim() ||
    row.otherInfo.trim() ||
    row.administrativeRegionId ||
    row.type !== "concert"
  );
}

function createCurrentModeSessionPayload() {
  return {
    state: createEventImportSessionPayload({
      countryId: geography.selectedCountryId.value,
      rows: rows.value,
      lineupStates: Object.fromEntries(
        rows.value.map(({ id }) => [id, { draft: lineupStates[id]?.draft ?? "" }])
      ),
      tourStates: Object.fromEntries(
        rows.value.map(({ id }) => [
          id,
          {
            confirmedTourId: tourStates[id]?.confirmedTourId ?? null,
            selectedCandidateId: tourStates[id]?.selectedCandidateId ?? null,
          },
        ])
      ),
      uncertainSnapshots: protectedSnapshots.value,
      createdDrafts: createdDrafts.value,
      appliedExpansionsByRow: appliedExpansionsByRow.value,
      protectedExpansionSnapshots: protectedExpansionSnapshots.value,
      conflictOperation: conflictOperations.value,
      lastImport: lastImport.value,
    }) as SerializedImportState,
    stage: activeImportStage.value,
    jsonDocument: activeImportMode.value === "json" ? jsonDocument.value : null,
    jsonFileName: activeImportMode.value === "json" ? jsonFileName.value : "",
    jsonFileSizeBytes: activeImportMode.value === "json" ? jsonFileSizeBytes.value : 0,
    jsonAnalyzedRowIds: activeImportMode.value === "json" ? jsonAnalyzedRowIds.value : {},
    resolutionPhases: activeImportMode.value === "json" ? bulkResolutionPhases.value : undefined,
  } satisfies SerializedImportModeWorkspace;
}

function sessionPayload(): ImportSessionPayload {
  const activeWorkspace = createCurrentModeSessionPayload();
  const modeWorkspaces = {
    ...persistedModeWorkspaces.value,
    [activeImportMode.value]: activeWorkspace,
  };
  return {
    ...activeWorkspace.state,
    activeMode: activeImportMode.value,
    modeWorkspaces,
  };
}

function serializedWorkspaceHasWork(workspace: SerializedImportModeWorkspace): boolean {
  const state = workspace.state;
  return (
    state.rows.some((row) => rowHasDraftContent(row as EventImportRow)) ||
    state.uncertainSnapshots.length > 0 ||
    Object.keys(state.createdDrafts).length > 0 ||
    Object.keys(state.appliedExpansionsByRow).length > 0 ||
    Object.keys(state.protectedExpansionSnapshots).length > 0 ||
    (Array.isArray(state.conflictOperation) && state.conflictOperation.length > 0) ||
    (isRecord(state.conflictOperation) && Object.keys(state.conflictOperation).length > 0) ||
    state.lastImport !== null ||
    workspace.jsonDocument !== null
  );
}

function sessionHasWork(): boolean {
  return Object.values(sessionPayload().modeWorkspaces ?? {}).some(
    (workspace) => workspace && serializedWorkspaceHasWork(workspace)
  );
}

function captureModeWorkspace(): ImportModeWorkspace {
  return {
    rows: eventImport.captureWorkspace(),
    countryId: geography.selectedCountryId.value,
    preparation: preparation.value,
    uncertainSnapshots: [...uncertainSnapshots.value],
    protectedSnapshots: [...protectedSnapshots.value],
    handledOperations: new Set(handledOperations),
    handledOperationOrder: [...handledOperationOrder],
    createdDrafts: { ...createdDrafts.value },
    lastImport: lastImport.value,
    conflictOperations: [...conflictOperations.value],
    selectedRowKeys: new Set(selectedRowKeys.value),
    confirmedExpansionSignatures: { ...confirmedExpansionSignatures.value },
    selectedExpansionEventIds: { ...selectedExpansionEventIds.value },
    expansionExecutions: { ...expansionExecutions.value },
    expansionAuthorizations: { ...expansionAuthorizations.value },
    handledExpansionOperations: new Set(handledExpansionOperations),
    appliedExpansionsByRow: { ...appliedExpansionsByRow.value },
    expansionHistory: [...expansionHistory.value],
    protectedExpansionSnapshots: { ...protectedExpansionSnapshots.value },
    pendingSnapshotBatchIds: new Set(pendingSnapshotBatchIds.value),
    jsonDocument: jsonDocument.value,
    jsonFileName: jsonFileName.value,
    jsonFileSizeBytes: jsonFileSizeBytes.value,
    jsonAnalyzedRowIds: { ...jsonAnalyzedRowIds.value },
    jsonError: jsonError.value,
    jsonNotice: jsonNotice.value,
    jsonResolutionError: jsonResolutionError.value,
    activeImportStage: activeImportStage.value,
    analyzedJsonDocument: analyzedJsonDocument.value,
    manualEditorAccessed: manualEditorAccessed.value,
    loadedScrapedEventFingerprints: new Set(loadedScrapedEventFingerprints),
  };
}

function clearModeWorkspace(mode: ImportMode) {
  eventImport.resetRows();
  preparation.value = initialPreparation;
  uncertainSnapshots.value = [];
  protectedSnapshots.value = [];
  handledOperations.clear();
  handledOperationOrder.splice(0);
  createdDrafts.value = {};
  lastImport.value = null;
  conflictOperations.value = [];
  selectedRowKeys.value = new Set();
  confirmedExpansionSignatures.value = {};
  selectedExpansionEventIds.value = {};
  expansionExecutions.value = {};
  expansionAuthorizations.value = {};
  handledExpansionOperations.clear();
  appliedExpansionsByRow.value = {};
  expansionHistory.value = [];
  protectedExpansionSnapshots.value = {};
  pendingSnapshotBatchIds.value = new Set();
  jsonDocument.value = null;
  jsonFileName.value = "";
  jsonFileSizeBytes.value = 0;
  jsonAnalyzedRowIds.value = {};
  jsonError.value = "";
  jsonNotice.value = "";
  jsonResolutionError.value = "";
  analyzedJsonDocument.value = null;
  manualEditorAccessed.value = mode === "manual";
  loadedScrapedEventFingerprints.clear();
  activeImportStage.value = mode === "json" ? "load" : "review";
}

function restoreModeWorkspace(workspace: ImportModeWorkspace) {
  eventImport.restoreWorkspace(workspace.rows);
  if (workspace.countryId) geography.setWorkspaceCountry(workspace.countryId);
  else geography.selectedCountryId.value = "";
  eventImport.setWorkspaceCountryContext(workspace.countryId);
  preparation.value = workspace.preparation;
  uncertainSnapshots.value = [...workspace.uncertainSnapshots];
  protectedSnapshots.value = [...workspace.protectedSnapshots];
  handledOperations.clear();
  workspace.handledOperations.forEach((key) => handledOperations.add(key));
  handledOperationOrder.splice(0, handledOperationOrder.length, ...workspace.handledOperationOrder);
  createdDrafts.value = { ...workspace.createdDrafts };
  lastImport.value = workspace.lastImport;
  conflictOperations.value = [...workspace.conflictOperations];
  selectedRowKeys.value = new Set(workspace.selectedRowKeys);
  confirmedExpansionSignatures.value = { ...workspace.confirmedExpansionSignatures };
  selectedExpansionEventIds.value = { ...workspace.selectedExpansionEventIds };
  expansionExecutions.value = { ...workspace.expansionExecutions };
  expansionAuthorizations.value = { ...workspace.expansionAuthorizations };
  handledExpansionOperations.clear();
  workspace.handledExpansionOperations.forEach((key) => handledExpansionOperations.add(key));
  appliedExpansionsByRow.value = { ...workspace.appliedExpansionsByRow };
  expansionHistory.value = [...workspace.expansionHistory];
  protectedExpansionSnapshots.value = { ...workspace.protectedExpansionSnapshots };
  pendingSnapshotBatchIds.value = new Set(workspace.pendingSnapshotBatchIds);
  jsonDocument.value = workspace.jsonDocument;
  jsonFileName.value = workspace.jsonFileName;
  jsonFileSizeBytes.value = workspace.jsonFileSizeBytes;
  jsonAnalyzedRowIds.value = { ...workspace.jsonAnalyzedRowIds };
  jsonError.value = workspace.jsonError;
  jsonNotice.value = workspace.jsonNotice;
  jsonResolutionError.value = workspace.jsonResolutionError;
  activeImportStage.value = workspace.activeImportStage;
  analyzedJsonDocument.value = workspace.analyzedJsonDocument;
  manualEditorAccessed.value = workspace.manualEditorAccessed;
  loadedScrapedEventFingerprints.clear();
  workspace.loadedScrapedEventFingerprints.forEach((fingerprint) =>
    loadedScrapedEventFingerprints.add(fingerprint)
  );
}

function restoreSerializedModeWorkspace(
  mode: ImportMode,
  workspace: SerializedImportModeWorkspace
) {
  const payload = workspace.state;
  if (payload.countryId && !geography.restoreCountry(payload.countryId)) {
    throw new Error("El país guardado ya no está disponible en el catálogo.");
  }
  eventImport.restoreRows(
    payload.rows as typeof rows.value,
    (payload.lineupStates ?? {}) as typeof lineupStates,
    (payload.tourStates ?? {}) as typeof tourStates
  );
  eventImport.restoreResolutionPhases(workspace.resolutionPhases);
  preparation.value = initialPreparation;
  protectedSnapshots.value = (payload.uncertainSnapshots as typeof protectedSnapshots.value).map(
    (snapshot) => deepFreeze(snapshot)
  );
  uncertainSnapshots.value = [...protectedSnapshots.value];
  createdDrafts.value = payload.createdDrafts as typeof createdDrafts.value;
  appliedExpansionsByRow.value =
    payload.appliedExpansionsByRow as typeof appliedExpansionsByRow.value;
  protectedExpansionSnapshots.value = Object.fromEntries(
    Object.entries(payload.protectedExpansionSnapshots).map(([key, snapshot]) => [
      key,
      deepFreeze(snapshot),
    ])
  ) as typeof protectedExpansionSnapshots.value;
  conflictOperations.value = Array.isArray(payload.conflictOperation)
    ? (payload.conflictOperation as ConflictOperation[])
    : isRecord(payload.conflictOperation)
      ? [payload.conflictOperation as unknown as ConflictOperation]
      : [];
  lastImport.value = isRecord(payload.lastImport)
    ? (payload.lastImport as typeof lastImport.value)
    : null;
  activeImportMode.value = mode;
  jsonDocument.value = mode === "json" ? workspace.jsonDocument : null;
  jsonFileName.value = mode === "json" ? workspace.jsonFileName : "";
  jsonFileSizeBytes.value = mode === "json" ? (workspace.jsonFileSizeBytes ?? 0) : 0;
  jsonAnalyzedRowIds.value = mode === "json" ? (workspace.jsonAnalyzedRowIds ?? {}) : {};
  analyzedJsonDocument.value = jsonDocument.value;
  activeImportStage.value = mode === "json" ? workspace.stage : "review";
  manualEditorAccessed.value = mode === "manual";
  jsonError.value = "";
  jsonNotice.value = "";
  jsonResolutionError.value = "";
  handledOperations.clear();
  handledOperationOrder.splice(0);
  handledExpansionOperations.clear();
  selectedRowKeys.value = new Set();
  loadedScrapedEventFingerprints.clear();
  workspace.jsonDocument?.events.forEach((event) =>
    loadedScrapedEventFingerprints.add(scrapedEventFingerprint(event))
  );
}

function getModeSwitchBlockReason(): string {
  if (
    switchingImportMode.value ||
    jsonLoading.value ||
    jsonResolutionInProgress.value ||
    automaticImportRun.value ||
    batchMutation.isPending.value ||
    pendingSnapshotBatchIds.value.size > 0 ||
    expansionMutation.isPending.value ||
    discardInProgress.value ||
    eventImport.hasActiveResolution()
  )
    return "Espera a que terminen la resolución y las operaciones activas antes de cambiar de modo.";
  return "";
}

const modeSwitchBlockReason = computed(() =>
  modeSwitchAttempt.value >= 0 ? getModeSwitchBlockReason() : ""
);

function modeWorkspaceHasWork(mode: ImportMode): boolean {
  if (mode === activeImportMode.value)
    return serializedWorkspaceHasWork(createCurrentModeSessionPayload());
  const memory = inMemoryModeWorkspaces.get(mode);
  if (memory) {
    return (
      memory.rows.rows.some(rowHasDraftContent) ||
      memory.uncertainSnapshots.length > 0 ||
      (memory.protectedExpansionSnapshots &&
        Object.keys(memory.protectedExpansionSnapshots).length > 0) ||
      Object.keys(memory.createdDrafts).length > 0 ||
      Object.keys(memory.appliedExpansionsByRow).length > 0 ||
      memory.conflictOperations.length > 0 ||
      memory.lastImport !== null ||
      memory.jsonDocument !== null
    );
  }
  const saved = persistedModeWorkspaces.value[mode];
  return saved ? serializedWorkspaceHasWork(saved) : false;
}

async function switchImportMode(mode: ImportMode) {
  modeSwitchAttempt.value += 1;
  if (mode === activeImportMode.value || getModeSwitchBlockReason()) return;
  const sourceMode = activeImportMode.value;
  if (modeWorkspaceHasWork(sourceMode) || modeWorkspaceHasWork(mode)) {
    const confirmation = await SwalService.confirm(
      "Cambiar modo de importación",
      "Los borradores, resultados y operaciones inciertas se conservarán separados en cada modo.",
      "Cambiar de modo",
      "Seguir aquí"
    );
    if (!confirmation.isConfirmed || getModeSwitchBlockReason()) return;
  }

  inMemoryModeWorkspaces.set(sourceMode, captureModeWorkspace());
  if (batchMutation.isError.value) {
    modeBatchErrors.value = {
      ...modeBatchErrors.value,
      [sourceMode]: eventImportGlobalErrorMessage(batchMutation.error.value),
    };
    batchMutation.reset();
  }
  persistedModeWorkspaces.value = {
    ...persistedModeWorkspaces.value,
    [sourceMode]: createCurrentModeSessionPayload(),
  };
  try {
    await session.saveNow();
  } catch {
    criticalStorageError.value =
      "No se pudo guardar el borrador actual. El cambio de modo se ha cancelado para conservarlo.";
    return;
  }

  switchingImportMode.value = true;
  try {
    const memory = inMemoryModeWorkspaces.get(mode);
    if (memory) {
      activeImportMode.value = mode;
      restoreModeWorkspace(memory);
    } else {
      const serialized = persistedModeWorkspaces.value[mode];
      if (serialized) restoreSerializedModeWorkspace(mode, serialized);
      else {
        clearModeWorkspace(mode);
        activeImportMode.value = mode;
      }
    }
    await nextTick();
    criticalStorageError.value = "";
  } catch (error) {
    activeImportMode.value = sourceMode;
    const source = inMemoryModeWorkspaces.get(sourceMode);
    if (source) restoreModeWorkspace(source);
    criticalStorageError.value =
      error instanceof Error ? error.message : "No se pudo restaurar el modo de importación.";
  } finally {
    switchingImportMode.value = false;
  }
  if (activeImportMode.value === mode) {
    session.markDirty();
    try {
      await session.saveNow();
    } catch {
      criticalStorageError.value =
        "El modo cambió y sus datos siguen en memoria, pero no se pudo confirmar el guardado local.";
    }
  }
}

session.configure(sessionPayload, sessionHasWork);
session.startAutosave();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

async function readJsonFile(file?: File) {
  const editorWasAccessible = currentJsonAnalyzed.value || manualEditorAccessed.value;
  jsonError.value = "";
  jsonResolutionError.value = "";
  jsonNotice.value = "";
  manualEditorAccessed.value = editorWasAccessible;
  if (!file) return;
  jsonFileName.value = file.name;
  jsonFileSizeBytes.value = file.size;
  jsonDocument.value = null;
  jsonAnalyzedRowIds.value = {};
  analyzedJsonDocument.value = null;
  if (!file.name.toLocaleLowerCase("und").endsWith(".json")) {
    jsonError.value = "Selecciona un archivo con extensión .json.";
    return;
  }
  if (file.size > SCRAPED_EVENT_JSON_MAX_BYTES) {
    jsonError.value = "El archivo supera el máximo de 2 MiB.";
    return;
  }
  jsonLoading.value = true;
  try {
    const document = parseScrapedEventJson(await file.text());
    jsonDocument.value = document;
    analyzedJsonDocument.value = null;
    jsonFileName.value = file.name;
    jsonFileSizeBytes.value = file.size;
    jsonResolutionError.value = "";
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : "No se pudo leer el JSON.";
  } finally {
    jsonLoading.value = false;
  }
}

function navigateImportStage(stage: EventImportStageId) {
  if (
    activeImportMode.value !== "json" ||
    stage === activeImportStage.value ||
    jsonResolutionInProgress.value
  )
    return;
  if (importWriteInProgress.value && stage !== "review" && stage !== "import") return;
  if (stage === "load") {
    activeImportStage.value = stage;
    return;
  }
  if (stage === "resolve" && currentJsonAnalyzed.value) {
    activeImportStage.value = stage;
    return;
  }
  if (stage === "review" && (currentJsonAnalyzed.value || manualEditorAccessed.value)) {
    activeImportStage.value = stage;
    return;
  }
  if (stage === "import" && importStageAvailable.value) activeImportStage.value = stage;
}

async function continueToJsonReview() {
  if (activeImportMode.value !== "json" || jsonResolutionInProgress.value || !jsonDocument.value)
    return;
  analyzedJsonDocument.value = jsonDocument.value;
  await nextTick();
  eventImport.completeImportValidation();
  activeImportStage.value = "review";
}

function continueToImportStage() {
  if (!importStageAvailable.value || jsonResolutionInProgress.value) return;
  activeImportStage.value = "import";
}

function handleJsonDrop(event: DragEvent) {
  event.preventDefault();
  jsonDragging.value = false;
  void readJsonFile(event.dataTransfer?.files.item(0) ?? undefined);
}

function cancelSelectedJsonFile() {
  if (jsonLoading.value || stageNavigationBusy.value) return;
  jsonDocument.value = null;
  jsonFileName.value = "";
  jsonFileSizeBytes.value = 0;
  jsonError.value = "";
  jsonNotice.value = "";
  jsonAnalyzedRowIds.value = {};
}

function normalizedRegionName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("und");
}

function importedDateIdentity(row: EventImportRow, field: "startDate" | "endDate"): string {
  const date = row[field];
  if (date) return date;
  const draft = row[`${field}Draft`];
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u.exec(draft.trim());
  return match ? `${match[3]}-${match[2]!.padStart(2, "0")}-${match[1]!.padStart(2, "0")}` : draft;
}

async function continueJsonImport() {
  const document = jsonDocument.value;
  if (!document) return;
  const countryKey = document.country.trim().toLocaleLowerCase("und");
  const matchingCountry = geography.countryOptions.value.find(
    (country) =>
      country.label.trim().toLocaleLowerCase("und") === countryKey ||
      country.isoCode.toLocaleLowerCase("und") === countryKey
  );
  if (!matchingCountry) {
    jsonError.value = `El país “${document.country}” no coincide con el catálogo. Selecciona un país válido y usa su nombre o código ISO en el JSON.`;
    return;
  }
  if (analyzedJsonDocument.value === document) {
    manualEditorAccessed.value = false;
    activeImportStage.value = "review";
    return;
  }

  activeImportStage.value = "resolve";
  jsonResolutionInProgress.value = true;
  jsonResolutionError.value = "";
  jsonNotice.value = "";
  try {
    geography.selectCountry(matchingCountry.id);
    const regionCatalog = document.events.some((event) => event.region)
      ? await geography.loadRegions().catch(() => [])
      : [];
    let unresolvedRegions = 0;
    const importedFingerprints = new Set([
      ...loadedScrapedEventFingerprints,
      ...rows.value.map((row) =>
        scrapedEventFingerprint({
          type: row.type === "festival" ? "festival" : "concert",
          title: row.event,
          startDate: importedDateIdentity(row, "startDate"),
          endDate: importedDateIdentity(row, "endDate"),
          locality: row.city,
          province: row.province,
          artists: row.lineup.map(({ name }) => name),
        })
      ),
    ]);
    let skippedExisting = 0;
    const indexedRowsToLoad = document.events
      .map((event, index) => ({ event, index }))
      .filter(({ event, index }) => {
        if (
          document.duplicateIndexes.includes(index) ||
          event.issues.some(
            (issue) => issue.startsWith("Tipo inválido") || issue.startsWith("El país del evento")
          )
        )
          return false;
        const fingerprint = scrapedEventFingerprint(event);
        if (importedFingerprints.has(fingerprint)) {
          skippedExisting++;
          return false;
        }
        importedFingerprints.add(fingerprint);
        loadedScrapedEventFingerprints.add(fingerprint);
        return true;
      });
    const rowsToLoad = indexedRowsToLoad.map(({ event }) => ({
      type: event.type,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      artists: event.artists,
      venue: event.venue,
      locality: event.locality,
      province: event.province,
      administrativeRegionId: (() => {
        if (!event.region) return null;
        const matches = regionCatalog.filter(
          (region) => normalizedRegionName(region.name) === normalizedRegionName(event.region)
        );
        if (matches.length !== 1) unresolvedRegions++;
        return matches.length === 1 ? matches[0]!.id : null;
      })(),
      price: event.price,
      additionalInfo: event.additionalInfo,
    }));
    const analyzedRowIds = await eventImport.appendImportedRowsAndResolve(rowsToLoad);
    const rowIdsBySourceIndex: Record<number, string> = Object.fromEntries(
      indexedRowsToLoad.map(({ index }, rowIndex) => [index, analyzedRowIds[rowIndex]!])
    );
    const skippedIndexes = new Set([
      ...document.duplicateIndexes,
      ...document.events.flatMap((event, index) =>
        event.issues.some(
          (issue) => issue.startsWith("Tipo inválido") || issue.startsWith("El país del evento")
        )
          ? [index]
          : []
      ),
    ]);
    document.events.forEach((event, index) => {
      if (rowIdsBySourceIndex[index] || skippedIndexes.has(index)) return;
      const fingerprint = scrapedEventFingerprint(event);
      const existingRow = rows.value.find(
        (row) =>
          scrapedEventFingerprint({
            type: row.type,
            title: row.event,
            startDate: row.startDate ?? "",
            endDate: row.endDate ?? "",
            locality: row.city,
            province: row.province,
            artists: row.lineup.map(({ name }) => name),
          }) === fingerprint
      );
      if (existingRow) rowIdsBySourceIndex[index] = existingRow.id;
    });
    jsonAnalyzedRowIds.value = rowIdsBySourceIndex;
    analyzedJsonDocument.value = document;
    await nextTick();
    eventImport.completeImportValidation();
    await nextTick();
    if (!jsonReviewInitialized.value && jsonReviewEntries.value) {
      const initialCounts = jsonReviewEntries.value.counts;
      jsonReviewFilter.value = initialCounts["needs-review"]
        ? "needs-review"
        : initialCounts.conflicts
          ? "conflicts"
          : initialCounts.invalid
            ? "invalid"
            : "all";
      jsonReviewInitialized.value = true;
    }
    manualEditorAccessed.value = false;
    jsonNotice.value = `${rowsToLoad.length} eventos añadidos al editor${skippedExisting ? `; ${skippedExisting} ya estaban cargados y se omitieron` : ""}${unresolvedRegions ? `; ${unresolvedRegions} regiones no coincidieron con el catálogo y requieren revisión` : ""}.`;
    activeImportStage.value = "review";
  } catch (error) {
    jsonResolutionError.value =
      error instanceof Error ? error.message : "No se pudo completar el análisis del archivo.";
  } finally {
    jsonResolutionInProgress.value = false;
  }
}

function isValidImportRow(value: unknown): value is EventImportRow {
  if (!isRecord(value) || !/^event-row-[1-9]\d*$/u.test(String(value.id))) return false;
  if (!["concert", "festival", "tour"].includes(String(value.type))) return false;
  if (
    !["event", "price", "otherInfo", "city", "province", "startDateDraft", "endDateDraft"].every(
      (key) => typeof value[key] === "string"
    )
  )
    return false;
  if (
    !["startDate", "endDate"].every((key) => value[key] === null || typeof value[key] === "string")
  )
    return false;
  if (!isRecord(value.venue) || typeof value.venue.name !== "string") return false;
  if (
    ![value.venue.venueId, value.venue.localityId, value.administrativeRegionId].every(
      (id) => id === null || (typeof id === "string" && isUuid(id))
    )
  )
    return false;
  if (!Array.isArray(value.lineup)) return false;
  return value.lineup.every(
    (item) =>
      isRecord(item) &&
      /^lineup-item-[1-9]\d*$/u.test(String(item.key)) &&
      typeof item.name === "string" &&
      (item.artistId === null || (typeof item.artistId === "string" && isUuid(item.artistId)))
  );
}

function isValidImportSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    isUuid(String(value.batchId)) &&
    isUuid(String(value.countryId)) &&
    isRecord(value.payload) &&
    value.payload.batchId === value.batchId &&
    Array.isArray(value.rows) &&
    value.rows.length > 0 &&
    value.rows.length <= 100 &&
    value.rows.every(
      (row) =>
        isRecord(row) &&
        typeof row.rowKey === "string" &&
        isUuid(String(row.operationRowId)) &&
        Number.isInteger(row.revision) &&
        isRecord(row.dto) &&
        row.dto.rowId === row.operationRowId
    ) &&
    Array.isArray(value.payload.rows) &&
    value.payload.rows.length === value.rows.length &&
    value.rows.every((row, index) => {
      const dto = value.payload.rows[index];
      return isRecord(dto) && dto.rowId === row.operationRowId;
    })
  );
}

function isValidExpansionSnapshot(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.kind === "event-lineup-expansion" &&
    isUuid(String(value.eventId)) &&
    isRecord(value.operation) &&
    isUuid(String(value.operation.batchId)) &&
    isUuid(String(value.operation.rowId)) &&
    isRecord(value.payload) &&
    value.payload.batchId === value.operation.batchId &&
    value.payload.rowId === value.operation.rowId &&
    isRecord(value.payload.sourceRow) &&
    isRecord(value.correlation) &&
    value.payload.sourceRow.rowId === value.operation.rowId &&
    typeof value.correlation.sourceRowKey === "string" &&
    isUuid(String(value.correlation.sourceOperationRowId)) &&
    isUuid(String(value.correlation.sourceBatchId)) &&
    isRecord(value.correlation.sourceSnapshot) &&
    Array.isArray(value.payload.artists) &&
    value.payload.artists.length > 0 &&
    value.payload.artists.length <= 100 &&
    value.payload.artists.every(
      (artist) =>
        isRecord(artist) &&
        typeof artist.name === "string" &&
        (artist.artistId === undefined || isUuid(String(artist.artistId)))
    )
  );
}

function isValidScrapedDocument(value: unknown): value is ScrapedEventJsonDocument {
  return (
    isRecord(value) &&
    (value.version === 1 || value.version === 2) &&
    typeof value.sourceName === "string" &&
    typeof value.country === "string" &&
    Array.isArray(value.duplicateIndexes) &&
    value.duplicateIndexes.every(Number.isInteger) &&
    Array.isArray(value.events) &&
    value.events.every(
      (event) =>
        isRecord(event) &&
        ["concert", "festival", "tour"].includes(String(event.type)) &&
        [
          "title",
          "startDate",
          "endDate",
          "venue",
          "locality",
          "province",
          "region",
          "country",
          "price",
          "additionalInfo",
          "originalUrl",
          "externalId",
        ].every((key) => typeof event[key] === "string") &&
        Array.isArray(event.artists) &&
        event.artists.every((artist) => typeof artist === "string") &&
        Array.isArray(event.issues) &&
        event.issues.every((issue) => typeof issue === "string")
    )
  );
}

function isRecoverablePayload(value: unknown): value is ImportSessionPayload {
  if (
    !isRecord(value) ||
    (value.countryId !== "" && (typeof value.countryId !== "string" || !isUuid(value.countryId))) ||
    !Array.isArray(value.rows)
  )
    return false;
  const rowIds = new Set<string>();
  const lineupKeys = new Set<string>();
  const validRows = value.rows.every((row) => {
    if (!isValidImportRow(row) || rowIds.has(row.id)) return false;
    rowIds.add(row.id);
    for (const item of row.lineup) {
      if (lineupKeys.has(item.key)) return false;
      lineupKeys.add(item.key);
    }
    return true;
  });
  const validLineupStates =
    isRecord(value.lineupStates) &&
    Object.values(value.lineupStates).every(
      (state) => isRecord(state) && typeof state.draft === "string"
    );
  const validTourStates =
    isRecord(value.tourStates) &&
    Object.values(value.tourStates).every(
      (state) =>
        isRecord(state) &&
        [state.confirmedTourId, state.selectedCandidateId].every(
          (id) => id === null || (typeof id === "string" && isUuid(id))
        )
    );
  const validCreatedDrafts =
    isRecord(value.createdDrafts) &&
    Object.values(value.createdDrafts).every(
      (draft) =>
        isRecord(draft) && isUuid(String(draft.eventId)) && isUuid(String(draft.operationRowId))
    );
  const validAppliedExpansions =
    isRecord(value.appliedExpansionsByRow) &&
    Object.values(value.appliedExpansionsByRow).every(
      (applied) =>
        isRecord(applied) &&
        isUuid(String(applied.eventId)) &&
        typeof applied.operationKey === "string"
    );
  const isValidState =
    validRows &&
    validLineupStates &&
    validTourStates &&
    Array.isArray(value.uncertainSnapshots) &&
    value.uncertainSnapshots.every(isValidImportSnapshot) &&
    validCreatedDrafts &&
    validAppliedExpansions &&
    isRecord(value.protectedExpansionSnapshots) &&
    Object.values(value.protectedExpansionSnapshots).every(isValidExpansionSnapshot) &&
    (value.conflictOperation === null ||
      isRecord(value.conflictOperation) ||
      (Array.isArray(value.conflictOperation) && value.conflictOperation.every(isRecord))) &&
    (value.lastImport === null || isRecord(value.lastImport));
  if (!isValidState) return false;
  if (
    value.activeMode !== undefined &&
    value.activeMode !== "manual" &&
    value.activeMode !== "json"
  )
    return false;
  if (value.modeWorkspaces !== undefined) {
    if (!isRecord(value.modeWorkspaces)) return false;
    for (const [mode, workspace] of Object.entries(value.modeWorkspaces)) {
      if (
        (mode !== "manual" && mode !== "json") ||
        !isRecord(workspace) ||
        !isRecoverablePayload(workspace.state) ||
        (workspace.stage !== "load" &&
          workspace.stage !== "resolve" &&
          workspace.stage !== "review" &&
          workspace.stage !== "import") ||
        typeof workspace.jsonFileName !== "string" ||
        (workspace.jsonFileSizeBytes !== undefined &&
          (typeof workspace.jsonFileSizeBytes !== "number" ||
            !Number.isFinite(workspace.jsonFileSizeBytes) ||
            workspace.jsonFileSizeBytes < 0)) ||
        (workspace.jsonAnalyzedRowIds !== undefined &&
          (!isRecord(workspace.jsonAnalyzedRowIds) ||
            !Object.entries(workspace.jsonAnalyzedRowIds).every(
              ([index, rowId]) => /^\d+$/u.test(index) && typeof rowId === "string"
            ))) ||
        (workspace.resolutionPhases !== undefined &&
          (!Array.isArray(workspace.resolutionPhases) ||
            !workspace.resolutionPhases.every(
              (phase) =>
                isRecord(phase) &&
                ["artists", "geography", "venues", "tours", "validation"].includes(
                  String(phase.id)
                ) &&
                ["pending", "in-progress", "complete", "error"].includes(String(phase.status)) &&
                typeof phase.label === "string" &&
                [phase.processed, phase.total, phase.errors].every(
                  (count) => typeof count === "number" && Number.isFinite(count) && count >= 0
                )
            ))) ||
        (workspace.jsonDocument !== null && !isValidScrapedDocument(workspace.jsonDocument))
      )
        return false;
    }
  }
  return true;
}

function payloadHasRecoverableWork(payload: ImportSessionPayload): boolean {
  return (
    payload.rows.some(rowHasDraftContent) ||
    payload.uncertainSnapshots.length > 0 ||
    Object.keys(payload.createdDrafts).length > 0 ||
    Object.keys(payload.appliedExpansionsByRow).length > 0 ||
    Object.keys(payload.protectedExpansionSnapshots).length > 0 ||
    payload.lastImport !== null ||
    Object.values(payload.modeWorkspaces ?? {}).some(
      (workspace) => workspace && serializedWorkspaceHasWork(workspace)
    )
  );
}

watch(
  () => [
    rows.value,
    rows.value.map(({ id }) => lineupStates[id]?.draft ?? ""),
    rows.value.map(({ id }) => tourStates[id]?.confirmedTourId ?? null),
    geography.selectedCountryId.value,
    protectedSnapshots.value,
    createdDrafts.value,
    appliedExpansionsByRow.value,
    protectedExpansionSnapshots.value,
    conflictOperations.value,
    lastImport.value,
  ],
  () => {
    if (identityReady.value && !switchingImportMode.value) session.markDirty();
  },
  { deep: true }
);

watch(
  sessionOwnerId,
  async (ownerId) => {
    const shouldClearPreviousAccount =
      previousSessionOwnerId.value !== null && previousSessionOwnerId.value !== ownerId;
    previousSessionOwnerId.value = ownerId;
    identityReady.value = false;
    recoverySession.value = null;
    recoveryError.value = "";
    if (shouldClearPreviousAccount) {
      eventImport.resetRows();
      activeImportMode.value = "manual";
      activeImportStage.value = "review";
      inMemoryModeWorkspaces.clear();
      persistedModeWorkspaces.value = {};
      modeBatchErrors.value = {};
      geography.selectedCountryId.value = "";
      uncertainSnapshots.value = [];
      protectedSnapshots.value = [];
      pendingSnapshotBatchIds.value = new Set();
      protectedExpansionSnapshots.value = {};
      createdDrafts.value = {};
      appliedExpansionsByRow.value = {};
      conflictOperations.value = [];
      automaticImportRun.value = null;
      lastImport.value = null;
      jsonDocument.value = null;
      jsonFileName.value = "";
      jsonFileSizeBytes.value = 0;
      jsonAnalyzedRowIds.value = {};
      jsonError.value = "";
      jsonNotice.value = "";
      analyzedJsonDocument.value = null;
      loadedScrapedEventFingerprints.clear();
      expansionHistory.value = [];
      expansionExecutions.value = {};
      handledOperations.clear();
      handledOperationOrder.splice(0);
      handledExpansionOperations.clear();
    }
    if (!ownerId) {
      session.changeOwner(null);
      return;
    }
    session.changeOwner(ownerId);
    try {
      const saved = await session.load(ownerId);
      if (sessionOwnerId.value !== ownerId) return;
      if (saved) {
        if (saved.formatVersion !== EVENT_IMPORT_SESSION_FORMAT_VERSION) {
          recoveryError.value =
            "El borrador se creó con otra versión y no se puede restaurar. Puedes descartarlo.";
          recoverySession.value = saved;
        } else if (!isRecoverablePayload(saved.payload)) {
          recoveryError.value =
            "El borrador local no supera la validación. No se ha restaurado y puedes descartarlo.";
          recoverySession.value = saved;
        } else if (payloadHasRecoverableWork(saved.payload)) {
          recoverySession.value = saved;
        }
      } else if (shouldClearPreviousAccount) {
        if (!geography.countryOptions.value.length) await geography.countriesQuery.refetch();
        if (sessionOwnerId.value !== ownerId) return;
        const defaultCountry = geography.countryOptions.value.find(
          ({ isoCode }) => isoCode === "ES"
        );
        if (defaultCountry) geography.restoreCountry(defaultCountry.id);
      }
    } catch {
      recoveryError.value =
        "No se pudo leer el borrador local. Los datos no se han eliminado; puedes reintentar desde el indicador de guardado.";
    } finally {
      if (sessionOwnerId.value === ownerId) {
        identityReady.value = true;
        if (sessionHasWork()) session.markDirty();
      }
    }
  },
  { immediate: true }
);

async function recoverSession() {
  const saved = session.storedSession.value;
  if (
    !saved ||
    saved.formatVersion !== EVENT_IMPORT_SESSION_FORMAT_VERSION ||
    !isRecoverablePayload(saved.payload)
  )
    return;
  const payload = saved.payload;
  if (geography.countriesQuery.isPending.value) await geography.countriesQuery.refetch();
  if (sessionOwnerId.value !== saved.ownerId) return;
  if (payload.countryId && !geography.restoreCountry(payload.countryId)) {
    recoveryError.value =
      "El país del borrador ya no está disponible en el catálogo. No se ha restaurado para evitar resolver entidades con otro país.";
    return;
  }
  persistedModeWorkspaces.value = payload.modeWorkspaces ?? {};
  const restoredMode = payload.activeMode ?? "manual";
  const restoredWorkspace = payload.modeWorkspaces?.[restoredMode] ?? {
    state: payload,
    stage: restoredMode === "json" ? "review" : "review",
    jsonDocument: null,
    jsonFileName: "",
  };
  restoreSerializedModeWorkspace(restoredMode, restoredWorkspace);
  recoverySession.value = null;
  recoveryError.value = "";
  session.markDirty();
}

async function retryStorageRead() {
  const ownerId = sessionOwnerId.value;
  if (!ownerId) return;
  try {
    const saved = await session.load(ownerId);
    if (sessionOwnerId.value !== ownerId) return;
    recoveryError.value = "";
    if (saved) {
      recoverySession.value = saved;
      if (saved.formatVersion !== EVENT_IMPORT_SESSION_FORMAT_VERSION) {
        recoveryError.value =
          "El borrador se creó con otra versión y no se puede restaurar. Puedes descartarlo.";
      } else if (!isRecoverablePayload(saved.payload)) {
        recoveryError.value =
          "El borrador local no supera la validación. No se ha restaurado y puedes descartarlo.";
      } else if (!payloadHasRecoverableWork(saved.payload)) {
        recoverySession.value = null;
      }
    }
  } catch {
    recoveryError.value = "No se pudo leer el borrador local. No se han eliminado datos.";
  }
}

async function discardSession() {
  const saved = session.storedSession.value;
  const operationOwner = sessionOwnerId.value;
  if (!saved || !operationOwner || saved.ownerId !== operationOwner) return;
  const hasUncertain =
    protectedSnapshots.value.length > 0 ||
    Object.keys(protectedExpansionSnapshots.value).length > 0 ||
    (isRecoverablePayload(saved.payload) &&
      ((saved.payload.uncertainSnapshots?.length ?? 0) > 0 ||
        Object.keys(saved.payload.protectedExpansionSnapshots).length > 0));
  const result = await SwalService.confirm(
    "¿Descartar la sesión local?",
    `Se eliminarán los borradores locales. Los eventos ya guardados no se eliminarán.${hasUncertain ? " Una operación puede haberse completado; al descartar el borrador ya no podrás comprobar su resultado." : ""}`,
    "Descartar sesión",
    "Cancelar"
  );
  if (!result.isConfirmed) return;
  if (sessionOwnerId.value !== operationOwner) return;
  await session.discard(saved.ownerId);
  recoverySession.value = null;
  recoveryError.value = "";
  eventImport.resetRows();
  activeImportMode.value = "manual";
  activeImportStage.value = "review";
  inMemoryModeWorkspaces.clear();
  persistedModeWorkspaces.value = {};
  modeBatchErrors.value = {};
  uncertainSnapshots.value = [];
  protectedSnapshots.value = [];
  createdDrafts.value = {};
  appliedExpansionsByRow.value = {};
  protectedExpansionSnapshots.value = {};
  lastImport.value = null;
  conflictOperations.value = [];
  jsonDocument.value = null;
  jsonFileName.value = "";
  jsonFileSizeBytes.value = 0;
  jsonAnalyzedRowIds.value = {};
  loadedScrapedEventFingerprints.clear();
}

function retrySessionSave() {
  if (!identityReady.value) {
    criticalStorageError.value =
      "Espera a que termine la comprobación del borrador local antes de guardar.";
    return;
  }
  void session
    .saveNow()
    .then(() => {
      criticalStorageError.value = "";
    })
    .catch(() => {
      criticalStorageError.value =
        "El almacenamiento local sigue sin responder. El borrador permanece en memoria y la operación crítica no se enviará.";
    });
}
const expansionExecutionCounts = computed(() => {
  const executions = Object.values(expansionExecutions.value);
  return {
    uncertain: executions.filter(({ state }) => state === "uncertain").length,
    conflicts: executions.filter(({ state }) => state === "conflict").length,
    failures: executions.filter(({ state }) => state === "failed").length,
  };
});

function expansionConfirmationKey(conflict: EventImportConflictPresentation): string {
  return JSON.stringify([
    conflict.operationId,
    conflict.operationRowId,
    conflict.code,
    conflict.existingEventIds,
    conflict.candidateEventIds,
    conflict.relatedRows.map(({ operationRowId }) => operationRowId),
  ]);
}

function expansionExecutionKey(conflict: EventImportConflictPresentation): string {
  return expansionConfirmationKey(conflict);
}

function getExpansionExecution(
  conflict: EventImportConflictPresentation
): EventLineupExpansionExecution | null {
  return expansionExecutions.value[expansionExecutionKey(conflict)] ?? null;
}

function getExpansionConfirmation(conflict: EventImportConflictPresentation): string | null {
  return confirmedExpansionSignatures.value[expansionConfirmationKey(conflict)] ?? null;
}

function setExpansionConfirmation(
  conflict: EventImportConflictPresentation,
  signature: string | null
) {
  const key = expansionConfirmationKey(conflict);
  const next = { ...confirmedExpansionSignatures.value };
  if (signature) next[key] = signature;
  else delete next[key];
  confirmedExpansionSignatures.value = next;
}

function getExpansionSelection(conflict: EventImportConflictPresentation): string | null {
  return selectedExpansionEventIds.value[expansionConfirmationKey(conflict)] ?? null;
}

function setExpansionSelection(conflict: EventImportConflictPresentation, eventId: string | null) {
  const key = expansionConfirmationKey(conflict);
  const next = { ...selectedExpansionEventIds.value };
  if (eventId) next[key] = eventId;
  else delete next[key];
  selectedExpansionEventIds.value = next;
}

const conflictsByRowKey = computed(() => {
  if (!conflictOperations.value.length) return {};
  const existingRowKeys = new Set(rows.value.map(({ id }) => id));
  return conflictOperations.value.reduce<Record<string, EventImportConflictPresentation[]>>(
    (groups, operation) => {
      const presentations = createEventImportConflictPresentation(
        operation.snapshot,
        operation.results,
        existingRowKeys,
        (rowKey) =>
          existingRowKeys.has(rowKey) &&
          preparer.isCurrent(operation.snapshot, rowKey, currentInput())
      );
      presentations.forEach((conflict) => {
        (groups[conflict.rowKey] ??= []).push(conflict);
      });
      return groups;
    },
    {}
  );
});

function prepareLineupExpansionForConflict(
  rowKey: string,
  operationRowId: string,
  selectedEventId?: string
) {
  const conflict = conflictsByRowKey.value[rowKey]?.find(
    (candidate) => candidate.operationRowId === operationRowId
  );
  if (!conflict) return null;
  const currentRows = new Map(rows.value.map((row) => [row.id, row]));
  const revisions = new Map([
    ...preparation.value.eligibleRows.map(({ rowKey, revision }) => [rowKey, revision] as const),
    ...preparation.value.pendingRows.map(({ rowKey, revision }) => [rowKey, revision] as const),
  ]);
  return lineupExpansionPreparer.prepare({
    conflict,
    currentRow: currentRows.get(conflict.rowKey),
    lineupState: lineupStates[conflict.rowKey],
    currentRevision: revisions.get(conflict.rowKey),
    rowCreated: Boolean(createdDrafts.value[conflict.rowKey]),
    creationUncertain: uncertainSnapshots.value.some((snapshot) =>
      snapshot.rows.some(({ rowKey: snapshotRowKey }) => snapshotRowKey === conflict.rowKey)
    ),
    selectedEventId,
  });
}

function prepareLineupExpansion(
  conflict: EventImportConflictPresentation,
  selectedEventId?: string
) {
  return prepareLineupExpansionForConflict(
    conflict.rowKey,
    conflict.operationRowId,
    selectedEventId
  );
}

function canReviewLineupExpansion(conflict: EventImportConflictPresentation): boolean {
  if (
    Object.values(protectedExpansionSnapshots.value).some(
      (snapshot) => snapshot.correlation.sourceRowKey === conflict.rowKey
    )
  )
    return false;
  if (
    conflict.status !== "current" ||
    (!conflict.existingEventIds.length && !conflict.candidateEventIds.length) ||
    !conflict.matchingArtists.length
  )
    return false;
  const isApplicableConflict =
    (conflict.snapshot.type === "festival" && conflict.code === "FESTIVAL_DUPLICATE") ||
    (conflict.snapshot.type !== "festival" &&
      (conflict.code === "CONCERT_DUPLICATE" ||
        conflict.code === "CONCERT_ARTIST_DATE_LOCALITY_CONFLICT"));
  if (!isApplicableConflict) return false;
  const prepared = prepareLineupExpansion(conflict);
  if (!prepared || prepared.state === "obsolete") return false;
  if (
    prepared.state === "pending" &&
    prepared.pendingReasons.some((reason) =>
      [
        "source-row-missing",
        "source-row-changed",
        "row-created",
        "creation-operation-uncertain",
        "row-discarded",
      ].includes(reason)
    )
  )
    return false;
  return true;
}

async function executeConfirmedExpansion(
  conflict: EventImportConflictPresentation,
  confirmationSignature: string
) {
  const operationOwner = sessionOwnerId.value;
  if (!identityReady.value || !operationOwner) return;
  const uiKey = expansionExecutionKey(conflict);
  if (expansionMutation.isPending.value || getExpansionExecution(conflict)?.state === "sending")
    return;
  if (getExpansionConfirmation(conflict) !== confirmationSignature) {
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "invalid",
        message:
          "La autorización ya no coincide con la propuesta revisada. Revisa y confirma de nuevo.",
      },
    };
    return;
  }

  const currentConflict = conflictsByRowKey.value[conflict.rowKey]?.find(
    (candidate) =>
      candidate.operationId === conflict.operationId &&
      candidate.operationRowId === conflict.operationRowId &&
      candidate.code === conflict.code
  );
  const selectedEventId = getExpansionSelection(conflict) ?? undefined;
  const currentPreparation = currentConflict
    ? prepareLineupExpansion(currentConflict, selectedEventId)
    : null;
  if (
    !currentConflict ||
    currentConflict.status !== "current" ||
    currentPreparation?.state !== "ready"
  ) {
    setExpansionConfirmation(conflict, null);
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "invalid",
        message: "La fila o el conflicto cambió. Vuelve a revisar la propuesta actual.",
      },
    };
    return;
  }
  const snapshot = currentPreparation.snapshot;
  const previousAuthorization = expansionAuthorizations.value[uiKey];
  if (
    previousAuthorization &&
    getExpansionExecution(conflict)?.state === "uncertain" &&
    JSON.stringify(previousAuthorization.snapshot) !== JSON.stringify(snapshot)
  ) {
    setExpansionConfirmation(conflict, null);
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "invalid",
        message:
          "La propuesta ya no coincide con la operación autorizada. Revísala y confirma una nueva propuesta.",
      },
    };
    return;
  }
  const operationKey = lineupExpansionOperationKey(snapshot);
  if (handledExpansionOperations.has(operationKey)) return;
  if (
    uncertainSnapshots.value.some((pending) =>
      pending.rows.some(({ rowKey }) => rowKey === conflict.rowKey)
    )
  ) {
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "invalid",
        message: "La creación original sigue incierta y bloquea esta ampliación.",
      },
    };
    return;
  }

  try {
    const eventContext = await queryClient.fetchQuery({
      ...existingEventDetailQueryOptions(snapshot.eventId),
      staleTime: 0,
    });
    if (sessionOwnerId.value !== operationOwner) return;
    const freshSignature = lineupExpansionConfirmationSignature(
      snapshot,
      currentConflict,
      eventContext
    );
    const retryingUncertainOperation = getExpansionExecution(conflict)?.state === "uncertain";
    if (
      (!retryingUncertainOperation && freshSignature !== confirmationSignature) ||
      getExpansionConfirmation(currentConflict) !== confirmationSignature
    ) {
      setExpansionConfirmation(currentConflict, null);
      expansionExecutions.value = {
        ...expansionExecutions.value,
        [uiKey]: {
          state: "invalid",
          message:
            "El destino cambió desde la revisión. Inspecciona de nuevo el evento y confirma la propuesta actual.",
        },
      };
      return;
    }
  } catch {
    if (sessionOwnerId.value !== operationOwner) return;
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "failed",
        operationKey,
        message: "No se pudo completar la operación. Comprueba la conexión y vuelve a intentarlo.",
      },
    };
    return;
  }

  const authorization =
    previousAuthorization &&
    JSON.stringify(previousAuthorization.snapshot) === JSON.stringify(snapshot)
      ? previousAuthorization
      : authorizeLineupExpansion(snapshot, confirmationSignature);
  expansionAuthorizations.value = { ...expansionAuthorizations.value, [uiKey]: authorization };
  expansionExecutions.value = { ...expansionExecutions.value, [uiKey]: { state: "sending" } };
  protectedExpansionSnapshots.value = {
    ...protectedExpansionSnapshots.value,
    [operationKey]: snapshot,
  };
  try {
    await session.saveNow();
    if (sessionOwnerId.value !== operationOwner) return;
    criticalStorageError.value = "";
  } catch {
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "failed",
        operationKey,
        message: "No se pudo guardar la propuesta. Reintenta el guardado antes de continuar.",
      },
    };
    criticalStorageError.value = "No se pudo guardar la propuesta. La operación no se ha enviado.";
    return;
  }
  try {
    const response = await expansionMutation.mutateAsync(authorization);
    if (sessionOwnerId.value !== operationOwner) return;
    const reconciliation = reconcileLineupExpansionResult(
      snapshot,
      response,
      (authorizedSnapshot) => {
        const latestConflict = conflictsByRowKey.value[
          authorizedSnapshot.correlation.sourceRowKey
        ]?.find(
          (candidate) =>
            candidate.operationId === authorizedSnapshot.correlation.sourceBatchId &&
            candidate.operationRowId === authorizedSnapshot.correlation.sourceOperationRowId &&
            candidate.code === authorizedSnapshot.correlation.sourceConflictCode
        );
        const latestPreparation = latestConflict
          ? prepareLineupExpansion(latestConflict, authorizedSnapshot.eventId)
          : null;
        return (
          latestConflict?.status === "current" &&
          latestPreparation?.state === "ready" &&
          JSON.stringify(latestPreparation.snapshot) === JSON.stringify(authorizedSnapshot)
        );
      },
      (rowKey) => rows.value.some((row) => row.id === rowKey),
      handledExpansionOperations
    );
    if (reconciliation.action !== "already-handled") {
      if (reconciliation.action === "removed") removeRow(reconciliation.rowKey);
      else if (reconciliation.rowPresent) {
        appliedExpansionsByRow.value = {
          ...appliedExpansionsByRow.value,
          [reconciliation.rowKey]: { eventId: response.eventId, operationKey },
        };
      }
      expansionHistory.value = [
        ...expansionHistory.value,
        {
          operationKey,
          rowKey: reconciliation.rowKey,
          eventId: response.eventId,
          startDate: snapshot.payload.sourceRow.startDate,
          result: response,
          reconciliation: reconciliation.action,
        },
      ];
    }
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: "updated",
        result: response,
        reconciliation: reconciliation.action,
      },
    };
    const remainingProtected = { ...protectedExpansionSnapshots.value };
    delete remainingProtected[operationKey];
    protectedExpansionSnapshots.value = remainingProtected;
    refreshPreparation();
    await session.saveNow().catch(() => undefined);
  } catch (error) {
    if (sessionOwnerId.value !== operationOwner) return;
    const failureKind = lineupExpansionFailureKind(error);
    expansionExecutions.value = {
      ...expansionExecutions.value,
      [uiKey]: {
        state: failureKind === "global" ? "failed" : failureKind,
        operationKey,
        message: lineupExpansionErrorMessage(error),
        technicalDetail: error,
      },
    };
    if (failureKind !== "uncertain") {
      const remainingProtected = { ...protectedExpansionSnapshots.value };
      delete remainingProtected[operationKey];
      protectedExpansionSnapshots.value = remainingProtected;
    } else void session.saveNow().catch(() => undefined);
  }
}

async function retryRecoveredExpansion(
  snapshot: import("../../application/eventLineupExpansionPreparation").LineupExpansionSnapshot
) {
  const operationOwner = sessionOwnerId.value;
  if (!operationOwner || !identityReady.value) return;
  const operationKey = lineupExpansionOperationKey(snapshot);
  if (
    !Object.values(protectedExpansionSnapshots.value).some(
      (item) => lineupExpansionOperationKey(item) === operationKey
    ) ||
    expansionMutation.isPending.value
  )
    return;
  const confirmation = await SwalService.confirm(
    "Reintentar ampliación incierta",
    `Se volverá a intentar añadir ${snapshot.payload.artists.map(({ name }) => name).join(", ")} al concierto del ${formatImportDate(snapshot.payload.sourceRow.startDate)}. Puede que la operación ya se haya completado.`,
    "Reintentar operación",
    "Cancelar"
  );
  if (!confirmation.isConfirmed) return;
  try {
    await session.saveNow();
    if (sessionOwnerId.value !== operationOwner) return;
  } catch {
    if (sessionOwnerId.value !== operationOwner) return;
    criticalStorageError.value =
      "No se pudo asegurar el guardado local, así que la operación no se ha enviado.";
    return;
  }
  try {
    const response = await expansionMutation.mutateAsync(
      authorizeLineupExpansion(snapshot, `restored-retry:${operationKey}`)
    );
    if (sessionOwnerId.value !== operationOwner) return;
    const reconciliation = reconcileLineupExpansionResult(
      snapshot,
      response,
      () => false,
      (rowKey) => rows.value.some(({ id }) => id === rowKey),
      handledExpansionOperations
    );
    if (reconciliation.rowPresent) {
      appliedExpansionsByRow.value = {
        ...appliedExpansionsByRow.value,
        [reconciliation.rowKey]: { eventId: response.eventId, operationKey },
      };
    }
    expansionHistory.value = [
      ...expansionHistory.value,
      {
        operationKey,
        rowKey: reconciliation.rowKey,
        eventId: response.eventId,
        result: response,
        reconciliation: reconciliation.rowPresent ? "kept" : "already-handled",
      },
    ];
    const remaining = { ...protectedExpansionSnapshots.value };
    delete remaining[operationKey];
    protectedExpansionSnapshots.value = remaining;
    await session.saveNow().catch(() => undefined);
  } catch (error) {
    if (sessionOwnerId.value !== operationOwner) return;
    if (lineupExpansionFailureKind(error) === "uncertain")
      await session.saveNow().catch(() => undefined);
    else {
      const remaining = { ...protectedExpansionSnapshots.value };
      delete remaining[operationKey];
      protectedExpansionSnapshots.value = remaining;
      await session.saveNow().catch(() => undefined);
    }
  }
}

defineExpose({ prepareLineupExpansionForConflict });

const rowProblems = computed(() => {
  const problems: Record<
    string,
    { label: string; fields: string[]; historical?: boolean; code?: string }
  > = {};
  const currentRows = new Map(rows.value.map((row) => [row.id, row]));
  const latestResults = new Map(
    (lastImport.value?.rows ?? []).map((result) => [result.item.rowKey, result])
  );
  const resolutionErrors = new Set<string>();

  for (const row of rows.value) {
    const pending = preparation.value.pendingRows.find(({ rowKey }) => rowKey === row.id);
    const reasons = pending?.reasons.filter((reason) => reason !== "batch-limit-exceeded") ?? [];
    const result = latestResults.get(row.id);
    const conflicts = conflictsByRowKey.value[row.id] ?? [];
    if (
      Object.keys(lineupStates[row.id]?.itemStatus ?? {}).some(
        (key) => lineupStates[row.id]?.itemStatus[key] === "error"
      ) ||
      geographyStates[row.id]?.localityStatus === "error" ||
      geographyStates[row.id]?.venueStatus === "error" ||
      tourStates[row.id]?.status === "error"
    )
      resolutionErrors.add(row.id);

    if (createdDrafts.value[row.id]) {
      problems[row.id] = {
        label: "Este evento ya se creó. Revisa el borrador actual antes de continuar.",
        fields: [],
      };
      continue;
    }
    if (appliedExpansionsByRow.value[row.id]) {
      problems[row.id] = {
        label:
          "La fila cambió después de actualizar el lineup. Revisa el borrador antes de continuar.",
        fields: [],
        historical: true,
      };
      continue;
    }
    if (
      uncertainSnapshots.value.some((snapshot) =>
        snapshot.rows.some(({ rowKey }) => rowKey === row.id)
      )
    ) {
      problems[row.id] = {
        label:
          "No sabemos si la operación terminó. Comprueba el resultado reintentando la misma operación.",
        fields: [],
      };
      continue;
    }
    if (conflicts.length) {
      problems[row.id] = {
        label: "Conflicto detectado. Consulta el detalle y las filas relacionadas.",
        fields: [],
        historical: conflicts.every(({ status }) => status === "historical"),
      };
      continue;
    }
    if (result?.item.result.status === "invalid" || result?.item.result.status === "failed") {
      const status = result.item.result.status;
      const code = result.item.result.code;
      problems[row.id] = {
        label:
          status === "invalid"
            ? "Hay información que debes corregir antes de continuar."
            : code === "LOCALITY_GEOCODING_UNAVAILABLE"
              ? "No se pudo geolocalizar la localidad. Comprueba la localidad, provincia y región administrativa; si son correctas, reintenta más tarde. Código: LOCALITY_GEOCODING_UNAVAILABLE."
              : "No se pudo completar la operación. Puedes reintentarlo.",
        fields: [],
        historical: !result.current,
        ...(code ? { code } : {}),
      };
      continue;
    }
    if (resolutionErrors.has(row.id)) {
      problems[row.id] = {
        label: "Error técnico durante la resolución. Revisa el detalle de la celda y reintenta.",
        fields: [],
      };
      continue;
    }
    if (reasons.length && hasRowContent(row.id)) {
      const labels: string[] = [];
      const fields = new Set<string>();
      for (const reason of reasons) {
        if (reason.startsWith("artist-")) {
          const itemKey = reason.split(":")[1];
          const index = row.lineup.findIndex(({ key }) => key === itemKey);
          fields.add(
            index >= 0 ? `Artistas / Lineup, aparición ${index + 1}` : "Artistas / Lineup"
          );
          if (reason === "artist-draft-unconfirmed") labels.push("Confirma el artista pendiente");
          else if (reason.includes("ambiguous")) labels.push("artistas pendientes de seleccionar");
          else if (reason.includes("invalid")) labels.push("artistas no válidos");
          else if (reason.includes("error")) labels.push("error al resolver artistas");
          else labels.push("artistas pendientes de resolver");
        } else if (reason === "lineup-required") {
          labels.push("faltan artistas");
          fields.add("Artistas / Lineup");
        } else if (reason.includes("date") || reason === "end-date-before-start-date") {
          labels.push(
            reason === "start-date-invalid"
              ? row.startDateDraft.trim()
                ? "fecha de inicio no válida"
                : "falta fecha de inicio"
              : reason === "end-date-before-start-date"
                ? "fecha de fin anterior a la de inicio"
                : "fecha de fin no válida"
          );
          fields.add(
            reason === "end-date-before-start-date" || reason.startsWith("start-date")
              ? "Fecha de inicio"
              : "Fecha de fin"
          );
          if (reason === "end-date-before-start-date") fields.add("Fecha de fin");
        } else if (reason.includes("locality-ambiguous")) {
          labels.push("localidad pendiente de seleccionar");
          fields.add("Ciudad / Provincia");
        } else if (reason.includes("locality") || reason.includes("administrative-region")) {
          labels.push("localidad pendiente de completar o corregir");
          fields.add("Ciudad / Provincia / región administrativa");
        } else if (reason.includes("venue-ambiguous")) {
          labels.push("recinto pendiente de seleccionar");
          fields.add("Recinto / localidad");
        } else if (reason.includes("venue")) {
          labels.push("recinto pendiente de corregir o resolver");
          fields.add("Recinto / localidad");
        } else if (
          reason.includes("tour-confirmation-required") ||
          reason.includes("tour-ambiguous")
        ) {
          labels.push("gira pendiente de confirmar");
          fields.add("Nombre / confirmación de gira");
        } else if (reason.includes("tour")) {
          labels.push("gira pendiente de resolver");
          fields.add("Nombre de gira");
        } else if (reason === "city-required") {
          labels.push("falta ciudad");
          fields.add("Ciudad");
        } else if (reason === "name-required") {
          labels.push("falta el nombre del evento");
          fields.add("Nombre del evento");
        } else if (reason === "country-unavailable") {
          labels.push("selecciona un país");
          fields.add("País");
        } else {
          labels.push("Fila pendiente de completar");
        }
      }
      problems[row.id] = { label: [...new Set(labels)].join("; "), fields: [...fields] };
    } else if (pending?.reasons.includes("batch-limit-exceeded")) {
      problems[row.id] = {
        label: "Fila pendiente de otro envío; el máximo operativo es de 50 filas por operación.",
        fields: [],
      };
    } else if (hasRowContent(row.id) && preparation.value.readyRowIds.includes(row.id)) {
      problems[row.id] = {
        label: preparation.value.eligibleRows.some(({ rowKey }) => rowKey === row.id)
          ? "Lista para importar"
          : "Lista para un lote posterior; no requiere corrección.",
        fields: [],
      };
    }
  }
  // Preserve historical result context for rows that remain in the editor after an edit.
  for (const [rowKey, result] of latestResults) {
    if (
      currentRows.has(rowKey) &&
      !result.current &&
      !problems[rowKey] &&
      result.item.result.status !== "created"
    ) {
      problems[rowKey] = {
        label: `Resultado anterior: ${result.item.result.status}. La fila fue editada después del envío.`,
        fields: [],
        historical: true,
      };
    }
  }
  return problems;
});

const jsonReviewInvalidRowIds = computed(() => {
  const invalidReasonCodes = new Set([
    "invalid-type",
    "start-date-invalid",
    "end-date-invalid",
    "end-date-before-start-date",
    "city-required",
    "lineup-required",
    "name-required",
  ]);
  const invalidRowIds = new Set(
    preparation.value.errors
      .filter(({ reasons }) => reasons.some((reason) => invalidReasonCodes.has(reason)))
      .map(({ rowKey }) => rowKey)
  );
  for (const result of lastImport.value?.rows ?? []) {
    if (result.item.result.status === "invalid") invalidRowIds.add(result.item.rowKey);
  }
  return invalidRowIds;
});
const jsonReviewConflictRowIds = computed(() => new Set(Object.keys(conflictsByRowKey.value)));

const jsonAnalysisCounts = computed(() => {
  const document = jsonDocument.value;
  if (!document) return null;
  const readyIds = new Set(preparation.value.readyRowIds);
  return summarizeEventImportAnalysis(
    document,
    jsonAnalyzedRowIds.value,
    readyIds,
    unresolvedJsonReferenceErrors.value,
    jsonReviewInvalidRowIds.value,
    jsonReviewConflictRowIds.value
  );
});
const jsonInterventionSummary = computed(() => {
  const jsonRowIds = new Set(Object.values(jsonAnalyzedRowIds.value));
  const jsonPendingRows = preparation.value.pendingRows.filter(({ rowKey }) =>
    jsonRowIds.has(rowKey)
  );
  return summarizeEventImportIntervention(jsonPendingRows, rows.value);
});

const jsonReviewEntries = computed(() => {
  if (!jsonDocument.value || !currentJsonAnalyzed.value) return null;
  const invalidRowIds = jsonReviewInvalidRowIds.value;
  const preparedRowIds = new Set(preparation.value.readyRowIds);
  const conflictRowIds = jsonReviewConflictRowIds.value;
  const mappedIndexes = new Set(Object.keys(jsonAnalyzedRowIds.value).map(Number));
  const excludedIndexes = new Set([
    ...jsonDocument.value.duplicateIndexes,
    ...jsonDocument.value.events.flatMap((event, index) =>
      event.issues.some(
        (issue) =>
          issue === `Evento ${index + 1}: debe ser un objeto.` ||
          issue.startsWith("Tipo inválido") ||
          issue.startsWith("El país del evento")
      )
        ? [index]
        : []
    ),
  ]);
  const alreadyInDraftIndexes = new Set(
    jsonDocument.value.events.flatMap((_, index) =>
      !mappedIndexes.has(index) && !excludedIndexes.has(index) ? [index] : []
    )
  );
  return buildEventImportReviewEntries({
    document: jsonDocument.value,
    analyzedRowIds: jsonAnalyzedRowIds.value,
    rows: rows.value,
    preparedRowIds,
    invalidRowIds,
    conflictRowIds,
    alreadyInDraftIndexes,
  });
});

const filteredJsonReviewEntries = computed(() =>
  jsonReviewEntries.value
    ? filterEventImportReviewEntries(
        jsonReviewEntries.value.entries,
        jsonReviewFilter.value,
        jsonReviewSearch.value
      )
    : []
);
const visibleJsonReviewRows = computed(() =>
  filteredJsonReviewEntries.value.flatMap((entry) => (entry.row ? [entry.row] : []))
);
const selectedReviewExcludedEntries = computed(() =>
  filteredJsonReviewEntries.value.filter((entry) => !entry.row)
);

watch(jsonReviewEntries, (next, previous) => {
  if (!next || !previous || jsonReviewFilter.value === "all") return;
  const oldByRowId = new Map(
    previous.entries.flatMap((entry) => (entry.rowId ? [[entry.rowId, entry] as const] : []))
  );
  const moved = next.entries.find((entry) => {
    if (!entry.rowId || !oldByRowId.has(entry.rowId)) return false;
    const old = oldByRowId.get(entry.rowId)!;
    return old.category === jsonReviewFilter.value && entry.category !== jsonReviewFilter.value;
  });
  if (moved) {
    const label = moved.row?.event || moved.source.title || moved.source.artists.join(" + ");
    jsonReviewNotice.value = `${label || "La fila"} cambió a «${reviewCategoryLabel(moved.category)}» y ya no aparece en «${reviewCategoryLabel(jsonReviewFilter.value)}». El filtro y la búsqueda se mantienen; usa «Todos» para localizarla.`;
  }
});

function reviewCategoryLabel(category: EventImportReviewFilter | "already-draft"): string {
  if (category === "already-draft") return "Ya en el borrador";
  return {
    "needs-review": "Necesitan revisión",
    prepared: "Preparados",
    conflicts: "Conflictos",
    invalid: "Inválidos",
    duplicates: "Duplicados del archivo",
    all: "Todos",
  }[category];
}

function currentInput() {
  return {
    rows: rows.value,
    countryId: geography.selectedCountryId.value,
    countryAvailable: Boolean(geography.selectedCountry.value),
    lineupStates,
    geographyStates,
    tourStates,
  };
}

function refreshPreparation() {
  const blockedRows: Record<string, string> = {};
  Object.keys(createdDrafts.value).forEach((rowKey) => {
    blockedRows[rowKey] = "event-already-created-draft-diverged";
  });
  Object.keys(appliedExpansionsByRow.value).forEach((rowKey) => {
    blockedRows[rowKey] = "lineup-expansion-already-applied";
  });
  uncertainSnapshots.value.forEach((snapshot) => {
    snapshot.rows.forEach(({ rowKey }) => {
      if (rows.value.some((row) => row.id === rowKey)) blockedRows[rowKey] = "operation-uncertain";
    });
  });
  protectedSnapshots.value.forEach((snapshot) => {
    snapshot.rows.forEach(({ rowKey }) => {
      if (rows.value.some((row) => row.id === rowKey))
        blockedRows[rowKey] = "operation-snapshot-protected";
    });
  });
  automaticImportRun.value?.excludedRowKeys.forEach((rowKey) => {
    if (rows.value.some((row) => row.id === rowKey))
      blockedRows[rowKey] = "automatic-batch-already-processed";
  });
  preparation.value = preparer.prepare({ ...currentInput(), blockedRows });
}

watch(
  () => [rows.value, lineupStates, geographyStates, tourStates, geography.selectedCountryId.value],
  refreshPreparation,
  { deep: true, immediate: true }
);

interface ImportBatchOutcome {
  response: ImportBatchResponse;
  rows: ReturnType<typeof reconcileEventImportResults>["results"];
  conflictOperation: ConflictOperation | null;
  rowLabels: Record<string, string>;
}

function importRowLabel(rowKey: string): string {
  const row = rows.value.find(({ id }) => id === rowKey);
  if (!row) return "Fila importada";
  const title = row.event.trim() || row.lineup.map(({ name }) => name).join(" + ");
  const date = row.startDate ? formatImportDate(row.startDate) : "fecha sin indicar";
  const locality = row.city.trim() || "localidad sin indicar";
  const kind = row.type === "festival" ? "Festival" : row.type === "tour" ? "Gira" : "Concierto";
  return [title || kind, date, locality].join(" · ");
}

async function sendSnapshot(
  snapshot: NonNullable<ImportPreparation["snapshot"]>
): Promise<ImportBatchOutcome | null> {
  if (pendingSnapshotBatchIds.value.has(snapshot.batchId)) return null;
  const operationOwner = sessionOwnerId.value;
  pendingSnapshotBatchIds.value = new Set([...pendingSnapshotBatchIds.value, snapshot.batchId]);
  if (!identityReady.value || !operationOwner) {
    criticalStorageError.value =
      "Espera a que termine la comprobación del borrador local antes de enviar.";
    const pending = new Set(pendingSnapshotBatchIds.value);
    pending.delete(snapshot.batchId);
    pendingSnapshotBatchIds.value = pending;
    return null;
  }
  const isRetry = protectedSnapshots.value.some((item) => item.batchId === snapshot.batchId);
  if (!isRetry) protectedSnapshots.value = [...protectedSnapshots.value, snapshot];
  refreshPreparation();
  try {
    await session.saveNow();
    if (sessionOwnerId.value !== operationOwner) return null;
    criticalStorageError.value = "";
  } catch {
    if (sessionOwnerId.value !== operationOwner) return null;
    criticalStorageError.value =
      "No se pudo guardar la propuesta, así que la importación no se ha enviado.";
    refreshPreparation();
    const pending = new Set(pendingSnapshotBatchIds.value);
    pending.delete(snapshot.batchId);
    pendingSnapshotBatchIds.value = pending;
    return null;
  }
  try {
    const nextModeErrors = { ...modeBatchErrors.value };
    delete nextModeErrors[activeImportMode.value];
    modeBatchErrors.value = nextModeErrors;
    const response = await batchMutation.mutateAsync(snapshot);
    if (sessionOwnerId.value !== operationOwner) return null;
    const reconciliation = reconcileEventImportResults(
      snapshot,
      response,
      (source, rowKey) => preparer.isCurrent(source, rowKey, currentInput()),
      handledOperations,
      (rowKey) => rows.value.some((row) => row.id === rowKey)
    );
    reconciliation.results.forEach(({ item, action }) => {
      if (action === "ignored") return;
      const operationKey = `${snapshot.batchId}:${item.operationRowId}`;
      if (item.result.status !== "failed") {
        handledOperations.add(operationKey);
        handledOperationOrder.push(operationKey);
        if (handledOperationOrder.length > 1000) {
          const expiredOperation = handledOperationOrder.shift();
          if (expiredOperation) handledOperations.delete(expiredOperation);
        }
      }
    });
    const nextCreatedDrafts = { ...createdDrafts.value };
    reconciliation.createdDrafts.forEach(({ rowKey, eventId, operationRowId }) => {
      if (rows.value.some((row) => row.id === rowKey)) {
        nextCreatedDrafts[rowKey] = { eventId, operationRowId };
      }
    });
    createdDrafts.value = nextCreatedDrafts;
    const rowLabels = Object.fromEntries(
      reconciliation.results.map(({ item }) => [item.rowKey, importRowLabel(item.rowKey)])
    );
    removeRows(reconciliation.rowKeysToRemove);
    const conflictRows = reconciliation.results
      .filter(({ item, action }) => action !== "ignored" && item.result.status === "conflict")
      .map(({ item }) => item);
    const conflictOperation = conflictRows.length ? { snapshot, results: conflictRows } : null;
    if (reconciliation.results.some(({ action }) => action !== "ignored")) {
      lastImport.value = { response, rows: reconciliation.results, rowLabels };
      conflictOperations.value = conflictOperation ? [conflictOperation] : [];
    }
    uncertainSnapshots.value = uncertainSnapshots.value.filter(
      (pending) => pending.batchId !== snapshot.batchId
    );
    protectedSnapshots.value = protectedSnapshots.value.filter(
      (pending) => pending.batchId !== snapshot.batchId
    );
    refreshPreparation();
    await session.saveNow().catch(() => undefined);
    const pending = new Set(pendingSnapshotBatchIds.value);
    pending.delete(snapshot.batchId);
    pendingSnapshotBatchIds.value = pending;
    return { response, rows: reconciliation.results, conflictOperation, rowLabels };
  } catch (error) {
    if (sessionOwnerId.value !== operationOwner) return null;
    if (
      eventImportErrorCanRetry(error) &&
      !uncertainSnapshots.value.some((pending) => pending.batchId === snapshot.batchId)
    ) {
      uncertainSnapshots.value = [...uncertainSnapshots.value, snapshot];
    }
    if (eventImportErrorCanRetry(error)) {
      protectedSnapshots.value = protectedSnapshots.value.some(
        ({ batchId }) => batchId === snapshot.batchId
      )
        ? protectedSnapshots.value
        : [...protectedSnapshots.value, snapshot];
    } else {
      protectedSnapshots.value = protectedSnapshots.value.filter(
        ({ batchId }) => batchId !== snapshot.batchId
      );
    }
    refreshPreparation();
    await session.saveNow().catch(() => undefined);
    const pending = new Set(pendingSnapshotBatchIds.value);
    pending.delete(snapshot.batchId);
    pendingSnapshotBatchIds.value = pending;
    return null;
  }
}

async function runAutomaticImport(firstSnapshot: NonNullable<ImportPreparation["snapshot"]>) {
  const operationOwner = sessionOwnerId.value;
  const runId = firstSnapshot.batchId;
  const remainingReadyRows = preparation.value.pendingRows.filter(({ reasons }) =>
    reasons.includes("batch-limit-exceeded")
  ).length;
  automaticImportRun.value = {
    id: runId,
    ownerId: operationOwner ?? "",
    countryId: firstSnapshot.countryId,
    excludedRowKeys: new Set(firstSnapshot.rows.map(({ rowKey }) => rowKey)),
    completedBatches: 0,
    completedRows: 0,
    totalRows: firstSnapshot.rows.length + remainingReadyRows,
    totalBatches: Math.ceil((firstSnapshot.rows.length + remainingReadyRows) / 50),
    createdEventIds: new Set<string>(),
    unchangedRows: 0,
    conflicts: 0,
    invalidRows: 0,
    failedRows: 0,
    stopRequested: false,
  };
  refreshPreparation();

  const responseResults: ImportBatchResponse["results"] = [];
  const reconciledRows: ReturnType<typeof reconcileEventImportResults>["results"] = [];
  const rowLabels: Record<string, string> = {};
  const operations: ConflictOperation[] = [];
  let snapshot: NonNullable<ImportPreparation["snapshot"]> | null = firstSnapshot;

  try {
    while (snapshot && automaticImportRun.value?.id === runId) {
      const run = automaticImportRun.value;
      if (
        !operationOwner ||
        sessionOwnerId.value !== run.ownerId ||
        geography.selectedCountryId.value !== run.countryId
      )
        break;

      const outcome = await sendSnapshot(snapshot);
      if (!outcome) break;
      responseResults.push(...outcome.response.results);
      reconciledRows.push(...outcome.rows);
      Object.assign(rowLabels, outcome.rowLabels);
      if (outcome.conflictOperation) operations.push(outcome.conflictOperation);

      lastImport.value = {
        response: { batchId: snapshot.batchId, results: [...responseResults] },
        rows: [...reconciledRows],
        rowLabels: { ...rowLabels },
      };
      conflictOperations.value = [...operations];
      const currentRun = automaticImportRun.value;
      const createdEventIds = new Set(currentRun?.createdEventIds ?? []);
      outcome.response.results.forEach(({ result }) => {
        if (result.status === "created") createdEventIds.add(result.eventId);
      });
      automaticImportRun.value = {
        ...(currentRun ?? run),
        completedBatches: run.completedBatches + 1,
        completedRows: run.completedRows + outcome.response.results.length,
        createdEventIds,
        unchangedRows:
          (currentRun?.unchangedRows ?? run.unchangedRows) +
          outcome.response.results.filter(({ result }) => result.status === "unchanged").length,
        conflicts:
          (currentRun?.conflicts ?? run.conflicts) +
          outcome.response.results.filter(({ result }) => result.status === "conflict").length,
        invalidRows:
          (currentRun?.invalidRows ?? run.invalidRows) +
          outcome.response.results.filter(({ result }) => result.status === "invalid").length,
        failedRows:
          (currentRun?.failedRows ?? run.failedRows) +
          outcome.response.results.filter(({ result }) => result.status === "failed").length,
      };
      await session.saveNow().catch(() => undefined);

      if (
        sessionOwnerId.value !== run.ownerId ||
        geography.selectedCountryId.value !== run.countryId
      )
        break;
      if (automaticImportRun.value?.stopRequested) break;
      if (
        outcome.response.results.some(
          ({ result }) => result.status === "failed" && result.code === "IMPORT_PREFLIGHT_FAILED"
        )
      )
        break;
      snapshot = preparation.value.snapshot;
      if (snapshot) {
        const currentRun = automaticImportRun.value;
        if (!currentRun || currentRun.id !== runId) break;
        automaticImportRun.value = {
          ...currentRun,
          excludedRowKeys: new Set([
            ...currentRun.excludedRowKeys,
            ...snapshot.rows.map(({ rowKey }) => rowKey),
          ]),
        };
        refreshPreparation();
      }
    }
  } finally {
    if (automaticImportRun.value?.id === runId) {
      automaticImportRun.value = null;
      refreshPreparation();
      await session.saveNow().catch(() => undefined);
    }
  }
}

function stopAutomaticImportAfterCurrentBatch() {
  const run = automaticImportRun.value;
  if (!run || run.stopRequested) return;
  automaticImportRun.value = { ...run, stopRequested: true };
}

function importEligibleRows() {
  const snapshot = preparation.value.snapshot;
  if (!snapshot || batchMutation.isPending.value || automaticImportRun.value) return;
  void runAutomaticImport(snapshot);
}

function retrySameBatch(snapshot: NonNullable<ImportPreparation["snapshot"]>) {
  if (!snapshot || batchMutation.isPending.value) return;
  void sendSnapshot(snapshot);
}

function pruneRemovedCreatedDrafts() {
  const next = Object.fromEntries(
    Object.entries(createdDrafts.value).filter(([rowKey]) =>
      rows.value.some((row) => row.id === rowKey)
    )
  );
  if (Object.keys(next).length !== Object.keys(createdDrafts.value).length) {
    createdDrafts.value = next;
    refreshPreparation();
  }
  appliedExpansionsByRow.value = Object.fromEntries(
    Object.entries(appliedExpansionsByRow.value).filter(([rowKey]) =>
      rows.value.some((row) => row.id === rowKey)
    )
  );
}

function hasRowContent(rowKey: string): boolean {
  const row = rows.value.find(({ id }) => id === rowKey);
  const lineupState = lineupStates[rowKey];
  return Boolean(
    row &&
    (row.event.trim() ||
      row.lineup.length ||
      lineupState?.draft.trim() ||
      row.startDateDraft.trim() ||
      row.endDateDraft.trim() ||
      row.venue.name.trim() ||
      row.price.trim() ||
      row.otherInfo.trim() ||
      row.city.trim() ||
      row.province.trim() ||
      row.administrativeRegionId ||
      row.type !== "concert")
  );
}

function isUncertainRow(rowKey: string): boolean {
  return uncertainSnapshots.value.some((snapshot) =>
    snapshot.rows.some(({ rowKey: key }) => key === rowKey)
  );
}

function toggleRowSelection(rowKey: string, selected: boolean) {
  const next = new Set(selectedRowKeys.value);
  if (selected && rows.value.some(({ id }) => id === rowKey)) next.add(rowKey);
  else next.delete(rowKey);
  selectedRowKeys.value = next;
}

watch(
  () => rows.value.map(({ id }) => id),
  (rowKeys) => {
    const existing = new Set(rowKeys);
    const next = new Set([...selectedRowKeys.value].filter((rowKey) => existing.has(rowKey)));
    if (next.size !== selectedRowKeys.value.size) selectedRowKeys.value = next;
  }
);

async function discardRows(requestedKeys: readonly string[]) {
  if (discardInProgress.value) return;
  const operationOwner = sessionOwnerId.value;
  if (!operationOwner) return;
  discardInProgress.value = true;
  const rowKeys = [...new Set(requestedKeys)].filter((key) =>
    rows.value.some(({ id }) => id === key)
  );
  if (!rowKeys.length) {
    discardInProgress.value = false;
    return;
  }
  const firstIndex = Math.min(
    ...rowKeys.map((key) => rows.value.findIndex(({ id }) => id === key))
  );
  const contentCount = rowKeys.filter(hasRowContent).length;
  const uncertainCount = rowKeys.filter(isUncertainRow).length;
  const createdCount = rowKeys.filter((key) => Boolean(createdDrafts.value[key])).length;
  if (contentCount) {
    const title =
      rowKeys.length === 1 ? "¿Descartar esta fila?" : `¿Descartar ${rowKeys.length} filas?`;
    const details = [
      `${rowKeys.length} borrador${rowKeys.length === 1 ? "" : "es"} local${rowKeys.length === 1 ? "" : "es"} desaparecerá${rowKeys.length === 1 ? "" : "n"} de la tabla.`,
      "No se borrarán eventos ya existentes.",
      createdCount
        ? "El evento creado seguirá existiendo; solo se retirará el borrador local."
        : "",
      uncertainCount
        ? "El resultado todavía no está confirmado. Si descartas la fila, ya no podrás comprobarlo desde aquí."
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const confirmation = await SwalService.confirm(
      title,
      details,
      "Descartar borrador",
      "Cancelar"
    );
    if (!confirmation.isConfirmed) {
      discardInProgress.value = false;
      return;
    }
  }
  if (sessionOwnerId.value !== operationOwner) {
    discardInProgress.value = false;
    return;
  }
  rowKeys.forEach((rowKey) => removeRow(rowKey));
  selectedRowKeys.value = new Set(
    [...selectedRowKeys.value].filter((key) => !rowKeys.includes(key))
  );
  pruneRemovedCreatedDrafts();
  discardInProgress.value = false;
  await session.saveNow().catch(() => undefined);
  await nextTick();
  const focusRow = rows.value[Math.min(firstIndex, rows.value.length - 1)];
  const target = focusRow ? document.getElementById(`event-import-row-${focusRow.id}`) : null;
  const nextControl = target?.querySelector<HTMLElement>("input, select, button, textarea");
  (nextControl ?? document.getElementById("event-row-count"))?.focus();
}

function discardSelectedRows() {
  void discardRows([...selectedRowKeys.value]);
}

function quantity(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const lastImportSummary = computed(() => {
  if (!lastImport.value) return "";
  const categories: string[] = [];
  const imported = countDistinctCreatedEvents(lastImport.value.response);
  const unchanged = lastImport.value.rows.filter(
    ({ item }) => item.result.status === "unchanged"
  ).length;
  const conflicts = lastImport.value.rows.filter(
    ({ item }) => item.result.status === "conflict"
  ).length;
  const invalid = lastImport.value.rows.filter(
    ({ item }) => item.result.status === "invalid"
  ).length;
  const failed = lastImport.value.rows.filter(({ item }) => item.result.status === "failed").length;
  const preserved = lastImport.value.rows.filter(
    ({ rowPresent, current }) => rowPresent && !current
  ).length;

  if (imported) categories.push(quantity(imported, "evento importado", "eventos importados"));
  if (unchanged) categories.push(quantity(unchanged, "evento omitido", "eventos omitidos"));
  if (conflicts) categories.push(quantity(conflicts, "conflicto", "conflictos"));
  if (invalid) categories.push(quantity(invalid, "fila inválida", "filas inválidas"));
  if (failed) categories.push(quantity(failed, "fila fallida", "filas fallidas"));
  if (preserved)
    categories.push(
      quantity(preserved, "fila conservada tras cambios", "filas conservadas tras cambios")
    );

  return ["Importación finalizada", ...categories].join(" · ");
});

const unchangedImportDetails = computed(() =>
  (lastImport.value?.rows ?? [])
    .filter(({ item }) => item.result.status === "unchanged")
    .map(({ item }) => ({
      key: item.operationRowId,
      label: lastImport.value?.rowLabels?.[item.rowKey] ?? "Fila importada",
    }))
);

const removedRowImportHistory = computed(() =>
  (lastImport.value?.rows ?? [])
    .filter(({ rowPresent }) => !rowPresent)
    .filter(({ item }) => item.result.status !== "conflict")
    .map(({ item }) =>
      item.result.status === "created"
        ? "Se creó un evento a partir de una fila que ya no está en el borrador."
        : "El resultado corresponde a una fila que ya no está en el borrador."
    )
);

function formatImportDate(date: string): string {
  const [year, month, day] = date.split("-");
  const monthName = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ][Number(month) - 1];
  return year && day && monthName ? `${Number(day)} de ${monthName} de ${year}` : date;
}

watch(
  () =>
    rows.value.some((row) => {
      const state = geographyStates[row.id];
      return (
        state?.localityStatus === "new" &&
        state.localityResult?.status === "new" &&
        state.localityResult.requiresAdministrativeRegionId
      );
    }),
  (required) => {
    if (required && !switchingImportMode.value) void geography.loadRegions();
  },
  { immediate: true }
);

function updateRowCount(event: Event) {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  const nextCount = input.valueAsNumber;
  if (!Number.isInteger(nextCount) || nextCount < 0) {
    input.value = String(rows.value.length);
    return;
  }
  if (nextCount < rows.value.length) {
    const removedRowKeys = rows.value.slice(nextCount).map(({ id }) => id);
    input.value = String(rows.value.length);
    void discardRows(removedRowKeys);
    return;
  }
  eventImport.setRowCount(nextCount);
}
</script>

<template>
  <div class="flex h-[calc(100dvh-3rem)] min-h-[24rem] flex-col gap-3">
    <header class="shrink-0">
      <div class="flex items-start gap-3">
        <span
          class="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rv-purple/10 text-rv-purple dark:bg-rv-purple/20 dark:text-purple-200"
          aria-hidden="true"
        >
          <i class="fa-solid fa-ticket"></i>
        </span>
        <div>
          <h1 class="text-2xl font-bold leading-tight text-rv-navy dark:text-white md:text-3xl">
            Importador de conciertos, festivales y giras
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Manual abre la tabla directamente. JSON de scraping organiza la carga masiva en cuatro
            etapas. Los borradores de cada modo se guardan por separado en este navegador.
          </p>
        </div>
      </div>
      <p v-if="!identityReady" class="mt-4 text-sm text-gray-600 dark:text-gray-300" role="status">
        {{
          geography.countriesQuery.isPending.value
            ? "Cargando catálogo de países…"
            : "Comprobando la sesión local…"
        }}
      </p>
      <div v-else-if="sessionOwnerId && !recoverySession && !recoveryError" class="mt-4">
        <EventImportCountrySelector
          :model-value="geography.selectedCountryId.value"
          :options="geography.countryOptions.value"
          :loading="geography.countriesQuery.isPending.value"
          :error="geography.countriesQuery.isError.value"
          :issues="geography.countryCatalogIssues.value"
          @update:model-value="geography.selectCountry"
          @retry="geography.countriesQuery.refetch()"
        />
      </div>
      <div
        class="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300"
        role="status"
        aria-live="polite"
      >
        <span
          >{{ saveStatusLabel }}<span v-if="lastSavedLabel"> · {{ lastSavedLabel }}</span></span
        >
        <button
          v-if="session.status.value === 'error' && !criticalStorageError"
          type="button"
          class="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          @click="retrySessionSave"
        >
          Reintentar guardado
        </button>
      </div>
      <p
        v-if="criticalStorageError"
        class="mt-2 text-sm text-red-700 dark:text-red-300"
        role="alert"
      >
        {{ criticalStorageError }}
      </p>
      <section
        v-if="recoverySession"
        class="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-200/30 dark:bg-amber-950/30 dark:text-amber-100"
        aria-labelledby="event-import-recovery-title"
      >
        <h2 id="event-import-recovery-title" class="font-semibold">
          {{ recoveryError ? "No se pudo restaurar la sesión" : "Tienes una sesión incompleta" }}
        </h2>
        <p class="mt-1">
          {{
            recoveryError || "Hemos encontrado un borrador guardado de una importación anterior."
          }}
        </p>
        <p v-if="!recoveryError && recoveryStats" class="mt-1">
          {{ recoveryStats.rows }} filas · guardado
          {{ lastSavedLabel || "en una sesión anterior" }} ·
          {{ recoveryStats.uncertain }} operaciones pendientes o inciertas
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-if="!recoveryError"
            type="button"
            class="min-h-10 rounded-lg bg-rv-navy px-4 font-semibold text-white dark:bg-gray-200 dark:text-rv-navy"
            @click="recoverSession"
          >
            Recuperar sesión
          </button>
          <button
            type="button"
            class="min-h-10 rounded-lg border border-amber-700 px-4 font-semibold dark:border-amber-200"
            @click="discardSession"
          >
            Descartar
          </button>
        </div>
      </section>
      <section
        v-if="recoveryError && !recoverySession"
        class="mt-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-200/30 dark:bg-red-950/30 dark:text-red-200"
        role="alert"
      >
        <p>{{ recoveryError }}</p>
        <button
          type="button"
          class="mt-2 min-h-10 rounded-lg border border-current px-4 font-semibold"
          @click="retryStorageRead"
        >
          Reintentar lectura
        </button>
      </section>
    </header>

    <section
      v-if="sessionOwnerId && !recoverySession && !recoveryError"
      class="flex min-h-0 flex-1 flex-col gap-2"
      aria-label="Flujo de importación de eventos"
    >
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Modo de importación">
        <button
          type="button"
          class="min-h-10 rounded-lg border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          :class="
            activeImportMode === 'manual'
              ? 'border-rv-navy bg-rv-navy text-white dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy'
              : 'border-gray-300 bg-white text-gray-800 dark:border-white/20 dark:bg-rv-darkCard dark:text-gray-100'
          "
          :aria-pressed="activeImportMode === 'manual'"
          :disabled="Boolean(modeSwitchBlockReason)"
          :title="modeSwitchBlockReason || undefined"
          @click="switchImportMode('manual')"
        >
          Manual
        </button>
        <button
          type="button"
          class="min-h-10 rounded-lg border px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          :class="
            activeImportMode === 'json'
              ? 'border-rv-navy bg-rv-navy text-white dark:border-gray-200 dark:bg-gray-200 dark:text-rv-navy'
              : 'border-gray-300 bg-white text-gray-800 dark:border-white/20 dark:bg-rv-darkCard dark:text-gray-100'
          "
          :aria-pressed="activeImportMode === 'json'"
          :disabled="Boolean(modeSwitchBlockReason)"
          :title="modeSwitchBlockReason || undefined"
          @click="switchImportMode('json')"
        >
          JSON de scraping
        </button>
      </div>
      <p
        v-if="modeSwitchBlockReason"
        class="text-xs text-amber-800 dark:text-amber-200"
        role="status"
      >
        {{ modeSwitchBlockReason }}
      </p>
      <EventImportStageNavigation
        v-if="activeImportMode === 'json'"
        :stages="importStages"
        @navigate="navigateImportStage"
      />
      <EventImportFileSummary
        v-if="activeImportMode === 'json' && activeImportStage !== 'load' && jsonFileName"
        :file-name="jsonFileName"
        :size-bytes="jsonFileSizeBytes"
        :document="jsonDocument"
        :validation-error="jsonError"
        :selected-country="selectedCountryLabel"
      />
      <p
        v-if="activeImportMode === 'json' && activeImportStage !== 'import' && automaticImportRun"
        class="shrink-0 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-200/30 dark:bg-blue-950/30 dark:text-blue-100"
        role="status"
      >
        {{
          automaticImportRun.stopRequested ? "La importación se detendrá" : "Importación en curso"
        }}
        · lote
        {{ Math.min(automaticImportRun.completedBatches + 1, automaticImportRun.totalBatches) }}/{{
          automaticImportRun.totalBatches
        }}
        · {{ automaticImportRun.completedRows }}/{{ automaticImportRun.totalRows }} procesadas.
        Puedes revisar el borrador; los resultados se aplicarán a su fila original.
        <button
          type="button"
          class="ml-1 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          @click="navigateImportStage('import')"
        >
          Ver importación
        </button>
      </p>
      <p
        v-if="
          activeImportMode === 'json' && activeImportStage === 'review' && uncertainSnapshots.length
        "
        class="shrink-0 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-200/30 dark:bg-amber-950/30 dark:text-amber-100"
        role="status"
      >
        El resultado de {{ uncertainSnapshots.length }} lote{{
          uncertainSnapshots.length === 1 ? "" : "s"
        }}
        sigue sin confirmar. Revisa la operación antes de continuar.
        <button
          type="button"
          class="ml-1 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
          @click="navigateImportStage('import')"
        >
          Consultar resultado
        </button>
      </p>

      <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- The nested, labelled file input provides keyboard and assistive-technology access; drag handlers are supplemental. -->
      <div
        v-if="activeImportMode === 'json' && activeImportStage === 'load'"
        class="shrink-0 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
        aria-labelledby="scraped-json-title"
        role="region"
        @dragover.prevent="jsonDragging = true"
        @dragleave="jsonDragging = false"
        @drop="handleJsonDrop"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="scraped-json-title" class="font-semibold text-rv-navy dark:text-white">
              Cargar archivo JSON
            </h2>
            <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">
              Selecciona un archivo local de scraper (máximo 2 MiB); se analizará y revisará antes
              de enviar los eventos.
            </p>
          </div>
          <label
            for="scraped-json-file"
            class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 font-semibold hover:bg-gray-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-rv-purple dark:border-white/20 dark:hover:bg-white/5"
            :class="jsonDragging ? 'border-rv-purple bg-rv-purple/10' : ''"
          >
            <i class="fa-solid fa-file-arrow-up" aria-hidden="true"></i>
            {{ jsonLoading ? "Leyendo…" : "Seleccionar o soltar .json" }}
            <input
              class="sr-only"
              id="scraped-json-file"
              type="file"
              accept=".json,application/json"
              :disabled="jsonLoading || stageNavigationBusy"
              aria-label="Seleccionar archivo JSON de eventos"
              @change="readJsonFile(($event.target as HTMLInputElement).files?.[0])"
            />
          </label>
        </div>
        <p v-if="jsonNotice" class="mt-2 text-sm text-green-800 dark:text-green-200" role="status">
          {{ jsonNotice }}
        </p>
        <p
          v-if="bulkResolutionStatus"
          class="mt-2 text-sm text-rv-navy dark:text-gray-200"
          role="status"
          aria-live="polite"
        >
          {{ bulkResolutionStatus }}
        </p>
        <p
          v-if="jsonResolutionError"
          class="mt-2 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {{ jsonResolutionError }}
        </p>
        <EventImportFileSummary
          v-if="jsonFileName"
          :file-name="jsonFileName"
          :size-bytes="jsonFileSizeBytes"
          :document="jsonDocument"
          :validation-error="jsonError"
          :selected-country="selectedCountryLabel"
        />
        <div v-if="jsonDocument" class="mt-3 border-t border-gray-200 pt-3 dark:border-white/10">
          <details class="mt-2">
            <summary
              class="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple"
            >
              Vista previa: primeros {{ jsonPreviewEvents.length }} de
              {{ jsonDocument.events.length }} eventos
            </summary>
            <ul
              class="mt-2 max-h-40 space-y-2 overflow-y-auto"
              aria-label="Previsualización de eventos JSON"
            >
              <li
                v-for="(event, index) in jsonPreviewEvents"
                :key="index"
                class="rounded-md bg-gray-50 p-2 dark:bg-rv-darkSurface"
              >
                <p class="font-medium">
                  {{ index + 1 }}. {{ event.type }} · {{ event.title || "Sin título" }} ·
                  {{ event.startDate || "Sin fecha" }} · {{ event.locality || "Sin localidad" }}
                </p>
                <p
                  v-if="event.issues.length"
                  class="mt-1 text-xs text-amber-800 dark:text-amber-200"
                >
                  {{ event.issues.join(" ") }}
                </p>
                <p v-else class="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {{ event.artists.join(" · ") }}
                </p>
                <p
                  v-if="event.originalUrl || event.externalId"
                  class="mt-1 break-all text-xs text-gray-600 dark:text-gray-300"
                >
                  Procedencia: <span v-if="event.originalUrl">{{ event.originalUrl }}</span>
                  <span v-if="event.originalUrl && event.externalId"> · </span>
                  <span v-if="event.externalId">ID externo {{ event.externalId }}</span>
                </p>
              </li>
            </ul>
          </details>
          <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Las filas con datos incompletos pasarán al editor para corregirlas. Los duplicados,
            tipos inválidos y países contradictorios se omitirán. La importación al servidor sigue
            siendo una acción separada.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              :disabled="jsonLoading || stageNavigationBusy"
              class="min-h-10 rounded-lg bg-rv-navy px-4 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy"
              @click="continueJsonImport"
            >
              Analizar y resolver eventos
            </button>
            <button
              type="button"
              class="min-h-10 rounded-lg border border-gray-300 px-4 font-semibold hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/20 dark:hover:bg-white/5"
              @click="cancelSelectedJsonFile"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
      <section
        v-else-if="activeImportMode === 'json' && activeImportStage === 'resolve'"
        class="shrink-0 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
        aria-labelledby="event-import-resolution-title"
      >
        <h2 id="event-import-resolution-title" class="font-semibold text-rv-navy dark:text-white">
          Resolver y analizar
        </h2>
        <p v-if="jsonResolutionInProgress" class="mt-2" role="status">
          {{ bulkResolutionStatus || "Preparando las filas del archivo…" }}
        </p>
        <p v-else-if="currentJsonAnalyzed" class="mt-2" role="status">
          Análisis completado para {{ jsonDocument?.events.length ?? 0 }} eventos. Las filas y sus
          selecciones siguen en el borrador.
        </p>
        <p v-else-if="jsonResolutionError" class="mt-2 text-red-700 dark:text-red-300" role="alert">
          {{ jsonResolutionError }}
        </p>
        <p v-else class="mt-2">
          Selecciona un archivo JSON válido en la etapa anterior para iniciar el análisis.
        </p>
        <EventImportResolutionProgress :phases="bulkResolutionPhases" />
        <EventImportAnalysisSummary
          v-if="currentJsonAnalyzed && jsonAnalysisCounts"
          class="mt-3"
          v-bind="jsonAnalysisCounts"
          :current-batch-size="preparation.eligibleRows.length"
          :ready-for-later-batches="jsonInterventionSummary.readyForLaterBatches"
          :intervention-reasons="jsonInterventionSummary.reasons"
        />
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="!jsonResolutionInProgress && currentJsonAnalyzed"
            type="button"
            class="min-h-10 rounded-lg bg-rv-navy px-4 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy"
            @click="navigateImportStage('review')"
          >
            Revisar eventos
          </button>
          <button
            v-else-if="!jsonResolutionInProgress && jsonResolutionError"
            type="button"
            class="min-h-10 rounded-lg bg-rv-navy px-4 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy"
            @click="continueToJsonReview"
          >
            Revisar filas disponibles
          </button>
          <button
            type="button"
            class="min-h-10 rounded-lg border border-gray-300 px-4 font-semibold hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/20 dark:hover:bg-white/5"
            :disabled="stageNavigationBusy"
            @click="navigateImportStage('load')"
          >
            Volver a cargar archivo
          </button>
        </div>
      </section>

      <div
        v-if="activeImportMode === 'manual' || activeImportStage === 'review'"
        class="flex shrink-0 items-center justify-between gap-3"
      >
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ rows.length }} {{ rows.length === 1 ? "fila" : "filas" }}
        </p>
        <div class="flex items-center gap-2">
          <label
            for="event-row-count"
            class="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300"
          >
            Número de filas
            <input
              id="event-row-count"
              type="number"
              min="0"
              step="1"
              :value="rows.length"
              aria-label="Número de filas"
              class="min-h-10 w-20 rounded-md border border-gray-300 bg-white px-2 text-sm tabular-nums text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rv-purple dark:border-white/20 dark:bg-rv-darkSurface dark:text-white"
              @change="updateRowCount"
            />
          </label>
          <button
            type="button"
            class="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white transition hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
            @click="addRow"
          >
            <i class="fa-solid fa-plus text-xs" aria-hidden="true"></i>
            Añadir fila
          </button>
        </div>
      </div>

      <section
        v-if="activeImportMode === 'manual' || activeImportStage === 'review'"
        class="shrink-0 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
        aria-label="Preparación para importar"
      >
        <EventImportAnalysisSummary
          v-if="activeImportMode === 'json' && currentJsonAnalyzed && jsonAnalysisCounts"
          class="mb-3"
          v-bind="jsonAnalysisCounts"
          :current-batch-size="preparation.eligibleRows.length"
          :ready-for-later-batches="jsonInterventionSummary.readyForLaterBatches"
          :intervention-reasons="jsonInterventionSummary.reasons"
        />
        <p v-if="jsonNotice" class="mb-2 text-xs text-green-800 dark:text-green-200" role="status">
          {{ jsonNotice }}
        </p>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span class="font-semibold">
              {{
                activeImportMode === "json"
                  ? (jsonAnalysisCounts?.prepared ?? 0)
                  : preparation.eligibleRows.length
              }}
              {{
                activeImportMode === "json"
                  ? jsonAnalysisCounts?.prepared === 1
                    ? "fila preparada"
                    : "filas preparadas"
                  : "filas listas"
              }}
            </span>
            ·
            {{
              activeImportMode === "json"
                ? (jsonAnalysisCounts?.needsIntervention ?? 0)
                : preparation.pendingRows.length
            }}
            {{ activeImportMode === "json" ? "requieren intervención" : "pendientes" }}
          </p>
          <button
            v-if="activeImportMode === 'json'"
            type="button"
            class="min-h-10 rounded-lg bg-rv-navy px-4 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy"
            :disabled="!importStageAvailable || stageNavigationBusy"
            @click="continueToImportStage"
          >
            Revisar confirmación de importación
          </button>
          <div
            class="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Acciones de revisión"
          >
            <span class="text-xs text-gray-600 dark:text-gray-300" role="status">
              {{ selectedRowKeys.size }}
              {{ selectedRowKeys.size === 1 ? "fila seleccionada" : "filas seleccionadas" }}
            </span>
            <button
              type="button"
              aria-label="Descartar seleccionadas"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-300/40 dark:text-red-200 dark:hover:bg-red-950/30"
              :disabled="selectedRowKeys.size === 0 || discardInProgress"
              @click="discardSelectedRows"
            >
              Descartar seleccionadas
            </button>
          </div>
        </div>
        <p v-if="!preparation.snapshot" class="mt-2 text-xs" role="status">
          <template v-if="!geography.selectedCountry.value">
            Selecciona un país en «País de la importación» para preparar filas.
          </template>
          <template v-else-if="preparation.pendingRows.length">
            No hay filas listas todavía. Revisa los campos pendientes antes de avanzar.
          </template>
          <template v-else>
            No hay operaciones listas ni resultados pendientes de consultar.
          </template>
        </p>
      </section>

      <section
        v-if="activeImportMode === 'manual' || activeImportStage === 'import'"
        class="shrink-0 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
        aria-label="Confirmación, progreso y resultados de importación"
      >
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-semibold text-rv-navy dark:text-white">
            {{
              activeImportMode === "manual"
                ? "Importar filas listas"
                : "Importar y consultar resultados"
            }}
          </h2>
          <button
            v-if="activeImportMode === 'json'"
            type="button"
            class="min-h-9 rounded-lg border border-gray-300 px-3 font-semibold hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/20 dark:hover:bg-white/5"
            :disabled="stageNavigationBusy"
            @click="navigateImportStage('review')"
          >
            Volver a revisar eventos
          </button>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="font-medium">
            <span class="font-semibold">
              {{
                activeImportMode === "json"
                  ? (jsonAnalysisCounts?.prepared ?? 0)
                  : preparation.eligibleRows.length
              }}
              {{
                activeImportMode === "json"
                  ? jsonAnalysisCounts?.prepared === 1
                    ? "fila preparada"
                    : "filas preparadas"
                  : "filas listas"
              }}
            </span>
            ·
            {{
              activeImportMode === "json"
                ? (jsonAnalysisCounts?.needsIntervention ?? 0)
                : preparation.pendingRows.length
            }}
            {{ activeImportMode === "json" ? "requieren intervención" : "pendientes" }}
          </p>
          <p
            v-if="automaticImportRun"
            class="text-sm font-medium text-rv-navy dark:text-gray-100"
            role="status"
          >
            {{ automaticImportRun.stopRequested ? "La importación se detendrá" : "Importando" }}
            · lote
            {{
              Math.min(automaticImportRun.completedBatches + 1, automaticImportRun.totalBatches)
            }}/{{ automaticImportRun.totalBatches }} · {{ automaticImportRun.completedRows }}/{{
              automaticImportRun.totalRows
            }}
            procesadas · {{ automaticImportRun.createdEventIds.size }} creados ·
            {{ automaticImportRun.unchangedRows }} omitidos ·
            {{ automaticImportRun.conflicts }} conflictos ·
            {{ automaticImportRun.invalidRows }} inválidas ·
            {{ automaticImportRun.failedRows }} fallidas.
          </p>
          <div
            class="flex flex-wrap items-center justify-end gap-2"
            role="group"
            aria-label="Acciones de importación y descarte"
          >
            <button
              v-if="automaticImportRun && !automaticImportRun.stopRequested"
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:border-white/20 dark:text-gray-100 dark:hover:bg-white/5"
              @click="stopAutomaticImportAfterCurrentBatch"
            >
              Detener después del lote actual
            </button>
            <button
              v-for="snapshot in protectedSnapshots.filter(
                (item) => !uncertainSnapshots.some(({ batchId }) => batchId === item.batchId)
              )"
              :key="snapshot.batchId"
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-800 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-red-200"
              :disabled="
                automaticImportRun ||
                batchMutation.isPending.value ||
                pendingSnapshotBatchIds.has(snapshot.batchId)
              "
              @click="sendSnapshot(snapshot)"
            >
              Reintentar guardado y envío de {{ snapshot.rows.length }} filas
            </button>
            <button
              v-for="snapshot in Object.values(protectedExpansionSnapshots)"
              :key="lineupExpansionOperationKey(snapshot)"
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-600 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-amber-100 dark:hover:bg-amber-950/40"
              :disabled="expansionMutation.isPending.value"
              @click="retryRecoveredExpansion(snapshot)"
            >
              Revisar y reintentar ampliación incierta
            </button>
            <button
              v-for="snapshot in uncertainSnapshots"
              :key="snapshot.batchId"
              type="button"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rv-purple px-4 text-sm font-semibold text-rv-purple hover:bg-rv-purple/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple dark:text-purple-200"
              :disabled="
                automaticImportRun ||
                batchMutation.isPending.value ||
                pendingSnapshotBatchIds.has(snapshot.batchId)
              "
              @click="retrySameBatch(snapshot)"
            >
              Reintentar {{ snapshot.rows.length }} filas inciertas
            </button>
            <button
              type="button"
              aria-label="Importar filas listas"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rv-navy px-4 text-sm font-semibold text-white transition hover:bg-rv-navy/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rv-purple disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-200 dark:text-rv-navy dark:hover:bg-white"
              :disabled="
                !preparation.snapshot || batchMutation.isPending.value || automaticImportRun
              "
              @click="importEligibleRows"
            >
              <i
                v-if="batchMutation.isPending.value"
                class="fa-solid fa-spinner fa-spin"
                aria-hidden="true"
              ></i>
              {{
                automaticImportRun
                  ? "Importando lotes…"
                  : batchMutation.isPending.value
                    ? "Importando…"
                    : "Importar filas listas"
              }}
            </button>
          </div>
        </div>
        <p v-if="batchMutation.isPending.value" class="mt-2" role="status">
          Enviando {{ batchMutation.variables.value?.rows.length ?? 0 }} filas. Puedes seguir
          editando la tabla.
        </p>
        <p v-if="visibleBatchError" class="mt-2 text-red-700 dark:text-red-300" role="alert">
          {{ visibleBatchError }}
        </p>
        <p
          v-if="uncertainSnapshots.length"
          class="mt-2 text-amber-800 dark:text-amber-200"
          role="status"
        >
          No sabemos si
          {{
            uncertainSnapshots.length === 1 ? "la operación terminó" : "las operaciones terminaron"
          }}. Comprueba el resultado reintentando cada operación.
        </p>
        <p
          v-if="
            expansionExecutionCounts.uncertain ||
            expansionExecutionCounts.conflicts ||
            expansionExecutionCounts.failures
          "
          class="mt-2"
          role="status"
        >
          Hay ampliaciones pendientes: {{ expansionExecutionCounts.conflicts }} requieren revisar el
          concierto, {{ expansionExecutionCounts.uncertain }} no tienen resultado confirmado y
          {{ expansionExecutionCounts.failures }} no se completaron.
        </p>
        <section
          v-if="expansionHistory.length"
          class="mt-3 border-t border-gray-200 pt-3 dark:border-white/10"
        >
          <p class="font-semibold" role="status">Lineup actualizado</p>
          <ul class="mt-2 space-y-1">
            <li v-for="entry in expansionHistory" :key="entry.operationKey">
              <template v-if="entry.result.addedArtists.length">
                Se ha añadido {{ entry.result.addedArtists.map(({ name }) => name).join(", ") }} al
                concierto del {{ formatImportDate(entry.startDate) }}.
              </template>
              <template v-else>No había artistas nuevos que añadir.</template>
            </li>
          </ul>
        </section>
        <div v-if="lastImport" class="mt-3 border-t border-gray-200 pt-3 dark:border-white/10">
          <p class="font-semibold" role="status">{{ lastImportSummary }}</p>
          <details v-if="unchangedImportDetails.length" class="mt-2 text-sm">
            <summary class="cursor-pointer font-medium text-gray-700 dark:text-gray-200">
              Ver eventos omitidos ({{ unchangedImportDetails.length }})
            </summary>
            <ul class="mt-2 space-y-1 pl-5">
              <li v-for="entry in unchangedImportDetails" :key="entry.key">{{ entry.label }}</li>
            </ul>
          </details>
          <ul v-if="removedRowImportHistory.length" class="mt-2 space-y-1 text-sm">
            <li v-for="(note, index) in removedRowImportHistory" :key="index">{{ note }}</li>
          </ul>
        </div>
      </section>

      <section
        v-if="
          activeImportMode === 'json' &&
          activeImportStage === 'review' &&
          currentJsonAnalyzed &&
          jsonReviewEntries
        "
        class="shrink-0 space-y-3"
        aria-label="Revisión de eventos del archivo"
      >
        <EventImportReviewControls
          :model-value="jsonReviewFilter"
          v-model:search="jsonReviewSearch"
          :counts="jsonReviewEntries.counts"
          @update:model-value="
            jsonReviewFilter = $event;
            jsonReviewInitialized = true;
            jsonReviewNotice = '';
          "
        />
        <p v-if="jsonReviewNotice" class="text-sm text-amber-800 dark:text-amber-200" role="status">
          {{ jsonReviewNotice }}
        </p>
        <p
          v-if="
            jsonReviewFilter === 'duplicates' &&
            jsonReviewEntries.counts.duplicates === jsonReviewEntries.counts.all
          "
          class="text-sm text-amber-800 dark:text-amber-200"
          role="status"
        >
          Todos los eventos del archivo están duplicados; no se añadirán al borrador.
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-300" aria-live="polite">
          {{ filteredJsonReviewEntries.length }} de {{ jsonReviewEntries.counts.all }} eventos del
          archivo
          <template v-if="jsonReviewSearch"> · búsqueda: «{{ jsonReviewSearch }}»</template>
        </p>
        <div
          v-if="filteredJsonReviewEntries.length === 0"
          class="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
          role="status"
        >
          <template v-if="jsonReviewSearch">
            No hay resultados para «{{ jsonReviewSearch }}» con este filtro. Prueba otro término o
            selecciona «Todos».
          </template>
          <template v-else-if="jsonReviewFilter === 'needs-review'">
            No hay filas de esta categoría. Los conflictos y errores de validación tienen filtros
            propios; también puedes consultar los eventos preparados o ver todos.
          </template>
          <template v-else-if="jsonReviewFilter === 'prepared'">
            No hay eventos preparados con el filtro actual.
          </template>
          <template
            v-else-if="
              jsonReviewFilter === 'duplicates' &&
              jsonReviewEntries.counts.duplicates === jsonReviewEntries.counts.all
            "
          >
            Todos los eventos del archivo están duplicados.
          </template>
          <template v-else> Este filtro no contiene eventos. </template>
        </div>
        <ul
          v-if="selectedReviewExcludedEntries.length"
          class="space-y-2"
          aria-label="Filas excluidas o ya presentes en el borrador"
        >
          <li
            v-for="entry in selectedReviewExcludedEntries"
            :key="`source-${entry.sourceIndex}`"
            class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-200/30 dark:bg-amber-950/20 dark:text-amber-100"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="font-semibold">
                {{
                  entry.source.title ||
                  entry.source.artists.join(" + ") ||
                  `Evento ${entry.sourceIndex + 1}`
                }}
                <span class="font-normal"
                  >· {{ entry.source.startDate || "sin fecha" }} ·
                  {{ entry.source.locality || "sin localidad" }}</span
                >
              </p>
              <span class="rounded-full border border-current px-2 py-0.5 text-xs font-semibold">
                {{ reviewCategoryLabel(entry.category) }}
              </span>
            </div>
            <p v-if="entry.reasons.length" class="mt-1">{{ entry.reasons.join(" · ") }}</p>
            <p class="mt-1 text-xs">
              Esta entrada no tiene fila editable en el borrador. Corrige el archivo de origen y
              vuelve a cargarlo para incorporarla.
            </p>
          </li>
        </ul>
      </section>

      <EventImportTable
        v-if="
          (activeImportMode === 'manual' || activeImportStage === 'review') &&
          (activeImportMode === 'manual' || visibleJsonReviewRows.length > 0)
        "
        :rows="activeImportMode === 'json' ? visibleJsonReviewRows : rows"
        :lineup-states="lineupStates"
        :geography-states="geographyStates"
        :tour-states="tourStates"
        :regions="geography.regions.value"
        :conflicts-by-row-key="conflictsByRowKey"
        :can-review-lineup-expansion="canReviewLineupExpansion"
        :prepare-lineup-expansion="prepareLineupExpansion"
        :get-expansion-confirmation="getExpansionConfirmation"
        :set-expansion-confirmation="setExpansionConfirmation"
        :get-expansion-selection="getExpansionSelection"
        :set-expansion-selection="setExpansionSelection"
        :get-expansion-execution="getExpansionExecution"
        :row-problems="rowProblems"
        :selected-row-keys="selectedRowKeys"
        :discard-disabled="discardInProgress"
        @update-event="eventImport.updateEvent"
        @confirm-tour="eventImport.confirmTour"
        @retry-tour="eventImport.retryTour"
        @select-tour-candidate="eventImport.selectTourCandidate"
        @update-type="eventImport.updateType"
        @update-type-range="eventImport.updateTypeRange"
        @update-text-field="eventImport.updateTextField"
        @update-text-range="eventImport.updateTextRange"
        @update-date="eventImport.updateDate"
        @update-date-range="eventImport.updateDateRange"
        @update-venue="eventImport.updateVenue"
        @update-city="eventImport.updateCity"
        @update-province="eventImport.updateProvince"
        @commit-venue="eventImport.commitVenue"
        @retry-venue="eventImport.retryVenue"
        @retry-locality="eventImport.retryLocality"
        @select-region="eventImport.selectAdministrativeRegion"
        @select-locality="eventImport.selectLocalityCandidate"
        @select-venue="eventImport.selectVenueCandidate"
        @select-artist="eventImport.selectArtistCandidate"
        @update-lineup-draft="eventImport.updateLineupDraft"
        @commit-lineup-draft="eventImport.commitLineupDraft"
        @paste-lineup-range="eventImport.pasteLineupRange"
        @update-lineup-item-name="eventImport.updateLineupItemName"
        @commit-lineup-item-name="eventImport.commitLineupItemName"
        @retry-lineup-item="eventImport.retryLineupItem"
        @remove-lineup-item="eventImport.removeLineupItem"
        @toggle-row-selection="toggleRowSelection"
        @execute-expansion="executeConfirmedExpansion"
        @critical-edit="retrySessionSave"
      />
    </section>
    <section
      v-else
      class="flex min-h-0 flex-1 items-start rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-white/10 dark:bg-rv-darkCard dark:text-gray-200"
      aria-label="Recuperación de sesión"
    >
      <p v-if="!identityReady" role="status">
        El editor estará disponible cuando se confirme la cuenta.
      </p>
      <p v-else-if="recoverySession">Recupera o descarta el borrador local para continuar.</p>
      <p v-else>{{ recoveryError }}</p>
    </section>
  </div>
</template>
