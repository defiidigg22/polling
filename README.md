Real-Time Polling Application Backend
This project is the backend service for a real-time polling application, developed as a submission for the Move37 Ventures Backend Developer Challenge. It features a RESTful API for managing polls and users, and utilizes WebSockets to provide instant updates on poll results.

Features
User Management: Create and retrieve users.

Poll Management: Create polls with multiple options and retrieve detailed poll information.

Voting System: Submit votes for specific poll options.

Real-Time Updates: Implemented using Socket.io to broadcast live vote counts to all clients viewing a specific poll.

Robust Database Schema: Utilizes Prisma with a PostgreSQL database to manage one-to-many and many-to-many relationships effectively.

Technologies Used
Backend: Node.js, Express.js

Database: PostgreSQL

ORM: Prisma

Real-time Communication: Socket.io

Setup and Installation
Follow these steps to get the application running locally.

Prerequisites
Node.js (v16 or later recommended)

PostgreSQL installed and running.

An API client like Postman to test the endpoints.

1. Clone the Repository
git clone https://github.com/defiidigg22/polling.git
cd your-repo-name

2. Install Dependencies
Install all the necessary npm packages.

npm install

3. Set Up Environment Variables
Create a .env file in the root of the project. This file will hold your database connection string.

touch .env

Open the .env file and add your PostgreSQL connection URL in the following format. Replace the placeholders with your actual database credentials and a name for your database (e.g., polling_app).

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"

# Example:
# DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/polling_app"

4. Run the Database Migration
This command will read your Prisma schema and create all the necessary tables in your database.

npx prisma migrate dev

5. Start the Server
Start the development server. The application will run on http://localhost:3000.

npm start

API Endpoints
User Endpoints
POST /users
Creates a new user.

Request Body:

{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "supersecretpassword"
}

Successful Response (201 Created):

{
  "id": "c1f2b3a4-d5e6-f7g8-h9i0-j1k2l3m4n5o6",
  "name": "Alice",
  "email": "alice@example.com",
  "passwordHash": "supersecretpassword"
}

Poll Endpoints
POST /polls
Creates a new poll. Requires the id of an existing user as creatorId.

Request Body:

{
  "question": "What is the best programming language?",
  "options": ["JavaScript", "Python", "Rust", "Go"],
  "creatorId": "c1f2b3a4-d5e6-f7g8-h9i0-j1k2l3m4n5o6"
}

GET /polls/:id
Retrieves a single poll, including its options and creator information.

Example URL: http://localhost:3000/polls/a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6

Voting Endpoints
POST /polls/vote
Submits a vote for a poll option.

Request Body:

{
  "userId": "c1f2b3a4-d5e6-f7g8-h9i0-j1k2l3m4n5o6",
  "pollOptionId": "z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4"
}

WebSocket Events
The server uses Socket.io for real-time communication.

Client-to-Server Events
joinPoll: A client must emit this event to subscribe to updates for a specific poll.

Payload: (string) pollId

Example (in Postman): ["joinPoll", "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6"]

Server-to-Client Events
pollUpdate: The server broadcasts this event to all clients in a poll's room whenever a new vote is cast for that poll.

Payload: An array of poll option objects with their updated vote counts.

Example Payload:

[
  { "optionId": "z9y8x7w6...", "text": "JavaScript", "votes": 5 },
  { "optionId": "y8x7w6v5...", "text": "Python", "votes": 8 }
]
