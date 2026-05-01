# Lectura Amaiur

Frontend en React para leer cuentos y responder preguntas de comprensión.

## Qué incluye

- 3 cuentos de ejemplo en JSON
- 10 preguntas por cuento
- Tipos de pregunta:
  - opción múltiple
  - verdadero o falso
  - unir frases
  - respuesta corta

## Estructura de datos

Los cuentos están en [src/data/stories.json](/home/djoroya/proyectos/personal/lectura-amaiur/src/data/stories.json).

Cada cuento sigue esta idea:

```json
{
  "id": "cuento-1",
  "title": "Título",
  "category": "Tipo de cuento",
  "summary": "Resumen corto",
  "content": ["Párrafo 1", "Párrafo 2"],
  "questions": [
    {
      "id": "p1",
      "type": "multiple_choice",
      "prompt": "Pregunta",
      "options": ["A", "B", "C"],
      "correctAnswer": "B",
      "explanation": "Texto de ayuda"
    }
  ]
}
```

## Tipos de pregunta

### `multiple_choice`

```json
{
  "id": "p1",
  "type": "multiple_choice",
  "prompt": "¿Qué pasó primero?",
  "options": ["Opción 1", "Opción 2", "Opción 3"],
  "correctAnswer": "Opción 2",
  "explanation": "La respuesta correcta es Opción 2."
}
```

### `true_false`

```json
{
  "id": "p2",
  "type": "true_false",
  "prompt": "El perro era azul.",
  "correctAnswer": "Falso",
  "explanation": "El perro no era azul."
}
```

### `short_text`

```json
{
  "id": "p3",
  "type": "short_text",
  "prompt": "¿Cómo se llamaba la niña?",
  "acceptedAnswers": ["lucía", "Lucia"],
  "explanation": "Se llamaba Lucía."
}
```

### `matching`

```json
{
  "id": "p4",
  "type": "matching",
  "prompt": "Une cada palabra con su pareja.",
  "pairs": [
    { "left": "Sol", "right": "Calor" },
    { "left": "Nube", "right": "Lluvia" }
  ],
  "rightOptions": ["Calor", "Lluvia"],
  "explanation": "Sol - Calor, Nube - Lluvia."
}
```

## Arranque

En esta máquina aún no detecté `node` dentro de WSL, así que no he podido instalar dependencias ni arrancar la app.

Cuando tengas Node instalado en WSL:

```bash
npm install
npm run dev
```
