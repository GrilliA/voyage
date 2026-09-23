<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { flightTotal, type FlightDetails, type PriceBasis } from "../../../shared/domain";
import { formatMoney, formatPeople } from "../format";

const props = withDefaults(
  defineProps<{
    people: number;
    saving?: boolean;
    submitLabel: string;
    flight?: FlightDetails | null;
    suggestReturn?: boolean;
    showCancel?: boolean;
  }>(),
  { saving: false, flight: null, suggestReturn: false, showCancel: false },
);

const emit = defineEmits<{
  submit: [flight: FlightDetails];
  cancel: [];
}>();

const error = ref("");
const form = reactive<{
  basis: PriceBasis;
  price: string;
  outboundFrom: string;
  outboundTo: string;
  returnFrom: string;
  returnTo: string;
}>({
  basis: "totale",
  price: "",
  outboundFrom: "",
  outboundTo: "",
  returnFrom: "",
  returnTo: "",
});

const preview = computed(() => {
  if (form.price === "") return "";
  const price = Number(form.price);
  if (!Number.isFinite(price) || price < 0) return "";
  const total = flightTotal(price, form.basis, props.people);
  if (form.basis === "persona") {
    return `${formatMoney(price)} × ${formatPeople(props.people)} = ${formatMoney(total)} nel totale`;
  }
  return `${formatMoney(total)} nel totale`;
});

watch(
  () => props.flight,
  (flight) => {
    form.basis = flight?.basis ?? "totale";
    form.price = flight ? String(flight.price) : "";
    form.outboundFrom = flight?.outboundFrom ?? "";
    form.outboundTo = flight?.outboundTo ?? "";
    form.returnFrom = flight?.returnFrom ?? "";
    form.returnTo = flight?.returnTo ?? "";
    error.value = "";
  },
  { immediate: true },
);

function fillReturnTo() {
  if (!props.suggestReturn || form.returnTo.trim()) return;
  form.returnTo = form.outboundFrom.trim();
}

function fillReturnFrom() {
  if (!props.suggestReturn || form.returnFrom.trim()) return;
  form.returnFrom = form.outboundTo.trim();
}

function submit() {
  const outboundFrom = form.outboundFrom.trim();
  const outboundTo = form.outboundTo.trim();
  const returnFrom = form.returnFrom.trim();
  const returnTo = form.returnTo.trim();
  const price = Number(form.price);

  if (!outboundFrom) {
    error.value = "La partenza dell'andata è obbligatoria.";
    return;
  }
  if (!outboundTo) {
    error.value = "L'arrivo dell'andata è obbligatorio.";
    return;
  }
  if (!returnFrom) {
    error.value = "La partenza del ritorno è obbligatoria.";
    return;
  }
  if (!returnTo) {
    error.value = "L'arrivo del ritorno è obbligatorio.";
    return;
  }
  if (form.price === "" || !Number.isFinite(price) || price < 0) {
    error.value = "L'importo non è valido.";
    return;
  }

  error.value = "";
  emit("submit", { basis: form.basis, price, outboundFrom, outboundTo, returnFrom, returnTo });
}
</script>

<template>
  <form class="flight-form" @submit.prevent="submit">
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

    <fieldset class="leg-set">
      <legend>Andata</legend>
      <div class="leg">
        <label class="field">
          Da
          <input
            v-model="form.outboundFrom"
            type="text"
            maxlength="40"
            placeholder="Milano"
            required
            @blur="fillReturnTo"
          />
        </label>
        <label class="field">
          A
          <input
            v-model="form.outboundTo"
            type="text"
            maxlength="40"
            placeholder="Quito"
            required
            @blur="fillReturnFrom"
          />
        </label>
      </div>
    </fieldset>

    <fieldset class="leg-set">
      <legend>Ritorno</legend>
      <div class="leg">
        <label class="field">
          Da
          <input v-model="form.returnFrom" type="text" maxlength="40" placeholder="Quito" required />
        </label>
        <label class="field">
          A
          <input v-model="form.returnTo" type="text" maxlength="40" placeholder="Milano" required />
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
