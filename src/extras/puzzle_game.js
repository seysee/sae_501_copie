export default async function puzzleGame({ containerId, questionId, sessionId, onComplete, socket }) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu de puzzle.");
        return;
    }

    const imageWidth = 300;
    const imageHeight = 300;
    const gridSize = 3;
    const tolerance = 15;

    const storedImage = sessionStorage.getItem("selectedPuzzleImage");
    const assets = JSON.parse(container.dataset.assets || "[]");
    const selectedImage = storedImage || assets[Math.floor(Math.random() * assets.length)];

    if (!storedImage && selectedImage) {
        console.log("Saving selected image to sessionStorage:", selectedImage);
        sessionStorage.setItem("selectedPuzzleImage", selectedImage);
    } else if (!selectedImage) {
        console.error("No valid image found to save in sessionStorage.");
    }

    let pieces = [];
    let draggingPiece = null;
    let dragOffset = { x: 0, y: 0 };

    function initializePuzzle() {
        const pieceWidth = imageWidth / gridSize;
        const pieceHeight = imageHeight / gridSize;

        pieces = [];

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                pieces.push({
                    id: row * gridSize + col,
                    imageSection: { x: col * pieceWidth, y: row * pieceHeight },
                    position: {
                        x: Math.random() * (imageWidth - pieceWidth),
                        y: imageHeight + Math.random() * 100,
                    }, // Position en dessous du cadre
                    correctPosition: { x: col * pieceWidth, y: row * pieceHeight },
                });
            }
        }

        renderPuzzle();
    }

    function renderPuzzle() {
        container.innerHTML = "";
        const frame = document.createElement("div");
        frame.className = "relative w-[300px] h-[300px] border border-white mx-auto";
        container.appendChild(frame);

        pieces.forEach((piece) => {
            const pieceElement = document.createElement("div");
            pieceElement.className = "absolute border border-black cursor-grab";
            pieceElement.style = `
                width: ${300 / gridSize}px;
                height: ${300 / gridSize}px;
                background-image: url(${selectedImage});
                background-position: -${piece.imageSection.x}px -${piece.imageSection.y}px;
                background-size: 300px 300px;
                left: ${piece.position.x}px;
                top: ${piece.position.y}px;
                touch-action: none;
            `;
            pieceElement.dataset.id = piece.id;
            pieceElement.addEventListener("mousedown", (e) => handleStart(e, piece.id));
            pieceElement.addEventListener("touchstart", (e) => handleStart(e, piece.id));
            pieceElement.addEventListener("mousemove", handleMove);
            pieceElement.addEventListener("touchmove", handleMove);
            pieceElement.addEventListener("mouseup", handleEnd);
            pieceElement.addEventListener("touchend", handleEnd);
            frame.appendChild(pieceElement);
        });
    }

    function handleStart(e, pieceId) {
        e.preventDefault();
        const isTouch = e.type === "touchstart";
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const piece = pieces.find((p) => p.id === pieceId);
        if (piece) {
            draggingPiece = pieceId;
            dragOffset = {
                x: clientX - piece.position.x,
                y: clientY - piece.position.y,
            };
        }
    }

    function handleMove(e) {
        if (draggingPiece === null) return;

        e.preventDefault();
        const isTouch = e.type === "touchmove";
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const piece = pieces.find((p) => p.id === draggingPiece);
        if (piece) {
            piece.position = {
                x: clientX - dragOffset.x,
                y: clientY - dragOffset.y,
            };
            renderPuzzle();
        }
    }

    function handleEnd() {
        draggingPiece = null;

        if (isSolved()) {
            sessionStorage.removeItem("selectedPuzzleImage");
            onComplete({ correct: true, message: "Bravo, puzzle complété !" });

            if (socket) {
                socket.emit("submitAnswer", { sessionId, questionId, answer: "puzzle_success" });
            }
        }
    }

    function isSolved() {
        return pieces.every((piece) => {
            return (
                Math.abs(piece.position.x - piece.correctPosition.x) <= tolerance &&
                Math.abs(piece.position.y - piece.correctPosition.y) <= tolerance
            );
        });
    }

    initializePuzzle();
}
