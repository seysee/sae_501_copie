import { getSudoku } from "sudoku-gen";

export default async function sudokuGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le Sudoku.");
        return;
    }

    // Générer une grille de Sudoku facile
    const sudoku = getSudoku("easy");
    let puzzle = sudoku.puzzle.split(""); // Convertir la chaîne en tableau pour manipulation
    const solution = sudoku.solution.split(""); // Convertir la solution en tableau
    const cellsToKeep = 35; // Nombre de cases visibles

    // Fonction pour remplir partiellement le puzzle
    const partiallyFillPuzzle = (puzzle, solution, cellsToKeep) => {
        const totalCells = puzzle.length;
        const filledIndices = new Set();

        while (filledIndices.size < cellsToKeep) {
            const randomIndex = Math.floor(Math.random() * totalCells);
            if (puzzle[randomIndex] === "-" && !filledIndices.has(randomIndex)) {
                puzzle[randomIndex] = solution[randomIndex];
                filledIndices.add(randomIndex);
            }
        }

        return puzzle;
    };

    puzzle = partiallyFillPuzzle(puzzle, solution, cellsToKeep);

    const convertTo2DArray = (array) => {
        const size = 9;
        const grid = [];
        for (let i = 0; i < size; i++) {
            grid.push(array.slice(i * size, i * size + size).map((char) => (char === "-" ? 0 : parseInt(char, 10))));
        }
        return grid;
    };

    const puzzleArray = convertTo2DArray(puzzle);
    const solutionArray = convertTo2DArray(solution);

    // Ajouter des styles pour la grille et la modale
    const style = document.createElement("style");
    style.innerHTML = `
        .sudoku-container {
            display: grid;
            grid-template-columns: repeat(9, 1fr);
            gap: 0;
            max-width: 360px;
            margin: 0 auto;
        }

        .sudoku-cell {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: transparent;
            color: white;
            font-size: 1.2rem;
            font-weight: bold;
            border: 1px solid white;
        }

        .sudoku-cell.empty {
            cursor: pointer;
            background-color: rgba(255, 255, 255, 0.1);
        }

        .sudoku-cell.empty:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

        .sudoku-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9999;
        }

        .sudoku-modal-content {
            background-color: #333;
            padding: 20px;
            border-radius: 10px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }

        .sudoku-modal-content button {
            background-color: white;
            color: black;
            font-size: 1.5rem;
            font-weight: bold;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .sudoku-modal-content button:hover {
            background-color: lightgray;
        }
    `;
    document.head.appendChild(style);

    // Rendu de la grille
    const renderGrid = () => {
        container.innerHTML = `
            <div class="sudoku-container">
                ${puzzleArray
            .map((row, rowIndex) =>
                row
                    .map((cell, colIndex) => {
                        const isBoldBorderTop = rowIndex % 3 === 0 && rowIndex !== 0;
                        const isBoldBorderLeft = colIndex % 3 === 0 && colIndex !== 0;

                        return `
                                    <div 
                                        class="sudoku-cell ${cell === 0 ? "empty" : ""}" 
                                        data-row="${rowIndex}" 
                                        data-col="${colIndex}" 
                                        style="
                                            ${isBoldBorderTop ? "border-top: 4px solid white;" : ""}
                                            ${isBoldBorderLeft ? "border-left: 4px solid white;" : ""}
                                        ">
                                        ${cell || ""}
                                    </div>
                                `;
                    })
                    .join("")
            )
            .join("")}
            </div>
        `;
    };

    // Ouvrir la modale pour choisir un chiffre
    const openModal = (row, col) => {
        const modal = document.createElement("div");
        modal.className = "sudoku-modal";

        modal.innerHTML = `
            <div class="sudoku-modal-content">
                ${Array.from({ length: 9 }, (_, i) => i + 1)
            .map((num) => `<button data-value="${num}">${num}</button>`)
            .join("")}
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                const selectedNumber = parseInt(button.dataset.value, 10);

                if (selectedNumber === solutionArray[row][col]) {
                    puzzleArray[row][col] = selectedNumber;
                    renderGrid();
                    attachEventListeners();

                    if (isSolved()) {
                        handleWin();
                    }
                } else {
                    alert("Mauvaise réponse, réessayez !");
                }

                document.body.removeChild(modal); // Fermer la modale
            });
        });

        // Fermer la modale si on clique en dehors
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    };

    // Vérifier si le Sudoku est complété
    const isSolved = () => {
        return puzzleArray.every((row, rowIndex) =>
            row.every((cell, colIndex) => cell === solutionArray[rowIndex][colIndex])
        );
    };

    // Gérer la victoire
    const handleWin = () => {
        if (socket) {
            socket.emit("submitAnswer", {
                sessionId,
                questionId,
                answer: "sudoku_success",
            });
        }
        onComplete({ correct: true, message: "Sudoku complété avec succès !" });
    };

    // Attacher les écouteurs d'événements
    const attachEventListeners = () => {
        document.querySelectorAll(".sudoku-cell.empty").forEach((cell) => {
            cell.addEventListener("click", () => {
                const row = parseInt(cell.dataset.row, 10);
                const col = parseInt(cell.dataset.col, 10);
                openModal(row, col);
            });
        });
    };

    renderGrid();
    attachEventListeners();
}
