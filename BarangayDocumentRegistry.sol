// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BarangayDocumentRegistry
/// @notice On-chain registry for barangay documents with expiration and revocation support.
/// @dev Deployed on Sepolia testnet. Uses docHash as the primary key.
contract BarangayDocumentRegistry {

    // -------------------------------------------------------------------------
    // Data Structures
    // -------------------------------------------------------------------------

    struct Document {
        bytes32    docHash;
        string     documentType;
        address    recordedBy;
        uint256    timestamp;
        uint256    expiresAt;
        bool       isRevoked;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @dev Primary store: document hash → Document struct
    mapping(bytes32 => Document) private _documents;

    /// @dev Tracks whether a hash slot has been written to (idempotency guard)
    mapping(bytes32 => bool) private _exists;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event DocumentRecorded(
        bytes32 indexed docHash,
        string          documentType,
        address indexed recordedBy,
        uint256         timestamp,
        uint256         expiresAt
    );

    event DocumentRevoked(
        bytes32 indexed docHash,
        address indexed revokedBy,
        uint256         timestamp
    );

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    /// @dev Reverts when the caller tries to record a hash that already exists.
    error DocumentAlreadyRecorded(bytes32 docHash);

    /// @dev Reverts when operating on a hash that has never been recorded.
    error DocumentNotFound(bytes32 docHash);

    /// @dev Reverts when trying to revoke an already-revoked document.
    error DocumentAlreadyRevoked(bytes32 docHash);

    /// @dev Reverts when expiresAt is not in the future.
    error InvalidExpiresAt(uint256 provided, uint256 current);

    // -------------------------------------------------------------------------
    // Write Functions
    // -------------------------------------------------------------------------

    /// @notice Record a new document on-chain.
    /// @param docHash      SHA-256 (or equivalent) hash of the document payload.
    /// @param documentType Human-readable type label, e.g. "barangay-clearance".
    /// @param expiresAt    Unix timestamp after which the document is considered expired.
    ///                     Must be strictly greater than block.timestamp.
    function recordDocument(
        bytes32        docHash,
        string calldata documentType,
        uint256        expiresAt
    ) external {
        // Idempotency guard — prevent overwriting an existing record
        if (_exists[docHash]) {
            revert DocumentAlreadyRecorded(docHash);
        }

        // Expiry sanity check
        if (expiresAt <= block.timestamp) {
            revert InvalidExpiresAt(expiresAt, block.timestamp);
        }

        _documents[docHash] = Document({
            docHash:      docHash,
            documentType: documentType,
            recordedBy:   msg.sender,
            timestamp:    block.timestamp,
            expiresAt:    expiresAt,
            isRevoked:    false
        });

        _exists[docHash] = true;

        emit DocumentRecorded(
            docHash,
            documentType,
            msg.sender,
            block.timestamp,
            expiresAt
        );
    }

    /// @notice Revoke a previously recorded document.
    /// @dev Any address may call this. Add access-control (e.g. Ownable) if needed.
    /// @param docHash Hash of the document to revoke.
    function revokeDocument(bytes32 docHash) external {
        if (!_exists[docHash]) {
            revert DocumentNotFound(docHash);
        }

        Document storage doc = _documents[docHash];

        if (doc.isRevoked) {
            revert DocumentAlreadyRevoked(docHash);
        }

        doc.isRevoked = true;

        emit DocumentRevoked(docHash, msg.sender, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Read Functions
    // -------------------------------------------------------------------------

    /// @notice Verify and retrieve all metadata for a document.
    /// @param docHash Hash of the document to look up.
    /// @return exists       Whether the document has been recorded.
    /// @return recordedBy   Address that submitted the recordDocument transaction.
    /// @return timestamp    Block timestamp at the time of recording.
    /// @return documentType The type label stored at record time.
    /// @return isRevoked    Whether the document has been revoked.
    /// @return expiresAt    Unix timestamp after which the document expires.
    /// @return isExpired    True if block.timestamp > expiresAt.
    function verifyDocument(bytes32 docHash)
        external
        view
        returns (
            bool    exists,
            address recordedBy,
            uint256 timestamp,
            string  memory documentType,
            bool    isRevoked,
            uint256 expiresAt,
            bool    isExpired
        )
    {
        exists = _exists[docHash];

        if (!exists) {
            // Return zero-value defaults; caller checks `exists` first
            return (false, address(0), 0, "", false, 0, false);
        }

        Document storage doc = _documents[docHash];

        recordedBy   = doc.recordedBy;
        timestamp    = doc.timestamp;
        documentType = doc.documentType;
        isRevoked    = doc.isRevoked;
        expiresAt    = doc.expiresAt;
        isExpired    = block.timestamp > doc.expiresAt;
    }
}
