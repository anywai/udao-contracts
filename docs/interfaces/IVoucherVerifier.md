# Solidity API

## IVoucherVerifier

### ContentDiscountVoucher

```solidity
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
```
#### Parameters

| Name                 | Type     | Description                                                   |
| -------------------- | -------- | ------------------------------------------------------------- |
| tokenId              | uint256  | ID of the content.                                             |
| fullContentPurchase  | bool     | Indicates whether the full content has been purchased.        |
| purchasedParts       | uint256[]| Array of parts of the content that have been purchased.        |
| priceToPay           | uint256  | The price to pay for the content.                              |
| validUntil           | uint256  | The date until the voucher is valid.                           |
| redeemer             | address  | The address of the redeemer.                                   |
| giftReceiver         | address  | The address of the gift receiver if the purchase is a gift.   |
| signature            | bytes    | The EIP-712 signature of all other fields in the struct.      |

### RefundVoucher

```solidity
struct RefundVoucher {
  uint256 saleID;
  address instructor;
  uint256[] finalParts;
  uint256[] finalContents;
  uint256 validUntil;
  bytes signature;
}
```
#### Parameters

| Name             | Type      | Description                                                   |
| ---------------- | --------- | ------------------------------------------------------------- |
| saleID           | uint256   | ID of the sale to be refunded.                                 |
| instructor       | address   | The address of the instructor.                                 |
| finalParts       | uint256[] | Parts that will remain in the learner's wallet after refund.   |
| finalContents    | address[] | Contents that will remain in the learner's wallet after refund.|
| validUntil       | uint256   | The date until the voucher is valid.                           |
| signature        | bytes     | The EIP-712 signature of all other fields in the struct.      |

### CoachingVoucher

```solidity
struct CoachingVoucher {
  address coach;
  uint256 priceToPay;
  uint256 coachingDate;
  address learner;
  bytes signature;
}
```
#### Parameters

| Name          | Type     | Description                                       |
| ------------- | -------- | ------------------------------------------------- |
| coach         | address  | The address of the coach.                         |
| priceToPay    | uint256  | The price to pay for the coaching.                |
| coachingDate  | uint256  | The date of the coaching session.                 |
| learner       | address  | The address of the learner.                       |
| signature     | bytes    | The EIP-712 signature of all other fields in the struct. |


### verifyDiscountVoucher

```solidity
function verifyDiscountVoucher(struct IVoucherVerifier.ContentDiscountVoucher voucher) external view
```

### verifyRefundVoucher

```solidity
function verifyRefundVoucher(struct IVoucherVerifier.RefundVoucher voucher) external view
```

### verifyCoachingVoucher

```solidity
function verifyCoachingVoucher(struct IVoucherVerifier.CoachingVoucher voucher) external view
```

