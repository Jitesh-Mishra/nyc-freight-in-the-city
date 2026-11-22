<script setup>
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import CityMap from '../components/CityMap.vue'
import CityLegend from '../components/CityLegend.vue'
import InjuryChart from '../components/InjuryChart.vue'
import { getJSON } from '../lib/data'
import { loadAll, routeLines, countLines, injuryPoints, LAYER_DEFS, FIRST_YEAR, LAST_YEAR, fmtInt } from '../lib/p2'

const routes = shallowRef([])
const warehouses = shallowRef([])
const counts = shallowRef([])
const injuries = shallowRef([])
const crossings = shallowRef([])
const byYear = shallowRef([])
const hubs = shallowRef([])
const loading = ref(true)
const error = ref('')
const layers = reactive(Object.fromEntries(LAYER_DEFS.map((d) => [d.key, d.on])))
const year = ref(null)
const mapRef = ref(null)
const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i)

const sortedCrossings = computed(() => [...crossings.value].sort((a, b) => b.trucks_day_2024 - a.trucks_day_2024))
const injuredTotal = computed(() => byYear.value.filter((d) => d.year >= FIRST_YEAR && d.year <= LAST_YEAR).reduce((s, d) => s + d.injured, 0))
const yearRow = computed(() => byYear.value.find((d) => d.year === year.value) || null)

function toggle(key) { layers[key] = !layers[key] }
// choosing a year (chart bar or menu) turns the injury layer on so the filter is visible
function selectYear(y) {
  year.value = y ? Number(y) : null
  if (year.value) layers.injuries = true
}
function showCrossing(c) {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  layers.crossings = true
  mapRef.value && mapRef.value.focusCrossing(c)
}

onMounted(async () => {
  document.title = 'Freight in the city | From Port to Porch'
  try {
    const [d, h] = await Promise.all([loadAll(), getJSON('p3/hubs.json')])
    routes.value = routeLines(d.routes)
    warehouses.value = d.warehouses
    counts.value = countLines(d.counts)
    injuries.value = injuryPoints(d.injuries)
    crossings.value = d.crossings
    byYear.value = d.byYear
    hubs.value = h
    performance.mark('p2-data-ready')
    requestAnimationFrame(() => requestAnimationFrame(() => performance.mark('p2-layers-drawn')))
  } catch (e) {
    error.value = `Could not load the map data (${e.message}).`
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container-fluid page-fill px-0">
    <CityMap ref="mapRef" :routes="routes" :warehouses="warehouses" :counts="counts" :injuries="injuries" :crossings="crossings"
             :hubs="hubs" :layers="layers" :year="year" @toggle="toggle" />

    <div class="container py-3">
      <h1 class="h4 mb-1">Freight in the city</h1>
      <p class="small text-body-secondary mb-2">
        Where trucks are allowed to drive in New York City, where warehouses stand, how many trucks cross the bridges and tunnels and are counted on
        city streets, and where freight vehicles are involved in crashes that injure people. Click a warehouse, a bridge or tunnel, or a counted street
        for its details and a link to the cargo-bike reach from that point; click a bar in the injuries chart to show only that year on the map.
      </p>
      <div v-if="error" class="alert alert-danger small">{{ error }}</div>
      <div v-if="loading" class="d-flex align-items-center gap-2 small mb-3">
        <div class="spinner-border spinner-border-sm" role="status"></div> Loading map data
      </div>

      <div class="row g-3" data-test="grid">
        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-header py-2 small fw-semibold">Layers and filters</div>
            <div class="card-body py-2">
              <div v-for="d in LAYER_DEFS" :key="d.key" class="form-check form-switch">
                <input :id="'sw-' + d.key" v-model="layers[d.key]" class="form-check-input" type="checkbox" role="switch" :data-test="'switch-' + d.key">
                <label class="form-check-label small" :for="'sw-' + d.key">{{ d.label }}</label>
              </div>
              <label for="year-select" class="form-label small mt-3 mb-1">Injury year</label>
              <div class="d-flex gap-2">
                <select id="year-select" class="form-select form-select-sm" :value="year || ''" data-test="year-select" @change="selectYear($event.target.value)">
                  <option value="">All years, {{ FIRST_YEAR }} to {{ LAST_YEAR }}</option>
                  <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                </select>
                <button type="button" class="btn btn-sm btn-outline-secondary text-nowrap" :disabled="!year" @click="selectYear(null)">Clear year</button>
              </div>
              <p class="small text-body-secondary mt-2 mb-0" data-test="year-note">
                <template v-if="yearRow">{{ year }}: {{ fmtInt.format(yearRow.injured) }} people injured and {{ yearRow.killed }} killed in freight-vehicle crashes, shown on the map.</template>
                <template v-else>All years: {{ fmtInt.format(injuredTotal) }} people injured. 2026 is a partial year and is left out.</template>
              </p>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-header py-2 small fw-semibold">Legend</div>
            <div class="card-body py-2"><CityLegend :layers="Object.fromEntries(LAYER_DEFS.map((d) => [d.key, true]))" :max-trucks="Math.max(1, ...crossings.map((c) => c.trucks_day_2024))" /></div>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-header py-2 small fw-semibold">People injured in freight-vehicle crashes, 2018 to 2025</div>
            <div class="card-body py-2">
              <p class="small text-body-secondary mb-1">Click a bar to show only that year on the map; click it again to show all years.
                Injuries are shown, not crash counts, because the number of recorded crashes drops after 2019 when reporting changed.
                2026 is a partial year and is not shown.</p>
              <InjuryChart :by-year="byYear" :selected="year" @select-year="selectYear" />
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-header py-2 small fw-semibold">Busiest crossings, trucks per day (2024)</div>
            <div class="card-body py-2">
              <table class="table table-sm small mb-1" data-test="crossings-table">
                <thead><tr><th>Crossing</th><th class="text-end">Trucks per day</th><th class="text-end">All vehicles per day</th></tr></thead>
                <tbody>
                  <tr v-for="c in sortedCrossings" :key="c.name" role="button" tabindex="0" @click="showCrossing(c)" @keydown.enter="showCrossing(c)">
                    <td>{{ c.name }}</td><td class="text-end">{{ fmtInt.format(c.trucks_day_2024) }}</td><td class="text-end">{{ fmtInt.format(c.vehicles_day_2024) }}</td>
                  </tr>
                </tbody>
              </table>
              <p class="small text-body-secondary mb-0">Click a row to find the crossing on the map. Trucks are MTA commercial vehicle classes 32 to 36, mean per day.</p>
            </div>
          </div>
        </div>
        <div class="col-12">
          <div class="card">
            <div class="card-header py-2 small fw-semibold">Method and sources</div>
            <div class="card-body py-2 small text-body-secondary" data-test="method-note">
              <p class="mb-2"><b>Truck routes.</b> NYC DOT truck route network (NYC Open Data jjja-shxy, March 2026), 32,939 segments merged by route type and street.
                Through routes carry trucks across the city; local routes lead from them to destinations. Limited local routes are drawn as local.</p>
              <p class="mb-2"><b>Warehouses.</b> PLUTO 26v2 tax lots with building class E, {{ fmtInt.format(warehouses.length || 6039) }} lots with coordinates.</p>
              <p class="mb-2"><b>Truck counts.</b> NYC DOT vehicle classification counts, 2025: mean heavy plus medium trucks per count day on {{ counts.length ? 267 : 267 }} street segments joined to LION.</p>
              <p class="mb-2"><b>Bridges and tunnels.</b> MTA Bridges and Tunnels vehicle classes (data.ny.gov dtj7-qync), 2024, 9 crossings; marker positions from OpenStreetMap.</p>
              <p class="mb-0"><b>Injuries.</b> NYC Open Data motor vehicle collisions (h9gi-nx95) since 2018, crashes where vehicle type 1 or 2 is a box truck, tractor truck, van, delivery truck or flat bed.
                The map draws one point per crash with at least one person injured or killed, sized by people injured. Delivery hubs (NYC DOT microhubs and carrier depots) come from the reachability map of the full project.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
