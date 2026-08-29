# CodeRoom

> **Real-time collaborative technical interview platform**

CodeRoom is a production-oriented technical interviewing platform that brings the complete technical interview workflow into a single browser experience.

Instead of switching between a video conferencing application, a coding platform, a code execution service, and separate interview-management tools, CodeRoom combines them into one system:

* 🎥 Real-time video communication
* 🧑‍💻 Collaborative code editor
* ⚡ Real-time code synchronization
* 🧪 Sandboxed multi-language code execution
* 🔐 JWT-based authentication
* 👥 Interview rooms and participant management
* 📝 Questions and test cases
* 🤖 AI-powered interviewer assistance
* ⏺ Session recording
* 💾 Persistent interview and coding data
* 📡 WebSocket-based real-time communication
* 🗄️ Redis-backed live state
* 🐘 PostgreSQL-backed durable state
* 🌐 Nginx reverse proxy
* 🔒 HTTPS with Let's Encrypt
* ☁️ Cloudflare R2 object storage

The project is designed to demonstrate how a real-time product can be decomposed into specialized services while still being deployable on a small, cost-efficient VM.

---

## Table of Contents

* [Overview](#overview)
* [Problem Statement](#problem-statement)
* [Goals](#goals)
* [Core Features](#core-features)
* [System Architecture](#system-architecture)
* [Architecture Philosophy](#architecture-philosophy)
* [Service Responsibilities](#service-responsibilities)
* [Technology Stack](#technology-stack)
* [Data Flow](#data-flow)
* [Authentication](#authentication)
* [Real-Time Communication](#real-time-communication)
* [Collaborative Editor](#collaborative-editor)
* [Code Execution](#code-execution)
* [WebRTC Video](#webrtc-video)
* [Recording](#recording)
* [AI Copilot](#ai-copilot)
* [Database Architecture](#database-architecture)
* [Redis](#redis)
* [Object Storage](#object-storage)
* [API Structure](#api-structure)
* [Frontend Architecture](#frontend-architecture)
* [Deployment Architecture](#deployment-architecture)
* [Nginx Configuration](#nginx-configuration)
* [Environment Configuration](#environment-configuration)
* [Local Development](#local-development)
* [Production Deployment](#production-deployment)
* [Health Checks](#health-checks)
* [Security Considerations](#security-considerations)
* [Scalability](#scalability)
* [Failure Scenarios](#failure-scenarios)
* [Performance Considerations](#performance-considerations)
* [Project Structure](#project-structure)
* [API Endpoints](#api-endpoints)
* [Operational Commands](#operational-commands)
* [Troubleshooting](#troubleshooting)
* [Architectural Decisions](#architectural-decisions)
* [Future Improvements](#future-improvements)
* [Engineering Principles](#engineering-principles)

---

# Overview

CodeRoom is designed around one central idea:

> **A technical interview is a real-time distributed system, not just a CRUD application.**

During an interview, several different types of workloads happen simultaneously:

1. Authentication and authorization
2. Interview and room management
3. High-frequency editor updates
4. WebSocket communication
5. WebRTC signaling
6. Video/audio communication
7. Code execution
8. Database persistence
9. Recording uploads
10. AI requests

These workloads have very different characteristics.

For example:

* Authentication requires correctness and security.
* Code changes require extremely low latency.
* Code execution requires isolation.
* Video requires real-time media transport.
* Interview data requires transactional persistence.
* Redis is useful for ephemeral high-frequency state.
* Object storage is better for large recordings.

Trying to make every workload use the same technology would create unnecessary coupling.

CodeRoom therefore separates responsibilities based on workload characteristics.

---

# Problem Statement

Traditional technical interviewing often requires multiple disconnected tools:

```text
Video Call
    +
Coding Platform
    +
Code Execution
    +
Interview Notes
    +
Scoring
    +
Recording
```

This creates several problems:

* Context switching between applications
* Difficulty collaborating on code
* No unified interview state
* Limited visibility into candidate behavior
* Difficulty reproducing the exact coding session
* Separate systems for video and coding
* Expensive commercial platforms
* Limited control over infrastructure

CodeRoom attempts to provide the complete interview workflow in one application.

---

# Goals

## Primary Goals

CodeRoom aims to provide:

* Low-latency collaboration
* Secure code execution
* Reliable authentication
* Interview room management
* Integrated video
* Persistent interview data
* Recording
* AI assistance
* Clear service boundaries
* Cost-efficient deployment

## Engineering Goals

The system should:

* Separate real-time workloads from transactional workloads
* Never execute untrusted code directly inside the backend
* Keep durable data in PostgreSQL
* Keep high-frequency transient state in Redis
* Avoid sending video media through the backend
* Allow services to restart independently
* Be deployable on limited infrastructure
* Have a clear path toward horizontal scaling

---

# Core Features

## 1. Authentication

CodeRoom supports:

* User registration
* Login
* JWT access tokens
* Refresh tokens
* Role-based authorization

Roles can be used to distinguish participants such as:

* Candidate
* Interviewer
* Administrator

Authentication is enforced by the Spring Security layer.

---

## 2. Interview Rooms

Interviewers can create interview sessions and participants can join using the associated room.

The backend maintains the durable interview state.

Example lifecycle:

```text
SCHEDULED
     ↓
IN_PROGRESS
     ↓
COMPLETED
     ↓
REVIEWED
```

---

## 3. Collaborative Editor

The interview editor allows participants to work on the same code session.

Features include:

* Live code synchronization
* Language selection
* Starter templates
* Cursor/presence updates
* Auto-save
* Run
* Submit
* Question loading

The browser maintains a WebSocket connection with the relay.

---

## 4. Sandboxed Code Execution

Candidate code is never executed directly by Spring Boot.

Instead:

```text
Frontend
   ↓
Relay
   ↓
Backend
   ↓
Executor
   ↓
Docker Container
```

The executor creates isolated containers for test execution.

The system supports multiple programming languages such as:

* Python
* JavaScript
* Java
* Go
* C++

Each execution is isolated and automatically destroyed.

---

## 5. Run vs Submit

CodeRoom intentionally separates:

### Run

Used for fast feedback against visible test cases.

### Submit

Used for final evaluation against the complete test suite, including hidden cases where applicable.

This prevents candidates from receiving unnecessary information about hidden tests during normal development.

---

## 6. WebRTC Video

Video communication is handled using browser WebRTC.

The server does not need to carry the actual video stream.

The architecture is conceptually:

```text
Candidate Browser
       ↕
   WebRTC Media
       ↕
Interviewer Browser
```

The Node relay is responsible for signaling:

```text
Offer
Answer
ICE Candidate
Call End
```

The media path remains peer-to-peer for interview-sized rooms.

---

## 7. Session Recording

The recording system captures:

* Screen/editor activity
* Webcam
* Audio

The resulting recording is uploaded to object storage.

The durable recording URL is stored in PostgreSQL.

---

## 8. AI Copilot

CodeRoom provides an AI assistant intended for interviewers.

The assistant can help with:

* Follow-up question suggestions
* Approach evaluation
* Interviewer assistance
* Reasoning analysis

The AI assistant is intentionally separated from the candidate-facing workflow.

---

# System Architecture

At the application level, CodeRoom currently uses three primary application services:

```text
                         ┌───────────────────────┐
                         │      React Client     │
                         │                       │
                         │ Monaco/Code Editor    │
                         │ Video / WebRTC        │
                         │ Interview UI          │
                         └───────────┬───────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                  REST                         WebSocket
                    │                                 │
                    ▼                                 ▼
        ┌─────────────────────┐          ┌─────────────────────┐
        │    Spring Boot      │          │    Node.js Relay    │
        │      Backend        │◄────────►│      Socket.io      │
        │                     │          │                     │
        │ Auth                │          │ Room events         │
        │ Interviews          │          │ Code changes        │
        │ Questions           │          │ Cursor updates      │
        │ Scoring             │          │ WebRTC signaling    │
        │ AI                  │          │ Redis integration   │
        └──────┬──────────────┘          └──────────┬──────────┘
               │                                    │
               │                                    ▼
               │                            ┌──────────────┐
               │                            │    Redis     │
               │                            │              │
               │                            │ Live state   │
               │                            │ Pub/Sub      │
               │                            └──────────────┘
               │
        ┌──────┴─────────────┐
        │                    │
        ▼                    ▼
┌───────────────┐    ┌─────────────────┐
│   PostgreSQL  │    │    Executor     │
│               │    │                 │
│ Users         │    │ Docker sandbox  │
│ Interviews    │    │ Python          │
│ Questions     │    │ JavaScript      │
│ Test cases    │    │ Java            │
│ Scores        │    │ Go              │
│ Recording URL │    │ C++             │
└───────────────┘    └─────────────────┘
```

---

# Architecture Philosophy

The system follows three major responsibility boundaries:

## 1. Backend = Truth

Spring Boot owns:

* Authentication
* Authorization
* Interview state
* Questions
* Scores
* Persistent data
* Business rules

The backend is the authoritative business layer.

---

## 2. Relay = Real-Time Transport

Node.js owns:

* WebSocket connections
* Room broadcasting
* Presence
* WebRTC signaling
* High-frequency transient events

The relay should remain lightweight.

It is not intended to become the permanent source of truth.

---

## 3. Executor = Isolation

The executor owns:

* Running candidate code
* Container lifecycle
* Resource limits
* Execution output
* Test-case results

The executor is deliberately isolated because it processes untrusted input.

---

# Service Responsibilities

| Service        | Technology          | Responsibility                              |
| -------------- | ------------------- | ------------------------------------------- |
| Frontend       | React + Vite        | UI and browser-side real-time functionality |
| Backend        | Spring Boot         | Business logic and durable state            |
| Relay          | Node.js + Socket.io | Real-time communication                     |
| Executor       | Node.js + Docker    | Sandboxed code execution                    |
| Redis          | Redis               | Ephemeral state and messaging               |
| PostgreSQL     | Neon PostgreSQL     | Durable relational data                     |
| Object Storage | Cloudflare R2       | Recordings and large objects                |
| Reverse Proxy  | Nginx               | TLS and routing                             |

---

# Technology Stack

## Frontend

* React
* Vite
* Tailwind CSS
* Zustand
* Socket.io Client
* Code editor
* WebRTC APIs

## Backend

* Java
* Spring Boot
* Spring Security
* Spring Data JPA
* Hibernate
* PostgreSQL
* JWT
* Springdoc / Swagger

## Real-Time

* Node.js
* Express
* Socket.io
* Redis
* ioredis

## Execution

* Node.js
* Docker
* Dockerode

## Infrastructure

* Linux VM
* Nginx
* DuckDNS
* Let's Encrypt
* Cloudflare R2
* Neon PostgreSQL
* Redis provider

---

# Data Flow

## Normal API Request

```text
Browser
   │
   │ HTTPS
   ▼
Nginx
   │
   │ /api/*
   ▼
Spring Boot
   │
   ├──► PostgreSQL
   │
   ├──► Redis
   │
   ├──► Executor
   │
   └──► External APIs
```

---

## Real-Time Request

```text
Browser
   │
   │ Socket.io
   ▼
Nginx
   │
   ▼
Node Relay
   │
   ├──► Other participants
   │
   ├──► Redis
   │
   └──► Backend when persistence/business logic is required
```

---

# Authentication

The authentication flow is:

```text
Register/Login
      ↓
Spring Security
      ↓
JWT Access Token
      ↓
Frontend stores authentication state
      ↓
REST requests include JWT
      ↓
Socket connection includes JWT
      ↓
Relay validates socket authentication
```

The relay receives the authentication token during Socket.io initialization.

The relay middleware validates the socket user before allowing the connection to proceed.

This prevents unauthenticated clients from joining real-time rooms.

---

# Real-Time Communication

The frontend maintains a persistent Socket.io connection.

Example:

```javascript
socket = io(RELAY_URL, {
    auth: {
        token: `Bearer ${token}`
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
});
```

The relay handles events such as:

```text
ROOM_JOIN
ROOM_LEAVE
ROOM_LANGUAGE_CHANGE
EDITOR_CODE_CHANGE
EDITOR_CURSOR_MOVE
EDITOR_RUN_CODE
EDITOR_SUBMIT_CODE
EDITOR_AUTO_SAVE
EDITOR_LOAD_QUESTION
WEBRTC_OFFER
WEBRTC_ANSWER
WEBRTC_ICE_CANDIDATE
WEBRTC_CALL_END
```

---

# Collaborative Editor

The editor is designed around low-latency event propagation.

A typical code change follows:

```text
Participant A
     │
     │ code change
     ▼
Socket.io Relay
     │
     ├──────────────► Participant B
     │
     ├──────────────► Participant C
     │
     └──────────────► Backend
                         │
                         ▼
                     Persistence
```

This avoids forcing every participant to poll the database.

The database is used for durable state rather than as the transport mechanism for every keystroke.

---

# Code Execution

Running arbitrary user code is one of the highest-risk parts of the platform.

The architecture therefore uses Docker isolation.

```text
             Candidate Code
                    │
                    ▼
              Spring Boot
                    │
                    ▼
                Executor
                    │
             ┌──────┴──────┐
             │             │
             ▼             ▼
       Test Container  Test Container
             │             │
             ▼             ▼
          stdout        stdout
          stderr        stderr
             │             │
             └──────┬──────┘
                    ▼
             Structured Result
```

Each execution container should have:

* Memory limit
* CPU limit
* Process limit
* Network disabled
* Temporary filesystem
* Automatic destruction

The executor should never share the backend process with arbitrary candidate code.

---

# WebRTC Video

The system uses WebRTC for media communication.

The relay handles signaling:

```text
Candidate
   │
   │ Offer
   ▼
Relay
   │
   │ Offer
   ▼
Interviewer
```

The reverse happens for:

* Answer
* ICE candidates

Once WebRTC negotiation is complete, media can travel directly between peers.

This significantly reduces server bandwidth requirements.

For small interview rooms, mesh WebRTC is a practical cost-effective design.

---

# Recording

The recording pipeline is:

```text
Browser
   │
   ├── Screen
   ├── Webcam
   └── Audio
          │
          ▼
     Recording Pipeline
          │
          ▼
      Cloudflare R2
          │
          ▼
   Recording URL
          │
          ▼
      PostgreSQL
```

The database stores metadata and the recording reference rather than the recording binary itself.

This keeps PostgreSQL focused on transactional data.

---

# AI Copilot

The backend acts as the controlled gateway to the AI provider.

```text
Interviewer
     │
     │ AI request
     ▼
React
     │
     ▼
Spring Boot
     │
     │ authenticated server request
     ▼
AI Provider
     │
     ▼
Spring Boot
     │
     ▼
Interviewer
```

This prevents exposing the provider API key directly to the browser.

The AI feature is designed as an interviewer-side capability.

---

# Database Architecture

PostgreSQL is the durable source of truth.

Typical persistent entities include:

```text
Users
Interviews
Rooms
Questions
Test Cases
Scores
Recording Metadata
Code Snapshots
```

The backend accesses PostgreSQL through:

```text
Spring Data JPA
        ↓
Hibernate
        ↓
PostgreSQL
```

Relational storage is appropriate because the application contains strongly related entities and transactional operations.

---

# Redis

Redis is used for data that is:

* Hot
* Frequently modified
* Temporary
* Suitable for expiration
* Useful for pub/sub

Examples:

```text
room:{roomId}
interview:{interviewId}
socket presence
current editor state
Socket.io pub/sub
```

Redis is not treated as the permanent database.

The conceptual model is:

```text
Redis
  =
Fast temporary operational state

PostgreSQL
  =
Durable business state
```

---

# Object Storage

Large binary objects should not be stored inside PostgreSQL.

Cloudflare R2 is used for:

* Recordings
* Large media
* Potential future snapshots/assets

The database stores metadata and URLs/references.

This creates a clean separation:

```text
PostgreSQL
    │
    └── metadata

R2
    │
    └── large binary object
```

---

# API Structure

The current backend exposes APIs organized by domain.

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
```

## Rooms

```text
POST /api/rooms/create/{interviewId}
GET  /api/rooms/{roomId}
GET  /api/rooms/interview/{interviewId}

POST /api/rooms/{roomId}/joined
POST /api/rooms/{roomId}/left
POST /api/rooms/{roomId}/sync
POST /api/rooms/{roomId}/question/{questionId}
POST /api/rooms/{roomId}/close
```

## Interviews

```text
POST /api/interviews/create
POST /api/interviews/join/{roomId}
POST /api/interviews/end/{roomId}
POST /api/interviews/score/{roomId}

GET /api/interviews/my
GET /api/interviews/room/{roomId}
GET /api/interviews/by-room-entity/{roomEntityId}

POST /api/interviews/{id}/join-as-panelist
```

## Questions

```text
POST   /api/questions/create
GET    /api/questions/{id}
GET    /api/questions
GET    /api/questions/difficulty/{difficulty}
GET    /api/questions/search
GET    /api/questions/tag/{tag}

POST   /api/questions/{id}/testcase
PUT    /api/questions/{id}
DELETE /api/questions/{id}
```

## Code Execution

```text
POST /api/execute
```

## Recordings

```text
POST /api/recordings/upload/{interviewId}
```

## AI

```text
POST /api/ai/chat
```

---

# Frontend Architecture

The frontend is a Vite-powered React application.

Conceptually:

```text
React
 │
 ├── Pages
 │
 ├── Components
 │
 ├── Services
 │    ├── API
 │    └── Socket
 │
 ├── State
 │    └── Zustand
 │
 └── Utilities
```

The frontend communicates through two primary channels:

### REST

Used for:

* Authentication
* CRUD operations
* Questions
* Interviews
* Scores
* Recording operations
* AI

### Socket.io

Used for:

* Real-time editor updates
* Cursor movement
* Room events
* WebRTC signaling
* Execution result events
* Live collaboration

---

# Deployment Architecture

The production system is deployed on a single Linux VM for cost efficiency.

The current deployment is:

```text
                    Internet
                       │
                       │ HTTPS :443
                       ▼
             coderoom-1.duckdns.org
                       │
                       ▼
                  ┌─────────┐
                  │  Nginx  │
                  └────┬────┘
                       │
          ┌────────────┼──────────────┐
          │            │              │
          ▼            ▼              ▼
       Frontend       API         Socket.io
      /var/www/      :8080          :4000
       coderoom
          │            │              │
          │            ▼              ▼
          │        Spring Boot     Node Relay
          │            │              │
          │       ┌────┴─────┐        │
          │       │          │        ▼
          │       ▼          ▼      Redis
          │   PostgreSQL   Executor
          │
          └── Browser
```

This means the application does not require Vercel for the current deployment.

The VM hosts:

* React static files
* Nginx
* Spring Boot
* Node relay
* Executor

External managed services provide:

* PostgreSQL
* Redis
* Object storage
* AI provider

---

# Nginx Configuration

Nginx is the public entry point.

It provides:

* TLS termination
* HTTP → HTTPS redirection
* Static frontend serving
* REST proxying
* WebSocket proxying
* Large upload support

Routing:

```text
/                    → React
/api/*               → Spring Boot :8080
/socket.io/*         → Node Relay :4000
/relay-health        → Node Relay /health
```

The browser therefore uses one public origin:

```text
https://coderoom-1.duckdns.org
```

instead of exposing:

```text
:8080
:4000
```

directly to users.

---

# HTTPS

HTTPS is provided using:

* Let's Encrypt
* Certbot
* Nginx

Certificate files are managed by Certbot.

The certificate is configured directly into Nginx.

Certificate renewal is automated by Certbot.

---

# Environment Configuration

Secrets must never be committed to Git.

Examples of sensitive configuration include:

```text
Database password
JWT secret
AI API key
R2 access key
R2 secret
Execution API key
OAuth credentials
```

The production application uses environment-specific configuration.

For frontend:

```env
VITE_API_URL=https://coderoom-1.duckdns.org
VITE_RELAY_URL=https://coderoom-1.duckdns.org
```

The frontend should never contain server-only secrets.

---

# Local Development

## Prerequisites

Install:

* Node.js
* npm
* Java
* Maven
* PostgreSQL or remote PostgreSQL
* Redis
* Docker

---

## Backend

```bash
cd backend
./mvnw clean package
```

Run:

```bash
./mvnw spring-boot:run
```

Backend:

```text
http://localhost:8080
```

---

## Relay

```bash
cd relay
npm install
npm start
```

Relay:

```text
http://localhost:4000
```

Health:

```text
http://localhost:4000/health
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Production Deployment

The production deployment consists of five major stages.

## 1. Build Backend

```bash
cd backend
./mvnw clean package
```

---

## 2. Run Backend

The backend is managed by systemd.

```bash
sudo systemctl status coderoom-api
```

Restart:

```bash
sudo systemctl restart coderoom-api
```

---

## 3. Run Relay

The relay is also managed by systemd.

```bash
sudo systemctl status coderoom-relay
```

Restart:

```bash
sudo systemctl restart coderoom-relay
```

---

## 4. Deploy Frontend

Build locally:

```bash
npm run build
```

Upload:

```bash
scp -i ~/Downloads/coderoom_key.pem \
-r dist/* \
anubhav@YOUR_VM_IP:/tmp/coderoom-dist/
```

On the VM:

```bash
sudo rm -rf /var/www/coderoom/*
sudo cp -r /tmp/coderoom-dist/* /var/www/coderoom/
sudo chown -R www-data:www-data /var/www/coderoom
```

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

# Health Checks

## Backend

```bash
curl http://127.0.0.1:8080
```

An unauthenticated response such as:

```json
{
  "message": "Unauthorized"
}
```

can still confirm that the application is responding.

---

## Relay

```bash
curl http://127.0.0.1:4000/health
```

Expected:

```json
{
  "status": "ok",
  "service": "coderoom-relay"
}
```

---

## Through Nginx

```bash
curl https://coderoom-1.duckdns.org/relay-health
```

Expected:

```json
{
  "status": "ok",
  "service": "coderoom-relay"
}
```

---

## Nginx

```bash
sudo nginx -t
sudo systemctl status nginx
```

---

# Security Considerations

## 1. Never commit secrets

Do not commit:

```text
.env
application.properties
private keys
API keys
database passwords
cloud credentials
```

Use:

```gitignore
.env
*.env
application-local.properties
application-prod.properties
```

as appropriate for the repository.

---

## 2. Rotate exposed credentials

If a secret is accidentally committed or shared, assume it is compromised.

Rotate:

* Database credentials
* AI API keys
* R2 keys
* JWT secrets
* Execution keys

---

## 3. Code execution isolation

Never execute candidate code directly inside Spring Boot or the Node relay.

Candidate code must remain isolated.

---

## 4. Network restrictions

Execution containers should not have unrestricted outbound networking.

---

## 5. Resource limits

Containers should have:

* CPU limits
* Memory limits
* Process limits
* Execution timeouts

---

## 6. Authentication

REST APIs require authentication where appropriate.

Socket connections must also authenticate before joining rooms.

---

## 7. HTTPS

Production traffic should use HTTPS.

This is particularly important because the application handles:

* Authentication tokens
* WebSocket connections
* Interview data
* Video signaling
* Candidate information

---

# Scalability

The current architecture is intentionally small enough to run on a single VM.

However, the boundaries allow the system to scale.

## Current

```text
1 VM
 ├── Nginx
 ├── Spring Boot
 ├── Node Relay
 └── Executor
```

## Future

```text
                    Load Balancer
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Relay 1        Relay 2        Relay 3
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                       Redis

                         │
                         ▼
                  Spring Backend
                  ┌──────┼──────┐
                  ▼      ▼      ▼
               API 1   API 2   API 3

                         │
                         ▼
                    PostgreSQL

                         │
                         ▼
                    Executors
                 ┌────┬────┬────┐
                 ▼    ▼    ▼    ▼
               Worker Worker Worker
```

---

# WebSocket Scaling

When the relay needs to scale horizontally:

```text
Relay 1 ─┐
Relay 2 ─┼──► Redis Pub/Sub
Relay 3 ─┘
```

Redis allows relay instances to communicate about room events.

This avoids requiring every participant to connect to the same physical process.

---

# Executor Scaling

Code execution is CPU-intensive.

Executors can scale horizontally:

```text
Execution Queue
      │
      ├──► Executor 1
      ├──► Executor 2
      ├──► Executor 3
      └──► Executor N
```

The backend does not need to know which executor eventually handles a request.

---

# Database Scaling

Potential future improvements include:

* Connection pooling
* Read replicas
* Query optimization
* Indexing
* Partitioning large history tables
* Dedicated databases per service at larger scale

---

# Failure Scenarios

## Redis Failure

Expected impact:

* Live transient state may become unavailable
* Cross-instance relay synchronization may stop

Durable PostgreSQL data remains available.

The system should reconstruct recoverable state from persistent storage where possible.

---

## Relay Failure

The browser loses the real-time connection.

Socket.io reconnect logic attempts reconnection.

The backend remains operational.

---

## Backend Failure

REST operations become unavailable.

The relay may still maintain existing socket connections temporarily, but business operations requiring the backend will fail.

---

## Executor Failure

Interview functionality remains available except for code execution.

This is an important reason to keep execution isolated.

---

## PostgreSQL Failure

Persistent business operations become unavailable.

The application should fail closed rather than treating Redis as permanent storage.

---

# Performance Considerations

## High-frequency operations

The system avoids writing every keystroke directly to PostgreSQL.

Instead:

```text
Keystroke
   ↓
Socket.io
   ↓
Relay
   ↓
Redis / event propagation
   ↓
Periodic persistence
   ↓
PostgreSQL
```

This reduces database write pressure.

---

## Video

Video is not routed through Spring Boot.

This prevents video bandwidth from becoming an API-server bottleneck.

---

## Code Execution

Test cases can execute in parallel where appropriate.

This reduces total perceived execution latency.

---

# Project Structure

A simplified repository structure:

```text
CodeRoom/
│
├── backend/
│   ├── src/
│   │   └── main/
│   │       └── java/
│   │           └── videoInterview/
│   │               └── Interview/
│   │
│   ├── pom.xml
│   └── application.properties
│
├── relay/
│   ├── src/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   └── index.js
│   │
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   │
│   ├── package.json
│   └── .env
│
├── README.md
└── ARCHITECTURE_DECISIONS.md
```

---

# Operational Commands

## Backend

```bash
sudo systemctl status coderoom-api
sudo systemctl restart coderoom-api
sudo journalctl -u coderoom-api -n 100 --no-pager
```

---

## Relay

```bash
sudo systemctl status coderoom-relay
sudo systemctl restart coderoom-relay
sudo journalctl -u coderoom-relay -n 100 --no-pager
```

---

## Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
```

---

## Ports

```bash
sudo ss -lntp
```

Expected internal services include:

```text
8080 → Spring Boot
4000 → Node Relay
80   → Nginx HTTP
443  → Nginx HTTPS
```

---

# Troubleshooting

## Relay says EADDRINUSE

Example:

```text
Error: listen EADDRINUSE: address already in use :::4000
```

Find the process:

```bash
sudo ss -lntp | grep ':4000'
```

If an old manually started relay is running while systemd is also starting one, stop the manually started process.

Only one service should own port 4000.

---

## Nginx is not listening on 443

Check:

```bash
sudo ss -lntp | grep ':443'
```

Then:

```bash
sudo nginx -T | grep -A15 -B5 "listen 443"
```

Check:

```bash
sudo nginx -t
```

Also verify that the VM/cloud firewall allows TCP 443.

---

## Frontend loads but API fails

Check:

```bash
curl -v https://coderoom-1.duckdns.org/api/...
```

Then check:

```bash
sudo journalctl -u coderoom-api -n 100 --no-pager
```

---

## WebSocket does not connect

Verify:

```text
/socket.io/
```

is proxied to:

```text
127.0.0.1:4000
```

Nginx must forward:

```text
Upgrade
Connection
```

headers.

---

## HTTPS works locally but not externally

Check:

```bash
sudo ss -lntp | grep ':443'
```

If Nginx is not listening:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If it is listening but unreachable externally, inspect the cloud VM firewall/security rules.

---

# Architectural Decisions

The detailed architectural reasoning is documented separately in:

```text
ARCHITECTURE_DECISIONS.md
```

The document explains:

* Why Spring Boot
* Why Node.js
* Why Redis
* Why PostgreSQL
* Why Docker
* Why WebRTC
* Why Nginx
* Why a three-service architecture
* Why the current VM deployment
* Why not put everything into one process
* Tradeoffs
* Failure isolation
* Scaling strategy

---

# Future Improvements

Potential next-stage improvements include:

## Infrastructure

* Docker Compose production deployment
* CI/CD
* Container image registry
* Automated deployments
* Centralized logging
* Metrics
* Distributed tracing

## Real-Time

* Horizontal relay scaling
* Redis adapter
* Presence improvements
* Better reconnect/session recovery

## Execution

* Queue-based execution
* Dedicated executor workers
* Stronger container isolation
* Execution timeout enforcement
* Per-user rate limiting

## Database

* Connection pooling
* Better indexes
* Read replicas
* Historical data partitioning

## Security

* Shorter-lived access tokens
* Refresh-token rotation
* Rate limiting
* Stronger sandboxing
* Security headers
* Audit logging

## Product

* Interview scheduling
* Advanced scorecards
* Candidate analytics
* Edit replay
* Snapshot restore
* Diff viewer
* Hiring dashboard
* Interview analytics

---

# Engineering Principles

CodeRoom follows several principles.

### 1. Keep the source of truth clear

PostgreSQL owns durable business state.

### 2. Don't use the database as a message bus

Real-time events belong on the real-time path.

### 3. Don't execute untrusted code inside trusted services

Candidate code belongs in isolated containers.

### 4. Don't send video through the application backend

WebRTC should handle media transport.

### 5. Separate workloads by characteristics

Transactional, real-time, CPU-intensive, and binary workloads require different strategies.

### 6. Optimize for the current scale

The architecture should be capable of scaling, but infrastructure should not be unnecessarily expensive before scale exists.

### 7. Prefer explicit ownership

Every major responsibility should have a clearly defined owner.

---

# Why CodeRoom?

CodeRoom is not intended to be another CRUD application.

The interesting engineering problems are distributed across:

* Real-time state
* WebSockets
* WebRTC
* Authentication
* Distributed communication
* Code sandboxing
* Database persistence
* Object storage
* AI integration
* Reverse proxies
* TLS
* Deployment
* Failure isolation
* Horizontal scaling

That combination makes CodeRoom a practical demonstration of full-stack and distributed-systems engineering.

---

# Status

**Current deployment:** Production-style single-VM deployment

**Frontend:** React + Vite

**Backend:** Spring Boot

**Real-time:** Node.js + Socket.io

**Execution:** Node.js + Docker

**Database:** PostgreSQL

**Cache / Pub/Sub:** Redis

**Object Storage:** Cloudflare R2

**Reverse Proxy:** Nginx

**HTTPS:** Let's Encrypt

**DNS:** DuckDNS

---

# Author

**Anubhav**

CodeRoom is built as a hands-on systems engineering project focused on real-time collaboration, secure execution, and production-oriented architecture.

---


