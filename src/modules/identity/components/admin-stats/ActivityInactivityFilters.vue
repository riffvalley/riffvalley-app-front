<script setup lang="ts">
import type { UserRole } from "@/modules/identity/types/auth";
import type {
  ActivityInactivitySortBy,
  ActivityInactivitySortOrder,
} from "@/modules/identity/types/activityInactivity";

const asOf = defineModel<string>("asOf", { required: true });
const role = defineModel<UserRole | "">("role", { required: true });
const isActive = defineModel<"" | "true" | "false">("isActive", { required: true });
const sortBy = defineModel<ActivityInactivitySortBy>("sortBy", { required: true });
const sortOrder = defineModel<ActivityInactivitySortOrder>("sortOrder", { required: true });

const roles: { value: UserRole | ""; label: string }[] = [
  { value: "", label: "Todos los roles" },
  { value: "user", label: "Usuario" },
  { value: "collaborator", label: "Colaborador" },
  { value: "riffvalley", label: "Riff Valley" },
  { value: "superadmin", label: "Superadmin" },
];

const sortFields: { value: ActivityInactivitySortBy; label: string }[] = [
  { value: "daysSinceLastVote", label: "Días sin voto nuevo" },
  { value: "lastVoteAt", label: "Último voto nuevo" },
  { value: "username", label: "Nombre" },
  { value: "lastPresenceAt", label: "Última presencia" },
  { value: "lastRatingModifiedAt", label: "Edición de valoración" },
  { value: "currentRatings", label: "Valoraciones actuales" },
];
</script>

<template>
  <section class="filters" aria-label="Filtros de inactividad">
    <label class="filter-field">
      <span>Fecha de referencia</span>
      <input v-model="asOf" type="date" />
    </label>
    <label class="filter-field">
      <span>Rol</span>
      <select v-model="role">
        <option v-for="item in roles" :key="item.value || 'all-roles'" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
    <label class="filter-field">
      <span>Estado</span>
      <select v-model="isActive">
        <option value="">Todas las cuentas</option>
        <option value="true">Activas</option>
        <option value="false">Deshabilitadas</option>
      </select>
    </label>
    <label class="filter-field filter-field--sort">
      <span>Ordenar por</span>
      <select v-model="sortBy">
        <option v-for="item in sortFields" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
    <label class="filter-field filter-field--direction">
      <span>Dirección</span>
      <select v-model="sortOrder">
        <option value="desc">Descendente</option>
        <option value="asc">Ascendente</option>
      </select>
    </label>
  </section>
</template>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.8rem;
  align-items: end;
}

.filter-field {
  display: grid;
  gap: 0.35rem;
  color: #4b5568;
  font-size: 0.72rem;
  font-weight: 600;
}

.filter-field input,
.filter-field select {
  width: 100%;
  min-height: 2.55rem;
  border: 1px solid #d8dce5;
  border-radius: 0.55rem;
  background: white;
  padding: 0.45rem 0.65rem;
  color: #172033;
  font: inherit;
  font-size: 0.82rem;
}

.filter-field input:focus-visible,
.filter-field select:focus-visible {
  outline: 2px solid #b0669f;
  outline-offset: 2px;
}

:global(.dark) .filter-field {
  color: #d4d8e1;
}

:global(.dark) .filter-field input,
:global(.dark) .filter-field select {
  border-color: rgb(255 255 255 / 16%);
  background: #20232d;
  color: #f4f5f8;
  color-scheme: dark;
}

@media (max-width: 900px) {
  .filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
