// Prueba de carga para la HU S4-03 (Criterio 2): "se ejecuta una batería de
// pruebas de carga con k6 simulando 100 usuarios concurrentes sobre los
// endpoints de consulta de precios, entonces el percentil 95 de latencia se
// mantiene por debajo de 1.5 s y la tasa de error HTTP 5xx es 0%."
//
// NO se corrió todavía contra producción -- escrito y revisado el
// 01/11/2026, un día antes de una presentación, para no arriesgar el chat
// en vivo justo antes de la demo (ver docs/sprint-4/S4-LLMOps-Inventario-
// Modelos-y-Evals.md). k6 tampoco está instalado en esta máquina, así que
// no se pudo correr ni siquiera una prueba mínima de sintaxis con el CLI
// real -- escrito contra la documentación oficial de k6
// (https://grafana.com/docs/k6/latest/using-k6/http-requests/,
// https://grafana.com/docs/k6/latest/using-k6/thresholds/), pero sin
// ejecución real todavía. Revisar con `k6 run --vus 1 --duration 5s` antes
// de confiar en que corre sin errores de sintaxis.
//
// Para correrlo de verdad (requiere instalar k6: https://k6.io/docs/get-started/installation/):
//   k6 run load-tests/k6/chat-price-queries.js
//
// El umbral de 1.5s de p95 es ambicioso dado lo medido con el harness de
// evals (audit_eval.js) el mismo día: latencia p95 real de ~3-4.7s en
// condiciones normales de 1 sola consulta a la vez, no 100 concurrentes.
// Es muy probable que la primera corrida real falle ese umbral -- eso en
// sí mismo sería información útil (ver docs/sprint-4/..., sección 4), no
// un error del script.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.N8N_WEBHOOK_URL || 'https://agrosmart-n8n.onrender.com/webhook/v1/query';

// Mismas preguntas reales que ya usa el harness de evals
// (src/ia-ops/tests/dataset_ground_truth.json) -- reutilizar las mismas
// preguntas reales en vez de inventar texto nuevo, para que un hallazgo acá
// sea comparable con lo que ya se sabe de ese dataset.
const PREGUNTAS = [
  '¿A cuánto está el atado de Acelga?',
  'cual es el precio de la papa hoy',
  '¿A cuánto está la Cebolla roja?',
  'precio del limon sutil',
  '¿A cuánto está la docena de Coliflor?',
  'cuanto cuesta el tomate',
  '¿A cuánto está la Papa canchan?',
  'precio de la zanahoria',
];

export const options = {
  scenarios: {
    consultas_de_precio: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },   // calentamiento
        { duration: '30s', target: 100 },  // sube a los 100 usuarios del Criterio 2
        { duration: '1m', target: 100 },   // sostiene 100 usuarios 1 minuto
        { duration: '20s', target: 0 },    // enfriamiento
      ],
    },
  },
  thresholds: {
    // Criterio 2 de la HU S4-03, textual:
    // "el percentil 95 de latencia se mantiene por debajo de 1.5 s"
    http_req_duration: ['p(95)<1500'],
    // "la tasa de error HTTP 5xx es 0%"
    http_req_failed: ['rate==0'],
  },
};

export default function () {
  const pregunta = PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)];
  const sessionId = `k6-load-test-${__VU}-${__ITER}`;

  const res = http.post(
    BASE_URL,
    JSON.stringify({ pregunta, session_id: sessionId }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '30s' }
  );

  check(res, {
    'no es error 5xx': (r) => r.status < 500,
    'responde con cuerpo no vacío': (r) => r.body && r.body.length > 0,
  });

  sleep(1); // simula una pausa realista entre consultas de un mismo usuario
}
