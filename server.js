const express = require('express');
const dotenv = require('dotenv');
const { chats } = require('./data/data');
const connectDB = require('./config/db');
const userRoutes = require('../backend/Routes/userRoutes');
const chatRoutes = require('../backend/Routes/chatRoutes');
const messageRoutes = require('../backend/Routes/messageRoutes');
const path = require('path')

const { notFound, errorHandler } = require('./middleware/errorMiddleware');


connectDB();
const app = express();
dotenv.config()

app.use(express.json());

app.use("/api/user", userRoutes)
app.use("/api/chats", chatRoutes)
app.use("/api/messages", messageRoutes)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 8000;


const server = app.listen(8000, console.log(`server started on PORT ${PORT}`));

const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
        origin: "http://localhost:3000",
        // credentials: true,
    },
});

io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    socket.on("setup", (userData) => {
        socket.join(userData._id);
        socket.emit("connected");
    });

    socket.on('join chat', (room) => {
        socket.join(room);
        console.log('user joined Room: ' + room);
    })

    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));


    socket.on("new message", (newMessageReceived) => {
        var chat = newMessageReceived.chat;

        if (!chat.users) return console.log('chat.users not defined');

        chat.users.forEach(user => {
            if (user._id == newMessageReceived.sender._id) return;

            socket.in(user._id).emit("message recieved", newMessageReceived);
        })
    })

    socket.off("setup", () => {
        console.log('User disconnected');
        socket.leave(userData._id);
    })
})