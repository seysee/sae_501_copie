export default async function tapGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu de clics.");
        return;
    }

    // Initialisation des variables
    let tapCount = 0;
    const goal = 100;

    // Mise à jour de l'interface utilisateur
    const updateUI = () => {
        const counterElement = document.getElementById("tap-counter");
        if (counterElement) {
            counterElement.innerText = `Clics : ${tapCount} / ${goal}`;
        }
    };

    // Gestion de la réussite
    const handleSuccess = () => {
        // Animation de succès
        container.innerHTML = `
            <div class="text-center">
                <h1 class="text-green-500 text-4xl font-bold">Bravo !</h1>
                <p class="text-white mt-4">Vous avez atteint ${goal} clics !</p>
            </div>
        `;

        // Envoi de la réussite via socket
        setTimeout(() => {
            if (socket) {
                socket.emit("submitAnswer", {
                    sessionId,
                    questionId,
                    answer: "tap_success",
                });
            }

            onComplete({ correct: true, message: "Vous avez appuyé 100 fois avec succès !" });
        }, 2000); // Temps pour afficher l'animation avant de valider
    };

    // Fonction pour gérer les clics
    const handleTap = () => {
        tapCount += 1;
        updateUI();

        if (tapCount >= goal) {
            handleSuccess();
        }
    };

    // Initialisation de l'interface utilisateur
    const initializeUI = () => {
        container.innerHTML = `
            <div
                id="tap-area"
                class="absolute inset-0 w-full h-full bg-black flex items-center justify-center"
            >
                <p id="tap-counter" class="text-white text-3xl font-bold">Clics : 0 / ${goal}</p>
            </div>
        `;

        // Ajout d'un écouteur global pour les clics
        document.body.addEventListener("click", handleTap);
    };

    // Nettoyage après la réussite ou l'arrêt
    const cleanup = () => {
        document.body.removeEventListener("click", handleTap);
    };

    // Nettoyage au succès
    onComplete && onComplete(() => cleanup());

    initializeUI();
}
