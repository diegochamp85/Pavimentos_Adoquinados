import { manualMeta, normativeReferences } from "../data/manualTables.js";
import { formatNumber } from "./calculations.js";

export async function exportPdf(result) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    window.print();
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = 30;

  drawCover(doc, result);
  doc.addPage();
  drawHeader(doc, "Informe tecnico de diseno estructural");

  y = sectionTitle(doc, "1. Resumen ejecutivo", y);
  y = drawExecutiveSummary(doc, result, y);

  y = sectionTitle(doc, "2. Datos de entrada", y + 6);
  y = drawKeyValueTable(doc, Object.entries(result.inputs).map(([key, value]) => [labelFor(key), value]), y);

  y = sectionTitle(doc, "3. Metodologia y marco de calculo", y + 6);
  y = drawMethodology(doc, result, y);

  y = sectionTitle(doc, "4. Verificacion estructural", y + 6);
  y = drawKeyValueTable(doc, [
    ["Solicitacion de diseno", `${formatNumber(result.verification?.demand ?? result.eea, 2)} ${result.verification?.label ?? ""}`],
    ["Capacidad de alternativa seleccionada", `${formatNumber(result.verification?.capacity ?? 0, 2)} ${result.verification?.label ?? ""}`],
    ["Relacion demanda/capacidad", `${((result.verification?.utilization ?? 0) * 100).toFixed(1)}%`],
    ["Condicion", result.verification?.complies ? "Cumple" : "Requiere validacion / no concluyente"],
    ["Nota", result.verification?.note ?? ""],
  ], y);

  y = sectionTitle(doc, "5. Alternativas evaluadas por capa", y + 6);
  y = drawAlternativesTable(doc, result.alternatives, y);

  y = sectionTitle(doc, "6. Ranking multicriterio", y + 6);
  y = drawRankingTable(doc, rankAlternatives(result), y);

  y = sectionTitle(doc, "7. Analisis de sensibilidad", y + 6);
  y = drawSensitivityTable(doc, result.sensitivity || [], y);

  y = sectionTitle(doc, "8. Estructura seleccionada", y + 6);
  y = drawKeyValueTable(doc, layerRowsFromResult(result).map((row) => [row.layer, row.value]), y);

  if (y > 220) {
    doc.addPage();
    drawHeader(doc, "Memoria tecnica de diseno estructural");
    y = 30;
  }
  y = sectionTitle(doc, "9. Marco normativo y referencias", y + 6);
  normativeReferences.forEach((item) => {
    y = writeWrapped(doc, `- ${item.name}: ${item.scope}`, margin, y, 182);
  });

  y = sectionTitle(doc, "10. Memoria de calculo", y + 6);
  result.memory.forEach((line, index) => {
    y = writeWrapped(doc, `${index + 1}. ${line}`, margin, y, 182);
  });

  doc.addPage();
  drawHeader(doc, "Figuras tecnicas para reporte");
  y = 30;
  y = sectionTitle(doc, "11. Figuras de desempeno y comparacion", y);
  await addElementImage(doc, "#trafficChartPanel", margin, y, 86, 58);
  drawFigureCaption(doc, "Figura 1. Evolucion acumulada de solicitaciones y banda de sensibilidad.", margin, y + 62);
  await addElementImage(doc, "#alternativesChartPanel", 110, y, 86, 58);
  drawFigureCaption(doc, "Figura 2. Frontera tecnica-economica de alternativas.", 110, y + 62);
  y += 76;
  await addElementImage(doc, "#utilizationChartPanel", margin, y, 86, 58);
  drawFigureCaption(doc, "Figura 3. Utilizacion estructural D/C y costo estimado por m2.", margin, y + 62);
  await addElementImage(doc, "#layerChartPanel", 110, y, 86, 58);
  drawFigureCaption(doc, "Figura 4. Composicion estratigrafica por alternativa.", 110, y + 62);

  doc.addPage();
  drawHeader(doc, "Seccion estructural y verificacion");
  y = 30;
  await addElementImage(doc, "#sectionPanel", margin, y, 86, 78);
  drawFigureCaption(doc, "Figura 5. Seccion transversal recomendada.", margin, y + 82);
  await addElementImage(doc, "#verificationPanel", 110, y, 86, 78);
  drawFigureCaption(doc, "Figura 6. Verificacion demanda/capacidad.", 110, y + 82);

  doc.addPage();
  drawHeader(doc, "Discusion tecnica y cierre");
  y = 30;
  y = sectionTitle(doc, "12. Discusion tecnica", y);
  y = drawDiscussion(doc, result, y);
  y = sectionTitle(doc, "13. Advertencias, limitaciones y criterio profesional", y + 6);
  [...result.warnings, ...result.limitations, manualMeta.scopeNote].forEach((line) => {
    y = writeWrapped(doc, `- ${line}`, margin, y, 182);
  });
  y = sectionTitle(doc, "14. Conclusiones", y + 6);
  y = drawConclusions(doc, result, y);

  addFooters(doc);
  doc.save("memoria-tecnica-adoquines.pdf");
}

function drawCover(doc, result) {
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Informe tecnico", 14, 28);
  doc.setFontSize(15);
  doc.text("Diseno estructural de pavimento de adoquines de hormigon", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Modulo: ${moduleLabel(result.type)}`, 14, 56);
  doc.setTextColor(20, 28, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Resumen del diseno", 14, 92);
  drawKeyValueTable(doc, [
    ["Manual base", manualMeta.title],
    ["Solicitacion", `${formatNumber(result.verification?.demand ?? result.eea, 2)} ${result.verification?.label ?? ""}`],
    ["Alternativa recomendada", result.selectedAlternative?.name ?? "--"],
    ["Estructura total", `${result.selectedAlternative?.thickness ?? 0} mm`],
    ["Costo materiales", `${money(result.selectedAlternative?.costPerM2 ?? 0)}/m2`],
    ["Costo total estimado", money(result.selectedAlternative?.totalCost ?? 0)],
    ["Condicion", result.verification?.complies ? "Cumple demanda/capacidad" : "Requiere validacion adicional"],
  ], 104);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(95, 105, 101);
  doc.text("Documento generado por aplicativo de pre-dimensionamiento. Uso sujeto a revision del ingeniero responsable.", 14, 270);
  doc.setTextColor(20, 28, 25);
}

function drawHeader(doc, title) {
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, 14, 12);
  doc.setTextColor(20, 28, 25);
}

function drawExecutiveSummary(doc, result, y) {
  const selected = result.selectedAlternative;
  const utilization = ((result.verification?.utilization ?? 0) * 100).toFixed(1);
  const text = [
    `Se evalua el modulo ${moduleLabel(result.type)} con base en el Manual de Diseno de Pavimentos de Adoquines de Hormigon y referencias normativas complementarias.`,
    `La alternativa recomendada es "${selected?.name ?? "--"}", con espesor total ${selected?.thickness ?? 0} mm, costo estimado ${money(selected?.costPerM2 ?? 0)}/m2, costo total ${money(selected?.totalCost ?? 0)} y relacion demanda/capacidad D/C = ${utilization}%.`,
    `El resultado ${result.verification?.complies ? "cumple preliminarmente la demanda estructural calculada" : "requiere validacion adicional antes de adoptarse como solucion"} y debe ser revisado por un ingeniero responsable antes de uso contractual.`,
  ];
  text.forEach((line) => { y = writeWrapped(doc, line, 14, y, 182); });
  return y;
}

function drawMethodology(doc, result, y) {
  const rows = [
    ["Clasificacion", `${result.traffic?.name ?? ""} ${result.traffic?.category ?? ""}`],
    ["Metodo aplicado", result.layers?.method ?? ""],
    ["Criterio de seleccion", "Se filtran alternativas que cumplen D/C <= 1,0 y se selecciona la de menor costo estimado por m2."],
    ["Ranking multicriterio", "Costo real por m2 42%, margen estructural 28%, constructibilidad 20% y riesgo tecnico 10%."],
    ["Sensibilidad", "Se reejecuta el mismo metodo para demanda +10%, demanda +20%, CBR -20% y CBR +20%."],
  ];
  return drawKeyValueTable(doc, rows, y);
}

function drawDiscussion(doc, result, y) {
  const best = result.selectedAlternative;
  const ranking = rankAlternatives(result);
  const robust = (result.sensitivity || []).filter((item) => item.complies).length;
  const total = (result.sensitivity || []).length || 1;
  const lines = [
    `La solucion seleccionada presenta un D/C de ${((result.verification?.utilization ?? 0) * 100).toFixed(1)}%, por lo que el margen estructural disponible es ${Math.max(0, (1 - (result.verification?.utilization ?? 0)) * 100).toFixed(1)}%.`,
    `En el ranking multicriterio, la alternativa mejor puntuada es ${ranking[0]?.alt.name ?? best?.name ?? "--"}; esta lectura complementa el criterio de costo minimo por m2 y permite revisar constructibilidad y riesgo tecnico.`,
    `El analisis de sensibilidad conserva cumplimiento en ${robust} de ${total} escenarios evaluados. Los escenarios no conformes deben tratarse como condicion de diseno critica o como requerimiento de validacion adicional.`,
  ];
  lines.forEach((line) => { y = writeWrapped(doc, line, 14, y, 182); });
  return y;
}

function drawConclusions(doc, result, y) {
  const selected = result.selectedAlternative;
  const lines = [
    `Se recomienda adoptar preliminarmente la alternativa "${selected?.name ?? "--"}" con espesor total ${selected?.thickness ?? 0} mm.`,
    `La recomendacion queda condicionada a confirmar parametros de entrada, calidad de materiales, drenaje, confinamiento lateral y control constructivo.`,
    "El manual utilizado es una guia de diseno; el informe no reemplaza la responsabilidad tecnica ni la revision final del proyectista.",
  ];
  lines.forEach((line) => { y = writeWrapped(doc, `- ${line}`, 14, y, 182); });
  return y;
}

function drawRankingTable(doc, rows, y) {
  const headers = ["Alt.", "Margen", "Costo", "Construct.", "Riesgo", "Puntaje", "Nombre"];
  const widths = [13, 18, 17, 21, 17, 17, 79];
  y = drawTableHeader(doc, headers, widths, y);
  rows.forEach((row, index) => {
    if (y > 276) {
      doc.addPage();
      drawHeader(doc, "Informe tecnico de diseno estructural");
      y = 30;
      y = drawTableHeader(doc, headers, widths, y);
    }
    doc.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 248 : 255);
    doc.rect(14, y - 5, 182, 9, "F");
    const values = [row.code, `${row.margin.toFixed(1)}%`, row.costScore.toFixed(0), row.constructability.toFixed(0), row.risk.toFixed(0), row.score.toFixed(0), row.alt.name];
    drawTableRow(doc, values, widths, y);
    y += 9;
  });
  return y + 4;
}

function drawSensitivityTable(doc, rows, y) {
  const headers = ["Escenario", "Demanda", "Alternativa", "D/C", "Estado"];
  const widths = [33, 34, 65, 20, 30];
  y = drawTableHeader(doc, headers, widths, y);
  rows.forEach((row, index) => {
    if (y > 276) {
      doc.addPage();
      drawHeader(doc, "Informe tecnico de diseno estructural");
      y = 30;
      y = drawTableHeader(doc, headers, widths, y);
    }
    doc.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 248 : 255);
    doc.rect(14, y - 5, 182, 10, "F");
    const values = [
      row.name,
      `${formatNumber(row.demand, 1)} ${row.label}`,
      row.alternative,
      `${(row.utilization * 100).toFixed(1)}%`,
      row.complies ? "Cumple" : "Validar",
    ];
    drawTableRow(doc, values, widths, y);
    y += 10;
  });
  return y + 4;
}

function drawTableHeader(doc, headers, widths, y) {
  doc.setFillColor(15, 118, 110);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  let x = 14;
  headers.forEach((header, index) => {
    doc.rect(x, y - 5, widths[index], 8, "F");
    doc.text(header, x + 1.5, y);
    x += widths[index];
  });
  doc.setTextColor(20, 28, 25);
  return y + 8;
}

function drawTableRow(doc, values, widths, y) {
  let x = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  values.forEach((value, col) => {
    doc.text(doc.splitTextToSize(String(value), widths[col] - 3), x + 1.5, y);
    x += widths[col];
  });
}

function drawFigureCaption(doc, text, x, y) {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(95, 105, 101);
  doc.text(doc.splitTextToSize(text, 82), x, y);
  doc.setTextColor(20, 28, 25);
}

function sectionTitle(doc, title, y) {
  if (y > 265) {
    doc.addPage();
    drawHeader(doc, "Memoria tecnica de diseno estructural");
    y = 30;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title, 14, y);
  return y + 7;
}

function drawKeyValueTable(doc, rows, y) {
  doc.setFontSize(8);
  rows.forEach(([key, value], index) => {
    if (y > 276) {
      doc.addPage();
      drawHeader(doc, "Memoria tecnica de diseno estructural");
      y = 30;
    }
    const fill = index % 2 === 0 ? 248 : 255;
    doc.setFillColor(fill, fill, fill);
    doc.rect(14, y - 4, 182, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.text(String(key), 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(String(value ?? ""), 118), 76, y);
    y += 8;
  });
  return y;
}

function drawAlternativesTable(doc, alternatives, y) {
  const headers = ["Alternativa", "Adoq.", "Arena", "Base", "Subb.", "Mej.", "Esp.", "$/m2", "$ total", "D/C", "Estado"];
  const widths = [34, 12, 12, 20, 14, 14, 14, 15, 20, 12, 15];
  doc.setFillColor(15, 118, 110);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  let x = 14;
  headers.forEach((header, index) => {
    doc.rect(x, y - 5, widths[index], 8, "F");
    doc.text(header, x + 1.5, y);
    x += widths[index];
  });
  doc.setTextColor(20, 28, 25);
  y += 8;
  alternatives.forEach((alt, index) => {
    const fill = index % 2 === 0 ? 248 : 255;
    doc.setFillColor(fill, fill, fill);
    doc.rect(14, y - 5, 182, 11, "F");
    const values = [
      alt.name,
      alt.layers.paver,
      alt.layers.sandBed,
      alt.layers.base,
      alt.layers.subbase || 0,
      alt.layers.improvement || 0,
      alt.thickness,
      money(alt.costPerM2),
      money(alt.totalCost),
      `${(alt.utilization * 100).toFixed(1)}%`,
      alt.reviewRequired ? "Preverif." : alt.pending ? "Pend." : alt.complies ? "Cumple" : "No cumple",
    ];
    x = 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    values.forEach((value, col) => {
      doc.text(doc.splitTextToSize(String(value), widths[col] - 3), x + 1.5, y);
      x += widths[col];
    });
    y += 11;
  });
  doc.setFontSize(7);
  doc.setTextColor(95, 105, 101);
  doc.text("Espesores de capas en mm. El tipo de base se detalla en el nombre de alternativa y en la estructura seleccionada.", 14, y + 2);
  doc.setTextColor(20, 28, 25);
  return y + 8;
}

async function addElementImage(doc, selector, x, y, width, height) {
  const element = document.querySelector(selector);
  if (!element || !window.html2canvas) return;
  const canvas = await window.html2canvas(element, { backgroundColor: "#ffffff", scale: 2 });
  doc.addImage(canvas.toDataURL("image/png"), "PNG", x, y, width, height);
}

function layerRowsFromResult(result) {
  return [
    { layer: "Adoquin", value: `${result.layers.paver} mm` },
    { layer: "Cama de arena", value: `${result.layers.sandBed} mm` },
    { layer: "Base", value: `${result.layers.baseLabel} mm` },
    { layer: "Subbase", value: `${result.layers.subbase || 0} mm` },
    { layer: "Mejoramiento de subrasante", value: `${result.layers.improvement || 0} mm` },
  ];
}

function writeWrapped(doc, text, x, y, width) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const lines = doc.splitTextToSize(String(text), width);
  lines.forEach((line) => {
    if (y > 280) {
      doc.addPage();
      drawHeader(doc, "Memoria tecnica de diseno estructural");
      y = 30;
    }
    doc.text(line, x, y);
    y += 5;
  });
  return y + 1;
}

function addFooters(doc) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(95, 105, 101);
    doc.text(`Pagina ${page} de ${pages}`, 176, 290);
    doc.text("Resultado sujeto a revision de ingeniero responsable.", 14, 290);
    doc.setTextColor(20, 28, 25);
  }
}

function money(value) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value) || 0);
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

function moduleLabel(type) {
  const labels = {
    vehicular: "Pavimento vehicular urbano",
    peatonal: "Pavimento peatonal",
    portuario: "Explanada industrial / portuaria",
    aeroportuario: "Pavimento aeroportuario / aerodromo",
  };
  return labels[type] ?? type;
}

function labelFor(key) {
  const labels = {
    designLife: "Vida de diseno",
    cbr: "CBR subrasante",
    eeDay: "Ejes equivalentes diarios",
    growthRate: "Crecimiento anual",
    heavyVehDay: "Vehiculos pesados diarios",
    operationType: "Tipo de operacion",
    wheelLoadKg: "Carga por rueda",
    tirePressureMpa: "Presion de neumatico",
    passesPerDay: "Pasadas diarias",
    dynamicFactor: "Factor dinamico",
    wheelSpacingMm: "Separacion de ruedas",
    effectiveDepthMm: "Profundidad efectiva",
    aircraftName: "Aeronave de diseno",
    mtowKg: "MTOW",
    annualDepartures: "Salidas anuales",
    mainGearWheels: "Ruedas tren principal",
    tirePressureKgCm2: "Presion neumatico aeronave",
    projectArea: "Area de proyecto",
    costPaver: "Costo adoquin ($/m2)",
    paverPriceThickness: "Espesor asociado al precio de adoquin",
    costSand: "Costo arena ($/m3)",
    costGranularBase: "Costo base granular ($/m3)",
    costCementBase: "Costo base estabilizada ($/m3)",
    costAsphaltBase: "Costo asfalto ($/ton)",
    asphaltDensity: "Densidad asfalto (ton/m3)",
    costSubbase: "Costo subbase ($/m3)",
    costImprovement: "Costo mejoramiento ($/m3)",
  };
  return labels[key] ?? key;
}
