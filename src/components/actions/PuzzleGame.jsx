import React, { useState, useEffect } from "react";

export default function PuzzleGame({ questionId, image, gridSize = 3, onSuccess , socket, sessionId }) {
    const [pieces, setPieces] = useState([]);
    const [draggingPiece, setDraggingPiece] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        initializePuzzle();
    }, [image]);

    const initializePuzzle = () => {
        const imageWidth = 300; // Largeur de l'image
        const imageHeight = 300; // Hauteur de l'image
        const pieceWidth = imageWidth / gridSize;
        const pieceHeight = imageHeight / gridSize;

        const newPieces = [];

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                newPieces.push({
                    id: row * gridSize + col,
                    imageSection: { x: col * pieceWidth, y: row * pieceHeight },
                    position: {
                        x: Math.random() * (imageWidth - pieceWidth), // Position horizontale aléatoire
                        y: imageHeight + Math.random() * 100, // Position en dessous du cadre
                    },
                    correctPosition: { x: col * pieceWidth, y: row * pieceHeight },
                });
            }
        }

        setPieces(newPieces);
    };

    const handleStart = (e, pieceId) => {
        e.preventDefault();

        const isTouch = e.type === "touchstart";
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const piece = pieces.find((p) => p.id === pieceId);
        if (piece) {
            setDraggingPiece(pieceId);
            setDragOffset({
                x: clientX - piece.position.x,
                y: clientY - piece.position.y,
            });
        }
    };

    const handleMove = (e) => {
        if (draggingPiece === null) return;

        e.preventDefault();

        const isTouch = e.type === "touchmove";
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const newPieces = [...pieces];
        const pieceIndex = newPieces.findIndex((p) => p.id === draggingPiece);

        if (pieceIndex !== -1) {
            newPieces[pieceIndex].position = {
                x: clientX - dragOffset.x,
                y: clientY - dragOffset.y,
            };
            setPieces(newPieces);
        }
    };

    const handleEnd = () => {
        setDraggingPiece(null);

        // Vérifie si le puzzle est résolu
        if (isSolved(pieces) && socket && sessionId) {
            sessionStorage.removeItem("selectedPuzzleImage");
            onSuccess("Bravo, puzzle complété !");
            socket.emit("submitAnswer", { sessionId, questionId, answer: "puzzle_success" });
        }
    };

    const isSolved = (pieces) => {
        const tolerance = 15; // Tolérance pour vérifier les positions
        return pieces.every((piece) => {
            const neighbors = getNeighbors(piece, pieces);

            return neighbors.every((neighbor) => {
                const expectedPosition = getExpectedNeighborPosition(piece, neighbor);
                return (
                    Math.abs(neighbor.position.x - expectedPosition.x) <= tolerance &&
                    Math.abs(neighbor.position.y - expectedPosition.y) <= tolerance
                );
            });
        });
    };

    const getNeighbors = (piece, pieces) => {
        const neighbors = [];
        const pieceWidth = 300 / gridSize;
        const pieceHeight = 300 / gridSize;

        // Vérifie les voisins haut, droite, bas, gauche
        pieces.forEach((p) => {
            if (
                (p.correctPosition.x === piece.correctPosition.x &&
                    Math.abs(p.correctPosition.y - piece.correctPosition.y) === pieceHeight) ||
                (p.correctPosition.y === piece.correctPosition.y &&
                    Math.abs(p.correctPosition.x - piece.correctPosition.x) === pieceWidth)
            ) {
                neighbors.push(p);
            }
        });

        return neighbors;
    };

    const getExpectedNeighborPosition = (piece, neighbor) => {
        const pieceWidth = 300 / gridSize;
        const pieceHeight = 300 / gridSize;

        if (neighbor.correctPosition.x > piece.correctPosition.x) {
            return { x: piece.position.x + pieceWidth, y: piece.position.y };
        } else if (neighbor.correctPosition.x < piece.correctPosition.x) {
            return { x: piece.position.x - pieceWidth, y: piece.position.y };
        } else if (neighbor.correctPosition.y > piece.correctPosition.y) {
            return { x: piece.position.x, y: piece.position.y + pieceHeight };
        } else if (neighbor.correctPosition.y < piece.correctPosition.y) {
            return { x: piece.position.x, y: piece.position.y - pieceHeight };
        }
        return { x: neighbor.position.x, y: neighbor.position.y };
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-[300px] h-[300px] border border-white ">
                {pieces.map((piece) => (
                    <div
                        key={piece.id}
                        onMouseDown={(e) => handleStart(e, piece.id)}
                        onTouchStart={(e) => handleStart(e, piece.id)}
                        onMouseMove={handleMove}
                        onTouchMove={handleMove}
                        onMouseUp={handleEnd}
                        onTouchEnd={handleEnd}
                        className="absolute border border-black cursor-grab"
                        style={{
                            width: `${300 / gridSize}px`,
                            height: `${300 / gridSize}px`,
                            backgroundImage: `url(${image})`,
                            backgroundPosition: `-${piece.imageSection.x}px -${piece.imageSection.y}px`,
                            backgroundSize: "300px 300px",
                            left: `${piece.position.x}px`,
                            top: `${piece.position.y}px`,
                            touchAction: "none", // Désactive le comportement par défaut (scroll)
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
}
