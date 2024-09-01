// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./IXusdToken.sol";
import "./IExchange.sol";
import "./IPayoutManager.sol";
import "./IRoleManager.sol";
import "./IRemoteHub.sol";
import "./IRemoteHubUpgrader.sol";

import "./IWrappedXusdToken.sol";
import "./IMarket.sol";

struct ChainItem {
    uint64 chainSelector;
    address xusd;
    address exchange;
    address payoutManager;
    address roleManager;
    address remoteHub;
    address remoteHubUpgrader;
    address market;
    address wxusd;
    address ccipPool;
}

interface IRemoteHub {

    function execMultiPayout(uint256 newDelta) payable external;

    function chainSelector() external view returns(uint64);

    function getChainItemById(uint64 key) external view returns(ChainItem memory);

    function ccipPool() external view returns(address);

    function xusd() external view returns(IXusdToken);

    function exchange() external view returns(IExchange);

    function payoutManager() external view returns(IPayoutManager);

    function roleManager() external view returns(IRoleManager);

    function remoteHub() external view returns(IRemoteHub);

    function remoteHubUpgrader() external view returns(IRemoteHubUpgrader);

    function wxusd() external view returns(IWrappedXusdToken);

    function market() external view returns(IMarket);
}
