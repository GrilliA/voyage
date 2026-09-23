<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, errorMessage } from "../api/client";
import type { TripDetail, TripInput } from "../api/types";
import { formatPeople, formatRange, routeParam, stripColor } from "../format";
import ProposalCard from "../components/ProposalCard.vue";
import TripDialog from "../components/TripDialog.vue";

const route = useRoute();
const router = useRouter();
const trip = ref<TripDetail | null>(null);
const loading = ref(true);
const error = ref("");
const formError = ref("");
const saving = ref(false);
const editing = ref(false);
const confirmingDelete = ref(false);
const composing = ref(false);
const proposalTitle = ref("");
const proposalError = ref("");
const draft = ref<TripInput>({ title: "", startDate: "", endDate: "", people: 2 });

const accent = computed(() => stripColor(trip.value?.title ?? ""));

async function load() {
  loading.value = true;
  error.value = "";
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
  formError.value = "";
  editing.value = true;
}

async function saveTrip(payload: TripInput) {
  if (!trip.value) return;
  saving.value = true;
  formError.value = "";
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
  proposalError.value = "";
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
          <button class="button secondary" type="button" @click="openEdit">Modifica</button>
          <button class="button ghost danger" type="button" @click="confirmingDelete = true">Elimina</button>
        </div>
      </header>

      <p v-if="error" class="banner" role="alert">{{ error }}</p>
      <div v-if="confirmingDelete" class="banner quiet">
        <span>Eliminare questo viaggio e tutte le proposte?</span>
        <span class="actions">
          <button class="button ghost" type="button" @click="confirmingDelete = false">Annulla</button>
          <button class="button danger" type="button" :disabled="saving" @click="removeTrip">Elimina</button>
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

        <button v-if="!composing" class="card card-add" type="button" @click="composing = true">
          <strong>Nuova proposta</strong>
          <span>Una scheda da compilare e confrontare</span>
        </button>
        <form v-else class="card card-add" @submit.prevent="createProposal">
          <label class="field">
            Titolo della proposta
            <input v-model="proposalTitle" type="text" maxlength="80" required autofocus placeholder="Costa, via Quito…" />
          </label>
          <p v-if="proposalError" class="banner" role="alert">{{ proposalError }}</p>
          <div class="actions">
            <button class="button secondary" type="button" @click="composing = false">Annulla</button>
            <button class="button" type="submit" :disabled="saving">Crea scheda</button>
          </div>
        </form>
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
