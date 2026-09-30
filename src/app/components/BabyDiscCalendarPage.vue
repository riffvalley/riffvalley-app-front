<script setup lang="ts">
import { BabyDiscCalendarView } from "@/modules/catalog";
import DiscComponent from "@views/discsCalendarBaby/components/DiscComponentBaby.vue";
import { useCatalogStore } from "@stores/catalog/catalog";
import { calendarPort } from "../dependencies/discCalendar";
import { showErrorToast } from "@/shared/ui/errorToast";

const catalog = useCatalogStore();
const loadError = () => showErrorToast("Error al cargar los discos");
</script>

<template>
  <BabyDiscCalendarView :calendar-port="calendarPort" :genres="catalog.genres" :countries="catalog.countries" @load-error="loadError">
    <template #disc="{ disc }">
      <DiscComponent :disc="disc" :genres="catalog.genres" :artist-country="disc.artist?.country" />
    </template>
  </BabyDiscCalendarView>
</template>
