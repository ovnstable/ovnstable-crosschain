// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.3/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/IRemoteHub.sol";
import "hardhat/console.sol";

contract RemoteHub is IRemoteHub, CCIPReceiver, Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    address public constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    struct MultichainCallItem {
        uint64 chainSelector;
        address receiver;
        address token;
        uint256 amount;
        DataCallItem[] batchData;
    }

    struct DataCallItem {
        address executor;
        bytes data;
    }

    // Mapping to keep track of allowlisted destination chains.
    mapping(uint64 => bool) public allowlistedDestinationChains;

    // Mapping to keep track of allowlisted source chains.
    mapping(uint64 => bool) public allowlistedSourceChains;

    // Mapping to keep track of allowlisted senders.
    mapping(address => bool) public allowlistedSenders;

    ChainItem[] public chainItems;
    mapping(uint64 => ChainItem) public chainItemById;
    mapping(uint64 => mapping(address => bool)) public allowlistedDestinationAddresses;
    uint64 public chainSelector;

    // ---  events

    // Event emitted when a message is sent to another chain.
    event MessageSent(
        bytes32 indexed messageId, // The unique ID of the CCIP message.
        uint64 indexed destinationChainSelector, // The chain selector of the destination chain.
        address receiver, // The address of the receiver on the destination chain.
        bytes data, // The text being sent.
        address token, // The token address that was transferred.
        uint256 tokenAmount, // The token amount that was transferred.
        address feeToken, // the token address used to pay CCIP fees.
        uint256 fees // The fees paid for sending the message.
    );

    // Event emitted when a message is received from another chain.
    event MessageReceived(
        bytes32 indexed messageId, // The unique ID of the CCIP message.
        uint64 indexed sourceChainSelector, // The chain selector of the source chain.
        address sender, // The address of the sender from the source chain.
        DataCallItem[] data, // The text that was received.
        address token, // The token address that was transferred.
        uint256 tokenAmount // The token amount that was transferred.
    );

    event CallExecuted(
        address indexed target,
        bool success,
        bytes data
    );

    // ---  errors

    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees); // Used to make sure contract has enough balance.
    error NothingToWithdraw(); // Used when trying to withdraw Ether but there's nothing to withdraw.
    error FailedToWithdrawEth(address owner, address target, uint256 value); // Used when the withdrawal of Ether fails.
    error DestinationChainNotAllowlisted(uint64 destinationChainSelector); // Used when the destination chain has not been allowlisted by the contract owner.
    error SourceChainNotAllowlisted(uint64 sourceChainSelector); // Used when the source chain has not been allowlisted by the contract owner.
    error SenderNotAllowlisted(address sender); // Used when the sender has not been allowlisted by the contract owner.
    error InvalidReceiverAddress(); // Used when the receiver address is 0.
    error ExecutorIsTheSameContract();

    // ---  initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _router) CCIPReceiver(_router) {}

    function initialize(uint64 _chainSelector) initializer public {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        chainSelector = _chainSelector;
    }

    function supportsInterface(bytes4 interfaceId) public pure override(CCIPReceiver, AccessControlUpgradeable) returns (bool) {
        return (interfaceId == type(IAccessControlUpgradeable).interfaceId) || 
               (interfaceId == type(IERC165Upgradeable).interfaceId) || 
               CCIPReceiver.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    // ---  remoteHub getters

    function ccipPool() public view returns(address) {
        return chainItemById[chainSelector].ccipPool;
    }

    function usdx() public view returns(IUsdxToken) {
        return IUsdxToken(chainItemById[chainSelector].usdx);
    }

    function exchange() public view returns(IExchange) {
        return IExchange(chainItemById[chainSelector].exchange);
    }

    function payoutManager() public view returns(IPayoutManager) {
        return IPayoutManager(chainItemById[chainSelector].payoutManager);
    }

    function roleManager() public view returns(IRoleManager) {
        return IRoleManager(chainItemById[chainSelector].roleManager);
    }

    function remoteHub() public view returns(IRemoteHub) {
        return IRemoteHub(chainItemById[chainSelector].remoteHub);
    }

    function remoteHubUpgrader() public view returns(IRemoteHubUpgrader) {
        return IRemoteHubUpgrader(chainItemById[chainSelector].remoteHubUpgrader);
    }

    function wusdx() public view returns(IWrappedUsdxToken) {
        return IWrappedUsdxToken(chainItemById[chainSelector].wusdx);
    }

    function market() public view returns(IMarket) {
        return IMarket(chainItemById[chainSelector].market);
    }

    // ---  modifiers

    /// @dev Modifier that checks if the chain with the given destinationChainSelector is allowlisted.
    /// @param _destinationChainSelector The selector of the destination chain.
    modifier onlyAllowlistedDestinationChain(uint64 _destinationChainSelector) {
        if (!allowlistedDestinationChains[_destinationChainSelector])
            revert DestinationChainNotAllowlisted(_destinationChainSelector);
        _;
    }

    /// @dev Modifier that checks if the chain with the given sourceChainSelector is allowlisted and if the sender is allowlisted.
    /// @param _sourceChainSelector The selector of the destination chain.
    /// @param _sender The address of the sender.
    modifier onlyAllowlisted(uint64 _sourceChainSelector, address _sender) {
        if (!allowlistedSourceChains[_sourceChainSelector])
            revert SourceChainNotAllowlisted(_sourceChainSelector);
        if (!allowlistedSenders[_sender]) revert SenderNotAllowlisted(_sender);
        _;
    }

    /// @dev Modifier that checks the receiver address is not 0.
    /// @param _receiver The receiver address.
    modifier validateReceiver(address _receiver) {
        if (_receiver == address(0)) revert InvalidReceiverAddress();
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller doesn't have DEFAULT_ADMIN_ROLE role");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager().hasRole(roleManager().PORTFOLIO_AGENT_ROLE(), _msgSender()), "Caller doesn't have PORTFOLIO_AGENT_ROLE role");
        _;
    }

    modifier onlyExchanger() {
        require(address(exchange()) == _msgSender(), "Caller is not the EXCHANGER");
        _;
    }

    // --- setters

    // ---  logic

    function pause() public onlyPortfolioAgent {
        _pause();
    }

    function unpause() public onlyPortfolioAgent {
        _unpause();
    }

    function addChainItem(ChainItem memory chainItem) public onlyAdmin {
        chainItems.push(chainItem);
        chainItemById[chainItem.chainSelector] = chainItem;
    }

    function getChainItemById(uint64 key) public view returns(ChainItem memory) {
        return chainItemById[key];
    }

    /// @dev Updates the allowlist status of a destination chain for transactions.
    function allowlistDestinationChain(uint64 _destinationChainSelector, bool allowed) external onlyAdmin {
        allowlistedDestinationChains[_destinationChainSelector] = allowed;
    }

    /// @dev Updates the allowlist status of a source chain for transactions.
    function allowlistSourceChain(uint64 _sourceChainSelector, bool allowed) external onlyAdmin {
        allowlistedSourceChains[_sourceChainSelector] = allowed;
    }

    /// @dev Updates the allowlist status of a sender for transactions.
    function allowlistSender(address _sender, bool allowed) external onlyAdmin {
        allowlistedSenders[_sender] = allowed;
    }

    function _sendViaCCIP(MultichainCallItem memory item) internal
        onlyAllowlistedDestinationChain(item.chainSelector)
        validateReceiver(item.receiver)
        returns (bytes32 messageId)
    {
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(item);
        IRouterClient router = IRouterClient(this.getRouter()); // Q: may be it should be initialized at creation stage
        uint256 fees = router.getFee(item.chainSelector, evm2AnyMessage);

        if (fees > address(this).balance)
            revert NotEnoughBalance(address(this).balance, fees);

        if (item.amount > 0) {
            IERC20(item.token).approve(address(router), item.amount); // Q: item.token == 0x0? 
        }

        messageId = router.ccipSend{value: fees}(item.chainSelector, evm2AnyMessage); // which transfer mechanism is used?

        emit MessageSent(messageId, item.chainSelector, item.receiver, abi.encode(item.batchData), item.token, item.amount, address(0), fees);

        return messageId;
    }

    /// handle a received message
    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override
        onlyAllowlisted(any2EvmMessage.sourceChainSelector, abi.decode(any2EvmMessage.sender, (address))) 
    {
        DataCallItem[] memory receivedData = abi.decode(any2EvmMessage.data, (DataCallItem[]));
        for (uint i = 0; i < receivedData.length; i++) {
            if (receivedData[i].executor == address(this)) { // Q: for which reasons?
                revert ExecutorIsTheSameContract();
            } else {
                (bool success, bytes memory data) = receivedData[i].executor.call(receivedData[i].data);
                require(success, "Call failed");
                emit CallExecuted(receivedData[i].executor, success, data);
            }
        }

        emit MessageReceived( // Q: actually, message can be received, but tx can be reverted in execution block 
            any2EvmMessage.messageId,
            any2EvmMessage.sourceChainSelector,
            abi.decode(any2EvmMessage.sender, (address)),
            abi.decode(any2EvmMessage.data, (DataCallItem[])),
            any2EvmMessage.destTokenAmounts.length == 0 ? ZERO_ADDRESS : any2EvmMessage.destTokenAmounts[0].token,
            any2EvmMessage.destTokenAmounts.length == 0 ? 0 : any2EvmMessage.destTokenAmounts[0].amount
        );
    }

    function _buildCCIPMessage(MultichainCallItem memory item) private pure returns (Client.EVM2AnyMessage memory) {

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: item.token,
            amount: item.amount
        });

        DataCallItem[] memory dataCallItem;

        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(item.receiver),
                data: (item.amount == 0) ? abi.encode(item.batchData) : abi.encode(dataCallItem),
                tokenAmounts: (item.amount == 0) ? new Client.EVMTokenAmount[](0) : tokenAmounts,
                extraArgs: Client._argsToBytes(
                    Client.EVMExtraArgsV1({gasLimit: 200_000})
                ),
                feeToken: address(0)
            });
    }

    receive() external payable {}

    function withdraw(address _beneficiary) public onlyAdmin {
        uint256 amount = address(this).balance;

        if (amount == 0) {
            revert NothingToWithdraw();
        }

        (bool sent, ) = _beneficiary.call{value: amount}("");

        if (!sent) {
            revert FailedToWithdrawEth(msg.sender, _beneficiary, amount);
        }
    }

    /// @notice Allows the owner of the contract to withdraw all tokens of a specific ERC20 token.
    /// @dev This function reverts with a 'NothingToWithdraw' error if there are no tokens to withdraw.
    /// @param _beneficiary The address to which the tokens will be sent.
    /// @param _token The contract address of the ERC20 token to be withdrawn.
    function withdrawToken(address _beneficiary, address _token) public onlyAdmin {
        
        uint256 amount = IERC20(_token).balanceOf(address(this));

        if (amount == 0) {
            revert NothingToWithdraw();
        }

        IERC20(_token).safeTransfer(_beneficiary, amount);
    }

    function multichainCall(MultichainCallItem[] memory multichainCallItems) public payable whenNotPaused onlyAdmin {
        for (uint256 i; i < multichainCallItems.length; i++) {
            if (multichainCallItems[i].chainSelector == chainSelector && multichainCallItems[i].receiver != address(this)) {
            } else if (multichainCallItems[i].chainSelector == chainSelector && multichainCallItems[i].receiver == address(this)) {
                for (uint j = 0; j < multichainCallItems[i].batchData.length; j++) {
                    (bool success, bytes memory data) = multichainCallItems[i].batchData[j].executor.call(multichainCallItems[i].batchData[j].data);
                    emit CallExecuted(address(this), success, data);
                }
            } else {
                _sendViaCCIP(multichainCallItems[i]);
            }
        }
    }

    function execMultiPayout(uint256 newDelta) public payable whenNotPaused onlyExchanger {
        for (uint256 i = 1; i < chainItems.length; i++) {
            DataCallItem[] memory dataCallItems = new DataCallItem[](1);
            dataCallItems[0] = DataCallItem({
                executor: chainItems[i].exchange,
                data: abi.encodeWithSignature("payout(uint256)", newDelta)
            });
            MultichainCallItem memory multichainCallItem = MultichainCallItem({
                chainSelector: chainItems[i].chainSelector,
                receiver: chainItems[i].remoteHub,
                token: ZERO_ADDRESS,
                amount: 0,
                batchData: dataCallItems
            });
            _sendViaCCIP(multichainCallItem);
        }
    }

    function multiTransfer(address _to, uint256 _amount, uint64 _destinationChainSelector) whenNotPaused public { // Q: naming?

        usdx().transferFrom(msg.sender, address(this), _amount);
        IMarket(chainItemById[chainSelector].market).wrap(address(usdx()), usdx().balanceOf(address(this)), address(this)); 

        DataCallItem[] memory dataCallItems = new DataCallItem[](2);
        dataCallItems[0] = DataCallItem({
            executor: chainItemById[_destinationChainSelector].wusdx,
            data: abi.encodeWithSignature("approve(address,uint256)", chainItemById[_destinationChainSelector].market, wusdx().balanceOf(address(this)))
        });
        dataCallItems[1] = DataCallItem({
            executor: chainItemById[_destinationChainSelector].market,
            data: abi.encodeWithSignature("unwrap(address,uint256,address)", chainItemById[_destinationChainSelector].usdx, wusdx().balanceOf(address(this)), _to)
        });

        MultichainCallItem memory multichainCallItem = MultichainCallItem({
                chainSelector: _destinationChainSelector,
                receiver: chainItemById[_destinationChainSelector].remoteHub,
                token: chainItemById[chainSelector].wusdx,
                amount: wusdx().balanceOf(address(this)),
                batchData: dataCallItems
            });

        _sendViaCCIP(multichainCallItem);
    }

    // --- testing

    function checkUpgrading() public pure returns(bool) {
        return false;
    }
}
