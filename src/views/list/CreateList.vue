<template>
  <div class="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-md">
    <form @submit.prevent="submitForm">
      <!-- Name Input -->
      <div class="mb-4">
        <label for="name" class="block text-sm font-medium text-gray-700"
          >Name</label
        >
        <input
          id="name"
          v-model="form.name"
          type="text"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter list name"
          required
        />
      </div>

      <!-- Type Select -->
      <div class="mb-4">
        <label for="type" class="block text-sm font-medium text-gray-700"
          >Type</label
        >
        <select
          id="type"
          v-model="form.type"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          required
        >
          <option disabled value="">Select a type</option>
          <option :value="ListType.MONTH">Month</option>
          <option :value="ListType.WEEK">Week</option>
          <option :value="ListType.SPECIAL">Special</option>
        </select>
      </div>

      <div class="mb-4">
        <label for="specialDate" class="block text-sm font-medium text-gray-700"
          >List Date (optional in special type)</label
        >
        <input
          id="specialDate"
          v-model="form.listDate"
          type="date"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div class="mb-4">
        <label for="specialDate" class="block text-sm font-medium text-gray-700"
          >Release Date (optional until is scheduled)</label
        >
        <input
          id="releaseDate"
          v-model="form.releaseDate"
          type="date"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <!-- Link Input -->
      <div class="mb-4"></div>
      <div class="mb-4">
        <p>Status: {{ form.status }}</p>
      </div>
      <!-- Submit Button -->
      <div>
        <button
          type="submit"
          class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Create List
        </button>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from "vue";
import { postList } from "@services/list/list";
import SwalService from "@services/swal/SwalService";
import { useRouter } from "vue-router";

export enum ListType {
  MONTH = "month",
  WEEK = "week",
  SPECIAL = "special",
}

export default defineComponent({
  name: "CreateListForm",
  setup() {
    const form = reactive({
      name: "",
      type: "",
      listDate: "",
      status: "new",
      releaseDate: "",
    });

    const router = useRouter();

    const submitForm = async () => {
      try {
        const response = await postList({
          name: form.name,
          type: form.type,
          listDate: form.listDate ? `${form.listDate}T00:00:00.000Z` : null,
          releaseDate: form.releaseDate
            ? `${form.releaseDate}T00:00:00.000Z`
            : null,
          status: "new",
        });

        SwalService.success("List created successfully!");
        router.push({ name: "ListDefault" });
      } catch (error) {
        // Maneja errores de la solicitud
        console.error("Error creating list:", error);
        SwalService.error(
          "An error occurred while creating the list. Please try again."
        );
      }
    };

    return {
      form,
      submitForm,
      ListType,
    };
  },
});
</script>
