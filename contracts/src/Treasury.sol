// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @notice Manages GravityClaw funds, provider payments, and platform fees
 * @dev Handles escrow and distribution of payments to 0G Compute providers
 */
contract Treasury is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    IERC20 public paymentToken;

    mapping(address => uint256) public userBalances;
    mapping(address => uint256) public providerEarnings;
    mapping(address => uint256) public providerPendingPayments;

    uint256 public platformFeePercent = 10; // 10%
    uint256 public totalPlatformFees;
    uint256 public totalProviderPayments;

    event Deposited(address indexed user, uint256 amount);
    event ProviderPaid(address indexed provider, address indexed user, uint256 amount, uint256 fee);
    event ProviderWithdrawn(address indexed provider, uint256 amount);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount);
    event UserRefunded(address indexed user, uint256 amount);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    error InsufficientBalance();
    error InvalidAmount();
    error InvalidFee();
    error NothingToWithdraw();

    constructor(address _paymentToken) {
        paymentToken = IERC20(_paymentToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(WITHDRAWER_ROLE, msg.sender);
    }

    /**
     * @notice Deposit funds into the treasury
     * @param _amount Amount to deposit
     */
    function deposit(uint256 _amount) external nonReentrant {
        if (_amount == 0) revert InvalidAmount();
        
        paymentToken.safeTransferFrom(msg.sender, address(this), _amount);
        userBalances[msg.sender] += _amount;
        
        emit Deposited(msg.sender, _amount);
    }

    /**
     * @notice Pay a compute provider for services
     * @param _user User who is paying
     * @param _provider Provider to pay
     * @param _amount Gross amount (fee will be deducted)
     */
    function payProvider(
        address _user,
        address _provider,
        uint256 _amount
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        if (userBalances[_user] < _amount) revert InsufficientBalance();
        if (_amount == 0) revert InvalidAmount();

        uint256 platformFee = (_amount * platformFeePercent) / 100;
        uint256 providerAmount = _amount - platformFee;

        userBalances[_user] -= _amount;
        providerEarnings[_provider] += providerAmount;
        totalPlatformFees += platformFee;
        totalProviderPayments += providerAmount;

        emit ProviderPaid(_provider, _user, providerAmount, platformFee);
    }

    /**
     * @notice Batch pay multiple providers
     * @param _user User who is paying
     * @param _providers Array of provider addresses
     * @param _amounts Array of amounts to pay each provider
     */
    function batchPayProviders(
        address _user,
        address[] calldata _providers,
        uint256[] calldata _amounts
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        require(_providers.length == _amounts.length, "Length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        if (userBalances[_user] < totalAmount) revert InsufficientBalance();

        for (uint256 i = 0; i < _providers.length; i++) {
            uint256 amount = _amounts[i];
            if (amount == 0) continue;

            uint256 platformFee = (amount * platformFeePercent) / 100;
            uint256 providerAmount = amount - platformFee;

            userBalances[_user] -= amount;
            providerEarnings[_providers[i]] += providerAmount;
            totalPlatformFees += platformFee;
            totalProviderPayments += providerAmount;

            emit ProviderPaid(_providers[i], _user, providerAmount, platformFee);
        }
    }

    /**
     * @notice Provider withdraws their earnings
     */
    function withdrawProviderEarnings() external nonReentrant {
        uint256 amount = providerEarnings[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        providerEarnings[msg.sender] = 0;
        paymentToken.safeTransfer(msg.sender, amount);

        emit ProviderWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Withdraw platform fees
     * @param _to Address to send fees to
     */
    function withdrawPlatformFees(address _to) external onlyRole(WITHDRAWER_ROLE) nonReentrant {
        uint256 amount = totalPlatformFees;
        if (amount == 0) revert NothingToWithdraw();

        totalPlatformFees = 0;
        paymentToken.safeTransfer(_to, amount);

        emit PlatformFeesWithdrawn(_to, amount);
    }

    /**
     * @notice Refund user balance
     * @param _user User to refund
     * @param _amount Amount to refund
     */
    function refundUser(address _user, uint256 _amount) external onlyRole(OPERATOR_ROLE) nonReentrant {
        if (userBalances[_user] < _amount) revert InsufficientBalance();

        userBalances[_user] -= _amount;
        paymentToken.safeTransfer(_user, _amount);

        emit UserRefunded(_user, _amount);
    }

    /**
     * @notice User withdraws their remaining balance
     */
    function withdrawUserBalance() external nonReentrant {
        uint256 amount = userBalances[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        userBalances[msg.sender] = 0;
        paymentToken.safeTransfer(msg.sender, amount);

        emit UserRefunded(msg.sender, amount);
    }

    /**
     * @notice Update platform fee percentage
     * @param _newFee New fee percentage (0-30)
     */
    function setFeePercent(uint256 _newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newFee > 30) revert InvalidFee();
        
        uint256 oldFee = platformFeePercent;
        platformFeePercent = _newFee;
        
        emit FeeUpdated(oldFee, _newFee);
    }

    /**
     * @notice Get user balance
     * @param _user User address
     */
    function getUserBalance(address _user) external view returns (uint256) {
        return userBalances[_user];
    }

    /**
     * @notice Get provider earnings
     * @param _provider Provider address
     */
    function getProviderEarnings(address _provider) external view returns (uint256) {
        return providerEarnings[_provider];
    }

    /**
     * @notice Get treasury stats
     */
    function getStats() external view returns (
        uint256 _totalPlatformFees,
        uint256 _totalProviderPayments,
        uint256 _feePercent
    ) {
        return (totalPlatformFees, totalProviderPayments, platformFeePercent);
    }

    /**
     * @notice Emergency withdraw (admin only)
     * @param _token Token to withdraw
     * @param _to Address to send to
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(_token).safeTransfer(_to, _amount);
    }
}
