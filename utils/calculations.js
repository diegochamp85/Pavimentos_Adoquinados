import {
  granularSubbaseTable,
  highTrafficLayerTable,
  mediumLightPedestrianTable,
  pendingManualItems,
  portImprovementTable,
  portProximityFactors,
  portSewlTable,
  subbaseAndImprovementTable,
  trafficClassification,
  validationFlags,
} from "../data/manualTables.js";

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function validateInputs(input) {
  const warnings = [];
  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === "number" && value < 0) {
      warnings.push(`El campo "${key}" no puede ser negativo.`);
    }
  });
  if (input.cbr < 2 && ["vehicular", "peatonal"].includes(input.type)) {
    warnings.push("CBR menor a 2%: el manual requiere mejoramiento de subrasante y criterio del proyectista.");
  }
  if (input.cbr < 4 && input.type === "portuario") {
    warnings.push("CBR portuario inferior a 4%: se requiere mejoramiento para elevar el CBR de diseño.");
  }
  if (input.cbr < 10 && input.type === "aeroportuario") {
    warnings.push("CBR aeroportuario bajo: el manual sugiere mejorar la subrasante hasta valores superiores al 10%.");
  }
  return warnings;
}

export function cumulativeEe({ eeDay, designLife, growthRate = 0 }) {
  const g = growthRate / 100;
  if (g === 0) return eeDay * 365 * designLife;
  return eeDay * 365 * ((Math.pow(1 + g, designLife) - 1) / g);
}

export function trafficSeries({ eeDay, designLife, growthRate = 0 }) {
  const rows = [];
  let accumulated = 0;
  for (let year = 1; year <= designLife; year += 1) {
    const dailyEe = eeDay * Math.pow(1 + growthRate / 100, year - 1);
    accumulated += dailyEe * 365;
    rows.push({
      year,
      dailyEe,
      accumulatedEe: accumulated,
      lowerBound: accumulated * 0.9,
      upperBound: accumulated * 1.1,
    });
  }
  return rows;
}

export function classifyTraffic({ eeDay, eea, heavyVehDay, pavementType }) {
  if (pavementType === "peatonal" && heavyVehDay === 0 && eeDay === 0) return trafficClassification.at(-1);
  const eeaMillion = eea / 1_000_000;
  if (eeDay > 1000 || eeaMillion > 8) return trafficClassification[0];
  if (eeaMillion > 0.5 && eeDay <= 1000) return eeDay < 200 ? trafficClassification[2] : trafficClassification[1];
  if (eeDay < 60 && heavyVehDay > 5) return trafficClassification[3];
  if (eeDay < 60 && heavyVehDay <= 5) return trafficClassification[4];
  if (eeDay < 5 || heavyVehDay <= 1) return trafficClassification[5];
  return trafficClassification[4];
}

export function cbrBand(cbr, mode = "vehicular") {
  if (mode === "catalog") {
    if (cbr <= 2) return 2;
    if (cbr >= 6) return 6;
    return Math.floor(cbr);
  }
  if (cbr < 2) return "lt2";
  if (cbr < 3) return "2";
  if (cbr < 4) return "3";
  if (cbr < 5) return "4";
  if (cbr < 10) return "5to10";
  return "10to15";
}

export function designVehicularOrPedestrian(input) {
  const eeDay = toNumber(input.eeDay);
  const designLife = Math.max(1, toNumber(input.designLife, 20));
  const cbr = toNumber(input.cbr);
  const growthRate = toNumber(input.growthRate);
  const heavyVehDay = toNumber(input.heavyVehDay);
  const costs = costModel(input);
  const eea = cumulativeEe({ eeDay, designLife, growthRate });
  const traffic = classifyTraffic({ eeDay, eea, heavyVehDay, pavementType: input.type });
  const warnings = validateInputs({ ...input, type: input.type, eeDay, designLife, cbr, heavyVehDay });
  const memory = [
    `Se calcula EEA = ${formatNumber(eea)} ejes equivalentes acumulados para ${designLife} años.`,
    `Clasificación de tránsito: ${traffic.name} ${traffic.category}, según Tabla 5.4.`,
  ];

  let layers;
  let alternatives;
  if (traffic.level === "I" || eea / 1_000_000 >= 0.5) {
    const idx = Math.max(0, highTrafficIndex(eea));
    const bandIndex = granularSubbaseTable.bands.indexOf(cbrBand(cbr));
    const subbase = findByEeDay(granularSubbaseTable, eeDay).values[bandIndex];
    const improvePair = parseSubbaseImprovement(findByEeDay(subbaseAndImprovementTable, eeDay).values[bandIndex]);
    const layerSet = highTrafficLayerTable.layers;
    const capacity = highTrafficLayerTable.ranges[idx].max * 1_000_000;
    const common = {
      paver: layerSet.paver[idx],
      sandBed: layerSet.sandBed[idx],
      subbase: subbase ?? improvePair.subbase,
      improvement: cbr < 2 ? improvePair.improvement : 0,
      demand: eea,
      capacity,
      costs,
    };
    alternatives = [
      makeAlternative("Base granular", { ...common, base: rangeMid(layerSet.granularBase[idx]), baseType: "granular" }),
      makeAlternative("Base granular reforzada +40 mm", { ...common, base: rangeMid(layerSet.granularBase[idx]) + 40, baseType: "granular", capacity: capacity * 1.08 }),
      makeAlternative("Base tratada con cemento", { ...common, base: rangeMid(layerSet.cementTreatedBase[idx]), baseType: "cement" }),
      makeAlternative("Base cemento + subbase 50 mm", { ...common, base: rangeMid(layerSet.cementTreatedBase[idx]), subbase: (subbase ?? improvePair.subbase) + 50, baseType: "cement", capacity: capacity * 1.1 }),
      makeAlternative("Base tratada con asfalto", { ...common, base: rangeMid(layerSet.asphaltTreatedBase[idx]), baseType: "asphalt" }),
      makeAlternative("Base asfalto reforzada +30 mm", { ...common, base: rangeMid(layerSet.asphaltTreatedBase[idx]) + 30, baseType: "asphalt", capacity: capacity * 1.1 }),
    ];
    layers = {
      paver: layerSet.paver[idx],
      sandBed: layerSet.sandBed[idx],
      base: rangeMid(layerSet.granularBase[idx]),
      baseLabel: layerSet.granularBase[idx],
      subbase: subbase ?? improvePair.subbase,
      improvement: cbr < 2 ? improvePair.improvement : 0,
      method: "Catálogo de tránsito pesado - Tablas 5.5, 5.6 y 5.7",
      status: validationFlags.verified,
    };
    memory.push(`Se adopta rango de Tabla 5.7: ${highTrafficLayerTable.ranges[idx].label}.`);
    if (subbase === null) {
      warnings.push("CBR < 2%: se activa mejoramiento de subrasante segun Tabla 5.5; la Tabla 5.6 no entrega subbase granular para esta condicion.");
      memory.push(`CBR < 2%: se adopta Tabla 5.5 para subbase/mejoramiento = ${common.subbase}/${common.improvement} mm.`);
    }
  } else {
    const category = input.type === "peatonal" ? "IV" : traffic.category;
    const row =
      mediumLightPedestrianTable.rows.find((item) => item.category === category) ??
      mediumLightPedestrianTable.rows.find((item) => item.category === traffic.category) ??
      mediumLightPedestrianTable.rows.at(-1);
    const band = cbrBand(cbr, "catalog");
    const capacity = Math.max(eea, 500_000);
    const lowCbrPair = cbr < 2 ? table55PairFor(eeDay, cbr) : null;
    const lowCbrImprovement = lowCbrPair?.improvement ?? 0;
    const catalogSubbase = lowCbrPair?.subbase ?? row.cbr[band];
    alternatives = [
      makeAlternative("Catálogo mínimo", {
        paver: row.paver,
        sandBed: row.sandBed,
        base: row.base,
        subbase: catalogSubbase,
        improvement: lowCbrImprovement,
        baseType: "granular",
        demand: eea,
        capacity,
        costs,
      }),
      makeAlternative("Base +20 mm", {
        paver: row.paver,
        sandBed: row.sandBed,
        base: row.base + 20,
        subbase: catalogSubbase,
        improvement: lowCbrImprovement,
        baseType: "granular",
        demand: eea,
        capacity: capacity * 1.08,
        costs,
      }),
      makeAlternative("Base +40 mm", {
        paver: row.paver,
        sandBed: row.sandBed,
        base: row.base + 40,
        subbase: catalogSubbase,
        improvement: lowCbrImprovement,
        baseType: "granular",
        demand: eea,
        capacity: capacity * 1.12,
        costs,
      }),
      makeAlternative("Subbase +30 mm", {
        paver: row.paver,
        sandBed: row.sandBed,
        base: row.base,
        subbase: catalogSubbase + 30,
        improvement: lowCbrImprovement,
        baseType: "granular",
        demand: eea,
        capacity: capacity * 1.05,
        costs,
      }),
      makeAlternative("AdoquÃ­n +20 mm", {
        paver: row.paver + 20,
        sandBed: row.sandBed,
        base: row.base,
        subbase: catalogSubbase,
        improvement: lowCbrImprovement,
        baseType: "granular",
        demand: eea,
        capacity: capacity * 1.06,
        costs,
      }),
      makeAlternative("Subrasante mejorada", {
        paver: row.paver,
        sandBed: row.sandBed,
        base: row.base,
        subbase: lowCbrPair ? lowCbrPair.subbase : Math.max(100, row.cbr[band] - 30),
        improvement: lowCbrPair ? lowCbrPair.improvement : 150,
        baseType: "granular",
        demand: eea,
        capacity: capacity * 1.15,
        costs,
      }),
    ];
    layers = {
      paver: row.paver,
      sandBed: row.sandBed,
      base: row.base,
      baseLabel: `${row.base} base granular`,
      subbase: catalogSubbase,
      improvement: lowCbrImprovement,
      method: "Catálogo medio, liviano y peatonal - Tabla 5.8",
      status: validationFlags.verified,
    };
    memory.push(`Se usa Tabla 5.8 para categoría ${row.category} y CBR de catálogo ${band}%.`);
    if (cbr < 2) {
      memory.push(`CBR < 2%: la Tabla 5.8 no cubre esta condicion; se incorpora mejoramiento segun Tabla 5.5 para EE/dia del proyecto (${lowCbrPair.subbase}/${lowCbrPair.improvement} mm subbase/mejoramiento).`);
      warnings.push("CBR < 2%: se activa mejoramiento de subrasante en pavimento medio, liviano o peatonal usando Tabla 5.5 como criterio complementario.");
    }
  }

  const selected = selectEconomicAlternative(alternatives);
  if (selected) {
    layers = { ...layers, ...selected.layers };
    memory.push(`Alternativa seleccionada: ${selected.name}, por cumplir la demanda con el menor costo estimado por m2.`);
  }

  return {
    type: input.type,
    inputs: { ...input, eeDay, designLife, cbr, heavyVehDay },
    eea,
    traffic,
    layers,
    alternatives,
    selectedAlternative: selected,
    costs,
    verification: buildVerification(eea, selected, "EEA"),
    series: trafficSeries({ eeDay, designLife, growthRate }),
    warnings,
    limitations: [
      "Los valores corresponden a espesores mínimos salvo la cama de arena.",
      "La comparacion economica usa costos unitarios configurables; no reemplaza un presupuesto detallado de obra.",
      "Se recomienda aparejo espina de pescado en superficies vehiculares.",
      manualReviewNote(),
    ],
    memory,
  };
}

export function designPort(input) {
  const cbr = toNumber(input.cbr);
  const wheelLoadKg = toNumber(input.wheelLoadKg);
  const tirePressureMpa = Math.max(0.01, toNumber(input.tirePressureMpa, 0.8));
  const designLife = Math.max(1, toNumber(input.designLife, 25));
  const passes = toNumber(input.passesPerDay) * 365 * designLife;
  const dynamicFactor = toNumber(input.dynamicFactor, 1.2);
  const proximity = lookupProximity(toNumber(input.wheelSpacingMm, 600), toNumber(input.effectiveDepthMm, 2000));
  const damage = Math.pow(wheelLoadKg / 12000, 4) * Math.pow(tirePressureMpa / 0.8, 0.5);
  const sewl = (wheelLoadKg * 9.80665 * dynamicFactor * proximity) / 1000;
  const bgtc = lookupPortThickness(sewl, passes / 1000);
  const improvement = cbr < 5 ? portImprovementFor(cbr) : null;
  const warnings = validateInputs({ ...input, type: "portuario", cbr, wheelLoadKg });
  const costs = costModel(input);

  warnings.push("El diseño por carga estática de contenedores con Ecuación 5.1 queda pendiente de validación manual.");
  if (sewl > 936) warnings.push("La carga equivalente excede el mayor valor tabulado leído en las Tablas 5.11-5.12.");
  if (cbr < 5) warnings.push("CBR portuario inferior a 5%: se activa subbase granular de 150 mm y mejoramiento de suelo segun Tabla 5.13.");

  const common = {
    paver: 100,
    sandBed: 40,
    subbase: improvement ? improvement.subbase : 0,
    improvement: improvement ? improvement.improvement : 0,
    demand: sewl,
    costs,
  };
  const alternatives = [
    makeAlternative("BGTC3 mínimo verificado", { ...common, base: bgtc, baseType: "cement", capacity: sewl }),
    makeAlternative("BGTC3 con margen +50 mm", { ...common, base: bgtc + 50, baseType: "cement", capacity: sewl * 1.12 }),
    makeAlternative("BGTC3 con margen +100 mm", { ...common, base: bgtc + 100, baseType: "cement", capacity: sewl * 1.24 }),
    makeAlternative("BGTC3 + subbase 200 mm", { ...common, base: bgtc, subbase: Math.max(common.subbase, 200), baseType: "cement", capacity: sewl * 1.15 }),
    makeAlternative("Base granular equivalente x3", { ...common, base: bgtc * 3, baseType: "granular", capacity: sewl }),
    makeAlternative("Granular equivalente + mejoramiento", { ...common, base: bgtc * 3, subbase: Math.max(common.subbase, 200), improvement: common.improvement + 150, baseType: "granular", capacity: sewl * 1.18 }),
  ];
  const selected = selectEconomicAlternative(alternatives);

  return {
    type: "portuario",
    inputs: { ...input, cbr, wheelLoadKg },
    eea: passes * damage,
    traffic: { name: "Portuario", category: input.operationType },
    layers: {
      ...selected.layers,
      method: "Método portuario con PAWL/SEWL - Tablas 5.10 a 5.13",
      status: validationFlags.derived,
    },
    alternatives,
    selectedAlternative: selected,
    costs,
    verification: buildVerification(sewl, selected, "SEWL"),
    series: trafficSeries({ eeDay: (passes * damage) / 365 / designLife, designLife, growthRate: 0 }),
    warnings,
    limitations: [
      "Para acopio de contenedores debe validarse también la carga estática CE y Ecuación 5.1.",
      "La equivalencia SEWL se interpola desde las Tablas 5.11 y 5.12 transcritas.",
      "La comparacion economica usa costos unitarios configurables; no reemplaza un presupuesto detallado de obra.",
      manualReviewNote(),
    ],
    memory: [
      `Tipo de operacion critica declarada: ${input.operationType}. Debe corresponder al equipo o maniobra que gobierna el diseno.`,
      cbr < 5 ? `CBR < 5%: Tabla 5.13 => mejoramiento ${selected.layers.improvement} mm y subbase granular ${selected.layers.subbase} mm.` : "CBR >= 5%: no se requiere subbase ni mejoramiento de suelo segun Tabla 5.13.",
      `Daño relativo D = (W/12000)^4 x (P/0,8)^0,5 = ${damage.toFixed(2)}.`,
      `SEWL = carga de rueda x factor dinámico x proximidad = ${sewl.toFixed(1)} kN.`,
      `Pasadas de diseño = ${formatNumber(passes)} (${(passes / 1000).toFixed(0)} x 10^3).`,
      `Espesor BGTC3 interpolado/adoptado = ${bgtc} mm.`,
      `Alternativa seleccionada: ${selected.name}, menor costo estimado por m2 entre alternativas que cumplen.`,
    ],
  };
}

export function designAirport(input) {
  const cbr = toNumber(input.cbr);
  const mtowKg = toNumber(input.mtowKg);
  const designLife = Math.max(1, toNumber(input.designLife, 20));
  const departures = toNumber(input.annualDepartures) * designLife;
  const rearGearLoad = mtowKg * 0.95;
  const wheelLoad = rearGearLoad / Math.max(1, toNumber(input.mainGearWheels, 2));
  const pressure = toNumber(input.tirePressureKgCm2, 7.4);
  const warnings = validateInputs({ ...input, type: "aeroportuario", cbr, mtowKg });
  const costs = costModel(input);
  const isHeavy = mtowKg > 5700;

  warnings.push("El análisis mecanicista aeroportuario completo requiere Tablas 5.14-5.17 y Ecuaciones 5.4-5.14 validadas manualmente.");
  if (mtowKg > 50000) warnings.push("La aeronave excede el rango mencionado de 50.000 kg para presiones típicas del manual.");

  const paver = isHeavy ? 100 : 80;
  const base = isHeavy ? 300 : 250;
  const subbase = cbr < 10 ? 200 : 150;
  const improvement = cbr < 10 ? 250 : 0;
  const airportCapacity = wheelLoad * (isHeavy ? 1.08 : 1.12);
  const alternatives = [
    makeAlternative("Pre-dimensionamiento mínimo", {
      paver,
      sandBed: 40,
      base,
      subbase,
      improvement,
      baseType: "granular",
      demand: wheelLoad,
      capacity: airportCapacity,
      costs,
      reviewRequired: true,
    }),
    makeAlternative("Base +20% para revisión", {
      paver,
      sandBed: 40,
      base: Math.round(base * 1.2),
      subbase,
      improvement,
      baseType: "granular",
      demand: wheelLoad,
      capacity: airportCapacity * 1.12,
      costs,
      reviewRequired: true,
    }),
    makeAlternative("Subbase +100 mm para revision", {
      paver,
      sandBed: 40,
      base,
      subbase: subbase + 100,
      improvement,
      baseType: "granular",
      demand: wheelLoad,
      capacity: airportCapacity * 1.1,
      costs,
      reviewRequired: true,
    }),
    makeAlternative("Adoquin +20 mm para plataforma", {
      paver: paver + 20,
      sandBed: 40,
      base,
      subbase,
      improvement,
      baseType: "granular",
      demand: wheelLoad,
      capacity: airportCapacity * 1.07,
      costs,
      reviewRequired: true,
    }),
    makeAlternative("Paquete conservador integral", {
      paver: paver + 20,
      sandBed: 40,
      base: Math.round(base * 1.25),
      subbase: subbase + 100,
      improvement: improvement + (cbr < 10 ? 150 : 0),
      baseType: "granular",
      demand: wheelLoad,
      capacity: airportCapacity * 1.25,
      costs,
      reviewRequired: true,
    }),
  ];
  const selected = selectEconomicAlternative(alternatives);

  return {
    type: "aeroportuario",
    inputs: { ...input, cbr, mtowKg },
    eea: departures,
    traffic: { name: isHeavy ? "Aeronave pesada" : "Aeronave ligera/intermedia", category: input.aircraftName || "Aeronave de diseño" },
    layers: {
      ...selected.layers,
      method: "Pre-dimensionamiento aeroportuario - requiere revisión mecanicista final",
      status: "Preverificado con revisión mecanicista requerida.",
    },
    alternatives,
    selectedAlternative: selected,
    costs,
    verification: {
      demand: wheelLoad,
      capacity: selected.capacity,
      utilization: selected.utilization,
      complies: selected.complies,
      label: "Carga por rueda",
      note: "Preverificado: la carga queda dentro de la capacidad preliminar adoptada; se requiere revisión mecanicista final con tablas aeroportuarias completas.",
    },
    series: trafficSeries({ eeDay: departures / 365 / designLife, designLife, growthRate: 0 }),
    warnings,
    limitations: [
      "Resultado aeroportuario presentado como pre-verificación estructural, no como diseño final contractual.",
      "Se debe verificar tensiones, deformaciones y deflexiones admisibles con el procedimiento mecanicista del manual.",
      "La comparacion economica usa costos unitarios configurables; no reemplaza un presupuesto detallado de obra.",
      manualReviewNote(),
    ],
    memory: [
      `Carga estimada en tren principal = 95% de MTOW = ${formatNumber(rearGearLoad)} kg.`,
      `Carga por rueda principal aproximada = ${formatNumber(wheelLoad)} kg.`,
      `Presión de inflado ingresada = ${pressure} kg/cm2.`,
      `Capacidad preliminar adoptada = ${formatNumber(selected.capacity)} kg por rueda, D/C = ${(selected.utilization * 100).toFixed(1)}%.`,
      "El manual exige seleccionar aeronave de diseño y convertir salidas equivalentes antes del diseño final.",
    ],
  };
}

export function runDesign(input) {
  if (["vehicular", "peatonal"].includes(input.type)) return designVehicularOrPedestrian(input);
  if (input.type === "portuario") return designPort(input);
  return designAirport(input);
}

export function buildSensitivityCases(input) {
  const cleanInput = { ...input };
  const cases = [
    { name: "Caso base", patch: {} },
    { name: "Demanda +10%", patch: demandPatch(cleanInput, 1.1) },
    { name: "Demanda +20%", patch: demandPatch(cleanInput, 1.2) },
    { name: "CBR -20%", patch: { cbr: Math.max(0.1, toNumber(cleanInput.cbr) * 0.8) } },
    { name: "CBR +20%", patch: { cbr: toNumber(cleanInput.cbr) * 1.2 } },
  ];
  return cases.map((item) => {
    const scenario = runDesign({ ...cleanInput, ...item.patch });
    return {
      name: item.name,
      demand: scenario.verification?.demand ?? scenario.eea,
      label: scenario.verification?.label ?? "",
      alternative: scenario.selectedAlternative?.name ?? "Sin seleccion",
      utilization: scenario.verification?.utilization ?? 0,
      complies: Boolean(scenario.verification?.complies),
      thickness: scenario.selectedAlternative?.thickness ?? 0,
      costIndex: scenario.selectedAlternative?.costIndex ?? 0,
      costPerM2: scenario.selectedAlternative?.costPerM2 ?? 0,
      totalCost: scenario.selectedAlternative?.totalCost ?? 0,
    };
  });
}

function demandPatch(input, factor) {
  if (input.type === "portuario") return { wheelLoadKg: toNumber(input.wheelLoadKg) * factor };
  if (input.type === "aeroportuario") return { mtowKg: toNumber(input.mtowKg) * factor };
  return { eeDay: toNumber(input.eeDay) * factor };
}

function findByEeDay(table, eeDay) {
  return table.rows.find((row) => eeDay < row.maxEeDay || row.maxEeDay === Infinity) ?? table.rows.at(-1);
}

function parseSubbaseImprovement(value) {
  const [subbase, improvement] = String(value).split("/").map(Number);
  return { subbase, improvement };
}

function table55PairFor(eeDay, cbr) {
  const bandIndex = subbaseAndImprovementTable.bands.indexOf(cbrBand(cbr));
  const row = findByEeDay(subbaseAndImprovementTable, eeDay);
  return parseSubbaseImprovement(row.values[bandIndex]);
}

function portImprovementFor(cbr) {
  const conservativeCbr = Math.max(1, Math.min(4, Math.floor(toNumber(cbr))));
  return portImprovementTable.rows.find((row) => row.cbr === conservativeCbr) ?? portImprovementTable.rows[0];
}

function highTrafficIndex(eea) {
  const million = eea / 1_000_000;
  const idx = highTrafficLayerTable.ranges.findIndex((range) => million >= range.min && million <= range.max);
  return idx >= 0 ? idx : highTrafficLayerTable.ranges.length - 1;
}

function rangeMid(value) {
  if (typeof value === "number") return value;
  const parts = String(value).split("-").map(Number);
  if (parts.length === 2) return Math.round((parts[0] + parts[1]) / 2);
  return Number(value) || 0;
}

function lookupProximity(spacing, depth) {
  const depthIndex = nearestIndex(portProximityFactors.depths, depth);
  const row = portProximityFactors.rows.reduce((best, current) =>
    Math.abs(current.spacing - spacing) < Math.abs(best.spacing - spacing) ? current : best,
  );
  return row.factors[depthIndex];
}

function lookupPortThickness(sewl, passesThousands) {
  const passIndex = nearestIndex(portSewlTable.passesThousands, passesThousands);
  const row = portSewlTable.rows.find((item) => item.sewl[passIndex] >= sewl);
  return row ? row.thickness : portSewlTable.rows.at(-1).thickness;
}

function nearestIndex(values, target) {
  return values.reduce((bestIndex, value, index) =>
    Math.abs(value - target) < Math.abs(values[bestIndex] - target) ? index : bestIndex, 0);
}

function costModel(input) {
  return {
    area: positive(input.projectArea, 1000),
    paver60: positive(input.costPaver60, positive(input.costPaver, 24.5)),
    paver80: positive(input.costPaver80, 29.5),
    paver100: positive(input.costPaver100, 35),
    paver120: positive(input.costPaver120, 42),
    sand: positive(input.costSand, 18),
    granular: positive(input.costGranularBase, 42),
    cement: positive(input.costCementBase, 68),
    asphalt: positive(input.costAsphaltBase, 145),
    asphaltDensity: positive(input.asphaltDensity, 2.35),
    subbase: positive(input.costSubbase, 32),
    improvement: positive(input.costImprovement, 22),
  };
}

function positive(value, fallback) {
  const n = toNumber(value, fallback);
  return n > 0 ? n : fallback;
}

function makeAlternative(name, params) {
  const layers = {
    paver: toNumber(params.paver),
    sandBed: toNumber(params.sandBed),
    base: toNumber(params.base),
    baseLabel: `${toNumber(params.base)} ${baseTypeLabel(params.baseType)}`,
    subbase: toNumber(params.subbase),
    improvement: toNumber(params.improvement),
  };
  const baseCost =
    params.baseType === "asphalt"
      ? mmToM(layers.base) * params.costs.asphaltDensity * params.costs.asphalt
      : mmToM(layers.base) * (params.baseType === "cement" ? params.costs.cement : params.costs.granular);
  const costPerM2 =
    paverUnitCost(layers.paver, params.costs) +
    mmToM(layers.sandBed) * params.costs.sand +
    baseCost +
    mmToM(layers.subbase) * params.costs.subbase +
    mmToM(layers.improvement) * params.costs.improvement;
  const totalCost = costPerM2 * params.costs.area;
  const totalThickness = layers.paver + layers.sandBed + layers.base + layers.subbase + layers.improvement;
  const utilization = params.capacity > 0 ? params.demand / params.capacity : 1;
  return {
    name,
    layers,
    thickness: totalThickness,
    costIndex: Number(costPerM2.toFixed(2)),
    costPerM2: Number(costPerM2.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    demand: params.demand,
    capacity: params.capacity,
    utilization,
    complies: utilization <= 1,
    pending: Boolean(params.pending),
    reviewRequired: Boolean(params.reviewRequired),
  };
}

function mmToM(value) {
  return toNumber(value) / 1000;
}

function paverUnitCost(thickness, costs) {
  const t = toNumber(thickness);
  if (t <= 60) return costs.paver60;
  if (t <= 80) return costs.paver80;
  if (t <= 100) return costs.paver100;
  return costs.paver120;
}

function baseTypeLabel(type) {
  if (type === "cement") return "base tratada con cemento";
  if (type === "asphalt") return "base tratada con asfalto";
  return "base granular";
}

function selectEconomicAlternative(alternatives) {
  const valid = alternatives.filter((item) => item.complies);
  if (!valid.length) return alternatives[0] ?? null;
  return valid.reduce((best, item) => (item.costIndex < best.costIndex ? item : best));
}

function buildVerification(demand, selected, label) {
  if (!selected) return null;
  return {
    demand,
    capacity: selected.capacity,
    utilization: selected.utilization,
    complies: selected.complies,
    label,
    note: selected.complies
      ? "Cumple: la demanda de diseño queda dentro de la capacidad del catálogo aplicado."
      : "No cumple o requiere validación manual adicional.",
  };
}

function manualReviewNote() {
  return `Pendientes técnicos de extracción: ${pendingManualItems.length} grupos de tablas/ecuaciones requieren validación manual antes de uso contractual.`;
}

export function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: digits }).format(value);
}
