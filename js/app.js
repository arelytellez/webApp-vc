const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

const estado = document.getElementById("estado");
const ordenTexto = document.getElementById("orden");

let ultimoMovimiento = Date.now();
let suspendido = false;

// ============================
// CONFIGURAR MEDIAPIPE
// ============================

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    if (!suspendido) {
      await hands.send({ image: videoElement });
    }
  },
  width: 640,
  height: 480
});

camera.start();

// ============================
// RESULTADOS
// ============================

function onResults(results) {

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    verificarSuspension();
    ordenTexto.textContent = "Orden no reconocida";
    canvasCtx.restore();
    return;
  }

  suspendido = false;
  estado.textContent = "Estado: Activo";
  ultimoMovimiento = Date.now();

  const landmarks = results.multiHandLandmarks[0];

  drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS);
  drawLandmarks(canvasCtx, landmarks);

  const gesto = detectarGesto(landmarks);
  ordenTexto.textContent = gesto;

  canvasCtx.restore();
}

// ============================
// DETECCIÓN SEGÚN TU IMAGEN
// ============================

function detectarGesto(landmarks) {

  const indice = landmarks[8].y < landmarks[6].y;
  const medio = landmarks[12].y < landmarks[10].y;
  const anular = landmarks[16].y < landmarks[14].y;
  const menique = landmarks[20].y < landmarks[18].y;
  const pulgarArriba = landmarks[4].y < landmarks[3].y;

  const dedosArriba = [indice, medio, anular, menique].filter(d => d).length;

  // ==========================
  // PRIORIDAD DE GESTOS
  // ==========================

  // ✊ DETENER (puño)
  if (dedosArriba === 0 && !pulgarArriba)
    return "Detener";

  // 👍 RETROCEDER (solo pulgar)
  if (dedosArriba === 0 && pulgarArriba)
    return "Retroceder";

  // ✋ AVANZAR (mano completamente abierta)
  if (dedosArriba === 4 && pulgarArriba)
    return "Avanzar";

  // 360° DERECHA (3 dedos arriba)
  if (indice && medio && anular && !menique)
    return "360° derecha";

  // 90° IZQUIERDA (2 dedos arriba)
  if (indice && medio && !anular && !menique)
    return "90° izquierda";

  // 90° DERECHA (solo índice arriba)
  if (indice && !medio && !anular && !menique) {

    // Si el dedo está inclinado hacia derecha → vuelta derecha
    if (landmarks[8].x > landmarks[6].x + 0.05)
      return "Vuelta derecha";

    // Si está inclinado hacia izquierda → vuelta izquierda
    if (landmarks[8].x < landmarks[6].x - 0.05)
      return "Vuelta izquierda";

    return "90° derecha";
  }

  // 360° IZQUIERDA (movimiento circular con índice)
  if (indice && !medio && !anular && !menique) {
    detectarMovimiento(landmarks[8]);
    if (esCircular())
      return "360° izquierda";
  }

  return "Orden no reconocida";
}

// ============================
// DETECCIÓN CIRCULAR
// ============================

let historial = [];

function detectarMovimiento(punto) {
  historial.push({ x: punto.x, y: punto.y });
  if (historial.length > 20) historial.shift();
}

function esCircular() {
  if (historial.length < 15) return false;

  let variacionX = 0;
  for (let i = 1; i < historial.length; i++) {
    variacionX += Math.abs(historial[i].x - historial[i - 1].x);
  }

  return variacionX > 0.3;
}

// ============================
// SUSPENSIÓN
// ============================

function verificarSuspension() {
  const ahora = Date.now();
  if (ahora - ultimoMovimiento > 5000) {
    suspendido = true;
    estado.textContent = "Estado: Suspendido";
  }
}