// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./RoleController.sol";
import "./IUDAOC.sol";

contract ValidationManager is RoleController, EIP712 {
    string private constant SIGNING_DOMAIN = "ValidationSetter";
    string private constant SIGNATURE_VERSION = "1";

    // UDAO (ERC721) Token interface
    IUDAOC udaoc;

    constructor(address udaocAddress, address irmAddress)
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        RoleController(irmAddress)
    {
        udaoc = IUDAOC(udaocAddress);
    }

    struct ValidationVoucher {
        /// @notice The id of the token to record validation status.
        uint256 tokenId;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice Addresses of the validators
        address[] validators;
        /// @notice Scores validators earned from this validation
        uint256[] validationScore;
        /// @notice Final verdict of the validation process
        bool isValidated;
        /// @notice the EIP-712 signature of all other fields in the ValidationVoucher struct.
        bytes signature;
    }

    event ValidationEnded(uint256 tokenId, bool result);
    event NextRound(uint256 newRoundId);

    // tokenId => if a content validated or not
    mapping(uint256 => bool) public isValidated;
    // validator => round => score
    mapping(address => mapping(uint256 => uint256))
        public validatorScorePerRound;

    /// TODO Bu next round jurorlarınkiyle aynı değil mi?
    /// Tek bir next roundla her ikisini yeni rounda geçiremez miyiz?
    /// Ve tek bir "distributionRound" değişkeni olamaz mı?

    /// CEVAP: Zaten tek fonksiyon ile çağrılıyor (PlatformTreasury içinden) ama round ilerletme daha 
    /// az çağırılacak bundan dolayı external call sayısını azaltmak için juror ve validator içine ayrı
    /// round bilgisi ekledim 
    uint256 public distributionRound;

    /// @dev is used during the calculation of a validator score
    uint256 public totalSuccessfulValidationScore;

    /// @notice Allows to set the address of content contract address
    /// TODO Check if every "set" contract address has the same role requirement
    function setUDAOC(address udaocAddress) external onlyRole(FOUNDATION_ROLE) {
        udaoc = IUDAOC(udaocAddress);
    }

    /// @notice Writes validation result to blockchain
    /// @param voucher voucher that contains the signed validation data
    function setAsValidated(ValidationVoucher calldata voucher) external whenNotPaused{
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        require(udaoc.exists(voucher.tokenId), "ERC721: invalid token ID");
        isValidated[voucher.tokenId] = voucher.isValidated;
        _recordScores(voucher.validators, voucher.validationScore);

        emit ValidationEnded(voucher.tokenId, true);
    }

    /// @notice Records the scores of validators for a specific validation work
    /// @param _validators Validator address of whom did the validation work
    /// @param _validationScores Scores of the validators 
    function _recordScores(
        address[] calldata _validators,
        uint256[] calldata _validationScores
    ) internal {
        uint256 totalValidators = _validators.length;

        /// @dev loop validators and record their scores
        for (uint256 i; i < totalValidators; i++) {
            validatorScorePerRound[_validators[i]][
                distributionRound
            ] += _validationScores[i];
            totalSuccessfulValidationScore += _validationScores[i];
        }
    }

    /// @notice Returns the score of a validator for a specific round
    /// @param _validator The address of the validator
    /// @param _round Reward round ID
    function getValidatorScore(address _validator, uint256 _round)
        external
        view
        returns (uint256)
    {
        return validatorScorePerRound[_validator][_round];
    }

    /// @notice Returns total successful validation count and is used for reward calculation
    function getTotalValidationScore() external view returns (uint256) {
        return totalSuccessfulValidationScore;
    }

    /// @notice Returns if a content is validated or not. Used as a check before service purchases
    function getIsValidated(uint256 tokenId) external view returns (bool) {
        return isValidated[tokenId];
    }

    /// @notice Starts the new reward round
    function nextRound() external whenNotPaused onlyRole(TREASURY_CONTRACT) {
        distributionRound++;
        emit NextRound(distributionRound);
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hash(ValidationVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ValidationVoucher(uint256 tokenId,uint256 validUntil,address[] validators,uint256[] validationScore,bool isValidated)"
                        ),
                        voucher.tokenId,
                        voucher.validUntil,
                        keccak256(abi.encodePacked(voucher.validators)),
                        keccak256(abi.encodePacked(voucher.validationScore)),
                        voucher.isValidated
                    )
                )
            );
    }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    /// @notice Verifies the signature for a given ContentVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A ContentVoucher describing an unminted NFT.
    function _verify(ValidationVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
