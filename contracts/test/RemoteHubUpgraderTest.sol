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

import "../interfaces/IRemoteHub.sol";
import "hardhat/console.sol";

contract RemoteHubUpgraderTest is CCIPReceiver, Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    address public constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    struct MultichainCallUpgradeItem {
        uint64 chainSelector;
        address receiver;
        address newImplementation;
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

    mapping(uint64 => mapping(address => bool)) public allowlistedDestinationAddresses;
    
    IRemoteHub public remoteHub;

    uint256 public ccipGasLimit;

    // ---  events

    // Event emitted when a message is sent to another chain.
    event MessageSent(
        bytes32 indexed messageId, // The unique ID of the CCIP message.
        uint64 indexed destinationChainSelector, // The chain selector of the destination chain.
        address receiver, // The address of the receiver on the destination chain.
        address newImplementation,
        address feeToken, // the token address used to pay CCIP fees.
        uint256 fees // The fees paid for sending the message.
    );

    // Event emitted when a message is received from another chain.
    event UpgradeMessageReceived(
        bytes32 indexed messageId, // The unique ID of the CCIP message.
        uint64 indexed sourceChainSelector, // The chain selector of the source chain.
        address sender, // The address of the sender from the source chain.
        address data, // The text that was received.
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
    event RemoteHubUpdated(address remoteHub);

    // ---  initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _router, address _remoteHub) CCIPReceiver(_router) {
        remoteHub = IRemoteHub(_remoteHub);
    }

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        ccipGasLimit = 500_000;
    }

    function supportsInterface(bytes4 interfaceId) public pure override(CCIPReceiver, AccessControlUpgradeable) returns (bool) {
        return (interfaceId == type(IAccessControlUpgradeable).interfaceId) || 
               (interfaceId == type(IERC165Upgradeable).interfaceId) || 
               CCIPReceiver.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    // ---  remoteHub getters

    function exchange() public view returns(IExchange) {
        return remoteHub.exchange();
    }

    function roleManager() public view returns(IRoleManager) {
        return remoteHub.roleManager();
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

    function setRemoteHub(address _remoteHub) external onlyAdmin {
        remoteHub = IRemoteHub(_remoteHub);
        emit RemoteHubUpdated(_remoteHub);
    }

    // ---  logic

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

    /// @dev Set new gasLimit for CCIP send
    function setCcipGasLimit(uint256 _ccipGasLimit) external onlyAdmin {
        ccipGasLimit = _ccipGasLimit;
    }

    function _sendViaCCIP(MultichainCallUpgradeItem memory item) internal
        onlyAllowlistedDestinationChain(item.chainSelector)
        validateReceiver(item.receiver)
        returns (bytes32 messageId)
    {   
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(item);
        IRouterClient router = IRouterClient(this.getRouter());
        uint256 fees = router.getFee(item.chainSelector, evm2AnyMessage);
        
        if (fees > address(this).balance)
            revert NotEnoughBalance(address(this).balance, fees);

        messageId = router.ccipSend{value: fees}(item.chainSelector, evm2AnyMessage);
        
        emit MessageSent(messageId, item.chainSelector, item.receiver, item.newImplementation, address(0), fees);

        return messageId;
    }

    /// handle a received message
    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override
        onlyAllowlisted(any2EvmMessage.sourceChainSelector, abi.decode(any2EvmMessage.sender, (address)))
    {
        address newImplementation = abi.decode(any2EvmMessage.data, (address));
        (bool success, ) = address(remoteHub).call(abi.encodeWithSignature("upgradeTo(address)", newImplementation));
        require(success, "Call failed");    

        emit UpgradeMessageReceived(
            any2EvmMessage.messageId,
            any2EvmMessage.sourceChainSelector,
            abi.decode(any2EvmMessage.sender, (address)),
            abi.decode(any2EvmMessage.data, (address)),
            any2EvmMessage.destTokenAmounts.length == 0 ? ZERO_ADDRESS : any2EvmMessage.destTokenAmounts[0].token,
            any2EvmMessage.destTokenAmounts.length == 0 ? 0 : any2EvmMessage.destTokenAmounts[0].amount
        );
    }

    function _buildCCIPMessage(MultichainCallUpgradeItem memory item) private view returns (Client.EVM2AnyMessage memory) {
        
        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(item.receiver),
                data: abi.encode(item.newImplementation),
                tokenAmounts: new Client.EVMTokenAmount[](0),
                extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: ccipGasLimit})),
                feeToken: address(0)
            });
    }

    receive() external payable {}

    function upgradeRemoteHub(uint64 _chainSelector, address newImplementation) public payable onlyAdmin {
        require(_chainSelector != remoteHub.chainSelector(), "Forbiden upgrade: use direct call");
        
        MultichainCallUpgradeItem memory multichainCallItem = MultichainCallUpgradeItem({
            chainSelector: _chainSelector,
            receiver: remoteHub.getChainItemById(_chainSelector).remoteHubUpgrader,
            newImplementation: newImplementation
        });
    
        _sendViaCCIP(multichainCallItem);
    }

    // --- testing
    // delete after deploy

    function checkUpgrading() public pure returns(bool) {
        return true;
    }
}
