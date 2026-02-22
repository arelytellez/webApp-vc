const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

const estado = document.getElementById("estado");
const ordenTexto = document.getElementById("orden");

let ultimoMovimiento = Date.now();
let suspendido = false;

const historialLista = document.getElementById("historialOrdenes");
let ultimaOrdenGuardada = "";

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
  guardarOrden(gesto);

  canvasCtx.restore();
}

// ============================
// DETECCIÓN DE GESTOS
// ============================

function detectarGesto(landmarks) {

  const indice = landmarks[8].y < landmarks[6].y;
  const medio = landmarks[12].y < landmarks[10].y;
  const anular = landmarks[16].y < landmarks[14].y;
  const menique = landmarks[20].y < landmarks[18].y;
  const pulgarArriba = landmarks[4].y < landmarks[3].y;

  const dedosArriba = [indice, medio, anular, menique].filter(d => d).length;

  // ✊ DETENER
  if (dedosArriba === 0 && !pulgarArriba)
    return "Detener";

  // 👍 RETROCEDER
  if (dedosArriba === 0 && pulgarArriba)
    return "Retroceder";

  // ✋ AVANZAR
  if (dedosArriba === 4 && pulgarArriba)
    return "Avanzar";

  // 🤟 360° DERECHA (3 dedos)
  if (indice && medio && anular && !menique)
    return "360° derecha";

  // ✌️ 90° IZQUIERDA (2 dedos)
  if (indice && medio && !anular && !menique)
    return "90° izquierda";

  // ===================================================
  // SOLO ÍNDICE → GIROS Y 90° DERECHA
  // ===================================================

  if (indice && !medio && !anular && !menique) {

    const deltaX = landmarks[8].x - landmarks[6].x;
    const deltaY = landmarks[6].y - landmarks[8].y;

    // 👉👈 Horizontal = GIROS
    if (Math.abs(deltaX) > Math.abs(deltaY)) {

      if (deltaX > 0.06)
        return "Giro derecha";   // 👉

      if (deltaX < -0.06)
        return "Giro izquierda"; // 👈
    }

    // ☝️ Vertical = 90° derecha
    if (deltaY > 0.08)
      return "90° derecha";

    // 🔄 Movimiento circular = 360° izquierda
    detectarMovimiento(landmarks[8]);
    if (esCircular())
      return "360° izquierda";
  }

  return "Orden no reconocida";
}

// ============================
// DETECCIÓN CIRCULAR
// ============================

let historialMovimiento = [];

function detectarMovimiento(punto) {
  historialMovimiento.push({ x: punto.x, y: punto.y });
  if (historialMovimiento.length > 20)
    historialMovimiento.shift();
}

function esCircular() {
  if (historialMovimiento.length < 15) return false;

  let variacionX = 0;

  for (let i = 1; i < historialMovimiento.length; i++) {
    variacionX += Math.abs(
      historialMovimiento[i].x - historialMovimiento[i - 1].x
    );
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

// ============================
// HISTORIAL
// ============================

function guardarOrden(orden) {

  if (orden === ultimaOrdenGuardada || orden === "Orden no reconocida")
    return;

  ultimaOrdenGuardada = orden;

  const item = document.createElement("li");
  item.className = "list-group-item";

  const hora = new Date().toLocaleTimeString();
  item.textContent = `${hora} → ${orden}`;

  historialLista.prepend(item);

  if (historialLista.children.length > 10) {
    historialLista.removeChild(historialLista.lastChild);
  }
}

function limpiarHistorial() {
  historialLista.innerHTML = "";
  ultimaOrdenGuardada = "";
}