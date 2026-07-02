import { manualMeta, normativeReferences, pendingManualItems, trafficClassification } from "./data/manualTables.js";
import { exportPdf } from "./utils/reportGenerator.js";
import { buildSensitivityCases, formatNumber, runDesign, toNumber } from "./utils/calculations.js";

const state = {
  activeType: "vehicular",
  result: null,
  charts: {},
};

const typeMeta = {
  vehicular: { title: "Pavimento vehicular", subtitle: "Calles urbanas, transito bajo, medio y pesado" },
  peatonal: { title: "Pavimento peatonal", subtitle: "Veredas, parques, paseos y areas sin transito pesado" },
  portuario: { title: "Explanada industrial / portuaria", subtitle: "Cargas de rueda, operacion y acopio" },
  aeroportuario: { title: "Pavimento aeroportuario", subtitle: "Preverificacion para aeronaves de diseno" },
};

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindActions();
  renderForm();
  renderCatalog();
  renderNormative();
  calculate();
  window.lucide?.createIcons();
});

function bindNavigation() {
  document.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeType = button.dataset.type;
      document.querySelectorAll("[data-type]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderForm();
      calculate();
    });
  });
}

function bindActions() {
  document.querySelector("#calculateBtn").addEventListener("click", calculate);
  document.querySelector("#themeBtn").addEventListener("click", () => document.documentElement.classList.toggle("dark"));
  document.querySelector("#pdfBtn").addEventListener("click", () => state.result && exportPdf(state.result));
  const liveCalculate = debounce(calculate, 250);
  document.querySelector("#formPanel").addEventListener("input", liveCalculate);
  document.querySelector("#formPanel").addEventListener("change", liveCalculate);
}

function renderForm() {
  const meta = typeMeta[state.activeType];
  document.querySelector("#moduleTitle").textContent = meta.title;
  document.querySelector("#moduleSubtitle").textContent = meta.subtitle;
  document.querySelector("#formPanel").innerHTML = formTemplate(state.activeType);
  window.lucide?.createIcons();
}

function formTemplate(type) {
  const common = `
    ${field("Vida de diseno", "designLife", "number", 20, "anos", "Periodo para acumular las solicitaciones. En pavimentos urbanos se usan normalmente horizontes de 10 a 20 anos; en explanadas puede justificarse un horizonte mayor.")}
    ${field("CBR subrasante", "cbr", "number", 4, "%", "Indice de soporte del suelo natural. Valores bajos aumentan subbase o mejoramiento; si es muy bajo se requiere criterio geotecnico.")}
  `;
  const costs = costFields();
  if (type === "vehicular") {
    return `
      ${common}
      ${field("EE inicial", "eeDay", "number", 60, "EE/dia", "Ejes equivalentes diarios en la pista de diseno. Representa la severidad diaria del transito pesado convertida a ejes estandar.")}
      ${field("Crecimiento", "growthRate", "number", 2, "% anual", "Tasa anual de crecimiento del transito. El sistema la usa para proyectar los ejes acumulados de diseno.")}
      ${field("Vehiculos pesados", "heavyVehDay", "number", 6, "veh/dia", "Vehiculos de mas de 1.500 kg por dia. Ayuda a clasificar el nivel de transito cuando el EEA es bajo.")}
      ${costs}
    `;
  }
  if (type === "peatonal") {
    return `
      ${common}
      ${field("EE inicial", "eeDay", "number", 0, "EE/dia", "Use 0 para uso peatonal puro. Si ingresan vehiculos de mantenimiento o emergencia, indique su efecto como EE/dia.")}
      ${field("Crecimiento", "growthRate", "number", 0, "% anual", "Puede dejarse en 0 cuando no existe transito estructural acumulativo.")}
      ${field("Vehiculos pesados eventuales", "heavyVehDay", "number", 0, "veh/dia", "Numero esperado de vehiculos pesados ocasionales. Afecta la categoria peatonal/liviana.")}
      ${costs}
    `;
  }
  if (type === "portuario") {
    return `
      ${common}
      ${selectField("Tipo de operacion", "operationType", [
        ["Patio de contenedores", "Patio de contenedores"],
        ["Zona de maniobras", "Zona de maniobras"],
        ["Calle interior", "Calle interior"],
      ], "Identifica si gobierna almacenamiento, maniobras o circulacion. El metodo portuario requiere revisar la operacion critica.")}
      ${field("Carga por rueda", "wheelLoadKg", "number", 18000, "kg", "Carga critica transmitida por una rueda o rueda equivalente del equipo portuario. Es el dato principal para calcular SEWL.")}
      ${field("Presion neumatico", "tirePressureMpa", "number", 0.8, "MPa", "Presion de inflado o contacto. Afecta el dano relativo de la maquinaria.")}
      ${field("Pasadas diarias", "passesPerDay", "number", 180, "pasadas/dia", "Numero promedio de pasadas del equipo critico por dia durante la operacion.")}
      ${field("Factor dinamico", "dynamicFactor", "number", 1.2, "-", "Factor que amplifica la carga por frenado, giro, aceleracion e irregularidad superficial.")}
      ${field("Separacion ruedas", "wheelSpacingMm", "number", 600, "mm", "Distancia entre ruedas criticas. Sirve para evaluar superposicion de tensiones.")}
      ${field("Profundidad efectiva", "effectiveDepthMm", "number", 2000, "mm", "Profundidad efectiva usada para seleccionar el factor de proximidad de la Tabla 5.10.")}
      ${costs}
    `;
  }
  return `
    ${common}
    ${field("Aeronave de diseno", "aircraftName", "text", "Aeronave", "", "Modelo critico de la flota. Debe ser el que produzca mayor dano relativo, no necesariamente el mas pesado.")}
    ${field("MTOW", "mtowKg", "number", 5700, "kg", "Peso maximo de despegue. El manual usa el 95% sobre el tren principal como aproximacion inicial.")}
    ${field("Salidas anuales", "annualDepartures", "number", 200, "salidas/ano", "Pronostico de salidas anuales de la aeronave o flota equivalente.")}
    ${field("Ruedas tren principal", "mainGearWheels", "number", 2, "ruedas", "Numero de ruedas del tren principal que reparten la carga estructural.")}
    ${field("Presion neumatico", "tirePressureKgCm2", "number", 7.4, "kg/cm2", "Presion de inflado para estimar la impronta y las tensiones.")}
    ${costs}
  `;
}

function costFields() {
  return `
    <div class="formGroup">
      <strong>Indices economicos relativos</strong>
      <p>Valores editables para comparar alternativas. No son precios de obra; use costos locales para ranking economico real.</p>
    </div>
    ${field("Adoquin", "costPaver", "number", 1.8, "indice/mm", "Peso economico relativo por mm de adoquin.")}
    ${field("Arena", "costSand", "number", 0.45, "indice/mm", "Peso economico relativo por mm de cama de arena.")}
    ${field("Base granular", "costGranularBase", "number", 0.85, "indice/mm", "Peso economico relativo por mm de base granular.")}
    ${field("Base cemento", "costCementBase", "number", 1.25, "indice/mm", "Peso economico relativo por mm de base tratada con cemento.")}
    ${field("Base asfalto", "costAsphaltBase", "number", 1.45, "indice/mm", "Peso economico relativo por mm de base tratada con asfalto.")}
    ${field("Subbase", "costSubbase", "number", 0.6, "indice/mm", "Peso economico relativo por mm de subbase.")}
    ${field("Mejoramiento", "costImprovement", "number", 0.4, "indice/mm", "Peso economico relativo por mm de mejoramiento de subrasante.")}
  `;
}

function field(label, name, type, value, unit, help) {
  return `
    <label class="field">
      <span>${label}<button class="tip" type="button" title="${help}" aria-label="${help}"><i data-lucide="info"></i></button></span>
      <div class="inputWrap">
        <input name="${name}" type="${type}" min="${type === "number" ? "0" : ""}" step="any" value="${value}">
        ${unit ? `<em>${unit}</em>` : ""}
      </div>
      <small>${help}</small>
    </label>`;
}

function selectField(label, name, options, help) {
  return `
    <label class="field">
      <span>${label}<button class="tip" type="button" title="${help}" aria-label="${help}"><i data-lucide="info"></i></button></span>
      <div class="inputWrap">
        <select name="${name}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select>
      </div>
      <small>${help}</small>
    </label>`;
}

function collectInput() {
  const data = { type: state.activeType };
  document.querySelectorAll("#formPanel input, #formPanel select").forEach((input) => {
    data[input.name] = input.type === "number" ? toNumber(input.value) : input.value;
  });
  return data;
}

function calculate() {
  const input = collectInput();
  if (Object.values(input).some((value) => typeof value === "number" && value < 0)) {
    renderError("Corrige los valores negativos antes de calcular.");
    return;
  }
  state.result = runDesign(input);
  state.result.sensitivity = buildSensitivityCases(input);
  renderResult(state.result);
}

function renderResult(result) {
  document.querySelector("#statusPill").textContent = result.layers.status;
  document.querySelector("#summaryGrid").innerHTML = `
    ${metric("Solicitacion", formatNumber(result.eea, 1), result.type === "aeroportuario" ? "salidas equivalentes preliminares" : "EEA / dano equivalente")}
    ${metric("Clasificacion", `${result.traffic.name} ${result.traffic.category ?? ""}`, "Nivel de solicitacion")}
    ${metric("Cumplimiento", result.verification?.complies ? "Cumple" : "Validar", result.verification?.note ?? "Sin verificacion")}
    ${metric("Alternativa optima", result.selectedAlternative?.name ?? "--", "Menor indice economico que cumple")}
  `;
  document.querySelector("#layersTable").innerHTML = layersTable(result);
  document.querySelector("#alternativesTable").innerHTML = alternativesTable(result);
  document.querySelector("#rankingTable").innerHTML = rankingTable(result);
  document.querySelector("#sensitivityTable").innerHTML = sensitivityTable(result);
  document.querySelector("#verificationContent").innerHTML = verificationMarkup(result);
  document.querySelector("#memoryList").innerHTML = result.memory.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#warningsList").innerHTML = [...result.warnings, ...result.limitations].map((item) => `<li>${item}</li>`).join("");
  renderSection(result);
  renderCharts(result);
  renderPending();
  window.lucide?.createIcons();
}

function rankingTable(result) {
  const rows = rankAlternatives(result);
  return rows.map((item) => `
    <tr class="${item.alt.name === result.selectedAlternative?.name ? "selectedRow" : ""}">
      <td><strong>${item.code}</strong><small>${item.alt.name}</small></td>
      <td>${item.margin.toFixed(1)}%</td>
      <td>${item.costScore.toFixed(0)}</td>
      <td>${item.constructability.toFixed(0)}</td>
      <td>${item.risk.toFixed(0)}</td>
      <td><strong>${item.score.toFixed(0)}</strong></td>
    </tr>`).join("");
}

function sensitivityTable(result) {
  return (result.sensitivity || []).map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${formatNumber(item.demand, 1)} ${item.label}</td>
      <td>${item.alternative}</td>
      <td>${(item.utilization * 100).toFixed(1)}%</td>
      <td><span class="status ${item.complies ? "ok" : "bad"}">${item.complies ? "Cumple" : "Validar"}</span></td>
    </tr>`).join("");
}

function rankAlternatives(result) {
  const costs = result.alternatives.map((alt) => alt.costIndex);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  return result.alternatives.map((alt, index) => {
    const margin = Math.max(0, (1 - alt.utilization) * 100);
    const costScore = maxCost === minCost ? 100 : 100 - ((alt.costIndex - minCost) / (maxCost - minCost)) * 100;
    const constructability = constructabilityScore(alt);
    const risk = alt.reviewRequired || alt.pending ? 55 : alt.complies ? 15 : 85;
    const score = costScore * 0.42 + Math.min(100, margin) * 0.28 + constructability * 0.2 + (100 - risk) * 0.1;
    return { code: `A${index + 1}`, alt, margin, costScore, constructability, risk, score };
  }).sort((a, b) => b.score - a.score);
}

function constructabilityScore(alt) {
  let score = 100;
  if (String(alt.layers.baseLabel).includes("cemento")) score -= 12;
  if (String(alt.layers.baseLabel).includes("asfalto")) score -= 18;
  if ((alt.layers.improvement || 0) > 0) score -= 14;
  if (alt.thickness > 850) score -= 10;
  return Math.max(35, score);
}

function renderError(message) {
  document.querySelector("#warningsList").innerHTML = `<li>${message}</li>`;
}

function metric(label, value, hint) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`;
}

function layersTable(result) {
  const rows = [
    ["Adoquin", result.layers.paver],
    ["Cama de arena", result.layers.sandBed],
    ["Base", result.layers.baseLabel],
    ["Subbase", result.layers.subbase],
    ["Mejoramiento", result.layers.improvement],
  ];
  return rows.map(([layer, thickness]) => `
    <tr><td>${layer}</td><td>${thickness || 0}</td><td>mm</td></tr>`).join("");
}

function alternativesTable(result) {
  return result.alternatives.map((alt) => `
    <tr class="${alt.name === result.selectedAlternative?.name ? "selectedRow" : ""}">
      <td>
        <strong>${alt.name}</strong>
        ${alt.name === result.selectedAlternative?.name ? `<small class="bestChoice">Alternativa recomendada</small>` : ""}
      </td>
      <td>${alt.layers.paver} mm</td>
      <td>${alt.layers.sandBed} mm</td>
      <td>
        <strong>${alt.layers.base} mm</strong>
        <small>${baseDescription(alt.layers.baseLabel)}</small>
      </td>
      <td>${alt.layers.subbase || 0} mm</td>
      <td>${alt.layers.improvement || 0} mm</td>
      <td><strong>${alt.thickness} mm</strong></td>
      <td>${alt.costIndex}</td>
      <td>${(alt.utilization * 100).toFixed(1)}%</td>
      <td><span class="status ${alt.reviewRequired ? "review" : alt.pending ? "pending" : alt.complies ? "ok" : "bad"}">${alt.reviewRequired ? "Preverificado" : alt.pending ? "Pendiente" : alt.complies ? "Cumple" : "No cumple"}</span></td>
    </tr>`).join("");
}

function baseDescription(label = "") {
  return String(label).replace(/^\d+\s*/, "");
}

function verificationMarkup(result) {
  const verification = result.verification;
  if (!verification) return "";
  return `
    <div class="verificationGauge">
      <div style="width:${Math.min(100, verification.utilization * 100)}%"></div>
    </div>
    <dl class="verificationGrid">
      <div><dt>Demanda</dt><dd>${formatNumber(verification.demand, 2)} ${verification.label}</dd></div>
      <div><dt>Capacidad</dt><dd>${formatNumber(verification.capacity, 2)} ${verification.label}</dd></div>
      <div><dt>D/C</dt><dd>${(verification.utilization * 100).toFixed(1)}%</dd></div>
      <div><dt>Estado</dt><dd>${verification.complies ? "Cumple" : "Validar"}</dd></div>
    </dl>
    <p>${verification.note}</p>`;
}

function renderSection(result) {
  const layers = [
    { name: "Adoquin", value: toNumber(result.layers.paver), color: "#a8552a" },
    { name: "Cama de arena", value: toNumber(result.layers.sandBed), color: "#d9b66f" },
    { name: "Base", value: toNumber(result.layers.base), color: "#64748b" },
    { name: "Subbase", value: toNumber(result.layers.subbase), color: "#8b9a5b" },
    { name: "Mejoramiento", value: toNumber(result.layers.improvement), color: "#5b8c8f" },
  ].filter((layer) => layer.value > 0);
  const total = layers.reduce((sum, layer) => sum + layer.value, 0) || 1;
  document.querySelector("#sectionGraphic").innerHTML = layers
    .map((layer) => {
      const height = Math.max(30, (layer.value / total) * 280);
      return `<div class="sectionLayer" style="height:${height}px;background:${layer.color}">
        <span>${layer.name}</span><strong>${layer.value} mm</strong>
      </div>`;
    })
    .join("");
}

function renderCharts(result) {
  renderTrafficChart(result);
  renderAlternativesChart(result);
  renderUtilizationChart(result);
  renderLayerChart(result);
}

function renderTrafficChart(result) {
  const trafficDatasets = [
    {
      type: "bar",
      label: "Solicitacion anual",
      data: result.series.map((row, index, rows) => index === 0 ? row.accumulatedEe : row.accumulatedEe - rows[index - 1].accumulatedEe),
      backgroundColor: "rgba(37, 99, 235, .30)",
      borderColor: "#2563eb",
      borderWidth: 1,
      barPercentage: 0.42,
      categoryPercentage: 0.62,
      yAxisID: "y1",
    },
    paperLine("Banda superior +10%", result.series.map((row) => row.upperBound), "#94a3b8", false),
    paperLine("Solicitacion acumulada", result.series.map((row) => row.accumulatedEe), "#0f766e", true),
    paperLine("Banda inferior -10%", result.series.map((row) => row.lowerBound), "#94a3b8", false),
  ];
  if (result.verification?.label === "EEA") {
    trafficDatasets.push({
      type: "line",
      label: "Capacidad seleccionada",
      data: result.series.map(() => result.verification?.capacity ?? 0),
      borderColor: "#b91c1c",
      borderWidth: 2,
      pointRadius: 0,
      borderDash: [10, 5],
      yAxisID: "y",
    });
  }
  replaceChart("traffic", document.querySelector("#trafficChart"), {
    type: "bar",
    data: {
      labels: result.series.map((row) => row.year),
      datasets: trafficDatasets,
    },
    options: dualAxisOptions("Ano de diseno", "Solicitacion acumulada", "Solicitacion anual"),
  });
}

function renderAlternativesChart(result) {
  replaceChart("alternatives", document.querySelector("#alternativesChart"), {
    type: "bubble",
    data: {
      datasets: result.alternatives.map((alt, index) => ({
        label: alt.name,
        data: [{ x: alt.costIndex, y: alt.utilization * 100, r: Math.max(4, Math.min(11, alt.thickness / 90)) }],
        backgroundColor: alt.name === result.selectedAlternative?.name ? "#0f766e" : chartPalette(index),
        borderColor: "#111827",
        borderWidth: alt.name === result.selectedAlternative?.name ? 2 : 1,
      })),
    },
    options: bubbleOptions(),
  });
}

function renderUtilizationChart(result) {
  const labels = result.alternatives.map((_, index) => `A${index + 1}`);
  replaceChart("utilization", document.querySelector("#utilizationChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Relacion demanda/capacidad (%)",
          data: result.alternatives.map((alt) => alt.utilization * 100),
          backgroundColor: result.alternatives.map((alt) => alt.complies ? "#0f766e" : alt.pending ? "#b45309" : "#b91c1c"),
          borderRadius: 4,
          barPercentage: 0.34,
          categoryPercentage: 0.58,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Limite de cumplimiento",
          data: result.alternatives.map(() => 100),
          borderColor: "#b91c1c",
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 0,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Indice economico",
          data: result.alternatives.map((alt) => alt.costIndex),
          borderColor: "#7c3aed",
          backgroundColor: "#7c3aed",
          pointRadius: 5,
          yAxisID: "y1",
        },
      ],
    },
    options: dualAxisOptions("Alternativa", "D/C (%)", "Indice economico"),
  });
}

function renderLayerChart(result) {
  const labels = result.alternatives.map((_, index) => `A${index + 1}`);
  const layerKeys = [
    ["paver", "Adoquin", "#a8552a"],
    ["sandBed", "Arena", "#d9b66f"],
    ["base", "Base", "#64748b"],
    ["subbase", "Subbase", "#8b9a5b"],
    ["improvement", "Mejoramiento", "#5b8c8f"],
  ];
  replaceChart("layers", document.querySelector("#layerChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        ...layerKeys.map(([key, label, color]) => ({
          label,
          data: result.alternatives.map((alt) => alt.layers[key] || 0),
          backgroundColor: color,
          stack: "layers",
          barPercentage: 0.42,
          categoryPercentage: 0.6,
        })),
        {
          type: "line",
          label: "Espesor total",
          data: result.alternatives.map((alt) => alt.thickness),
          borderColor: "#111827",
          backgroundColor: "#111827",
          pointRadius: 5,
          yAxisID: "y",
        },
      ],
    },
    options: { ...paperOptions("Alternativa", "Espesor (mm)"), scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } },
  });
}

function paperLine(label, data, color, bold) {
  return {
    type: "line",
    label,
    data,
    borderColor: color,
    backgroundColor: bold ? "rgba(15,118,110,.10)" : "rgba(148,163,184,.08)",
    borderWidth: bold ? 3 : 1.5,
    borderDash: bold ? [] : [6, 4],
    fill: false,
    tension: 0.2,
    pointRadius: 0,
    yAxisID: "y",
  };
}

function replaceChart(key, ctx, config) {
  state.charts[key]?.destroy();
  state.charts[key] = new Chart(ctx, config);
}

function paperOptions(xTitle, yTitle, suggestedMax) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, usePointStyle: true } },
      tooltip: { backgroundColor: "#111827", padding: 10 },
    },
    scales: {
      x: { title: { display: true, text: xTitle, font: { weight: "bold" } }, ticks: { maxRotation: 0, autoSkip: true }, grid: { color: "rgba(100,116,139,.16)" } },
      y: { title: { display: true, text: yTitle, font: { weight: "bold" } }, beginAtZero: true, suggestedMax, ticks: { maxTicksLimit: 6 }, grid: { color: "rgba(100,116,139,.16)" } },
    },
  };
}

function dualAxisOptions(xTitle, yTitle, y1Title) {
  const options = paperOptions(xTitle, yTitle);
  options.scales.y1 = {
    position: "right",
    beginAtZero: true,
    title: { display: true, text: y1Title, font: { weight: "bold" } },
    ticks: { maxTicksLimit: 6 },
    grid: { drawOnChartArea: false },
  };
  return options;
}

function bubbleOptions() {
  const options = paperOptions("Indice economico relativo", "D/C (%)", 100);
  options.scales.y.suggestedMin = 0;
  options.scales.y.suggestedMax = 125;
  options.scales.x.ticks = { maxTicksLimit: 6 };
  options.plugins.tooltip.callbacks = {
    label: (ctx) => `${ctx.dataset.label}: indice ${ctx.raw.x}, D/C ${ctx.raw.y.toFixed(1)}%, burbuja proporcional al espesor total`,
  };
  return options;
}

function chartPalette(index) {
  return ["#0f766e", "#7c3aed", "#c2410c", "#2563eb", "#be123c"][index % 5];
}

function renderCatalog() {
  document.querySelector("#catalogTable").innerHTML = trafficClassification.map((row) => `
    <tr>
      <td>${row.name}</td>
      <td>${row.category}</td>
      <td>${row.eeDay ? `${row.eeDay.op}${row.eeDay.value}` : "--"}</td>
      <td>${row.heavyVehDay?.op ? `${row.heavyVehDay.op}${row.heavyVehDay.value}` : row.heavyVehDay}</td>
      <td>${row.description}</td>
    </tr>`).join("");
}

function renderPending() {
  document.querySelector("#pendingList").innerHTML = pendingManualItems.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#manualNote").textContent = manualMeta.scopeNote;
}

function renderNormative() {
  const node = document.querySelector("#normativeGrid");
  if (!node) return;
  node.innerHTML = normativeReferences.map((item) => `
    <article class="normCard">
      <strong>${item.name}</strong>
      <p>${item.scope}</p>
    </article>`).join("");
}

function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}
