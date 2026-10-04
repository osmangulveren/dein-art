// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title dein.art splits
/// @notice Whoever releases a film records who made it and each person's share. Support sent to the film is paid out
/// in those shares in the same transaction, minus one flat fee. Nothing is held: the contract passes money on.
contract DeinArtSplits {
    struct Film {
        address owner;        // the wallet that released the film and recorded its split
        address[] payees;
        uint16[] shares;      // in hundredths of a percent; they add up to 10000
        uint256 received;     // everything ever sent to this film
        uint32 times;         // how many times
    }

    mapping(bytes32 => Film) private films;
    /// @notice What each wallet has been paid from each film.
    mapping(bytes32 => mapping(address => uint256)) public paid;
    /// @notice What each wallet has been paid in all.
    mapping(address => uint256) public earned;
    /// @notice A payment that a wallet could not receive waits here until that wallet calls `withdraw`.
    mapping(address => uint256) public owed;

    address public admin;
    address public treasury;
    /// @notice The flat fee taken from each payment, in wei.
    uint256 public fee;
    uint256 public constant MAX_FEE = 0.01 ether;

    event Registered(bytes32 indexed film, address indexed owner, string key, address[] payees, uint16[] shares);
    event Supported(bytes32 indexed film, address indexed from, uint256 amount, uint256 fee);
    event Paid(bytes32 indexed film, address indexed to, uint256 amount);

    constructor(address treasury_, uint256 fee_) {
        require(fee_ <= MAX_FEE, "fee too high");
        admin = msg.sender;
        treasury = treasury_ == address(0) ? msg.sender : treasury_;
        fee = fee_;
    }

    /// @notice The number a film is known by here: its address on dein.art together with the wallet that released it.
    /// Because the wallet is part of it, nobody can record a split for someone else's film.
    function filmId(address owner, string calldata key) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(owner, key));
    }

    /// @notice Record, or change, who is paid from one of your films.
    function register(string calldata key, address[] calldata payees, uint16[] calldata shares) external {
        bytes32 film = filmId(msg.sender, key);
        Film storage f = films[film];
        require(payees.length > 0 && payees.length <= 40 && payees.length == shares.length, "bad split");
        uint256 sum;
        for (uint256 i = 0; i < payees.length; i++) {
            require(payees[i] != address(0) && shares[i] > 0, "empty share");
            sum += shares[i];
        }
        require(sum == 10000, "shares must add up to 100%");
        f.owner = msg.sender;
        f.payees = payees;
        f.shares = shares;
        emit Registered(film, msg.sender, key, payees, shares);
    }

    /// @notice Send support to a film. It is split and paid out at once.
    function support(bytes32 film) external payable {
        Film storage f = films[film];
        require(f.owner != address(0), "no such film");
        require(msg.value > fee, "too small");
        f.received += msg.value;
        f.times += 1;
        emit Supported(film, msg.sender, msg.value, fee);
        uint256 rest = msg.value - fee;
        uint256 left = rest;
        uint256 n = f.payees.length;
        for (uint256 i = 0; i < n; i++) {
            // the last person takes what rounding left over, so every wei is paid
            uint256 amount = i == n - 1 ? left : (rest * f.shares[i]) / 10000;
            left -= amount;
            paid[film][f.payees[i]] += amount;
            _send(f.payees[i], amount);
            emit Paid(film, f.payees[i], amount);
        }
        if (fee > 0) _send(treasury, fee);
    }

    /// @dev A wallet that refuses money must not stop the others from being paid: its amount waits in `owed`.
    function _send(address to, uint256 amount) private {
        earned[to] += amount;
        (bool ok, ) = to.call{value: amount, gas: 30000}("");
        if (!ok) owed[to] += amount;
    }

    /// @notice Collect a payment that could not be delivered.
    function withdraw() external {
        uint256 amount = owed[msg.sender];
        require(amount > 0, "nothing owed");
        owed[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "could not send");
    }

    /// @notice Who is paid from a film, in what shares, and what it has received so far.
    function splitOf(bytes32 film) external view returns (address owner, address[] memory payees, uint16[] memory shares, uint256 received, uint32 times) {
        Film storage f = films[film];
        return (f.owner, f.payees, f.shares, f.received, f.times);
    }

    function setFee(uint256 fee_) external {
        require(msg.sender == admin, "not the admin");
        require(fee_ <= MAX_FEE, "fee too high");
        fee = fee_;
    }

    function setTreasury(address treasury_) external {
        require(msg.sender == admin && treasury_ != address(0), "not the admin");
        treasury = treasury_;
    }
}
