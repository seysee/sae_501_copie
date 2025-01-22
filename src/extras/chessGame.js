import React, {useEffect, useState} from "react";
import {Chessboard} from "react-chessboard";
import {Chess} from "chess.js";

export default function ChessGame({containerId, questionId, sessionId, onComplete, socket}) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error("Impossible de trouver le conteneur pour le jeu d'échecs.");
        return;
    }

    const [currentPosition, setCurrentPosition] = useState(null);
    const game = new Chess();

    const puzzlePosition = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1";
    const bestMove = "e4";
    game.load(puzzlePosition);

    useEffect(() => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Le conteneur ${containerId} n'a pas été trouvé.`);
            return;
        }
        console.log("Position du jeu chargée :", game.fen());
        setCurrentPosition(game.fen());
    }, [containerId]);

    function handleMove(from, to) {
        const move = game.move({from, to});

        if (!move) {
            alert("Coup invalide !");
            return;
        }

        setCurrentPosition(game.fen());

        if (move.san === bestMove) {
            onComplete({correct: true, message: "Bravo, meilleur coup trouvé !"});

            if (socket) {
                socket.emit("submitAnswer", {sessionId, questionId, answer: bestMove});
            }
        } else {
            alert("Ce n'est pas le meilleur coup, essayez encore !");
        }
    }

    return (
        <div id={containerId} style={{ width: "400px", margin: "auto" }}>
            {currentPosition ? (
                <Chessboard position={currentPosition} onPieceDrop={handleMove} />
            ) : (
                <p>Chargement du jeu...</p>
            )}
        </div>
    );

}
