# Aplicativo de Diseno de Pavimentos de Adoquines de Hormigon

Aplicacion web interactiva para el pre-dimensionamiento estructural de pavimentos de adoquines de hormigon, basada en el **Manual de Diseno de Pavimentos de Adoquines de Hormigon** y en referencias normativas complementarias incluidas en el aplicativo.

El sistema permite evaluar pavimentos vehiculares, peatonales, portuarios e aeroportuarios, generar alternativas estructurales, verificar demanda/capacidad y exportar una memoria tecnica en PDF.

## Alcance

- Pavimentos vehiculares urbanos.
- Pavimentos peatonales.
- Explanadas industriales y portuarias.
- Pavimentos aeroportuarios o aerodromos, como pre-verificacion con revision mecanicista requerida.
- Calculo de solicitaciones de diseno.
- Clasificacion del nivel de transito u operacion.
- Verificacion de CBR y advertencias tecnicas.
- Seleccion de espesores por capa.
- Comparacion de alternativas estructurales.
- Ranking multicriterio con costo real por m2.
- Analisis de sensibilidad.
- Reporte tecnico PDF.

## Como Usar

Abrir el aplicativo desde el servidor local:

```text
http://127.0.0.1:8087/index.html
```

Si el servidor no esta activo, puede levantarse desde la carpeta del proyecto con Python:

```powershell
python -m http.server 8087
```

Luego abrir:

```text
http://127.0.0.1:8087/index.html
```

## Flujo de Trabajo

1. Seleccionar el tipo de pavimento en el menu lateral.
2. Ingresar los datos basicos solicitados.
3. Revisar los textos de ayuda bajo cada parametro.
4. Presionar **Calcular diseno** o modificar inputs para recalculo automatico.
5. Revisar:
   - Estructura recomendada.
   - Verificacion demanda/capacidad.
   - Alternativas por capa.
   - Ranking multicriterio.
   - Sensibilidad de diseno.
   - Graficos tecnicos.
   - Normativa y limitaciones.
6. Presionar **Generar reporte PDF** para exportar la memoria tecnica.

## Estructura del Proyecto

```text
index.html
styles.css
app.js
data/
  manualTables.js
utils/
  calculations.js
  reportGenerator.js
outputs/
  aplicativo-diseno-adoquines.zip
```

## Archivos Principales

- `index.html`: estructura de la interfaz, paneles, tablas, graficos y secciones tecnicas.
- `styles.css`: estilos del dashboard, modo claro/oscuro, tablas, graficos y diseno responsive.
- `app.js`: logica de interfaz, captura de inputs, renderizado de resultados, graficos y tablas.
- `data/manualTables.js`: tablas, rangos, referencias normativas y elementos pendientes de validacion manual.
- `utils/calculations.js`: motor de calculo, alternativas, verificaciones, sensibilidad y ranking.
- `utils/reportGenerator.js`: generador del informe tecnico en PDF.

## Modulos de Calculo

### Vehicular

Calcula ejes equivalentes acumulados, clasifica el nivel de transito y selecciona espesores de adoquin, cama de arena, base, subbase y mejoramiento si aplica.

### Peatonal

Permite uso peatonal puro o presencia eventual de vehiculos de mantenimiento/emergencia. Usa catalogos de bajo nivel de solicitacion.

### Portuario

Calcula solicitacion equivalente tipo SEWL, dano relativo, pasadas de diseno y alternativas con base granular equivalente o base tratada con cemento.

### Aeroportuario

Entrega una pre-verificacion estructural basada en carga por rueda, MTOW y salidas equivalentes preliminares. Requiere revision mecanicista final con tablas y ecuaciones aeroportuarias completas.

## Resultados Generados

- Resumen de datos de entrada.
- Solicitacion de diseno.
- Clasificacion tecnica.
- Verificacion demanda/capacidad.
- Tabla final de espesores.
- Alternativas verificadas por capa.
- Alternativa recomendada.
- Costo de materiales por m2.
- Costo total estimado del proyecto.
- Ranking multicriterio.
- Analisis de sensibilidad.
- Graficos tecnicos.
- Seccion transversal del pavimento.
- Advertencias y limitaciones.
- Marco normativo.
- Reporte PDF profesional.

## Ranking Multicriterio

El ranking complementa la seleccion economica con cuatro criterios:

- Costo real por m2: 42%.
- Margen estructural: 28%.
- Constructibilidad: 20%.
- Riesgo tecnico: 10%.

Este ranking es una ayuda comparativa. No reemplaza un presupuesto detallado ni la revision tecnica del proyectista.

## Costos Unitarios

El manual base se enfoca en diseno estructural y no entrega factores economicos. Por esa razon, el aplicativo usa una seccion independiente de costos unitarios configurables:

- Area del proyecto en m2.
- Adoquin en $/m2.
- Espesor asociado al precio del adoquin.
- Arena en $/m3.
- Base granular en $/m3.
- Base estabilizada en $/m3.
- Asfalto en $/ton.
- Densidad del asfalto en ton/m3.
- Subbase en $/m3.
- Mejoramiento de subrasante en $/m3.

Con estos datos, cada alternativa reporta costo estimado por m2 y costo total de materiales. Los valores por defecto son referenciales y deben reemplazarse por precios locales reales.

## Analisis de Sensibilidad

El aplicativo reejecuta el mismo motor de calculo para:

- Caso base.
- Demanda +10%.
- Demanda +20%.
- CBR -20%.
- CBR +20%.

Esto permite identificar si la alternativa recomendada es robusta frente a variaciones razonables de entrada.

## Reporte PDF

El PDF incluye:

- Portada tecnica.
- Resumen ejecutivo.
- Datos de entrada.
- Metodologia.
- Verificacion estructural.
- Alternativas evaluadas.
- Ranking multicriterio.
- Sensibilidad.
- Marco normativo.
- Memoria de calculo.
- Figuras numeradas.
- Discusion tecnica.
- Conclusiones.
- Limitaciones y advertencias.

## Normativa y Referencias

El aplicativo incluye una seccion de referencias normativas y criterios asociados, entre ellos:

- Manual de Diseno de Pavimentos de Adoquines de Hormigon.
- BS 7533.
- Manual de Carreteras de Chile.
- Codigo MINVU de obras de pavimentacion.
- Enfoques portuarios tipo Knapton / britanicos.
- Referencias FAA / DGAC para criterios aeroportuarios.
- ASTM, EN 1338 y AS/NZS para unidades y materiales.

## Limitaciones Importantes

- El aplicativo es una herramienta de pre-dimensionamiento y apoyo tecnico.
- No reemplaza el criterio del ingeniero responsable.
- Algunas tablas, ecuaciones o rangos del manual estan marcados como pendientes de validacion manual cuando no pudieron extraerse con certeza total.
- El modulo aeroportuario se entrega como pre-verificacion y requiere revision mecanicista final.
- Los costos unitarios son configurables y deben reemplazarse por precios locales reales antes de usar el resultado como presupuesto.
- La seleccion final debe considerar drenaje, confinamiento lateral, calidad de materiales, control constructivo y condiciones reales de servicio.

## Desarrollo y Mantenimiento

Para ajustar tablas o criterios del manual:

1. Editar `data/manualTables.js`.
2. Revisar las formulas en `utils/calculations.js`.
3. Validar que los resultados se muestren correctamente en `app.js`.
4. Verificar que el PDF se mantenga legible en `utils/reportGenerator.js`.

Validacion rapida de sintaxis con Node:

```powershell
node --check app.js
node --check utils\calculations.js
node --check utils\reportGenerator.js
```

## Advertencia Profesional

El resultado generado debe ser revisado, validado y firmado por un ingeniero responsable antes de usarse en diseno contractual, licitacion, construccion o publicacion tecnica.
