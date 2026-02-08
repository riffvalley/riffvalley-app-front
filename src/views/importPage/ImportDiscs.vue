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

    <!-- Upload Form (placeholder for future implementation) -->
    <div class="mb-6">
      <label for="file" class="block text-sm font-medium text-gray-700 mb-1">
        Subir archivo Excel:
      </label>
      <input id="file" type="file" accept=".xlsx,.xls"
        class="block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50" />
      <button @click="uploadFile" :disabled="!selectedFile"
        class="mt-2 px-5 py-2 md:px-6 md:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-full
         hover:from-green-600 hover:to-green-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto">
        Importar Discos
      </button>
    </div>

    <!-- Message -->
    <div v-if="message" class="mt-4">
      <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'ImportDiscs',
  setup() {
    const selectedFile = ref<File | null>(null);
    const message = ref('');

    const downloadTemplate = async () => {
      try {
        const response = await fetch('/api/excel/template/download');
        if (!response.ok) {
          throw new Error('Failed to download template');
        }
        const blob = await response.blob();
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
        console.error('Download failed:', error);
        message.value = 'Error al descargar la plantilla.';
      }
    };

    const uploadFile = () => {
      // Placeholder for upload functionality
      message.value = 'Funcionalidad de subida próximamente disponible.';
    };

    return {
      selectedFile,
      message,
      downloadTemplate,
      uploadFile,
    };
  },
});
</script>

<style scoped>
/* Additional styles if needed */
</style>
