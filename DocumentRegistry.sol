// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DocumentRegistry
 * @notice Records barangay document hashes on-chain and supports revocation.
 */
contract DocumentRegistry {
    struct DocumentRecord {
        bool   exists;
        address recordedBy;
        uint256 timestamp;
        string  documentType;
    }

    mapping(bytes32 => DocumentRecord) private _records;
    mapping(bytes32 => bool)           public  revoked;

    address public owner;

    event DocumentRecorded(bytes32 indexed docHash, address indexed recordedBy, string documentType);
    event DocumentRevoked (bytes32 indexed docHash, address indexed revokedBy);

    error AlreadyRecorded();
    error NotFound();
    error AlreadyRevoked();
    error Unauthorized();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    // ── Record ────────────────────────────────────────────────────────────────

    function recordDocument(bytes32 docHash, string calldata documentType) external {
        if (_records[docHash].exists) revert AlreadyRecorded();
        _records[docHash] = DocumentRecord({
            exists:       true,
            recordedBy:   msg.sender,
            timestamp:    block.timestamp,
            documentType: documentType
        });
        emit DocumentRecorded(docHash, msg.sender, documentType);
    }

    // ── Revoke ────────────────────────────────────────────────────────────────

    function revokeDocument(bytes32 docHash) external onlyOwner {
        if (!_records[docHash].exists) revert NotFound();
        if (revoked[docHash])          revert AlreadyRevoked();
        revoked[docHash] = true;
        emit DocumentRevoked(docHash, msg.sender);
    }

    // ── Verify ────────────────────────────────────────────────────────────────

    function verifyDocument(bytes32 docHash)
        external
        view
        returns (
            bool   exists,
            address recordedBy,
            uint256 timestamp,
            string memory documentType,
            bool   isRevoked
        )
    {
        DocumentRecord storage r = _records[docHash];
        return (
            r.exists,
            r.recordedBy,
            r.timestamp,
            r.documentType,
            revoked[docHash]
        );
    }
}
