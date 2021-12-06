import { task, types } from "hardhat/config";
import { AddressZero } from "@ethersproject/constants";
import { getAddress } from "@ethersproject/address";
import { calculateProxyAddress } from "@gnosis.pm/safe-contracts";
import { safeSingleton, proxyFactory, safeL2Singleton } from "./contracts";

const parseSigners = (rawSigners: string): string[] => {
    return rawSigners.split(",").map(address => getAddress(address))
}

task("create", "Create a Safe")
    .addFlag("l2", "Should use version of the Safe contract that is more event heave")
    .addFlag("buildOnly", "Indicate wether this transaction should only be logged and not submitted on-chain")
    .addParam("signers", "Comma separated list of signer addresses (dafault is the address of linked account)", "", types.string, true)
    .addParam("threshold", "Threshold that should be used", 1, types.int, true)
    .addParam("fallback", "Fallback handler address", AddressZero, types.string, true)
    .addParam("nonce", "Nonce used with factory", new Date().getTime(), types.int, true)
    .addParam("singleton", "Set to overwrite which singleton address to use", "", types.string, true)
    .addParam("factory", "Set to overwrite which factory address to use", "", types.string, true)
    .setAction(async (taskArgs, hre) => {
        const singleton = taskArgs.l2 ? await safeL2Singleton(hre, taskArgs.singleton) : await safeSingleton(hre, taskArgs.singleton)
        const factory = await proxyFactory(hre, taskArgs.factory)
        const signers: string[] = taskArgs.signers ? parseSigners(taskArgs.signers) : [(await hre.getNamedAccounts()).deployer]
        const fallbackHandler = getAddress(taskArgs.fallback)
        const setupData = singleton.interface.encodeFunctionData(
            "setup",
            [signers, taskArgs.threshold, AddressZero, "0x", fallbackHandler, AddressZero, 0, AddressZero]
        )
        const predictedAddress = await calculateProxyAddress(factory, singleton.address, setupData, taskArgs.nonce)
        console.log(`Deploy Safe to ${predictedAddress}`)
        console.log(`Singleton: ${singleton.address}`)
        console.log(`Setup data: ${setupData}`)
        console.log(`Nonce: ${taskArgs.nonce}`)
        console.log(`To (factory): ${factory.address}`)
        console.log(`Data: ${factory.interface.encodeFunctionData("createProxyWithNonce", [singleton.address, setupData, taskArgs.nonce])}`)
        if (!taskArgs.buildOnly)
            await factory.createProxyWithNonce(singleton.address, setupData, taskArgs.nonce).then((tx: any) => tx.wait())
        // TODO verify deployment
    });

export { }