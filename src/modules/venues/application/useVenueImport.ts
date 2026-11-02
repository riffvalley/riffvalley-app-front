import { computed, onScopeDispose, shallowRef } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  getAdministrativeRegions,
  getVenueImportCountries,
  importVenueBatch,
  resolveVenueBatch,
  resolveVenueLocality,
} from "../api/venueImport";
import type { Country } from "@/services/countries/countries";
import type {
  AdministrativeRegion,
  VenueImportResult,
  VenueImportRow,
  VenueType,
} from "../types/venueImport";
import { VENUE_TYPES } from "../types/venueImport";
import { venueCatalogQueryKey } from "./useVenueCatalog";

const BATCH_SIZE = 100;
const LOCALITY_NAME_LIMIT = 150;
const VENUE_NAME_LIMIT = 180;
const VENUE_TYPE_SET = new Set<string>(VENUE_TYPES);
let nextRowId = 1;

export const venueTypes = [
  { value: "concert_hall", label: "Sala de conciertos" },
  { value: "arena", label: "Pabellón / Arena" },
  { value: "stadium", label: "Estadio" },
  { value: "theater", label: "Teatro" },
  { value: "outdoor", label: "Recinto al aire libre" },
  { value: "festival_ground", label: "Recinto de festival" },
  { value: "bar_pub", label: "Bar / Pub" },
  { value: "other", label: "Otro" },
] satisfies Array<{ value: VenueType; label: string }>;

function createRow(name = "", type: VenueType = "concert_hall"): VenueImportRow {
  return { id: `venue-row-${nextRowId++}`, name, type, locality: "", result: null };
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    result.push(items.slice(index, index + size));
  return result;
}

export function parsePastedVenueNames(text: string): string[] {
  return text.split(/\r\n|\n|\r/u).filter((line) => line.trim().length > 0);
}

export function normalizeVenueName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("und");
}

function normalizeLocalityName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("und");
}

export function useVenueImport() {
  const queryClient = useQueryClient();
  const countriesQuery = useQuery({
    queryKey: ["venues", "import", "countries"],
    queryFn: ({ signal }) => getVenueImportCountries(signal),
    staleTime: 5 * 60_000,
  });

  const countryId = shallowRef("");
  const regionId = shallowRef("");
  const localityName = shallowRef("");
  const province = shallowRef("");
  const rows = shallowRef<VenueImportRow[]>([createRow()]);
  const importing = shallowRef(false);
  const localityError = shallowRef("");
  const importError = shallowRef("");
  const localityNotice = shallowRef("");
  const pasteNotice = shallowRef("");
  const validationErrors = shallowRef({ country: "", region: "", locality: "", province: "" });
  const hadImport = shallowRef(false);
  let active = true;

  const countries = computed(() => countriesQuery.data.value ?? []);
  const selectedCountry = computed(() =>
    countries.value.find((country) => country.id === countryId.value)
  );
  const regionsQuery = useQuery({
    queryKey: computed(() => ["venues", "import", "regions", countryId.value]),
    queryFn: ({ signal, queryKey }) => getAdministrativeRegions(String(queryKey[3]), signal),
    enabled: computed(() => Boolean(countryId.value)),
    staleTime: 5 * 60_000,
  });
  const regions = computed(() => regionsQuery.data.value ?? []);
  const nonEmptyRows = computed(() => rows.value.filter((row) => row.name.trim().length > 0));
  const summary = computed(() => {
    const counts = { created: 0, existing: 0, duplicates: 0, failed: 0 };
    for (const row of nonEmptyRows.value) {
      if (row.result?.status === "created") counts.created += 1;
      else if (row.result?.status === "existing") counts.existing += 1;
      else if (row.result?.status === "duplicate_in_batch") counts.duplicates += 1;
      else if (row.result?.status === "failed" || row.name.length > VENUE_NAME_LIMIT)
        counts.failed += 1;
    }
    return counts;
  });

  function setInitialCountry(countryList: Country[]) {
    if (countryId.value) return;
    countryId.value =
      countryList.find((country) => country.isoCode?.toUpperCase() === "ES")?.id ?? "";
  }

  function changeCountry(id: string) {
    if (countryId.value === id) return;
    countryId.value = id;
    regionId.value = "";
    localityError.value = "";
    localityNotice.value = "";
    validationErrors.value = { ...validationErrors.value, country: "", region: "" };
    invalidateVenueResults();
  }

  function changeRegion(id: string) {
    regionId.value = id;
    localityError.value = "";
    localityNotice.value = "";
    validationErrors.value = { ...validationErrors.value, region: "" };
    invalidateVenueResults();
  }

  function invalidateVenueResults() {
    rows.value = rows.value.map((row) => ({ ...row, result: null }));
  }

  function clearLocalityError() {
    localityError.value = "";
    validationErrors.value = { ...validationErrors.value, locality: "" };
  }

  function localityChanged() {
    clearLocalityError();
    invalidateVenueResults();
  }

  function clearProvinceError() {
    validationErrors.value = { ...validationErrors.value, province: "" };
  }

  function provinceChanged() {
    clearProvinceError();
    invalidateVenueResults();
  }

  function addRow(name = "") {
    rows.value = [...rows.value, createRow(name)];
  }

  function pasteNames(startIndex: number, names: string[]) {
    if (names.length === 0) return;
    const insertionIndex = Math.max(0, Math.min(startIndex, rows.value.length));
    const target = rows.value[insertionIndex];
    const reusableEmptyTarget = target && !target.name.trim();
    const mainLocalityKey = normalizeLocalityName(localityName.value);
    const identityKey = (name: string, locality: string) =>
      `${normalizeVenueName(name)}\u0000${normalizeLocalityName(locality) || mainLocalityKey}`;
    const existingNames = new Set(
      rows.value
        .filter((row) => !reusableEmptyTarget || row.id !== target.id)
        .map((row) => identityKey(row.name, row.locality))
        .filter((key) => !key.startsWith("\u0000"))
    );
    const uniqueNames: string[] = [];
    let omitted = 0;
    for (const name of names) {
      const normalized = identityKey(name, "");
      if (!normalized || existingNames.has(normalized)) {
        omitted += 1;
        continue;
      }
      existingNames.add(normalized);
      uniqueNames.push(name);
    }
    pasteNotice.value = omitted
      ? `Se omitieron ${omitted} ${omitted === 1 ? "duplicado" : "duplicados"} del pegado.`
      : "";
    if (uniqueNames.length === 0) return;
    if (reusableEmptyTarget) {
      const replacement = { ...target, name: uniqueNames[0] ?? "", result: null };
      const inserted = uniqueNames.slice(1).map((name) => createRow(name));
      rows.value = [
        ...rows.value.slice(0, insertionIndex),
        replacement,
        ...inserted,
        ...rows.value.slice(insertionIndex + 1),
      ];
      return;
    }
    const inserted = uniqueNames.map((name) => createRow(name));
    rows.value = [
      ...rows.value.slice(0, insertionIndex),
      ...inserted,
      ...rows.value.slice(insertionIndex),
    ];
  }

  function updateName(id: string, name: string) {
    rows.value = rows.value.map((row) => (row.id === id ? { ...row, name, result: null } : row));
  }

  function updateType(id: string, type: VenueType) {
    rows.value = rows.value.map((row) => (row.id === id ? { ...row, type, result: null } : row));
  }

  function updateLocality(id: string, locality: string) {
    rows.value = rows.value.map((row) =>
      row.id === id ? { ...row, locality, result: null } : row
    );
  }

  function removeRow(id: string) {
    rows.value = rows.value.filter((row) => row.id !== id);
  }

  function validate(): boolean {
    const errors = { country: "", region: "", locality: "", province: "" };
    if (!countries.value.some((country) => country.id === countryId.value))
      errors.country = "Selecciona un país del catálogo.";
    if (
      !regions.value.some(
        (region: AdministrativeRegion) =>
          region.id === regionId.value && region.countryId === countryId.value
      )
    )
      errors.region = "Selecciona una región del país elegido.";
    if (!localityName.value.trim()) errors.locality = "Escribe una localidad.";
    else if (localityName.value.length > LOCALITY_NAME_LIMIT)
      errors.locality = `Máximo ${LOCALITY_NAME_LIMIT} caracteres.`;
    if (province.value.length > 150) errors.province = "Máximo 150 caracteres.";
    const validRows = nonEmptyRows.value.filter(
      (row) => row.name.length <= VENUE_NAME_LIMIT && VENUE_TYPE_SET.has(row.type)
    );
    validationErrors.value = errors;
    rows.value = rows.value.map((row) => {
      if (!row.name.trim()) return { ...row, result: null };
      if (row.locality.length > LOCALITY_NAME_LIMIT)
        return {
          ...row,
          result: {
            id: row.id,
            name: row.name,
            type: row.type,
            status: "failed",
            venueId: null,
            localityId: null,
            error: `La localidad supera los ${LOCALITY_NAME_LIMIT} caracteres.`,
          },
        };
      if (row.name.length > VENUE_NAME_LIMIT)
        return {
          ...row,
          result: {
            id: row.id,
            name: row.name,
            type: row.type,
            status: "failed",
            venueId: null,
            localityId: null,
            error: `El nombre supera los ${VENUE_NAME_LIMIT} caracteres.`,
          },
        };
      if (!VENUE_TYPE_SET.has(row.type))
        return {
          ...row,
          result: {
            id: row.id,
            name: row.name,
            type: row.type,
            status: "failed",
            venueId: null,
            localityId: null,
            error: "Selecciona un tipo de recinto admitido.",
          },
        };
      return row;
    });
    return (
      !errors.country &&
      !errors.region &&
      !errors.locality &&
      !errors.province &&
      validRows.length > 0
    );
  }

  function updateResult(
    rowId: string,
    result: Omit<VenueImportResult, "id">,
    expectedLocality?: string
  ) {
    rows.value = rows.value.map((row) =>
      row.id === rowId &&
      row.name === result.name &&
      row.type === result.type &&
      (expectedLocality === undefined || row.locality === expectedLocality)
        ? { ...row, result: { id: rowId, ...result } }
        : row
    );
  }

  async function importRows() {
    if (importing.value || !active) return;
    localityError.value = "";
    importError.value = "";
    localityNotice.value = "";
    if (!validate()) return;

    importing.value = true;
    hadImport.value = true;
    const contextSnapshot = {
      name: localityName.value,
      regionId: regionId.value,
      province: province.value,
    };
    const contextIsCurrent = () =>
      contextSnapshot.name === localityName.value &&
      contextSnapshot.regionId === regionId.value &&
      contextSnapshot.province === province.value;
    try {
      const candidates = nonEmptyRows.value.filter(
        (row) =>
          row.name.length <= VENUE_NAME_LIMIT &&
          row.locality.length <= LOCALITY_NAME_LIMIT &&
          VENUE_TYPE_SET.has(row.type)
      );
      const effectiveLocality = (row: VenueImportRow) => row.locality.trim() || localityName.value;
      const localityKey = (name: string) => normalizeLocalityName(name);
      const localityGroups = new Map<
        string,
        { name: string; isPrimary: boolean; rows: VenueImportRow[]; localityId?: string }
      >();
      for (const row of candidates) {
        const name = effectiveLocality(row);
        const key = localityKey(name);
        const group = localityGroups.get(key);
        if (group) group.rows.push(row);
        else
          localityGroups.set(key, {
            name,
            isPrimary: key === localityKey(localityName.value),
            rows: [row],
          });
      }

      let hadLocalityFailure = false;
      let hadMissingCoordinates = false;
      for (const group of localityGroups.values()) {
        if (!active) return;
        if (
          contextSnapshot.name !== localityName.value ||
          contextSnapshot.regionId !== regionId.value ||
          contextSnapshot.province !== province.value
        )
          return;
        try {
          const resolution = await resolveVenueLocality({
            name: group.name,
            administrativeRegionId: contextSnapshot.regionId,
            ...(group.isPrimary && contextSnapshot.province.trim()
              ? { province: contextSnapshot.province }
              : {}),
          });
          if (!active) return;
          if (!contextIsCurrent()) return;
          if (resolution.geocoding.status === "ambiguous" || !resolution.locality?.id) {
            hadLocalityFailure = true;
            const message =
              resolution.geocoding.status === "ambiguous"
                ? `Hay varias localidades posibles para «${group.name}». La provincia de cabecera no se aplica a localidades alternativas; corrige el nombre o cambia la localidad principal.`
                : `No se pudo confirmar la localidad «${group.name}». Corrige el nombre e inténtalo de nuevo.`;
            for (const row of group.rows)
              updateResult(
                row.id,
                {
                  name: row.name,
                  type: row.type,
                  status: "failed",
                  venueId: null,
                  localityId: null,
                  error: message,
                },
                row.locality
              );
            continue;
          }
          group.localityId = resolution.locality.id;
          if (
            resolution.geocoding.status === "not_found" ||
            resolution.geocoding.status === "unavailable"
          )
            hadMissingCoordinates = true;
        } catch (error) {
          if (!active) return;
          hadLocalityFailure = true;
          const message = `No se pudo resolver «${group.name}». Corrige la localidad de estas filas e inténtalo de nuevo. ${getErrorMessage(error)}`;
          for (const row of group.rows)
            updateResult(
              row.id,
              {
                name: row.name,
                type: row.type,
                status: "failed",
                venueId: null,
                localityId: null,
                error: message,
              },
              row.locality
            );
        }
      }
      if (hadMissingCoordinates)
        localityNotice.value =
          "La localidad se ha guardado; no se pudieron obtener coordenadas para una o más localidades. Puedes continuar con la importación.";

      const groupsById = new Map<string, VenueImportRow[]>();
      for (const group of localityGroups.values()) {
        if (!group.localityId) continue;
        groupsById.set(group.localityId, [
          ...(groupsById.get(group.localityId) ?? []),
          ...group.rows,
        ]);
      }

      for (const [localityId, localityRows] of groupsById) {
        const snapshots = new Map(localityRows.map((row) => [row.id, { ...row }]));
        const rowsToResolve: VenueImportRow[] = [];
        const firstByVenueKey = new Map<string, VenueImportRow>();
        const duplicateRows: Array<{ row: VenueImportRow; first: VenueImportRow }> = [];
        for (const row of localityRows) {
          const snapshot = snapshots.get(row.id)!;
          const current = rows.value.find((item) => item.id === row.id);
          if (
            !current ||
            current.name !== snapshot.name ||
            current.type !== snapshot.type ||
            current.locality !== snapshot.locality
          )
            continue;
          const key = normalizeVenueName(row.name);
          const first = firstByVenueKey.get(key);
          if (first) {
            duplicateRows.push({ row, first });
            continue;
          }
          firstByVenueKey.set(key, row);
          const prior = current.result;
          if (
            prior &&
            prior.localityId === localityId &&
            prior.name === current.name &&
            prior.type === current.type &&
            (prior.status === "created" || prior.status === "existing")
          )
            continue;
          rowsToResolve.push(row);
        }

        try {
          const unresolved: VenueImportRow[] = [];
          for (const batch of chunks(rowsToResolve, BATCH_SIZE)) {
            const currentBatch = batch.filter((row) => {
              const current = rows.value.find((item) => item.id === row.id);
              const snapshot = snapshots.get(row.id)!;
              return (
                current?.name === snapshot.name &&
                current.type === snapshot.type &&
                current.locality === snapshot.locality
              );
            });
            if (currentBatch.length === 0) continue;
            const matches = await resolveVenueBatch(
              currentBatch.map(({ name }) => ({ name, localityId }))
            );
            if (!active) return;
            if (!contextIsCurrent()) return;
            currentBatch.forEach((row, index) => {
              const match = matches[index];
              if (match?.venue)
                updateResult(
                  row.id,
                  {
                    name: row.name,
                    type: row.type,
                    status: "existing",
                    venueId: match.venue.id,
                    localityId,
                    error: null,
                  },
                  snapshots.get(row.id)?.locality
                );
              else {
                updateResult(
                  row.id,
                  {
                    name: row.name,
                    type: row.type,
                    status: "pending",
                    venueId: null,
                    localityId,
                    error: null,
                  },
                  snapshots.get(row.id)?.locality
                );
                unresolved.push(row);
              }
            });
          }

          for (const batch of chunks(unresolved, BATCH_SIZE)) {
            const currentBatch = batch.filter((row) => {
              const current = rows.value.find((item) => item.id === row.id);
              const snapshot = snapshots.get(row.id)!;
              return (
                current?.name === snapshot.name &&
                current.type === snapshot.type &&
                current.locality === snapshot.locality
              );
            });
            if (currentBatch.length === 0) continue;
            const response = await importVenueBatch({
              localityId,
              venues: currentBatch.map(({ name, type }) => ({ name, type })),
            });
            if (!active) return;
            if (!contextIsCurrent()) return;
            for (const result of response.results) {
              const row = currentBatch[result.index];
              const snapshot = row && snapshots.get(row.id);
              if (!row || !snapshot) continue;
              updateResult(
                row.id,
                {
                  name: snapshot.name,
                  type: snapshot.type,
                  status: result.status,
                  venueId: result.venueId ?? null,
                  localityId,
                  error: result.error ?? null,
                },
                snapshot.locality
              );
            }
          }
          for (const { row, first } of duplicateRows) {
            const current = rows.value.find((item) => item.id === row.id);
            const firstCurrent = rows.value.find((item) => item.id === first.id);
            if (
              current?.name === row.name &&
              current.type === row.type &&
              current.locality === row.locality &&
              firstCurrent?.result
            )
              updateResult(
                row.id,
                {
                  name: row.name,
                  type: row.type,
                  status: "duplicate_in_batch",
                  venueId: firstCurrent.result.venueId,
                  localityId,
                  error: null,
                },
                snapshots.get(row.id)?.locality
              );
          }
        } catch (error) {
          if (!active) return;
          const message = getErrorMessage(error);
          importError.value = `No se pudo completar la importación de «${localityRows[0] ? effectiveLocality(localityRows[0]) : "la localidad"}». Conservamos las filas; puedes reintentar. ${message}`;
          for (const row of localityRows) {
            const current = rows.value.find((item) => item.id === row.id);
            if (current?.result?.status === "created" || current?.result?.status === "existing")
              continue;
            updateResult(
              row.id,
              {
                name: row.name,
                type: row.type,
                status: "failed",
                venueId: null,
                localityId,
                error: message || "No se recibió respuesta para esta fila.",
              },
              snapshots.get(row.id)?.locality
            );
          }
        }
      }
      if (summary.value.created > 0) {
        await queryClient.invalidateQueries({ queryKey: venueCatalogQueryKey });
      }
      if (hadLocalityFailure)
        importError.value =
          "Algunas localidades no se pudieron resolver. Revisa los errores de las filas y vuelve a importar; las demás localidades válidas se han procesado.";
    } catch (error) {
      if (!active) return;
      const message = getErrorMessage(error);
      importError.value = `No se pudo completar el lote. Conservamos las filas; puedes reintentar. ${message}`;
      const failedRows = nonEmptyRows.value.filter(
        (row) =>
          !row.result ||
          (row.result.status !== "created" &&
            row.result.status !== "existing" &&
            row.result.status !== "duplicate_in_batch")
      );
      for (const row of failedRows)
        updateResult(row.id, {
          name: row.name,
          type: row.type,
          status: "failed",
          venueId: null,
          localityId: row.result?.localityId ?? null,
          error: message || "No se recibió respuesta para esta fila.",
        });
    } finally {
      importing.value = false;
    }
  }

  function getErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (error as { response?: { data?: { message?: string | string[] } } })
        .response;
      const message = response?.data?.message;
      if (Array.isArray(message)) return message.join(" ");
      if (message) return message;
    }
    return error instanceof Error ? error.message : "Inténtalo de nuevo.";
  }

  onScopeDispose(() => {
    active = false;
  });

  return {
    countries,
    countriesQuery,
    countryId,
    selectedCountry,
    regions,
    regionsQuery,
    regionId,
    localityName,
    province,
    rows,
    nonEmptyRows,
    importing,
    localityError,
    importError,
    localityNotice,
    validationErrors,
    summary,
    hadImport,
    setInitialCountry,
    changeCountry,
    changeRegion,
    clearLocalityError,
    clearProvinceError,
    localityChanged,
    provinceChanged,
    addRow,
    pasteNames,
    pasteNotice,
    updateName,
    updateType,
    updateLocality,
    removeRow,
    importRows,
  };
}
