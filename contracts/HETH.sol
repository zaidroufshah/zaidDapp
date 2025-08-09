// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HETH - Hardhat ETH Token
 * @dev ERC-20 token for the microloan DApp
 * Initial supply of 1,000,000 HETH tokens minted to the deployer
 */
contract HETH is ERC20, Ownable {
    constructor() ERC20("Hardhat ETH", "HETH") Ownable(msg.sender) {
        // Mint initial supply of 1,000,000 HETH to the deployer
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    /**
     * @dev Mint new tokens (only owner can call this)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from caller's account
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
} 