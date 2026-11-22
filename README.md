# Freight in the city (NYC)

An interactive map of freight inside New York City: where trucks are allowed to drive, where warehouses stand, how many trucks cross the bridges and tunnels and are counted on city streets, and where freight vehicles are involved in crashes that injure people.

This is a standalone copy of Page 2 of **From Port to Porch** (USC DSCI 554, Team 11). It runs on its own; the "See cargo-bike reach from here" button links to the reachability map on the full project site: https://dsci-554.github.io/project-20263-team-11/

## Features

- Full-width MapLibre map with deck.gl layers (CARTO Voyager basemap, major roads greyed so truck routes stand out).
- Six layers with chips on the map and switches below it:
  1. Truck routes, through vs local (on at load)
  2. Warehouses, PLUTO building class E lots (on)
  3. Bridge and tunnel trucks per day, 2024, circle area proportional to trucks (on)
  4. Truck counts 2025, heavy plus medium trucks per count day in 5 classes (off)
  5. Freight-vehicle crashes with injuries, 2018 to 2025 (off)
  6. Delivery hubs: NYC DOT microhubs and carrier depots (off)
- Hover tooltips on every layer; click a warehouse, crossing or counted street for details.
- D3 bar chart of people injured per year; click a bar to show only that year on the map.
- Table of the busiest crossings; click a row to fly to it.

## Run locally

Requires Node 22 or newer.

```
npm install
npm run dev
```

Open the URL Vite prints.

## Build and deploy to GitHub Pages

The build uses a relative base, so it works under any repository name.

```
npm run build
npm run deploy
```

`deploy` publishes `dist/` to the `gh-pages` branch. Then in the repository settings, set Pages to deploy from the `gh-pages` branch.

## Project structure

```
index.html
src/main.js                  app entry (Bootstrap, MapLibre CSS)
src/App.vue                  navbar and page
src/views/CityFreightView.vue  page layout, cards, state
src/components/CityMap.vue     map, layers, chips, tooltips, popup
src/components/CityLegend.vue  legend (on the map and in a card)
src/components/InjuryChart.vue D3 injuries bar chart
src/lib/p2.js                data loading and encodings
src/lib/scales.js            basemap URL and hub marker styles
src/lib/data.js              cached JSON loader
public/data/p2/              the six data files the page loads
public/data/p3/hubs.json     delivery hubs
```

## Data

All files are static, WGS84, coordinates rounded to 5 decimals (about 2.1 MB raw, 0.4 MB gzipped in total).

| File | Content | Source |
|---|---|---|
| truck_routes.geojson | 32,939 truck route segments merged into 1,249 features by route type and street | NYC DOT truck routes, NYC Open Data jjja-shxy (March 2026) |
| warehouses.json | 6,039 building class E tax lots | NYC PLUTO 26v2 |
| truck_counts_2025.geojson | 267 counted street segments, mean heavy and medium trucks per count day | NYC DOT vehicle classification counts 2025, joined to LION |
| crossings.json | 9 MTA bridges and tunnels, trucks and all vehicles per day, 2024 | MTA Bridges and Tunnels traffic by vehicle class, data.ny.gov dtj7-qync; positions from OpenStreetMap |
| freight_injuries.json | 12,358 crashes with at least one person injured or killed, 2018 to 2025 | NYC motor vehicle collisions, NYC Open Data h9gi-nx95 (vehicle type 1 or 2 is a box truck, tractor truck, van, delivery truck or flat bed) |
| injuries_by_year.json | People injured and killed per year | Same as above |
| hubs.json | 19 delivery hubs | NYC DOT microhub announcements; carrier depots from OpenStreetMap |

Notes:
- The map and chart show people injured, not crash counts: recorded crashes drop sharply after 2019 when reporting changed, while injuries rise.
- 2026 is a partial year and is left out.
- Truck counts are samples (mean per count day over 2 or 3 days in 2025), not annual totals.

The data was built by the team's Python pipeline in the course repository (DSCI-554/project-20263-team-11, `pipeline/transform/p2_*.py`).

## Licences and attribution

- NYC Open Data and MTA data: NYC Open Data and data.ny.gov terms of use.
- OpenStreetMap data (crossing positions, depots, basemap): ODbL, attribution shown on the map.
- Basemap: CARTO Voyager.

## Credits

USC DSCI 554, Team 11: Jitesh Mishra, Darshan Nilesh Mahajan, Ethan Taubman, Adwait Naware.
