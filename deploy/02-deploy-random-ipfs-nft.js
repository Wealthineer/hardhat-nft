const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const {
    storeImages,
    storeTokenUriMetadata,
} = require("../utils/uploadToPinata")
const imagesLocation = "./images/randomipfs"
const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: {
        trait_type: "Cuteness",
        value: 100,
    },
}
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("500")

    let dogTokenUris = [
        "ipfs://QmRzdmeJVtNSxMHhapapGtzK2Zx1fvNtdsdG8iCbKXQNk3",
        "ipfs://QmPQ1wAYKEH3uthVzPv4jBkDx3fxQk4BSH5ExwsmLefEP7",
        "ipfs://QmWxabhYN1jqGjqaWcfVjEcCuJoEZ7eUctfo6528rxYhJW",
    ]

    if (process.env.UPLOAD_TO_PINATA == "true") {
        dogTokenUris = await handleTokenUris()
    }

    const MINT_FEE = ethers.utils.parseEther("0.02")

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const txResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResponse.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        )
    } else {
        vrfCoordinatorV2Address =
            networkConfig[chainId]["vrfCoordinatorV2Address"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        gasLane,
        callbackGasLimit,
        dogTokenUris,
        MINT_FEE,
    ]

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args, //put price feed address
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (chainId == 31337) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.address)
    }

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        verify(randomIpfsNft.address, args)
    }

    log("-----------------------------------------------------------------")
}

async function handleTokenUris() {
    tokenUris = []
    const { responses: imageUploadResponses, files } = await storeImages(
        imagesLocation
    )

    console.log("Images stored")
    for (imageUploadResponseIndex in imageUploadResponses) {
        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(
            ".png",
            ""
        )
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name} ...`)
        const metadataUploadResponse = await storeTokenUriMetadata(
            tokenUriMetadata
        )
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs Uploaded! They are:")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
