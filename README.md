# CipherVote — Confidential DAO Governance

> **Vote privately. Stay anonymous.** — Confidential DAO governance powered by Zama FHE Protocol on Ethereum Sepolia.

🌐 **Live App:** https://ciphervote-frontend.vercel.app  
📄 **Contract:** [0xB33daEdb61223A4C0bFAcde9F0bD5359771F246e](https://sepolia.etherscan.io/address/0xB33daEdb61223A4C0bFAcde9F0bD5359771F246e)  
🔗 **Network:** Ethereum Sepolia Testnet

---

## What is CipherVote?

CipherVote is a confidential DAO governance dApp built on top of the **Zama FHE Protocol**. It allows communities to create and vote on proposals with complete privacy — votes are encrypted on-chain, meaning nobody can see how any individual voted, not even the blockchain itself.

Traditional on-chain voting exposes every vote publicly. This creates problems:
- **Vote buying** — bad actors can pay voters knowing how they voted
- **Voter intimidation** — people vote differently when watched
- **Bandwagon effect** — seeing early results influences later voters

CipherVote solves all of this using **Fully Homomorphic Encryption (FHE)**.

---

## How It Works
User casts vote → Vote encrypted client-side → Encrypted vote stored on-chain
→ Voting period ends → Results revealed via FHE decryption → Final tally shown
1. **Connect Wallet** — Connect MetaMask on Sepolia testnet
2. **Create Proposal** — Submit publicly or anonymously (address hidden as 0x????...????)
3. **Cast Vote** — Vote Yes or No — stored encrypted on-chain
4. **Reveal Results** — After voting ends, anyone can trigger the reveal
5. **View Results** — Final vote counts shown with percentage bars

---

## Key Features

| Feature | Description |
|---|---|
| 🔒 **Encrypted Votes** | Votes hidden until voting period ends |
| 👤 **Anonymous Proposals** | Create proposals without revealing your identity |
| ⛓️ **On-chain Persistence** | Proposals never disappear — stored permanently on Sepolia |
| 🏛️ **DAO Governance** | Anyone can create proposals and vote |
| 📊 **Live Results** | Vote counts revealed after voting ends |
| 🌍 **Fully Decentralized** | No backend, no database — pure blockchain |
| 📱 **Mobile Friendly** | Works on mobile via MetaMask browser |
| 🔄 **Auto Refresh** | Proposals update every 30 seconds |

---

## Tech Stack

**Smart Contract**
- Solidity 0.8.24
- Zama FHEVM — Fully Homomorphic Encryption
- Deployed on Ethereum Sepolia Testnet
- Verified on Blockscout & Sourcify

**Frontend**
- React + Vite
- Ethers.js v6 — blockchain interaction
- Outfit + Space Mono fonts
- Deployed on Vercel

---

## Smart Contract

**Address:** `0xB33daEdb61223A4C0bFAcde9F0bD5359771F246e`  
**Network:** Sepolia (Chain ID: 11155111)

### Functions

```solidity
// Create a new proposal
createProposal(title, description, isAnonymous, durationHours)

// Cast an encrypted vote
castVote(proposalId, voteYes)

// Reveal results after voting ends
revealResults(proposalId)

// Read proposal info
getProposalInfo(id) → (title, description, proposer, isAnonymous, startTime, endTime)

// Read vote counts (hidden until revealed)
getProposalVotes(id) → (yesVotes, noVotes, revealed, votingOpen, userHasVoted)
```

---

## Running Locally

```bash
# Clone the repo
git clone https://github.com/Manablaq/ciphervote-frontend.git
cd ciphervote-frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

**Requirements:**
- MetaMask browser extension
- Sepolia testnet ETH (get free from sepoliafaucet.com)

---

## Zama FHE Integration

CipherVote uses **Zama's FHEVM** to ensure vote privacy:

- Votes are encrypted using FHE before being stored on-chain
- The smart contract performs computations on encrypted data
- Results are only decrypted after the voting period ends
- Even the contract owner cannot see individual votes

This is real-world privacy infrastructure — not just anonymity, but **mathematical privacy guarantees**.

---

## Submission Info

Built for the **Zama Protocol Builder Track**  
**Category:** Confidential dApp  
**Network:** Sepolia Testnet  
**Reward:** 7,000 cUSDT pool — 7 winners

---

## Screenshots

**Hero Section**
> Vote privately. Stay anonymous.

**Proposal Cards**
> Active proposals with encrypted vote counts, countdown timers, and stage tracking

**Anonymous Proposals**
> Submit governance proposals without revealing your wallet address

---

## License

MIT — built with ❤️ on Zama Protocol
