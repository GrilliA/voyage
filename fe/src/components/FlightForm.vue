<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { totalForBasis, type FlightDetails, type PriceBasis } from "../../../shared/domain";
import { formatMoney, formatPeople } from "../format";
import AppButton from "./buttons/AppButton.vue";
import BasisToggle from "./form/BasisToggle.vue";
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
  const total = totalForBasis(price, form.basis, props.people);
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
