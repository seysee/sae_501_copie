export default async function blowGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu de souffle.");
        return;
    }

    const balloonContainer = document.createElement("div");
    balloonContainer.className = "relative flex items-end justify-center";

    const balloon = document.createElement("div");
    balloon.className = "bg-red-500 rounded-full transition-all duration-300 ease-linear relative";
    balloon.style.width = "50px";
    balloon.style.height = "50px";

    const balloonTip = document.createElement("div");
    balloonTip.className = "bg-red-500 absolute rounded-full";
    balloonTip.style.width = "12px";
    balloonTip.style.height = "8px";
    balloonTip.style.bottom = "-4px";
    balloonTip.style.left = "50%";
    balloonTip.style.transform = "translateX(-50%)";

    balloon.appendChild(balloonTip);
    balloonContainer.appendChild(balloon);

    const errorElement = document.createElement("p");
    errorElement.className = "mt-4 text-red-500";

    const skipButton = document.createElement("button");
    skipButton.textContent = "Skip";
    skipButton.className = "mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded-lg";

    container.appendChild(balloonContainer);
    container.appendChild(errorElement);
    container.appendChild(skipButton);

    // Variables pour le ballon et le microphone
    let balloonSize = 50;
    let isCompleted = false;
    let audioContext = null;
    let analyser = null;
    let dataArray = null;

    // Fonction pour analyser le volume audio
    const analyzeVolume = () => {
        if (!analyser || !dataArray) return;

        analyser.getByteFrequencyData(dataArray);

        let maxVolume = 0;
        for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] > maxVolume) {
                maxVolume = dataArray[i];
            }
        }

        if (!isCompleted) {
            const volumeRatio = maxVolume / 255;
            const inflationSpeed = 0.5 * Math.pow(volumeRatio, 3);

            balloonSize += inflationSpeed;
            if (balloonSize > 300) {
                balloonSize = 300;
                isCompleted = true;
                handleSuccess();
            }

            balloon.style.width = `${balloonSize}px`;
            balloon.style.height = `${balloonSize}px`;
        }

        if (!isCompleted) {
            requestAnimationFrame(analyzeVolume);
        }
    };

    // Gestion de la réussite
    const handleSuccess = () => {
        if (onComplete) {
            onComplete({ correct: true, message: "Ballon gonflé avec succès !" });
        }

        // Envoi de la réponse via socket
        if (socket && sessionId) {
            socket.emit("submitAnswer", { sessionId, questionId, answer: "blow_success" });
        }
    };

    // Accès au microphone
    const getMicrophoneAccess = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            dataArray = new Uint8Array(analyser.frequencyBinCount);

            // Démarrage de l'analyse
            analyzeVolume();
        } catch (err) {
            errorElement.textContent = "Impossible d’accéder au microphone. Vérifiez les permissions dans votre navigateur.";
        }
    };

    // Événement pour le bouton "Skip"
    skipButton.addEventListener("click", () => {
        isCompleted = true;
        balloonSize = 300;
        balloon.style.width = `${balloonSize}px`;
        balloon.style.height = `${balloonSize}px`;
        handleSuccess();
    });

    // Initialisation
    getMicrophoneAccess();

    // Nettoyage
    return () => {
        if (audioContext) {
            audioContext.close();
        }
    };
}
