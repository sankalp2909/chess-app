const express = require('express');
const socket = require('socket.io');
const http = require('http');
const {Chess} = require("chess.js")

const app = express();

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
    if(!players.white)
    {
        players.white = uniquesocket.id; // Assign the connected socket as the White player
        uniquesocket.emit('playerRole', 'w'); // Notify the player of their color
    }
    else if(!players.black)
    {
        players.black = uniquesocket.id; // Assign the connected socket as the Black player
        uniquesocket.emit('playerRole', 'b'); // Notify the player of their color
    }
    else
    {
        uniquesocket.emit('spectator'); // Notify the player that they are a spectator
    }

    uniquesocket.on('disconnect', ()=>{
        if(uniquesocket.id === players.white)
        {
            delete(players.white); // Remove the White player from the players object
        }
        else if(uniquesocket.id === players.black)
        {
            delete(players.black); // Remove the Black player from the players object
        }
    })
    uniquesocket.on("move", (move)=>{
        try{
            if((chess.turn() === 'w' && uniquesocket.id !== players.white) || (chess.turn() === 'b' && uniquesocket.id !== players.black))
            {
                return; // Ignore the move if it's not the player's turn
            }
            const result = chess.move(move); // Attempt to make the move in the chess game
            if(result)
            {
                currentPlayer = chess.turn(); // Update the current player after a successful move
                io.emit("move", move); // Broadcast the move to all connected clients
                io.emit("boardState", chess.fen()); // Broadcast the updated board state to all connected clients
            }
            else
            {
                console.log("Error, Invalid move: ", move);
                uniquesocket.emit("invalidMove", move); // Notify the player of an invalid move

            }
        }
        catch(e)
        {
            console.log(e);
            uniquesocket.emit("Invalid Move", move);
        }
    })
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
})