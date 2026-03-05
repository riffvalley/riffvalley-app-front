<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">Importar Discos</h1>
    <p class="text-left font-serif text-gray-500 text-md mb-4">
      Descarga la plantilla Excel para importar discos. Completa la plantilla y sube el archivo para importar los discos.
    </p>

    <!-- Download Template Button -->
    <div class="mb-6">
      <button @click="downloadTemplate"
        class="px-5 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-full
         hover:from-blue-600 hover:to-blue-700 focus:outline-none w-full sm:w-auto">
        Descargar Plantilla Excel
      </button>
    </div>

    <!-- Upload Form -->
    <div class="mb-6">
      <label for="file" class="block text-sm font-medium text-gray-700 mb-1">
        Subir archivo Excel:
      </label>
      <p class="text-xs text-gray-500 mb-3">
        Nota: El campo "Fecha" puede estar en uno de estos formatos DD.MM.YYYY o DD/MM/YYYY o DD-MM-YYYY
      </p>
      <input id="file" type="file" accept=".xlsx,.xls" @change="onFileChange"
        class="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50" />
      <p v-if="selectedFile" class="mt-1 text-sm text-gray-500">
        Archivo seleccionado: {{ selectedFile.name }}
      </p>
      <button @click="handleUpload" :disabled="!selectedFile || uploading"
        class="mt-2 px-5 py-2 md:px-6 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-full
         hover:from-green-600 hover:to-green-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto">
        <span v-if="uploading">Importando...</span>
        <span v-else>Importar Discos</span>
      </button>
    </div>

    <!-- Message -->
    <div v-if="message" class="mt-4">
      <div :class="messageClass" class="px-4 py-3 rounded border">
        {{ message }}
      </div>
    </div>

    <!-- Import Errors List -->
    <div v-if="importErrors.length" class="mt-4">
      <h3 class="text-md font-semibold text-red-600 mb-2">Errores de importación ({{ importErrors.length }}):</h3>
      <ul class="list-disc list-inside text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 max-h-60 overflow-y-auto">
        <li v-for="(err, index) in importErrors" :key="index">
          <strong>Fila {{ err.row }}</strong> — {{ err.disc }} ({{ err.artist }}): {{ err.error }}
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

    const messageClass = computed(() => {
      switch (messageType.value) {
        case 'success':
          return 'bg-green-100 border-green-400 text-green-700';
        case 'error':
          return 'bg-red-100 border-red-400 text-red-700';
        default:
          return 'bg-blue-100 border-blue-400 text-blue-700';
      }
    });

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
      messageClass,
      uploading,
      importErrors,
      downloadTemplate,
      handleUpload,
      onFileChange,
    };
  },
});
</script>

<style scoped>
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
