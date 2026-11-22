<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch, markRaw } from 'vue'
import maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import { STYLES, HUB_TYPES } from '../lib/scales'
import {
  LAYER_DEFS, ROUTE_STYLE, routeStyle, WAREHOUSE, CROSSING, INJURY, crossingRadius, injuryRadius, countBin, reachLink, fmtInt
} from '../lib/p2'
import CityLegend from './CityLegend.vue'

const props = defineProps({
  routes: { type: Array, default: () => [] },
  warehouses: { type: Array, default: () => [] },
  counts: { type: Array, default: () => [] },
  injuries: { type: Array, default: () => [] },
  crossings: { type: Array, default: () => [] },
  hubs: { type: Array, default: () => [] },
  layers: { type: Object, required: true },
  year: { type: Number, default: null }
})
const emit = defineEmits(['toggle'])

const mapEl = ref(null)
const popup = ref(null)
let map = null
let overlay = null
let labelBefore

const maxTrucks = computed(() => Math.max(1, ...props.crossings.map((c) => c.trucks_day_2024)))
const shownInjuries = computed(() => (props.year ? props.injuries.filter((d) => d.year === props.year) : props.injuries))

// Same anchors idea as the reachability map: data layers go under the basemap labels, markers on top.
function findAnchors() {
  const ls = map.getStyle().layers
  const isRoad = (l) => l.type === 'line' && /(^|_|-)(tunnel|road|bridge|highway|street|motorway)/i.test(l.id) && !/aeroway/i.test(l.id)
  let last = -1
  ls.forEach((l, i) => { if (isRoad(l)) last = i })
  labelBefore = ls.find((l, i) => i > last && l.type === 'symbol')?.id
}

const titleCase = (s) => String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

function tooltip({ object, layer }) {
  if (!object || !layer) return null
  const style = { fontSize: '12px', maxWidth: '260px' }
  switch (layer.id) {
    case 'routes':
      return { html: `<b>${titleCase(object.street)}</b><br>${object.type} truck route`, style }
    case 'warehouses':
      return { html: `<b>${titleCase(object.address)}</b><br>${object.borough}<br>${object.bldgarea ? fmtInt.format(object.bldgarea) + ' sq ft' : 'Building area not recorded'}<br><i>Click for details</i>`, style }
    case 'crossings':
      return { html: `<b>${object.name}</b><br>${fmtInt.format(object.trucks_day_2024)} trucks per day (2024)<br><i>Click for details</i>`, style }
    case 'counts':
      return { html: `<b>${titleCase(object.street)}</b><br>${fmtInt.format(object.total)} heavy and medium trucks per day (2025)<br><i>Click for details</i>`, style }
    case 'injuries':
      return { html: `<b>${object.year}</b><br>${object.injured} injured${object.killed ? `, ${object.killed} killed` : ''} in one freight-vehicle crash`, style }
    case 'hubs': {
      const t = HUB_TYPES[object.type]?.label || object.type
      return { html: `<b>${object.name}</b><br>${t}<br>${object.operator}`, style }
    }
    default:
      return null
  }
}

function buildLayers() {
  const L = props.layers
  const out = []
  if (L.routes && props.routes.length) {
    out.push(new PathLayer({
      id: 'routes', data: props.routes, beforeId: labelBefore, pickable: true, widthUnits: 'pixels', capRounded: true, jointRounded: true,
      getPath: (d) => d.path, getWidth: (d) => routeStyle(d.type).width, getColor: (d) => [...routeStyle(d.type).color, d.type === 'Through' ? 230 : 200]
    }))
  }
  if (L.counts && props.counts.length) {
    out.push(new PathLayer({
      id: 'counts', data: props.counts, beforeId: labelBefore, pickable: true, widthUnits: 'pixels', capRounded: true, jointRounded: true,
      getPath: (d) => d.path, getWidth: (d) => countBin(d.total).width, getColor: (d) => [...countBin(d.total).color, 245],
      parameters: { depthTest: false }
    }))
  }
  if (L.injuries && shownInjuries.value.length) {
    out.push(new ScatterplotLayer({
      id: 'injuries', data: shownInjuries.value, beforeId: labelBefore, pickable: true, radiusUnits: 'pixels',
      getPosition: (d) => [d.lon, d.lat], getRadius: (d) => injuryRadius(d.injured), getFillColor: [...INJURY.color, props.year ? 150 : 60],
      radiusMinPixels: 2, parameters: { depthTest: false }
    }))
  }
  if (L.warehouses && props.warehouses.length) {
    out.push(new ScatterplotLayer({
      id: 'warehouses', data: props.warehouses, beforeId: labelBefore, pickable: true, radiusUnits: 'pixels',
      getPosition: (d) => [d.lon, d.lat], getRadius: WAREHOUSE.radius, getFillColor: [...WAREHOUSE.color, 190], parameters: { depthTest: false }
    }))
  }
  if (L.crossings && props.crossings.length) {
    out.push(new ScatterplotLayer({
      id: 'crossings', data: props.crossings, pickable: true, stroked: true, radiusUnits: 'pixels', lineWidthUnits: 'pixels',
      getPosition: (d) => [d.lon, d.lat], getRadius: (d) => crossingRadius(d.trucks_day_2024, maxTrucks.value),
      getFillColor: [...CROSSING.color, 170], getLineColor: CROSSING.line, getLineWidth: 2, parameters: { depthTest: false },
      updateTriggers: { getRadius: [maxTrucks.value] }
    }))
  }
  if (L.hubs && props.hubs.length) {
    out.push(new ScatterplotLayer({
      id: 'hubs', data: props.hubs, pickable: true, stroked: true, radiusUnits: 'pixels', lineWidthUnits: 'pixels',
      getPosition: (d) => [d.lon, d.lat], getRadius: 6.5, getFillColor: (d) => HUB_TYPES[d.type].fill, getLineColor: (d) => HUB_TYPES[d.type].line,
      getLineWidth: 2, parameters: { depthTest: false }
    }))
  }
  if (popup.value) {
    out.push(new ScatterplotLayer({
      id: 'picked', data: [popup.value], radiusUnits: 'pixels', lineWidthUnits: 'pixels', stroked: true, filled: false,
      getPosition: (d) => [d.lon, d.lat], getRadius: (d) => (d.kind === 'crossing' ? crossingRadius(d.trucks, maxTrucks.value) + 5 : 11), getLineColor: [255, 204, 0], getLineWidth: 3,
      updateTriggers: { getRadius: [popup.value] }, parameters: { depthTest: false }
    }))
  }
  return out
}

function refresh() {
  if (overlay) overlay.setProps({ layers: buildLayers() })
}

function openPopup(kind, o, lon, lat) {
  if (kind === 'warehouse') {
    popup.value = { kind, lon, lat, title: titleCase(o.address), sub: 'Warehouse (PLUTO building class E)',
      rows: [['Borough', o.borough], ['Building area', o.bldgarea ? `${fmtInt.format(o.bldgarea)} sq ft` : 'not recorded'], ['Year built', o.yearbuilt || 'not recorded']] }
  } else if (kind === 'crossing') {
    const share = Math.round((100 * o.trucks_day_2024) / o.vehicles_day_2024)
    popup.value = { kind, lon, lat, trucks: o.trucks_day_2024, title: o.name, sub: 'MTA bridge or tunnel, 2024',
      rows: [['Trucks per day', fmtInt.format(o.trucks_day_2024)], ['All vehicles per day', fmtInt.format(o.vehicles_day_2024)], ['Truck share', `${share}%`]] }
  } else {
    popup.value = { kind, lon, lat, title: titleCase(o.street), sub: 'DOT truck count segment, 2025',
      rows: [['Heavy trucks per day', fmtInt.format(o.heavy)], ['Medium trucks per day', fmtInt.format(o.medium)], ['Count days', o.days], ['LION segment', o.id]] }
  }
}

// same start view as page 3: the area the 19 hubs cover plus a margin, a little closer than the five boroughs
const START_AREA = [[-74.23, 40.57], [-73.74, 40.87]]

// Voyager's yellow major roads go light grey so the orange truck routes stand out (same idea as page 3's traffic mode)
function greyRoads() {
  for (const l of map.getStyle().layers) {
    if (l.type !== 'line' || !/^(road|bridge|tunnel)_(pri|sec|trunk|mot)/.test(l.id)) continue
    map.setPaintProperty(l.id, 'line-color', /_case/.test(l.id) ? '#cfcfcf' : '#ebebeb')
  }
}

function createMap() {
  map = markRaw(new maplibregl.Map({
    container: mapEl.value,
    style: STYLES.voyager,
    bounds: START_AREA,
    fitBoundsOptions: { padding: { top: 56, bottom: 36, left: 16, right: 16 } },
    minZoom: 9,
    maxZoom: 17,
    maxBounds: [[-74.6, 40.35], [-73.4, 41.05]],
    attributionControl: false,
    cooperativeGestures: true
  }))
  map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-right')
  map.addControl(new maplibregl.AttributionControl({
    compact: true,
    customAttribution: 'Freight data: NYC Open Data, MTA, NYC DOT (Team 11 pipeline)'
  }), 'bottom-right')
  overlay = markRaw(new MapboxOverlay({
    interleaved: true,
    layers: [],
    pickingRadius: 5,
    getTooltip: tooltip,
    onClick: (info) => {
      const { object, layer, coordinate } = info
      if (object && layer?.id === 'warehouses') openPopup('warehouse', object, object.lon, object.lat)
      else if (object && layer?.id === 'crossings') openPopup('crossing', object, object.lon, object.lat)
      else if (object && layer?.id === 'counts' && coordinate) openPopup('count', object, coordinate[0], coordinate[1])
      else popup.value = null
    },
    getCursor: ({ isHovering }) => (isHovering ? 'pointer' : 'grab')
  }))
  map.addControl(overlay)
  map.once('load', () => { greyRoads(); findAnchors(); refresh() })
  window.__cityMap = map
  window.__cityOverlay = overlay
}

onMounted(createMap)
onBeforeUnmount(() => { if (map) map.remove(); map = null; overlay = null })
watch(() => [props.routes, props.warehouses, props.counts, props.injuries, props.crossings, props.hubs, props.year, popup.value, Object.values(props.layers).join()], refresh)

function focusCrossing(c) {
  if (!map) return
  map.flyTo({ center: [c.lon, c.lat], zoom: 12.5, duration: 700 })
  openPopup('crossing', c, c.lon, c.lat)
}
defineExpose({ focusCrossing })
</script>

<template>
  <div class="city-wrap">
    <div ref="mapEl" class="city-map" role="region" aria-label="Map of freight in New York City"></div>
    <div class="city-ctl city-chips" data-test="chips">
      <button v-for="d in LAYER_DEFS" :key="d.key" type="button" class="btn btn-sm border" :class="{ active: layers[d.key] }"
              :aria-pressed="layers[d.key]" :data-test="'chip-' + d.key" @click="emit('toggle', d.key)">{{ d.chip }}</button>
    </div>
    <div class="city-ctl city-zoom">
      <button class="btn border" aria-label="Zoom in" @click="map && map.zoomIn()">+</button>
      <button class="btn border" aria-label="Zoom out" @click="map && map.zoomOut()">&minus;</button>
    </div>
    <div v-if="popup" class="city-ctl city-popup" data-test="popup">
      <div class="d-flex justify-content-between gap-2">
        <div>
          <div class="fw-semibold" data-test="popup-title">{{ popup.title }}</div>
          <div class="small text-body-secondary">{{ popup.sub }}</div>
        </div>
        <button type="button" class="btn-close" aria-label="Close" @click="popup = null"></button>
      </div>
      <table class="table table-sm small mb-2 mt-2">
        <tbody><tr v-for="r in popup.rows" :key="r[0]"><th class="fw-normal text-body-secondary">{{ r[0] }}</th><td class="text-end">{{ r[1] }}</td></tr></tbody>
      </table>
      <a class="btn btn-sm btn-primary w-100" data-test="reach-link" :href="reachLink(popup.lon, popup.lat)" target="_blank" rel="noopener">See cargo-bike reach from here</a>
    </div>
    <div class="city-ctl city-legend" data-test="map-legend">
      <CityLegend :layers="layers" :max-trucks="maxTrucks" compact />
    </div>
  </div>
</template>

<style scoped>
.city-wrap { position: relative; }
.city-map { height: clamp(450px, 70vh, 900px); }
.city-ctl { position: absolute; z-index: 5; }
.city-chips { top: 12px; left: 12px; right: 60px; display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; pointer-events: none; }
.city-chips > * { pointer-events: auto; }
.city-chips .btn { border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.3); background: #fff; }
.city-chips .btn.active { background: #08519c; color: #fff; border-color: #08519c; }
.city-zoom { top: 12px; right: 12px; display: flex; flex-direction: column; gap: 6px; }
.city-zoom .btn { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); width: 36px; height: 36px; padding: 0; }
.city-legend { left: 12px; bottom: 30px; width: 260px; max-height: calc(100% - 110px); overflow-y: auto; background: rgba(255,255,255,.92); border-radius: 6px; padding: 6px 8px; box-shadow: 0 1px 3px rgba(0,0,0,.3); font-size: 10px; }
.city-popup { top: 56px; right: 60px; width: 290px; max-height: calc(100% - 70px); overflow-y: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.35); padding: 12px 14px; }
@media (max-width: 991px) { .city-chips { top: 12px; } .city-popup { right: 12px; left: 12px; width: auto; top: 96px; } .city-legend { display: none; } }
</style>
