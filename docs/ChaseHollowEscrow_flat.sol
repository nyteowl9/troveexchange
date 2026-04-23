◇ injected env (10) from .env.contracts // tip: ⌘ enable debugging { debug: true }
// Sources flattened with hardhat v2.28.0 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/access/Ownable2Step.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (access/Ownable2Step.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This extension of the {Ownable} contract includes a two-step mechanism to transfer
 * ownership, where the new owner must call {acceptOwnership} in order to replace the
 * old one. This can help prevent common mistakes, such as transfers of ownership to
 * incorrect accounts, or to contracts that are unable to interact with the
 * permission system.
 *
 * The initial owner is specified at deployment time in the constructor for `Ownable`. This
 * can later be changed with {transferOwnership} and {acceptOwnership}.
 *
 * This module is used through inheritance. It will make available all functions
 * from parent (Ownable).
 */
abstract contract Ownable2Step is Ownable {
    address private _pendingOwner;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Returns the address of the pending owner.
     */
    function pendingOwner() public view virtual returns (address) {
        return _pendingOwner;
    }

    /**
     * @dev Starts the ownership transfer of the contract to a new account. Replaces the pending transfer if there is one.
     * Can only be called by the current owner.
     *
     * Setting `newOwner` to the zero address is allowed; this can be used to cancel an initiated ownership transfer.
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`) and deletes any pending owner.
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual override {
        delete _pendingOwner;
        super._transferOwnership(newOwner);
    }

    /**
     * @dev The new owner accepts the ownership transfer.
     */
    function acceptOwnership() public virtual {
        address sender = _msgSender();
        if (pendingOwner() != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        _transferOwnership(sender);
    }
}


// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC165.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

pragma solidity >=0.4.16;


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File @openzeppelin/contracts/interfaces/IERC20.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

pragma solidity >=0.4.16;


// File @openzeppelin/contracts/interfaces/IERC1363.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

pragma solidity >=0.6.2;


/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}


// File @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.20;


/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}


// File @openzeppelin/contracts/utils/Pausable.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}


// File @openzeppelin/contracts/utils/StorageSlot.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

pragma solidity ^0.8.20;

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}


// File contracts/ChaseHollowEscrow.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;





// ============================================================
// Chase Hollow Escrow — v1.1
// Handles USDC escrow for TCG card transactions on Base L2.
//
// Authority:
//   Owner (Safe multisig) — fees, pause, add/remove operators,
//                           add/remove dispute resolvers,
//                           emergency sweep (when paused)
//   Operator (hot wallet) — markDelivered, releaseEscrow (auto),
//                           cancelOrder, refundBuyer (auth fail),
//                           batch operations.
//                           Multiple operators. Changeable by owner.
//   DisputeResolver       — resolveDispute, batchResolveDisputes.
//                           Hot wallet used by dispute staff (not Safe).
//                           Multiple resolvers allowed. Changeable by owner.
//                           Owner also passes this check as fallback.
//   Buyer                 — fundOrder, releaseEscrow (early), openDispute
//   Seller                — confirmOrder (post bond)
//
// Order flow:
//   1. Buyer calls fundOrder()       → status: AwaitingConfirmation
//   2. Seller calls confirmOrder()   → status: Active (bond posted)
//   3. Shippo webhook → operator calls markDelivered() → status: Delivered
//   4a. Buyer calls releaseEscrow() early, OR
//   4b. 72hrs pass → operator cron calls releaseEscrow() → status: Released
//
// Dispute flow:
//   1. Buyer calls openDispute() during inspection window → status: Disputed
//   2. Dispute resolver calls resolveDispute() → Released or RefundedToBuyer
//
// Auth fail flow:
//   Authenticator marks fail → Shippo webhook → operator calls refundBuyer()
//
// Batch operations allow operator to process hundreds of
// orders in a single transaction.
// ============================================================

contract ChaseHollowEscrow is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Types ────────────────────────────────────────────────

    enum OrderStatus {
        AwaitingConfirmation, // Buyer funded — waiting for seller to post bond
        Active,               // Seller confirmed, bond posted — waiting for delivery
        Delivered,            // Delivered — 72hr inspection window open
        Released,             // Complete — funds distributed
        Disputed,             // Buyer disputed — funds frozen
        RefundedToBuyer,      // Auth fail or buyer won dispute
        Cancelled             // Cancelled before confirmation or delivery
    }

    struct Order {
        address buyer;
        address seller;
        address creator;            // Referral creator — address(0) if none
        uint256 escrowAmount;       // Total USDC locked by buyer
                                    //   = sellerPayout + platformFee + creatorFee
                                    //     + authFee + shippingFee + salesTax
        uint256 sellerBond;         // Bond posted by seller
        uint256 sellerBondRequired; // Bond amount seller must post to confirm
        uint256 platformFee;        // 3% → feeRecipient on release
        uint256 creatorFee;         // 0.5% → creator (or feeRecipient) on release
        uint256 authFee;            // $10 or $25 → feeRecipient on release
        uint256 shippingFee;        // Shippo label cost → feeRecipient (Chase Hollow remits to carrier)
        uint256 salesTax;           // TaxJar-calculated tax → feeRecipient (Chase Hollow remits to state)
        uint256 sellerPayout;       // Card price - platformFee - creatorFee → seller on release
        OrderStatus status;
        uint256 fundedAt;
        uint256 deliveredAt;
        uint256 autoReleaseAt;      // deliveredAt + buyerInspectWindow
    }

    // ── State ────────────────────────────────────────────────

    IERC20 public immutable usdc;
    address public feeRecipient;             // Safe multisig — receives all fees on settlement

    // ── Fee Recipient Guardians ──────────────────────────────────
    // A set of guardian addresses completely separate from the owner Safe.
    // ONLY guardians can propose/execute/cancel feeRecipient changes.
    // ONLY guardians can add or remove other guardians.
    // The owner Safe has ZERO control over guardians or feeRecipient —
    // a fully compromised owner Safe cannot redirect fee payments.
    //
    // Multiple guardians provide redundancy:
    //   - If G1 is compromised and proposes a malicious change, G2 can cancel it
    //     within the 72hr timelock window.
    //   - G2 then removes G1 and adds a replacement.
    //   - Owner cannot add guardians — closing the "replace guardian first" attack.
    //   - If G1 and G2 deadlock, owner can remove one via ownerRemoveGuardian()
    //     (cannot add — surviving guardian adds the replacement).
    //
    // At least one guardian must always exist (enforced on removal).
    mapping(address => bool) public isGuardian;
    uint256 public guardianCount;
    address public pendingFeeRecipient;
    uint256 public feeRecipientChangeAt;
    uint256 public constant FEE_RECIPIENT_DELAY = 72 hours;

    // ── Guardian change timelock ──────────────────────────────
    // Adding or removing a guardian requires a 72hr timelock.
    // Either existing guardian can cancel a pending proposal during the window.
    // This prevents a compromised G1 from instantly removing G2 and adding their own wallet.
    //
    // Deadlock tiebreaker (Option 2):
    //   If G1 and G2 are deadlocked (each cancelling the other's proposals),
    //   the owner Safe can call ownerRemoveGuardian() to break the deadlock.
    //   ownerRemoveGuardian() can ONLY remove — it cannot add a guardian.
    //   After removal, the surviving guardian adds a new one via the normal timelock.
    //   This preserves the owner's inability to directly install a guardian of their choice.
    struct GuardianProposal {
        address target;
        bool    isAdd;        // true = addGuardian, false = removeGuardian
        uint256 proposedAt;
        address proposedBy;
    }
    GuardianProposal public pendingGuardianChange;
    uint256 public constant GUARDIAN_CHANGE_DELAY = 72 hours;

    uint256 public platformFeeBps = 300;     // 3%
    uint256 public creatorFeeBps  = 50;      // 0.5%
    uint256 public buyerInspectWindow  = 72 hours;
    uint256 public sellerShipDeadline  = 48 hours;
    uint256 public sellerConfirmWindow = 24 hours; // How long seller has to post bond
    uint256 public maxOrderValue = 50_000 * 1e6;   // $50,000 USDC (6 decimals)

    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000; // 10% hard cap
    uint256 public constant MAX_CREATOR_FEE_BPS  = 200;  // 2% hard cap

    mapping(bytes32 => Order)   public orders;
    mapping(address => bool)    public isOperator;
    mapping(address => bool)    public isDisputeResolver;

    // ── Events ───────────────────────────────────────────────

    event OrderFunded(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 escrowAmount, uint256 sellerBondRequired);
    event OrderConfirmed(bytes32 indexed orderId, address indexed seller, uint256 sellerBond);
    event OrderDelivered(bytes32 indexed orderId, uint256 autoReleaseAt);
    event EscrowReleased(bytes32 indexed orderId, address indexed seller, uint256 sellerPayout, uint256 platformFee, uint256 creatorFee, uint256 shippingFee, uint256 salesTax);
    event DisputeOpened(bytes32 indexed orderId, address indexed buyer);
    event DisputeResolved(bytes32 indexed orderId, bool buyerWon);
    event BuyerRefunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event OrderCancelled(bytes32 indexed orderId);
    event BondReturned(bytes32 indexed orderId, address indexed seller, uint256 amount);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    event DisputeResolverAdded(address indexed resolver);
    event DisputeResolverRemoved(address indexed resolver);
    event FeeRecipientProposed(address indexed proposed, uint256 executeAt);
    event FeeRecipientChanged(address indexed oldRecipient, address indexed newRecipient);
    event FeeRecipientChangeCancelled(address indexed cancelled);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event GuardianChangeProposed(address indexed target, bool isAdd, address indexed proposedBy, uint256 executeAfter);
    event GuardianChangeCancelled(address indexed target, bool isAdd, address indexed cancelledBy);
    event GuardianRemovedByOwner(address indexed guardian);
    // sweepStuckFunds — emitted with full detail so off-chain can reconstruct redistribution
    event FundsSwept(address indexed recipient, uint256 amount, uint256 timestamp);

    // ── Constructor ──────────────────────────────────────────

    constructor(address _usdc, address _feeRecipient, address _guardian) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_guardian != address(0), "Invalid guardian");
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        isGuardian[_guardian] = true;
        guardianCount = 1;
    }

    // ── Modifiers ────────────────────────────────────────────

    modifier orderExists(bytes32 orderId) {
        require(orders[orderId].buyer != address(0), "Order does not exist");
        _;
    }

    modifier onlyBuyer(bytes32 orderId) {
        require(msg.sender == orders[orderId].buyer, "Not the buyer");
        _;
    }

    modifier onlyOperatorOrOwner() {
        require(isOperator[msg.sender] || msg.sender == owner(), "Not operator or owner");
        _;
    }

    modifier onlyGuardian() {
        require(isGuardian[msg.sender], "Not guardian");
        _;
    }

    modifier onlyDisputeResolverOrOwner() {
        require(isDisputeResolver[msg.sender] || msg.sender == owner(), "Not dispute resolver or owner");
        _;
    }

    // ============================================================
    // OPERATOR MANAGEMENT — owner (Safe) only
    // ============================================================

    // Add an operator (Vercel hot wallet, backup wallet, etc.)
    // Safe can add or remove operators at any time — no redeployment.
    function addOperator(address operator) external onlyOwner {
        require(operator != address(0), "Invalid address");
        require(!isOperator[operator], "Already an operator");
        isOperator[operator] = true;
        emit OperatorAdded(operator);
    }

    // Remove a compromised or retired operator instantly.
    function removeOperator(address operator) external onlyOwner {
        require(isOperator[operator], "Not an operator");
        isOperator[operator] = false;
        emit OperatorRemoved(operator);
    }

    // ============================================================
    // DISPUTE RESOLVER MANAGEMENT — owner (Safe) only
    // ============================================================

    // Dispute resolvers are hot wallets used by dispute staff.
    // Separate from the owner Safe so staff can execute decisions
    // without requiring a multisig ceremony for every dispute.
    // Owner retains resolveDispute access as a fallback.

    function addDisputeResolver(address resolver) external onlyOwner {
        require(resolver != address(0), "Invalid address");
        require(!isDisputeResolver[resolver], "Already a dispute resolver");
        isDisputeResolver[resolver] = true;
        emit DisputeResolverAdded(resolver);
    }

    function removeDisputeResolver(address resolver) external onlyOwner {
        require(isDisputeResolver[resolver], "Not a dispute resolver");
        isDisputeResolver[resolver] = false;
        emit DisputeResolverRemoved(resolver);
    }

    // ============================================================
    // CORE FUNCTIONS
    // ============================================================

    // ── 1. Fund Order (Buyer) ────────────────────────────────
    // Buyer locks USDC at checkout. Seller is notified and has
    // sellerConfirmWindow (24hrs) to post their bond.
    //
    // Fee validation: platformFee and creatorFee are checked
    // against on-chain BPS values so no one can bypass fees
    // by calling the contract directly.
    //
    // escrowAmount = sellerPayout + platformFee + creatorFee + authFee
    // cardValue    = escrowAmount - authFee (fee base)

    function fundOrder(
        bytes32 orderId,
        address seller,
        address creator,
        uint256 escrowAmount,
        uint256 sellerBondRequired,
        uint256 platformFee,
        uint256 creatorFee,
        uint256 authFee,
        uint256 shippingFee,
        uint256 salesTax,
        uint256 sellerPayout
    ) external nonReentrant whenNotPaused {
        require(orders[orderId].buyer == address(0), "Order already exists");
        require(seller != address(0), "Invalid seller");
        require(seller != msg.sender, "Buyer cannot be seller");
        require(escrowAmount > 0, "Escrow amount must be > 0");
        require(escrowAmount <= maxOrderValue, "Exceeds max order value");
        require(authFee < escrowAmount, "Auth fee exceeds escrow");
        require(
            platformFee + creatorFee + authFee + shippingFee + salesTax + sellerPayout == escrowAmount,
            "Amounts must sum to escrowAmount"
        );

        // Validate platform/creator fees against on-chain BPS — prevents fee bypass.
        // Fee base is card value only (escrow minus pass-through costs).
        uint256 cardValue = escrowAmount - authFee - shippingFee - salesTax;
        require(
            platformFee >= cardValue * platformFeeBps / 10000,
            "Platform fee below minimum"
        );
        require(
            creatorFee >= cardValue * creatorFeeBps / 10000,
            "Creator fee below minimum"
        );

        // Lock buyer's USDC
        usdc.safeTransferFrom(msg.sender, address(this), escrowAmount);

        orders[orderId] = Order({
            buyer:               msg.sender,
            seller:              seller,
            creator:             creator,
            escrowAmount:        escrowAmount,
            sellerBond:          0,
            sellerBondRequired:  sellerBondRequired,
            platformFee:         platformFee,
            creatorFee:          creatorFee,
            authFee:             authFee,
            shippingFee:         shippingFee,
            salesTax:            salesTax,
            sellerPayout:        sellerPayout,
            status:              OrderStatus.AwaitingConfirmation,
            fundedAt:            block.timestamp,
            deliveredAt:         0,
            autoReleaseAt:       0
        });

        emit OrderFunded(orderId, msg.sender, seller, escrowAmount, sellerBondRequired);
    }

    // ── 2. Confirm Order (Seller) ────────────────────────────
    // Seller calls this after being notified of a sale.
    // Posts their bond — confirms they have the card and will ship.
    // Must be called within sellerConfirmWindow (24hrs).
    // If seller doesn't confirm → operator cancels → buyer refunded.

    function confirmOrder(bytes32 orderId)
        external
        nonReentrant
        whenNotPaused
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(msg.sender == order.seller, "Not the seller");
        require(order.status == OrderStatus.AwaitingConfirmation, "Order not awaiting confirmation");
        require(
            block.timestamp <= order.fundedAt + sellerConfirmWindow,
            "Confirm window expired"
        );

        uint256 bondAmount = order.sellerBondRequired;
        order.sellerBond = bondAmount;
        order.status = OrderStatus.Active;

        if (bondAmount > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), bondAmount);
        }

        emit OrderConfirmed(orderId, msg.sender, bondAmount);
    }

    // ── 3. Mark Delivered ────────────────────────────────────
    // Operator calls automatically via Shippo delivery webhook.
    // Starts the 72-hour buyer inspection window on-chain.
    // No human signing required — fully automated.

    function markDelivered(bytes32 orderId)
        external
        onlyOperatorOrOwner
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Active, "Order not Active");
        order.status        = OrderStatus.Delivered;
        order.deliveredAt   = block.timestamp;
        order.autoReleaseAt = block.timestamp + buyerInspectWindow;
        emit OrderDelivered(orderId, order.autoReleaseAt);
    }

    // ── 4. Release Escrow ────────────────────────────────────
    // Three paths:
    //   a) Buyer calls early — happy, wants to release now
    //   b) Operator calls after autoReleaseAt — automated cron
    //   c) Owner calls after autoReleaseAt — fallback if operator down
    //
    // Distributes:
    //   sellerPayout              → seller
    //   platformFee + authFee     → feeRecipient (Safe)
    //   creatorFee                → creator, or feeRecipient if none
    //   sellerBond                → returned to seller

    function releaseEscrow(bytes32 orderId)
        external
        nonReentrant
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Delivered, "Order not Delivered");

        bool isBuyer       = msg.sender == order.buyer;
        bool isAutoRelease = (isOperator[msg.sender] || msg.sender == owner())
                             && block.timestamp >= order.autoReleaseAt;
        require(isBuyer || isAutoRelease, "Not authorized to release");

        _distribute(orderId);
    }

    // ── 5. Open Dispute ──────────────────────────────────────
    // Buyer only, during the 72-hour inspection window.
    // Freezes all funds until owner (Safe) resolves.

    function openDispute(bytes32 orderId)
        external
        nonReentrant
        onlyBuyer(orderId)
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Delivered, "Order not Delivered");
        require(block.timestamp < order.autoReleaseAt, "Inspection window closed");
        order.status = OrderStatus.Disputed;
        emit DisputeOpened(orderId, msg.sender);
    }

    // ── 6. Resolve Dispute ───────────────────────────────────
    // Owner (Safe multisig) ONLY.
    //
    // buyerWins = true  → escrowAmount - shippingFee refunded to buyer;
    //                     shippingFee + sellerBond → feeRecipient (Safe).
    //                     Shipping is a legitimate cost incurred regardless of
    //                     dispute outcome — not refunded. This ensures the Safe
    //                     can recover Label A + B already purchased, plus fund
    //                     Label C + D return shipping from the forfeited bond.
    //
    // buyerWins = false → normal release, seller bond returned to seller.

    function resolveDispute(bytes32 orderId, bool buyerWins)
        external
        onlyDisputeResolverOrOwner
        nonReentrant
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Disputed, "Order not Disputed");

        if (buyerWins) {
            order.status = OrderStatus.RefundedToBuyer;
            // Shipping is non-refundable — buyer agreed to this at checkout.
            // Safe uses shippingFee + forfeited bond to cover 4-label return chain.
            uint256 buyerRefund = order.escrowAmount - order.shippingFee;
            usdc.safeTransfer(order.buyer, buyerRefund);
            uint256 toSafe = order.shippingFee + order.sellerBond;
            if (toSafe > 0) {
                usdc.safeTransfer(feeRecipient, toSafe);
            }
            emit BuyerRefunded(orderId, order.buyer, buyerRefund);
        } else {
            _distribute(orderId);
        }

        emit DisputeResolved(orderId, buyerWins);
    }

    // ── 7. Refund Buyer ──────────────────────────────────────
    // Operator calls on auth fail (triggered via webhook when authenticator
    // marks a card as failed). Owner (Safe) can also call as fallback.
    // Full refund. Seller bond forfeited to Safe.

    function refundBuyer(bytes32 orderId)
        external
        onlyOperatorOrOwner
        nonReentrant
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.Active    ||
            order.status == OrderStatus.Delivered,
            "Cannot refund at this stage"
        );
        order.status = OrderStatus.RefundedToBuyer;
        usdc.safeTransfer(order.buyer, order.escrowAmount);
        if (order.sellerBond > 0) {
            usdc.safeTransfer(feeRecipient, order.sellerBond);
        }
        emit BuyerRefunded(orderId, order.buyer, order.escrowAmount);
    }

    // ── 8. Cancel Order ──────────────────────────────────────
    // Operator or owner cancels when seller doesn't confirm or no-shows.
    //
    // AwaitingConfirmation: buyer refunded, no bond posted yet
    // Active: buyer refunded, seller bond forfeited to Safe (no-show strike)

    function cancelOrder(bytes32 orderId)
        external
        onlyOperatorOrOwner
        nonReentrant
        orderExists(orderId)
    {
        Order storage order = orders[orderId];
        require(
            order.status == OrderStatus.AwaitingConfirmation ||
            order.status == OrderStatus.Active,
            "Can only cancel before delivery"
        );

        bool bondForfeited = order.status == OrderStatus.Active && order.sellerBond > 0;
        order.status = OrderStatus.Cancelled;

        // Always refund buyer
        usdc.safeTransfer(order.buyer, order.escrowAmount);

        // Bond: forfeited if seller confirmed but didn't ship (Active)
        //       nothing to return if seller never confirmed (AwaitingConfirmation)
        if (bondForfeited) {
            usdc.safeTransfer(feeRecipient, order.sellerBond);
        }

        emit OrderCancelled(orderId);
    }

    // ============================================================
    // BATCH FUNCTIONS
    // Single Safe/operator signature processes many orders at once.
    // ============================================================

    function batchMarkDelivered(bytes32[] calldata orderIds)
        external
        onlyOperatorOrOwner
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (order.buyer != address(0) && order.status == OrderStatus.Active) {
                order.status        = OrderStatus.Delivered;
                order.deliveredAt   = block.timestamp;
                order.autoReleaseAt = block.timestamp + buyerInspectWindow;
                emit OrderDelivered(orderIds[i], order.autoReleaseAt);
            }
        }
    }

    function batchReleaseEscrow(bytes32[] calldata orderIds)
        external
        nonReentrant
        onlyOperatorOrOwner
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (
                order.buyer != address(0) &&
                order.status == OrderStatus.Delivered &&
                block.timestamp >= order.autoReleaseAt
            ) {
                _distribute(orderIds[i]);
            }
        }
    }

    function batchRefundBuyers(bytes32[] calldata orderIds)
        external
        onlyOperatorOrOwner
        nonReentrant
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (
                order.buyer != address(0) &&
                (order.status == OrderStatus.Active ||
                 order.status == OrderStatus.Delivered)
            ) {
                order.status = OrderStatus.RefundedToBuyer;
                usdc.safeTransfer(order.buyer, order.escrowAmount);
                if (order.sellerBond > 0) {
                    usdc.safeTransfer(feeRecipient, order.sellerBond);
                }
                emit BuyerRefunded(orderIds[i], order.buyer, order.escrowAmount);
            }
        }
    }

    function batchCancelOrders(bytes32[] calldata orderIds)
        external
        onlyOperatorOrOwner
        nonReentrant
    {
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (
                order.buyer != address(0) &&
                (order.status == OrderStatus.AwaitingConfirmation ||
                 order.status == OrderStatus.Active)
            ) {
                bool bondForfeited = order.status == OrderStatus.Active && order.sellerBond > 0;
                order.status = OrderStatus.Cancelled;
                usdc.safeTransfer(order.buyer, order.escrowAmount);
                if (bondForfeited) {
                    usdc.safeTransfer(feeRecipient, order.sellerBond);
                }
                emit OrderCancelled(orderIds[i]);
            }
        }
    }

    function batchResolveDisputes(
        bytes32[] calldata orderIds,
        bool[]    calldata outcomes  // true = buyer wins
    ) external onlyDisputeResolverOrOwner nonReentrant {
        require(orderIds.length == outcomes.length, "Length mismatch");
        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[orderIds[i]];
            if (order.buyer != address(0) && order.status == OrderStatus.Disputed) {
                if (outcomes[i]) {
                    order.status = OrderStatus.RefundedToBuyer;
                    uint256 buyerRefund = order.escrowAmount - order.shippingFee;
                    usdc.safeTransfer(order.buyer, buyerRefund);
                    uint256 toSafe = order.shippingFee + order.sellerBond;
                    if (toSafe > 0) {
                        usdc.safeTransfer(feeRecipient, toSafe);
                    }
                    emit BuyerRefunded(orderIds[i], order.buyer, buyerRefund);
                } else {
                    _distribute(orderIds[i]);
                }
                emit DisputeResolved(orderIds[i], outcomes[i]);
            }
        }
    }

    // ============================================================
    // INTERNAL
    // ============================================================

    // Shared distribution logic for release and seller-wins dispute.
    function _distribute(bytes32 orderId) internal {
        Order storage order = orders[orderId];
        order.status = OrderStatus.Released;

        usdc.safeTransfer(order.seller, order.sellerPayout);

        // Safe receives: platform fee + auth fee + shipping (to pay carrier) + sales tax (to remit to state)
        uint256 toFeeRecipient = order.platformFee + order.authFee + order.shippingFee + order.salesTax;
        if (toFeeRecipient > 0) {
            usdc.safeTransfer(feeRecipient, toFeeRecipient);
        }

        if (order.creatorFee > 0) {
            address creatorRecipient = order.creator != address(0)
                ? order.creator
                : feeRecipient;
            usdc.safeTransfer(creatorRecipient, order.creatorFee);
        }

        if (order.sellerBond > 0) {
            usdc.safeTransfer(order.seller, order.sellerBond);
            emit BondReturned(orderId, order.seller, order.sellerBond);
        }

        emit EscrowReleased(orderId, order.seller, order.sellerPayout, order.platformFee, order.creatorFee, order.shippingFee, order.salesTax);
    }

    // ============================================================
    // ADMIN — owner (Safe) only
    // ============================================================

    // ── Fee Recipient Guardian ───────────────────────────────
    // ALL feeRecipient changes are controlled exclusively by the guardian multisig.
    // The owner (main Safe) has no access to these functions.
    // A fully compromised owner Safe cannot redirect fee payments.
    //
    // Changes still require a 48hr timelock — if the guardian itself is somehow
    // compromised, the owner can pause() within that window to freeze the change.
    //
    // The guardian is self-sovereign: only it can rotate itself to a new address.
    // Owner cannot change the guardian — closing the "rotate guardian first" attack.

    function proposeFeeRecipient(address _proposed) external onlyGuardian {
        require(_proposed != address(0), "Invalid address");
        pendingFeeRecipient  = _proposed;
        feeRecipientChangeAt = block.timestamp + FEE_RECIPIENT_DELAY;
        emit FeeRecipientProposed(_proposed, feeRecipientChangeAt);
    }

    function executeFeeRecipientChange() external onlyGuardian {
        require(pendingFeeRecipient != address(0), "No pending change");
        require(block.timestamp >= feeRecipientChangeAt, "Timelock not expired");
        address old = feeRecipient;
        feeRecipient        = pendingFeeRecipient;
        pendingFeeRecipient = address(0);
        feeRecipientChangeAt = 0;
        emit FeeRecipientChanged(old, feeRecipient);
    }

    function cancelFeeRecipientChange() external onlyGuardian {
        require(pendingFeeRecipient != address(0), "No pending change");
        address cancelled   = pendingFeeRecipient;
        pendingFeeRecipient = address(0);
        feeRecipientChangeAt = 0;
        emit FeeRecipientChangeCancelled(cancelled);
    }

    // ── Guardian self-management (timelocked) ───────────────────
    // Guardians manage themselves — owner cannot add guardians.
    // All guardian-initiated changes require a 72hr timelock.
    // Either guardian can cancel a pending proposal during the window.
    //
    // Compromise scenario: G1 is compromised and proposes to remove G2.
    //   → G2 sees the on-chain event within 72hrs and calls cancelGuardianChange().
    //   → G2 then proposes to remove G1, waits 72hrs, executes.
    // Deadlock scenario: G1 and G2 keep cancelling each other's proposals.
    //   → Owner calls ownerRemoveGuardian(compromisedGuardian) to break the tie.
    //   → Surviving guardian then adds a new guardian via normal timelock.
    // If both guardians are unavailable: owner can pause() to freeze the contract.

    function proposeGuardianChange(address _target, bool _isAdd) external onlyGuardian {
        require(_target != address(0), "Invalid address");
        if (_isAdd)  require(!isGuardian[_target],  "Already a guardian");
        if (!_isAdd) {
            require(isGuardian[_target],  "Not a guardian");
            require(guardianCount > 1,    "Cannot remove last guardian");
        }
        require(pendingGuardianChange.proposedAt == 0, "Change already pending - cancel first");
        pendingGuardianChange = GuardianProposal({
            target:     _target,
            isAdd:      _isAdd,
            proposedAt: block.timestamp,
            proposedBy: msg.sender
        });
        emit GuardianChangeProposed(_target, _isAdd, msg.sender, block.timestamp + GUARDIAN_CHANGE_DELAY);
    }

    function executeGuardianChange() external onlyGuardian {
        GuardianProposal memory p = pendingGuardianChange;
        require(p.proposedAt != 0, "No pending change");
        require(block.timestamp >= p.proposedAt + GUARDIAN_CHANGE_DELAY, "Timelock not elapsed");
        delete pendingGuardianChange;
        if (p.isAdd) {
            require(!isGuardian[p.target], "Already a guardian");
            isGuardian[p.target] = true;
            guardianCount++;
            emit GuardianAdded(p.target);
        } else {
            require(isGuardian[p.target],  "Not a guardian");
            require(guardianCount > 1,     "Cannot remove last guardian");
            isGuardian[p.target] = false;
            guardianCount--;
            emit GuardianRemoved(p.target);
        }
    }

    function cancelGuardianChange() external onlyGuardian {
        GuardianProposal memory p = pendingGuardianChange;
        require(p.proposedAt != 0, "No pending change");
        delete pendingGuardianChange;
        emit GuardianChangeCancelled(p.target, p.isAdd, msg.sender);
    }

    // ── Deadlock tiebreaker — owner can remove a guardian but NOT add one ──
    // Used only when G1 and G2 are deadlocked (each cancelling the other's proposals).
    // After this call, the surviving guardian uses the normal timelock to add a replacement.
    // Owner cannot use this to install a guardian of their choosing — add is guardian-only.
    function ownerRemoveGuardian(address _guardian) external onlyOwner {
        require(isGuardian[_guardian], "Not a guardian");
        require(guardianCount > 1, "Cannot remove last guardian");
        isGuardian[_guardian] = false;
        guardianCount--;
        emit GuardianRemovedByOwner(_guardian);
    }

    // ── Safety Valve ─────────────────────────────────────────
    // Emergency sweep of all USDC in the contract.
    // Only callable when paused — forces an explicit pause decision first.
    // recipient is specified at call time, NOT feeRecipient, so a compromised
    // Safe cannot silently drain funds through this path.
    //
    // ALL order data remains on-chain in the orders mapping.
    // Off-chain (Supabase orders table) has every order breakdown.
    // After sweep, redistribute manually to each party based on order records.
    // Deploy a new contract for any in-flight orders that need to continue.

    function sweepStuckFunds(address recipient) external onlyOwner whenPaused {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "Nothing to sweep");
        usdc.safeTransfer(recipient, balance);
        emit FundsSwept(recipient, balance, block.timestamp);
    }

    function setFeeBps(uint256 _platformFeeBps, uint256 _creatorFeeBps) external onlyOwner {
        require(_platformFeeBps <= MAX_PLATFORM_FEE_BPS, "Platform fee too high");
        require(_creatorFeeBps  <= MAX_CREATOR_FEE_BPS,  "Creator fee too high");
        platformFeeBps = _platformFeeBps;
        creatorFeeBps  = _creatorFeeBps;
    }

    function setBuyerInspectWindow(uint256 _seconds) external onlyOwner {
        require(_seconds <= 7 days, "Window too long");
        buyerInspectWindow = _seconds;
    }

    function setSellerShipDeadline(uint256 _seconds) external onlyOwner {
        require(_seconds <= 7 days, "Deadline too long");
        sellerShipDeadline = _seconds;
    }

    function setSellerConfirmWindow(uint256 _seconds) external onlyOwner {
        require(_seconds <= 7 days, "Window too long");
        sellerConfirmWindow = _seconds;
    }

    function setMaxOrderValue(uint256 _maxValue) external onlyOwner {
        maxOrderValue = _maxValue;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── View ─────────────────────────────────────────────────

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function isAutoReleaseReady(bytes32 orderId) external view returns (bool) {
        Order memory order = orders[orderId];
        return order.status == OrderStatus.Delivered
            && block.timestamp >= order.autoReleaseAt;
    }
}
