// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

struct IoTDevice {
    uint256 iotDeviceId;
    uint256 costPerHour;
    uint256 totalRaised;
    uint256 txCount;
    string cid;
    address owner;
    bool isActive;
}

struct Order {
    uint256 ioTDeviceId;
    uint256 amountPaid;
    uint256 startTimestamp;
    uint256 endTimestamp;
    address user;
}

struct IoTDeviceOwner {
    uint256 totalRaised;
    uint256 totalWithdrawal;
    uint256[] ioTDeviceIds;
}

struct User {
    uint256 spent;
    Order[] orders;
}

error INSUFFICIENT_CONTRACT_BALANCE();
error INSUFFICIENT_BALANCE();
error ZERO_ADDRESS();
error ZERO_COST();
error FAILED_TRANSFER();
error UNAUTHORIZED();
error INACTIVE_DEVICE();
error ID_DUPLICATED();

contract Iofy is Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // State Variables
    IERC20 public token;
    Counters.Counter public _orderID;
    uint256 private _fee; // 100 = 1%
    uint256 private _totalraisedInDeals;
    uint256 private _availableFees;

    // Mappings
    mapping(uint256 => IoTDevice) private _ioTDeviceIdToIoTDevice;
    mapping(uint256 => Order) private _orderIdToOrder;
    mapping(address => IoTDeviceOwner) private _ioTDeviceOwners;
    mapping(address => User) private _users;

    // Events
    event SetFee(address indexed admin, uint256 fee);
    event TakeFee(
        address indexed admin,
        address indexed recipient,
        uint256 fee
    );
    event CreateIotDevice(
        address indexed iotDeviceOwner,
        uint256 indexed id,
        uint256 costPerHour,
        string indexed cid
    );
    event ModifyIotDevice(
        address indexed iotDeviceOwner,
        uint256 indexed iotDeviceId,
        uint256 costPerHour,
        bool isActive
    );
    event Withdraw(
        address indexed iotDeviceOwner,
        address indexed recipient,
        uint256 amount
    );
    event RentIot(
        address indexed maker,
        address indexed user,
        uint256 indexed iotDeviceId,
        uint256 id,
        uint256 val,
        uint256 fee,
        uint256 start,
        uint256 end
    );

    constructor(address _token, uint256 fee) Ownable() {
        token = IERC20(_token);
        _setFee(fee);
    }

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
    // ==================== WRITE METHODS ==================== //
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

    // ==================== FOR ADMIN ==================== //

    function setFee(uint256 fee) external onlyOwner {
        _setFee(fee);
    }

    function takeFee(address recipient, uint256 amount) external onlyOwner {
        uint256 avl = _availableFees;
        if (avl < amount) revert INSUFFICIENT_BALANCE();
        unchecked {
            _availableFees -= amount;
        }
        _handleTransfer(recipient, amount);
        emit TakeFee(msg.sender, recipient, amount);
    }

    // ==================== FOR IoT DEVICE OWNERS ==================== //

    function createIoTDevice(
        string memory cid,
        uint256 iotDeviceId,
        uint256 costPerHour
    ) external {
        IoTDevice memory iot_ = _ioTDeviceIdToIoTDevice[iotDeviceId];
        if (address(0) != iot_.owner) revert ID_DUPLICATED();

        if (costPerHour == 0) revert ZERO_COST();

        IoTDevice memory iot = IoTDevice(
            iotDeviceId,
            costPerHour,
            0,
            0,
            cid,
            msg.sender,
            true
        );

        _ioTDeviceIdToIoTDevice[iotDeviceId] = iot;
        _ioTDeviceOwners[msg.sender].ioTDeviceIds.push(iotDeviceId);

        emit CreateIotDevice(msg.sender, iotDeviceId, costPerHour, cid);
    }

    function modifyIoTDevice(
        uint256 iotDeviceId,
        uint256 costPerHour,
        bool isActive
    ) external {
        IoTDevice memory iot_ = _ioTDeviceIdToIoTDevice[iotDeviceId];
        if (msg.sender != iot_.owner) revert UNAUTHORIZED();

        if (costPerHour == 0) revert ZERO_COST();

        IoTDevice storage iot = _ioTDeviceIdToIoTDevice[iotDeviceId];

        iot.isActive = isActive;
        iot.costPerHour = costPerHour;

        emit ModifyIotDevice(msg.sender, iotDeviceId, costPerHour, isActive);
    }

    function withdraw(address recipient, uint256 amount) external {
        IoTDeviceOwner memory own = _ioTDeviceOwners[msg.sender];
        IoTDeviceOwner storage _own = _ioTDeviceOwners[msg.sender];

        uint256 avl = own.totalRaised - own.totalWithdrawal;
        if (avl < amount) revert INSUFFICIENT_BALANCE();

        unchecked {
            _own.totalWithdrawal += amount;
        }

        _handleTransfer(recipient, amount);
        emit Withdraw(msg.sender, recipient, amount);
    }

    // ==================== FOR USERS ==================== //

    function rentIoT(
        uint256 iotDeviceId,
        address user,
        uint256 amount,
        uint256 startsIn
    ) external returns (uint256 start, uint256 end) {
        IoTDevice memory _iot = _ioTDeviceIdToIoTDevice[iotDeviceId];
        if (!_iot.isActive) revert INACTIVE_DEVICE();
        if (amount == 0) revert ZERO_COST();

        token.safeTransferFrom(msg.sender, address(this), amount);

        IoTDevice storage iot = _ioTDeviceIdToIoTDevice[iotDeviceId];
        IoTDeviceOwner storage own = _ioTDeviceOwners[_iot.owner];

        User storage usr = _users[user];

        uint256 iotDeviceId_ = iotDeviceId;
        address user_ = user;
        uint256 fee_ = _fee;

        unchecked {
            usr.spent += amount;

            uint256 fee = (amount * fee_) / (100 * 100);
            uint256 afterFee = amount - fee;

            _totalraisedInDeals += afterFee;
            _availableFees += fee;

            own.totalRaised += afterFee;

            iot.totalRaised += afterFee;
            iot.txCount++;

            start = startsIn + block.timestamp;
            end = ((amount * 1 hours) / _iot.costPerHour) + start;
        }

        (uint256 start_, uint256 end_, uint256 amount_) = (start, end, amount);

        Order memory ord = Order(iotDeviceId_, amount_, start_, end_, user_);
        usr.orders.push(ord);

        _orderID.increment();
        uint256 id = _orderID.current();

        _orderIdToOrder[id] = ord;
        emit RentIot(
            msg.sender,
            user_,
            iotDeviceId_,
            id,
            amount_,
            fee_,
            start_,
            end_
        );
    }

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
    // ==================== READ METHODS ==================== //
    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

    function getLastestOrderId() external view returns (uint256 id) {
        return _orderID.current();
    }

    function getFee() external view returns (uint256 fee) {
        return _fee;
    }

    function getAvailableFees() external view returns (uint256 available) {
        return _availableFees;
    }

    function getTotalRaisedInDeals() external view returns (uint256 total) {
        return _totalraisedInDeals;
    }

    function getIoTDevice(uint256 ioTDeviceId)
        external
        view
        returns (IoTDevice memory)
    {
        return _ioTDeviceIdToIoTDevice[ioTDeviceId];
    }

    function getIoTOwnerInfo(address ownerAddr)
        external
        view
        returns (IoTDeviceOwner memory)
    {
        return _ioTDeviceOwners[ownerAddr];
    }

    function getUserInfo(address userAddr) external view returns (User memory) {
        return _users[userAddr];
    }

    function getOrderInfo(uint256 orderId)
        external
        view
        returns (Order memory)
    {
        return _orderIdToOrder[orderId];
    }

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //
    // ==================== PRIVATE METHODS ==================== //
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

    function _setFee(uint256 fee) private {
        _fee = fee;
        emit SetFee(msg.sender, fee);
    }

    function _handleTransfer(address recipient, uint256 amount) private {
        if (recipient == address(0)) revert ZERO_ADDRESS();
        uint256 bal = token.balanceOf(address(this));
        if (bal < amount) revert INSUFFICIENT_CONTRACT_BALANCE();
        token.safeTransfer(recipient, amount);
    }
}
