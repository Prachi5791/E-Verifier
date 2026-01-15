async function main() {
  const DocumentVerificationV2 = await ethers.getContractFactory(
    "DocumentVerificationV2"
  );
  const contract = await DocumentVerificationV2.deploy();

  await contract.waitForDeployment();

  console.log("DocumentVerificationV2 deployed to:", contract.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
