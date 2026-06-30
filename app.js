const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require("chess.js")

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app); // Create an HTTP server using the Express app
const io = socket(server); // Create a new socket.io instance and attach it to the HTTP server

const chess = new Chess(); // Create a new chess game instance

let players = {}; // Object store connected players
let currentPlayer = "w"; // Track the current player (White or Black)

app.set('view engine', 'ejs'); // Set the view engine to EJS
app.use(express.static('public')); // Serve static files from the 'public' directory
app.get('/', (req, res) => {
    res.render('index'); // Render the 'index' view when the root route is accessed
});

io.on('connection', (uniquesocket) => { // Listen for new socket connections
    console.log('A user connected: ' + uniquesocket.id);
    uniquesocket.emit("boardState", chess.fen()); // Send the current board state to the newly connected client
    if (!players.white) {
        players.white = uniquesocket.id; // Assign the connected socket as the White player
        uniquesocket.emit('playerRole', 'w'); // Notify the player of their color
    }
    else if (!players.black) {
        players.black = uniquesocket.id; // Assign the connected socket as the Black player
        uniquesocket.emit('playerRole', 'b'); // Notify the player of their color
    }
    else {
        uniquesocket.emit('spectator'); // Notify the player that they are a spectator
    }

    uniquesocket.on('disconnect', () => {
        let disconnectedRole = null;
        if (players.white === uniquesocket.id) {
            disconnectedRole = 'w';
            delete players.white; // Remove the disconnected player from the players object
        }
        else if (players.black === uniquesocket.id) {
            disconnectedRole = 'b';
            delete players.black; // Remove the disconnected player from the players object
        }
        if (disconnectedRole) {
            const winner = disconnectedRole === 'White' ? 'Black' : 'White';
            io.emit("gameOverDisconnected", winner);

            setTimeout(() => {
                chess.reset();
                io.emit("boardState", chess.fen());
            }, 10000);
        }
    })
    uniquesocket.on("move", (move) => {
        try {
            if ((chess.turn() === 'w' && uniquesocket.id !== players.white) || (chess.turn() === 'b' && uniquesocket.id !== players.black)) {
                return; // Ignore the move if it's not the player's turn
            }
            const result = chess.move(move); // Attempt to make the move in the chess game
            if (result) {
                currentPlayer = chess.turn(); // Update the current player after a successful move
                io.emit("move", move); // Broadcast the move to all connected clients
                io.emit("boardState", chess.fen()); // Broadcast the updated board state to all connected clients

                if (chess.isGameOver()) {
                    let winner = null;
                    if (chess.isCheckmate()) {
                        winner = currentPlayer === 'w' ? 'Black' : 'White'; // Determine the winner based on the current player
                    }
                    else
                        winner = "Draw"; // If the game is not a checkmate, it's a draw
                    io.emit("gameOver", winner); // Broadcast the game over event with the winner information
                    setTimeout(() => {
                        chess.reset(); // Reset the chess game after a short delay
                        io.emit("boardState", chess.fen());
                    }, 10000) // Reset the game after 10 seconds
                }
            }
            else {
                console.log("Error, Invalid move: ", move);
                uniquesocket.emit("invalidMove", move); // Notify the player of an invalid move
            }
        }
        catch (e) {
            console.log(e);
            uniquesocket.emit("Invalid Move", move);
        }
    })
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})