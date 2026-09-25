<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  countNights,
  splitMoney,
  totalForBasis,
  type PriceBasis,
  type StayDetails,
} from "../../../shared/domain";
import { formatMoney, formatNights, formatPeople } from "../format";
import AppButton from "./buttons/AppButton.vue";
import BasisToggle from "./form/BasisToggle.vue";
import DateInput from "./form/DateInput.vue";
import FieldGroup from "./form/FieldGroup.vue";
import FormField from "./form/FormField.vue";
import FormPanel from "./form/FormPanel.vue";
import NumberInput from "./form/NumberInput.vue";
import TextInput from "./form/TextInput.vue";

const props = withDefaults(
  defineProps<{
    people: number;
    saving?: boolean;
    submitLabel: string;
    stay?: StayDetails | null;
    suggestCheckIn?: string;
    suggestCheckOut?: string;
    showCancel?: boolean;
  }>(),
  { saving: false, stay: null, suggestCheckIn: "", suggestCheckOut: "", showCancel: false },
);

const emit = defineEmits<{
  submit: [stay: StayDetails];
  cancel: [];
}>();

const error = ref("");
const form = reactive<{
  basis: PriceBasis;
  price: string;
  place: string;
  checkIn: string;
  checkOut: string;
  link: string;
}>({
  basis: "totale",
  price: "",
  place: "",
  checkIn: "",
  checkOut: "",
  link: "",
});

const preview = computed(() => {
  if (form.price === "") return "";
  const price = Number(form.price);
  if (!Number.isFinite(price) || price < 0) return "";
  const total = totalForBasis(price, form.basis, props.people);
  const nights = countNights(form.checkIn, form.checkOut);
  const nightly = nights == null ? null : splitMoney(total, nights);
  const nightlyPerson = nights == null ? null : splitMoney(total, nights * props.people);

  if (form.basis === "persona") {
    const peoplePart = `${formatMoney(price)} × ${formatPeople(props.people)} = ${formatMoney(total)} nel totale`;
    if (nights == null || nightlyPerson == null) return peoplePart;
    return `${formatNights(nights)} · ${peoplePart} · ${formatMoney(nightlyPerson)} a notte a persona`;
  }

  if (nights == null || nightly == null) return `${formatMoney(total)} nel totale`;
  return `${formatNights(nights)} · ${formatMoney(nightly)} a notte · ${formatMoney(total)} nel totale`;
});

watch(
  () => props.stay,
  (stay) => {
    form.basis = stay?.basis ?? "totale";
    form.price = stay ? String(stay.price) : "";
    form.place = stay?.place ?? "";
    form.checkIn = stay?.checkIn ?? props.suggestCheckIn;
    form.checkOut = stay?.checkOut ?? props.suggestCheckOut;
    form.link = stay?.link ?? "";
    error.value = "";
  },
  { immediate: true },
);

watch(
  () => [props.suggestCheckIn, props.suggestCheckOut] as const,
  ([checkIn, checkOut], previous) => {
    if (props.stay || previous == null) return;
    const [previousCheckIn, previousCheckOut] = previous;
    if (form.checkIn === previousCheckIn && form.checkOut === previousCheckOut) {
      form.checkIn = checkIn;
      form.checkOut = checkOut;
    }
  },
);

function submit() {
  const place = form.place.trim();
  const price = Number(form.price);

  if (!place) {
    error.value = "Il luogo è obbligatorio.";
    return;
  }
  if (!form.checkIn) {
    error.value = "La data di arrivo è obbligatoria.";
    return;
  }
  if (!form.checkOut) {
    error.value = "La data di uscita è obbligatoria.";
    return;
  }
  if (form.checkOut <= form.checkIn) {
    error.value = "Il soggiorno deve durare almeno una notte.";
    return;
  }
  if (form.price === "" || !Number.isFinite(price) || price < 0) {
    error.value = "L'importo non è valido.";
    return;
  }
  const link = form.link.trim();
  if (link) {
    try {
      const url = new URL(link);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Invalid protocol.");
      }
    } catch {
      error.value = "Il link non è valido.";
      return;
    }
  }

  error.value = "";
  emit("submit", {
    basis: form.basis,
    price,
    place,
    checkIn: form.checkIn,
    checkOut: form.checkOut,
    link,
  });
}
</script>

<template>
  <FormPanel @submit="submit">
    <BasisToggle v-model="form.basis" />

    <FormField label="Luogo">
      <TextInput v-model="form.place" maxlength="80" placeholder="Quito" required />
    </FormField>

    <FormField label="Link">
      <TextInput v-model="form.link" type="url" maxlength="2000" placeholder="https://…" />
    </FormField>

    <FieldGroup legend="Date">
      <FormField label="Dal">
        <DateInput v-model="form.checkIn" required />
      </FormField>
      <FormField label="Al">
        <DateInput v-model="form.checkOut" :min="form.checkIn || undefined" required />
      </FormField>
    </FieldGroup>

    <FormField :label="form.basis === 'persona' ? 'Prezzo a persona' : 'Prezzo totale'">
      <NumberInput v-model="form.price" min="0" step="0.01" inputmode="decimal" required />
    </FormField>
    <p v-if="preview" class="preview">{{ preview }}</p>
    <p v-if="error" class="banner" role="alert">{{ error }}</p>

    <template #actions>
      <AppButton v-if="showCancel" variant="secondary" @click="emit('cancel')">Annulla</AppButton>
      <AppButton type="submit" :disabled="saving">{{ submitLabel }}</AppButton>
    </template>
  </FormPanel>
</template>

<style scoped>
.preview {
  margin: calc(-1 * var(--space-2)) 0 0;
  color: var(--color-muted);
}

.banner { margin: 0; }
</style>
