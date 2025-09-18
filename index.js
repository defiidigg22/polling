// 1. Import necessary packages
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors'); // <-- Import the new package

// 2. Initialize everything
const app = express();
app.use(cors()); // <-- Use the cors middleware

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});
const prisma = new PrismaClient();


// 3. Add a middleware to parse JSON request bodies
// This is crucial for POST and PUT requests
app.use(express.json());

// A simple test route to make sure the server is running
app.get('/', (req, res) => {
  res.send('Polling API is running!');
});


// Endpoint to create a new user
app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // A simple validation to ensure we have the required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    
    // NOTE: In a real app, you would hash the password here before saving!
    // For this challenge, we'll store it as plain text.
    const passwordHash = password; 

    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        passwordHash: passwordHash,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    // Handle potential errors, like a duplicate email
    res.status(500).json({ error: 'Could not create user.' });
  }
});

// Endpoint to create a new poll
app.post('/polls', async (req, res) => {
  try {
    const { question, options, creatorId } = req.body;

    // Validation
    if (!question || !options || !creatorId) {
      return res.status(400).json({ error: 'Question, options, and creatorId are required.' });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'A poll must have at least two options.' });
    }

    const newPoll = await prisma.poll.create({
      data: {
        question: question,
        creatorId: creatorId,
        options: {
          create: options.map(optionText => ({ text: optionText })),
        },
      },
      include: {
        options: true, // Include the created options in the response
      },
    });

    res.status(201).json(newPoll);
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'Could not create poll.' });
  }
});

// Endpoint to retrieve a single poll by its ID
app.get('/polls/:id', async (req, res) => {
  try {
    const { id } = req.params; // Get the poll ID from the URL parameter

    const poll = await prisma.poll.findUnique({
      where: {
        id: id,
      },
      include: {
        options: true, // Also include all the poll's options
        creator: {     // Also include the user who created the poll
          select: {
            id: true,
            name: true, // Only select the user's id and name
          }
        }
      },
    });

    // If no poll is found with that ID
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    res.status(200).json(poll);
  } catch (error) {
    res.status(500).json({ error: 'Could not retrieve poll.' });
  }
});



// Endpoint to submit a vote
app.post('/polls/vote', async (req, res) => {
  try {
    const { userId, pollOptionId } = req.body;

    if (!userId || !pollOptionId) {
      return res.status(400).json({ error: 'userId and pollOptionId are required.' });
    }

    // Create the vote first
    const newVote = await prisma.vote.create({
      data: {
        userId: userId,
        pollOptionId: pollOptionId,
      },
    });

    // --- START REAL-TIME LOGIC ---

    // 1. Find which poll this vote belongs to
    const votedOption = await prisma.pollOption.findUnique({
      where: { id: pollOptionId },
      select: { pollId: true },
    });
    const pollId = votedOption.pollId;

    // 2. Get the poll with all its options and the vote counts for each
    const pollWithVoteCounts = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true }, // Count the votes for each option
            },
          },
        },
      },
    });

    // 3. Format the results
    const voteCounts = pollWithVoteCounts.options.map(option => ({
      optionId: option.id,
      text: option.text,
      votes: option._count.votes,
    }));

    // 4. Broadcast the new vote counts to the specific poll's room
    const roomId = `poll:${pollId}`;
    io.to(roomId).emit('pollUpdate', voteCounts);
    console.log(`Broadcasted update to room ${roomId}`);

    // --- END REAL-TIME LOGIC ---

    res.status(201).json(newVote);
  } catch (error) {
    console.error('ERROR in /polls/vote:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User has already voted for this option.' });
    }
    res.status(500).json({ error: 'Could not process vote.' });
  }
});

// --- NEW SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
  console.log('A user connected with socket id:', socket.id);

  // Allow a user to join a room for a specific poll
  socket.on('joinPoll', (pollId) => {
    const roomId = `poll:${pollId}`;
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 5. Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { // IMPORTANT: Use server.listen, not app.listen
  console.log(`Server is running on port ${PORT}`);
});