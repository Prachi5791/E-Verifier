// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract DocumentVerificationV2 is AccessControlEnumerable {
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    struct Version {
        bytes32 hash;
        string cid;
        bool verified;
        address verifier;
        uint64 uploadedAt;
    }

    struct DocRoot {
        address uploader;
        bool revoked;
        uint64 createdAt;
        string domain;
        string title;
        string description;
        uint64 expiresAt; // unix time, 0 = no expiry
        bytes32[] versions;
    }

    mapping(bytes32 => DocRoot) private roots;
    mapping(bytes32 => Version) private ver;
    mapping(bytes32 => bytes32) private versionToRoot;

    event RootCreated(bytes32 indexed rootHash, address indexed uploader);
    event VersionAdded(bytes32 indexed rootHash, bytes32 indexed versionHash, string cid);
    event VersionStatus(bytes32 indexed versionHash, address indexed verifier, bool status);
    event RootRevoked(bytes32 indexed rootHash, address indexed admin, string reason);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    // 🔹 internal helper
    function _uploadDocumentRoot(
        bytes32 rootHash,
        string calldata cid,
        string calldata domain,
        string calldata title,
        string calldata description,
        uint64 expiresAt
    ) internal {
        require(roots[rootHash].createdAt == 0, "Root exists");
        require(rootHash != bytes32(0), "Invalid hash");

        DocRoot storage r = roots[rootHash];
        r.uploader = msg.sender;
        r.revoked = false;
        r.createdAt = uint64(block.timestamp);
        r.domain = domain;
        r.title = title;
        r.description = description;
        r.expiresAt = expiresAt;

        ver[rootHash] = Version({
            hash: rootHash,
            cid: cid,
            verified: false,
            verifier: address(0),
            uploadedAt: uint64(block.timestamp)
        });
        r.versions.push(rootHash);
        versionToRoot[rootHash] = rootHash;

        emit RootCreated(rootHash, msg.sender);
        emit VersionAdded(rootHash, rootHash, cid);
    }

    // public function
    function uploadDocumentRoot(
        bytes32 rootHash,
        string calldata cid,
        string calldata domain,
        string calldata title,
        string calldata description,
        uint64 expiresAt
    ) external {
        _uploadDocumentRoot(rootHash, cid, domain, title, description, expiresAt);
    }

    function addVersion(bytes32 rootHash, bytes32 newVersionHash, string calldata cid) external {
        require(roots[rootHash].createdAt != 0, "Root not found");
        require(!roots[rootHash].revoked, "Root revoked");
        require(ver[newVersionHash].uploadedAt == 0, "Version exists");

        ver[newVersionHash] = Version({
            hash: newVersionHash,
            cid: cid,
            verified: false,
            verifier: address(0),
            uploadedAt: uint64(block.timestamp)
        });
        roots[rootHash].versions.push(newVersionHash);
        versionToRoot[newVersionHash] = rootHash;

        emit VersionAdded(rootHash, newVersionHash, cid);
    }

    function setVerificationStatus(bytes32 versionHash, bool status) external onlyRole(VERIFIER_ROLE) {
        require(ver[versionHash].uploadedAt != 0, "Version not found");
        bytes32 rootHash = versionToRoot[versionHash];
        require(roots[rootHash].createdAt != 0, "Root not found");
        require(!roots[rootHash].revoked, "Root revoked");
        if (roots[rootHash].expiresAt != 0) require(block.timestamp <= roots[rootHash].expiresAt, "Root expired");

        ver[versionHash].verified = status;
        ver[versionHash].verifier = msg.sender;
        emit VersionStatus(versionHash, msg.sender, status);
    }

    function revokeRoot(bytes32 rootHash, string calldata reason) external onlyAdmin {
        require(roots[rootHash].createdAt != 0, "Root not found");
        roots[rootHash].revoked = true;
        emit RootRevoked(rootHash, msg.sender, reason);
    }

    function getRoot(bytes32 rootHash) external view returns (
        address uploader, bool revoked, uint64 createdAt,
        string memory domain, string memory title, string memory description,
        uint64 expiresAt, bytes32[] memory versions
    ) {
        DocRoot storage r = roots[rootHash];
        require(r.createdAt != 0, "Root not found");
        return (r.uploader, r.revoked, r.createdAt, r.domain, r.title, r.description, r.expiresAt, r.versions);
    }

    function getVersion(bytes32 versionHash) external view returns (
        bytes32 hash, string memory cid, bool verified, address verifier, uint64 uploadedAt
    ) {
        Version storage v = ver[versionHash];
        require(v.uploadedAt != 0, "Version not found");
        return (v.hash, v.cid, v.verified, v.verifier, v.uploadedAt);
    }

    function getRoleMembers(bytes32 role) external view returns (address[] memory) {
        uint256 count = getRoleMemberCount(role);
        address[] memory members = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            members[i] = getRoleMember(role, i);
        }
        return members;
    }

    function uploadBatch(
        bytes32[] calldata rootHashes,
        string[] calldata cids,
        string[] calldata domains,
        string[] calldata titles,
        string[] calldata descriptions,
        uint64[] calldata expiresAts
    ) external {
        uint256 n = rootHashes.length;
        require(
            n == cids.length &&
            n == domains.length &&
            n == titles.length &&
            n == descriptions.length &&
            n == expiresAts.length,
            "Array mismatch"
        );
        for (uint256 i = 0; i < n; i++) {
            _uploadDocumentRoot(rootHashes[i], cids[i], domains[i], titles[i], descriptions[i], expiresAts[i]);
        }
    }
}
