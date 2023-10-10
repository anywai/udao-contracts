// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../RoleNames.sol";
import "../interfaces/IRoleManager.sol";
import "../ContractManager.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract VoucherVerifier is EIP712, RoleNames {
    string private constant SIGNING_DOMAIN = "TreasuryVouchers";
    string private constant SIGNATURE_VERSION = "1";

    IRoleManager roleManager;
    ContractManager public contractManager;

    constructor(
        address contractManagerAddress,
        address rmAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        roleManager = IRoleManager(rmAddress);
        contractManager = ContractManager(contractManagerAddress);
    }

    /// @notice struct to hold content discount voucher information
    /// @param tokenId id of the content
    /// @param fullContentPurchase is full content purchased
    /// @param purchasedParts parts of the content purchased
    /// @param priceToPay price to pay
    /// @param validUntil date until the voucher is valid
    /// @param redeemer address of the redeemer
    /// @param giftReceiver address of the gift receiver if purchase is a gift
    /// @param signature the EIP-712 signature of all other fields in the ContentDiscountVoucher struct.
    struct ContentDiscountVoucher {
        uint256 tokenId;
        bool fullContentPurchase;
        uint256[] purchasedParts;
        uint256 priceToPay;
        uint256 validUntil;
        address redeemer;
        address giftReceiver;
        bytes signature;
    }
    /// @notice Represents a refund voucher for a coaching
    struct RefundVoucher {
        uint256 saleID;
        address instructor;
        uint256[] finalParts;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice struct to hold coaching voucher information
    struct CoachingVoucher {
        address coach;
        uint256 priceToPay;
        uint256 coachingDate;
        address learner;
        bytes signature;
    }

    /// @notice Returns a hash of the given ContentDiscountVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentDiscountVoucher to hash.
    function _hashDiscountVoucher(
        ContentDiscountVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ContentDiscountVoucher(uint256 tokenId,bool fullContentPurchase,uint256[] purchasedParts,uint256 priceToPay,uint256 validUntil,address redeemer,address giftReceiver)"
                        ),
                        voucher.tokenId,
                        voucher.fullContentPurchase,
                        keccak256(abi.encodePacked(voucher.purchasedParts)),
                        voucher.priceToPay,
                        voucher.validUntil,
                        voucher.redeemer,
                        voucher.giftReceiver
                    )
                )
            );
    }

    /// @notice Returns a hash of the given RefundVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A RefundVoucher to hash.
    function _hashRefundVoucher(
        RefundVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "RefundVoucher(uint256 saleID,address instructor,uint256[] finalParts,uint256 validUntil)"
                        ),
                        voucher.saleID,
                        voucher.instructor,
                        keccak256(abi.encodePacked(voucher.finalParts)),
                        voucher.validUntil
                    )
                )
            );
    }

    /// @notice Returns a hash of the given CoachingVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A CoachingVoucher to hash.
    function _hashCoachingVoucher(
        CoachingVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "CoachingVoucher(address coach,uint256 priceToPay,uint256 coachingDate,address learner)"
                        ),
                        voucher.coach,
                        voucher.priceToPay,
                        voucher.coachingDate,
                        voucher.learner
                    )
                )
            );
    }

    /// @notice Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A ContentDiscountVoucher describing a content access rights.
    function verifyDiscountVoucher(
        ContentDiscountVoucher calldata voucher
    ) external view {
        bytes32 digest = _hashDiscountVoucher(voucher);

        // make sure signature is valid and get the address of the signer
        address signer = ECDSA.recover(digest, voucher.signature);
        require(
            roleManager.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
    }

    /// @notice Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A ContentDiscountVoucher describing a content access rights.
    function verifyRefundVoucher(RefundVoucher calldata voucher) external view {
        bytes32 digest = _hashRefundVoucher(voucher);
        address signer = ECDSA.recover(digest, voucher.signature);
        require(
            roleManager.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
    }

    /// @notice Verifies the signature for a given CoachingVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A CoachingVoucher describing a content access rights.
    function verifyCoachingVoucher(
        CoachingVoucher calldata voucher
    ) external view {
        bytes32 digest = _hashCoachingVoucher(voucher);
        address signer = ECDSA.recover(digest, voucher.signature);
        require(signer == voucher.coach, "Signature invalid or unauthorized");
    }
}