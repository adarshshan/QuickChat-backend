
const asyncHandler = require('express-async-handler');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Chat = require('../models/chatModel');

const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;

    // Check if required data is provided
    if (!content || !chatId) {
        console.log('Invalid data passed into request');
        return res.sendStatus(400);
    }

    // Create a new message
    const newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId
    };

    try {
        let message = await Message.create(newMessage);
        console.log(message);
        if (!message._id) {
            throw new Error("Message creation failed");
        }
        message = await message
            .populate("sender", "name pic")
        message = await message
            .populate("chat")

        message = await User.populate(message, {
            path: "chat.users",
            select: "name pic email",
        });

        await Chat.findByIdAndUpdate(chatId, {
            $push: { latestMessages: message._id },
        });

        res.status(201).json({ message });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


const allMessages = asyncHandler(async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate('sender', 'name pic email')
            .populate('chat')
        if (messages) res.status(200).json(messages);
    } catch (error) {
        console.log(error);
        res.status(400);
        throw new Error(error.message)
    }
})

module.exports = {
    sendMessage,
    allMessages
}