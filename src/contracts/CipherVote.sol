// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CipherVote {

    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        bool isAnonymous;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        bool revealed;
        bool exists;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, string title, address indexed proposer, bool isAnonymous, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event ResultsRevealed(uint256 indexed proposalId);

    modifier proposalExists(uint256 _id) {
        require(proposals[_id].exists, "Proposal does not exist");
        _;
    }

    function createProposal(string memory _title, string memory _description, bool _isAnonymous, uint256 _durationHours) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_durationHours > 0 && _durationHours <= 720, "Duration must be 1-720 hours");
        uint256 id = proposalCount;
        proposalCount++;
        proposals[id] = Proposal({
            id: id, title: _title, description: _description,
            proposer: _isAnonymous ? address(0) : msg.sender,
            isAnonymous: _isAnonymous, startTime: block.timestamp,
            endTime: block.timestamp + (_durationHours * 1 hours),
            yesVotes: 0, noVotes: 0, revealed: false, exists: true
        });
        emit ProposalCreated(id, _title, msg.sender, _isAnonymous, proposals[id].endTime);
        return id;
    }

    function castVote(uint256 _proposalId, bool _voteYes) external proposalExists(_proposalId) {
        require(block.timestamp < proposals[_proposalId].endTime, "Voting has ended");
        require(!hasVoted[_proposalId][msg.sender], "Already voted");
        if (_voteYes) { proposals[_proposalId].yesVotes++; }
        else { proposals[_proposalId].noVotes++; }
        hasVoted[_proposalId][msg.sender] = true;
        emit VoteCast(_proposalId, msg.sender);
    }

    function revealResults(uint256 _proposalId) external proposalExists(_proposalId) {
        require(block.timestamp >= proposals[_proposalId].endTime, "Voting still active");
        require(!proposals[_proposalId].revealed, "Already revealed");
        proposals[_proposalId].revealed = true;
        emit ResultsRevealed(_proposalId);
    }

    function getProposalInfo(uint256 _id) external view proposalExists(_id) returns (string memory title, string memory description, address proposer, bool isAnonymous, uint256 startTime, uint256 endTime) {
        Proposal storage p = proposals[_id];
        return (p.title, p.description, p.isAnonymous ? address(0) : p.proposer, p.isAnonymous, p.startTime, p.endTime);
    }

    function getProposalVotes(uint256 _id) external view proposalExists(_id) returns (uint256 yesVotes, uint256 noVotes, bool revealed, bool votingOpen, bool userHasVoted) {
        Proposal storage p = proposals[_id];
        bool showVotes = p.revealed || block.timestamp >= p.endTime;
        return (showVotes ? p.yesVotes : 0, showVotes ? p.noVotes : 0, p.revealed, block.timestamp < p.endTime, hasVoted[_id][msg.sender]);
    }

    function getProposalCount() external view returns (uint256) { return proposalCount; }
    function hasUserVoted(uint256 _proposalId, address _user) external view returns (bool) { return hasVoted[_proposalId][_user]; }
}
