Tenés toda la razón, mala mía intentando simular el archivo. Al ser un modelo de IA de texto, no puedo generar archivos descargables directamente, pero sí puedo darte la estructura en Markdown perfecta para que la copies y pegues.

Este es el documento maestro completo. Te sugiero guardarlo como `arquitectura_base.md` (o usar partes para tu `.cursorrules`) en la raíz de tu proyecto para que tu entorno de *vibecoding* tenga el contexto absoluto.

***

# Documento de Arquitectura Base: Sistema Integral de Rendimiento Humano

## 1. Visión del Producto y Filosofía de Desarrollo
El objetivo es construir una webapp (con potencial pivot a React Native/Expo para aprovechar hardware avanzado) que unifique el registro nutricional de alta precisión y el seguimiento biomecánico hiper-granular del entrenamiento. 

**Filosofía de Desarrollo:**
* **Vibecoding y Agilidad:** Maximizar el uso de asistentes de IA (Cursor/Windsurf) manteniendo la "fuente de verdad" estrictamente definida en el esquema de base de datos.
* **Fricción Cero en UX:** El ingreso de datos debe ser casi invisible. La IA y el hardware (NLP para entrenamiento, Visión/LiDAR para nutrición) deben hacer el trabajo pesado.
* **Prevención de Feature Bloat:** Enfocarse en datos precisos y lógica relacional estricta, postergando visualizaciones complejas (como 3D) en favor de dashboards analíticos rápidos (SVG, Radares).

---

## 2. Stack Tecnológico Core
* **Frontend / Cliente:** Next.js (PWA) o React Native (Expo) con TypeScript. TailwindCSS para estilos. Recharts para analítica.
* **Backend / BaaS:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
* **Base de Datos Vectorial:** extensión `pgvector` nativa en Supabase para búsqueda semántica.
* **Orquestación y Automatización:** n8n (self-hosted o Cloud).
* **Modelos de IA:**
    * *Visión:* API de Qwen-VL, LLaVA o modelos fundacionales (OpenAI/Claude) para el MVP.
    * *NLP:* Whisper (OpenAI) para transcripción de audio + LLM ligero para formateo JSON.

---

## 3. Módulo 1: Nutrición Automatizada (Enfoque MVP)
El MVP descarta la estimación volumétrica puramente computacional (nubes de puntos 2D) para garantizar precisión absoluta desde el día uno.

**Arquitectura del Flujo de Ingesta:**
1.  **Captura y Clasificación:** El usuario toma una foto del plato. Un modelo de visión identifica los componentes (ej. `["Pechuga de pollo", "Arroz", "Brócoli"]`).
2.  **Resolución de Peso (Híbrido):** * *Vía A (PWA/Web):* Interfaz de fricción cero donde el usuario ingresa manualmente los gramos al lado de cada alimento detectado.
    * *Vía B (Expo/iOS Pro):* Utilización de ARKit/LiDAR para calcular el volumen ($cm^3$) en tiempo real y cruzarlo con una tabla de densidades para autocompletar el peso.
3.  **Búsqueda Semántica:** Supabase Edge Functions toma los alimentos detectados, genera sus *embeddings* y busca en `pgvector` el *match* nutricional más exacto en la base de datos (Open Food Facts + USDA).

---

## 4. Módulo 2: Registro Biomecánico de Entrenamiento
El sistema requiere diferenciar estímulos dentro del mismo grupo muscular (ej. amplitud vs. densidad en la espalda) y gestionar la fatiga residual de un volumen alto (ej. 5 días por semana alternando pesas y asaltos de boxeo).

### Esquema Relacional Core (Supabase DDL)
Este es el motor del módulo. Debe ser la primera pieza a construir.

```sql
-- Habilitar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLA DE MÚSCULOS (Core Anatómico)
CREATE TABLE muscle_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- Ej: Dorsal, Trapecio, Deltoides Lateral
    category TEXT NOT NULL, -- Ej: Espalda, Hombro
    recovery_time_hours INTEGER DEFAULT 48
);

-- TABLA DE EJERCICIOS (Taxonomía Biomecánica)
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    primary_muscle_id UUID REFERENCES muscle_groups(id),
    stimulus_vector TEXT CHECK (stimulus_vector IN ('amplitud', 'densidad', 'fuerza_base', 'cardio_metabolico')),
    is_compound BOOLEAN DEFAULT false, -- Clave para cálculo de fatiga del SNC
    equipment TEXT -- Ej: Barra, Mancuerna, Saco pesado, Guantes 16oz
);

-- REGISTRO DE ENTRENAMIENTOS (Log transaccional)
CREATE TABLE workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    exercise_id UUID REFERENCES exercises(id),
    sets INTEGER,
    reps INTEGER,
    weight_kg DECIMAL,
    duration_minutes INTEGER, -- Útil para asaltos de saco/cardio
    rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Orquestación NLP: Fricción Cero en la Entrada de Datos
El usuario no utilizará formularios manuales para registrar sus rutinas.

**Flujo Operativo (Implementado en n8n):**
1.  **Trigger:** El frontend envía un archivo de audio (o texto) al Webhook de n8n.
2.  **Transcripción:** Nodo de Whisper convierte el audio a texto.
3.  **Extracción de Entidades (LLM):** Un nodo con un modelo de lenguaje procesa el texto usando el siguiente *System Prompt*:
    > "Actúa como un extractor de datos de entrenamiento biomecánico. El usuario enviará un reporte informal de su sesión (ej: 'Hice 4x10 en remo con barra pesado RPE 9 y luego 5 asaltos en el saco'). Tu objetivo es mapear esto a un JSON estructurado que coincida con la tabla 'workout_logs'. Si detectas entrenamiento de boxeo o saco, mapea los asaltos como 'sets' y la duración como 'duration_minutes'. Devuelve estrictamente un array JSON válido."
4.  **Inserción:** n8n formatea la salida y hace un INSERT directo en Supabase mediante la API REST.

---

## 6. Lógica de Negocio y Motor de Fatiga (El Puente)
En lugar de matemáticas complejas de laboratorio, el MVP utilizará un sistema de **"Readiness Score" (Puntuación de Preparación)** basado en tonelaje y recuperación por horas.

* **Fatiga Periférica (Local):** Cada registro de un `muscle_group` activa un temporizador basado en su `recovery_time_hours`. En el frontend, un mapa de calor anatómico (SVG) colorea el músculo en rojo y lo degrada a verde según pasan las horas.
* **Fatiga del SNC (Sistema Nervioso Central):** Cuando se registran ejercicios con `is_compound: true` (ej. sentadillas pesadas o asaltos intensos de boxeo) combinados con un `RPE > 8`, el sistema aplica un debuff global al *Readiness Score*.
* **Integridad Nutricional:** Si el *Readiness Score* está por debajo del umbral óptimo (fatiga alta del SNC), la aplicación sugiere proactivamente un aumento en la ingesta de carbohidratos en el Módulo de Nutrición para forzar la reposición de glucógeno.

---

## 7. Roadmap de Ejecución (Sugerido para Desarrollo Ágil)

* **Hito 1: Backend Fundacional.** Ejecutar esquemas SQL en Supabase (Nutrición y Entrenamiento). Configurar RLS (Row Level Security).
* **Hito 2: El Pipeline NLP.** Levantar el flujo en n8n, conectar Whisper y probar enviar audios de prueba ("4x12 en jalón al pecho") hasta que los logs aparezcan mágicamente en Supabase.
* **Hito 3: UX/UI Core.** Configurar proyecto base (Next.js/Expo). Implementar subida de foto y renderizado de resultados con campos de input numérico.
* **Hito 4: Analítica.** Implementar gráficos de radar con Recharts para visualizar el balance de vectores (Amplitud vs Densidad) y el SVG interactivo para el mapa de calor de fatiga.