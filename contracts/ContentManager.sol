// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";

abstract contract ContentManager is BasePlatform {
    // wallet => content token Ids
    mapping(address => uint[]) ownedContents;
    // address => fee
    mapping(address => uint) coachingFee;

    function buyContent(uint tokenId) external {
        /// @notice allows KYCed users to purchase a content
        /// @param tokenId id of the token that will be bought
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(
            isTokenBought[msg.sender][tokenId] == false,
            "Content Already Bought"
        );
        uint contentPrice = udaoc.getPriceContent(tokenId);
        foundationBalance += (contentPrice * contentFoundationCut) / 100000;
        governanceBalance += (contentPrice * contentGovernancenCut) / 100000;
        validatorBalance += (contentPrice * validatorBalance) / 100000;
        jurorBalance += (contentPrice * contentJurorCut) / 100000;
        contentBalance[udaoc.ownerOf(tokenId)] +=
            contentPrice -
            ((contentPrice * contentFoundationCut) / 100000) -
            ((contentPrice * contentGovernancenCut) / 100000) -
            ((contentPrice * validatorBalance) / 100000) -
            ((contentPrice * contentGovernancenCut) / 100000);
        udao.transferFrom(msg.sender, address(this), contentPrice);
        isTokenBought[msg.sender][tokenId] = true;
        ownedContents[msg.sender].push(tokenId);
    }

    function buyCoaching(address _coach) external {
        /// @notice Allows users to buy coaching service.
        /// @param _coach The address of the coach that a user want to buy service from
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(!ikyc.getBan(_coach), "Coach is banned");

        foundationBalance +=
            (coachingFee[_coach] * coachingFoundationCut) /
            100000;
        governanceBalance +=
            (coachingFee[_coach] * coachingGovernancenCut) /
            100000;
        udao.transferFrom(msg.sender, address(this), coachingFee[_coach]);
    }

    function setCoachingFee(uint _coachingFee) external {
        /// @notice Allows coaches to set their coaching fee.
        /// @param _coachingFee The new coaching fee.
        coachingFee[msg.sender] = _coachingFee;
    }

    function withdrawCoach() external {
        /// @dev Allows coaches to withdraw individually.
        udao.transfer(msg.sender, coachBalance[msg.sender]);
    }
}
