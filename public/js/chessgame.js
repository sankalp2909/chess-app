const socket = io(window.location.origin); // Initialize a new socket.io client instance 
//socket.emit means that the client is sending a message to the server. In this case, it is emitting a custom event called "churan" to the server. The server listens for this event and can respond accordingly.
//And socket.on means that the client is listening for a specific event from the server. In this case, it is listening for the "churan papdi" event. When the server emits this event, the client will execute the provided callback function and log the received message to the console.

const chess = new Chess(); // Create a new instance of the Chess game

const boardElement = document.getElementById('board');
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = ''; // Clear the board element before rendering
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement('div');
            squareElement.classList.add('square');
            squareElement.classList.add((rowIndex + squareIndex) % 2 === 0 ? 'light' : 'dark');
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if(square) {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece', square.color=== 'w' ? 'white' : 'black');
                pieceElement.textContent = getPieceUnicode(square); // Get the Unicode character for the piece
                pieceElement.draggable = playerRole === square.color; // Make the piece draggable only if it belongs to the player

                pieceElement.addEventListener('dragstart', (e) => {
                    if(pieceElement.draggable) {
                        draggedPiece = pieceElement; // Store the dragged piece
                        sourceSquare = { row: rowIndex, col: squareIndex }; // Store the source square coordinates
                        e.dataTransfer.setData('text/plain', ''); // Required for Firefox to allow dragging
                    }
                });

                pieceElement.addEventListener('dragend', () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement); // Append the piece element to the square
            }
            squareElement.addEventListener('dragover', (e) => {
                e.preventDefault(); // Allow dropping by preventing the default behavior
            });

            squareElement.addEventListener('drop', (e) => {
                e.preventDefault();
                if(draggedPiece) {
                    const targetSquare = { 
                        row: parseInt(squareElement.dataset.row), 
                        col: parseInt(squareElement.dataset.col)
                    }; // Store the target square coordinates
                    handleMove(sourceSquare, targetSquare); // Handle the move from source to target
                }
            });
            boardElement.appendChild(squareElement); // Append the square element to the board
    })
})
    if(playerRole === 'b')
    {
        boardElement.classList.add('flipped'); // Add the 'flipped' class to the board element for Black
    }
    else
    {
        boardElement.classList.remove('flipped'); // Remove the 'flipped' class from the board element for White or Spectators
    }
}

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`, // Convert column index to letter and row index to number
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q' // Always promote to a queen for simplicity
    }
    socket.emit('move', move); // Emit the move event to the server with the move details
}

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        K: "♔",  // King
        Q: "♕",  // Queen
        R: "♖",  // Rook
        B: "♗",  // Bishop
        N: "♘",  // Knight
        P: "♙",  // Pawn
        k: "♚",  // King
        q: "♛",  // Queen
        r: "♜",  // Rook
        b: "♝",  // Bishop
        n: "♞",  // Knight
        p: "♟"   // Pawn
    }
    return unicodePieces[piece.type] || ""; // Return the corresponding Unicode character for the piece type, or an empty string if not found!
}

socket.on('playerRole', (role) => {
    playerRole = role; // Store the player's role (White, Black)
    renderBoard();
})

socket.on('spectator', () => {
    playerRole = null;
    renderBoard();
})

socket.on('boardState', (fen) => {
    chess.load(fen); // Load the board state from the FEN string
    renderBoard(); // Re-render the board with the updated state
})

socket.on('move', (move) => {
    chess.move(move); // Make the move in the chess game
    renderBoard(); // Re-render the board with the updated state
})

socket.on("gameOver", (winner) => {
    let message = "";

    if (winner === "Draw") {
        message = "Game Draw!";
    } else {
        message = winner + " Wins!";
    }

    showGameOver(message);
});

socket.on("gameOverDisconnected", (winner) => {
    let message = "";

    if (winner === "Draw") {
        message = "Game Draw!";
    } else {
        message = `${winner==='White'?'Black':'White'} disconnected, ` + winner + " Wins!";
    }

    showGameOver(message);
});

const showGameOver = (message) => {
    let overlay = document.createElement("div");

    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.8)";
    overlay.style.color = "white";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.fontSize = "2rem";
    overlay.style.zIndex = "1000";

    let timeLeft = 10;

    overlay.innerHTML = `
        <div>${message}</div>
        <div id="countdown" style="font-size: 1rem; margin-top: 10px;">
            New game starting in ${timeLeft} seconds...
        </div>
    `;

    document.body.appendChild(overlay);

    const countdownElement = document.getElementById("countdown");

    const interval = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = `New game starting in ${timeLeft} seconds...`;

        if (timeLeft <= 0) {
            clearInterval(interval);
        }
    }, 1000);

    // Remove overlay after 10 sec
    setTimeout(() => {
        overlay.remove();
    }, 10000);
};