export default async function shakeBottleGame({
                                                  containerId,
                                                  questionId,
                                                  sessionId,
                                                  onComplete,
                                                  socket
                                              }) {
    // 1) Récupération du conteneur
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu de la bouteille.");
        return;
    }

    /**
     * Paramètres
     */
    const MIN_ACCEL = 1.2;           // Seuil d’accélération pour considérer qu’on « secoue »
    // Les temps (en secondes) où le stade change
    // stage=1 => 2s, stage=2 => 4s, stage=3 => 6s
    const TIME_REQUIRED = [2, 4, 6];
    // Si on atteint TIME_REQUIRED[0], on passe au stade1 => bottle_1
    // etc.

    let gameOver = false;
    let bottleStage = 0; // 0..3
    let shakingTime = 0; // nombre de secondes cumulées qu’on est au-dessus de MIN_ACCEL

    // 2) UI
    container.innerHTML = `
    <div style="
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      <img 
        id="bottleImg" 
        src="/assets/bottle.png"
        style="width: 200px; height: auto; margin-bottom: 20px;"
      />
    </div>
  `;
    const bottleImg = container.querySelector("#bottleImg");
    // 3) Images selon le stade
    const bottlePaths = [
        "/assets/bottle.png",   // stage 0 : neuve
        "/assets/bottle_1.png", // stage 1 : fissurée
        "/assets/bottle_2.png", // stage 2 : très fissurée
        "/assets/bottle_3.png"  // stage 3 : cassée
    ];

    // 4) devicemotion
    let lastTimestamp = null; // pour calculer dt

    async function startMotion() {
        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function") {
            // iOS >= 13
            try {
                const perm = await DeviceMotionEvent.requestPermission();
                if (perm === "granted") {
                    window.addEventListener("devicemotion", handleMotion);
                } else {
                    failure();
                }
            } catch {
                failure();
            }
        } else if (window.DeviceMotionEvent) {
            // Android ou iOS plus ancien
            window.addEventListener("devicemotion", handleMotion);
        } else {
            failure();
        }
    }

    function handleMotion(event) {
        if (gameOver) return;
        if (!event.acceleration) return;  // certain navigateurs => accelerationIncludingGravity ?

        const now = event.timeStamp; // ms depuis page load
        if (!lastTimestamp) {
            lastTimestamp = now;
            return;
        }

        // dt en secondes
        const dt = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        // Calculer la magnitude
        const ax = event.acceleration.x || 0;
        const ay = event.acceleration.y || 0;
        const az = event.acceleration.z || 0;
        const magnitude = Math.sqrt(ax*ax + ay*ay + az*az);

        // Si la magnitude > MIN_ACCEL, on ajoute dt à shakingTime
        if (magnitude > MIN_ACCEL) {
            shakingTime += dt;
        }
        // Check si on doit monter de stade
        checkStage();
    }

    function checkStage() {
        // Si bottleStage < 3, on regarde si shakingTime >= TIME_REQUIRED[bottleStage]
        if (bottleStage < 3) {
            const required = TIME_REQUIRED[bottleStage];
            if (shakingTime >= required) {
                // On passe au stade suivant
                bottleStage++;
                updateBottleImage();

                if (bottleStage === 3) {
                    // cassé
                    success();
                }
            }
        }
    }

    function updateBottleImage() {
        bottleImg.src = bottlePaths[bottleStage];
    }

    function success() {
        gameOver = true;
        removeMotionListener();

        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "shake_bottle_success"
            });
        }
        onComplete({ correct: true, message: "La bouteille est brisée, bravo !" });
    }

    function failure() {
        gameOver = true;
        removeMotionListener();

        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "shake_bottle_failure"
            });
        }
        onComplete({ correct: false, message: "Impossible d'accéder à l’accéléromètre." });
    }

    function removeMotionListener() {
        window.removeEventListener("devicemotion", handleMotion);
    }

    // Lancer la détection
    startMotion();
}
