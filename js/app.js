// ======================================
// REFERENCIAS HTML
// ======================================

const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

const estado = document.getElementById("estado");
const ordenTexto = document.getElementById("orden");

let ultimoMovimiento = Date.now();
let suspendido = false;

const historialLista = document.getElementById("historialOrdenes");
let ultimaOrdenGuardada = "";

let camaraActiva = false;
let camera; 


const btnCamara = document.getElementById("btnCamara");


function iniciarApp() {
    document.getElementById("inicio").style.display = "none";
    document.getElementById("app").style.display = "block";
}
// ======================================
// CONFIGURAR MEDIAPIPE
// ======================================

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

camera = new Camera(videoElement, {
  onFrame: async () => {
    if (!suspendido) {
      await hands.send({ image: videoElement });
    }
  },
  width: 640,
  height: 480
});

camera.start();

// ======================================
// RESULTADOS DE MEDIAPIPE
// ======================================

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

// ======================================
// DETECCIÓN DE GESTOS (VERSIÓN FINAL)
// ======================================

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

  // ✊ DETENER
  if (dedosArriba === 0 && !pulgarArriba)
    return "Detener";

  // 👍 RETROCEDER
  if (dedosArriba === 0 && pulgarArriba)
    return "Retroceder";

  // ✋ AVANZAR (5 dedos)
  if (dedosArriba === 4 && pulgarArriba)
    return "Avanzar";

  // 🤟 360° DERECHA (índice + medio + meñique)
 
  // 360° DERECHA (3 dedos arriba)
  if (indice && medio && anular && !menique)
    return "360° derecha";


  // 🖐 360° IZQUIERDA (4 dedos sin pulgar)
  if (dedosArriba === 4 && !pulgarArriba)
    return "360° izquierda";

  // ✌️ 90° IZQUIERDA
  if (indice && medio && !anular && !menique)
    return "90° izquierda";

  // ☝️ SOLO ÍNDICE ARRIBA
  if (indice && !medio && !anular && !menique) {

    // 👉 VUELTA DERECHA (inclinado derecha)
    if (landmarks[8].x > landmarks[6].x + 0.05)
      return "Vuelta derecha";

    // 👈 VUELTA IZQUIERDA (inclinado izquierda)
    if (landmarks[8].x < landmarks[6].x - 0.05)
      return "Vuelta izquierda";

    // ☝️ Recto = 90° derecha
    return "90° derecha";
  }

  return "Orden no reconocida";
}

// ======================================
// SISTEMA DE SUSPENSIÓN (5 SEGUNDOS)
// ======================================

function verificarSuspension() {
  const ahora = Date.now();
  if (ahora - ultimoMovimiento > 5000) {
    suspendido = true;
    estado.textContent = "Estado: Suspendido";
  }
}

// ======================================
// HISTORIAL DE ÓRDENES
// ======================================

function guardarOrden(orden) {

  if (orden === ultimaOrdenGuardada || orden === "Orden no reconocida")
    return;

  ultimaOrdenGuardada = orden;

  const item = document.createElement("li");
  item.className = "list-group-item";

  const hora = new Date().toLocaleTimeString();
  item.textContent = `${hora} → ${orden}`;

  historialLista.prepend(item);

  // Máximo 10 órdenes visibles
  if (historialLista.children.length > 10) {
    historialLista.removeChild(historialLista.lastChild);
  }
}

// ======================================
// LIMPIAR HISTORIAL
// ======================================

function limpiarHistorial() {
  historialLista.innerHTML = "";
  ultimaOrdenGuardada = "";
}

  
  function iniciarApp() {
    document.getElementById("inicio").style.display = "none";
    document.getElementById("app").style.display = "block";
}



btnCamara.addEventListener("click", async () => {

    if (!camaraActiva) {
        await iniciarCamara();
        btnCamara.textContent = "⛔ Detener Cámara";
        btnCamara.classList.remove("btn-iniciar");
        btnCamara.classList.add("btn-detener");
        camaraActiva = true;
    } else {
        detenerCamara();
        btnCamara.textContent = "🎥 Iniciar Cámara";
        btnCamara.classList.remove("btn-detener");
        btnCamara.classList.add("btn-iniciar");
        camaraActiva = false;
    }

});

async function iniciarCamara() {

    camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });

    camera.start();
}

function detenerCamara() {
    if (camera) {
        camera.stop();
    }
}