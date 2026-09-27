<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, errorMessage } from "../api/client";
import type { TripDetail, TripInput } from "../api/types";
import { formatPeople, formatRange, routeParam, stripColor } from "../format";
import AppButton from "../components/buttons/AppButton.vue";
import AppCard from "../components/cards/AppCard.vue";
import FormField from "../components/form/FormField.vue";
import TextInput from "../components/form/TextInput.vue";
import ProposalCard from "../components/ProposalCard.vue";
import TripDialog from "../components/TripDialog.vue";

const route = useRoute();
const router = useRouter();
const trip = ref<TripDetail | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const formError = ref<string | null>(null);
const saving = ref(false);
const editing = ref(false);
const confirmingDelete = ref(false);
const composing = ref(false);
const proposalTitle = ref("");
const proposalError = ref<string | null>(null);
const draft = ref<TripInput>({ title: "", startDate: "", endDate: "", people: 2 });

const accent = computed(() => {
  const current = trip.value;
  if (current === null) return stripColor("");
  return stripColor(current.title);
});

async function load() {
  loading.value = true;
  error.value = null;
  trip.value = null;
  try {
    trip.value = await api.getTrip(routeParam(route.params.tripId));
    document.title = `${trip.value.title} · Voyage`;
  } catch (caught) {
    error.value = errorMessage(caught);
    document.title = "Voyage";
  } finally {
    loading.value = false;
  }
}

function openEdit() {
  if (!trip.value) return;
  draft.value = {
    title: trip.value.title,
    startDate: trip.value.startDate,
    endDate: trip.value.endDate,
    people: trip.value.people,
  };
  formError.value = null;
  editing.value = true;
}

async function saveTrip(payload: TripInput) {
  if (!trip.value) return;
  saving.value = true;
  formError.value = null;
  try {
    trip.value = await api.updateTrip(trip.value.id, payload);
    editing.value = false;
    document.title = `${trip.value.title} · Voyage`;
  } catch (caught) {
    formError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

async function removeTrip() {
  if (!trip.value) return;
  saving.value = true;
  try {
    await api.deleteTrip(trip.value.id);
    await router.push({ name: "trips" });
  } catch (caught) {
    error.value = errorMessage(caught);
    saving.value = false;
  }
}

async function createProposal() {
  if (!trip.value) return;
  proposalError.value = null;
  const title = proposalTitle.value.trim();
  if (!title) {
    proposalError.value = "Il titolo è obbligatorio.";
    return;
  }
  saving.value = true;
  try {
    const proposal = await api.createProposal(trip.value.id, { title });
    await router.push({
      name: "proposal",
      params: { tripId: trip.value.id, proposalId: proposal.id },
    });
  } catch (caught) {
    proposalError.value = errorMessage(caught);
    saving.value = false;
  }
}

watch(() => route.params.tripId, () => void load(), { immediate: true });
</script>

<template>
  <main class="page">
    <p v-if="loading" class="empty">Caricamento…</p>
    <template v-else-if="error && !trip">
      <RouterLink class="back" :to="{ name: 'trips' }">← Viaggi</RouterLink>
      <p class="banner" role="alert">{{ error }}</p>
    </template>
    <template v-else-if="trip">
      <header class="topbar">
        <div>
          <RouterLink class="back" :to="{ name: 'trips' }">← Viaggi</RouterLink>
          <h1>{{ trip.title }}</h1>
          <p class="lede">{{ formatRange(trip.startDate, trip.endDate) }} · {{ formatPeople(trip.people) }}</p>
        </div>
        <div class="actions">
          <AppButton variant="secondary" @click="openEdit">Modifica</AppButton>
          <AppButton variant="ghost-danger" @click="confirmingDelete = true">Elimina</AppButton>
        </div>
      </header>

      <p v-if="error" class="banner" role="alert">{{ error }}</p>
      <div v-if="confirmingDelete" class="banner quiet">
        <span>Eliminare questo viaggio e tutte le proposte?</span>
        <span class="actions">
          <AppButton variant="ghost" @click="confirmingDelete = false">Annulla</AppButton>
          <AppButton variant="danger" :disabled="saving" @click="removeTrip">Elimina</AppButton>
        </span>
      </div>

      <div class="section-head">
        <h2>Proposte</h2>
        <p class="lede">Ogni scheda è un modo diverso di fare questo viaggio.</p>
      </div>

      <section class="card-grid" aria-label="Proposte">
        <ProposalCard
          v-for="proposal in trip.proposals"
          :key="proposal.id"
          :proposal="proposal"
          :accent="accent"
          :to="{ name: 'proposal', params: { tripId: trip.id, proposalId: proposal.id } }"
        />

        <AppCard v-if="!composing" tag="button" variant="add" @click="composing = true">
          <strong class="add-title">Nuova proposta</strong>
          <span class="add-hint">Una scheda da compilare e confrontare</span>
        </AppCard>
        <AppCard v-else variant="add">
          <form class="new-proposal" @submit.prevent="createProposal">
            <FormField label="Titolo della proposta">
              <TextInput v-model="proposalTitle" maxlength="80" required autofocus placeholder="Costa, via Quito…" />
            </FormField>
            <p v-if="proposalError" class="banner" role="alert">{{ proposalError }}</p>
            <div class="actions">
              <AppButton variant="secondary" @click="composing = false">Annulla</AppButton>
              <AppButton type="submit" :disabled="saving">Crea scheda</AppButton>
            </div>
          </form>
        </AppCard>
      </section>

      <TripDialog
        v-if="editing"
        heading="Modifica viaggio"
        submit-label="Salva"
        :initial="draft"
        :saving="saving"
        :error="formError"
        @close="editing = false"
        @submit="saveTrip"
      />
    </template>
  </main>
</template>

<style scoped>
.add-title { font-size: var(--text-lg); }
.add-hint { color: var(--color-muted); }

.new-proposal { display: grid; gap: var(--space-4); }
.new-proposal .banner { margin: 0; }
</style>
