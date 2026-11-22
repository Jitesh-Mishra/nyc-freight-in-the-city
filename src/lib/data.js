// Loads the static data files from public/data (served under the Vite base path).
const base = import.meta.env.BASE_URL
const cache = new Map()

export function dataUrl(path) {
  return `${base}data/${path}`
}

export async function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(dataUrl(path)).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
      return r.json()
    }))
  }
  return cache.get(path)
}
