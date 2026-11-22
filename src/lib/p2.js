// Page 2 ("Freight in the city"): loaders and encodings. New file, so it does not touch src/lib/data.js.
import { getJSON } from './data'

export const P2_FILES = {
  routes: 'p2/truck_routes.geojson',
  warehouses: 'p2/warehouses.json',
  counts: 'p2/truck_counts_2025.geojson',
  injuries: 'p2/freight_injuries.json',
  byYear: 'p2/injuries_by_year.json',
  crossings: 'p2/crossings.json'
}

export const FIRST_YEAR = 2018
export const LAST_YEAR = 2025 // 2026 is a partial year: trends and the chart stop at 2025

// Each LineString of a route feature becomes one deck.gl datum
export function routeLines(fc) {
  const out = []
  for (const f of fc.features) {
    const g = f.geometry
    const parts = g.type === 'LineString' ? [g.coordinates] : g.coordinates
    for (const path of parts) out.push({ path, type: f.properties.route_type, street: f.properties.street })
  }
  return out
}

export function countLines(fc) {
  const out = []
  for (const f of fc.features) {
    const g = f.geometry
    const parts = g.type === 'LineString' ? [g.coordinates] : g.coordinates
    const p = f.properties
    for (const path of parts) {
      out.push({ path, id: p.segment_id, street: p.street, heavy: p.heavy_day, medium: p.medium_day, days: p.n_days, total: p.heavy_day + p.medium_day })
    }
  }
  return out
}

// rows format: { fields, rows, through } -> one object per crash with injuries or deaths
export function injuryPoints(file) {
  const ix = Object.fromEntries(file.fields.map((k, i) => [k, i]))
  return file.rows.map((r) => ({ lat: r[ix.lat], lon: r[ix.lon], year: r[ix.year], injured: r[ix.injured], killed: r[ix.killed] }))
}

export const loadAll = () => Promise.all(Object.values(P2_FILES).map((p) => getJSON(p))).then(([routes, warehouses, counts, injuries, byYear, crossings]) => ({
  routes, warehouses, counts, injuries, byYear, crossings
}))

// ---- encodings (colours chosen so no layer shares a hue with another; none uses the blue minutes scale of page 3's choropleth)
export const ROUTE_STYLE = {
  Through: { color: [166, 54, 3], width: 3.4, label: 'Through route' },
  Local: { color: [230, 100, 10], width: 1.8, label: 'Local route' }
}
export const routeStyle = (t) => (t === 'Through' ? ROUTE_STYLE.Through : ROUTE_STYLE.Local)

export const WAREHOUSE = { color: [31, 120, 180], radius: 2.6 }
export const CROSSING = { color: [0, 121, 107], line: [255, 255, 255], maxRadius: 30, minRadius: 5 }
export const INJURY = { color: [215, 25, 60], minRadius: 2 }

// sqrt scale: circle area is proportional to trucks per day
export function crossingRadius(trucks, max) {
  return CROSSING.minRadius + (CROSSING.maxRadius - CROSSING.minRadius) * Math.sqrt(trucks / Math.max(1, max))
}
export const injuryRadius = (n) => INJURY.minRadius + 1.1 * Math.sqrt(n)

// truck counts 2025: mean heavy plus medium trucks counted per day, 5 classes (Purples)
export const COUNT_BINS = [
  { max: 100, label: 'under 100', color: [218, 218, 235], width: 2 },
  { max: 250, label: '100 to 250', color: [188, 189, 220], width: 3 },
  { max: 500, label: '250 to 500', color: [158, 154, 200], width: 4.5 },
  { max: 1000, label: '500 to 1,000', color: [117, 107, 177], width: 6 },
  { max: Infinity, label: 'over 1,000', color: [84, 39, 143], width: 8 }
]
export function countBin(total) {
  return COUNT_BINS.find((b) => total < b.max) || COUNT_BINS[COUNT_BINS.length - 1]
}

export const LAYER_DEFS = [
  { key: 'routes', chip: 'Truck routes', label: 'Truck routes', on: true },
  { key: 'warehouses', chip: 'Warehouses', label: 'Warehouses', on: true },
  { key: 'crossings', chip: 'Crossings', label: 'Bridge and tunnel trucks 2024', on: true },
  { key: 'counts', chip: 'Truck counts', label: 'Truck counts 2025', on: false },
  { key: 'injuries', chip: 'Injuries', label: 'Freight-vehicle injuries 2018 to 2025', on: false },
  { key: 'hubs', chip: 'Hubs', label: 'Delivery hubs', on: false }
]

export const fmtInt = new Intl.NumberFormat('en-US')

// URL of Page 3 routing from a point: same 300 m snap rule as a click there
// The cargo-bike reachability map lives on the full team site; this standalone page links to it
export const TEAM_SITE = 'https://dsci-554.github.io/project-20263-team-11/'
export const reachLink = (lon, lat) => `${TEAM_SITE}#/last-mile?at=${lon.toFixed(5)},${lat.toFixed(5)}`
