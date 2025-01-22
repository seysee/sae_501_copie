export default async function tiltGlassSimpleGame({
                                                      containerId,
                                                      questionId,
                                                      sessionId,
                                                      onComplete,
                                                      socket
                                                  }) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu du verre.");
        return;
    }

    // Paramètres
    // On met TILT_THRESHOLD à 45 (au lieu de 70) pour tester plus facilement
    const TILT_THRESHOLD = 45;
    const REQUIRED_DURATION = 2000; // 2 secondes

    let gameOver = false;
    let startTiltTime = null;
    let isTilted = false;
    let glassEmpty = false;

    // 1) UI principale
    container.innerHTML = `
    <div style="
      width: 100%; 
      height: 100%; 
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-direction: column;
    ">
      <img id="glassImg" src="/assets/water_glass.png" 
           style="width: 200px; height: auto; margin-bottom: 20px;" />
    </div>
  `;
    const glassImg = container.querySelector("#glassImg");
    const debugEl = container.querySelector("#debugTilt");

    // 2) Gérer l’orientation
    function handleOrientation(event) {
        if (gameOver) return;
        if (glassEmpty) return;

        // On récupère la valeur gamma (orientation gauche/droite)
        // Si gamma n’est pas défini, on met 0
        const gamma = event.gamma ?? 0;

        // On affiche la valeur de gamma sur l'écran (debug)
        debugEl.textContent = `Inclinaison : ${gamma.toFixed(1)}°`;

        // Vérif si |gamma| > TILT_THRESHOLD
        if (Math.abs(gamma) > TILT_THRESHOLD) {
            // On est penché
            if (!isTilted) {
                isTilted = true;
                startTiltTime = performance.now();
            } else {
                // Vérif du temps penché
                const now = performance.now();
                const elapsed = now - startTiltTime;
                if (elapsed >= REQUIRED_DURATION) {
                    pourWater();
                }
            }
        } else {
            // Pas (ou plus) penché
            isTilted = false;
            startTiltTime = null;
        }
    }

    // 3) Action “verre vidé”
    function pourWater() {
        glassEmpty = true;
        glassImg.src = "/assets/empty_glass.png";
        success();
    }

    function success() {
        gameOver = true;
        removeOrientationListener();

        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "tilt_glass_success"
            });
        }
        onComplete({ correct: true, message: "Le verre est vidé avec succès !" });
    }

    function failure() {
        gameOver = true;
        removeOrientationListener();

        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "tilt_glass_failure"
            });
        }
        onComplete({ correct: false, message: "Action impossible (permissions ?)" });
    }

    function removeOrientationListener() {
        window.removeEventListener("deviceorientation", handleOrientation);
    }

    // 4) Permission + events
    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
            try {
                const perm = await DeviceOrientationEvent.requestPermission();
                if (perm === "granted") {
                    window.addEventListener("deviceorientation", handleOrientation);
                } else {
                    failure();
                }
            } catch (err) {
                failure();
            }
        } else {
            window.addEventListener("deviceorientation", handleOrientation);
        }
    } else {
        failure();
    }
}
