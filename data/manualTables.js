export const manualMeta = {
  title: "Manual de Diseño de Pavimentos de Adoquines de Hormigón",
  publisher: "Instituto del Cemento y del Hormigón de Chile",
  year: 2013,
  scopeNote:
    "El manual constituye una guía provisional de diseño. Todo resultado debe ser revisado y aprobado por un ingeniero responsable.",
};

export const validationFlags = {
  verified: "Extraído y validado visualmente desde el PDF.",
  pending:
    "Pendiente de validación manual: el PDF no permitió extraer esta tabla o ecuación con certeza suficiente.",
  derived:
    "Cálculo automatizado a partir del procedimiento descrito en el manual.",
};

export const normativeReferences = [
  {
    name: "BS 7533",
    scope: "Referencia principal citada por el manual para pavimentos vehiculares y peatonales con adoquines.",
  },
  {
    name: "Manual de Carreteras de Chile, Volumen 5 y Volumen 8",
    scope: "Especificaciones, materiales, muestreo, ensayos y control de bases/subbases granulares.",
  },
  {
    name: "Código MINVU de obras de pavimentación",
    scope: "Referencia para vías urbanas y obras de pavimentación en contexto urbano.",
  },
  {
    name: "Knapton / enfoque británico portuario",
    scope: "Diseño de pavimentos portuarios mediante PAWL/SEWL, BGTC y cargas de maquinaria.",
  },
  {
    name: "FAA / DGAC Chile",
    scope: "Criterios de aeronaves de diseño, configuración de trenes, cargas y salidas equivalentes.",
  },
  {
    name: "ASTM, EN 1338 y AS/NZS",
    scope: "Ensayos y especificaciones de adoquines: resistencia, absorción, abrasión, hielo/deshielo y control dimensional.",
  },
];

export const trafficClassification = [
  {
    level: "I",
    category: "IA",
    name: "Pesado",
    eeDay: { op: ">", value: 1000 },
    eeaMillion: { op: ">", value: 0.5 },
    heavyVehDay: "Estimar",
    description:
      "Calles, caminos y accesos a desarrollos industriales, comerciales u otros con alta presencia de vehículos pesados.",
  },
  {
    level: "I",
    category: "IB",
    name: "Pesado",
    eeDay: { op: "<", value: 1000 },
    eeaMillion: { op: ">", value: 0.5 },
    heavyVehDay: "Estimar",
    description:
      "Calles, caminos y accesos a desarrollos industriales, comerciales u otros con alta presencia de vehículos pesados.",
  },
  {
    level: "I",
    category: "IC",
    name: "Pesado",
    eeDay: { op: "<", value: 200 },
    eeaMillion: { op: ">", value: 0.5 },
    heavyVehDay: "Estimar",
    description:
      "Calles, caminos y accesos a desarrollos industriales, comerciales u otros con alta presencia de vehículos pesados.",
  },
  {
    level: "II",
    category: "IIA",
    name: "Medio",
    eeDay: { op: "<", value: 60 },
    eeaMillion: { op: ">", value: 0.5 },
    heavyVehDay: { op: ">", value: 5 },
    description:
      "Calles, caminos, pasajes, retornos, estaciones de servicio y espacios peatonales con presencia de vehículos pesados.",
  },
  {
    level: "II",
    category: "IIB",
    name: "Medio",
    eeDay: { op: "<", value: 60 },
    eeaMillion: { op: "<", value: 0.5 },
    heavyVehDay: { op: "<", value: 5 },
    description:
      "Calles, caminos, pasajes, retornos, estaciones de servicio y espacios peatonales con presencia de vehículos pesados.",
  },
  {
    level: "III",
    category: "IIIA",
    name: "Liviano",
    eeDay: { op: "<", value: 5 },
    eeaMillion: null,
    heavyVehDay: { op: "<", value: 1 },
    description:
      "Áreas peatonales en que circulan eventualmente vehículos pesados como pasajes o calles de condominios.",
  },
  {
    level: "III",
    category: "IIIB",
    name: "Peatonal",
    eeDay: { op: "=", value: 0 },
    eeaMillion: null,
    heavyVehDay: { op: "=", value: 0 },
    description:
      "Estacionamientos de desarrollos comerciales, industriales, deportivos u otros que reciben vehículos pesados.",
  },
  {
    level: "IV",
    category: "IV",
    name: "Peatonal",
    eeDay: { op: "=", value: 0 },
    eeaMillion: null,
    heavyVehDay: { op: "=", value: 0 },
    description:
      "Áreas peatonales, estacionamientos interiores a domicilios, parques y jardines, veredas y paseos peatonales.",
  },
];

export const cbrBands = ["lt2", "2", "3", "4", "5to10", "10to15"];

export const subbaseAndImprovementTable = {
  source: "Tabla 5.5",
  status: validationFlags.verified,
  bands: cbrBands,
  rows: [
    { maxEeDay: 60, values: ["150/210", "150/180", "150/180", "150/0", "150/0", "150/0"] },
    { maxEeDay: 200, values: ["150/370", "150/250", "150/170", "150/160", "150/150", "150/150"] },
    { maxEeDay: 500, values: ["150/470", "150/340", "150/250", "150/220", "150/200", "150/150"] },
    { maxEeDay: 1000, values: ["150/600", "150/450", "150/350", "150/300", "150/250", "150/180"] },
    { maxEeDay: Infinity, values: ["200/600", "200/450", "150/450", "150/350", "150/300", "150/250"] },
  ],
};

export const granularSubbaseTable = {
  source: "Tabla 5.6",
  status: validationFlags.verified,
  bands: cbrBands,
  rows: [
    { maxEeDay: 60, values: [null, 250, 190, 160, 150, 150] },
    { maxEeDay: 200, values: [null, 310, 240, 210, 180, 150] },
    { maxEeDay: 500, values: [null, 350, 270, 230, 200, 150] },
    { maxEeDay: 1000, values: [null, 400, 310, 270, 225, 150] },
    { maxEeDay: Infinity, values: [null, 450, 350, 310, 270, 225] },
  ],
};

export const highTrafficLayerTable = {
  source: "Tabla 5.7",
  status: validationFlags.verified,
  ranges: [
    { min: 0.5, max: 1.5, label: "0,5-1,5 x 10^6" },
    { min: 1.5, max: 4, label: "1,5-4 x 10^6" },
    { min: 4, max: 8, label: "4-8 x 10^6" },
    { min: 8, max: 12, label: "8-12 x 10^6" },
  ],
  layers: {
    granularBase: ["390", "390-480", "540", "690-750"],
    cementTreatedBase: ["130", "130-160", "180", "230-250"],
    asphaltTreatedBase: ["130", "130-160", "150-170", "170-190"],
    sandBed: [30, 30, 30, 30],
    paver: [60, 60, 80, 80],
  },
};

export const mediumLightPedestrianTable = {
  source: "Tabla 5.8",
  status: validationFlags.verified,
  rows: [
    { level: "II", category: "IIA", cbr: { 2: 400, 3: 350, 4: 250, 5: 150, 6: 150 }, base: 150, sandBed: 40, paver: 80 },
    { level: "II", category: "IIB", cbr: { 2: 400, 3: 350, 4: 250, 5: 150, 6: 150 }, base: 150, sandBed: 40, paver: 80 },
    { level: "III", category: "IIA", cbr: { 2: 350, 3: 300, 4: 225, 5: 150, 6: 150 }, base: 100, sandBed: 40, paver: 60 },
    { level: "III", category: "IIA-lite", cbr: { 2: 250, 3: 150, 4: 100, 5: 100, 6: 0 }, base: 100, sandBed: 40, paver: 60 },
    { level: "III", category: "IIIB", cbr: { 2: 300, 3: 250, 4: 180, 5: 100, 6: 100 }, base: 100, sandBed: 40, paver: 60 },
    { level: "IV", category: "IV", cbr: { 2: 200, 3: 150, 4: 130, 5: 100, 6: 100 }, base: 100, sandBed: 40, paver: 60 },
  ],
};

export const portImprovementTable = {
  source: "Tabla 5.13",
  status: validationFlags.verified,
  rows: [
    { cbr: 1, improvement: 900, subbase: 150 },
    { cbr: 2, improvement: 600, subbase: 150 },
    { cbr: 3, improvement: 400, subbase: 150 },
    { cbr: 4, improvement: 250, subbase: 150 },
    { cbr: 5, improvement: 0, subbase: 150 },
  ],
};

export const portProximityFactors = {
  source: "Tabla 5.10",
  status: validationFlags.verified,
  depths: [1000, 2000, 3000],
  rows: [
    { spacing: 300, factors: [1.82, 1.95, 1.98] },
    { spacing: 600, factors: [1.47, 1.82, 1.91] },
    { spacing: 900, factors: [1.19, 1.65, 1.82] },
    { spacing: 1200, factors: [1.02, 1.47, 1.71] },
    { spacing: 1800, factors: [1.0, 1.19, 1.47] },
    { spacing: 2400, factors: [1.0, 1.02, 1.27] },
    { spacing: 3600, factors: [1.0, 1.0, 1.02] },
    { spacing: 4800, factors: [1.0, 1.0, 1.0] },
  ],
};

export const portSewlTable = {
  source: "Tablas 5.11 y 5.12",
  status: validationFlags.verified,
  passesThousands: [250, 1000, 1500, 2500, 4000, 6000, 8000, 10000, 12000, 15000, 17000, 21000, 25000],
  rows: [
    { thickness: 200, sewl: [220, 195, 179, 166, 146, 123, 100, 77, 54, 47, 43, 35, 27] },
    { thickness: 250, sewl: [254, 226, 207, 192, 170, 143, 117, 91, 66, 58, 54, 44, 34] },
    { thickness: 300, sewl: [294, 261, 240, 223, 197, 168, 138, 109, 80, 72, 66, 55, 44] },
    { thickness: 350, sewl: [339, 302, 277, 258, 229, 196, 163, 131, 98, 88, 82, 70, 57] },
    { thickness: 400, sewl: [392, 349, 320, 299, 266, 229, 193, 156, 119, 109, 102, 88, 74] },
    { thickness: 450, sewl: [454, 404, 370, 346, 309, 268, 227, 187, 146, 134, 126, 111, 95] },
    { thickness: 500, sewl: [524, 467, 428, 400, 359, 313, 268, 223, 178, 165, 157, 140, 123] },
    { thickness: 550, sewl: [606, 539, 495, 464, 417, 366, 316, 267, 218, 204, 195, 177, 158] },
    { thickness: 600, sewl: [701, 623, 572, 537, 484, 429, 373, 319, 266, 252, 242, 223, 204] },
    { thickness: 650, sewl: [810, 721, 661, 622, 563, 501, 439, 382, 325, 311, 301, 282, 263] },
    { thickness: 700, sewl: [936, 833, 764, 720, 654, 586, 518, 457, 397, 384, 375, 357, 340] },
  ],
};

export const pendingManualItems = [
  "Tablas 4.1, 4.2 y 4.3 de factores de eje equivalente y categorías urbanas/interurbanas.",
  "Ecuaciones 4.1 a 4.16 en notación exacta, ya que el PDF no extrajo las fórmulas.",
  "Tablas 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.12 y 4.13 completas.",
  "Ecuación 5.1 para espesor de BGTC por carga estática de contenedores.",
  "Ecuaciones 5.2, 5.3 y factores equivalentes de Tabla 5.9 completos.",
  "Tablas 5.14, 5.15/5.17 y ecuaciones 5.4 a 5.14 aeroportuarias completas.",
];
