# DocVerfy - Blockchain-Based Document Verification System

A comprehensive document verification platform that leverages blockchain technology, IPFS, and role-based access control to provide secure, transparent, and tamper-proof document verification and management.

# Developer
Prachi Maruti Patil
Student · Developer · Vidyalankar Institute of Technology, Mumbai

## 🎯 Project Overview

DocVerfy is a full-stack application designed to streamline document verification processes by:

- **Secure Document Storage**: Documents are stored on IPFS with blockchain-backed verification
- **Role-Based Access Control**: Three user roles (Uploader, Verifier, Admin) with distinct capabilities
- **Blockchain Integration**: Smart contracts ensure document authenticity and immutability
- **QR Code Support**: Generate and scan QR codes for easy document verification
- **NFT Storage**: Integration with NFT.storage for decentralized storage
- **Email Notifications**: Automated email alerts for verification requests and status updates

## 📋 System Architecture

The project consists of three main components:

### 1. **Client** (React Frontend)

- Modern React 19 application with React Router for navigation
- Role-based dashboards for Uploaders, Verifiers, and Admins
- QR code generation and scanning capabilities
- Blockchain interaction via Ethers.js

### 2. **Server** (Node.js/Express Backend)

- Express.js REST API with MongoDB for data persistence
- Authentication via JWT and role-based authorization
- IPFS integration for document storage
- Ethereum blockchain interaction for document verification
- Email service for notifications

### 3. **Smart Contracts** (Hardhat + Solidity)

- `DocumentVerificationV2.sol`: Main contract with role-based access control
- Uses OpenZeppelin's AccessControlEnumerable for secure role management
- Manages document roots, versions, and verification status
- Events for document creation, version addition, and revocation

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DocVerfy System Architecture                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         HTTP/REST          ┌──────────────────────┐
│   React Frontend     │◄────────────────────────────►│   Express Backend   │
│   (Port 3000)        │      with JWT Token         │   (Port 5000)        │
│                      │                             │                      │
│  • Login Page        │                             │  • Auth Routes       │
│  • Dashboards        │         WebSocket           │  • Document Routes   │
│  • QR Generation     │      (Optional)             │  • Verification API  │
│  • QR Scanning       │                             │  • Email Service     │
│  • Document Mgmt     │                             │  • IPFS Integration  │
└──────────────────────┘                             └──────────────────────┘
         │                                                     │
         │ Contract ABIs &                                     │ MongoDB
         │ Direct Contract Calls                              │ Connection
         │ (Ethers.js v6)                                     │
         │                                        ┌────────────▼────────────┐
         │                                        │   MongoDB Database      │
         │                                        │                         │
         │                                        │  • Users               │
         │                                        │  • Documents Metadata  │
         │                                        │  • Verification Data   │
         │                                        │  • Requests            │
         │                                        └────────────────────────┘
         │
         │ Web3 Calls (Port 8545)
         │
         └────────────────────────────────┬──────────────────────────────┐
                                          │                              │
                         ┌────────────────▼────────────────┐             │
                         │   Ethereum Network (Ganache)   │             │
                         │                                │             │
                         │  ┌──────────────────────────┐  │             │
                         │  │ DocumentVerificationV2   │  │             │
                         │  │ Smart Contract           │  │             │
                         │  │                          │  │             │
                         │  │ • Document Roots         │  │             │
                         │  │ • Versions & Hashes      │  │             │
                         │  │ • Verification Status    │  │             │
                         │  │ • Role-Based Access      │  │             │
                         │  └──────────────────────────┘  │             │
                         │                                │             │
                         └────────────────┬───────────────┘             │
                                          │                             │
        ┌─────────────────────────────────┴──────────────────────┐     │
        │                                                        │     │
        ▼                                                        ▼     │
┌────────────────────┐                              ┌──────────────────┐
│  IPFS Network      │                              │ NFT.storage      │
│  (Document Store)  │                              │ (Alternative)    │
│                    │                              │                  │
│ • File Content     │                              │ • Pinned Files   │
│ • Content Hash     │                              │ • Backup Storage │
│ • Distributed      │                              │ • NFT Metadata   │
└────────────────────┘                              └──────────────────┘
```

## 📊 Data Flow Diagram

```
                    DOCUMENT UPLOAD FLOW
                    ═══════════════════

┌────────────┐
│   User     │  1. Select & Upload File
│  (Browser) │
└──────┬─────┘
       │
       ▼
┌──────────────────────────────────────┐
│  React Client                        │
│  • Hash Document (SHA-256)           │
│  • Validate File                     │
│  • Generate QR Code                  │
└──────┬───────────────────────────────┘
       │ 2. POST /doc/upload + File Data
       ▼
┌──────────────────────────────────────┐
│  Express Server                      │
│  • Verify JWT Token                  │
│  • Authenticate User Role            │
│  • Store Metadata in MongoDB         │
└──────┬───────────────────────────────┘
       │
       ├─────────────────────┬──────────────────────┐
       │                     │                      │
       │ 3. Upload to IPFS   │ 4. Store in DB       │ 5. Blockchain
       ▼                     ▼                      ▼
   ┌────────┐           ┌────────┐          ┌──────────────┐
   │ IPFS   │           │MongoDB │          │ Smart        │
   │ Get CID│           │ Save   │          │ Contract     │
   └────────┘           │ Metadata           │ uploadDoc()  │
       │                └────────┘           └──────────────┘
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  6. Confirmation    │
                  │  Sent to Client     │
                  └─────────────────────┘


              DOCUMENT VERIFICATION FLOW
              ════════════════════════════

┌────────────┐
│  Uploader  │  1. Request Verification
│            │
└──────┬─────┘
       │
       ▼
┌──────────────────────────────────────┐
│  React Client                        │
│  • Request Verifier Assignment       │
│  • Submit via Form                   │
└──────┬───────────────────────────────┘
       │ 2. POST /doc/request-verifier
       ▼
┌──────────────────────────────────────┐
│  Express Server                      │
│  • Create Verification Request       │
│  • Store in MongoDB                  │
│  • Send Email Notification           │
└──────┬───────────────────────────────┘
       │
       ▼
   ┌─────────────────────────────────────┐
   │  3. Verifier Receives Email         │
   │  & Sees Request in Dashboard        │
   └──────┬──────────────────────────────┘
          │
          │ 4. Scan QR Code / View Document
          ▼
   ┌──────────────────────────────────────┐
   │  React Client (Verifier)             │
   │  • Display Document Details          │
   │  • Show IPFS Content                 │
   │  • Verification Interface            │
   └──────┬───────────────────────────────┘
          │
          │ 5. POST /doc/verify + Approval
          ▼
   ┌──────────────────────────────────────┐
   │  Express Server                      │
   │  • Validate Verifier Role            │
   │  • Update MongoDB                    │
   │  • Call Smart Contract               │
   └──────┬───────────────────────────────┘
          │
          ├─────────────────┬──────────────────┐
          │                 │                  │
          │ Blockchain Tx   │ Database Update  │ Email Notification
          ▼                 ▼                  ▼
   ┌────────────┐    ┌────────────┐    ┌────────────────┐
   │Smart       │    │ MongoDB    │    │ Nodemailer     │
   │Contract    │    │ Update     │    │ Notify Users   │
   │verifyVersion       │            │ of Status      │
   └────────────┘    └────────────┘    └────────────────┘
```

## 🔄 User Workflow Diagrams

### Uploader Workflow

```
                         UPLOADER JOURNEY
                    ════════════════════════

                          ┌─────────────┐
                          │   START     │
                          └──────┬──────┘
                                 │
                          ┌──────▼──────┐
                          │ Login/Sign  │
                          │ Up          │
                          └──────┬──────┘
                                 │
                     ┌───────────┴─────────────┐
                     │                         │
                     ▼                         ▼
            ┌─────────────────┐      ┌──────────────────┐
            │ Upload          │      │ View My Uploads  │
            │ Document        │      │ & Status         │
            └────────┬────────┘      └──────────────────┘
                     │
            ┌────────▼────────┐
            │ Generate QR     │
            │ Code            │
            └────────┬────────┘
                     │
            ┌────────▼────────────────┐
            │ Request Verifier        │
            │ (Pending Verification)  │
            └────────┬────────────────┘
                     │
            ┌────────▼──────────────────┐
            │ Scan QR to Verify         │
            │ Document Status           │
            └────────┬──────────────────┘
                     │
                ┌────▴───────────────┐
                │                    │
                ▼                    ▼
        ┌─────────────────┐  ┌─────────────────┐
        │ VERIFIED ✓      │  │ NOT VERIFIED    │
        └─────────────────┘  └────────┬────────┘
                                      │
                            ┌─────────▼─────────┐
                            │ Wait or Request   │
                            │ Another Verifier  │
                            └───────────────────┘
```

### Verifier Workflow

```
                         VERIFIER JOURNEY
                    ════════════════════════

                          ┌─────────────┐
                          │   START     │
                          └──────┬──────┘
                                 │
                          ┌──────▼──────┐
                          │ Login       │
                          └──────┬──────┘
                                 │
                     ┌───────────┴─────────────┐
                     │                         │
                     ▼                         ▼
            ┌─────────────────┐      ┌──────────────────┐
            │ View Pending    │      │ Scan Documents   │
            │ Verification    │      │ (QR Code)        │
            │ Requests        │      └──────────────────┘
            └────────┬────────┘
                     │
            ┌────────▼──────────────┐
            │ Click on Request      │
            │ View Document Details │
            └────────┬──────────────┘
                     │
            ┌────────▼──────────────────┐
            │ Review Document from      │
            │ IPFS                      │
            └────────┬──────────────────┘
                     │
                ┌────▴───────────────┐
                │                    │
                ▼                    ▼
        ┌──────────────┐     ┌──────────────┐
        │ Approve      │     │ Reject       │
        │ Document     │     │ Document     │
        └──────┬───────┘     └──────┬───────┘
               │                    │
               └────────┬───────────┘
                        │
                ┌───────▼────────┐
                │ Transaction to │
                │ Blockchain     │
                │ (Immutable)    │
                └───────┬────────┘
                        │
                ┌───────▼────────────┐
                │ Email Notification │
                │ Sent to Uploader   │
                └────────────────────┘
```

### Admin Workflow

```
                          ADMIN JOURNEY
                    ════════════════════════

                          ┌─────────────┐
                          │   START     │
                          └──────┬──────┘
                                 │
                          ┌──────▼──────┐
                          │ Admin Login │
                          └──────┬──────┘
                                 │
                 ┌───────────────┼──────────────────┐
                 │               │                  │
                 ▼               ▼                  ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Manage All   │ │ Revoke Docs  │ │ View Reports │
        │ Documents    │ │              │ │ & Analytics  │
        └──────────────┘ └──────┬───────┘ └──────────────┘
                                 │
                        ┌────────▼────────┐
                        │ Select Doc      │
                        │ to Revoke       │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────────┐
                        │ Provide Reason      │
                        │ for Revocation      │
                        └────────┬────────────┘
                                 │
                        ┌────────▼────────────┐
                        │ Submit Revocation   │
                        │ (Blockchain)       │
                        └────────┬────────────┘
                                 │
                        ┌────────▼────────────┐
                        │ Email Notifications │
                        │ to All Parties      │
                        └─────────────────────┘
```

## 🛠️ Tech Stack

### Frontend

- **React 19**: UI framework
- **React Router v7**: Client-side routing
- **Ethers.js v6**: Blockchain interaction
- **Axios**: HTTP client
- **QR Code**: `qrcode.react` and `react-qr-reader` for QR functionality
- **JWT**: `jwt-decode` for token management

### Backend

- **Express.js v5**: Web framework
- **MongoDB**: Database (via Mongoose)
- **Ethers.js v6**: Blockchain interaction
- **IPFS Client**: `ipfs-http-client` for decentralized storage
- **NFT.storage**: Alternative IPFS storage
- **Nodemailer**: Email notifications
- **JWT**: Authentication
- **bcryptjs**: Password hashing

### Smart Contracts

- **Solidity ^0.8.28**: Smart contract language
- **Hardhat**: Development framework
- **OpenZeppelin**: Secure contract libraries
- **Chai**: Testing framework

## 📁 Project Structure

```
doc-verfy/
├── client/                 # React frontend application
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (dashboards, login)
│   │   ├── context/       # React Context (AuthContext)
│   │   ├── utils/         # Utility functions and routing
│   │   ├── contracts/     # ABI files for smart contracts
│   │   └── App.js         # Main application component
│   └── package.json
│
├── server/                # Node.js backend
│   ├── routes/           # API endpoint definitions
│   ├── middleware/       # Authentication and request processing
│   ├── model/            # MongoDB schemas
│   ├── utils/            # Helper functions (IPFS, Ethereum, Email)
│   ├── index.js          # Application entry point
│   └── package.json
│
└── hardhat/              # Smart contract development
    ├── contracts/        # Solidity smart contracts
    ├── scripts/          # Deployment scripts
    ├── test/             # Contract tests
    ├── artifacts/        # Compiled contract artifacts
    ├── hardhat.config.cjs # Hardhat configuration
    └── package.json
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or higher
- **npm** or **yarn**
- **MongoDB** instance (local or cloud - MongoDB Atlas)
- **Ganache** or similar Ethereum local network (optional, for local blockchain testing)
- **IPFS** node or IPFS API key (for document storage)

### Installation

#### 1. Clone and Navigate to Project

```bash
cd doc-verfy
```

#### 2. Setup Smart Contracts (Hardhat)

```bash
cd hardhat

# Install dependencies
npm install

# Create .env file with:
# PRIVATE_KEY=your-wallet-private-key
# GANACHE_RPC_URL=http://localhost:8545
# ETHERSCAN_API_KEY=your-etherscan-key

# Compile contracts
npx hardhat compile

# Deploy to local Ganache network
npx hardhat run scripts/deploy.js --network ganache

# Run tests
npx hardhat test
```

#### 3. Setup Backend (Server)

```bash
cd server

# Install dependencies
npm install

# Create .env file with the following variables:
# MONGODB_URI
# PORT=5000
# JWT_SECRET=your-secret-key
# ETH_PROVIDER=http://localhost:8545
# CONTRACT_ADDRESS=0x...
# IPFS_API_KEY=your-ipfs-key
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
# NFT_STORAGE_KEY=your-nft-storage-key

npm start
# For development with auto-reload:
npm run dev
```

The server will run on `http://localhost:5000`

#### 4. Setup Frontend (Client)

```bash
cd client

# Install dependencies with legacy peer deps flag
npm install -legacy-peer-deps

# Create .env file with:
# REACT_APP_API_URL=http://localhost:5000
# REACT_APP_CONTRACT_ADDRESS=0x...
# REACT_APP_RPC_URL=http://localhost:8545

npm start
```

The client will run on `http://localhost:3000`

## 👥 User Roles

### 1. **Uploader**

- Upload documents to the system
- Generate QR codes for documents
- Scan QR codes to verify documents
- View personal uploads and their verification status
- Request verifiers for their documents

### 2. **Verifier**

- View pending verification requests
- Scan and verify documents
- Approve or reject documents
- Track verification history

### 3. **Admin**

- Manage all documents in the system
- Revoke documents if needed
- Manage user roles and permissions
- View system reports and analytics
- Handle disputes and system administration

## 🔑 Key Features

### Document Verification

- **Immutable Records**: Documents stored on blockchain and IPFS
- **Version Control**: Track multiple versions of documents
- **QR Code Integration**: Easy document identification and sharing
- **Expiry Management**: Set document expiration dates

### Security

- **Role-Based Access Control**: Three-tier permission system
- **Password Hashing**: Bcrypt for secure password storage
- **JWT Authentication**: Stateless authentication tokens
- **Blockchain Verification**: Cryptographic proof of authenticity

### Storage

- **IPFS Integration**: Decentralized file storage
- **NFT.storage**: Alternative IPFS provider support
- **MongoDB**: User data and metadata storage
- **Ethereum**: Document hash and status on-chain

## 📡 API Endpoints

### Authentication

- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Documents

- `POST /doc/upload` - Upload a document
- `GET /doc/:docId` - Get document details
- `GET /doc/` - List documents
- `POST /doc/verify` - Verify a document
- `DELETE /doc/:docId` - Revoke a document

### Verification Requests

- `POST /doc/request-verifier` - Create verification request
- `GET /doc/requests` - Get verification requests
- `PUT /doc/request/:id` - Update verification request

## 🔗 Smart Contract Functions

### Key Functions in DocumentVerificationV2.sol

- `uploadDocument()` - Upload a new document root
- `addVersion()` - Add a new version to a document
- `verifyVersion()` - Mark a version as verified
- `revokeRoot()` - Revoke a document (admin only)
- `getRootInfo()` - Get document root information
- `getVersionInfo()` - Get version information

## 🧪 Testing

### Run Smart Contract Tests

```bash
cd hardhat
npx hardhat test
```

### Run Frontend Tests

```bash
cd client
npm test
```

## 📦 Deployment

### Deploy Smart Contracts to Testnet

```bash
cd hardhat
npx hardhat run scripts/deploy.js --network sepolia
```

### Build Frontend for Production

```bash
cd client
npm run build
```

The optimized build will be in the `client/build/` directory.

## 🔒 Environment Variables

### Server (.env)

```
MONGODB_URI=
PORT=
JWT_SECRET=
ETH_PROVIDER=
CONTRACT_ADDRESS=
IPFS_API_KEY=
EMAIL_USER=
EMAIL_PASS=
NFT_STORAGE_KEY=
```

### Client (.env)

```
REACT_APP_API_URL=
REACT_APP_CONTRACT_ADDRESS=
REACT_APP_RPC_URL=
```

### Hardhat (.env)

```
PRIVATE_KEY=
GANACHE_RPC_URL=
ETHERSCAN_API_KEY=
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running locally or check connection string
- Verify network access if using MongoDB Atlas

### Contract Deployment Failures

- Check that Ganache/local network is running
- Verify account has sufficient funds
- Check contract address is correctly set in client

### IPFS Upload Failures

- Verify IPFS API key or local IPFS node is accessible
- Check file size limits
- Test connectivity to IPFS node
