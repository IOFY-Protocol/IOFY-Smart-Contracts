# IOFY Protocol

## Associated Repository Links:

- [Client Repository](https://github.com/IOFY-Protocol/client): This repository contains the client functionalities.
- [Server Repository](https://github.com/IOFY-Protocol/server): This repository contains the server functionalities.
- [IoT Device Repository](https://github.com/IOFY-Protocol/IOT-device): This repository contains the IoT device functionalities.

## INSTALLATION

- clone the repository

```
git clone https://github.com/IOFY-Protocol/blockchain.git
```

- install the packages

```
npm install
```

- compile the contracts

```
npx hardhat compile
```

- run the unit tests

```
npx hardhat test
```

- run test coverage

```
npx hardhat coverage
```

## SMART CONTRACT INTEGRATION DOCS

This section contains details of the different endpoints available in the smart contract.

During the deployment of this smart contct, the following varianles are passed into the constructor:

```
constructor(address token, uint256 fee);
```

where,

| Syntax | description                                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| token  | the smart contract address of the ERC20 standard token to be used in the contract for transactions.                     |
| fee    | the fee value (integer) to be set. When the value is set to **100**, it means that the contract will charge **1%** fee. |

The address that deploys the the smart contract is automatically set to be the _owner()_ address. This is also modifyable in the contract. See [Openzeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol).

### Read Methods

Find the available read methods below:

```
function getFee() external view returns (uint256 fee);
```

where,

| Syntax | description                                                                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fee    | the fee value (integer) charged from the device owner by IOFY whenever payment is made to rent a device. When the return value is **100**, it means that IOFY charges **1%** fee. |

```
function getAvailableFees() external view returns (uint256 available);
```

where,

| Syntax    | description                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| available | the available amount (integer) accumulated by the contract from all the fees. This tells you how much revenue can be withdrawn by the admin at the current time |

```
function getTotalRaisedInDeals() external view returns (uint256 total);
```

where,

| Syntax | description                                                                       |
| ------ | --------------------------------------------------------------------------------- |
| total  | the total amount (integer) raised in deals within the contract from all the deals |

```
function getLastestOrderId() external view returns (uint256 id);
```

where,

| Syntax | description                                                                                   |
| ------ | --------------------------------------------------------------------------------------------- |
| id     | the value (integer) of the ID assigned to the lastly created **order** in the smart contract. |

```
struct IoTDevice {
    uint256 iotDeviceId;
    uint256 costPerHour;
    uint256 totalRaised;
    uint256 txCount;
    string cid;
    address owner;
    bool isActive;
}

function getIoTDevice(uint256 ioTDeviceId) external view returns (IoTDevice memory)
```

where,

| Syntax      | description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| iotDeviceId | id (integer) of the IoT device to query.                                   |
| costPerHour | the hourly cost of using the IoT device in USD of the IoT device to query. |
| totalRaised | the total amount realized by this IoT device.                              |
| txCount     | the number of times this IoT device has been rented.                       |
| cid         | the hash string of the IoT device (From IPFS, Orbit-DB).                   |
| owner       | the wallet address of the owner of this IoT device.                        |
| isActive    | a boolean showing if the IoT device is availabe for use.                   |

```
struct IoTDeviceOwner {
    uint256 totalRaised;
    uint256 totalWithdrawal;
    uint256[] ioTDeviceIds;
}

function getIoTOwnerInfo(address ownerAddr) external view returns (IoTDeviceOwner memory)
```

where,

| Syntax          | description                                                          |
| --------------- | -------------------------------------------------------------------- |
| ownerAddr       | the wallet address to query for                                      |
| totalRaised     | the total amount realized from all the devices owned by this owner.  |
| totalWithdrawal | the total amount of funds withdrawn by this user from their earnings |
| ioTDeviceIds    | an array of **IDs** of all IoT devices owned by this owner           |

**NOTE**

- To know the balance available for the _ownerAddr_ to withdraw, you would need to use this equation: **_balance = totalRaised - totalWithdrawal_**.

```
struct User {
    uint256 spent;
    Order[] orders;
}

function getUserInfo(address userAddr) external view returns (User memory)
```

where,

| Syntax   | description                                                                      |
| -------- | -------------------------------------------------------------------------------- |
| userAddr | the wallet address to query for                                                  |
| spent    | the total amount spent by the user on this platform.                             |
| orders   | an array of **Order**'s cerated by this user. (see next method for _Order_ info) |

```
struct Order {
    uint256 ioTDeviceId;
    uint256 amountPaid;
    uint256 startTimestamp;
    uint256 endTimestamp;
    address user;
}

function getOrderInfo(uint256 orderId) external view returns (Order memory)
```

where,

| Syntax         | description                                                                    |
| -------------- | ------------------------------------------------------------------------------ |
| orderId        | id (integer) of the order to query.                                            |
| iotDeviceId    | id (integer) of the IoT device on this order.                                  |
| amountPaid     | the amount paid on this order.                                                 |
| startTimestamp | the epoch timestamp when the user's time will be activated by the IoT device   |
| endTimestamp   | the epoch timestamp when the user's time will be deactivated by the IoT device |
| user           | the wallet address of the user who created this order.                         |

```
function getDeviceIds() external view returns (uint256[] memory ids);
```

where,

| Syntax | description                                         |
| ------ | --------------------------------------------------- |
| ids    | an array of created device IDs in order of creation |

### Write Methods

Here, we will split the _write_ methods in 3 categories: Admin, Lender, Renter

- - **Admin Methods**

```
function setFee(uint256 fee) external;
```

where,

| Syntax | description                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fee    | the fee value (integer) to be set by the admin of the smart contract. When the value is set to **100**, it means that the contract will charge **1%** fee. |

**NOTE**: This method will fail if:

- it is executed by a non admin wallet.

```
function takeFee(address recipient, uint256 amount) external;
```

where,

| Syntax    | description                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| recipient | the wallet address to receive the fee.                                                                                                                      |
| amount    | the fee amount (integer) to be set by the admin of the smart contract. When the value is set to **100**, it means that the contract will charge **1%** fee. |

**NOTE**: This method will fail if:

- it is executed by a non admin wallet.
- _recipient_ is a [ZERO](https://ethereum.stackexchange.com/questions/13523/what-is-the-zero-account-as-described-by-the-solidity-docs) address.
- _fee_ is greater than what is available. See **getAvailableFees()**.

- - **Lender Methods**

The lender is one who owns an IoT device and lists it inthe smart contract for renting

```
function createIoTDevice(string memory cid, uint256 iotDeviceId, uint256 costPerHour) external;
```

where,

| Syntax      | description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| cid         | the hash string of the IoT device (From IPFS, Orbit-DB).                   |
| costPerHour | the hourly cost of using the IoT device in USD of the IoT device to query. |
| iotDeviceId | the id of the newly created iot device.                                    |

**NOTE**: This method will fail if:

- the _costPerHour_ is equal to 0.

```
function modifyIoTDevice(uint256 iotDeviceId, uint256 costPerHour, bool isActive) external;
```

where,

| Syntax      | description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| iotDeviceId | the IoT device id to modify.                                               |
| costPerHour | the hourly cost of using the IoT device in USD of the IoT device to query. |
| isActive    | if device is active or not.                                                |

**NOTE**: This method is used to modify 3 features at the same time. If you don't want to change the value of either _costPerHour_ or _isActive_, then you **MUST** pass in the current value of that param as stored in the smart contract. to access this information, see **getIoTDevice(uint256 ioTDeviceId)**.

This method will fail if:

- executed by a different wallet other than the wallet that created this particular _ioTDeviceId_.
- the _costPerHour_ is equal to 0.

```
function withdraw(address recipient, uint256 amount) external;
```

where,

| Syntax    | description                            |
| --------- | -------------------------------------- |
| recipient | the wallet address to receive the fee. |
| amount    | the amount (integer) to withdraw.      |

**NOTE**: This method is used to withdraw acquired funds from owned IoT devices. It will fail if:

- _recipient_ is a **ZERO** address.
- _amount_ is greater than the executor's balance. See **getIoTOwnerInfo(address executorAddress)**.
- _amount_ is equal to 0.

- - **Renter Methods**

These method(s) can be executed by users who want to rent active IoT devices.

```
function rentIoT(uint256 iotDeviceId, address user, uint256 amount, uint256 startsIn) external returns (uint256 start, uint256 end);
```

where,

| Syntax      | description                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| iotDeviceId | the IoT device id to rent.                                                                                                                        |
| user        | the wallet address of the person who will use the IoT device. This will enable users to rent IoT devices for others as well.                      |
| amount      | the amount you wish to pay. The contract calculates the usage period based on this value, and the cost per hour set in this _iotDeviceId_.        |
| startsIn    | this tells the contract the period to wait before starting your renting time. If you wish to start immediately, you should make this value **0**. |

**NOTE**: This method is used to rent an IoT device from the marketplace. It will fail if:

- _iotDeviceId_ is **inactive**.
- _amount_ is **0**.
- the smart contract does not have enough approval in the **token** smart contract used to make purchases.

See the guide below to properly sort out approvals:

Using the **allowance**, **approve**, and **totalSupply** methods in the ERC20 **token** contract, you need to do the folloing steps:

1. query the **allowance** read method in the token contract.

```
function allowance(address owner, address spender) external override returns (uint256) {
```

where,

| Syntax  | description                                             |
| ------- | ------------------------------------------------------- |
| owner   | the address of the user who wants to make the purchase. |
| spender | the smart contract address of IOFY marketplace.         |

If the return value is less than the amount which the user wishes to pay, then the IOFY smart contract won't have the authority to withraw the amount from the user. Hence the transaction will **FAIL**. To avoud this, you need to take the next step.

2. execute the approve method in the token contract.

```
function approve(address spender, uint256 amount) external returns (bool) {
```

where,

| Syntax  | description                                                                                                                                                                                                                                                                                                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| spender | the smart contract address of IOFY marketplace.                                                                                                                                                                                                                                                                                                                                           |
| amount  | the total supply of the token. You can get this by querying **totalSupply** in the token contract. We want to approve the total supply so that this user (the executor) will not need to make the **approve** call again even when he wants to pay to rent future devices. We do this to reduce the number of times the users will have to make write transactions that require gas fees. |

### Mock Token Address:

Ethereum address: 0x8AD10a05189cAC762Fc74b7b3F3eFFb1BEFb8FA9

FVM address: t410frliqubiytswhml6hjn5t6px7wg7pxd5je6osqgy

### Iofy Contract Address:

Ethereum address: 0xF94c74dbD81c8Bd4DB7AF4034e93BcA310ce2FCC

FVM address: t410f7fghjw6ydsf5jw326qbu5e54umim4l6mwrmlnvi
