<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    @click.self="handleCancel"
  >
    <div class="bg-white dark:bg-rv-darkCard p-6 rounded-lg shadow-lg w-96 border border-gray-100 dark:border-white/10">
      <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {{ title }}
      </h2>

      <input
        v-model="inputValue"
        :type="inputType"
        :placeholder="placeholder"
        class="border border-gray-300 dark:border-white/10 p-2 w-full rounded-md
               bg-white dark:bg-rv-darkSurface
               text-gray-800 dark:text-white
               placeholder:text-gray-400 dark:placeholder:text-gray-500
               outline-none focus:outline-none focus-visible:outline-none
               ring-0 focus:ring-0 focus-visible:ring-0
               focus:border-rv-pink"
        @keyup.enter="handleSave"
      />

      <div class="flex justify-end mt-4 space-x-2">
        <button
          @click="handleCancel"
          class="bg-gray-400 dark:bg-rv-darkSurface text-white dark:text-gray-200 px-4 py-2 rounded-full
                 transition-all duration-200 hover:shadow-md transform hover:scale-105
                 border border-transparent dark:border-white/10"
        >
          Cancelar
        </button>

        <button
          @click="handleSave"
          class="bg-rv-pink text-white px-4 py-2 rounded-full transition-all duration-200 hover:shadow-md transform hover:scale-105"
        >
          Guardar
        </button>
      </div>
    </div>
  </div>
</template>
  
  <script lang="ts">
  import { defineComponent, ref, watch } from "vue";
  
  export default defineComponent({
    name: "EditModal",
    props: {
      show: {
        type: Boolean,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      modelValue: {
        type: String,
        required: true,
      },
      placeholder: {
        type: String,
        default: "",
      },
      inputType: {
        type: String,
        default: "text",
      },
    },
    emits: ["update:modelValue", "save", "cancel", "update:show"],
    setup(props, { emit }) {
      const inputValue = ref(props.modelValue);
  
      // Se sincroniza el valor interno si la prop cambia
      watch(
        () => props.modelValue,
        (newVal) => {
          inputValue.value = newVal;
        }
      );
  
      const handleSave = () => {
        emit("update:modelValue", inputValue.value);
        emit("save", inputValue.value);
        emit("update:show", false);
      };
  
      const handleCancel = () => {
        inputValue.value = props.modelValue;
        emit("cancel");
        emit("update:show", false);
      };
  
      return {
        inputValue,
        handleSave,
        handleCancel,
      };
    },
  });
  </script>
  