import axios from "axios";

export default async function memoryImages({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour l'énigme.");
        return;
    }

    // Empêche de relancer l'énigme si déjà lancée
    if (container.dataset.gameStarted === "true") {
        console.warn("L'énigme est déjà en cours.");
        return;
    }
    container.dataset.gameStarted = "true";

    // Image à afficher
    const imageSrc = "/puzzle/4_images_enigma.png";

    // Affiche l'image
    const imgElement = document.createElement("img");
    imgElement.src = imageSrc;
    imgElement.style = `
        max-width: 100%;
        max-height: 100%;
        display: block;
        margin: 0 auto;
    `;
    container.appendChild(imgElement);

    // Création du timer
    const timerElement = document.createElement("p");
    timerElement.style = "color: white; text-align: center; margin-top: 10px;";
    container.appendChild(timerElement);

    let timeLeft = 5;
    timerElement.textContent = `Il reste ${timeLeft} seconde(s)...`;

    const countdown = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `Il reste ${timeLeft} seconde(s)...`;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            startQuestionPhase();
        }
    }, 1000);

    function startQuestionPhase() {
        // Retire l'image et le timer
        container.removeChild(imgElement);
        container.removeChild(timerElement);

        // Question
        const questionElement = document.createElement("p");
        questionElement.style = "color: white; margin-bottom: 10px; text-align: center;";
        questionElement.textContent = "De quelle couleur était le banc ?";
        container.appendChild(questionElement);

        // Champ texte
        const inputElement = document.createElement("input");
        inputElement.type = "text";
        inputElement.placeholder = "Ta réponse";
        inputElement.style = `
            display: block;
            margin: 0 auto 10px;
            padding: 5px;
        `;
        container.appendChild(inputElement);

        // Bouton de validation
        const buttonElement = document.createElement("button");
        buttonElement.textContent = "Valider";
        buttonElement.style = `
            display: block;
            margin: 0 auto;
            padding: 5px 10px;
            cursor: pointer;
        `;
        container.appendChild(buttonElement);

        // Gestion du clic sur "Valider"
        buttonElement.addEventListener("click", async () => {
            const userAnswer = inputElement.value.trim();
            if (!userAnswer) return;

            try {
                // Envoi de la réponse en DB (vérification)
                const response = await axios.post("/api/question/answer", {
                    id: questionId,
                    answer: userAnswer,
                });

                // Emission Socket pour redirection => /result
                if (socket) {
                    socket.emit("submitAnswer", {
                        sessionId,
                        questionId,
                        answer: userAnswer,
                    });
                }

                // Retour au composant parent
                if (response.data.correct) {
                    onComplete({ correct: true, message: "Votre mémoire est impressionnante !" });
                } else {
                    onComplete({ correct: false, message: "Ce n'est pas la bonne réponse." });
                }
            } catch (error) {
                console.error("Erreur lors de l'envoi de la réponse :", error);
                onComplete({ correct: false, message: "Erreur réseau ou serveur." });
            }
        });
    }
}
