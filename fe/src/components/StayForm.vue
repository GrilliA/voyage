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
}>({
  basis: "totale",
  price: "",
  place: "",
  checkIn: "",
  checkOut: "",
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

  error.value = "";
  emit("submit", { basis: form.basis, price, place, checkIn: form.checkIn, checkOut: form.checkOut });
}
</script>

<template>
  <form class="stay-form" @submit.prevent="submit">
    <div class="basis" role="radiogroup" aria-label="Il prezzo è">
      <button
        type="button"
        role="radio"
        :aria-checked="form.basis === 'totale'"
        :class="{ active: form.basis === 'totale' }"
        @click="form.basis = 'totale'"
      >
        Totale
      </button>
      <button
        type="button"
        role="radio"
        :aria-checked="form.basis === 'persona'"
        :class="{ active: form.basis === 'persona' }"
        @click="form.basis = 'persona'"
      >
        A persona
      </button>
    </div>

    <label class="field">
      Luogo
      <input v-model="form.place" type="text" maxlength="80" placeholder="Quito" required />
    </label>

    <fieldset class="leg-set">
      <legend>Date</legend>
      <div class="leg">
        <label class="field">
          Dal
          <input v-model="form.checkIn" type="date" required />
        </label>
        <label class="field">
          Al
          <input v-model="form.checkOut" type="date" :min="form.checkIn || undefined" required />
        </label>
      </div>
    </fieldset>

    <label class="field">
      {{ form.basis === "persona" ? "Prezzo a persona" : "Prezzo totale" }}
      <input v-model="form.price" type="number" min="0" step="0.01" inputmode="decimal" required />
    </label>
    <p v-if="preview" class="flight-preview">{{ preview }}</p>
    <p v-if="error" class="banner" role="alert">{{ error }}</p>

    <div class="flight-actions">
      <button v-if="showCancel" class="button secondary" type="button" @click="emit('cancel')">Annulla</button>
      <button class="button" type="submit" :disabled="saving">{{ submitLabel }}</button>
    </div>
  </form>
</template>
