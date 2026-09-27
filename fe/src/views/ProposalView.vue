<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { averagePerNight, findStayIssues } from "../../../shared/domain";
import { api, errorMessage } from "../api/client";
import type { CostLine, FlightDetails, ProposalDetail, StayDetails, StepId } from "../api/types";
import FlightForm from "../components/FlightForm.vue";
import StayForm from "../components/StayForm.vue";
import AppButton from "../components/buttons/AppButton.vue";
import IconButton from "../components/buttons/IconButton.vue";
import CostLineCard from "../components/cards/CostLineCard.vue";
import CostLineRow from "../components/cards/CostLineRow.vue";
import FormField from "../components/form/FormField.vue";
import LineFields from "../components/form/LineFields.vue";
import NumberInput from "../components/form/NumberInput.vue";
import TextInput from "../components/form/TextInput.vue";
import { formatMoney, formatNights, formatPeople, formatRange, formatStayIssue, formatStayNightLine, routeParam } from "../format";
import { readNumber } from "../readNumber";

type EditorStep = {
  id: StepId;
  label: string;
  hint: string;
};

type LineDraft = {
  label: string;
  amount: number | string;
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
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const title = ref("");
const people = ref<number | string>("2");
const current = ref<StepId>("persone");
const confirmingDelete = ref(false);
const saving = ref(false);
const editingFlightId = ref<string | null>(null);
const editingStayId = ref<string | null>(null);
const newFlightKey = ref(0);
const newStayKey = ref(0);
const draft = ref<LineDraft>({ label: "", amount: "" });

const tripId = computed(() => routeParam(route.params.tripId));
const proposalId = computed(() => routeParam(route.params.proposalId));
const steps = computed<EditorStep[]>(() => {
  const detail = proposal.value;
  if (detail === null) return [PERSONE];
  return [PERSONE, ...detail.sections];
});
const stepIndex = computed(() => {
  const index = steps.value.findIndex((step) => step.id === current.value);
  return index < 0 ? 0 : index;
});
const currentStep = computed(() => stepAt(stepIndex.value) ?? PERSONE);
const prevStep = computed(() => stepAt(stepIndex.value - 1));
const nextStep = computed(() => stepAt(stepIndex.value + 1));
const currentLines = computed(() => {
  const detail = proposal.value;
  if (detail === null) return [];
  return detail.lines.filter((line) => line.category === current.value);
});
const staySuggestion = computed(() => {
  const detail = proposal.value;
  if (detail === null) return { checkIn: "", checkOut: "" };
  const stays = detail.lines
    .flatMap((line) => (line.stay === null ? [] : [line.stay]))
    .sort((left, right) => left.checkOut.localeCompare(right.checkOut));
  const last = stays[stays.length - 1];
  if (last === undefined) return { checkIn: detail.trip.startDate, checkOut: detail.trip.endDate };
  const end = detail.trip.endDate;
  return { checkIn: last.checkOut, checkOut: end > last.checkOut ? end : "" };
});
const lodgingPace = computed(() => {
  if (current.value !== "alloggio") return null;
  const lines = currentLines.value;
  if (lines.length === 0 || lines.some((line) => line.stay === null)) return null;
  return averagePerNight(
    lines.flatMap((line) => {
      if (line.stay === null) return [];
      return [{ amount: line.amount, checkIn: line.stay.checkIn, checkOut: line.stay.checkOut }];
    }),
  );
});
const lodgingNotes = computed(() => {
  const detail = proposal.value;
  if (current.value !== "alloggio" || detail === null) return [];
  const stays = currentLines.value.flatMap((line) => (line.stay === null ? [] : [line.stay]));
  return findStayIssues(stays, detail.trip.startDate, detail.trip.endDate).map(formatStayIssue);
});

function stepAt(index: number): EditorStep | null {
  if (index < 0 || index >= steps.value.length) return null;
  const step = steps.value[index];
  if (step === undefined) return null;
  return step;
}

function showStep(step: EditorStep) {
  current.value = step.id;
}

function sectionAmount(stepId: StepId): number {
  const detail = proposal.value;
  if (stepId === "persone" || detail === null) return 0;
  return detail.totals.byCategory[stepId];
}

function blurOnEnter(event: KeyboardEvent) {
  if (event.target instanceof HTMLElement) event.target.blur();
}

async function load() {
  const first = proposal.value === null;
  if (first) loading.value = true;
  try {
    const detail = await api.getProposal(tripId.value, proposalId.value);
    proposal.value = detail;
    title.value = detail.title;
    people.value = String(detail.trip.people);
    document.title = `${detail.title} · ${detail.trip.title}`;
    loadError.value = null;
  } catch (caught) {
    if (first) loadError.value = errorMessage(caught);
    else actionError.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

async function saveTitle() {
  const next = title.value.trim();
  const detail = proposal.value;
  if (detail === null) return;
  if (!next || next === detail.title) {
    title.value = detail.title;
    return;
  }
  try {
    proposal.value = await api.updateProposal(tripId.value, proposalId.value, { title: next });
    title.value = proposal.value.title;
    document.title = `${title.value} · ${proposal.value.trip.title}`;
    actionError.value = null;
  } catch (caught) {
    actionError.value = errorMessage(caught);
    title.value = detail.title;
  }
}

async function savePeople() {
  const detail = proposal.value;
  if (detail === null) return;
  const count = readNumber(people.value);
  if (count === null || !Number.isInteger(count) || count < 1 || count > 99) {
    actionError.value = "Le persone devono essere un numero da 1 a 99.";
    people.value = String(detail.trip.people);
    return;
  }
  if (count === detail.trip.people) return;
  try {
    await api.updateTrip(tripId.value, { people: count });
    await load();
    actionError.value = null;
  } catch (caught) {
    actionError.value = errorMessage(caught);
    await load();
  }
}

async function addFlight(flight: FlightDetails) {
  if (current.value !== "voli") return;
  actionError.value = null;
  saving.value = true;
  try {
    proposal.value = await api.addLine(tripId.value, proposalId.value, { category: "voli", ...flight });
    newFlightKey.value += 1;
    editingFlightId.value = null;
  } catch (caught) {
    actionError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

async function updateFlight(line: CostLine, flight: FlightDetails) {
  actionError.value = null;
  saving.value = true;
  try {
    proposal.value = await api.updateLine(tripId.value, proposalId.value, line.id, flight);
    editingFlightId.value = null;
  } catch (caught) {
    actionError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

async function addStay(stay: StayDetails) {
  if (current.value !== "alloggio") return;
  actionError.value = null;
  saving.value = true;
  try {
    proposal.value = await api.addLine(tripId.value, proposalId.value, { category: "alloggio", ...stay });
    newStayKey.value += 1;
    editingStayId.value = null;
  } catch (caught) {
    actionError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

async function updateStay(line: CostLine, stay: StayDetails) {
  actionError.value = null;
  saving.value = true;
  try {
    proposal.value = await api.updateLine(tripId.value, proposalId.value, line.id, stay);
    editingStayId.value = null;
  } catch (caught) {
    actionError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

async function addLine() {
  actionError.value = null;
  const label = draft.value.label.trim();
  const amount = readNumber(draft.value.amount);
  if (!label) {
    actionError.value = "La descrizione è obbligatoria.";
    return;
  }
  if (amount === null || amount < 0) {
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
    draft.value = { label: "", amount: "" };
  } catch (caught) {
    actionError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

async function saveLine(line: CostLine, payload: LineDraft) {
  const label = payload.label.trim();
  const amount = readNumber(payload.amount);
  if (!label || amount === null || amount < 0) {
    actionError.value = "Descrizione e importo non sono validi.";
    return;
  }
  if (label === line.label && amount === line.amount) {
    actionError.value = null;
    return;
  }
  try {
    proposal.value = await api.updateLine(tripId.value, proposalId.value, line.id, { label, amount });
    actionError.value = null;
  } catch (caught) {
    actionError.value = errorMessage(caught);
    await load();
  }
}

async function removeLine(line: CostLine) {
  try {
    proposal.value = await api.deleteLine(tripId.value, proposalId.value, line.id);
    actionError.value = null;
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
    editingFlightId.value = null;
    editingStayId.value = null;
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
        <AppButton variant="ghost-danger" @click="confirmingDelete = true">Elimina</AppButton>
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
          <AppButton variant="ghost" @click="confirmingDelete = false">Annulla</AppButton>
          <AppButton variant="danger" :disabled="saving" @click="removeProposal">Elimina</AppButton>
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
            @click="showStep(step)"
          >
            <span class="step-index">{{ index + 1 }}</span>
            <span>{{ step.label }}</span>
            <small v-if="step.id === 'persone'">{{ people }}</small>
            <small v-else-if="sectionAmount(step.id)">{{ formatMoney(sectionAmount(step.id)) }}</small>
          </button>
        </nav>

        <section class="stage">
          <p class="kicker">{{ stepIndex + 1 }} / {{ steps.length }}</p>
          <h2>{{ currentStep.label }}</h2>
          <p class="lede">{{ currentStep.hint }}</p>
          <p v-if="currentStep.id !== 'persone'" class="section-subtotal">
            {{ formatMoney(sectionAmount(currentStep.id)) }}
          </p>
          <p v-if="lodgingPace" class="stay-pace">
            {{ formatNights(lodgingPace.nights) }} · {{ formatMoney(lodgingPace.perNight) }} a notte
          </p>

          <div v-if="currentStep.id === 'persone'" class="people-field">
            <FormField label="Persone">
              <NumberInput v-model="people" min="1" max="99" @change="savePeople" />
            </FormField>
          </div>
          <template v-else>
            <ul v-if="currentLines.length" class="lines">
              <li v-for="line in currentLines" :key="line.id">
                <StayForm
                  v-if="line.stay && editingStayId === line.id"
                  :people="proposal.trip.people"
                  :saving="saving"
                  :stay="line.stay"
                  submit-label="Salva"
                  show-cancel
                  @submit="updateStay(line, $event)"
                  @cancel="editingStayId = null"
                />
                <CostLineCard v-else-if="line.stay">
                  <CostLineRow label="Luogo">{{ line.stay.place }}</CostLineRow>
                  <CostLineRow label="Date">{{ formatRange(line.stay.checkIn, line.stay.checkOut) }}</CostLineRow>
                  <CostLineRow v-if="line.stay.link" label="Link">
                    <a :href="line.stay.link" target="_blank" rel="noopener noreferrer">Apri</a>
                  </CostLineRow>
                  <template #price>
                    <template v-if="line.stay.basis === 'persona'">
                      {{ formatMoney(line.stay.price) }} a persona
                      <small>{{ formatMoney(line.amount) }} nel totale</small>
                    </template>
                    <template v-else>{{ formatMoney(line.amount) }} totale</template>
                    <small>{{ formatStayNightLine(line.amount, line.stay.checkIn, line.stay.checkOut) }}</small>
                  </template>
                  <template #actions>
                    <AppButton variant="ghost" @click="editingStayId = line.id">Modifica</AppButton>
                    <IconButton label="Rimuovi soggiorno" @click="removeLine(line)">×</IconButton>
                  </template>
                </CostLineCard>
                <FlightForm
                  v-else-if="line.flight && editingFlightId === line.id"
                  :people="proposal.trip.people"
                  :saving="saving"
                  :flight="line.flight"
                  submit-label="Salva"
                  show-cancel
                  @submit="updateFlight(line, $event)"
                  @cancel="editingFlightId = null"
                />
                <CostLineCard v-else-if="line.flight">
                  <CostLineRow label="Andata">{{ line.flight.outboundFrom }} → {{ line.flight.outboundTo }}</CostLineRow>
                  <CostLineRow label="Ritorno">{{ line.flight.returnFrom }} → {{ line.flight.returnTo }}</CostLineRow>
                  <template #price>
                    <template v-if="line.flight.basis === 'persona'">
                      {{ formatMoney(line.flight.price) }} a persona
                      <small>{{ formatMoney(line.amount) }} nel totale</small>
                    </template>
                    <template v-else>{{ formatMoney(line.amount) }} totale</template>
                  </template>
                  <template #actions>
                    <AppButton variant="ghost" @click="editingFlightId = line.id">Modifica</AppButton>
                    <IconButton label="Rimuovi volo" @click="removeLine(line)">×</IconButton>
                  </template>
                </CostLineCard>
                <div v-else class="line">
                  <LineFields :label="line.label" :amount="line.amount" @save="saveLine(line, $event)" />
                  <IconButton class="line-remove" label="Rimuovi voce" @click="removeLine(line)">×</IconButton>
                </div>
              </li>
            </ul>
            <ul v-if="lodgingNotes.length" class="stay-notes">
              <li v-for="note in lodgingNotes" :key="note">{{ note }}</li>
            </ul>
            <FlightForm
              v-if="currentStep.id === 'voli'"
              :key="newFlightKey"
              class="add-form"
              :people="proposal.trip.people"
              :saving="saving"
              :flight="null"
              submit-label="Aggiungi volo"
              suggest-return
              @submit="addFlight"
            />
            <StayForm
              v-else-if="currentStep.id === 'alloggio'"
              :key="newStayKey"
              class="add-form"
              :people="proposal.trip.people"
              :saving="saving"
              :stay="null"
              submit-label="Aggiungi soggiorno"
              :suggest-check-in="staySuggestion.checkIn"
              :suggest-check-out="staySuggestion.checkOut"
              @submit="addStay"
            />
            <form v-else class="add-line" @submit.prevent="addLine">
              <TextInput v-model="draft.label" maxlength="120" placeholder="Descrizione" aria-label="Nuova descrizione" />
              <NumberInput v-model="draft.amount" min="0" step="0.01" placeholder="Importo" aria-label="Nuovo importo in euro" />
              <AppButton type="submit" :disabled="saving">Aggiungi</AppButton>
            </form>
          </template>

          <div class="stage-nav">
            <AppButton v-if="prevStep" variant="secondary" @click="showStep(prevStep)">Indietro</AppButton>
            <AppButton v-if="nextStep" class="stage-forward" @click="showStep(nextStep)">
              Continua · {{ nextStep.label }}
            </AppButton>
            <AppButton v-else class="stage-forward" :to="{ name: 'trip', params: { tripId } }">
              Vedi le proposte
            </AppButton>
          </div>
        </section>

        <aside class="summary" aria-live="polite">
          <p class="kicker">Totale</p>
          <p class="summary-total">{{ formatMoney(proposal.totals.total) }}</p>
          <p class="summary-person">{{ formatMoney(proposal.totals.perPerson) }} a persona</p>
          <p class="summary-note">{{ formatPeople(proposal.trip.people) }}</p>
        </aside>
      </div>
    </template>
  </main>
</template>

<style scoped>
.title-input {
  width: 100%;
  margin: 0 0 var(--space-5);
  padding: 0 0 var(--space-2);
  border: 0;
  border-bottom: var(--border-width) solid transparent;
  border-radius: 0;
  background: transparent;
  font-family: var(--font-serif);
  font-size: var(--text-title);
  font-weight: 560;
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
}

.title-input:hover,
.title-input:focus {
  border-bottom-color: var(--color-field-border);
  outline: none;
}

.editor {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
  align-items: start;
}

.summary { order: -1; }

.steps {
  display: flex;
  gap: var(--space-2);
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: var(--space-1);
  scroll-snap-type: x proximity;
}

.step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
  flex: 0 0 auto;
  width: auto;
  min-height: var(--size-control);
  padding: var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  text-align: left;
  scroll-snap-align: start;
}

.step small { color: var(--color-muted); }
.step.active { background: var(--color-card); box-shadow: var(--shadow-raised); }

.step-index {
  display: grid;
  place-items: center;
  width: var(--size-step);
  height: var(--size-step);
  border-radius: var(--radius-pill);
  background: var(--color-step);
  font-size: var(--text-xs);
}

.step.active .step-index { background: var(--color-accent); color: var(--color-on-accent); }

.stage {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--color-card);
}

.section-subtotal {
  margin: var(--space-3) 0 0;
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: 560;
  letter-spacing: var(--tracking-tight);
}

.stay-pace {
  margin: var(--space-2) 0 0;
  color: var(--color-muted);
}

.people-field { margin-top: var(--space-6); }

.lines { display: grid; gap: var(--space-3); margin: var(--space-6) 0 0; padding: 0; list-style: none; }

.line, .add-line {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-2);
}

.line-remove { justify-self: start; }

.add-line { margin-top: var(--space-3); }

.add-form { margin-top: var(--space-6); }

.stay-notes {
  margin: var(--space-4) 0 0;
  padding-left: var(--space-5);
  color: var(--color-muted);
}

.stay-notes li + li { margin-top: var(--space-1); }

.stage-nav {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-6);
}

.summary {
  position: static;
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--color-ink);
  color: var(--color-on-accent);
}

.summary .kicker, .summary-note { color: var(--color-on-dark-muted); }

.summary-total {
  margin: var(--space-2) 0 0;
  font-family: var(--font-serif);
  font-size: var(--text-4xl);
  font-weight: 560;
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-none);
}

.summary-person { margin: var(--space-3) 0 0; font-size: var(--text-md); }
.summary-note { margin: var(--space-2) 0 0; }

@media (min-width: 40rem) {
  .people-field { max-width: var(--size-people); }

  .stage { padding: var(--space-7); }

  .line, .add-line {
    grid-template-columns: minmax(0, 1fr) var(--size-amount) auto;
    align-items: center;
  }

  .summary { padding: var(--space-6); }

  .stage-nav {
    flex-direction: row;
    align-items: center;
  }

  .stage-forward { margin-left: auto; }
}

@media (min-width: 56rem) {
  .editor { grid-template-columns: var(--size-sidebar) minmax(0, 1fr) var(--size-sidebar); }

  .summary {
    position: sticky;
    top: var(--space-6);
    order: 0;
  }

  .steps {
    display: grid;
    overflow: visible;
    padding-bottom: 0;
  }

  .step { width: 100%; }

  .stage { min-height: var(--size-stage); }

  .stage-nav { padding-top: var(--space-7); }
}
</style>
