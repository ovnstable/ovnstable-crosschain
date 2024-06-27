// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract CCIPSender_UnsafeNoToken {
    address router;

    constructor(address _router) {
        router = _router;
    }

    function send(
        address receiver,
        string memory someText,
        uint64 destinationChainSelector
    ) external payable returns (bytes32 messageId) {
        
        console.log("address(this).balance", address(this).balance);


        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: abi.encode(someText),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: address(0)
        });

        uint256 fees = IRouterClient(router).getFee(destinationChainSelector, message);
        console.log("fees", fees);

        if (fees > address(this).balance) {
            revert ("not enought");
        }

        messageId = IRouterClient(router).ccipSend{value: fees}(
            destinationChainSelector,
            message
        );
    }
}
