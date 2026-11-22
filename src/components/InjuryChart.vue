<script setup>
import { onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { INJURY, FIRST_YEAR, LAST_YEAR, fmtInt } from '../lib/p2'

const props = defineProps({
  byYear: { type: Array, default: () => [] },
  selected: { type: Number, default: null }
})
const emit = defineEmits(['select-year'])
const svgEl = ref(null)

const W = 520, H = 270, M = { top: 22, right: 12, bottom: 34, left: 48 }

function draw() {
  const data = props.byYear.filter((d) => d.year >= FIRST_YEAR && d.year <= LAST_YEAR && !d.partial)
  const svg = d3.select(svgEl.value)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${W} ${H}`)
  if (!data.length) return
  const x = d3.scaleBand().domain(data.map((d) => d.year)).range([M.left, W - M.right]).padding(0.2)
  const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.injured)]).nice().range([H - M.bottom, M.top])
  const base = `rgb(${INJURY.color.join(',')})`
  svg.append('g').attr('transform', `translate(${M.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(',')).tickSize(-(W - M.left - M.right)))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('line').attr('stroke', '#ddd'))
    .call((g) => g.selectAll('text').attr('font-size', 11))
  svg.append('g').attr('transform', `translate(0,${H - M.bottom})`).call(d3.axisBottom(x).tickSizeOuter(0))
    .call((g) => g.selectAll('text').attr('font-size', 11))
  svg.append('text').attr('x', 12).attr('y', 12).attr('font-size', 11).attr('fill', '#555').text('People injured')
  const pick = (d) => emit('select-year', props.selected === d.year ? null : d.year)
  const bars = svg.append('g').selectAll('g').data(data).join('g')
    .attr('class', 'bar')
    .attr('role', 'button').attr('tabindex', 0).attr('data-year', (d) => d.year)
    .attr('aria-pressed', (d) => props.selected === d.year)
    .attr('aria-label', (d) => `${d.year}: ${fmtInt.format(d.injured)} people injured. Click to show these crashes on the map.`)
    .style('cursor', 'pointer')
    .on('click', (e, d) => pick(d))
    .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(d) } })
  bars.append('rect')
    .attr('x', (d) => x(d.year)).attr('width', x.bandwidth())
    .attr('y', (d) => y(d.injured)).attr('height', (d) => y(0) - y(d.injured))
    .attr('fill', (d) => (props.selected && props.selected !== d.year ? '#e6b3bd' : base))
    .attr('stroke', (d) => (props.selected === d.year ? '#111' : 'none')).attr('stroke-width', 2)
  bars.append('text')
    .attr('x', (d) => x(d.year) + x.bandwidth() / 2).attr('y', (d) => y(d.injured) - 4)
    .attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', (d) => (props.selected === d.year ? 700 : 400))
    .text((d) => fmtInt.format(d.injured))
  bars.append('title').text((d) => `${d.year}: ${fmtInt.format(d.injured)} injured, ${d.killed} killed`)
}

onMounted(draw)
watch(() => [props.byYear, props.selected], draw)
</script>

<template>
  <svg ref="svgEl" class="w-100" role="group" aria-label="Bar chart: people injured in freight-vehicle crashes per year, 2018 to 2025" data-test="injury-chart"></svg>
</template>
