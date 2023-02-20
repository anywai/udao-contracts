const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyMinter } = require("../lib/LazyMinter");
const { LazyRole } = require("../lib/LazyRole");
const { LazyValidation } = require("../lib/LazyValidation");
const { LazyUDAOCertMinter } = require("../lib/LazyUDAOCertMinter");
const { LazyPurchase } = require("../lib/LazyPurchase");
const { LazyCoaching } = require("../lib/LazyCoaching");
const { utils } = require("ethers");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

async function deploy() {
  const [
    backend,
    contentCreator,
    contentBuyer,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember,
  ] = await ethers.getSigners();

  // FACTORIES
  let factoryRoleManager = await ethers.getContractFactory("RoleManager");
  let factoryUDAOVp = await ethers.getContractFactory("UDAOVp");
  let factoryUDAOTimelockController = await ethers.getContractFactory(
    "UDAOTimelockController"
  );
  let factoryUDAOCertificate = await ethers.getContractFactory(
    "UDAOCertificate"
  );
  let factoryUDAO = await ethers.getContractFactory("UDAO");
  let factoryUDAOStaker = await ethers.getContractFactory("UDAOStaker");
  let factoryValidationManager = await ethers.getContractFactory(
    "ValidationManager"
  );
  let factoryJurorManager = await ethers.getContractFactory("JurorManager");
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  let factoryPlatformTreasury = await ethers.getContractFactory(
    "PlatformTreasury"
  );
  let factoryUDAOGovernor = await ethers.getContractFactory("UDAOGovernor");
  let factoryContractManager = await ethers.getContractFactory(
    "ContractManager"
  );

  //DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();
  const contractRoleManager = await factoryRoleManager.deploy();
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(
    contractRoleManager.address
  );
  const contractUDAOContent = await factoryUDAOContent.deploy(
    contractRoleManager.address
  );
  const contractValidationManager = await factoryValidationManager.deploy(
    contractUDAOContent.address,
    contractRoleManager.address
  );
  const contractJurorManager = await factoryJurorManager.deploy(
    contractRoleManager.address
  );
  const contractContractManager = await factoryContractManager.deploy(
    contractValidationManager.address,
    contractJurorManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractRoleManager.address
  );

  const contractUDAOVp = await factoryUDAOVp.deploy(
    contractRoleManager.address,
    contractContractManager.address
  );
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractContractManager.address,
    contractRoleManager.address
  );

  const contractUDAOStaker = await factoryUDAOStaker.deploy(
    contractPlatformTreasury.address,
    contractRoleManager.address,
    contractUDAOVp.address,
    contractContractManager.address
  );
  const contractUDAOTimelockController =
    await factoryUDAOTimelockController.deploy(1, [], [foundation.address]);
  const contractUDAOGovernor = await factoryUDAOGovernor.deploy(
    contractUDAOVp.address,
    contractUDAOTimelockController.address,
    contractUDAOStaker.address,
    contractRoleManager.address
  );
  //POST DEPLOYMENT
  // add proposer
  const PROPOSER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("PROPOSER_ROLE")
  );
  await contractUDAOTimelockController.grantRole(
    PROPOSER_ROLE,
    contractUDAOGovernor.address
  );

  // grant roles
  const BACKEND_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("BACKEND_ROLE")
  );
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  const FOUNDATION_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("FOUNDATION_ROLE")
  );

  await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  const STAKING_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("STAKING_CONTRACT")
  );
  await contractRoleManager.grantRole(
    STAKING_CONTRACT,
    contractUDAOStaker.address
  );
  const GOVERNANCE_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE")
  );
  await contractRoleManager.grantRole(
    GOVERNANCE_ROLE,
    contractUDAOTimelockController.address
  );
  const VALIDATION_MANAGER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATION_MANAGER")
  );
  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  await contractRoleManager.grantRole(
    VALIDATION_MANAGER,
    contractValidationManager.address
  );
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);
  // add missing contract addresses to the contract manager
  await contractContractManager
    .connect(backend)
    .setAddressStaking(contractUDAOStaker.address);
  await contractContractManager
    .connect(backend)
    .setPlatformTreasuryAddress(contractPlatformTreasury.address);
  await contractContractManager
    .connect(backend)
    .setAddressUdaoVp(contractUDAOVp.address);

  await contractValidationManager
    .connect(foundation)
    .setStaker(contractUDAOStaker.address);
  // add staking contract to udao-vp
  await contractUDAOVp.connect(backend).updateAddresses();

  return {
    backend,
    contentCreator,
    contentBuyer,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember,
    contractUDAO,
    contractRoleManager,
    contractUDAOCertificate,
    contractUDAOContent,
    contractValidationManager,
    contractPlatformTreasury,
    contractUDAOVp,
    contractUDAOStaker,
    contractUDAOTimelockController,
    contractUDAOGovernor,
  };
}

describe("Platform Treasury Contract - Coaching", function () {
  it("Should a user able to buy a coaching", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];
    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
  });

  it("Should return coaching list of token", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
      contentBuyer.address,
    ]);
    expect(
      (await contractPlatformTreasury.getCoachings(1)).toString()
    ).to.be.eql("0,1");
  });

  it("Should fail to buy a coaching if coaching is not enabled", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      false,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Coaching is not enabled for this content");
  });

  it("Should fail to buy coaching if content does not exists", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      3,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Content does not exist!");
  });

  it("Should fail to buy coaching if content is not validated yet", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Content is not validated yet");
  });

  it("Should fail to buy coaching if buyer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    /// Set BAN
    await contractRoleManager.setBan(contentBuyer.address, true);

    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("You are banned");
  });

  it("Should fail to buy coaching if instructer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    /// Set BAN
    await contractRoleManager.setBan(contentCreator.address, true);

    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Instructor is banned");
  });

  it("Should fail to buy coaching if instructer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    /// Set KYC to false
    await contractRoleManager.setKYC(contentCreator.address, false);

    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Instructor is not KYCed");
  });

  it("Should fail to buy coaching if buyer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Set BAN
    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await contractRoleManager.setKYC(contentBuyer.address, false);

    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should finalize coaching as learner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);

    await contractPlatformTreasury.connect(contentBuyer).finalizeCoaching(0);
    expect(
      await contractPlatformTreasury.instructorBalance(contentCreator.address)
    ).to.be.eql(ethers.utils.parseEther("1.906"));
  });

  it("Should finalize coaching as instructor when deadline met", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await network.provider.send("evm_increaseTime", [999999999]);
    await network.provider.send("evm_mine");
    await contractPlatformTreasury.connect(contentCreator).finalizeCoaching(0);
    expect(
      await contractPlatformTreasury.instructorBalance(contentCreator.address)
    ).to.be.eql(ethers.utils.parseEther("1.906"));
  });

  it("Should fail coaching as instructor if deadline is not met", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);

    await expect(
      contractPlatformTreasury.connect(contentCreator).finalizeCoaching(0)
    ).to.revertedWith("Deadline is not met yet");
  });

  it("Should fail to finalize coaching if neither learner or instructor", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);

    await expect(
      contractPlatformTreasury.connect(foundation).finalizeCoaching(0)
    ).to.be.revertedWith("You are not learner neither coach");
  });

  it("Should fail to finalize coaching if coaching does not exist", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);

    await expect(
      contractPlatformTreasury.connect(contentBuyer).finalizeCoaching(1)
    ).to.be.revertedWith("Coaching id doesn't exist");
  });

  it("Should delay coaching deadline if learner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await network.provider.send("evm_increaseTime", [60 * 60 * 24 * 29]);
    await network.provider.send("evm_mine"); //
    await expect(
      contractPlatformTreasury.connect(contentBuyer).delayDeadline(0)
    )
      .to.emit(contractPlatformTreasury, "DeadlineDelayed")
      .withArgs(0, parseInt(timestamp) + 37 * 24 * 60 * 60);
  });

  it("Should delay coaching deadline if coach", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await network.provider.send("evm_increaseTime", [60 * 60 * 24 * 29]);
    await network.provider.send("evm_mine"); //
    await expect(
      contractPlatformTreasury.connect(contentCreator).delayDeadline(0)
    )
      .to.emit(contractPlatformTreasury, "DeadlineDelayed")
      .withArgs(0, parseInt(timestamp) + 37 * 24 * 60 * 60);
  });

  it("Should fail to delay coaching deadline if not last 3 days", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(
      contractPlatformTreasury.connect(contentCreator).delayDeadline(0)
    ).to.revertedWith("Only can be delayed in last 3 days");
  });

  it("Should fail to delay coaching deadline if sender is neither coach nor learner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(
      contractPlatformTreasury.connect(jurorMember).delayDeadline(0)
    ).to.revertedWith("You are neither coach nor learner");
  });

  it("Should force payment for coaching", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(contractPlatformTreasury.connect(foundation).forcedPayment(0))
      .to.emit(contractPlatformTreasury, "ForcedPayment")
      .withArgs(0, contentCreator.address);
  });

  it("Should fail force payment for coaching if not admin role", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(
      contractPlatformTreasury.connect(validator1).forcedPayment(0)
    ).to.revertedWith(
      "AccessControl: account " +
        validator1.address.toLowerCase() +
        " is missing role"
    );
  });

  it("Should refund payment for coaching", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(contractPlatformTreasury.connect(contentCreator).refund(0))
      .to.emit(contractPlatformTreasury, "Refund")
      .withArgs(0, contentBuyer.address, ethers.utils.parseEther("2"));
  });

  it("Should fail to refund payment for coaching if not coach", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(
      contractPlatformTreasury.connect(contentBuyer).refund(0)
    ).to.revertedWith("Your are not the coach");
  });

  it("Should refund payment for coaching as admin", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(
      contractPlatformTreasury.connect(foundation).forcedRefundAdmin(0)
    )
      .to.emit(contractPlatformTreasury, "Refund")
      .withArgs(0, contentBuyer.address, ethers.utils.parseEther("2"));
  });

  it("Should fail refund payment for coaching as admin if not admin", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      true,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(
      contractPlatformTreasury.connect(validator1).forcedRefundAdmin(0)
    ).to.revertedWith(
      "AccessControl: account " +
        validator1.address.toLowerCase() +
        " is missing role"
    );
  });

  it("Should fail refund payment for coaching as admin if not refundable", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(0, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(0, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(0),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(0)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(0), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const coaching_voucher = [
      1,
      ethers.utils.parseEther("2"),
      false,
      contentBuyer.address,
    ];

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await expect(
      contractPlatformTreasury.connect(foundation).forcedRefundAdmin(0)
    ).to.revertedWith("Coaching is not refundable");
  });
});
