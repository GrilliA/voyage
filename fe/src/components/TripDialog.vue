<script setup lang="ts">
import { reactive, watch } from "vue";
import type { TripInput } from "../api/types";
import AppButton from "./buttons/AppButton.vue";
import DateInput from "./form/DateInput.vue";
import FormField from "./form/FormField.vue";
import NumberInput from "./form/NumberInput.vue";
import TextInput from "./form/TextInput.vue";

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
      <FormField label="Nome del viaggio">
        <TextInput v-model="form.title" maxlength="80" required autofocus />
      </FormField>
      <div class="split">
        <FormField label="Partenza">
          <DateInput v-model="form.startDate" />
        </FormField>
        <FormField label="Ritorno">
          <DateInput v-model="form.endDate" />
        </FormField>
      </div>
      <FormField label="Persone">
        <NumberInput v-model="form.people" min="1" max="99" required />
      </FormField>
      <div class="modal-actions">
        <AppButton variant="secondary" @click="close">Annulla</AppButton>
        <AppButton type="submit" :disabled="saving">{{ submitLabel }}</AppButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.modal-back {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: var(--space-6);
  background: var(--color-overlay);
}

.modal {
  display: grid;
  gap: var(--space-4);
  width: min(460px, 100%);
  padding: var(--space-7);
  border-radius: var(--radius-xl);
  background: var(--color-card);
}

.modal .banner { margin: 0; }

.split { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }

.modal-actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-1); }

@media (max-width: 900px) {
  .split { grid-template-columns: 1fr; }
}
</style>
