<script setup lang="ts">
import { ref, watch } from "vue";
import NumberInput from "./NumberInput.vue";
import TextInput from "./TextInput.vue";

const props = defineProps<{
  label: string;
  amount: number;
}>();

const emit = defineEmits<{
  save: [payload: { label: string; amount: number | string }];
}>();

const label = ref(props.label);
const amount = ref<number | string>(String(props.amount));

watch(
  () => props.label,
  (value) => {
    label.value = value;
  },
);

watch(
  () => props.amount,
  (value) => {
    amount.value = String(value);
  },
);

function save() {
  emit("save", { label: label.value, amount: amount.value });
}
</script>

<template>
  <TextInput v-model="label" aria-label="Descrizione" @blur="save" />
  <NumberInput v-model="amount" min="0" step="0.01" aria-label="Importo in euro" @blur="save" />
</template>
