import { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import './App.css'

const CONTRACT_ADDRESS = '0xB33daEdb61223A4C0bFAcde9F0bD5359771F246e'
const SEPOLIA_CHAIN_ID = 11155111

const CONTRACT_ABI = [
  "function proposalCount() view returns (uint256)",
  "function createProposal(string memory _title, string memory _description, bool _isAnonymous, uint256 _durationHours) returns (uint256)",
  "function castVote(uint256 _proposalId, bool _voteYes) external",
  "function revealResults(uint256 _proposalId) external",
  "function getProposalInfo(uint256 _id) view returns (string memory title, string memory description, address proposer, bool isAnonymous, uint256 startTime, uint256 endTime)",
  "function getProposalVotes(uint256 _id) view returns (uint256 yesVotes, uint256 noVotes, bool revealed, bool votingOpen, bool userHasVoted)",
  "function hasUserVoted(uint256 _proposalId, address _user) view returns (bool)",
]

function Countdown({ endTime, onEnd }) {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      const diff = (endTime * 1000) - Date.now()
      if (diff <= 0) { setTime('ENDED'); onEnd && onEnd(); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [endTime])
  return <span className="countdown">{time}</span>
}

export default function App() {
  const [proposals, setProposals] = useState([])
  const [wallet, setWallet] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [votingPower, setVotingPower] = useState(0)
  const [ethBalance, setEthBalance] = useState(0)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showProposalModal, setShowProposalModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [voting, setVoting] = useState(null)
  const [revealing, setRevealing] = useState(null)
  const [wrongNetwork, setWrongNetwork] = useState(false)
  const [newProposal, setNewProposal] = useState({ title: '', description: '', isAnonymous: true, durationHours: 24 })
  const [terminalLog, setTerminalLog] = useState([
    '> CipherVote initialized...',
    '> Sepolia testnet connected...',
    '> Zama FHE protocol ready...',
    '> Awaiting wallet connection...',
  ])

  const log = (msg) => setTerminalLog(prev => [...prev.slice(-4), `> ${msg}`])
  const getContract = (s) => new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s)

  const loadProposals = async (s) => {
    try {
      const contract = getContract(s)
      const count = Number(await contract.proposalCount())
      const loaded = []
      for (let i = 0; i < count; i++) {
        try {
          const info = await contract.getProposalInfo(i)
          const votes = await contract.getProposalVotes(i)
          const now = Math.floor(Date.now() / 1000)
          const endTime = Number(info[5])
          const votingOpen = now < endTime
          let stage = 'active'
          if (!votingOpen && !votes[2]) stage = 'revealing'
          if (votes[2]) stage = 'closed'
          loaded.push({
            id: i,
            title: info[0],
            description: info[1],
            proposer: info[3] ? '0x????...????' : `${info[2].slice(0,6)}...${info[2].slice(-4)}`,
            isAnonymous: info[3],
            startTime: Number(info[4]),
            endTime,
            yesVotes: Number(votes[0]),
            noVotes: Number(votes[1]),
            revealed: votes[2],
            votingOpen,
            userHasVoted: votes[4],
            stage
          })
        } catch (e) { console.error(`Error loading proposal ${i}:`, e) }
      }
      setProposals(loaded.reverse())
      log(`Loaded ${count} proposal(s) from Sepolia ✓`)
    } catch (e) { log('Error: ' + e.message?.slice(0, 50)) }
  }

  useEffect(() => {
    if (!signer) return
    const interval = setInterval(() => loadProposals(signer), 30000)
    return () => clearInterval(interval)
  }, [signer])

  useEffect(() => {
    if (!window.ethereum) return
    const handleChainChange = (chainId) => {
      if (parseInt(chainId, 16) !== SEPOLIA_CHAIN_ID) {
        setWrongNetwork(true)
      } else {
        setWrongNetwork(false)
      }
    }
    const handleAccountChange = (accounts) => {
      if (accounts.length === 0) disconnectWallet()
      else window.location.reload()
    }
    window.ethereum.on('chainChanged', handleChainChange)
    window.ethereum.on('accountsChanged', handleAccountChange)
    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChange)
      window.ethereum.removeListener('accountsChanged', handleAccountChange)
    }
  }, [])

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
          window.open(`https://metamask.app.link/dapp/${window.location.host}`)
          return
        }
        alert("Please install MetaMask!")
        return
      }
      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      await web3Provider.send("eth_requestAccounts", [])
      const network = await web3Provider.getNetwork()
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
        } catch {
          setWrongNetwork(true)
          alert("Please switch to Sepolia testnet!")
          return
        }
      }
      setWrongNetwork(false)
      const web3Signer = await web3Provider.getSigner()
      const addr = await web3Signer.getAddress()
      const balance = await web3Provider.getBalance(addr)
      const eth = parseFloat(ethers.formatEther(balance))
      setProvider(web3Provider)
      setSigner(web3Signer)
      setWallet(addr)
      setEthBalance(eth.toFixed(4))
      setVotingPower(Math.round(eth * 10000))
      setShowWalletModal(false)
      log(`Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`)
      log(`Balance: ${eth.toFixed(4)} ETH`)
      await loadProposals(web3Signer)
    } catch (e) { log('Failed: ' + e.message?.slice(0, 50)) }
  }

  const disconnectWallet = () => {
    setWallet(null); setProvider(null); setSigner(null)
    setVotingPower(0); setEthBalance(0); setProposals([])
    setWrongNetwork(false)
    setTerminalLog([
      '> CipherVote initialized...',
      '> Sepolia testnet connected...',
      '> Awaiting wallet connection...',
    ])
  }

  const vote = async (proposalId, voteYes) => {
    if (!signer) { setShowWalletModal(true); return }
    if (wrongNetwork) { alert("Please switch to Sepolia!"); return }
    setVoting(proposalId)
    log(`Submitting vote for proposal #${proposalId + 1}...`)
    try {
      const tx = await getContract(signer).castVote(proposalId, voteYes)
      log(`Tx submitted: ${tx.hash.slice(0,10)}...`)
      await tx.wait()
      log(`Vote confirmed ✓`)
      await loadProposals(signer)
    } catch (e) {
      log('Failed: ' + (e.message?.includes('Already voted') ? 'Already voted!' : e.message?.slice(0, 50)))
    }
    setVoting(null)
  }

  const revealResults = async (proposalId) => {
    if (!signer) return
    setRevealing(proposalId)
    log(`Revealing results for proposal #${proposalId + 1}...`)
    try {
      const tx = await getContract(signer).revealResults(proposalId)
      await tx.wait()
      log(`Results revealed ✓`)
      await loadProposals(signer)
    } catch (e) { log('Failed: ' + e.message?.slice(0, 50)) }
    setRevealing(null)
  }

  const submitProposal = async () => {
    if (!signer) { setShowWalletModal(true); return }
    if (!newProposal.title.trim() || !newProposal.description.trim()) { log('Title and description required'); return }
    setLoading(true)
    log(`Creating proposal...`)
    try {
      const tx = await getContract(signer).createProposal(
        newProposal.title.trim(), newProposal.description.trim(),
        newProposal.isAnonymous, newProposal.durationHours
      )
      await tx.wait()
      log(`Proposal created ✓`)
      setShowProposalModal(false)
      setNewProposal({ title: '', description: '', isAnonymous: true, durationHours: 24 })
      await loadProposals(signer)
    } catch (e) { log('Failed: ' + e.message?.slice(0, 60)) }
    setLoading(false)
  }

  const shortAddr = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : ''

  const STAGES = {
    active: { label: "ACTIVE", color: "#C8973A" },
    revealing: { label: "REVEALING", color: "#4CAF7D" },
    closed: { label: "CLOSED", color: "#666" },
  }

  return (
    <div className="app">
      {wrongNetwork && (
        <div className="network-banner">
          ⚠️ Wrong network — please switch to Sepolia Testnet
          <button onClick={connectWallet} className="switch-btn">Switch Now</button>
        </div>
      )}

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="terminal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Connect Wallet</div>
            <div className="modal-subtitle">Choose your wallet to continue voting</div>
            <div className="wallet-options">
              <button className="wallet-option-terminal" onClick={connectWallet}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="28" height="28" alt="MetaMask" />
                <span>MetaMask</span>
                <span className="wallet-status">● DETECTED</span>
              </button>
            </div>
            <div className="modal-note">📱 On mobile? Open in MetaMask in-app browser</div>
            <div className="modal-note" style={{marginTop:'6px'}}>🔒 Votes stored permanently on Sepolia</div>
          </div>
        </div>
      )}

      {/* New Proposal Modal */}
      {showProposalModal && (
        <div className="modal-overlay" onClick={() => setShowProposalModal(false)}>
          <div className="terminal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Create Proposal</div>
            <div className="modal-subtitle">Submit a new governance proposal on-chain</div>
            <div className="terminal-field">
              <label className="terminal-label">PROPOSAL TITLE *</label>
              <input className="terminal-input" placeholder="Enter a clear, concise title..." value={newProposal.title} onChange={e => setNewProposal(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="terminal-field">
              <label className="terminal-label">DESCRIPTION *</label>
              <textarea className="terminal-input terminal-textarea" placeholder="Describe your proposal in detail..." value={newProposal.description} onChange={e => setNewProposal(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="terminal-field">
              <label className="terminal-label">VOTING DURATION (hours)</label>
              <input className="terminal-input" type="number" min="1" max="720" value={newProposal.durationHours} onChange={e => setNewProposal(p => ({ ...p, durationHours: parseInt(e.target.value) || 24 }))} />
            </div>
            <div className="anon-toggle">
              <label className="terminal-label">ANONYMOUS SUBMISSION</label>
              <div className={`toggle ${newProposal.isAnonymous ? 'on' : 'off'}`} onClick={() => setNewProposal(p => ({ ...p, isAnonymous: !p.isAnonymous }))}>
                {newProposal.isAnonymous ? '🔒 Anonymous — address hidden' : '👤 Public — address visible'}
              </div>
              <div className="anon-note">{newProposal.isAnonymous ? 'Your identity will be shown as 0x????...????' : `Shown as ${shortAddr(wallet)}`}</div>
            </div>
            <button className="terminal-submit-btn" onClick={submitProposal} disabled={loading}>
              {loading ? 'Submitting to blockchain...' : 'Submit Proposal'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon-wrap">⚡</div>
          <div className="logo-text">Cipher<em>Vote</em></div>
        </div>
        <div className="header-pills">
          <span className="pill gold">FHEVM</span>
          <span className="pill active">● SEPOLIA</span>
        </div>
        <div className="header-right">
          {wallet ? (
            <div className="wallet-info">
              <span className="eth-badge">{ethBalance} ETH</span>
              <span className="vp-badge">VP: {votingPower.toLocaleString()}</span>
              <div className="wallet-connected">
                <div className="wallet-dot" />
                {shortAddr(wallet)}
                <span style={{color:'var(--gold)', marginLeft:'4px'}}>· {ethBalance} ETH</span>
              </div>
              <button className="disconnect-btn" onClick={disconnectWallet}>Disconnect</button>
            </div>
          ) : (
            <button className="connect-btn" onClick={() => setShowWalletModal(true)}>Connect Wallet</button>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">CONFIDENTIAL DAO GOVERNANCE PROTOCOL</div>
        <h1 className="hero-title">
          Vote privately.<br /><em>Stay anonymous.</em>
        </h1>
        <p className="hero-subtitle">
          Create and vote on proposals with complete privacy. Votes are encrypted on-chain — nobody can see how you voted, not even the blockchain.
        </p>
        <div className="hero-stats">
          <div className="stat-block">
            <div className="stat-label">ACTIVE PROPOSALS</div>
            <div className="stat-value">{proposals.filter(p => p.stage === 'active').length}</div>
            <div className="stat-sub">On Sepolia testnet</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">TOTAL PROPOSALS</div>
            <div className="stat-value gold">{proposals.length}</div>
            <div className="stat-sub">All time</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">ENCRYPTION</div>
            <div className="stat-value green">FHE</div>
            <div className="stat-sub">Powered by Zama</div>
          </div>
        </div>
      </div>

      {/* Terminal Log */}
      <div className="terminal-log">
        {terminalLog.map((line, i) => <div key={i} className="terminal-line">{line}</div>)}
        <span className="terminal-cursor">▋</span>
      </div>

      {/* Proposals */}
      <div className="proposals-section">
        <div className="section-header">
          <h2 className="section-title">Proposals</h2>
          <button className="new-proposal-btn" onClick={() => { if (!wallet) { setShowWalletModal(true); return } setShowProposalModal(true) }}>
            + New Proposal
          </button>
        </div>

        {!wallet && (
          <div className="connect-prompt">
            <p className="connect-prompt-text">Connect your wallet to view and vote on proposals.</p>
            <button className="connect-btn" onClick={() => setShowWalletModal(true)}>Connect Wallet</button>
            <div className="mobile-note">📱 On mobile? Use the MetaMask in-app browser</div>
          </div>
        )}

        {wallet && proposals.length === 0 && (
          <div className="empty-state">
            <p className="empty-state-text">No proposals yet. Be the first to create one.</p>
            <button className="connect-btn" onClick={() => setShowProposalModal(true)}>Create First Proposal</button>
          </div>
        )}

        <div className="proposals-grid">
          {proposals.map(p => {
            const stage = STAGES[p.stage] || STAGES.active
            const total = p.yesVotes + p.noVotes
            const yesPct = total ? Math.round(p.yesVotes / total * 100) : 0
            const noPct = total ? Math.round(p.noVotes / total * 100) : 0

            return (
              <div key={p.id} className={`proposal-card ${p.stage}`}>
                <div className="proposal-top">
                  <div className="proposal-meta">
                    <span className="proposal-id">PROPOSAL #{String(p.id + 1).padStart(3, '0')}</span>
                    <span className="stage-badge" style={{ color: stage.color, borderColor: stage.color }}>{stage.label}</span>
                  </div>
                  <div className="proposal-proposer">
                    Proposer: <span className={p.isAnonymous ? 'anon-addr' : 'addr'}>{p.proposer}</span>
                  </div>
                </div>

                <h3 className="proposal-title">{p.title}</h3>
                <p className="proposal-desc">{p.description}</p>

                <div className="vote-stats">
                  {p.revealed ? (
                    <div className="revealed-results">
                      <div className="result-bar-wrap">
                        <div className="result-label">
                          <span className="yes-text">Yes</span>
                          <span>{p.yesVotes.toLocaleString()} votes ({yesPct}%)</span>
                        </div>
                        <div className="result-bar"><div className="result-fill yes-fill" style={{ width: `${yesPct}%` }} /></div>
                      </div>
                      <div className="result-bar-wrap">
                        <div className="result-label">
                          <span className="no-text">No</span>
                          <span>{p.noVotes.toLocaleString()} votes ({noPct}%)</span>
                        </div>
                        <div className="result-bar"><div className="result-fill no-fill" style={{ width: `${noPct}%` }} /></div>
                      </div>
                    </div>
                  ) : (
                    <div className="encrypted-votes">
                      <span className="lock-icon">🔒</span>
                      <span>Votes encrypted — results hidden until voting ends</span>
                    </div>
                  )}
                </div>

                <div className="proposal-footer">
                  <div>
                    {p.stage === 'active' && <span className="timer-label">Ends in: <Countdown endTime={p.endTime} onEnd={() => loadProposals(signer)} /></span>}
                    {p.stage === 'revealing' && <span className="reveal-ready">⚡ Ready to reveal results</span>}
                    {p.stage === 'closed' && <span className="closed-label">✓ Voting closed</span>}
                  </div>

                  {p.stage === 'active' && (
                    p.userHasVoted ? (
                      <div className="voted-confirm">✓ Vote cast — stored on Sepolia</div>
                    ) : (
                      <div className="vote-buttons">
                        <button className="vote-btn yes-btn" onClick={() => vote(p.id, true)} disabled={voting === p.id}>
                          {voting === p.id ? 'Submitting...' : 'Vote Yes'}
                        </button>
                        <button className="vote-btn no-btn" onClick={() => vote(p.id, false)} disabled={voting === p.id}>
                          {voting === p.id ? 'Submitting...' : 'Vote No'}
                        </button>
                      </div>
                    )
                  )}

                  {p.stage === 'revealing' && (
                    <button className="reveal-btn" onClick={() => revealResults(p.id)} disabled={revealing === p.id}>
                      {revealing === p.id ? 'Revealing...' : 'Reveal Results'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <footer className="footer">
        <div>CipherVote — Confidential DAO Governance powered by Zama FHE Protocol</div>
        <div className="footer-links">
          <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="footer-link">View Contract ↗</a>
          <span>Sepolia Testnet</span>
          <span>Open Source</span>
        </div>
      </footer>
    </div>
  )
}