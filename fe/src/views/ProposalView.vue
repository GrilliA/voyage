<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, errorMessage } from "../api/client";
import type { CostLine, ProposalDetail, StepId } from "../api/types";
import { formatMoney, formatPeople, routeParam } from "../format";

type EditorStep = {
  id: StepId;
  label: string;
  hint: string;
};

const PERSONE: EditorStep = {
  id: "persone",
  label: "Persone",
  hint: "Quante persone dividono il costo. Vale per tutte le proposte di questo viaggio.",
};

const route = useRoute();
const router = useRouter();
const proposal = ref<ProposalDetail | null>(null);
const loading = ref(true);
const loadError = ref("");
const actionError = ref("");
const title = ref("");
const people = ref(2);
const current = ref<StepId>("persone");
const confirmingDelete = ref(false);
const saving = ref(false);
const draft = reactive({ label: "", amount: "" });

const tripId = computed(() => routeParam(route.params.tripId));
const proposalId = computed(() => routeParam(route.params.proposalId));
const steps = computed<EditorStep[]>(() => [PERSONE, ...(proposal.value?.sections ?? [])]);
const stepIndex = computed(() => Math.max(steps.value.findIndex((step) => step.id === current.value), 0));
const currentStep = computed(() => steps.value[stepIndex.value] ?? PERSONE);
const prevStep = computed(() => steps.value[stepIndex.value - 1] ?? null);
const nextStep = computed(() => steps.value[stepIndex.value + 1] ?? null);
const currentLines = computed(() =>
  (proposal.value?.lines ?? []).filter((line) => line.category === current.value),
);

function sectionAmount(stepId: StepId): number {
  if (stepId === "persone" || proposal.value == null) return 0;
  return proposal.value.totals.byCategory[stepId];
}

function blurOnEnter(event: KeyboardEvent) {
  if (event.target instanceof HTMLElement) event.target.blur();
}

async function load() {
  const first = !proposal.value;
  if (first) loading.value = true;
  try {
    const data = await api.getProposal(tripId.value, proposalId.value);
    proposal.value = data;
    title.value = data.title;
    people.value = data.trip.people;
    document.title = `${data.title} · ${data.trip.title}`;
    loadError.value = "";
  } catch (caught) {
    if (first) loadError.value = errorMessage(caught);
    else actionError.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

async function saveTitle() {
  const next = title.value.trim();
  if (!proposal.value) return;
  if (!next || next === proposal.value.title) {
    title.value = proposal.value.title;
    return;
  }
  try {
    proposal.value = await api.updateProposal(tripId.value, proposalId.value, { title: next });
    title.value = proposal.value.title;
    document.title = `${title.value} · ${proposal.value.trip.title}`;
    actionError.value = "";
  } catch (caught) {
    actionError.value = errorMessage(caught);
    title.value = proposal.value.title;
  }
}

async function savePeople() {
  if (!proposal.value) return;
  const count = Number(people.value);
  if (!Number.isInteger(count) || count < 1 || count > 99) {
    actionError.value = "Le persone devono essere un numero da 1 a 99.";
    people.value = proposal.value.trip.people;
    return;
  }
  if (count === proposal.value.trip.people) return;
  try {
    await api.updateTrip(tripId.value, { people: count });
    await load();
    actionError.value = "";
  } catch (caught) {
    actionError.value = errorMessage(caught);
    await load();
  }
}

async function addLine() {
  actionError.value = "";
  const label = draft.label.trim();
  const amount = Number(draft.amount);
  if (!label) {
    actionError.value = "La descrizione è obbligatoria.";
    return;
  }
  if (draft.amount === "" || !Number.isFinite(amount) || amount < 0) {
    actionError.value = "L'importo non è valido.";
    return;
  }
  if (current.value === "persone") return;
  saving.value = true;
  try {
    proposal.value = await api.addLine(tripId.value, proposalId.value, {
      category: current.value,
      label,
      amount,
    });
    draft.label = "";
    draft.amount = "";
  } catch (caught) {
    actionError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

async function saveLine(line: CostLine) {
  const label = line.label.trim();
  const amount = Number(line.amount);
  if (!label || !Number.isFinite(amount) || amount < 0) {
    actionError.value = "Descrizione e importo non sono validi.";
    await load();
    return;
  }
  try {
    proposal.value = await api.updateLine(tripId.value, proposalId.value, line.id, { label, amount });
    actionError.value = "";
  } catch (caught) {
    actionError.value = errorMessage(caught);
    await load();
  }
}

async function removeLine(line: CostLine) {
  try {
    proposal.value = await api.deleteLine(tripId.value, proposalId.value, line.id);
    actionError.value = "";
  } catch (caught) {
    actionError.value = errorMessage(caught);
  }
}

async function removeProposal() {
  saving.value = true;
  try {
    await api.deleteProposal(tripId.value, proposalId.value);
    await router.push({ name: "trip", params: { tripId: tripId.value } });
  } catch (caught) {
    actionError.value = errorMessage(caught);
    saving.value = false;
  }
}

watch(
  () => [route.params.tripId, route.params.proposalId],
  () => {
    proposal.value = null;
    current.value = "persone";
    confirmingDelete.value = false;
    load();
  },
  { immediate: true },
);
</script>

<template>
  <main class="page">
    <p v-if="loading" class="empty">Caricamento…</p>
    <template v-else-if="loadError">
      <RouterLink class="back" :to="{ name: 'trip', params: { tripId } }">← Viaggio</RouterLink>
      <p class="banner" role="alert">{{ loadError }}</p>
    </template>
    <template v-else-if="proposal">
      <header class="topbar">
        <RouterLink class="back" :to="{ name: 'trip', params: { tripId } }">← {{ proposal.trip.title }}</RouterLink>
        <button class="button ghost danger" type="button" @click="confirmingDelete = true">Elimina</button>
      </header>

      <input
        v-model="title"
        class="title-input"
        type="text"
        maxlength="80"
        aria-label="Titolo della proposta"
        @blur="saveTitle"
        @keydown.enter.prevent="blurOnEnter"
      />

      <p v-if="actionError" class="banner" role="alert">{{ actionError }}</p>
      <div v-if="confirmingDelete" class="banner quiet">
        <span>Eliminare questa proposta?</span>
        <span class="actions">
          <button class="button ghost" type="button" @click="confirmingDelete = false">Annulla</button>
          <button class="button danger" type="button" :disabled="saving" @click="removeProposal">Elimina</button>
        </span>
      </div>

      <div class="editor">
        <nav class="steps" aria-label="Sezioni">
          <button
            v-for="(step, index) in steps"
            :key="step.id"
            class="step"
            :class="{ active: step.id === current }"
            type="button"
            @click="current = step.id"
          >
            <span class="step-index">{{ index + 1 }}</span>
            <span>{{ step.label }}</span>
            <small v-if="step.id === 'persone'">{{ people }}</small>
            <small v-else-if="sectionAmount(step.id)">{{ formatMoney(sectionAmount(step.id)) }}</small>
          </button>
        </nav>

        <section class="stage">
          <p class="step-count">{{ stepIndex + 1 }} / {{ steps.length }}</p>
          <h2>{{ currentStep.label }}</h2>
          <p class="lede">{{ currentStep.hint }}</p>
          <p v-if="currentStep.id !== 'persone'" class="section-subtotal">
            {{ formatMoney(sectionAmount(currentStep.id)) }}
          </p>

          <div v-if="currentStep.id === 'persone'" class="people-field">
            <label class="field">
              Persone
              <input v-model.number="people" type="number" min="1" max="99" @change="savePeople" />
            </label>
          </div>
          <template v-else>
            <ul class="lines">
              <li v-for="line in currentLines" :key="line.id" class="line">
                <input v-model="line.label" type="text" aria-label="Descrizione" @blur="saveLine(line)" />
                <input
                  v-model.number="line.amount"
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Importo in euro"
                  @blur="saveLine(line)"
                />
                <button class="icon-button" type="button" aria-label="Rimuovi voce" @click="removeLine(line)">×</button>
              </li>
            </ul>
            <form class="add-line" @submit.prevent="addLine">
              <input v-model="draft.label" type="text" maxlength="120" placeholder="Descrizione" aria-label="Nuova descrizione" />
              <input
                v-model="draft.amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Importo"
                aria-label="Nuovo importo in euro"
              />
              <button class="button" type="submit" :disabled="saving">Aggiungi</button>
            </form>
          </template>

          <div class="stage-nav">
            <button v-if="prevStep" class="button secondary" type="button" @click="current = prevStep.id">
              Indietro
            </button>
            <span v-else></span>
            <button v-if="nextStep" class="button" type="button" @click="current = nextStep.id">
              Continua · {{ nextStep.label }}
            </button>
            <RouterLink v-else class="button" :to="{ name: 'trip', params: { tripId } }">
              Vedi le proposte
            </RouterLink>
          </div>
        </section>

        <aside class="summary" aria-live="polite">
          <p class="summary-kicker">Totale</p>
          <p class="summary-total">{{ formatMoney(proposal.totals.total) }}</p>
          <p class="summary-person">{{ formatMoney(proposal.totals.perPerson) }} a persona</p>
          <p class="summary-note">{{ formatPeople(proposal.trip.people) }}</p>
        </aside>
      </div>
    </template>
  </main>
</template>
