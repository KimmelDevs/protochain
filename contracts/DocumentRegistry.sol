// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  DocumentRegistry
 * @notice Records and verifies SHA-256 hashes of barangay documents on-chain.
 *         Only the contract owner (the deployer wallet) may record new hashes,
 *         preventing arbitrary writes from residents.
 *         Anyone may call verifyDocument() — no wallet required for read calls.
 */
contract DocumentRegistry {

    // ── Storage ───────────────────────────────────────────────────────────────

    struct DocRecord {
        bool   exists;
        address recordedBy;
        uint256 timestamp;
        string  documentType;
    }

    /// @dev docHash (bytes32) → record
    mapping(bytes32 => DocRecord) private _records;

    /// @dev Only this address can record new documents
    address public owner;

    // ── Events ────────────────────────────────────────────────────────────────

    event DocumentRecorded(
        bytes32 indexed docHash,
        address indexed recordedBy,
        uint256 timestamp,
        string  documentType
    );

    // ── Errors ────────────────────────────────────────────────────────────────

    error NotOwner();
    error AlreadyRecorded(bytes32 docHash);
    error EmptyDocumentType();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * @notice Record a document hash on-chain.
     * @dev    Can only be called by the owner (admin wallet via MetaMask).
     *         Reverts if the hash was already recorded or documentType is empty.
     * @param  docHash      SHA-256 hash of the document (bytes32)
     * @param  documentType Human-readable type, e.g. "barangay-clearance"
     */
    function recordDocument(
        bytes32 docHash,
        string calldata documentType
    ) external onlyOwner {
        if (_records[docHash].exists) revert AlreadyRecorded(docHash);
        if (bytes(documentType).length == 0) revert EmptyDocumentType();

        _records[docHash] = DocRecord({
            exists:       true,
            recordedBy:   msg.sender,
            timestamp:    block.timestamp,
            documentType: documentType
        });

        emit DocumentRecorded(docHash, msg.sender, block.timestamp, documentType);
    }

    /**
     * @notice Transfer ownership to a new admin wallet.
     * @param  newOwner  Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * @notice Check whether a document hash is registered.
     * @param  docHash  SHA-256 hash to look up
     * @return exists        true if the hash was recorded
     * @return recordedBy    wallet that recorded it
     * @return timestamp     Unix timestamp of the recording
     * @return documentType  document type string
     */
    function verifyDocument(bytes32 docHash)
        external
        view
        returns (
            bool    exists,
            address recordedBy,
            uint256 timestamp,
            string  memory documentType
        )
    {
        DocRecord storage r = _records[docHash];
        return (r.exists, r.recordedBy, r.timestamp, r.documentType);
    }
}
