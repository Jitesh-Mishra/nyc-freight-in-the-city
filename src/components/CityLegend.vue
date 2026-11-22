<script setup>
import { computed } from 'vue'
import { ROUTE_STYLE, WAREHOUSE, CROSSING, INJURY, COUNT_BINS, crossingRadius, injuryRadius, fmtInt } from '../lib/p2'
import { HUB_TYPES, rgb } from '../lib/scales'

const props = defineProps({
  layers: { type: Object, required: true },
  maxTrucks: { type: Number, default: 13715 },
  compact: { type: Boolean, default: false }
})

// crossing circles, side by side, drawn with the same sqrt scale as the map
const crossingSamples = computed(() => {
  let x = 2
  return [1000, 5000, 10000].map((v) => {
    const r = crossingRadius(v, props.maxTrucks)
    const s = { v, r, cx: x + r }
    x += 2 * r + 8
    return s
  })
})
const crossingW = computed(() => crossingSamples.value.reduce((m, s) => Math.max(m, s.cx + s.r + 2), 0))
const crossingH = computed(() => 2 * crossingRadius(10000, props.maxTrucks) + 4)
const injurySamples = [1, 10]
</script>

<template>
  <div class="city-legend-body" :class="{ compact }">
    <div v-if="layers.routes" class="sec">
      <div class="fw-semibold">Truck routes</div>
      <div v-for="(s, k) in ROUTE_STYLE" :key="k" class="d-flex align-items-center gap-2">
        <svg width="40" height="12" aria-hidden="true"><line x1="2" x2="38" y1="6" y2="6" :stroke="rgb(s.color)" :stroke-width="s.width" stroke-linecap="round" /></svg>
        <span>{{ s.label }}{{ k === 'Local' ? ' (includes limited local)' : '' }}</span>
      </div>
    </div>
    <div v-if="layers.counts" class="sec">
      <div class="fw-semibold">Truck counts 2025 (heavy and medium trucks per day)</div>
      <div class="d-flex flex-wrap column-gap-3">
        <div v-for="b in COUNT_BINS" :key="b.label" class="d-flex align-items-center gap-1">
          <svg width="26" height="12" aria-hidden="true"><line x1="2" x2="24" y1="6" y2="6" :stroke="rgb(b.color)" :stroke-width="b.width" stroke-linecap="round" /></svg>
          <span>{{ b.label }}</span>
        </div>
      </div>
    </div>
    <div v-if="layers.crossings" class="sec">
      <div class="fw-semibold">Bridge and tunnel trucks per day, 2024</div>
      <svg :width="crossingW" :height="crossingH + 12" role="img" aria-label="Circle sizes for 1,000, 5,000 and 10,000 trucks per day">
        <g v-for="s in crossingSamples" :key="s.v">
          <circle :cx="s.cx" :cy="crossingH - s.r - 2" :r="s.r" :fill="rgb(CROSSING.color, 0.67)" stroke="#fff" stroke-width="2" />
          <text :x="s.cx" :y="crossingH + 9" text-anchor="middle" font-size="9" fill="#333">{{ fmtInt.format(s.v) }}</text>
        </g>
      </svg>
      <div class="text-body-secondary">Circle area is proportional to trucks per day</div>
    </div>
    <div v-if="layers.warehouses" class="sec d-flex align-items-center gap-2">
      <svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" :r="WAREHOUSE.radius + 1.5" :fill="rgb(WAREHOUSE.color, 0.75)" /></svg>
      <span><b>Warehouse</b> (building class E tax lot)</span>
    </div>
    <div v-if="layers.injuries" class="sec">
      <div class="fw-semibold">Freight-vehicle crashes with injuries, 2018 to 2025</div>
      <div class="d-flex align-items-center gap-3">
        <div v-for="n in injurySamples" :key="n" class="d-flex align-items-center gap-1">
          <svg width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" :r="injuryRadius(n)" :fill="rgb(INJURY.color, 0.45)" /></svg>
          <span>{{ n }} injured</span>
        </div>
      </div>
      <div class="text-body-secondary">Overlapping points darken where crashes cluster</div>
    </div>
    <div v-if="layers.hubs" class="sec">
      <div class="fw-semibold">Delivery hubs</div>
      <div v-for="(h, k) in HUB_TYPES" :key="k" class="d-flex align-items-center gap-2">
        <svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" :fill="rgb(h.fill)" :stroke="rgb(h.line === undefined ? [0, 0, 0] : h.line)" stroke-width="1.5" /></svg>
        <span>{{ h.label }}</span>
      </div>
    </div>
    <div v-if="!Object.values(layers).some(Boolean)" class="text-body-secondary">Turn a layer on to see its legend.</div>
  </div>
</template>

<style scoped>
.city-legend-body { font-size: 12.5px; }
.city-legend-body.compact { font-size: 10px; line-height: 1.25; }
.sec + .sec { margin-top: 6px; padding-top: 4px; border-top: 1px solid #ddd; }
</style>
