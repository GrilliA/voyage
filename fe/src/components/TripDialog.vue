<script setup lang="ts">
import { reactive, watch } from "vue";
import type { TripInput } from "../api/types";

const props = withDefaults(
  defineProps<{
    heading: string;
    submitLabel: string;
    initial: TripInput;
    saving?: boolean;
    error?: string;
  }>(),
  { saving: false, error: "" },
);

const emit = defineEmits<{
  close: [];
  submit: [payload: TripInput];
}>();

const form = reactive<TripInput>({
  title: "",
  startDate: "",
  endDate: "",
  people: 2,
});

watch(
  () => props.initial,
  (initial) => {
    form.title = initial.title;
    form.startDate = initial.startDate;
    form.endDate = initial.endDate;
    form.people = initial.people;
  },
  { immediate: true },
);

function close() {
  if (!props.saving) emit("close");
}

function submit() {
  emit("submit", {
    title: form.title,
    startDate: form.startDate,
    endDate: form.endDate,
    people: Number(form.people),
  });
}
</script>

<template>
  <div class="modal-back" @click.self="close" @keydown.esc="close">
    <form class="modal" @submit.prevent="submit">
      <h2>{{ heading }}</h2>
      <p v-if="error" class="banner" role="alert">{{ error }}</p>
      <label class="field">
        Nome del viaggio
        <input v-model="form.title" type="text" maxlength="80" required autofocus />
      </label>
      <div class="split">
        <label class="field">
          Partenza
          <input v-model="form.startDate" type="date" />
        </label>
        <label class="field">
          Ritorno
          <input v-model="form.endDate" type="date" />
        </label>
      </div>
      <label class="field">
        Persone
        <input v-model.number="form.people" type="number" min="1" max="99" required />
      </label>
      <div class="modal-actions">
        <button class="button secondary" type="button" @click="close">Annulla</button>
        <button class="button" type="submit" :disabled="saving">{{ submitLabel }}</button>
      </div>
    </form>
  </div>
</template>
