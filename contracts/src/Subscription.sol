// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Subscription
 * @notice Manages GravityClaw subscription plans and billing
 * @dev Supports both native OG token and ERC20 stablecoin payments
 */
contract Subscription is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Plan {
        string name;
        uint256 pricePerMonth;
        uint256 maxInstances;
        uint256 maxMessagesPerMonth;
        bool isActive;
    }

    struct UserSubscription {
        uint256 planId;
        uint256 startTime;
        uint256 endTime;
        uint256 messagesUsed;
        bool autoRenew;
    }

    IERC20 public paymentToken;
    address public treasury;

    mapping(uint256 => Plan) public plans;
    mapping(address => UserSubscription) public subscriptions;
    
    uint256 public planCount;
    uint256 public constant MONTH_DURATION = 30 days;

    event PlanCreated(uint256 indexed planId, string name, uint256 price);
    event PlanUpdated(uint256 indexed planId, uint256 newPrice, bool isActive);
    event Subscribed(address indexed user, uint256 planId, uint256 endTime);
    event Renewed(address indexed user, uint256 newEndTime);
    event Cancelled(address indexed user);
    event UsageRecorded(address indexed user, uint256 messageCount);

    error PlanNotActive();
    error AlreadySubscribed();
    error NoSubscription();
    error SubscriptionExpired();
    error MessageLimitExceeded();
    error InsufficientBalance();
    error InvalidPlan();

    constructor(address _paymentToken, address _treasury) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;

        // Initialize default plans (prices in payment token decimals, assuming 6 decimals like USDC)
        _createPlan("Starter", 5 * 10**6, 1, 10000);      // $5, 1 instance, 10K messages
        _createPlan("Pro", 19 * 10**6, 3, 50000);         // $19, 3 instances, 50K messages
        _createPlan("Enterprise", 99 * 10**6, 100, 0);    // $99, unlimited instances, unlimited messages
    }

    /**
     * @notice Create a new subscription plan
     * @param _name Plan name
     * @param _price Monthly price
     * @param _maxInstances Maximum instances allowed
     * @param _maxMessages Maximum messages per month (0 = unlimited)
     */
    function _createPlan(
        string memory _name,
        uint256 _price,
        uint256 _maxInstances,
        uint256 _maxMessages
    ) internal {
        plans[planCount] = Plan({
            name: _name,
            pricePerMonth: _price,
            maxInstances: _maxInstances,
            maxMessagesPerMonth: _maxMessages,
            isActive: true
        });
        
        emit PlanCreated(planCount, _name, _price);
        planCount++;
    }

    /**
     * @notice Create a new plan (admin only)
     */
    function createPlan(
        string calldata _name,
        uint256 _price,
        uint256 _maxInstances,
        uint256 _maxMessages
    ) external onlyOwner {
        _createPlan(_name, _price, _maxInstances, _maxMessages);
    }

    /**
     * @notice Update an existing plan
     * @param _planId Plan to update
     * @param _newPrice New monthly price
     * @param _isActive Whether the plan is active
     */
    function updatePlan(
        uint256 _planId,
        uint256 _newPrice,
        bool _isActive
    ) external onlyOwner {
        if (_planId >= planCount) revert InvalidPlan();
        
        plans[_planId].pricePerMonth = _newPrice;
        plans[_planId].isActive = _isActive;
        
        emit PlanUpdated(_planId, _newPrice, _isActive);
    }

    /**
     * @notice Subscribe to a plan
     * @param _planId Plan to subscribe to
     */
    function subscribe(uint256 _planId) external nonReentrant {
        if (_planId >= planCount) revert InvalidPlan();
        if (!plans[_planId].isActive) revert PlanNotActive();
        if (subscriptions[msg.sender].endTime > block.timestamp) revert AlreadySubscribed();

        uint256 price = plans[_planId].pricePerMonth;
        
        // Transfer payment to treasury
        paymentToken.safeTransferFrom(msg.sender, treasury, price);

        subscriptions[msg.sender] = UserSubscription({
            planId: _planId,
            startTime: block.timestamp,
            endTime: block.timestamp + MONTH_DURATION,
            messagesUsed: 0,
            autoRenew: true
        });

        emit Subscribed(msg.sender, _planId, subscriptions[msg.sender].endTime);
    }

    /**
     * @notice Renew subscription
     */
    function renew() external nonReentrant {
        UserSubscription storage sub = subscriptions[msg.sender];
        if (sub.endTime == 0) revert NoSubscription();

        uint256 price = plans[sub.planId].pricePerMonth;
        
        // Transfer payment to treasury
        paymentToken.safeTransferFrom(msg.sender, treasury, price);

        // Extend from current end time or now, whichever is later
        uint256 newStart = sub.endTime > block.timestamp ? sub.endTime : block.timestamp;
        sub.endTime = newStart + MONTH_DURATION;
        sub.messagesUsed = 0;

        emit Renewed(msg.sender, sub.endTime);
    }

    /**
     * @notice Cancel auto-renewal
     */
    function cancelAutoRenew() external {
        UserSubscription storage sub = subscriptions[msg.sender];
        if (sub.endTime == 0) revert NoSubscription();
        
        sub.autoRenew = false;
        
        emit Cancelled(msg.sender);
    }

    /**
     * @notice Record message usage (called by operator)
     * @param _user User address
     * @param _messageCount Number of messages used
     */
    function recordUsage(address _user, uint256 _messageCount) external onlyOwner {
        UserSubscription storage sub = subscriptions[_user];
        if (sub.endTime < block.timestamp) revert SubscriptionExpired();
        
        sub.messagesUsed += _messageCount;
        
        emit UsageRecorded(_user, _messageCount);
    }

    /**
     * @notice Check if user has an active subscription
     * @param _user User address
     */
    function isActive(address _user) external view returns (bool) {
        return subscriptions[_user].endTime > block.timestamp;
    }

    /**
     * @notice Check if user can use more messages
     * @param _user User address
     * @param _count Number of messages to check
     */
    function canUseMessages(address _user, uint256 _count) external view returns (bool) {
        UserSubscription memory sub = subscriptions[_user];
        if (sub.endTime < block.timestamp) return false;

        uint256 maxMessages = plans[sub.planId].maxMessagesPerMonth;
        if (maxMessages == 0) return true; // Unlimited

        return sub.messagesUsed + _count <= maxMessages;
    }

    /**
     * @notice Get remaining messages for user
     * @param _user User address
     */
    function getRemainingMessages(address _user) external view returns (uint256) {
        UserSubscription memory sub = subscriptions[_user];
        if (sub.endTime < block.timestamp) return 0;

        uint256 maxMessages = plans[sub.planId].maxMessagesPerMonth;
        if (maxMessages == 0) return type(uint256).max; // Unlimited

        if (sub.messagesUsed >= maxMessages) return 0;
        return maxMessages - sub.messagesUsed;
    }

    /**
     * @notice Get plan details
     * @param _planId Plan ID
     */
    function getPlan(uint256 _planId) external view returns (Plan memory) {
        return plans[_planId];
    }

    /**
     * @notice Get user subscription details
     * @param _user User address
     */
    function getSubscription(address _user) external view returns (UserSubscription memory) {
        return subscriptions[_user];
    }

    /**
     * @notice Update treasury address
     * @param _newTreasury New treasury address
     */
    function setTreasury(address _newTreasury) external onlyOwner {
        treasury = _newTreasury;
    }

    /**
     * @notice Update payment token
     * @param _newToken New payment token address
     */
    function setPaymentToken(address _newToken) external onlyOwner {
        paymentToken = IERC20(_newToken);
    }
}
