// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InstanceRegistry
 * @notice Registry for GravityClaw OpenClaw instances deployed on 0G Chain
 * @dev Tracks user instances, configurations, and status
 */
contract InstanceRegistry is Ownable, ReentrancyGuard {
    
    enum InstanceStatus {
        Pending,
        Active,
        Paused,
        Terminated
    }

    struct Instance {
        bytes32 instanceId;
        address owner;
        bytes32 configHash;
        uint256 computeProviderId;
        string telegramBotId;
        InstanceStatus status;
        uint256 createdAt;
        uint256 lastActiveAt;
    }

    mapping(address => bytes32[]) public userInstances;
    mapping(bytes32 => Instance) public instances;
    
    uint256 public totalInstances;

    event InstanceCreated(
        bytes32 indexed instanceId,
        address indexed owner,
        bytes32 configHash,
        string telegramBotId
    );

    event InstanceStatusChanged(
        bytes32 indexed instanceId,
        InstanceStatus oldStatus,
        InstanceStatus newStatus
    );

    event InstanceConfigUpdated(
        bytes32 indexed instanceId,
        bytes32 oldConfigHash,
        bytes32 newConfigHash
    );

    event InstanceActivityRecorded(
        bytes32 indexed instanceId,
        uint256 timestamp
    );

    error InstanceAlreadyExists();
    error InstanceNotFound();
    error NotInstanceOwner();
    error InvalidStatus();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register a new OpenClaw instance
     * @param _instanceId Unique identifier for the instance
     * @param _configHash Hash of the configuration stored on 0G Storage
     * @param _computeProviderId ID of the 0G Compute provider
     * @param _telegramBotId Telegram bot ID
     */
    function registerInstance(
        bytes32 _instanceId,
        bytes32 _configHash,
        uint256 _computeProviderId,
        string calldata _telegramBotId
    ) external nonReentrant returns (bytes32) {
        if (instances[_instanceId].owner != address(0)) {
            revert InstanceAlreadyExists();
        }

        instances[_instanceId] = Instance({
            instanceId: _instanceId,
            owner: msg.sender,
            configHash: _configHash,
            computeProviderId: _computeProviderId,
            telegramBotId: _telegramBotId,
            status: InstanceStatus.Pending,
            createdAt: block.timestamp,
            lastActiveAt: block.timestamp
        });

        userInstances[msg.sender].push(_instanceId);
        totalInstances++;

        emit InstanceCreated(_instanceId, msg.sender, _configHash, _telegramBotId);

        return _instanceId;
    }

    /**
     * @notice Activate an instance (called by operator after deployment)
     * @param _instanceId Instance to activate
     */
    function activateInstance(bytes32 _instanceId) external onlyOwner {
        Instance storage instance = instances[_instanceId];
        if (instance.owner == address(0)) {
            revert InstanceNotFound();
        }

        InstanceStatus oldStatus = instance.status;
        instance.status = InstanceStatus.Active;
        instance.lastActiveAt = block.timestamp;

        emit InstanceStatusChanged(_instanceId, oldStatus, InstanceStatus.Active);
    }

    /**
     * @notice Pause an instance
     * @param _instanceId Instance to pause
     */
    function pauseInstance(bytes32 _instanceId) external {
        Instance storage instance = instances[_instanceId];
        if (instance.owner == address(0)) {
            revert InstanceNotFound();
        }
        if (instance.owner != msg.sender && owner() != msg.sender) {
            revert NotInstanceOwner();
        }

        InstanceStatus oldStatus = instance.status;
        instance.status = InstanceStatus.Paused;

        emit InstanceStatusChanged(_instanceId, oldStatus, InstanceStatus.Paused);
    }

    /**
     * @notice Resume a paused instance
     * @param _instanceId Instance to resume
     */
    function resumeInstance(bytes32 _instanceId) external {
        Instance storage instance = instances[_instanceId];
        if (instance.owner == address(0)) {
            revert InstanceNotFound();
        }
        if (instance.owner != msg.sender) {
            revert NotInstanceOwner();
        }
        if (instance.status != InstanceStatus.Paused) {
            revert InvalidStatus();
        }

        InstanceStatus oldStatus = instance.status;
        instance.status = InstanceStatus.Active;
        instance.lastActiveAt = block.timestamp;

        emit InstanceStatusChanged(_instanceId, oldStatus, InstanceStatus.Active);
    }

    /**
     * @notice Terminate an instance
     * @param _instanceId Instance to terminate
     */
    function terminateInstance(bytes32 _instanceId) external {
        Instance storage instance = instances[_instanceId];
        if (instance.owner == address(0)) {
            revert InstanceNotFound();
        }
        if (instance.owner != msg.sender && owner() != msg.sender) {
            revert NotInstanceOwner();
        }

        InstanceStatus oldStatus = instance.status;
        instance.status = InstanceStatus.Terminated;

        emit InstanceStatusChanged(_instanceId, oldStatus, InstanceStatus.Terminated);
    }

    /**
     * @notice Update instance configuration hash
     * @param _instanceId Instance to update
     * @param _newConfigHash New configuration hash
     */
    function updateConfigHash(bytes32 _instanceId, bytes32 _newConfigHash) external {
        Instance storage instance = instances[_instanceId];
        if (instance.owner == address(0)) {
            revert InstanceNotFound();
        }
        if (instance.owner != msg.sender) {
            revert NotInstanceOwner();
        }

        bytes32 oldConfigHash = instance.configHash;
        instance.configHash = _newConfigHash;

        emit InstanceConfigUpdated(_instanceId, oldConfigHash, _newConfigHash);
    }

    /**
     * @notice Record instance activity (called by operator)
     * @param _instanceId Instance that was active
     */
    function recordActivity(bytes32 _instanceId) external onlyOwner {
        Instance storage instance = instances[_instanceId];
        if (instance.owner == address(0)) {
            revert InstanceNotFound();
        }

        instance.lastActiveAt = block.timestamp;

        emit InstanceActivityRecorded(_instanceId, block.timestamp);
    }

    /**
     * @notice Get instance details
     * @param _instanceId Instance to query
     */
    function getInstance(bytes32 _instanceId) external view returns (Instance memory) {
        return instances[_instanceId];
    }

    /**
     * @notice Get all instances for a user
     * @param _user User address
     */
    function getUserInstances(address _user) external view returns (bytes32[] memory) {
        return userInstances[_user];
    }

    /**
     * @notice Get count of user instances
     * @param _user User address
     */
    function getUserInstanceCount(address _user) external view returns (uint256) {
        return userInstances[_user].length;
    }

    /**
     * @notice Check if an instance is active
     * @param _instanceId Instance to check
     */
    function isInstanceActive(bytes32 _instanceId) external view returns (bool) {
        return instances[_instanceId].status == InstanceStatus.Active;
    }
}
