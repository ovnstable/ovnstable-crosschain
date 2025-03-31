// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../contracts/interfaces/IRemoteHub.sol";
import "../../contracts/interfaces/IRoleManager.sol";

contract MockRemoteHub is IRemoteHub {
    IXusdToken public xusdToken;
    IWrappedXusdToken public wxusdToken;
    IExchange public exchangeContract;
    IRoleManager public roleManager;
    address public ccipPoolAddress;
    IPayoutManager public payoutManagerAddress;
    constructor(address _xusdToken, address _wxusdToken, address _exchange, address _roleManager) {
        xusdToken = IXusdToken(_xusdToken);
        wxusdToken = IWrappedXusdToken(_wxusdToken);
        exchangeContract = IExchange(_exchange);
        roleManager = IRoleManager(_roleManager);
    }

    function setCCIPPool(address _ccipPool) external {
        ccipPoolAddress = _ccipPool;
    }

    function setPayoutManager(address _payoutManager) external {
        payoutManagerAddress = IPayoutManager(_payoutManager);
    }

    function xusd() external view override returns (IXusdToken) {
        return xusdToken;
    }

    function wxusd() external view override returns (IWrappedXusdToken) {
        return wxusdToken;
    }

    function exchange() external view override returns (IExchange) {
        return exchangeContract;
    }

    function execMultiPayout(uint256 newDelta) external payable override {}

    function chainSelector() external view override returns (uint64) {}

    function getChainItemById(uint64 key) external view override returns (ChainItem memory) {}

    function ccipPool() external view override returns (address) {
        return ccipPoolAddress;
    }

    function payoutManager() external view override returns (IPayoutManager) {
        return payoutManagerAddress;
    }

    function remoteHub() external view override returns (IRemoteHub) {}

    function remoteHubUpgrader() external view override returns (IRemoteHubUpgrader) {}

    function market() external view override returns (IMarket) {}
} 