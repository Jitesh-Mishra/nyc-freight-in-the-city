<script setup>
import CityFreightView from './views/CityFreightView.vue'
import { TEAM_SITE } from './lib/p2'
</script>

<template>
  <nav class="navbar navbar-dark bg-dark px-3" aria-label="Main navigation">
    <span class="navbar-brand fw-semibold">Freight in the city</span>
    <a class="nav-link text-light small" :href="TEAM_SITE" target="_blank" rel="noopener">From Port to Porch (full project)</a>
  </nav>
  <CityFreightView />
</template>
