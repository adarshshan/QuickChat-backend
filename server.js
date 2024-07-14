const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./Routes/userRoutes');
const chatRoutes = require('./Routes/chatRoutes');
const messageRoutes = require('./Routes/messageRoutes');
const cron = require('node-cron');
const cors = require('cors')

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { default: axios } = require('axios');

const SERVER = 'https://quickchat-backend-lcr5.onrender.com';


connectDB();
const app = express();
dotenv.config()

const corsOptions = {
    origin: process.env.CORS_URL,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    optionsSuccessStatus: 200
};

app.use(express.json());
app.use(cors(corsOptions));

app.get('/', (req, res) => res.send('hello world...'));

app.use("/api/user", userRoutes)
app.use("/api/chats", chatRoutes)
app.use("/api/messages", messageRoutes)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 8000;

// Cron job to send request every 2 minutes
cron.schedule("*/1 * * * *", () => {
    axios
        .get(SERVER)
        .then((response) => {
            console.log(`Request sent successfully at ${new Date()}`);
        })
        .catch((error) => {
            console.error(`Error sending request: ${error.message}`);
        });
});


const server = app.listen(PORT, console.log(`server started on PORT ${PORT}`));

const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.CORS_URL,
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