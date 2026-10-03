// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title dein.art page claims
/// @notice An artist claims the dein.art page of their wallet by calling `claim` from that wallet.
/// A claim is keyed by the caller's own address, so nobody can claim a page for a wallet they do not hold,
/// and nobody can block the real holder. The site shows a page as claimed when `claimedAt(wallet)` is not zero.
contract DeinArtClaims {
    /// @notice When each wallet claimed its page (seconds since 1970), or zero if it has not.
    mapping(address => uint256) public claimedAt;
    /// @notice Where the artist wants their page to point: a dein.art page id, a site or a profile. Optional.
    mapping(address => string) public profile;

    event Claimed(address indexed wallet, string profile, uint256 at);
    event Released(address indexed wallet, uint256 at);

    /// @notice Claim the page of the calling wallet. Calling it again updates the profile.
    function claim(string calldata profile_) external {
        if (claimedAt[msg.sender] == 0) claimedAt[msg.sender] = block.timestamp;
        profile[msg.sender] = profile_;
        emit Claimed(msg.sender, profile_, block.timestamp);
    }

    /// @notice Give up the claim of the calling wallet.
    function release() external {
        require(claimedAt[msg.sender] != 0, "not claimed");
        delete claimedAt[msg.sender];
        delete profile[msg.sender];
        emit Released(msg.sender, block.timestamp);
    }
}
