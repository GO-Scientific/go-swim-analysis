const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const fmt2 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
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
  const labels = weekly.map(row => row.label);
  new Chart(document.getElementById("weeklyChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Distance km",
          data: weekly.map(row => row.distance_km),
          borderColor: "#38d5ff",
          backgroundColor: "rgba(56, 213, 255, 0.16)",
          tension: 0.25,
          yAxisID: "y"
        },
        {
          label: "HR load",
          data: weekly.map(row => row.simple_hr_load),
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
  new Chart(document.getElementById("strokeChart"), {
    type: "doughnut",
    data: {
      labels: strokes.map(row => row.stroke),
      datasets: [{
        data: strokes.map(row => row.distance_km),
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
    .filter(row => row.distance_m > 0 && row.pace_50_s)
    .sort((a, b) => a.pace_50_s - b.pace_50_s)
    .slice(0, 8)
    .map(row => `<div class="row"><span>${row.date} · ${fmt.format(row.distance_km)} km</span><strong>${fmt2.format(row.pace_50_s)} s</strong></div>`);
  document.getElementById("fastest").innerHTML = rows.join("");
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

Promise.all([
  loadJson("data/summary.json"),
  loadJson("data/weekly.json"),
  loadJson("data/strokes.json"),
  loadJson("data/correlations.json"),
  loadJson("data/workouts.json")
]).then(([summary, weekly, strokes, correlations, workouts]) => {
  renderSummary(summary);
  renderWeekly(weekly);
  renderStrokes(strokes);
  renderCorrelations(correlations);
  renderFastest(workouts);
}).catch(error => {
  document.body.innerHTML = `<main><h1>Data load failed</h1><p>${error.message}</p></main>`;
});
