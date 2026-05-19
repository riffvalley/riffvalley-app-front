<template>
  <div class="p-6 max-w-4xl mx-auto">

    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold dark:text-white">
        <i class="fa-solid fa-upload mr-2"></i>Importar Discos
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Descarga la plantilla Excel, complétala y súbela para importar discos en bloque.
      </p>
    </div>

    <!-- Main card -->
    <div class="bg-white dark:bg-rv-darkCard rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6 mb-6 space-y-6">

      <!-- Step 1: Download template -->
      <div>
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rv-pink text-white text-xs font-bold">1</span>
          Descarga la plantilla
        </h2>
        <button
          @click="downloadTemplate"
          class="px-5 py-2.5 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-semibold rounded-full shadow-sm hover:opacity-90 focus:outline-none transition"
        >
          <i class="fa-solid fa-file-excel mr-2"></i>Descargar plantilla Excel
        </button>
      </div>

      <hr class="border-gray-100 dark:border-white/10" />

      <!-- Step 2: Upload file -->
      <div>
        <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rv-pink text-white text-xs font-bold">2</span>
          Sube el archivo completado
        </h2>
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">
          El campo "Fecha" admite los formatos <span class="font-mono">DD.MM.YYYY</span>, <span class="font-mono">DD/MM/YYYY</span> o <span class="font-mono">DD-MM-YYYY</span>.
        </p>

        <!-- File input area -->
        <label
          for="file"
          class="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-rv-darkSurface cursor-pointer hover:border-rv-pink dark:hover:border-rv-pink transition group"
        >
          <i class="fa-solid fa-cloud-arrow-up text-2xl text-gray-300 dark:text-gray-500 group-hover:text-rv-pink transition mb-2"></i>
          <span v-if="selectedFile" class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ selectedFile.name }}</span>
          <span v-else class="text-sm text-gray-400 dark:text-gray-500">
            Haz clic para seleccionar un archivo <span class="text-rv-pink font-medium">.xlsx</span> o <span class="text-rv-pink font-medium">.xls</span>
          </span>
          <input id="file" type="file" accept=".xlsx,.xls" @change="onFileChange" class="hidden" />
        </label>

        <div class="mt-4 flex justify-end">
          <button
            @click="handleUpload"
            :disabled="!selectedFile || uploading"
            class="px-6 py-2.5 bg-gradient-to-r from-rv-pink to-rv-purple text-white font-semibold rounded-full shadow-sm hover:opacity-90 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <i v-if="uploading" class="fa-solid fa-spinner fa-spin mr-2"></i>
            <i v-else class="fa-solid fa-file-import mr-2"></i>
            {{ uploading ? 'Importando...' : 'Importar discos' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Result message -->
    <div v-if="message" class="mb-4 rounded-xl px-4 py-3 text-sm border flex items-start gap-2"
      :class="{
        'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-400': messageType === 'success',
        'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400': messageType === 'error',
        'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-400': messageType === 'info',
      }"
    >
      <i class="mt-0.5 fa-solid"
        :class="{
          'fa-circle-check': messageType === 'success',
          'fa-circle-xmark': messageType === 'error',
          'fa-circle-info': messageType === 'info',
        }"
      ></i>
      <span>{{ message }}</span>
    </div>

    <!-- Import errors -->
    <div v-if="importErrors.length" class="bg-white dark:bg-rv-darkCard rounded-2xl border border-red-200 dark:border-red-800/40 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-red-100 dark:border-red-800/30">
        <h3 class="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Errores de importación ({{ importErrors.length }})
        </h3>
      </div>
      <ul class="divide-y divide-gray-100 dark:divide-white/5 max-h-72 overflow-y-auto">
        <li
          v-for="(err, index) in importErrors"
          :key="index"
          class="px-6 py-3 text-sm"
        >
          <span class="inline-block text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded px-1.5 py-0.5 mr-2">Fila {{ err.row }}</span>
          <span class="font-medium text-gray-800 dark:text-gray-200">{{ err.artist }} – {{ err.disc }}</span>
          <span class="text-gray-400 dark:text-gray-500 ml-2">{{ err.error }}</span>
        </li>
      </ul>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { downloadDiscTemplate, uploadDiscFile } from '@services/imports/imports';

export default defineComponent({
  name: 'ImportDiscs',
  setup() {
    const selectedFile = ref<File | null>(null);
    const message = ref('');
    const uploading = ref(false);
    const messageType = ref<'info' | 'success' | 'error'>('info');
    const importErrors = ref<{ row: number; disc: string; artist: string; error: string }[]>([]);

    const onFileChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      selectedFile.value = target.files?.[0] ?? null;
      message.value = '';
      importErrors.value = [];
    };

    const downloadTemplate = async () => {
      try {
        const blob = await downloadDiscTemplate();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const today = new Date();
        const dateStr = today.getFullYear().toString() +
                        (today.getMonth() + 1).toString().padStart(2, '0') +
                        today.getDate().toString().padStart(2, '0');
        link.download = `template_discos_${dateStr}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        messageType.value = 'error';
        message.value = 'Error al descargar la plantilla.';
      }
    };

    const handleUpload = async () => {
      if (!selectedFile.value) return;

      uploading.value = true;
      message.value = '';
      importErrors.value = [];

      try {
        const result = await uploadDiscFile(selectedFile.value);

        if (result.errors?.length) {
          importErrors.value = result.errors;
        }

        messageType.value = result.errors?.length ? 'info' : 'success';
        message.value = `Importación completada: ${result.created ?? 0} discos creados` +
          (result.errors?.length ? `, ${result.errors.length} errores.` : '.');
        selectedFile.value = null;

        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } catch (error: any) {
        messageType.value = 'error';
        message.value = error.response?.data?.message || error.message || 'Error al importar los discos.';
      } finally {
        uploading.value = false;
      }
    };

    return {
      selectedFile,
      message,
      messageType,
      uploading,
      importErrors,
      downloadTemplate,
      handleUpload,
      onFileChange,
    };
  },
});
</script>
