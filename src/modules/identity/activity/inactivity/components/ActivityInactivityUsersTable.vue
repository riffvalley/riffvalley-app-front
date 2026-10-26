<script setup lang="ts">
import type { ActivityInactivityUser } from "@/modules/identity/activity/inactivity/types/activityInactivity";

defineProps<{ users: ActivityInactivityUser[] }>();

const groupLabels: Record<ActivityInactivityUser["inactivityGroup"], string> = {
  "0_2_days": "0–2 días",
  "3_6_days": "3–6 días",
  "7_13_days": "7–13 días",
  "14_29_days": "14–29 días",
  "30_59_days": "30–59 días",
  "60_plus_days": "60 días o más",
  never_voted: "Nunca ha votado",
  insufficient_history: "Historial insuficiente",
};

const roleLabels: Record<ActivityInactivityUser["role"], string> = {
  user: "Usuario",
  collaborator: "Colaborador",
  riffvalley: "Riff Valley",
  superadmin: "Superadmin",
};

function formatDate(value: string | null): string {
  if (!value) return "Sin registro";
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(date);
}

function formatUtcTimestamp(value: string | null): string {
  if (!value) return "Sin dato histórico";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function formatLocalTimestamp(value: string | null): string {
  if (!value) return "Sin registro";
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}
</script>

<template>
  <div class="table-scroll" role="region" aria-label="Usuarios por inactividad" tabindex="0">
    <table class="users-table">
      <thead>
        <tr>
          <th scope="col">Usuario</th>
          <th scope="col">Rol y estado</th>
          <th scope="col">Último voto nuevo</th>
          <th scope="col">Inactividad</th>
          <th scope="col">Última presencia</th>
          <th scope="col" title="Rate.editedAt puede cambiar también por una edición de portada">
            Edición de valoración
          </th>
          <th scope="col">Valoraciones actuales</th>
          <th scope="col"><span class="sr-only">Detalle</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.userId">
          <th scope="row" class="username-cell">{{ user.username }}</th>
          <td>
            <span>{{ roleLabels[user.role] }}</span>
            <span
              class="account-state"
              :class="user.isActive ? 'account-state--active' : 'account-state--disabled'"
            >
              {{ user.isActive ? "Activa" : "Deshabilitada" }}
            </span>
          </td>
          <td>
            <time v-if="user.lastVoteAt" :datetime="user.lastVoteAt">{{
              formatUtcTimestamp(user.lastVoteAt)
            }}</time>
            <span v-else class="muted">Sin dato histórico</span>
          </td>
          <td>
            <span v-if="user.daysSinceLastVote !== null" class="inactivity-days">
              {{ user.daysSinceLastVote }} {{ user.daysSinceLastVote === 1 ? "día" : "días" }}
            </span>
            <span v-else class="muted">—</span>
            <span class="group-label" :class="`group-label--${user.inactivityGroup}`">{{
              groupLabels[user.inactivityGroup]
            }}</span>
          </td>
          <td>{{ formatDate(user.lastPresenceAt) }}</td>
          <td>
            <time
              v-if="user.lastRatingModifiedAt"
              :datetime="user.lastRatingModifiedAt"
              :title="`${formatLocalTimestamp(user.lastRatingModifiedAt)} · timestamp sin zona horaria`"
            >
              {{ formatLocalTimestamp(user.lastRatingModifiedAt) }}
            </time>
            <span v-else class="muted">Sin registro</span>
          </td>
          <td class="numeric-cell">{{ user.currentRatings.toLocaleString("es-ES") }}</td>
          <td>
            <RouterLink
              class="detail-link"
              :to="{ name: 'UserStatsUsers', query: { userId: user.userId } }"
              :aria-label="`Ver actividad de ${user.username}`"
            >
              Ver actividad
            </RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-scroll {
  overflow-x: auto;
  border: 1px solid rgb(148 163 184 / 24%);
  border-radius: 0.9rem;
  background: white;
}

.table-scroll:focus-visible {
  outline: 2px solid #b0669f;
  outline-offset: 3px;
}

.users-table {
  width: 100%;
  min-width: 1050px;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.78rem;
}

.users-table th,
.users-table td {
  padding: 0.8rem 0.75rem;
  border-bottom: 1px solid #edf0f4;
  vertical-align: top;
}

.users-table thead th {
  background: #f7f8fa;
  color: #4b5568;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.035em;
  text-transform: uppercase;
  white-space: nowrap;
}

.users-table tbody tr:last-child th,
.users-table tbody tr:last-child td {
  border-bottom: 0;
}

.users-table tbody tr:hover {
  background: #fbf8fb;
}

.username-cell {
  max-width: 13rem;
  color: #1d2637;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.account-state,
.group-label {
  display: table;
  margin-top: 0.28rem;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  font-size: 0.66rem;
  font-weight: 650;
  white-space: nowrap;
}

.account-state--active {
  background: #e8f6ee;
  color: #17643b;
}

.account-state--disabled {
  background: #f0f1f3;
  color: #555d6b;
}

.inactivity-days,
.numeric-cell {
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}

.group-label--0_2_days,
.group-label--3_6_days {
  background: #fcecf1;
  color: #883b57;
}

.group-label--7_13_days,
.group-label--14_29_days {
  background: #f8f0e5;
  color: #79522b;
}

.group-label--30_59_days,
.group-label--60_plus_days {
  background: #f7e8e4;
  color: #854331;
}

.group-label--never_voted,
.group-label--insufficient_history {
  background: #eceef2;
  color: #475064;
}

.muted {
  color: #667085;
}

.detail-link {
  color: #783f75;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  white-space: nowrap;
}

.detail-link:focus-visible {
  outline: 2px solid #b0669f;
  outline-offset: 3px;
}

:global(.dark) .table-scroll {
  border-color: rgb(255 255 255 / 10%);
  background: #171923;
}

:global(.dark) .users-table th,
:global(.dark) .users-table td {
  border-bottom-color: rgb(255 255 255 / 8%);
}

:global(.dark) .users-table thead th {
  background: #20232d;
  color: #c2c7d2;
}

:global(.dark) .users-table tbody tr:hover {
  background: #20202a;
}

:global(.dark) .username-cell {
  color: #f4f5f8;
}

:global(.dark) .muted {
  color: #b4bac6;
}

:global(.dark) .account-state--active {
  background: #173a2a;
  color: #a6e3bf;
}

:global(.dark) .account-state--disabled,
:global(.dark) .group-label--never_voted,
:global(.dark) .group-label--insufficient_history {
  background: #343744;
  color: #e0e3ea;
}

:global(.dark) .group-label--0_2_days,
:global(.dark) .group-label--3_6_days {
  background: #492a38;
  color: #f3c0d1;
}

:global(.dark) .group-label--7_13_days,
:global(.dark) .group-label--14_29_days {
  background: #493a2a;
  color: #ead1ac;
}

:global(.dark) .group-label--30_59_days,
:global(.dark) .group-label--60_plus_days {
  background: #4a302c;
  color: #edc0b5;
}

:global(.dark) .detail-link {
  color: #e7a9d4;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
