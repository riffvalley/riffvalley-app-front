import { computed, reactive, shallowRef, watch } from "vue";
import { useAuthStore } from "@/modules/identity/auth";
import { useReunionDetailQuery } from "../../application/reunionsQueries";
import { useReunionsMutations } from "../../application/useReunionsMutations";
import type { Point } from "../../types/reunions";

export function useReunionEditor(reunionId: () => string | null) {
  const auth = useAuthStore();
  const session = {
    userId: computed(() => auth.userId),
    generation: computed(() => auth.authSessionGeneration),
    role: computed(() => auth.role),
  };
  const detailQuery = useReunionDetailQuery(session, reunionId);
  const reunion = computed(() => detailQuery.data.value ?? null);
  const lastKnownReunion = shallowRef<typeof reunion.value>(null);
  watch(
    reunion,
    (value) => {
      if (value) lastKnownReunion.value = value;
    },
    { immediate: true }
  );
  const displayedReunion = computed(() => reunion.value ?? lastKnownReunion.value);
  const mutations = useReunionsMutations(session);

  const editReunionOpen = shallowRef(false);
  const reunionDraft = reactive({ title: "", date: "" });
  const newPointOpen = shallowRef(false);
  const newPointDraft = reactive({ title: "", content: "" });
  const editingPointId = shallowRef<string | null>(null);
  const pointDraft = reactive({ title: "", content: "" });
  const expandedPoints = shallowRef(new Set<string>());
  const editingPointMissing = computed(() =>
    Boolean(
      editingPointId.value &&
      !displayedReunion.value?.points.some((point) => point.id === editingPointId.value)
    )
  );

  watch(reunionId, () => {
    lastKnownReunion.value = null;
    editReunionOpen.value = false;
    editingPointId.value = null;
    newPointOpen.value = false;
    expandedPoints.value = new Set();
  });

  function beginEditReunion() {
    const current = reunion.value;
    if (!current) return;
    reunionDraft.title = current.title;
    const date = new Date(current.date);
    const pad = (part: number) => String(part).padStart(2, "0");
    reunionDraft.date = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    editReunionOpen.value = true;
  }

  function cancelEditReunion() {
    editReunionOpen.value = false;
  }

  async function saveReunion() {
    const id = reunionId();
    if (!id) return;
    await mutations.updateReunionMutation.mutateAsync({
      id,
      dto: {
        titulo: reunionDraft.title,
        fecha: new Date(reunionDraft.date).toISOString(),
      },
    });
    editReunionOpen.value = false;
  }

  async function addPoint() {
    const id = reunionId();
    if (!id) return;
    await mutations.createPointMutation.mutateAsync({
      titulo: newPointDraft.title,
      content: newPointDraft.content || undefined,
      reunionId: id,
    });
    newPointDraft.title = "";
    newPointDraft.content = "";
    newPointOpen.value = false;
  }

  function beginEditPoint(point: Point) {
    editingPointId.value = point.id;
    pointDraft.title = point.title;
    pointDraft.content = point.content ?? "";
  }

  function cancelEditPoint() {
    editingPointId.value = null;
    pointDraft.title = "";
    pointDraft.content = "";
  }

  async function savePoint() {
    const id = editingPointId.value;
    if (!id) return;
    await mutations.updatePointMutation.mutateAsync({
      id,
      dto: { titulo: pointDraft.title, content: pointDraft.content || null },
    });
    cancelEditPoint();
  }

  async function togglePointDone(point: Point, done: boolean) {
    await mutations.updatePointMutation.mutateAsync({ id: point.id, dto: { done } });
  }

  async function removePoint(id: string) {
    await mutations.deletePointMutation.mutateAsync(id);
    if (editingPointId.value === id) cancelEditPoint();
  }

  function toggleExpandedPoint(id: string) {
    const next = new Set(expandedPoints.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedPoints.value = next;
  }

  return {
    detailQuery,
    reunion: displayedReunion,
    editReunionOpen,
    reunionDraft,
    newPointOpen,
    newPointDraft,
    editingPointId,
    editingPointMissing,
    pointDraft,
    expandedPoints,
    mutations,
    beginEditReunion,
    cancelEditReunion,
    saveReunion,
    addPoint,
    beginEditPoint,
    cancelEditPoint,
    savePoint,
    togglePointDone,
    removePoint,
    toggleExpandedPoint,
  };
}
