// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract DocumentVerification is AccessControlEnumerable {
    bytes32 public constant SUPER_ADMIN_ROLE = keccak256("SUPER_ADMIN_ROLE");
    bytes32 public constant DOMAIN_ADMIN_ROLE = keccak256("DOMAIN_ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    struct Version {
        bytes32 hash;
        string cid;
        uint256 uploadedAt;
        uint256 approvalsRequired;
        bool revoked;
        mapping(address => bool) approvedBy;
        address[] approvers;
    }

    struct Document {
        bytes32 docId;
        string title;
        string domain;
        string description;
        uint256 versionCount;
        mapping(uint256 => Version) versions;
        address[] orgs;
    }

    struct DomainInfo {
        string domainName;
        mapping(address => bool) verifiers;
    }

    mapping(bytes32 => Document) private documents;
    mapping(string => DomainInfo) private domains;

    event DocumentUploaded(bytes32 docId, address uploader, uint256 versionIndex, string cid);
    event DocumentVerified(bytes32 docId, uint256 versionIndex, address verifier);
    event DocumentRevoked(bytes32 docId, uint256 versionIndex);
    event DomainAdminAdded(string domain, address admin);
    event DomainVerifierAdded(string domain, address verifier);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SUPER_ADMIN_ROLE, msg.sender);
    }

    // -------------------------
    // SUPER ADMIN FUNCTIONS
    // -------------------------
    function addDomainAdmin(string calldata domain, address admin) external onlyRole(SUPER_ADMIN_ROLE) {
        _grantRole(DOMAIN_ADMIN_ROLE, admin);
        domains[domain].domainName = domain;
        emit DomainAdminAdded(domain, admin);
    }

    // -------------------------
    // DOMAIN ADMIN FUNCTIONS
    // -------------------------
    function addDomainVerifier(string calldata domain, address verifier) external onlyRole(DOMAIN_ADMIN_ROLE) {
        require(bytes(domains[domain].domainName).length != 0, "Domain not exists");
        domains[domain].verifiers[verifier] = true;
        _grantRole(VERIFIER_ROLE, verifier);
        emit DomainVerifierAdded(domain, verifier);
    }

    // -------------------------
    // INTERNAL DOCUMENT UPLOAD
    // -------------------------
    function _uploadDocument(
        bytes32 docId,
        string memory title,
        string memory domain,
        string memory description,
        string memory cid,
        uint256 approvalsRequired,
        address[] calldata orgs
    ) internal {
        Document storage doc = documents[docId];

        if(doc.versionCount == 0) {
            // first version
            doc.docId = docId;
            doc.title = title;
            doc.domain = domain;
            doc.description = description;
            doc.versionCount = 1;
            doc.orgs = orgs;

            Version storage ver = doc.versions[1];
            ver.hash = docId;
            ver.cid = cid;
            ver.uploadedAt = block.timestamp;
            ver.approvalsRequired = approvalsRequired;
            ver.revoked = false;

            emit DocumentUploaded(docId, msg.sender, 1, cid);
        } else {
            // additional version
            doc.versionCount++;
            uint256 versionIndex = doc.versionCount;

            Version storage ver = doc.versions[versionIndex];
            ver.hash = keccak256(abi.encodePacked(docId, versionIndex, block.timestamp));
            ver.cid = cid;
            ver.uploadedAt = block.timestamp;
            ver.approvalsRequired = approvalsRequired;
            ver.revoked = false;
            doc.orgs = orgs;

            emit DocumentUploaded(docId, msg.sender, versionIndex, cid);
        }
    }

    // -------------------------
    // EXTERNAL DOCUMENT UPLOAD
    // -------------------------
    function uploadDocument(
        bytes32 docId,
        string calldata title,
        string calldata domain,
        string calldata description,
        string calldata cid,
        uint256 approvalsRequired,
        address[] calldata orgs
    ) external {
        _uploadDocument(docId, title, domain, description, cid, approvalsRequired, orgs);
    }

    function batchUpload(
        bytes32[] calldata docIds,
        string[] calldata titles,
        string[] calldata domains_,
        string[] calldata descriptions,
        string[] calldata cids,
        uint256[] calldata approvalsRequired,
        address[][] calldata orgs
    ) external {
        require(
            docIds.length == titles.length &&
            titles.length == domains_.length &&
            domains_.length == descriptions.length &&
            descriptions.length == cids.length &&
            cids.length == approvalsRequired.length &&
            approvalsRequired.length == orgs.length,
            "Array mismatch"
        );

        for (uint i = 0; i < docIds.length; i++) {
            _uploadDocument(docIds[i], titles[i], domains_[i], descriptions[i], cids[i], approvalsRequired[i], orgs[i]);
        }
    }

    // -------------------------
    // DOCUMENT FUNCTIONS
    // -------------------------
    function addVersion(
        bytes32 docId,
        string calldata cid,
        uint256 approvalsRequired,
        address[] calldata orgs
    ) external {
        require(documents[docId].versionCount > 0, "Document not exists");
        _uploadDocument(docId, documents[docId].title, documents[docId].domain, documents[docId].description, cid, approvalsRequired, orgs);
    }

    function verifyDocument(bytes32 docId, uint256 versionIndex) external onlyRole(VERIFIER_ROLE) {
        Document storage doc = documents[docId];
        require(versionIndex <= doc.versionCount, "Version not exists");

        Version storage ver = doc.versions[versionIndex];
        require(!ver.revoked, "Version revoked");

        bool eligible = false;
        for (uint i = 0; i < doc.orgs.length; i++) {
            if(doc.orgs[i] == msg.sender) {
                eligible = true;
                break;
            }
        }
        require(eligible, "Not authorized");
        require(!ver.approvedBy[msg.sender], "Already approved");

        ver.approvedBy[msg.sender] = true;
        ver.approvers.push(msg.sender);

        emit DocumentVerified(docId, versionIndex, msg.sender);
    }

    function revokeDocument(bytes32 docId, uint256 versionIndex) external {
        Document storage doc = documents[docId];
        require(hasRole(SUPER_ADMIN_ROLE, msg.sender) || hasRole(DOMAIN_ADMIN_ROLE, msg.sender), "Not authorized");
        Version storage ver = doc.versions[versionIndex];
        ver.revoked = true;

        emit DocumentRevoked(docId, versionIndex);
    }

    // -------------------------
    // GETTERS
    // -------------------------
    function getDocument(bytes32 docId) external view returns (
        string memory title,
        string memory domain,
        string memory description,
        uint256 versionCount,
        address[] memory orgs
    ) {
        Document storage doc = documents[docId];
        return (doc.title, doc.domain, doc.description, doc.versionCount, doc.orgs);
    }

    function getVersion(bytes32 docId, uint256 versionIndex) external view returns (
        bytes32 hash,
        string memory cid,
        uint256 uploadedAt,
        uint256 approvalsRequired,
        uint256 approvalsDone,
        bool revoked,
        address[] memory approvers
    ) {
        Document storage doc = documents[docId];
        Version storage ver = doc.versions[versionIndex];
        return (
            ver.hash,
            ver.cid,
            ver.uploadedAt,
            ver.approvalsRequired,
            ver.approvers.length,
            ver.revoked,
            ver.approvers
        );
    }

    function isVerified(bytes32 docId, uint256 versionIndex) external view returns (bool) {
        Document storage doc = documents[docId];
        Version storage ver = doc.versions[versionIndex];
        return ver.approvers.length >= ver.approvalsRequired;
    }

    // -------------------------
    // ROLE MEMBER HELPERS
    // -------------------------
    function fetchRoleMemberCount(bytes32 role) external view returns (uint256) {
        return getRoleMemberCount(role);
    }

    function fetchRoleMembers(bytes32 role) external view returns (address[] memory members) {
        uint256 count = getRoleMemberCount(role);
        members = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            members[i] = getRoleMember(role, i);
        }
    }
}
