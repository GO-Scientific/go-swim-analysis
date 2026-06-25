const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

const state = {
  workouts: [],
  races: [],
  summary: null,
  weekly: [],
  weeklyTraining: [],
  weeklyPhysiology: [],
  loadPhases: [],
  phaseSummary: [],
  phaseTransitions: [],
  loadHrCorrelations: [],
  hrAnchors: [],
  hrZoneMethods: [],
  hrAgeContext: [],
  hrZoneDistribution: [],
  periodizationSummary: [],
  racePreLoad: [],
  julyRaceSummary: [],
  julyWeeklyContext: [],
  strokes: [],
  correlations: {},
  rawWorkouts: {},
  raceFilters: {
    groupBy: "meet",
    bestOnly: false,
    stroke: "all",
    course: "all",
    currentOnly: false
  },
  charts: {},
  findingsFigures: []
};

const views = {
  overview: document.getElementById("view-overview"),
  workouts: document.getElementById("view-workouts"),
  workout: document.getElementById("view-workout-detail"),
  races: document.getElementById("view-races"),
  training: document.getElementById("view-training"),
  physiology: document.getElementById("view-physiology"),
  findings: document.getElementById("view-findings")
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

async function loadOptionalJson(path, fallback) {
  try {
    return await loadJson(path);
  } catch {
    return fallback;
  }
}

async function loadOptionalText(path, fallback = "") {
  try {
    return await loadText(path);
  } catch {
    return fallback;
  }
}

async function loadText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function chartOptions() {
  return {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: "#f8fbff" } }
    },
    scales: {
      x: {
        ticks: { color: "rgba(248,251,255,0.68)", maxRotation: 0, autoSkip: true },
        grid: { color: "rgba(255,255,255,0.08)" }
      },
      y: {
        ticks: { color: "rgba(248,251,255,0.68)" },
        grid: { color: "rgba(255,255,255,0.08)" }
      },
      y1: {
        position: "right",
        ticks: { color: "rgba(248,251,255,0.68)" },
        grid: { drawOnChartArea: false }
      }
    }
  };
}

function destroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    delete state.charts[key];
  }
}

function clearCharts() {
  Object.keys(state.charts).forEach((key) => destroyChart(key));
}

function formatDate(value) {
  const d = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function durationFromSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "-";
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}m ${String(secs).padStart(2, "0")}s`;
}

function paceFromSeconds(seconds) {
  if (!Number.isFinite(seconds)) {
    return "-";
  }
  return `${fmt2.format(seconds)} s/50m`;
}

function parseCsv(text) {
  if (!text || !text.trim()) {
    return [];
  }
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records.map((record) => {
    return headers.reduce((entry, header, index) => {
      entry[header] = record[index] ?? "";
      return entry;
    }, {});
  });
}

function num(row, key, fallback = 0) {
  const value = Number(row?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + num(row, key), 0);
}

function mean(rows, key) {
  if (!rows.length) {
    return 0;
  }
  return sum(rows, key) / rows.length;
}

function latestRows(rows, count = 8, dateKey = "week_start") {
  return [...rows]
    .filter((row) => row[dateKey])
    .sort((a, b) => new Date(a[dateKey]) - new Date(b[dateKey]))
    .slice(-count);
}

function compactDate(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}

function renderInsightCard(title, value, text) {
  return `
    <article class="insight-card">
      <span>${title}</span>
      <strong>${value}</strong>
      <p>${text}</p>
    </article>
  `;
}

function strokeFromEvent(eventName) {
  const normalized = eventName.toUpperCase();
  if (normalized.includes(" FR") || normalized.includes("FREE")) return "fr";
  if (normalized.includes(" FL") || normalized.includes("FLY")) return "fly";
  if (normalized.includes(" BK") || normalized.includes("BACK")) return "back";
  if (normalized.includes(" BR") || normalized.includes("BREAST")) return "breast";
  if (normalized.includes(" IM")) return "im";
  return "other";
}

function strokeLabel(stroke) {
  return {
    fr: "Freestyle",
    fly: "Butterfly",
    back: "Backstroke",
    breast: "Breaststroke",
    im: "Individual Medley",
    other: "Other"
  }[stroke] || "Other";
}

function parseRawRaceJson(rawJson) {
  if (!rawJson) {
    return {};
  }
  try {
    return JSON.parse(rawJson);
  } catch {
    return {};
  }
}

function normalizeRace(row, index) {
  const raw = parseRawRaceJson(row.raw_json);
  const dateValue = row.date || raw["Swim Date"] || "";
  const stroke = strokeFromEvent(row.event || raw.Event || "");
  return {
    ...row,
    id: row.usas_swim_time_key || `${row.meet_key}-${row.swim_event_key}-${index}`,
    index,
    date: dateValue,
    year: dateValue ? new Date(dateValue).getFullYear() : null,
    event: row.event || raw.Event || "Unknown Event",
    course: row.course || "",
    time: row.time || raw["Swim Time"] || "-",
    timeSeconds: Number(row.time_seconds),
    meet: row.meet || raw.Meet || "Unknown Meet",
    age: row.age || raw.Age || "",
    points: row.points || raw.Points || "",
    team: row.team || raw.Team || "",
    standard: row.standard || raw["Time Standard"] || "",
    rank: row.rank || "",
    stroke,
    raw
  };
}

function raceEventCourseKey(race) {
  return `${race.event}|${race.course}`;
}

function raceSeasonKey(race) {
  if (!race.date) return "Unknown season";
  const date = new Date(race.date);
  if (Number.isNaN(date.getTime())) return "Unknown season";
  const startYear = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  const endYear = String(startYear + 1).slice(-2);
  return `${startYear}-${endYear}|${race.course}`;
}

function annotateRaceBadges(races) {
  const epsilon = 0.001;
  const byEventCourse = new Map();
  races.forEach((race) => {
    race.badges = [];
    if (!Number.isFinite(race.timeSeconds)) return;
    const key = raceEventCourseKey(race);
    if (!byEventCourse.has(key)) byEventCourse.set(key, []);
    byEventCourse.get(key).push(race);
  });

  byEventCourse.forEach((items) => {
    const bestTime = Math.min(...items.map((race) => race.timeSeconds));
    items.forEach((race) => {
      if (Math.abs(race.timeSeconds - bestTime) <= epsilon) {
        race.badges.push("PR");
      }
    });

    const bySeason = new Map();
    items.forEach((race) => {
      const seasonKey = raceSeasonKey(race);
      if (!bySeason.has(seasonKey)) bySeason.set(seasonKey, []);
      bySeason.get(seasonKey).push(race);
    });
    bySeason.forEach((seasonItems) => {
      const seasonBest = Math.min(...seasonItems.map((race) => race.timeSeconds));
      seasonItems.forEach((race) => {
        if (Math.abs(race.timeSeconds - seasonBest) <= epsilon) {
          race.badges.push("SB");
        }
      });
    });

    let previousBest = Infinity;
    [...items]
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a.index - b.index)
      .forEach((race) => {
        if (race.timeSeconds < previousBest - epsilon || Math.abs(race.timeSeconds - previousBest) <= epsilon) {
          race.badges.push("PB");
          previousBest = Math.min(previousBest, race.timeSeconds);
        }
      });
  });
  return races;
}

function normalizeRaces(csvText) {
  return annotateRaceBadges(parseCsv(csvText).map((row, index) => normalizeRace(row, index)))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getCurrentRaceSeason() {
  const latestRace = state.races
    .filter((race) => race.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  return latestRace ? raceSeasonKey(latestRace).split("|")[0] : null;
}

function bestRaceIds(races) {
  const best = new Map();
  races.forEach((race) => {
    const key = `${race.event}|${race.course}`;
    const current = best.get(key);
    if (!current || race.timeSeconds < current.timeSeconds) {
      best.set(key, race);
    }
  });
  return new Set([...best.values()].map((race) => race.id));
}

function filteredRaces() {
  let races = [...state.races];
  const filters = state.raceFilters;

  if (filters.stroke !== "all") {
    races = races.filter((race) => race.stroke === filters.stroke);
  }
  if (filters.course !== "all") {
    races = races.filter((race) => String(race.course).toLowerCase() === filters.course);
  }
  if (filters.currentOnly) {
    const season = getCurrentRaceSeason();
    races = races.filter((race) => raceSeasonKey(race).split("|")[0] === season);
  }
  if (filters.bestOnly) {
    const bestIds = bestRaceIds(races);
    races = races.filter((race) => bestIds.has(race.id));
  }

  return races;
}

function groupRaces(races) {
  const groups = new Map();
  races.forEach((race) => {
    const key = state.raceFilters.groupBy === "stroke" ? strokeLabel(race.stroke) : race.meet;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(race);
  });

  return [...groups.entries()].map(([label, items]) => ({
    label,
    items: items.sort((a, b) => new Date(b.date) - new Date(a.date))
  }));
}

function renderSummary(summary) {
  document.getElementById("summary").innerHTML = [
    metric("Workouts", fmt.format(summary.workout_count)),
    metric("Distance", `${fmt.format(summary.total_distance_km)} km`),
    metric("Active swim", `${fmt.format(summary.total_swim_hours)} hr`),
    metric("Inferred rest", `${fmt.format(summary.total_rest_hours)} hr`)
  ].join("");
}

function renderWeekly(weekly) {
  destroyChart("weekly");
  if (!weekly.length) {
    return;
  }

  state.charts.weekly = new Chart(document.getElementById("weeklyChart"), {
    type: "line",
    data: {
      labels: weekly.map((row) => row.label),
      datasets: [
        {
          label: "Distance km",
          data: weekly.map((row) => row.distance_km),
          borderColor: "#38d5ff",
          backgroundColor: "rgba(56, 213, 255, 0.16)",
          tension: 0.25,
          yAxisID: "y"
        },
        {
          label: "HR load",
          data: weekly.map((row) => row.simple_hr_load),
          borderColor: "#ff4f70",
          backgroundColor: "rgba(255, 79, 112, 0.14)",
          tension: 0.25,
          yAxisID: "y1"
        }
      ]
    },
    options: chartOptions()
  });
}

function renderStrokes(strokes) {
  destroyChart("strokes");
  if (!strokes.length) {
    return;
  }

  state.charts.strokes = new Chart(document.getElementById("strokeChart"), {
    type: "doughnut",
    data: {
      labels: strokes.map((row) => row.stroke),
      datasets: [{
        data: strokes.map((row) => row.distance_km),
        backgroundColor: ["#38d5ff", "#ffe66d", "#a77cff", "#65f0b4", "#ff9f43", "#ff4f70", "#9aa4b2"]
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: "#f8fbff" } }
      }
    }
  });
}

function renderCorrelations(correlations) {
  const rows = Object.entries(correlations)
    .sort((a, b) => Math.abs(b[1] ?? 0) - Math.abs(a[1] ?? 0))
    .map(([key, value]) => {
      const cls = value >= 0 ? "positive" : "negative";
      return `<div class="row"><span>${key.replaceAll("_", " ")}</span><strong class="${cls}">${fmt2.format(value ?? 0)}</strong></div>`;
    });
  document.getElementById("correlations").innerHTML = rows.join("");
}

function renderFastest(workouts) {
  const rows = workouts
    .filter((row) => row.distance_m > 0 && row.pace_50_s)
    .sort((a, b) => a.pace_50_s - b.pace_50_s)
    .slice(0, 8)
    .map((row) => `<a class="row-link" href="#/workout/${row.id}"><span>${row.date} - ${fmt.format(row.distance_km)} km</span><strong>${fmt2.format(row.pace_50_s)} s</strong></a>`);
  document.getElementById("fastest").innerHTML = rows.join("");
}

function renderOverview() {
  renderSummary(state.summary);
  renderWeekly(state.weekly);
  renderStrokes(state.strokes);
  renderCorrelations(state.correlations);
  renderFastest(state.workouts);
}

function phaseLabel(phase) {
  return (phase || "unclassified")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metricValue(rows, metricNames) {
  const names = Array.isArray(metricNames) ? metricNames : [metricNames];
  const row = rows.find((item) => {
    const key = item.metric || item.anchor || item.name || item.label || "";
    return names.includes(key);
  });
  if (!row) {
    return null;
  }
  return row.value || row.bpm || row.heart_rate_bpm || row.hr || null;
}

function getLthrProxy() {
  return Number(metricValue(state.hrAnchors, [
    "lthr_proxy_from_avg_hr_p90",
    "lthr_proxy",
    "inferred_lthr",
    "lthr"
  ]));
}

function getObservedMaxHr() {
  return Number(metricValue(state.hrAnchors, [
    "observed_hr_max",
    "max_hr",
    "observed_max_hr"
  ]));
}

const LTHR_ZONE_DEFS = [
  { label: "Z1", text: "Recovery", min: 0.00, max: 0.85, color: "#94a3b8" },
  { label: "Z2", text: "Aerobic", min: 0.85, max: 0.90, color: "#3b82f6" },
  { label: "Z3", text: "Steady", min: 0.90, max: 0.95, color: "#22c55e" },
  { label: "Z4", text: "Threshold", min: 0.95, max: 1.00, color: "#facc15" },
  { label: "Z5", text: "VO2 / hard", min: 1.00, max: 1.06, color: "#f97316" },
  { label: "Z6", text: "Anaerobic", min: 1.06, max: Infinity, color: "#ef4444" }
];

function lthrZoneForHr(hr, lthr = getLthrProxy()) {
  if (!hr || !lthr) {
    return { label: "-", text: "No HR", ratio: 0, className: "zone-none" };
  }
  const ratio = hr / lthr;
  const index = LTHR_ZONE_DEFS.findIndex((zone) => ratio >= zone.min && ratio < zone.max);
  const zone = LTHR_ZONE_DEFS[index >= 0 ? index : LTHR_ZONE_DEFS.length - 1];
  return { ...zone, ratio, className: zone.label.toLowerCase() };
}

function hrZonePosition(hr, lthr = getLthrProxy()) {
  if (!hr || !lthr) return null;
  const ratio = hr / lthr;
  return Math.max(0, Math.min(100, ((ratio - 0.70) / 0.44) * 100));
}

function hrSamples(rawWorkout) {
  return (rawWorkout?.heartRateSamples || [])
    .map((sample) => ({
      bpm: Number(sample.bpm || sample.heartRate || sample.value),
      time: new Date(sample.date || sample.startDate || sample.endDate).getTime()
    }))
    .filter((sample) => Number.isFinite(sample.bpm) && Number.isFinite(sample.time))
    .sort((a, b) => a.time - b.time);
}

function workoutHrStats(workout, rawWorkout = {}) {
  const samples = hrSamples(rawWorkout);
  const sampleBpms = samples.map((sample) => sample.bpm);
  const avgFromSamples = sampleBpms.length ? sampleBpms.reduce((a, b) => a + b, 0) / sampleBpms.length : 0;
  return {
    avg: Number(workout?.avg_hr) || Number(rawWorkout?.heartRate?.average) || avgFromSamples || 0,
    min: Number(workout?.min_hr) || (sampleBpms.length ? Math.min(...sampleBpms) : 0),
    max: Number(workout?.max_hr) || Number(rawWorkout?.heartRate?.maximum) || (sampleBpms.length ? Math.max(...sampleBpms) : 0)
  };
}

function renderWorkoutHrZoneBar(workout, rawWorkout = {}) {
  const lthr = getLthrProxy();
  const stats = workoutHrStats(workout, rawWorkout);
  if (!stats.avg || !lthr) {
    return `<span class="hr-zone-cell muted">No HR zone</span>`;
  }
  const zone = lthrZoneForHr(stats.avg, lthr);
  const avgPosition = hrZonePosition(stats.avg, lthr);
  const minPosition = hrZonePosition(stats.min, lthr);
  const maxPosition = hrZonePosition(stats.max, lthr);
  const rangeLeft = Math.min(minPosition ?? avgPosition, maxPosition ?? avgPosition);
  const rangeRight = Math.max(minPosition ?? avgPosition, maxPosition ?? avgPosition);
  const rangeWidth = Math.max(2, rangeRight - rangeLeft);
  const rangeText = stats.min && stats.max ? `${Math.round(stats.min)}-${Math.round(stats.max)} bpm` : `${Math.round(stats.avg)} bpm`;
  return `<span class="hr-zone-cell" title="Average HR is ${fmt2.format(zone.ratio)}x the inferred LTHR proxy; range ${rangeText}">
    <span class="hr-zone-label"><strong>${zone.label}</strong> ${zone.text} <small>${rangeText}</small></span>
    <span class="hr-zone-bar" aria-hidden="true">
      <span class="hr-zone-range" style="left:${rangeLeft}%;width:${rangeWidth}%"></span>
      <span class="hr-zone-marker" style="left:${avgPosition}%"></span>
    </span>
  </span>`;
}

function averageBpmInWindow(samples, start, end) {
  const values = samples.filter((sample) => sample.time >= start && sample.time <= end).map((sample) => sample.bpm);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeWorkoutHrTransitions(rawWorkout) {
  const samples = hrSamples(rawWorkout);
  const events = (rawWorkout?.events || [])
    .map((event) => ({
      start: new Date(event.startDate).getTime(),
      end: new Date(event.endDate).getTime(),
      type: event.type || "Event"
    }))
    .filter((event) => Number.isFinite(event.start) && Number.isFinite(event.end) && event.end > event.start);
  if (!samples.length || !events.length) {
    return { riseValues: [], dropValues: [], riseRates: [], dropRates: [] };
  }
  const riseValues = [];
  const dropValues = [];
  const riseRates = [];
  const dropRates = [];
  events.forEach((event) => {
    const beforeStart = averageBpmInWindow(samples, event.start - 90000, event.start);
    const afterStart = averageBpmInWindow(samples, event.start, event.start + 90000);
    const beforeEnd = averageBpmInWindow(samples, event.end - 90000, event.end);
    const afterEnd = averageBpmInWindow(samples, event.end, event.end + 120000);
    if (beforeStart !== null && afterStart !== null && afterStart > beforeStart) {
      const rise = afterStart - beforeStart;
      riseValues.push(rise);
      riseRates.push(rise / 1.5);
    }
    if (beforeEnd !== null && afterEnd !== null && beforeEnd > afterEnd) {
      const drop = beforeEnd - afterEnd;
      dropValues.push(drop);
      dropRates.push(drop / 2);
    }
  });
  return { riseValues, dropValues, riseRates, dropRates };
}

function summarizeHrTransitions() {
  const allRise = [];
  const allDrop = [];
  const allRiseRates = [];
  const allDropRates = [];
  Object.values(state.rawWorkouts).forEach((rawWorkout) => {
    const metrics = computeWorkoutHrTransitions(rawWorkout);
    allRise.push(...metrics.riseValues);
    allDrop.push(...metrics.dropValues);
    allRiseRates.push(...metrics.riseRates);
    allDropRates.push(...metrics.dropRates);
  });
  const avg = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return {
    avgRise: avg(allRise),
    avgDrop: avg(allDrop),
    avgRiseRate: avg(allRiseRates),
    avgDropRate: avg(allDropRates),
    riseCount: allRise.length,
    dropCount: allDrop.length
  };
}

function stddev(values) {
  if (values.length < 2) return 0;
  const avg = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + ((value - avg) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function phaseGroup(row) {
  const phase = String(row.load_phase || row.phase || row.phase_pattern || "").toLowerCase();
  if (phase.includes("unload") || phase.includes("recovery") || phase.includes("deload") || phase.includes("low")) return "unload";
  if (phase.includes("load") || phase.includes("build") || phase.includes("peak") || phase.includes("high")) return "load";
  if (phase.includes("hold") || phase.includes("maintain") || phase.includes("stable")) return "hold";
  return "mixed";
}

function preparedPeriodizationScore() {
  const row = state.periodizationSummary?.[0];
  if (!row) return null;
  const score = num(row, "value", NaN);
  if (!Number.isFinite(score)) return null;
  const label = row.label || (score >= 70 ? "Strong waves" : score >= 45 ? "Moderate waves" : score >= 25 ? "Light waves" : "Mostly steady");
  const amplitude = num(row, "rolling_4w_load_amplitude");
  const unload = num(row, "unload_frequency") * 100;
  const alternation = num(row, "loading_unloading_alternation") * 100;
  return {
    score,
    label,
    details: `${label}: 4-week amplitude ${fmt2.format(amplitude)}, unload frequency ${fmt2.format(unload)}%, alternation ${fmt2.format(alternation)}%.`
  };
}

function periodizationScore(weeks, phases) {
  const prepared = preparedPeriodizationScore();
  if (prepared) return prepared;
  const ordered = [...weeks]
    .filter((row) => row.week_start)
    .sort((a, b) => new Date(a.week_start) - new Date(b.week_start));
  const loads = ordered.map((row) => num(row, "total_combined_load")).filter((value) => value >= 0);
  const nonZeroLoads = loads.filter((value) => value > 0);
  if (nonZeroLoads.length < 4) {
    return { score: 0, label: "Pending", details: "Needs at least four weekly load rows." };
  }

  const rollingAmplitudes = [];
  for (let index = 0; index <= loads.length - 4; index += 1) {
    const window = loads.slice(index, index + 4);
    const avg = window.reduce((total, value) => total + value, 0) / window.length;
    if (avg > 0) {
      rollingAmplitudes.push((Math.max(...window) - Math.min(...window)) / avg);
    }
  }
  const rolling4wLoadAmplitude = rollingAmplitudes.length
    ? rollingAmplitudes.reduce((total, value) => total + value, 0) / rollingAmplitudes.length
    : 0;

  const phaseRows = phases.length ? phases : ordered;
  const phaseGroups = phaseRows.map(phaseGroup);
  const unloadFrequency = phaseGroups.filter((phase) => phase === "unload").length / Math.max(1, phaseGroups.length);
  let alternations = 0;
  for (let index = 1; index < phaseGroups.length; index += 1) {
    const pair = `${phaseGroups[index - 1]}:${phaseGroups[index]}`;
    if (pair === "load:unload" || pair === "unload:load" || pair === "load:mixed" || pair === "mixed:unload") {
      alternations += 1;
    }
  }
  const loadingUnloadingAlternation = alternations / Math.max(1, phaseGroups.length - 1);
  const loadMean = nonZeroLoads.reduce((total, value) => total + value, 0) / nonZeroLoads.length;
  const loadVariability = loadMean > 0 ? stddev(nonZeroLoads) / loadMean : 0;
  const missingDataPenalty = loads.filter((value) => value <= 0).length / loads.length;

  const score = clamp(
    (rolling4wLoadAmplitude * 28) +
    (unloadFrequency * 22) +
    (loadingUnloadingAlternation * 26) +
    (loadVariability * 24) -
    (missingDataPenalty * 18),
    0,
    100
  );
  const label = score >= 70 ? "Strong waves" : score >= 45 ? "Moderate waves" : score >= 25 ? "Light waves" : "Mostly steady";
  return {
    score,
    label,
    details: `${label}: 4-week amplitude ${fmt2.format(rolling4wLoadAmplitude)}, unload frequency ${fmt2.format(unloadFrequency * 100)}%, alternation ${fmt2.format(loadingUnloadingAlternation * 100)}%.`
  };
}
function renderTraining() {
  const weeks = state.weeklyPhysiology.length ? state.weeklyPhysiology : state.weeklyTraining;
  const phases = state.loadPhases.length ? state.loadPhases : weeks;
  const summary = document.getElementById("training-summary");
  const phaseRows = document.getElementById("phase-summary-rows");
  const timeline = document.getElementById("phase-timeline");

  if (!weeks.length) {
    summary.innerHTML = renderInsightCard(
      "Prepared training data",
      "Not loaded",
      "Run the ingestion and physiology notebooks so the web app can read weekly training outputs."
    );
    phaseRows.innerHTML = `<tr><td colspan="6">No training phase data found.</td></tr>`;
    timeline.innerHTML = `<p class="empty-note">No weekly phase timeline is available yet.</p>`;
    return;
  }

  const totalDistance = sum(weeks, "total_distance_km");
  const peakLoad = Math.max(...weeks.map((row) => num(row, "total_combined_load")));
  const avgSessions = mean(weeks, "sessions");
  const avgNearMax = mean(weeks, "total_near_max_min");
  const periodization = periodizationScore(weeks, phases);

  summary.innerHTML = [
    renderInsightCard("Weeks analyzed", weeks.length, "This is the number of prepared weekly rows available to the app."),
    renderInsightCard("Average sessions", fmt2.format(avgSessions), "A quick check for training consistency and missing-session patterns."),
    renderInsightCard("Total distance", `${fmt.format(totalDistance)} km`, "This captures training volume across the prepared workout history."),
    renderInsightCard("Peak weekly load", fmt.format(peakLoad), "The highest combined weekly load helps identify the biggest stress weeks."),
    renderInsightCard("Near-max HR", `${fmt.format(avgNearMax)} min/week`, "This estimates how much high-intensity heart-rate exposure occurred."),
    renderInsightCard("Periodization score", `${fmt.format(periodization.score)} / 100`, periodization.details)
  ].join("");

  const ordered = [...weeks].sort((a, b) => new Date(a.week_start) - new Date(b.week_start));
  const labels = ordered.map((row) => compactDate(row.week_start));
  state.charts.trainingLoad = new Chart(document.getElementById("trainingLoadChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Combined load",
          data: ordered.map((row) => num(row, "total_combined_load")),
          borderColor: "#5eead4",
          backgroundColor: "rgba(94,234,212,0.16)",
          tension: 0.28,
          yAxisID: "y"
        },
        {
          label: "Distance (km)",
          data: ordered.map((row) => num(row, "total_distance_km")),
          borderColor: "#fbbf24",
          backgroundColor: "rgba(251,191,36,0.14)",
          tension: 0.28,
          yAxisID: "y1"
        }
      ]
    },
    options: chartOptions()
  });

  const phaseCounts = phases.reduce((acc, row) => {
    const key = phaseLabel(row.load_phase || row.phase || row.phase_pattern);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  state.charts.phaseCount = new Chart(document.getElementById("phaseCountChart"), {
    type: "bar",
    data: {
      labels: Object.keys(phaseCounts),
      datasets: [{
        label: "Weeks",
        data: Object.values(phaseCounts),
        backgroundColor: ["#5eead4", "#f97316", "#38bdf8", "#f472b6", "#a3e635", "#c084fc"]
      }]
    },
    options: chartOptions()
  });

  phaseRows.innerHTML = state.phaseSummary.length
    ? state.phaseSummary.map((row) => `
      <tr>
        <td>${phaseLabel(row.load_phase || row.phase)}</td>
        <td>${row.weeks || row.week_count || "-"}</td>
        <td>${fmt.format(num(row, "avg_load", num(row, "mean_load")))}</td>
        <td>${fmt.format(num(row, "avg_distance_km", num(row, "mean_distance_km")))}</td>
        <td>${fmt.format(num(row, "avg_hr", num(row, "mean_avg_hr")))}</td>
        <td>${fmt2.format(num(row, "avg_acr", num(row, "mean_acute_chronic_ratio")))}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">Run the load phase notebook to create the phase summary table.</td></tr>`;

  timeline.innerHTML = latestRows(phases, 10).map((row) => `
    <article class="timeline-card">
      <span>${compactDate(row.week_start)}</span>
      <strong>${phaseLabel(row.load_phase || row.phase || row.phase_pattern)}</strong>
      <p>${fmt.format(num(row, "total_distance_km"))} km, ${fmt.format(num(row, "total_combined_load"))} load, ${fmt2.format(num(row, "acute_chronic_ratio"))} ACR.</p>
    </article>
  `).join("");
}


function correlationStrength(value) {
  const abs = Math.abs(value);
  if (abs >= 0.70) return "strong";
  if (abs >= 0.40) return "moderate";
  if (abs >= 0.20) return "weak";
  return "very weak";
}

function correlationDirection(value) {
  if (value > 0.05) return "positive";
  if (value < -0.05) return "negative";
  return "near-zero";
}

function metricDisplayName(metric) {
  const key = String(metric || "");
  const names = {
    total_combined_load: "combined training load",
    total_simple_hr_load: "simple HR load",
    total_zone_weighted_load: "zone-weighted load",
    total_distance_km: "distance",
    total_duration_min: "duration",
    total_active_zone_minutes: "active-zone minutes",
    total_near_max_min: "near-max HR minutes",
    max_hr: "max HR",
    mean_avg_hr: "mean average HR",
    mean_hrr_intensity: "mean HRR intensity",
    mean_active_zone_share: "active-zone share",
    mean_sample_zone_depth: "sample zone depth",
    mean_active_zone_depth: "active zone depth",
    mean_hr_efficiency_proxy: "HR efficiency proxy",
    mean_pace_50_s: "mean pace per 50"
  };
  return names[key] || key.replaceAll("_", " ") || "metric";
}

function correlationMetricFamily(metric) {
  const text = String(metric || "").toLowerCase();
  if (text.includes("combined_load")) return "combined load";
  if (text.includes("simple_hr_load")) return "simple HR load";
  if (text.includes("zone_weighted_load")) return "zone-weighted load";
  if (text.includes("distance") || text.includes("duration")) return "volume";
  if (text.includes("near_max")) return "near-max HR exposure";
  if (text.includes("active_zone")) return "active-zone exposure";
  if (text.includes("avg_hr") || text.includes("hrr") || text === "max_hr") return "HR level";
  if (text.includes("pace")) return "pace";
  if (text.includes("efficiency")) return "efficiency proxy";
  if (text.includes("load")) return "training load";
  return "metric";
}

function explainCorrelationRow(row) {
  const xKey = row.load_metric || row.x_metric || row.metric_x || row.feature || "";
  const yKey = row.hr_metric || row.y_metric || row.metric_y || row.target || "";
  const x = metricDisplayName(xKey);
  const y = metricDisplayName(yKey);
  const r = num(row, "correlation", num(row, "r"));
  const nWeeks = Number(row.n_weeks) || null;
  const direction = correlationDirection(r);
  const strength = correlationStrength(r);
  const xFamily = correlationMetricFamily(xKey || x);
  const yFamily = correlationMetricFamily(yKey || y);
  const sampleText = nWeeks ? `across ${nWeeks} weekly observations` : "across weekly observations";
  const directionText = direction === "positive"
    ? `higher ${x} tended to appear with higher ${y}`
    : direction === "negative"
      ? `higher ${x} tended to appear with lower ${y}`
      : `there was little linear movement between ${x} and ${y}`;
  return {
    x,
    y,
    xKey,
    yKey,
    r,
    nWeeks,
    direction,
    strength,
    family: `${xFamily} vs ${yFamily}`,
    interpretation: row.interpretation || `This is a ${strength} ${direction} relationship ${sampleText}: ${directionText}.`
  };
}
function summarizeHrZoneDistribution() {
  const defaultZones = [
    { label: "Z1", color: "#94a3b8" },
    { label: "Z2", color: "#38bdf8" },
    { label: "Z3", color: "#22c55e" },
    { label: "Z4", color: "#facc15" },
    { label: "Z5", color: "#fb923c" },
    { label: "Z6", color: "#ef4444" }
  ];

  if (state.hrZoneDistribution.length) {
    const zones = state.hrZoneDistribution.map((row, index) => ({
      label: row.zone || defaultZones[index]?.label || `Z${index + 1}`,
      detail: row.label || row.zone || defaultZones[index]?.label || `Z${index + 1}`,
      color: row.color || defaultZones[index]?.color || "#94a3b8",
      share: num(row, "share")
    }));
    const totals = state.hrZoneDistribution.map((row) => num(row, "minutes"));
    if (totals.some((value) => value > 0)) {
      return { zones, totals, source: "prepared raw-sample LTHR distribution" };
    }
  }

  const zones = [
    { label: "Z1", keys: ["sample_z1_minutes", "z1_minutes", "zone1_minutes"], color: "#94a3b8" },
    { label: "Z2", keys: ["sample_z2_minutes", "z2_minutes", "zone2_minutes"], color: "#38bdf8" },
    { label: "Z3", keys: ["sample_z3_minutes", "z3_minutes", "zone3_minutes"], color: "#22c55e" },
    { label: "Z4", keys: ["sample_z4_minutes", "z4_minutes", "zone4_minutes"], color: "#facc15" },
    { label: "Z5", keys: ["sample_z5_minutes", "z5_minutes", "zone5_minutes"], color: "#fb923c" },
    { label: "Z6", keys: ["sample_z6_minutes", "z6_minutes", "zone6_minutes"], color: "#ef4444" }
  ];
  const totals = zones.map((zone) => state.workouts.reduce((sum, row) => {
    const value = zone.keys.reduce((found, key) => found || num(row, key), 0);
    return sum + value;
  }, 0));

  return { zones, totals, source: "workout zone-minute fields" };
}
function renderPhysiology() {
  const weeks = state.weeklyPhysiology;
  const summary = document.getElementById("physiology-summary");
  const zoneModel = document.getElementById("zone-model");
  const correlations = document.getElementById("load-hr-correlations");
  const transitions = document.getElementById("transition-metrics");
  const lthr = getLthrProxy();
  const maxHr = getObservedMaxHr();
  const lthrMethod = state.hrZoneMethods.find((row) => row.method === "lthr_proxy_ratio");
  destroyChart("physiologyLoad");
  destroyChart("hrZoneDistribution");

  summary.innerHTML = [
    renderInsightCard("Primary zone model", lthr ? "LTHR proxy" : "Pending", "Zones are organized around the inferred lactate-threshold HR proxy when available."),
    renderInsightCard("LTHR proxy", lthr ? `${fmt.format(lthr)} bpm` : "Not found", "This estimates the HR level around sustained hard effort rather than age-only max HR."),
    renderInsightCard("Observed max HR", maxHr ? `${fmt.format(maxHr)} bpm` : "Not found", "This anchors the upper end of the athlete-specific heart-rate record."),
    renderInsightCard("Active zone depth", weeks.length ? fmt2.format(mean(weeks, "mean_active_zone_depth")) : "Pending", "Zone depth helps avoid calling interval workouts easy just because rests lower the average HR.")
  ].join("");

  if (weeks.length) {
    const ordered = [...weeks].sort((a, b) => new Date(a.week_start) - new Date(b.week_start));
    state.charts.physiologyLoad = new Chart(document.getElementById("physiologyLoadChart"), {
      type: "line",
      data: {
        labels: ordered.map((row) => compactDate(row.week_start)),
        datasets: [
          {
            label: "Combined load",
            data: ordered.map((row) => num(row, "total_combined_load")),
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56,189,248,0.14)",
            tension: 0.28,
            yAxisID: "y"
          },
          {
            label: "Mean avg HR",
            data: ordered.map((row) => num(row, "mean_avg_hr")),
            borderColor: "#fb7185",
            backgroundColor: "rgba(251,113,133,0.14)",
            tension: 0.28,
            yAxisID: "y1"
          },
          {
            label: "Near-max min",
            data: ordered.map((row) => num(row, "total_near_max_min")),
            borderColor: "#a3e635",
            backgroundColor: "rgba(163,230,53,0.12)",
            tension: 0.28,
            yAxisID: "y1"
          }
        ]
      },
      options: chartOptions()
    });
  }

  const zoneDistribution = summarizeHrZoneDistribution();
  const zoneDistributionCanvas = document.getElementById("hrZoneDistributionChart");
  if (zoneDistributionCanvas && zoneDistribution.totals.some((value) => value > 0)) {
    state.charts.hrZoneDistribution = new Chart(zoneDistributionCanvas, {
      type: "bar",
      data: {
        labels: zoneDistribution.zones.map((zone) => zone.label),
        datasets: [{
          label: "Minutes",
          data: zoneDistribution.totals,
          backgroundColor: zoneDistribution.zones.map((zone) => zone.color),
          borderColor: zoneDistribution.zones.map((zone) => zone.color),
          borderWidth: 1
        }]
      },
      options: {
        ...chartOptions(),
        plugins: {
          ...chartOptions().plugins,
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${fmt.format(context.parsed.y)} min`,
              afterBody: (items) => {
                const index = items?.[0]?.dataIndex ?? 0;
                const zone = zoneDistribution.zones[index];
                const share = zone?.share ? ` (${fmt2.format(zone.share * 100)}%)` : "";
                return `${zone?.detail || zone?.label || "Zone"}${share}\nSource: ${zoneDistribution.source}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "rgba(248,251,255,0.78)" },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: "Estimated minutes", color: "#f8fbff" },
            ticks: { color: "rgba(248,251,255,0.68)" },
            grid: { color: "rgba(255,255,255,0.08)" }
          }
        }
      }
    });
  }
  const zoneRows = lthr
    ? LTHR_ZONE_DEFS.map((zone) => {
      const low = zone.min > 0 ? fmt.format(lthr * zone.min) : "";
      const high = Number.isFinite(zone.max) ? fmt.format(lthr * zone.max) : "";
      const range = zone.min === 0 ? `< ${high} bpm` : Number.isFinite(zone.max) ? `${low}-${high} bpm` : `> ${low} bpm`;
      const descriptions = {
        Z1: "Recovery or very easy aerobic work.",
        Z2: "Steady aerobic work with low strain.",
        Z3: "Moderate aerobic or steady work.",
        Z4: "Threshold-focused work near the inferred LTHR proxy.",
        Z5: "Very hard work just above the threshold proxy.",
        Z6: "Highest-intensity anaerobic or sprint-like HR response."
      };
      return [zone.label, range, descriptions[zone.label], zone.label.toLowerCase()];
    })
    : [
      ["Z1-Z6", "Pending", "Run the physiology notebook so the LTHR proxy can define zones.", "zone-none"]
    ];

  const methodCard = lthrMethod
    ? `<article class="zone-card zone-method">
      <strong>LTHR Proxy</strong>
      <span>${lthrMethod.formula}</span>
      <p>${lthrMethod.best_use} ${lthrMethod.main_caution}</p>
    </article>`
    : "";

  zoneModel.innerHTML = methodCard + zoneRows.map(([zone, range, text, className]) => `
    <article class="zone-card ${className}">
      <strong>${zone}</strong>
      <span>${range}</span>
      <p>${text}</p>
    </article>
  `).join("");

  correlations.innerHTML = state.loadHrCorrelations.length
    ? `<div class="correlation-explainer">
        <h3>How to read load-HR correlations</h3>
        <p>These are whole-history weekly correlations, not separate week-by-week results. Each card compares one weekly training/load metric with one weekly heart-rate or response metric.</p>
        <p>The <b>r</b> value shows direction and strength: positive means the two measures tended to rise together, while negative means one tended to fall as the other rose. The week count shows how many weekly observations were included in that calculation.</p>
      </div>` + [...state.loadHrCorrelations]
      .map(explainCorrelationRow)
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      .slice(0, 8)
      .map((item) => `
        <article class="insight-card compact correlation-card ${item.direction}">
          <span>${item.family}${item.nWeeks ? ` · ${item.nWeeks} weeks` : ""}</span>
          <strong>${item.x} ↔ ${item.y}</strong>
          <p><b>r = ${fmt2.format(item.r)}</b> (${item.strength} ${item.direction}).</p>
          <p>${item.interpretation}</p>
        </article>
      `).join("")
    : `<p class="empty-note">No load-HR correlation table is available yet.</p>`;

  const rawTransitionSummary = summarizeHrTransitions();
  const rise = mean(weeks, "mean_hr_rise_bpm") || rawTransitionSummary.avgRise;
  const drop = mean(weeks, "mean_hr_drop_bpm") || rawTransitionSummary.avgDrop;
  const riseRate = mean(weeks, "mean_hr_rise_bpm_per_min") || rawTransitionSummary.avgRiseRate;
  const dropRate = mean(weeks, "mean_hr_drop_bpm_per_min") || rawTransitionSummary.avgDropRate;
  transitions.innerHTML = rise || drop || riseRate || dropRate
    ? [
      renderInsightCard("Avg HR rise", `${fmt.format(rise)} bpm`, `Average rest-to-active increase from ${rawTransitionSummary.riseCount || "prepared"} transition samples.`),
      renderInsightCard("Rise rate", `${fmt.format(riseRate)} bpm/min`, "How quickly the cardiovascular response ramps up after work begins."),
      renderInsightCard("Avg HR drop", `${fmt.format(drop)} bpm`, `Average active-to-rest decrease from ${rawTransitionSummary.dropCount || "prepared"} transition samples.`),
      renderInsightCard("Drop rate", `${fmt.format(dropRate)} bpm/min`, "A faster drop can point toward stronger recovery response within sessions.")
    ].join("")
    : `<p class="empty-note">No HR transition metrics are available yet. Load the raw workout export with heart-rate samples and events to estimate rise/drop patterns.</p>`;
}

function renderFindings() {
  const julySummary = document.getElementById("july-summary");
  const gallery = document.getElementById("figure-gallery");

  julySummary.innerHTML = [
    renderInsightCard("Data foundation", "Workout + race data", "The site combines exported GoSwim workout data, prepared workout CSVs, and USA Swimming race results."),
    renderInsightCard("Training model", "Volume + load phases", "Weekly summaries organize distance, duration, combined load, and phase patterns so training changes are easier to interpret."),
    renderInsightCard("Physiology model", "LTHR-led zones", "Heart-rate interpretation uses the inferred LTHR proxy from the notebooks as the primary athlete-specific zone anchor."),
    renderInsightCard("Race model", "Best-time context", "Race results are viewed by event, stroke, meet, course, age, and percent-off-best rather than only raw time."),
    renderInsightCard("Evidence limits", "Proxy analysis", "The findings are useful for learning and pattern detection, but HR zones and thresholds are inferred rather than lab measured.")
  ].join("");

  if (state.racePreLoad.length) {
    state.charts.raceLoad = new Chart(document.getElementById("raceLoadChart"), {
      type: "scatter",
      data: {
        datasets: [{
          label: "Race",
          data: state.racePreLoad.map((row) => ({
            x: num(row, "pre_race_14d_load", num(row, "pre_14d_load")),
            y: num(row, "percent_off_best", num(row, "pct_off_best"))
          })),
          backgroundColor: "rgba(94,234,212,0.7)",
          borderColor: "#5eead4"
        }]
      },
      options: {
        ...chartOptions(),
        scales: {
          x: {
            title: { display: true, text: "14-day pre-race load", color: "#f8fbff" },
            ticks: { color: "rgba(248,251,255,0.68)" },
            grid: { color: "rgba(255,255,255,0.08)" }
          },
          y: {
            title: { display: true, text: "Percent off best", color: "#f8fbff" },
            ticks: { color: "rgba(248,251,255,0.68)" },
            grid: { color: "rgba(255,255,255,0.08)" }
          }
        }
      }
    });
  }

  const figures = [
    {
      src: "figures/scatter_load_nearmax.svg",
      title: "Weekly Combined Load vs Near-Max HR Minutes",
      metric: "Most useful metric: correlation between load and high-HR exposure.",
      text: "Weeks with higher combined load also tended to include more near-max HR minutes, so load was not just more volume; it often carried more intensity.",
      explains: "This scatterplot compares weekly combined training load with the number of near-max heart-rate minutes in the same week. Each point represents one week of training.",
      interpretation: "The upward pattern means the weeks with larger combined load generally also contained more high-heart-rate exposure. That matters because the load model is not only counting distance or duration; it is also reflecting intensity.",
      significance: "This is one of the strongest project-level findings. It supports using combined load as a meaningful training-stress summary, but it should still be interpreted carefully because near-max HR is part of the load construction."
    },
    {
      src: "figures/scatter_distance_pace.svg",
      title: "Weekly Distance vs Mean Pace per 50m",
      metric: "Most useful metric: direction and spread of the distance-pace relationship.",
      text: "Higher distance weeks were not automatically faster weeks, which supports separating volume from workout quality or intensity.",
      explains: "This graph compares how much the athlete swam in a week with the average workout pace for that week. Pace is measured in seconds per 50 meters, so lower values mean faster swimming.",
      interpretation: "The relationship is not strong enough to say distance alone explains speed. Some higher-volume weeks were faster, but the spread shows that workout type, effort, rest, and training phase also matter.",
      significance: "This helps justify the project design: volume alone is not enough. A stronger analysis needs HR, load, pace, and phase context together."
    },
    {
      src: "figures/scatter_prerace_load_performance.svg",
      title: "14-Day Pre-Race Load vs Race Performance",
      metric: "Most useful metric: percent off best after recent load.",
      text: "Recent load had a weak positive relationship with being farther from best time, suggesting fatigue may matter but does not explain every race result by itself.",
      explains: "This graph compares the training load in the 14 days before a race with how far that race was from the athlete's best known time for that event and course.",
      interpretation: "The positive direction suggests that higher recent load may sometimes line up with being farther from best performance. However, the relationship is weak, so it is not a complete explanation.",
      significance: "This is useful as a fatigue-context signal, not as proof. Race outcomes also depend on taper, event, course, meet context, sleep, health, and strategy."
    },
    {
      src: "figures/distribution_weekly_load.svg",
      title: "Distribution of Weekly Combined Load",
      metric: "Most useful metric: median and upper-tail load weeks.",
      text: "Most weeks clustered around moderate load, while a smaller number of high-load weeks likely represent the strongest stress periods.",
      explains: "This distribution shows how weekly combined load values are spread across the training history.",
      interpretation: "The center of the distribution represents typical training weeks. The upper tail represents unusually high-load weeks that may be more stressful or more important in phase analysis.",
      significance: "This supports using load phases. If every week had similar load, phase labels would add little value. Because load varies widely, classifying loading, recovery, and mixed weeks is meaningful."
    },
    {
      src: "figures/distribution_race_percent_off_best.svg",
      title: "Distribution of Race Percent Off Best",
      metric: "Most useful metric: center and right tail of percent off best.",
      text: "Race outcomes were not evenly spread; the right tail highlights races where performance was much farther from prior best.",
      explains: "This distribution shows how close or far races were from the athlete's best known performance in the same event and course.",
      interpretation: "Many races cluster within a moderate distance from best time, while some races are much farther away. Those farther-off races may reflect age, event context, training state, or non-training factors.",
      significance: "This graph helps avoid overreacting to any single race. Race performance has natural spread, so the project compares races against context instead of treating every result as equally meaningful."
    },
    {
      src: "figures/correlation_matrix_weekly_physiology.svg",
      title: "Weekly Physiology Correlation Matrix",
      metric: "Most useful metric: strongest positive and negative correlations.",
      text: "The matrix shows that load, HR, pace, and efficiency are connected but not interchangeable, so the project needs multiple views.",
      explains: "The correlation matrix summarizes many pairwise relationships among weekly training, HR, pace, load, and efficiency variables.",
      interpretation: "Some variables move closely together, while others have weak relationships. This means no single metric can explain the whole training picture.",
      significance: "This is a scientific guardrail. It shows why the analysis should use multiple metrics and why a simple one-variable explanation would be too narrow."
    },
    {
      src: "figures/boxplot_load_by_phase.svg",
      title: "Weekly Load by Phase Pattern",
      metric: "Most useful metric: phase medians and spread.",
      text: "Loading weeks show higher load distributions than recovery-type weeks, which gives the phase labels practical meaning.",
      explains: "This figure compares weekly load distributions across phase labels such as loading, mixed, unloading, holding, and recovery.",
      interpretation: "The phase groups separate load in a sensible way. Loading weeks tend to be higher-load, recovery weeks lower-load, and mixed or unloading weeks sit between them.",
      significance: "This validates the phase-labeling approach as a useful summary of the training calendar. It does not prove that a phase caused race performance, but it gives the project a stronger structure for interpretation."
    }
  ];
  state.findingsFigures = figures;
  gallery.innerHTML = figures.map((figure, index) => `
    <button type="button" class="figure-card" data-figure-index="${index}" aria-label="Open details for ${figure.title}">
      <img src="${figure.src}" alt="${figure.title}">
      <div class="figure-caption">
        <h3>${figure.title}</h3>
        <span>${figure.metric}</span>
        <p>${figure.text}</p>
      </div>
    </button>
  `).join("");
}

function openFigureModal(index) {
  const figure = state.findingsFigures[Number(index)];
  if (!figure) return;
  document.getElementById("figure-modal-title").textContent = figure.title;
  document.getElementById("figure-modal-kicker").textContent = figure.metric;
  const image = document.getElementById("figure-modal-image");
  image.src = figure.src;
  image.alt = figure.title;
  document.getElementById("figure-modal-body").innerHTML = `
    <section>
      <h3>What the graph shows</h3>
      <p>${figure.explains}</p>
    </section>
    <section>
      <h3>Interpretation</h3>
      <p>${figure.interpretation}</p>
    </section>
    <section>
      <h3>Inferred significance</h3>
      <p>${figure.significance}</p>
    </section>
  `;
  document.getElementById("figure-modal").classList.remove("hidden");
}

function closeFigureModal() {
  document.getElementById("figure-modal").classList.add("hidden");
}

function renderWorkoutList() {
  const sorted = [...state.workouts].sort((a, b) => new Date(b.start) - new Date(a.start));
  const body = document.getElementById("workout-list");

  if (!sorted.length) {
    body.innerHTML = `<div class="row">No workouts found.</div>`;
    return;
  }

  body.innerHTML = sorted
    .map((workout) => {
      const raw = state.rawWorkouts[workout.id] || {};
      return `<a class="table-row" href="#/workout/${workout.id}">
        <span>${formatDate(workout.start)}</span>
        <span>${fmt.format(workout.distance_km)} km</span>
        <span>${durationFromSeconds(workout.duration_s)}</span>
        <span>${workout.avg_hr ? `${Math.round(workout.avg_hr)} bpm` : "-"}</span>
        ${renderWorkoutHrZoneBar(workout, raw)}
        <span>${raw.sourceName || "-"}</span>
      </a>`;
    })
    .join("");
}

function renderSplitRows(splits) {
  const body = document.getElementById("split-rows");
  if (!splits.length) {
    body.innerHTML = `<tr><td colspan="4">No split points available.</td></tr>`;
    return;
  }

  body.innerHTML = splits
    .map((split) => {
      return `<tr>
        <td>${split.id}</td>
        <td>${split.cumulativeDistanceMeters}</td>
        <td>${split.stroke}</td>
        <td>${fmt2.format(split.paceSecondsPer50)}</td>
      </tr>`;
    })
    .join("");
}

function renderStrokeRows(strokes) {
  const body = document.getElementById("stroke-summary-rows");
  if (!strokes.length) {
    body.innerHTML = `<tr><td colspan="5">No stroke summary available.</td></tr>`;
    return;
  }

  body.innerHTML = strokes
    .map((stroke) => {
      const distanceKm = (stroke.distanceMeters || 0) / 1000;
      const pace = (stroke.duration || 0) / Math.max((stroke.distanceMeters || 1), 1) * 50;
      return `<tr>
        <td>${stroke.stroke}</td>
        <td>${fmt2.format(distanceKm)} km</td>
        <td>${durationFromSeconds(stroke.duration || 0)}</td>
        <td>${Math.round(stroke.strokeCount || 0)}</td>
        <td>${paceFromSeconds(pace)}</td>
      </tr>`;
    })
    .join("");
}

function renderEventRows(events) {
  const container = document.getElementById("event-list");
  if (!events.length) {
    container.innerHTML = "<div class='row'>No events available.</div>";
    return;
  }

  container.innerHTML = events
    .map((event) => {
      const label = event.strokeStyle ? `${event.type} (${event.strokeStyle})` : event.type;
      return `<div class="row"><span>${label}</span><strong>${durationFromSeconds(event.duration)}</strong></div>`;
    })
    .join("");
}

function renderSplitChart(splits) {
  destroyChart("splits");
  if (!splits.length) {
    return;
  }

  state.charts.splits = new Chart(document.getElementById("splitPaceChart"), {
    type: "line",
    data: {
      labels: splits.map((split) => split.cumulativeDistanceMeters),
      datasets: [
        {
          label: "Pace / 50m",
          data: splits.map((split) => split.paceSecondsPer50),
          borderColor: "#65f0b4",
          backgroundColor: "rgba(101, 240, 180, 0.16)",
          tension: 0.2
        }
      ]
    },
    options: chartOptions()
  });
}

function renderHrChart(rawWorkout) {
  destroyChart("hr");
  const canvas = document.getElementById("hrSampleChart");
  const samples = rawWorkout?.heartRateSamples || [];
  if (!samples.length) {
    return;
  }

  const sampleStart = new Date(rawWorkout.startDate).getTime();
  const skip = Math.max(1, Math.ceil(samples.length / 500));
  const sampled = samples.filter((_, index) => index % skip === 0);

  state.charts.hr = new Chart(canvas, {
    type: "line",
    data: {
      labels: sampled.map((sample) => (((new Date(sample.date).getTime()) - sampleStart) / 1000 / 60).toFixed(1)),
      datasets: [
        {
          label: "BPM",
          data: sampled.map((sample) => sample.bpm),
          borderColor: "#ff9f43",
          backgroundColor: "rgba(255, 159, 67, 0.18)",
          tension: 0.25,
          pointRadius: 0
        }
      ]
    },
    options: chartOptions()
  });
}

function renderWorkoutDetail(id) {
  const workout = state.workouts.find((entry) => entry.id === id);
  const raw = state.rawWorkouts[id] || {};

  if (!workout) {
    document.getElementById("workout-detail-title").textContent = "Workout not found";
    document.getElementById("workout-detail-subtitle").textContent = "";
    return;
  }

  document.getElementById("workout-detail-title").textContent = formatDate(workout.start);
  const subtitleParts = [];
  if (raw.endDate) subtitleParts.push(`to ${formatDate(raw.endDate)}`);
  if (raw.sourceName) subtitleParts.push(raw.sourceName);
  document.getElementById("workout-detail-subtitle").textContent = subtitleParts.join(" - ");

  const hrStats = workoutHrStats(workout, raw);
  const hrZone = lthrZoneForHr(hrStats.avg);
  document.getElementById("workout-detail-summary").innerHTML = [
    metric("Distance", `${fmt2.format((raw.distanceMeters || workout.distance_m) / 1000)} km`),
    metric("Duration", durationFromSeconds(raw.durationSeconds || workout.duration_s)),
    metric("Active Swim", durationFromSeconds(raw.totalSwimTimeSeconds || workout.swim_time_s)),
    metric("Rest", durationFromSeconds(raw.totalRestTimeSeconds || workout.rest_time_s)),
    metric("Avg HR", hrStats.avg ? `${Math.round(hrStats.avg)} bpm` : "-"),
    metric("HR Range", hrStats.min && hrStats.max ? `${Math.round(hrStats.min)}-${Math.round(hrStats.max)} bpm` : "-"),
    metric("LTHR Zone", hrZone.label !== "-" ? `${hrZone.label} ${hrZone.text}` : "-"),
    metric("Pool Length", `${raw.poolLengthMeters || workout.pool_length_m || "-"}`)
  ].join("");

  const splits = raw.splitPoints || [];
  const strokeSummaries = raw.strokeSummaries || [];
  const events = raw.events || [];
  renderSplitRows(splits);
  renderStrokeRows(strokeSummaries);
  renderEventRows(events);
  renderSplitChart(splits);
  renderHrChart(raw);
}

function raceTile(race) {
  const date = race.date ? new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", year: "numeric" }).format(new Date(race.date)) : "-";
  const standard = race.standard ? `<span class="race-standard">${race.standard}</span>` : "";
  const badges = [...new Set(race.badges || [])].map((badge) => `<span class="race-badge ${badge.toLowerCase()}">${badge}</span>`).join("");
  return `<button type="button" class="race-tile ${race.stroke}" data-race-id="${race.id}">
    <span class="race-date">${date}</span>
    <strong>${race.event}</strong>
    <span class="race-time">${race.time}</span>
    <span class="race-badge-row">${badges}</span>
    ${standard}
  </button>`;
}

function updateRaceControls() {
  document.querySelectorAll("[data-race-group]").forEach((button) => {
    button.classList.toggle("active", button.dataset.raceGroup === state.raceFilters.groupBy);
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const filter = button.dataset.filter;
    const active = (
      (filter === "best" && state.raceFilters.bestOnly) ||
      (filter === "current" && state.raceFilters.currentOnly) ||
      (filter === state.raceFilters.course) ||
      (filter === state.raceFilters.stroke)
    );
    button.classList.toggle("active", active);
  });
}

function renderRaces() {
  const races = filteredRaces();
  const groups = groupRaces(races);
  const raceCount = document.getElementById("race-count");
  const container = document.getElementById("race-groups");
  raceCount.textContent = `${races.length} Race${races.length === 1 ? "" : "s"}`;

  container.innerHTML = groups.map((group) => {
    return `<section class="race-group">
      <div class="section-title">
        <h2>${group.label}</h2>
        <span>${group.items.length} race${group.items.length === 1 ? "" : "s"}</span>
      </div>
      <div class="race-tile-grid">${group.items.map(raceTile).join("")}</div>
    </section>`;
  }).join("") || `<article><p>No races match these filters.</p></article>`;

  updateRaceControls();
}

function raceById(id) {
  return state.races.find((race) => race.id === id);
}

function detailItem(label, value) {
  return `<div class="detail-item"><span>${label}</span><strong>${value || "-"}</strong></div>`;
}

function raceDistanceFromEvent(eventName) {
  const match = String(eventName || "").match(/(^|\D)(25|50|100|200|400|500|800|1000|1500|1650)(?=\D|$)/);
  return match ? Number(match[2]) : null;
}

function swimTimeText(seconds) {
  if (!Number.isFinite(seconds)) return "-";
  const sign = seconds < 0 ? "-" : "";
  const absolute = Math.abs(seconds);
  const minutes = Math.floor(absolute / 60);
  const remainder = absolute - minutes * 60;
  if (minutes <= 0) {
    return `${sign}${fmt2.format(remainder)}s`;
  }
  return `${sign}${minutes}:${remainder.toFixed(2).padStart(5, "0")}`;
}

function raceContext(race) {
  const peers = state.races
    .filter((item) => raceEventCourseKey(item) === raceEventCourseKey(race) && Number.isFinite(item.timeSeconds))
    .sort((a, b) => new Date(a.date) - new Date(b.date) || a.index - b.index);
  const prTime = peers.length ? Math.min(...peers.map((item) => item.timeSeconds)) : null;
  let bestAtTime = null;
  peers.forEach((item) => {
    const itemDate = new Date(item.date);
    const raceDate = new Date(race.date);
    if (itemDate <= raceDate && (bestAtTime === null || item.timeSeconds < bestAtTime)) {
      bestAtTime = item.timeSeconds;
    }
  });
  return { prTime, bestAtTime };
}

function timeDiffText(timeSeconds, referenceSeconds) {
  if (!Number.isFinite(timeSeconds) || !Number.isFinite(referenceSeconds) || referenceSeconds <= 0) {
    return "-";
  }
  const diff = timeSeconds - referenceSeconds;
  const pct = diff / referenceSeconds * 100;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${swimTimeText(Math.abs(diff))} (${sign}${fmt2.format(pct)}%)`;
}

function racePaceText(race, unitDistance) {
  const distance = raceDistanceFromEvent(race.event);
  if (!distance || !Number.isFinite(race.timeSeconds)) {
    return "-";
  }
  if (unitDistance === 50 && distance < 100) return "-";
  if (unitDistance === 100 && distance < 200) return "-";
  return swimTimeText(race.timeSeconds / distance * unitDistance);
}


function openRaceModal(race) {
  const modal = document.getElementById("race-modal");
  const context = raceContext(race);
  document.getElementById("race-modal-kicker").textContent = `${race.course} - ${strokeLabel(race.stroke)}`;
  document.getElementById("race-modal-title").textContent = race.event;
  document.getElementById("race-modal-time").textContent = race.time;
  document.getElementById("race-detail-grid").innerHTML = [
    detailItem("Date", race.date),
    detailItem("Age", race.age),
    detailItem("Meet", race.meet),
    detailItem("Course", race.course),
    detailItem("Race Time", Number.isFinite(race.timeSeconds) ? swimTimeText(race.timeSeconds) : race.time),
    detailItem("Pace / 50", racePaceText(race, 50)),
    detailItem("Pace / 100", racePaceText(race, 100)),
    detailItem("Diff vs best at time", timeDiffText(race.timeSeconds, context.bestAtTime)),
    detailItem("Diff vs PR", timeDiffText(race.timeSeconds, context.prTime)),
    detailItem("Best at time", Number.isFinite(context.bestAtTime) ? swimTimeText(context.bestAtTime) : "-"),
    detailItem("PR", Number.isFinite(context.prTime) ? swimTimeText(context.prTime) : "-"),
    detailItem("Badges", (race.badges || []).join(", ")),
    detailItem("Standard", race.standard),
    detailItem("Points", race.points),
    detailItem("Team", race.team)
  ].join("");
  modal.classList.remove("hidden");
}

function closeRaceModal() {
  document.getElementById("race-modal").classList.add("hidden");
}

function openRaceLegend() {
  document.getElementById("race-legend-modal").classList.remove("hidden");
}

function closeRaceLegend() {
  document.getElementById("race-legend-modal").classList.add("hidden");
}

function attachRaceInteractions() {
  document.getElementById("figure-gallery").addEventListener("click", (event) => {
    const card = event.target.closest("[data-figure-index]");
    if (card) {
      openFigureModal(card.dataset.figureIndex);
    }
  });
  document.getElementById("figure-modal-close").addEventListener("click", closeFigureModal);
  document.getElementById("figure-modal").addEventListener("click", (event) => {
    if (event.target.id === "figure-modal") {
      closeFigureModal();
    }
  });

  document.getElementById("race-groups").addEventListener("click", (event) => {
    const tile = event.target.closest("[data-race-id]");
    if (!tile) {
      return;
    }
    const race = raceById(tile.dataset.raceId);
    if (race) {
      openRaceModal(race);
    }
  });

  document.querySelectorAll("[data-race-group]").forEach((button) => {
    button.addEventListener("click", () => {
      state.raceFilters.groupBy = button.dataset.raceGroup;
      renderRaces();
    });
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      if (filter === "best") {
        state.raceFilters.bestOnly = !state.raceFilters.bestOnly;
      } else if (filter === "current") {
        state.raceFilters.currentOnly = !state.raceFilters.currentOnly;
      } else if (filter === "scy" || filter === "lcm") {
        state.raceFilters.course = state.raceFilters.course === filter ? "all" : filter;
      } else {
        state.raceFilters.stroke = state.raceFilters.stroke === filter ? "all" : filter;
      }
      renderRaces();
    });
  });

  document.getElementById("race-modal-close").addEventListener("click", closeRaceModal);
  document.getElementById("race-modal").addEventListener("click", (event) => {
    if (event.target.id === "race-modal") {
      closeRaceModal();
    }
  });
  document.getElementById("race-legend-open").addEventListener("click", openRaceLegend);
  document.getElementById("race-legend-close").addEventListener("click", closeRaceLegend);
  document.getElementById("race-legend-modal").addEventListener("click", (event) => {
    if (event.target.id === "race-legend-modal") {
      closeRaceLegend();
    }
  });
}

function setActiveNav(view) {
  document.querySelectorAll(".top-nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-view") === view);
  });
}

function setActiveView(view) {
  Object.entries(views).forEach(([name, element]) => {
    if (!element) {
      return;
    }
    element.classList.toggle("hidden", name !== view);
  });
  document.body.classList.toggle("race-view-active", view === "races");
}

function route() {
  const clean = window.location.hash.replace(/^#\//, "");
  const [routeName, id] = clean.split("/");
  clearCharts();

  if (routeName === "workout" && id) {
    setActiveNav("workouts");
    setActiveView("workout");
    renderWorkoutDetail(id);
    return;
  }

  if (routeName === "workouts") {
    setActiveNav("workouts");
    setActiveView("workouts");
    renderWorkoutList();
    return;
  }

  if (routeName === "races") {
    setActiveNav("races");
    setActiveView("races");
    renderRaces();
    return;
  }

  if (routeName === "training") {
    setActiveNav("training");
    setActiveView("training");
    renderTraining();
    return;
  }

  if (routeName === "physiology") {
    setActiveNav("physiology");
    setActiveView("physiology");
    renderPhysiology();
    return;
  }

  if (routeName === "findings") {
    setActiveNav("findings");
    setActiveView("findings");
    renderFindings();
    return;
  }

  setActiveNav("overview");
  setActiveView("overview");
  renderOverview();
}

Promise.all([
  loadJson("data/summary.json"),
  loadJson("data/weekly.json"),
  loadJson("data/strokes.json"),
  loadJson("data/correlations.json"),
  loadJson("data/workouts.json"),
  loadOptionalJson("data/go-swim-export.json", { workouts: [] }),
  loadText("data/race-results.csv"),
  loadOptionalText("data/weekly_training.csv"),
  loadOptionalText("data/weekly_physiology_metrics.csv"),
  loadOptionalText("data/weekly_load_phase_patterns.csv"),
  loadOptionalText("data/load_phase_summary.csv"),
  loadOptionalText("data/load_phase_transitions.csv"),
  loadOptionalText("data/load_hr_correlations.csv"),
  loadOptionalText("data/hr_physiology_anchors.csv"),
  loadOptionalText("data/hr_zone_method_summary.csv"),
  loadOptionalText("data/hr_age_context.csv"),
  loadOptionalText("data/hr_zone_distribution.csv"),
  loadOptionalText("data/periodization_summary.csv"),
  loadOptionalText("data/race_pre_14d_load_context.csv"),
  loadOptionalText("data/july_2025_race_month_summary.csv"),
  loadOptionalText("data/july_2025_weekly_load_hr_context.csv")
]).then(([
  summary,
  weekly,
  strokes,
  correlations,
  workouts,
  exportPayload,
  raceCsv,
  weeklyTrainingCsv,
  weeklyPhysiologyCsv,
  loadPhasesCsv,
  phaseSummaryCsv,
  phaseTransitionsCsv,
  loadHrCorrelationsCsv,
  hrAnchorsCsv,
  hrZoneMethodsCsv,
  hrAgeContextCsv,
  hrZoneDistributionCsv,
  periodizationSummaryCsv,
  racePreLoadCsv,
  julyRaceSummaryCsv,
  julyWeeklyContextCsv
]) => {
  state.summary = summary;
  state.weekly = weekly;
  state.strokes = strokes;
  state.correlations = correlations;
  state.workouts = workouts;
  state.races = normalizeRaces(raceCsv);
  state.weeklyTraining = parseCsv(weeklyTrainingCsv);
  state.weeklyPhysiology = parseCsv(weeklyPhysiologyCsv);
  state.loadPhases = parseCsv(loadPhasesCsv);
  state.phaseSummary = parseCsv(phaseSummaryCsv);
  state.phaseTransitions = parseCsv(phaseTransitionsCsv);
  state.loadHrCorrelations = parseCsv(loadHrCorrelationsCsv);
  state.hrAnchors = parseCsv(hrAnchorsCsv);
  state.hrZoneMethods = parseCsv(hrZoneMethodsCsv);
  state.hrAgeContext = parseCsv(hrAgeContextCsv);
  state.hrZoneDistribution = parseCsv(hrZoneDistributionCsv);
  state.periodizationSummary = parseCsv(periodizationSummaryCsv);
  state.racePreLoad = parseCsv(racePreLoadCsv);
  state.julyRaceSummary = parseCsv(julyRaceSummaryCsv);
  state.julyWeeklyContext = parseCsv(julyWeeklyContextCsv);
  state.rawWorkouts = (exportPayload?.workouts || []).reduce((acc, item) => {
    if (item?.id) {
      acc[item.id] = item;
    }
    return acc;
  }, {});

  attachRaceInteractions();
  window.addEventListener("hashchange", route);
  route();
}).catch((error) => {
  document.body.innerHTML = `<main><h1>Data load failed</h1><p>${error.message}</p></main>`;
});










