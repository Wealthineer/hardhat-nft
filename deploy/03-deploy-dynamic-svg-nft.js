const { network, ethers } = require("hardhat")
const { developmentChains, DECIMALS, INITIAL_ANSWER, networkConfig } = require("../helper-hardhat-config")
const fs = require("fs")

const BASE_FEE = ethers.utils.parseEther("0.25") //LINK it costs per request
const GAS_PRICE_LINK = 1e9 //link per gas // calculated value based on the gas price of the chain

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let ethUsdPriceFeedAddress

    if(developmentChains.includes(network.name)) {
        const EthUsdAggregator = await ethers.getContract("MockV3Aggregator")
        ethUsdPriceFeedAddress = EthUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }

    const lowSVG = await fs.readFileSync("./images/dynamicNft/frown.svg", {encoding: "utf8"})
    const highSVG = await fs.readFileSync("./images/dynamicNft/happy.svg", {encoding: "utf8"})

    args = [ethUsdPriceFeedAddress, lowSVG, highSVG]
    const dynamicSvgNft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        verify(dynamicSvgNft.address, args)
    }

    log("-----------------------------------------------------------------")

}

module.exports.tags = ["all", "dynamicsvg", "main"]