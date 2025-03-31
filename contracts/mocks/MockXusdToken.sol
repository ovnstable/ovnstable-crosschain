// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IXusdToken.sol";

contract MockXusdToken is ERC20 {

    uint256 private _totalSupply;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function rebaseOptOut(address _address) public {
    
    }

    function rebaseOptIn(address _address) public {

    }

    function rebasingCreditsPerTokenHighres() public view returns (uint256) {
        return 10 ** 54;
    }

    function changeSupply(uint256 newTotalSupply) public returns (NonRebaseInfo[] memory nonRebaseInfo, uint256 nonRebaseDelta) {
        _totalSupply = newTotalSupply;
    }
}   