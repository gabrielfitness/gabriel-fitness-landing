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
