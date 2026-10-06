# PROJECT_CONTEXT.md

## Proyecto
GFIT 3D Body Progress Model — módulo interactivo para Gabriel Fitness.

## Fuente de verdad
GitHub es la fuente de verdad del proyecto. Antes de trabajar, revisar:
1. rama activa;
2. últimos commits;
3. este archivo;
4. archivos modificados recientemente.

## Agente activo durante esta fase
- La implementación de esta V1 la realiza exclusivamente **ChatGPT Work con GPT-6 Astra**.
- **Claude no participa en el desarrollo actual** y no debe modificar esta rama ni continuar milestones salvo autorización explícita posterior de Gabriel.
- Si en el futuro Gabriel decide incorporar Claude u otro agente, primero se actualizará este archivo y se definirá una rama/alcance separado.

## Repositorio
`gabrielfitness/gabriel-fitness-landing`

## Regla de ramas
- No trabajar directamente sobre `main`.
- Desarrollo principal de esta V1: `gfit-3d-body-v1`.
- No iniciar trabajo paralelo con Claude u otro agente durante esta fase.

## Sitio actual
Landing estática en HTML/CSS/JS:
- `index.html`
- `calculadora.html`
- `styles.css`
- `script.js`
- `img/`

## Objetivo de la V1
Crear una experiencia 3D sencilla y rápida para clientes de Gabriel Fitness:
- selección Hombre / Mujer;
- arquetipo visual inicial: Delgado / Atlético / Robusto;
- los términos ectomorfo / mesomorfo / endomorfo solo se usan como referencia visual, no como categorías biológicas rígidas;
- controles visuales de grasa corporal y musculatura;
- personalización por grupos musculares;
- progresión visual: Actual → 3 meses → 6 meses → 12 meses;
- sin pedir medidas corporales obligatorias;
- altura y peso pueden ser opcionales;
- evaluación avanzada con medidas y fotos queda fuera de la V1.

## Grupos musculares prioritarios V1
Hombros, pecho, bíceps, tríceps, espalda, abdomen/cintura, glúteos, cuádriceps, femorales y pantorrillas.

## Principios de producto
- onboarding de muy baja fricción;
- interacción visual antes que formularios;
- el modelo representa una visualización orientativa, no una predicción exacta del físico futuro;
- priorizar rendimiento móvil y carga rápida;
- no romper la web actual mientras se desarrolla el módulo.

## Estrategia técnica inicial
- usar modelos 3D base masculino y femenino con licencia comercial compatible;
- preferir GLB/glTF;
- usar Three.js o React Three Fiber según convenga a la arquitectura;
- usar morph targets/blend shapes para transiciones corporales y musculares;
- BodyParts3D/Human Atlas puede servir más adelante como base anatómica para la vista muscular avanzada, pero no es requisito para validar la primera V1.

## Flujo de trabajo
Work/Astra debe:
- leer este archivo antes de modificar el proyecto;
- documentar aquí decisiones de arquitectura importantes;
- hacer commits pequeños y descriptivos;
- evitar cambios en `main` sin revisión;
- indicar archivos tocados y motivo en el mensaje de commit o PR.

## Estado actual
2026-09-23:
- GitHub conectado a ChatGPT.
- Repositorio verificado.
- Rama `gfit-3d-body-v1` creada desde `main`.
- Próximo paso: iniciar con Work + GPT-6 Astra una prueba funcional del cuerpo 3D deformable antes de integrar cuentas, pagos, fotos o anatomía completa.

## M1 — decisión técnica y preparación (2026-09-23)
- Inspeccionados `index.html`, `styles.css`, `script.js`, `calculadora.html`, estructura y últimos commits. Base de trabajo: `05458d4`.
- Arquitectura: HTML/CSS/JS estático aislado (`modelo-3d.*`), Three.js 0.180.0 local en `vendor/three`, GLB en `models`. Sin React, bundler ni cambios en la landing.
- Elegida malla exterior MakeHuman CC0; fuentes, licencia, modificaciones y decisión en `THIRD_PARTY_ASSETS.md`. No se incorpora código AGPL de la aplicación.
- GLB masculino de prueba: 13,380 vértices / 26,756 triángulos / 482,724 bytes. Conversor reproducible `tools/build-body.py`; mapa de vértices conservado para morph targets futuros.
- Preparación completada; visor y validación de navegador pendientes en el siguiente commit. M2–M6 todavía no implementados.
- Referencia de main al comenzar: `0e8f407989deb19f7157cf3f7b2d8f24b536f257`. No merge ni despliegue autorizados.

## M1 — completado (2026-09-23)
- Implementados `modelo-3d.html`, `modelo-3d.css`, `modelo-3d.js`: GLB visible, rotación 360°, zoom limitado, vistas frente/perfil/espalda, reset, teclado, arrastre táctil y pellizco.
- Diseño blanco/negro consistente con GFIT; página independiente, sin enlace nuevo desde la landing. Modelo masculino identificado como prueba; sin controles falsos de M2–M6.
- Rendimiento: GLB ~483 KB, sin texturas ni sombras dinámicas; Three.js local; DPR máximo 1.5; render bajo demanda. Carga con timeout, error y reintento; WebGL 2 requerido.
- Validado con Playwright/Chromium y WebGL de software: render/píxeles, vuelta 360°, vistas, ratón, zoom/límite, reset, teclado, eventos táctiles y pellizco, responsive 320/390/768/1440, 404/reintento, falta de WebGL y pérdida de contexto. Sin errores JS/HTTP ni solicitudes externas en visor.
- Validador Khronos glTF: 0 errores y 0 advertencias. Landing/calculadora sin cambios de contenido; menú móvil y cálculo probados.
- Prueba reproducible: `tools/verify-3d.cjs`. Instrucciones de ejecución local, capturas, limitaciones y resultados en `docs/MILESTONE_1.md`.
- Pendiente: pruebas físicas en Safari/iOS y Android; no se declara rendimiento móvil medido en hardware real.
- Siguiente milestone M2: deltas de peso/músculo de MakeHuman en la misma topología. El GLB M1 no contiene morph targets aún. M3–M6 pendientes. Base femenina prevista desde la misma malla/targets oficiales CC0.
- Main no modificado; sin merge ni despliegue. Continuar exclusivamente con Work/Astra mediante esta rama y este contexto.

## M2 — motor y assets validados (2026-10-06)
- Base de esta ejecución: `7059c66`; leídos contexto, M1, assets y commits actualizados. Exclusividad Work/Astra respetada.
- `models/body-male-parametric.glb`: 8 morph targets relativos de posición y normales, derivados de los 9 targets conjuntos peso/músculo masculino joven de MakeHuman. Licencias/fuentes en `THIRD_PARTY_ASSETS.md` y manifiesto nuevo.
- `body-male.glb` y su mapa de IDs de M1 se conservan intactos. Buffers base POSITION/NORMAL/índices idénticos byte a byte; sin escala global.
- Interpolación bilineal no negativa en `modelo-3d-morphs.js`; slider 0–100 representa parámetro visual MakeHuman 0.1–0.9; neutral 50 equivale exactamente a M1.
- 121 combinaciones: sin nuevas intersecciones ni triángulos colapsados; 8 contactos internos de boca preexistentes en M1 registrados como limitación. Revisión frontal/lateral/posterior de extremos sin roturas corporales visibles. Khronos: 0 errores/0 advertencias.
- Documentación inicial y reporte en `docs/MILESTONE_2.md`, `docs/milestone-2-geometry.json`. La validación de interfaz/demo se cierra en el siguiente commit.

## M2 + M3 básica — entrega terminada (2026-10-06)
- Reanudada la ejecución tras el límite de uso: se conservó el commit local del motor; no se repitió la generación ni la validación geométrica ya terminada.
- Sliders operativos, presets Delgado/Atlético/Robusto con transición de 420 ms y edición posterior; reset exacto del cuerpo neutral. Cámara independiente, responsive con cuerpo visible mientras se ajusta en móvil. Rango y valores documentados en `docs/MILESTONE_2.md`.
- `tools/verify-3d.cjs` ampliado: morphs, geometría real, extremos/neutral, presets y fotogramas intermedios, cancelación, independencia de sliders, reset, controles, gestos táctiles, reducido movimiento, fallos y regresión. Ejecución final satisfactoria; reporte en `docs/milestone-2-browser.json`.
- Se mantienen los resultados geométricos del commit anterior (121 estados, sin nuevos cruces ni colapsos, Khronos sin errores/advertencias). Limitaciones: contactos internos de boca heredados de M1; dispositivos iOS/Android físicos pendientes.
- Capturas de los tres presets, grasa alta, músculo alto y móvil guardadas en `docs/`.
- `tools/export-demo.cjs` produce una copia HTML autocontenida para abrir con doble clic. Demo probada desde file:// con red desactivada. No modifica hosting ni necesita servidor; instrucciones de servidor local para móvil también en M2.
- No se encontró una URL de preview segura verificable; no se cambió ninguna configuración de producción. Rama exclusiva `gfit-3d-body-v1`; main, landing y calculadora intactos.
- **Esperar revisión de Gabriel. No continuar automáticamente a Milestone 4.**
