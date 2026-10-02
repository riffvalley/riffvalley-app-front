<script setup lang="ts">
import SuggestRequestPage from '@/app/components/SuggestRequestPage.vue';
import SwalService from '@services/swal/SwalService';

</script>

<template>
  <SuggestRequestPage
    :notify-success="SwalService.success"
    :notify-error="SwalService.error"
  />
</template>
