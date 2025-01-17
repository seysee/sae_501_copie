export default async function repeatPhraseGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu de répétition de phrase.");
        return;
    }

    // Vérification de la prise en charge de la reconnaissance vocale
    if (!("webkitSpeechRecognition" in window)) {
        const errorMessage = "Votre navigateur ne prend pas en charge la reconnaissance vocale.";
        container.innerHTML = `<p class="text-red-500 text-center">${errorMessage}</p>`;
        console.error(errorMessage);
        return;
    }

    // Tableau de phrases drôles
    const phrases = [
        "Noé le caca",
        "Je suis un hamster ninja",
        "Le brocoli est le roi des légumes",
        "Pikachu fait du yoga",
        "Les licornes aiment le café",
        "Ma chaussette gauche est une superstar",
        "Pourquoi le poulet a-t-il traversé la route",
        "J'aime chanter sous la pluie avec mon parapluie",
        "Les escargots font des courses",
        "La lune danse la salsa avec le soleil"
    ];

    // Sélection de la phrase via sessionStorage
    const storedPhrase = sessionStorage.getItem("repeatPhrase");
    const selectedPhrase = storedPhrase || phrases[Math.floor(Math.random() * phrases.length)];

    if (!storedPhrase) {
        sessionStorage.setItem("repeatPhrase", selectedPhrase);
    }

    // Initialisation des éléments DOM
    const phraseElement = document.createElement("p");
    phraseElement.className = "text-lg text-yellow-500 mb-6";
    phraseElement.textContent = `Répétez cette phrase : "${selectedPhrase}"`;

    const button = document.createElement("button");
    button.className = "px-6 py-3 rounded-full shadow-md bg-blue-500 text-white text-lg font-bold transition duration-300";
    button.textContent = "Maintenez pour parler";

    const messageElement = document.createElement("p");
    messageElement.className = "text-green-500 mt-4";

    const recognizedTextElement = document.createElement("p");
    recognizedTextElement.className = "text-gray-300 mt-2";

    container.appendChild(phraseElement);
    container.appendChild(button);
    container.appendChild(messageElement);
    container.appendChild(recognizedTextElement);

    // Initialisation de la reconnaissance vocale
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "fr-FR"; // Langue française
    recognition.continuous = false; // Arrête l'écoute après une seule phrase
    recognition.interimResults = false; // Ne retourne pas les résultats intermédiaires

    let isListening = false;

    // Fonction appelée en cas de succès
    function handleSuccess() {
        messageElement.textContent = "Félicitations ! Vous avez correctement répété la phrase.";
        sessionStorage.removeItem("repeatPhrase"); // Nettoyage du storage après succès

        if (onComplete) {
            onComplete({ correct: true, message: "Phrase répétée avec succès !" });
        }

        // Envoi de la réponse via socket
        if (socket && sessionId) {
            socket.emit("submitAnswer", { sessionId, questionId, answer: "repeat_success" });
        }
    }

    // Gestion des événements de reconnaissance vocale
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        recognizedTextElement.textContent = `Vous avez dit : "${transcript}"`;

        if (transcript === selectedPhrase.trim().toLowerCase()) {
            handleSuccess();
        } else {
            messageElement.textContent = "Ce n'est pas la bonne phrase. Essayez encore !";
        }
    };

    recognition.onerror = (event) => {
        console.error("Erreur de reconnaissance vocale :", event.error);
        messageElement.textContent = "Une erreur est survenue lors de la reconnaissance vocale.";
    };

    // Gestion des interactions utilisateur
    function handleStartListening() {
        if (!isListening) {
            isListening = true;
            button.textContent = "Relâchez pour arrêter";
            button.className = "px-6 py-3 rounded-full shadow-md bg-red-500 text-white text-lg font-bold transition duration-300";
            messageElement.textContent = "Écoute en cours... Répétez la phrase !";
            recognition.start();
        }
    }

    function handleStopListening() {
        if (isListening) {
            isListening = false;
            button.textContent = "Maintenez pour parler";
            button.className = "px-6 py-3 rounded-full shadow-md bg-blue-500 text-white text-lg font-bold transition duration-300";
            messageElement.textContent = "Écoute terminée. Vérification...";
            recognition.stop();
        }
    }

    // Ajout des événements sur le bouton
    button.addEventListener("mousedown", handleStartListening);
    button.addEventListener("mouseup", handleStopListening);
    button.addEventListener("touchstart", handleStartListening);
    button.addEventListener("touchend", handleStopListening);
}
