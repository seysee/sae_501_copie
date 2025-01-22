import { Chess } from 'chess.js';

export default function chessGameLogic({ containerId, socket, onComplete, questionId, sessionId }) {
    const chess = new Chess();
    const container = document.getElementById(containerId);
    if (!container) return;

    const board = document.createElement('div');
    board.id = 'chess-board';
    board.style.width = '400px';
    board.style.height = '400px';
    board.style.border = '2px solid black';
    board.style.display = 'grid';
    board.style.gridTemplateColumns = 'repeat(8, 1fr)';
    board.style.gridTemplateRows = 'repeat(8, 1fr)';
    container.appendChild(board);

    let selectedSquare = null;

    const bestMoves = [
        { from: 'e2', to: 'e4' },
    ];

    const renderBoard = () => {
        const boardHtml = getBoardHtml(chess.board());
        board.innerHTML = '';
        board.innerHTML = boardHtml;

        const squares = board.querySelectorAll('.square');
        squares.forEach(square => {
            square.addEventListener('click', handleSquareClick);
        });
    };

    const getBoardHtml = (board) => {
        let html = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                const squareColor = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863';
                let squareClass = 'square';

                // Vérifier si cette case est l'une des meilleures
                const squareId = `${String.fromCharCode(97 + col)}${8 - row}`;
                if (bestMoves.some(move => move.from === squareId)) {
                    squareClass += ' best-move'; // Ajouter une classe pour les meilleurs coups
                }

                html += ` 
                    <div 
                        class="${squareClass}" 
                        data-row="${row}" 
                        data-col="${col}"
                        data-square-id="${squareId}"
                        style="width: 50px; height: 50px; background-color: ${squareColor}; display: flex; justify-content: center; align-items: center; cursor: pointer;">
                        ${piece ? `<span style="color: ${piece.color === 'w' ? 'white' : 'black'};">${piece.type.toUpperCase()}</span>` : ''}
                    </div>`;
            }
        }
        return html;
    };

    // Fonction pour gérer les clics sur les cases
    const handleSquareClick = (e) => {
        const square = e.target;
        const squareId = square.getAttribute('data-square-id');

        const isBestMove = bestMoves.some(move => move.to === squareId);

        if (isBestMove) {
            if (socket) {
                socket.emit("submitAnswer", { sessionId, questionId, answer: "chess_success" });
            }
            onComplete({ correct: true, message: "Bon coup !" });
        } else {
            onComplete({ correct: false, message: "Mauvais coup, réessaie !" });
        }
    };

    renderBoard();

    const style = document.createElement('style');
    style.innerHTML = `
        .square {
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }

        .best-move {
            background-color: orange !important;
        }
    `;
    document.head.appendChild(style);
}
