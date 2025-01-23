export default async function completeSongGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu.");
        return;
    }

    // Liste de chansons et de leurs extraits
    const songs = [
        {
            prompt: "Au soleil, sous la pluie, à midi ou à minuit...",
            answer: "Au soleil sous la pluie à midi ou à minuit il y a tout ce que vous voulez aux Champs-Élysées"
        },
        {
            prompt: "Il était un petit navire, il était un petit navire...",
            answer: "Il était un petit navire il était un petit navire qui n'avait jamais navigué qui n'avait jamais navigué"
        },
        {
            prompt: "Quand il me prend dans ses bras, qu'il me parle tout bas...",
            answer: "Quand il me prend dans ses bras qu'il me parle tout bas je vois la vie en rose"
        },
    ];

    // Sélection de la chanson via sessionStorage
    const storedSong = sessionStorage.getItem("completeSong");
    const selectedSong = storedSong ? JSON.parse(storedSong) : songs[Math.floor(Math.random() * songs.length)];

    if (!storedSong) {
        sessionStorage.setItem("completeSong", JSON.stringify(selectedSong));
    }

    // Initialisation des éléments DOM
    container.innerHTML = `
        <p class="text-lg text-yellow-500 mb-6">Complétez la chanson :</p>
        <p class="text-lg font-bold text-white mb-6">"${selectedSong.prompt}"</p>
        <button class="px-6 py-3 rounded-full shadow-md bg-blue-500 text-white text-lg font-bold transition duration-300">
            Maintenez pour parler
        </button>
        <p id="gameMessage" class="text-green-500 mt-4"></p>
        <p id="recognizedText" class="text-gray-300 mt-2"></p>
    `;

    const button = container.querySelector("button");
    const messageEl = container.querySelector("#gameMessage");
    const recognizedTextEl = container.querySelector("#recognizedText");

    // Vérification de la prise en charge de la reconnaissance vocale
    if (!("webkitSpeechRecognition" in window)) {
        const errorMessage = "Votre navigateur ne prend pas en charge la reconnaissance vocale.";
        messageEl.textContent = errorMessage;
        messageEl.style.color = "red";
        console.error(errorMessage);
        return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "fr-FR"; // Langue française
    recognition.continuous = false; // Arrête l'écoute après une seule phrase
    recognition.interimResults = false; // Ne retourne pas les résultats intermédiaires

    let isListening = false;

    // Fonction appelée en cas de succès
    function handleSuccess() {
        messageEl.textContent = "Bravo ! Vous avez correctement complété la chanson.";
        messageEl.style.color = "green";
        sessionStorage.removeItem("completeSong");

        if (onComplete) {
            onComplete({ correct: true, message: "Chanson complétée avec succès !" });
        }

        if (socket && sessionId) {
            socket.emit("submitAnswer", { sessionId, questionId, answer: "repeat_success" });
        }
    }

    // Gestion des événements de reconnaissance vocale
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        recognizedTextEl.textContent = `Vous avez dit : "${transcript}"`;

        if (transcript === selectedSong.answer.toLowerCase()) {
            handleSuccess();
        } else {
            messageEl.textContent = "Ce n'est pas la bonne réponse. Essayez encore !";
            messageEl.style.color = "red";
        }
    };

    recognition.onerror = (event) => {
        console.error("Erreur de reconnaissance vocale :", event.error);
        messageEl.textContent = "Une erreur est survenue lors de la reconnaissance vocale.";
        messageEl.style.color = "red";
    };

    // Gestion des interactions utilisateur
    function handleStartListening() {
        if (!isListening) {
            isListening = true;
            button.textContent = "Relâchez pour arrêter";
            button.className = "px-6 py-3 rounded-full shadow-md bg-red-500 text-white text-lg font-bold transition duration-300";
            messageEl.textContent = "Écoute en cours... Complétez la chanson !";
            recognition.start();
        }
    }

    function handleStopListening() {
        if (isListening) {
            isListening = false;
            button.textContent = "Maintenez pour parler";
            button.className = "px-6 py-3 rounded-full shadow-md bg-blue-500 text-white text-lg font-bold transition duration-300";
            messageEl.textContent = "Écoute terminée. Vérification...";
            recognition.stop();
        }
    }

    // Ajout des événements sur le bouton
    button.addEventListener("mousedown", handleStartListening);
    button.addEventListener("mouseup", handleStopListening);
    button.addEventListener("touchstart", handleStartListening);
    button.addEventListener("touchend", handleStopListening);
}
