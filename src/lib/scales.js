// Encodings shared by the map, legend and chart.
export const THRESHOLD = 15
export const SPEED_KMH = 15.9

// Sequential single hue (ColorBrewer Blues), darker = fewer minutes from a hub
export const BINS = [
  { max: 5, label: '0-5', color: [8, 81, 156] },
  { max: 10, label: '5-10', color: [49, 130, 189] },
  { max: 15, label: '10-15', color: [107, 174, 214] },
  { max: 20, label: '15-20', color: [158, 202, 225] },
  { max: 30, label: '20-30', color: [198, 219, 239] },
  { max: Infinity, label: 'over 30', color: [239, 243, 255] }
]
export const NO_RESIDENTS = [150, 150, 150]
export const CASING = [255, 255, 255]

export function minutesColor(min) {
  if (min == null) return BINS[BINS.length - 1].color // not reached within 60 min
  for (const b of BINS) if (min <= b.max) return b.color
  return BINS[BINS.length - 1].color
}

export const HUB_TYPES = {
  microhub_operating: { label: 'DOT microhub (operating)', fill: [197, 27, 138], line: [255, 255, 255] },
  microhub_proposed: { label: 'DOT microhub (proposed)', fill: [255, 255, 255], line: [197, 27, 138] },
  depot: { label: 'Carrier depot', fill: [37, 37, 37], line: [255, 255, 255] }
}

export function rgb(c, a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}

// flow-line width in pixels: square-root scale so area-like reading of thick lines is not overstated
export function flowWidth(bgs, maxBgs) {
  return 0.6 + 7.5 * Math.sqrt(bgs / Math.max(1, maxBgs))
}

export const fmt = new Intl.NumberFormat('en-US')

export const STYLES = {
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  liberty: 'https://tiles.openfreemap.org/styles/liberty'
}
