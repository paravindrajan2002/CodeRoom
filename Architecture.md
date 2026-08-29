# CodeRoom — Architectural Decision Records

> A detailed explanation of the architectural choices behind CodeRoom.

---

# 1. Purpose

This document explains **why CodeRoom is built the way it is**.

The README describes what the system does.

This document explains:

> **Why were these technologies, boundaries, communication patterns, and deployment decisions chosen?**

The objective is not to claim that every decision is universally optimal.

Instead, each decision is evaluated against:

* Current product requirements
* Expected interview-room size
* Latency requirements
* Security requirements
* Operational complexity
* Cost
* Failure isolation
* Future scalability

---

# 2. Architecture Summary

CodeRoom currently consists of three primary application responsibilities:

```text
Frontend
    │
    ├──────── REST ────────► Backend
    │
    └──── WebSocket ───────► Relay
                              │
                              ▼
                            Redis

Backend
    │
    ├────► PostgreSQL
    │
    ├────► Executor
    │
    ├────► Object Storage
    │
    └────► AI Provider
```

The three most important boundaries are:

```text
Backend = Truth
Relay   = Real-time transport
Executor = Isolation
```

This separation is the foundation of the system.

---

# ADR-001: Separate the Application into Specialized Services

## Status

Accepted

## Context

CodeRoom performs several fundamentally different workloads:

* Authentication
* Database transactions
* Real-time WebSocket communication
* WebRTC signaling
* Candidate code execution
* AI requests
* Recording management

A single process could technically implement all of these.

However, doing so creates strong coupling.

For example, if candidate code execution crashes the process, authentication and interview management could also become unavailable.

Similarly, high-frequency WebSocket traffic could compete with transactional API requests for resources.

## Decision

Separate the system into specialized services:

```text
Spring Boot Backend
Node.js Relay
Execution Service
```

with supporting infrastructure:

```text
Redis
PostgreSQL
Object Storage
```

## Reasoning

Each service has a different responsibility.

### Backend

Optimized for:

* Correctness
* Security
* Transactions
* Business rules
* Persistence

### Relay

Optimized for:

* Large numbers of connections
* Small frequent messages
* Low-latency event delivery

### Executor

Optimized for:

* Isolation
* CPU-intensive workloads
* Resource limiting

## Benefits

A failure in the executor does not inherently require the authentication service to fail.

A relay can be restarted independently.

The backend can evolve without coupling it to WebSocket implementation details.

## Tradeoff

More services introduce:

* More deployments
* More logs
* More networking
* More configuration
* More operational complexity

For a tiny application, a monolith would be simpler.

However, CodeRoom intentionally prioritizes demonstrating appropriate service boundaries because real-time communication and untrusted code execution have materially different operational characteristics.

---

# ADR-002: Use Spring Boot for the Backend

## Status

Accepted

## Context

The backend handles:

* Authentication
* Authorization
* Interviews
* Questions
* Scores
* Database transactions
* AI integration
* Recording metadata

These operations require strong transactional and security primitives.

## Decision

Use:

```text
Java
Spring Boot
Spring Security
Spring Data JPA
Hibernate
PostgreSQL
```

## Reasoning

Spring provides mature solutions for:

* Dependency injection
* Authentication
* Authorization
* JWT filters
* Database transactions
* JPA
* Validation
* API documentation
* Production configuration

The application contains relational business entities and transactional workflows, making Spring + JPA + PostgreSQL a natural fit.

## Alternatives

### Node.js backend

Possible, but the project would need equivalent security and persistence infrastructure.

### Go

Excellent performance and concurrency, but less aligned with the project's existing Java ecosystem and Spring Security requirements.

### Python

Excellent for AI and rapid development, but less suitable as the primary transactional backend for this project's intended architecture.

## Decision Outcome

Spring Boot provides the strongest balance between:

* Security
* Maintainability
* Transaction support
* Ecosystem maturity
* Developer productivity

---

# ADR-003: Use Node.js + Socket.io for the Real-Time Relay

## Status

Accepted

## Context

The interview room generates frequent events:

```text
Code changes
Cursor changes
Room events
WebRTC signaling
Execution events
Presence
```

Most events are small but frequent.

This workload is fundamentally different from CRUD API requests.

## Decision

Use:

```text
Node.js
Express
Socket.io
```

for the relay.

## Why Node.js?

Node's event-driven architecture is well suited for:

* Persistent connections
* Many concurrent sockets
* Small asynchronous messages
* Event-based programming

The relay does not need to perform heavy CPU computation.

Its primary job is:

```text
receive event
     ↓
validate
     ↓
route
     ↓
broadcast
```

## Why Socket.io?

Socket.io provides:

* Connection management
* Reconnection
* Event-based APIs
* WebSocket transport
* Fallback mechanisms
* Room abstractions

This significantly simplifies the real-time implementation.

## Why not Spring WebSocket?

Spring WebSocket is absolutely capable of handling this workload.

The choice is architectural rather than because Spring cannot do WebSockets.

Node provides a clean demonstration of polyglot architecture:

```text
Spring Boot
      +
Node.js
```

Each is used where it provides a strong fit.

---

# ADR-004: Keep the Relay Stateless Where Possible

## Status

Accepted

## Context

A WebSocket relay can easily become a second database if it begins storing all application state internally.

That creates consistency problems.

## Decision

The relay should primarily act as a transport layer.

```text
Relay
 =
Real-time transport
```

rather than:

```text
Relay
 =
Permanent source of truth
```

## Reasoning

If the relay process restarts, the application should be able to reconstruct important state from durable storage.

This makes the relay easier to:

* Restart
* Scale
* Replace
* Debug

Redis can hold ephemeral state, but PostgreSQL remains the durable source of truth.

---

# ADR-005: Use Redis for Hot Ephemeral State

## Status

Accepted

## Context

Live editor state changes extremely frequently.

Writing every change directly to PostgreSQL would produce unnecessary database pressure.

## Decision

Use Redis for:

* Hot room state
* Presence
* Temporary collaboration state
* Pub/Sub

while PostgreSQL stores durable state.

## Architecture

```text
                   ┌─────────────┐
                   │   Redis     │
                   │             │
                   │ live state  │
                   │ pub/sub     │
                   └──────┬──────┘
                          │
                    fast path
                          │
Frontend → Relay ─────────┘

Frontend → Backend → PostgreSQL
                    durable path
```

## Reasoning

Redis provides:

* Low latency
* High throughput
* TTL support
* Pub/Sub

PostgreSQL provides:

* Durability
* Transactions
* Relational integrity
* Queryability

Each database is therefore used according to its strengths.

---

# ADR-006: PostgreSQL Is the Durable Source of Truth

## Status

Accepted

## Context

The system stores:

* Users
* Interviews
* Questions
* Test cases
* Scores
* Recording references
* Persistent interview state

These require durable relational storage.

## Decision

Use PostgreSQL as the authoritative persistent database.

## Reasoning

The application has relationships such as:

```text
User
  ↓
Interview
  ↓
Room
  ↓
Question
  ↓
Test Cases
  ↓
Results
```

A relational database naturally represents these relationships.

PostgreSQL also provides:

* ACID transactions
* Foreign keys
* Indexes
* Strong consistency
* Mature tooling

---

# ADR-007: Do Not Store Recordings in PostgreSQL

## Status

Accepted

## Context

Interview recordings can become large.

Storing large binary media directly in PostgreSQL would increase:

* Database size
* Backup size
* Storage cost
* Query complexity

## Decision

Store recordings in object storage.

Use PostgreSQL only for metadata.

```text
Recording
   │
   ├── binary → R2
   │
   └── metadata → PostgreSQL
```

## Benefits

Database remains optimized for relational operations.

Object storage is optimized for large objects.

---

# ADR-008: Use Cloudflare R2 for Object Storage

## Status

Accepted

## Context

Recordings require durable object storage.

The application also benefits from low-cost storage and reduced egress concerns.

## Decision

Use Cloudflare R2.

## Reasoning

R2 is appropriate for:

* Recordings
* Large files
* Media
* Future snapshots

The backend stores the resulting object reference in PostgreSQL.

---

# ADR-009: Isolate Candidate Code Using Docker

## Status

Accepted

## Context

Candidate code is untrusted input.

A candidate could accidentally or intentionally submit:

```text
Infinite loops
Fork bombs
Memory exhaustion
CPU exhaustion
Filesystem abuse
Network access
Malicious processes
```

Executing code directly inside the backend would be a major security risk.

## Decision

Execute each test case in an isolated Docker container.

## Model

```text
Candidate Code
      ↓
Executor
      ↓
Docker Container
      ↓
Resource Limits
      ↓
Execution
      ↓
Destroy Container
```

## Required restrictions

Execution containers should enforce:

* CPU limit
* Memory limit
* Process limit
* Timeout
* Network isolation
* Temporary storage

## Why not execute directly?

Because the backend is a trusted process.

Candidate code is not.

The architecture must preserve that trust boundary.

---

# ADR-010: Run Test Cases in Isolated Containers

## Status

Accepted

## Context

A single execution environment could allow one test to interfere with another.

## Decision

Each test case can be executed using a separate short-lived container.

## Benefits

Failure isolation becomes stronger.

For example:

```text
Test 1 → Container 1
Test 2 → Container 2
Test 3 → Container 3
```

A runaway process in Container 1 does not automatically compromise Container 2.

## Tradeoff

Creating containers introduces overhead.

The system therefore favors:

> Isolation over marginal execution speed.

For an interview platform, security is more important than eliminating a small amount of container startup overhead.

---

# ADR-011: Separate Run and Submit

## Status

Accepted

## Context

Candidates need rapid feedback while developing their solution.

However, exposing hidden test cases on every execution weakens evaluation integrity.

## Decision

Provide two execution paths:

```text
Run
 ↓
Visible tests

Submit
 ↓
Complete test suite
```

## Benefits

Candidates get fast feedback.

Interviewers retain hidden-test integrity.

This also creates a clear product distinction between experimentation and final evaluation.

---

# ADR-012: Use WebRTC for Video

## Status

Accepted

## Context

Video is bandwidth-intensive.

Routing all video through the application backend would make the server a media bottleneck.

## Decision

Use browser WebRTC.

The relay handles signaling but not media transport.

```text
Browser A
    ╲
     ╲ WebRTC media
      ╲
       Browser B
```

The server handles:

```text
Offer
Answer
ICE
Room signaling
```

but does not need to process every media packet.

---

# ADR-013: Use WebRTC Mesh for Interview-Sized Rooms

## Status

Accepted

## Context

Typical technical interviews have a small number of participants.

For example:

```text
1 candidate
+
1–4 interviewers
```

An SFU would introduce additional infrastructure and media-routing complexity.

## Decision

Use peer-to-peer WebRTC mesh for the current interview-room size.

## Benefits

* Lower infrastructure cost
* Lower server bandwidth
* Simpler architecture
* Media remains peer-to-peer

## Tradeoff

Mesh complexity increases with participant count.

For example:

```text
N participants
≈ N × (N - 1) peer relationships
```

Therefore mesh is not the correct architecture for very large rooms.

## Future

If rooms become substantially larger, move to an SFU architecture.

---

# ADR-014: Keep WebRTC Signaling on the Existing Relay

## Status

Accepted

## Context

The application already has a persistent Socket.io connection.

Creating another signaling service would add unnecessary infrastructure.

## Decision

Reuse the existing relay for:

```text
WEBRTC_OFFER
WEBRTC_ANSWER
WEBRTC_ICE_CANDIDATE
WEBRTC_CALL_END
```

## Benefit

The relay already provides:

* Authentication
* Room membership
* Event routing
* Persistent connections

Adding WebRTC signaling therefore requires only additional event types.

---

# ADR-015: Use Nginx as the Public Gateway

## Status

Accepted

## Context

Spring Boot and Node.js run on internal ports:

```text
8080
4000
```

Exposing both directly would complicate:

* TLS
* CORS
* Client configuration
* Security
* Routing

## Decision

Use Nginx as the public entry point.

```text
Internet
   ↓
Nginx
 ┌─┴───────────────┐
 │                 │
/api              /socket.io
 │                 │
 ▼                 ▼
Spring           Relay
```

## Benefits

Nginx provides:

* TLS termination
* Routing
* WebSocket upgrades
* Static file serving
* Request size configuration
* Single public origin

---

# ADR-016: Serve Frontend from the Same VM

## Status

Accepted

## Context

The application initially considered deploying the frontend separately using a frontend hosting provider.

However, the goal became:

> Keep the entire application live using a single low-cost VM and avoid introducing unnecessary external deployment dependencies.

## Decision

Build the React application and serve the static files through Nginx.

```text
React build
    ↓
dist/
    ↓
/var/www/coderoom
    ↓
Nginx
```

## Benefits

* One deployment environment
* One public origin
* No frontend hosting dependency
* Simple CORS model
* Simple WebSocket configuration
* Low cost

## Tradeoff

The VM becomes responsible for frontend serving.

This is acceptable at the current scale.

At larger scale, static assets could move to a CDN.

---

# ADR-017: Use DuckDNS Instead of Purchasing a Domain

## Status

Accepted

## Context

A production HTTPS deployment requires a stable hostname.

The project does not require a paid custom domain at its current stage.

## Decision

Use a DuckDNS hostname.

Current hostname:

```text
coderoom-1.duckdns.org
```

## Benefits

* Free
* Stable hostname
* Works with Let's Encrypt
* Suitable for development/demo production environments

## Tradeoff

It does not provide the branding of a custom domain.

If the project becomes a commercial product, a custom domain should replace it.

---

# ADR-018: Use Let's Encrypt for HTTPS

## Status

Accepted

## Context

The browser requires secure origins for many modern APIs, particularly:

* WebRTC
* Secure cookies
* Authentication
* WebSocket security

## Decision

Use:

```text
Let's Encrypt
+
Certbot
+
Nginx
```

## Result

The application is accessed through:

```text
https://coderoom-1.duckdns.org
```

Certificates are automatically renewed by Certbot.

---

# ADR-019: Use One Public Origin

## Status

Accepted

## Context

The frontend could directly access:

```text
VM:8080
VM:4000
```

but this would create unnecessary CORS and security complexity.

## Decision

Expose a single public origin:

```text
https://coderoom-1.duckdns.org
```

Nginx routes internally.

```text
/api/*
    ↓
8080

/socket.io/*
    ↓
4000

/*
    ↓
React static files
```

## Benefits

* Simplified frontend configuration
* Reduced CORS complexity
* Better security
* Cleaner production architecture

---

# ADR-020: Use systemd for Application Processes

## Status

Accepted

## Context

The production VM needs the backend and relay to:

* Start automatically
* Restart after failure
* Run independently from SSH sessions
* Produce accessible logs

## Decision

Use systemd.

Services:

```text
coderoom-api.service
coderoom-relay.service
```

## Benefits

systemd provides:

* Process supervision
* Automatic restart
* Boot startup
* Logging integration
* Standard Linux administration

Example:

```bash
sudo systemctl status coderoom-api
sudo systemctl status coderoom-relay
```

---

# ADR-021: Use a Single VM for Current Deployment

## Status

Accepted

## Context

The application is currently a small-scale project.

Running Kubernetes, multiple VMs, load balancers, and dedicated databases would introduce significant operational overhead.

## Decision

Use one VM for application workloads.

```text
VM
├── Nginx
├── React
├── Spring Boot
├── Node Relay
└── Executor
```

Managed infrastructure handles:

```text
PostgreSQL
Redis
Object Storage
```

## Reasoning

The architecture should be proportional to the workload.

A small application does not need a large distributed deployment simply because it may scale someday.

The service boundaries are preserved so that scaling can happen later.

---

# ADR-022: Scale Horizontally Only When Required

## Status

Accepted

## Context

Premature scaling increases complexity.

## Decision

Start with:

```text
1 VM
1 Backend
1 Relay
1 Executor
```

Scale only when a real bottleneck appears.

Potential future scaling:

```text
Relay × N
Backend × N
Executor × N
```

Redis and PostgreSQL become shared infrastructure.

---

# ADR-023: Keep AI Keys on the Server

## Status

Accepted

## Context

AI provider credentials are sensitive.

Putting an AI API key into React would expose it to every browser user.

## Decision

The browser calls the Spring backend.

The backend calls the AI provider.

```text
Browser
   ↓
Spring Boot
   ↓
AI Provider
```

## Benefit

The API key remains server-side.

---

# ADR-024: Use Environment-Based Secrets

## Status

Accepted

## Context

The application contains sensitive credentials.

Examples:

```text
Database password
JWT secret
AI key
R2 secret
Execution key
```

Committing these into Git creates a permanent security risk.

## Decision

Keep secrets outside source control.

Local development uses local environment configuration.

Production uses server-side configuration.

The repository should contain examples such as:

```text
.env.example
application-example.properties
```

but never real credentials.

---

# ADR-025: Use a Polyglot Architecture

## Status

Accepted

## Context

The system uses both Java and Node.js.

Some architectures attempt to standardize everything on one language.

## Decision

Use different technologies when the workload justifies them.

```text
Spring Boot
    ↓
Business logic / persistence

Node.js
    ↓
Real-time communication / execution
```

## Reasoning

Technology consistency is useful, but workload consistency is more important.

The project intentionally demonstrates that a production system can combine multiple runtimes behind clear interfaces.

---

# ADR-026: Failure Isolation Is More Important Than Maximum Simplicity

## Status

Accepted

A major architectural principle of CodeRoom is:

> A failure in one workload should not automatically become a failure in every workload.

Examples:

### Executor failure

Should not destroy:

```text
Authentication
Interview dashboard
Question bank
```

### Relay failure

Should not destroy:

```text
PostgreSQL
Interview records
Authentication
```

### AI provider failure

Should not destroy:

```text
Core interview functionality
```

### Redis failure

Should not convert Redis into a permanent source of truth.

This is why the system has explicit boundaries.

---

# ADR-027: Optimize for Interview Room Size

## Status

Accepted

The architecture is not designed for:

```text
10,000 people in one room
```

It is designed for:

```text
Candidate
+
small interviewer panel
```

This changes important decisions.

For example:

* WebRTC mesh is reasonable.
* Socket.io room broadcasting is reasonable.
* One VM can support early deployment.
* Redis can handle transient room state.
* Dedicated media infrastructure is unnecessary initially.

The architecture should evolve when actual usage demands it.

---

# ADR-028: Optimize for Cost Efficiency

## Status

Accepted

The project intentionally uses managed/free or low-cost infrastructure where possible.

The objective is:

```text
Production-like architecture
+
Low infrastructure cost
```

rather than:

```text
Maximum infrastructure
regardless of workload
```

Current philosophy:

```text
Small VM
+
Managed PostgreSQL
+
Managed Redis
+
Object Storage
+
Free DNS
+
Free TLS
```

This provides a strong development and demonstration environment without requiring a large monthly infrastructure bill.

---

# 3. Architectural Tradeoffs

No architecture is free of tradeoffs.

## Microservices vs Monolith

### Chosen

Specialized services.

### Benefit

Isolation and clearer responsibilities.

### Cost

Operational complexity.

---

## Redis vs PostgreSQL for Live State

### Chosen

Redis.

### Benefit

Low latency and reduced database writes.

### Cost

Transient state can disappear.

Therefore PostgreSQL remains authoritative.

---

## WebRTC Mesh vs SFU

### Chosen

Mesh.

### Benefit

Very low infrastructure cost.

### Cost

Poor scaling with participant count.

### Future

Use an SFU when rooms become larger.

---

## Docker vs Native Execution

### Chosen

Docker.

### Benefit

Isolation.

### Cost

Container startup overhead.

Security wins.

---

## Same VM vs Distributed Deployment

### Chosen

Same VM.

### Benefit

Simple and cheap.

### Cost

Single-machine failure domain.

The service architecture is intentionally kept ready for future horizontal deployment.

---

# 4. Scaling Roadmap

## Stage 1 — Current

```text
Single VM

Nginx
Spring Boot
Node Relay
Executor
```

---

## Stage 2 — Moderate Growth

```text
Nginx
   │
   ├── Backend × 2
   ├── Relay × 2
   └── Executor × 2

Redis
PostgreSQL
R2
```

---

## Stage 3 — High Traffic

```text
Load Balancer
      │
 ┌────┼────┐
 ▼    ▼    ▼
API  API  API

 ┌────┼────┐
 ▼    ▼    ▼
WS   WS   WS
 │    │    │
 └────┼────┘
      ▼
    Redis

Execution Queue
      │
 ┌────┼────────┐
 ▼    ▼        ▼
Exec Exec     Exec
```

---

# 5. What Would Change at Scale?

## WebRTC

Move from:

```text
Mesh
```

to:

```text
SFU
```

---

## Relay

Move from:

```text
Single process
```

to:

```text
Multiple relay instances
+
Redis adapter
```

---

## Executor

Move from:

```text
Executor on application VM
```

to:

```text
Dedicated execution worker fleet
```

---

## Backend

Move from:

```text
Single Spring Boot instance
```

to:

```text
Multiple stateless instances
```

behind a load balancer.

---

## Database

Introduce:

* Connection pooling
* Read replicas
* Better indexing
* Partitioning
* Dedicated database resources

---

# 6. Final Architectural Principle

The most important architectural principle behind CodeRoom is:

> **Use the simplest architecture that preserves the correct boundaries.**

The project does not attempt to introduce distributed infrastructure merely for the sake of complexity.

Instead:

```text
Transactional workload
        ↓
Spring Boot + PostgreSQL

Real-time workload
        ↓
Node.js + Socket.io + Redis

Untrusted workload
        ↓
Docker Executor

Media workload
        ↓
WebRTC

Large binary workload
        ↓
Object Storage

Public traffic
        ↓
Nginx + HTTPS
```

Each component has a clear responsibility.

That is the central architectural idea behind CodeRoom.
