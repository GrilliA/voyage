<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { totalForBasis, type FlightDetails, type PriceBasis } from "../../../shared/domain";
import { formatMoney, formatPeople } from "../format";
import { readNumber } from "../readNumber";
import AppButton from "./buttons/AppButton.vue";
import BasisToggle from "./form/BasisToggle.vue";
import FieldGroup from "./form/FieldGroup.vue";
import FormField from "./form/FormField.vue";
import FormPanel from "./form/FormPanel.vue";
import NumberInput from "./form/NumberInput.vue";
import TextInput from "./form/TextInput.vue";

type FlightFormState = {
  basis: PriceBasis;
  price: number | string;
  outboundFrom: string;
  outboundTo: string;
  returnFrom: string;
  returnTo: string;
};

const props = withDefaults(
  defineProps<{
    people: number;
    saving: boolean;
    submitLabel: string;
    flight: FlightDetails | null;
    suggestReturn?: boolean;
    showCancel?: boolean;
  }>(),
  { suggestReturn: false, showCancel: false },
);

const emit = defineEmits<{
  submit: [flight: FlightDetails];
  cancel: [];
}>();

const error = ref<string | null>(null);

function emptyFlight(): FlightFormState {
  return {
    basis: "totale",
    price: "",
    outboundFrom: "",
    outboundTo: "",
    returnFrom: "",
    returnTo: "",
  };
}

function flightForm(flight: FlightDetails | null): FlightFormState {
  if (flight === null) return emptyFlight();
  return {
    basis: flight.basis,
    price: String(flight.price),
    outboundFrom: flight.outboundFrom,
    outboundTo: flight.outboundTo,
    returnFrom: flight.returnFrom,
    returnTo: flight.returnTo,
  };
}

const form = ref<FlightFormState>(flightForm(props.flight));

const preview = computed(() => {
  const price = readNumber(form.value.price);
  if (price === null || price < 0) return "";
  const total = totalForBasis(price, form.value.basis, props.people);
  if (form.value.basis === "persona") {
    return `${formatMoney(price)} × ${formatPeople(props.people)} = ${formatMoney(total)} nel totale`;
  }
  return `${formatMoney(total)} nel totale`;
});

watch(
  () => props.flight,
  (flight) => {
    form.value = flightForm(flight);
    error.value = null;
  },
);

function fillReturnTo() {
  if (!props.suggestReturn || form.value.returnTo.trim()) return;
  form.value.returnTo = form.value.outboundFrom.trim();
}

function fillReturnFrom() {
  if (!props.suggestReturn || form.value.returnFrom.trim()) return;
  form.value.returnFrom = form.value.outboundTo.trim();
}

function submit() {
  const outboundFrom = form.value.outboundFrom.trim();
  const outboundTo = form.value.outboundTo.trim();
  const returnFrom = form.value.returnFrom.trim();
  const returnTo = form.value.returnTo.trim();
  const price = readNumber(form.value.price);

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
  if (price === null || price < 0) {
    error.value = "L'importo non è valido.";
    return;
  }

  error.value = null;
  emit("submit", { basis: form.value.basis, price, outboundFrom, outboundTo, returnFrom, returnTo });
}
</script>

<template>
  <FormPanel @submit="submit">
    <BasisToggle v-model="form.basis" />

    <FieldGroup legend="Andata">
      <FormField label="Da">
        <TextInput v-model="form.outboundFrom" maxlength="40" placeholder="Milano" required @blur="fillReturnTo" />
      </FormField>
      <FormField label="A">
        <TextInput v-model="form.outboundTo" maxlength="40" placeholder="Quito" required @blur="fillReturnFrom" />
      </FormField>
    </FieldGroup>

    <FieldGroup legend="Ritorno">
      <FormField label="Da">
        <TextInput v-model="form.returnFrom" maxlength="40" placeholder="Quito" required />
      </FormField>
      <FormField label="A">
        <TextInput v-model="form.returnTo" maxlength="40" placeholder="Milano" required />
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
