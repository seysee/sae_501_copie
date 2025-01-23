export default async function memoryOrderGame({
                                                  containerId,
                                                  questionId,
                                                  sessionId,
                                                  onComplete,
                                                  socket
                                              }) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu.");
        return;
    }

    const numbers = Array.from({ length: 9 }, (_, i) => i + 1); // [1, 2, ..., 9]
    const shuffledNumbers = numbers.sort(() => Math.random() - 0.5);
    let currentStep = 0;
    let gameOver = false;

    container.innerHTML = `
        <div style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            width: 300px;
            margin: 0 auto;
        ">
            ${shuffledNumbers
        .map(
            (num) => `
                    <div class="card text-black" data-number="${num}" style="
                        width: 80px;
                        height: 80px;
                        background-color: #f0f0f0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                    ">
                        ${num}
                    </div>`
        )
        .join("")}
        </div>
        <p id="gameMessage" style="text-align: center; margin-top: 20px; font-size: 18px;"></p>
    `;

    const cards = container.querySelectorAll(".card");
    const messageEl = container.querySelector("#gameMessage");

    function showMessage(message, isError = false) {
        messageEl.textContent = message;
        messageEl.style.color = isError ? "red" : "green";
    }

    function revealAllNumbers() {
        cards.forEach((card) => {
            card.textContent = card.getAttribute("data-number");
            card.style.backgroundColor = "#fff";
        });
    }

    function hideAllNumbers() {
        cards.forEach((card) => {
            card.textContent = "";
            card.style.backgroundColor = "#ddd";
        });
    }

    function handleCardClick(card) {
        if (gameOver) return;

        const number = parseInt(card.getAttribute("data-number"));
        card.textContent = number;
        card.style.backgroundColor = "#fff";

        if (number === currentStep + 1) {
            currentStep++;

            if (currentStep === numbers.length) {
                gameOver = true;
                showMessage("Bravo, vous avez gagné !");
                sendResult(true);
            }
        } else {
            gameOver = true;
            showMessage("Mauvaise réponse. Vous avez perdu.", true);
            sendResult(false);
        }
    }

    function sendResult(success) {
        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: success ? "memory_numbers_success" : "memory_order_failure"
            });
        }
        onComplete({ correct: success, message: success ? "Séquence correcte !" : "Séquence incorrecte." });
    }

    cards.forEach((card) => {
        card.addEventListener("click", () => handleCardClick(card));
    });

    revealAllNumbers();

    setTimeout(() => {
        hideAllNumbers();
        showMessage("Retrouvez les nombres dans l'ordre de 1 à 9.");
    }, 5000);
}
