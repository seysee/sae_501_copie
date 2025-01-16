export default async function coiffeurGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu Coiffeur.");
        return;
    }

    // Configuration pour la reconnaissance vocale
    let recognition;
    let isRecognitionActive = false; // Suivi de l'état de la reconnaissance vocale
    const audio = new Audio("/songs/gotaga.mp3");

    if (!("webkitSpeechRecognition" in window)) {
        onComplete({ correct: false, message: "Votre navigateur ne supporte pas la reconnaissance vocale." });
        return;
    }

    const initializeRecognition = () => {
        recognition = new window.webkitSpeechRecognition();
        recognition.lang = "fr-FR";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim().toLowerCase();
            if (transcript.endsWith("quoi")) {
                handleSuccess();
            } else {
                handleFailure(); // Appeler une fonction spécifique si la réponse est incorrecte
            }
        };

        recognition.onerror = (event) => {
            console.error("Erreur de reconnaissance vocale :", event.error);
            setMessage("Erreur lors de la reconnaissance vocale. Réessayez.");
        };

        recognition.onend = () => {
            isRecognitionActive = false; // Mise à jour de l'état après l'arrêt
        };
    };

    // Gestion du succès
    const handleSuccess = () => {
        triggerEffects();
        audio.play();

        // Attendre 2 secondes avant d'envoyer la réponse
        setTimeout(() => {
            if (socket) {
                socket.emit("submitAnswer", {
                    sessionId,
                    questionId,
                    answer: "feur_success",
                });
            }
            onComplete({ correct: true, message: "FEUR !" });
        }, 2000); // 2 secondes
    };

    // Gestion de l'échec
    const handleFailure = () => {
        setMessage("Ce n'est pas la bonne réponse. Essayez encore !");
    };

    // Déclencher les effets (vibration, flash, texte, clignotement)
    const triggerEffects = () => {
        // Vibration
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 500]);
        }

        // Flash
        const flashInterval = setInterval(() => {
            const flash = document.createElement("div");
            flash.style.position = "fixed";
            flash.style.top = "0";
            flash.style.left = "0";
            flash.style.width = "100vw";
            flash.style.height = "100vh";
            flash.style.backgroundColor = "white";
            flash.style.zIndex = "9999";
            flash.style.opacity = "0.8";
            document.body.appendChild(flash);

            setTimeout(() => {
                document.body.removeChild(flash);
            }, 50);
        }, 100);

        setTimeout(() => clearInterval(flashInterval), 2000);

        // Texte "FEUR"
        const text = document.createElement("div");
        text.innerText = "FEUR !";
        text.style.position = "fixed";
        text.style.top = "50%";
        text.style.left = "50%";
        text.style.transform = "translate(-50%, -50%)";
        text.style.fontSize = "10rem";
        text.style.fontWeight = "bold";
        text.style.color = "red";
        text.style.zIndex = "9999";
        document.body.appendChild(text);

        setTimeout(() => document.body.removeChild(text), 2000);

        // Clignotement de l'écran
        let bodyBg = document.body.style.backgroundColor;
        const blinkInterval = setInterval(() => {
            document.body.style.backgroundColor =
                document.body.style.backgroundColor === "black" ? "white" : "black";
        }, 100);

        setTimeout(() => {
            clearInterval(blinkInterval);
            document.body.style.backgroundColor = bodyBg;
        }, 2000);
    };

    // Message à afficher
    const setMessage = (text) => {
        const messageElement = document.getElementById("coiffeur-message");
        if (messageElement) {
            messageElement.innerText = text;
        }
    };

    // Initialisation de l'interface
    const initializeUI = () => {
        container.innerHTML = `
            <div class="text-center">
                <button id="hold-button" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Maintenez pour parler
                </button>
                <p id="coiffeur-message" class="text-white mt-4"></p>
            </div>
        `;

        const holdButton = document.getElementById("hold-button");

        holdButton.addEventListener("mousedown", startRecognition);
        holdButton.addEventListener("mouseup", stopRecognition);

        holdButton.addEventListener("touchstart", startRecognition);
        holdButton.addEventListener("touchend", stopRecognition);
    };

    const startRecognition = () => {
        if (!isRecognitionActive) {
            isRecognitionActive = true; // Mettre à jour l'état
            setMessage("Écoute en cours...");
            recognition.start();
        }
    };

    const stopRecognition = () => {
        if (isRecognitionActive) {
            recognition.stop();
            setMessage("Écoute terminée.");
        }
    };

    initializeRecognition();
    initializeUI();
}
