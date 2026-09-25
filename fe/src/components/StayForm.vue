<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  countNights,
  splitMoney,
  totalForBasis,
  type PriceBasis,
  type StayDetails,
} from "../../../shared/domain";
import { formatMoney, formatNights, formatPeople } from "../format";
import { readNumber } from "../readNumber";
import AppButton from "./buttons/AppButton.vue";
import BasisToggle from "./form/BasisToggle.vue";
import DateInput from "./form/DateInput.vue";
import FieldGroup from "./form/FieldGroup.vue";
import FormField from "./form/FormField.vue";
import FormPanel from "./form/FormPanel.vue";
import NumberInput from "./form/NumberInput.vue";
import TextInput from "./form/TextInput.vue";

type StayFormState = {
  basis: PriceBasis;
  price: number | string;
  place: string;
  checkIn: string;
  checkOut: string;
  link: string;
};

const props = withDefaults(
  defineProps<{
    people: number;
    saving: boolean;
    submitLabel: string;
    stay: StayDetails | null;
    suggestCheckIn?: string;
    suggestCheckOut?: string;
    showCancel?: boolean;
  }>(),
  { suggestCheckIn: "", suggestCheckOut: "", showCancel: false },
);

const emit = defineEmits<{
  submit: [stay: StayDetails];
  cancel: [];
}>();

const error = ref<string | null>(null);

function stayForm(stay: StayDetails | null): StayFormState {
  if (stay === null) {
    return {
      basis: "totale",
      price: "",
      place: "",
      checkIn: props.suggestCheckIn,
      checkOut: props.suggestCheckOut,
      link: "",
    };
  }
  return {
    basis: stay.basis,
    price: String(stay.price),
    place: stay.place,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    link: stay.link,
  };
}

const form = ref<StayFormState>(stayForm(props.stay));

const preview = computed(() => {
  const price = readNumber(form.value.price);
  if (price === null || price < 0) return "";
  const total = totalForBasis(price, form.value.basis, props.people);
  const nights = countNights(form.value.checkIn, form.value.checkOut);
  const nightly = nights === null ? null : splitMoney(total, nights);
  const nightlyPerson = nights === null ? null : splitMoney(total, nights * props.people);

  if (form.value.basis === "persona") {
    const peoplePart = `${formatMoney(price)} × ${formatPeople(props.people)} = ${formatMoney(total)} nel totale`;
    if (nights === null || nightlyPerson === null) return peoplePart;
    return `${formatNights(nights)} · ${peoplePart} · ${formatMoney(nightlyPerson)} a notte a persona`;
  }

  if (nights === null || nightly === null) return `${formatMoney(total)} nel totale`;
  return `${formatNights(nights)} · ${formatMoney(nightly)} a notte · ${formatMoney(total)} nel totale`;
});

watch(
  () => props.stay,
  (stay) => {
    form.value = stayForm(stay);
    error.value = null;
  },
);

watch(
  () => [props.suggestCheckIn, props.suggestCheckOut],
  (next, previous) => {
    if (props.stay !== null) return;
    const nextCheckIn = pairAt(next, 0);
    const nextCheckOut = pairAt(next, 1);
    const previousCheckIn = pairAt(previous, 0);
    const previousCheckOut = pairAt(previous, 1);
    if (form.value.checkIn !== previousCheckIn || form.value.checkOut !== previousCheckOut) return;
    if (form.value.checkIn !== nextCheckIn) form.value.checkIn = nextCheckIn;
    if (form.value.checkOut !== nextCheckOut) form.value.checkOut = nextCheckOut;
  },
);

function isHttpLink(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function pairAt(pair: readonly string[] | undefined, index: number): string {
  if (pair === undefined) return "";
  const value = pair[index];
  if (value === undefined) return "";
  return value;
}

function submit() {
  const place = form.value.place.trim();
  const price = readNumber(form.value.price);

  if (!place) {
    error.value = "Il luogo è obbligatorio.";
    return;
  }
  if (!form.value.checkIn) {
    error.value = "La data di arrivo è obbligatoria.";
    return;
  }
  if (!form.value.checkOut) {
    error.value = "La data di uscita è obbligatoria.";
    return;
  }
  if (form.value.checkOut <= form.value.checkIn) {
    error.value = "Il soggiorno deve durare almeno una notte.";
    return;
  }
  if (price === null || price < 0) {
    error.value = "L'importo non è valido.";
    return;
  }
  const link = form.value.link.trim();
  if (link && !isHttpLink(link)) {
    error.value = "Il link non è valido.";
    return;
  }

  error.value = null;
  emit("submit", {
    basis: form.value.basis,
    price,
    place,
    checkIn: form.value.checkIn,
    checkOut: form.value.checkOut,
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
        <DateInput v-model="form.checkOut" :min="form.checkIn" required />
      </FormField>
    </FieldGroup>

    <FormField :label="form.basis === 'persona' ? 'Prezzo a persona' : 'Prezzo totale'">
      <NumberInput v-model="form.price" min="0" step="0.01" required />
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
  margin: 0;
  color: var(--color-muted);
}

.banner { margin: 0; }
</style>
