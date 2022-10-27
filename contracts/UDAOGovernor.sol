// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

import "./RoleController.sol";

interface IUDAOStaker {
    function addProposalRewards(uint _amount, address proposer) external;
}

contract UDAOGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl,
    RoleController
{
    mapping(uint => address) public proposer;
    IUDAOStaker stakingContract;
    uint proposerReward;

    constructor(
        IVotes _token,
        TimelockController _timelock,
        address stakingContractAddress,
        uint _proposerReward,
        address irmAddress
    )
        Governor("UDAOGovernor")
        GovernorSettings(
            1, /* 1 block */
            45818, /* 1 week */
            0
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)
        GovernorTimelockControl(_timelock)
        RoleController(irmAddress)
    {
        stakingContract = IUDAOStaker(stakingContractAddress);
        proposerReward = _proposerReward;
    }

    function setProposerReward(uint _proposerReward)
        external
        onlyRoles(administrator_roles)
    {
        proposerReward = _proposerReward;
    }

    function setStakingContract(address stakingContractAddress)
        external
        onlyRoles(administrator_roles)
    {
        stakingContract = IUDAOStaker(stakingContractAddress);
    }

    // The following functions are overrides required by Solidity.

    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256) {
        uint proposalId = super.propose(
            targets,
            values,
            calldatas,
            description
        );
        proposer[proposalId] = _msgSender();
        return proposalId;
    }

    function queue(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public virtual override(GovernorTimelockControl) returns (uint256) {
        uint proposalId = super.queue(
            targets,
            values,
            calldatas,
            descriptionHash
        );
        stakingContract.addProposalRewards(
            proposerReward,
            proposer[proposalId]
        );
        return proposalId;
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
