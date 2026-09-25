<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
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
import NumberInput from "../components/form/NumberInput.vue";
import TextInput from "../components/form/TextInput.vue";
import { formatMoney, formatNights, formatPeople, formatRange, formatStayIssue, formatStayNightLine, routeParam } from "../format";

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
const editingFlightId = ref<string | null>(null);
const editingStayId = ref<string | null>(null);
const newFlightKey = ref(0);
const newStayKey = ref(0);
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
const staySuggestion = computed(() => {
  const trip = proposal.value?.trip;
  const stays = (proposal.value?.lines ?? [])
    .flatMap((line) => (line.stay ? [line.stay] : []))
    .sort((left, right) => left.checkOut.localeCompare(right.checkOut));
  const last = stays[stays.length - 1];
  if (!last) return { checkIn: trip?.startDate ?? "", checkOut: trip?.endDate ?? "" };
  const end = trip?.endDate ?? "";
  return { checkIn: last.checkOut, checkOut: end > last.checkOut ? end : "" };
});
const lodgingPace = computed(() => {
  if (current.value !== "alloggio") return null;
  const lines = currentLines.value;
  if (lines.length === 0 || lines.some((line) => line.stay == null)) return null;
  return averagePerNight(
    lines.flatMap((line) =>
      line.stay ? [{ amount: line.amount, checkIn: line.stay.checkIn, checkOut: line.stay.checkOut }] : [],
    ),
  );
});
const lodgingNotes = computed(() => {
  if (current.value !== "alloggio" || proposal.value == null) return [];
  const stays = currentLines.value.flatMap((line) => (line.stay ? [line.stay] : []));
  return findStayIssues(stays, proposal.value.trip.startDate, proposal.value.trip.endDate).map(formatStayIssue);
});

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

async function addFlight(flight: FlightDetails) {
  if (current.value !== "voli") return;
  actionError.value = "";
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
  actionError.value = "";
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
  actionError.value = "";
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
  actionError.value = "";
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
            @click="current = step.id"
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
              <NumberInput v-model.number="people" min="1" max="99" @change="savePeople" />
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
                  <TextInput v-model="line.label" aria-label="Descrizione" @blur="saveLine(line)" />
                  <NumberInput
                    v-model.number="line.amount"
                    min="0"
                    step="0.01"
                    aria-label="Importo in euro"
                    @blur="saveLine(line)"
                  />
                  <IconButton label="Rimuovi voce" @click="removeLine(line)">×</IconButton>
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
              submit-label="Aggiungi soggiorno"
              :suggest-check-in="staySuggestion.checkIn"
              :suggest-check-out="staySuggestion.checkOut"
              @submit="addStay"
            />
            <form v-else class="add-line" @submit.prevent="addLine">
              <TextInput v-model="draft.label" maxlength="120" placeholder="Descrizione" aria-label="Nuova descrizione" />
              <NumberInput
                v-model="draft.amount"
                min="0"
                step="0.01"
                placeholder="Importo"
                aria-label="Nuovo importo in euro"
              />
              <AppButton type="submit" :disabled="saving">Aggiungi</AppButton>
            </form>
          </template>

          <div class="stage-nav">
            <AppButton v-if="prevStep" variant="secondary" @click="current = prevStep.id">
              Indietro
            </AppButton>
            <span v-else></span>
            <AppButton v-if="nextStep" @click="current = nextStep.id">
              Continua · {{ nextStep.label }}
            </AppButton>
            <AppButton v-else :to="{ name: 'trip', params: { tripId } }">
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
  margin: 0 0 var(--space-6);
  padding: 0 0 var(--space-2);
  border: 0;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  font-family: var(--font-serif);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 560;
  letter-spacing: -0.03em;
}

.title-input:hover,
.title-input:focus {
  border-bottom-color: var(--color-field-border);
  outline: none;
}

.editor {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 230px;
  gap: var(--space-5);
  align-items: start;
}

.steps { display: grid; gap: var(--space-2); }

.step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  text-align: left;
}

.step small { color: var(--color-muted); }
.step.active { background: var(--color-card); box-shadow: var(--shadow-raised); }

.step-index {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-pill);
  background: var(--color-step);
  font-size: var(--text-xs);
}

.step.active .step-index { background: var(--color-accent); color: var(--color-on-accent); }

.stage {
  display: flex;
  flex-direction: column;
  min-height: 460px;
  padding: var(--space-7);
  border-radius: var(--radius-xl);
  background: var(--color-card);
}

.section-subtotal {
  margin: var(--space-3) 0 0;
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 560;
  letter-spacing: -0.03em;
}

.stay-pace {
  margin: var(--space-2) 0 0;
  color: var(--color-muted);
}

.people-field { max-width: 180px; margin-top: var(--space-6); }

.lines { display: grid; gap: var(--space-3); margin: var(--space-6) 0 0; padding: 0; list-style: none; }

.line, .add-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px auto;
  gap: var(--space-2);
}

.add-line { margin-top: var(--space-3); }

.add-form { margin-top: var(--space-6); }

.stay-notes {
  margin: var(--space-4) 0 0;
  padding-left: 1.1rem;
  color: var(--color-muted);
}

.stay-notes li + li { margin-top: var(--space-1); }

.stage-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-7);
}

.summary {
  position: sticky;
  top: var(--space-6);
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  background: var(--color-ink);
  color: var(--color-on-accent);
}

.summary .kicker, .summary-note { color: var(--color-on-dark-muted); }

.summary-total {
  margin: var(--space-2) 0 0;
  font-family: var(--font-serif);
  font-size: 2.3rem;
  font-weight: 560;
  letter-spacing: -0.03em;
  line-height: 1;
}

.summary-person { margin: var(--space-3) 0 0; font-size: 1.05rem; }
.summary-note { margin: var(--space-2) 0 0; }

@media (max-width: 900px) {
  .editor { grid-template-columns: 1fr; }
  .summary { position: static; order: -1; }
  .steps {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding-bottom: var(--space-1);
  }
  .step { width: auto; flex: 0 0 auto; }
  .line, .add-line { grid-template-columns: 1fr; }
}
</style>
