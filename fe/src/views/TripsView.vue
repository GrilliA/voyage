<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api, errorMessage } from "../api/client";
import type { TripInput, TripSummary } from "../api/types";
import TripCard from "../components/TripCard.vue";
import TripDialog from "../components/TripDialog.vue";

const emptyDraft = (): TripInput => ({ title: "", startDate: "", endDate: "", people: 2 });

const router = useRouter();
const trips = ref<TripSummary[]>([]);
const loading = ref(true);
const error = ref("");
const formError = ref("");
const saving = ref(false);
const creating = ref(false);
const draft = ref<TripInput>(emptyDraft());

async function load() {
  loading.value = true;
  error.value = "";
  try {
    trips.value = await api.listTrips();
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  draft.value = emptyDraft();
  formError.value = "";
  creating.value = true;
}

async function createTrip(payload: TripInput) {
  saving.value = true;
  formError.value = "";
  try {
    const trip = await api.createTrip(payload);
    await router.push({ name: "trip", params: { tripId: trip.id } });
  } catch (caught) {
    formError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  document.title = "Voyage";
  load();
});
</script>

<template>
  <main class="page">
    <header class="topbar">
      <div>
        <p class="brand">Voyage</p>
        <h1>I tuoi viaggi</h1>
        <p class="lede">Apri una scheda per vedere le proposte e confrontare i costi.</p>
      </div>
      <button class="button" type="button" @click="openCreate">Nuovo viaggio</button>
    </header>

    <p v-if="error" class="banner" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="empty">Caricamento…</p>
    <p v-else-if="trips.length === 0" class="empty">
      Nessun viaggio. Crea la prima scheda, poi aggiungi le proposte da confrontare.
    </p>
    <section v-else class="card-grid" aria-label="Viaggi">
      <TripCard v-for="trip in trips" :key="trip.id" :trip="trip" />
    </section>

    <TripDialog
      v-if="creating"
      heading="Nuovo viaggio"
      submit-label="Crea scheda"
      :initial="draft"
      :saving="saving"
      :error="formError"
      @close="creating = false"
      @submit="createTrip"
    />
  </main>
</template>
