<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId, watch } from "vue";
import type { TripInput } from "../api/types";
import AppButton from "./buttons/AppButton.vue";
import DateInput from "./form/DateInput.vue";
import FormField from "./form/FormField.vue";
import NumberInput from "./form/NumberInput.vue";
import TextInput from "./form/TextInput.vue";

type TripForm = {
  title: string;
  startDate: string;
  endDate: string;
  people: number | string;
};

const props = defineProps<{
  heading: string;
  submitLabel: string;
  initial: TripInput;
  saving: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [payload: TripInput];
}>();

const headingId = useId();

function tripForm(input: TripInput): TripForm {
  return {
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    people: String(input.people),
  };
}

const form = ref<TripForm>(tripForm(props.initial));

watch(
  () => props.initial,
  (initial) => {
    form.value = tripForm(initial);
  },
);

function close() {
  if (!props.saving) emit("close");
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

function submit() {
  emit("submit", {
    title: form.value.title,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    people: Number(form.value.people),
  });
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="modal-back" @click.self="close">
    <form class="modal" role="dialog" aria-modal="true" :aria-labelledby="headingId" @submit.prevent="submit">
      <h2 :id="headingId">{{ heading }}</h2>
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
  display: flex;
  overflow: auto;
  padding: var(--size-gutter);
  background: var(--color-overlay);
}

.modal {
  display: grid;
  gap: var(--space-4);
  width: 100%;
  margin: auto;
  padding: var(--space-6) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
  border-radius: var(--radius-xl);
  background: var(--color-card);
}

.modal .banner { margin: 0; }

.split {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-1);
}

@media (min-width: 40rem) {
  .modal-back { padding: var(--space-6); }

  .modal {
    width: min(var(--size-modal), 100%);
    padding: var(--space-7);
  }

  .split { grid-template-columns: 1fr 1fr; }

  .modal-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>
