# PROJECT_CONTEXT.md

## Proyecto
GFIT 3D Body Progress Model — módulo interactivo para Gabriel Fitness.

## Fuente de verdad
GitHub es la fuente de verdad compartida entre ChatGPT/Astra y Claude. Antes de trabajar, revisar:
1. rama activa;
2. últimos commits;
3. este archivo;
4. archivos modificados recientemente.

## Repositorio
`gabrielfitness/gabriel-fitness-landing`

## Regla de ramas
- No trabajar directamente sobre `main`.
- Desarrollo principal de esta V1: `gfit-3d-body-v1`.
- Si Claude crea trabajo paralelo, debe hacerlo en una rama separada y documentar aquí cualquier decisión relevante antes de mergear.

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

## Flujo de colaboración
Cada IA debe:
- leer este archivo antes de modificar el proyecto;
- documentar aquí decisiones de arquitectura que afecten al otro agente;
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
- Main no modificado; sin merge ni despliegue. Continuar colaborando mediante esta rama y este contexto.
