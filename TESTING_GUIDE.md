
# Testing Guide - NEAR Certificate System

## Sample Accounts (Meteor Wallet)

### Admin Accounts
- **Admin**: `achievo.testnet`
- **Superuser**: `achievo-admin.testnet`

### User Accounts  
- **Student**: `achievo-student.testnet`
- **Organization**: `achievo-org.testnet`

## Setup Sample Data

### 1. Initialize Sample Data
```bash
POST /api/admin/init-sample-data
Headers: { "wallet_address": "achievo.testnet" }
```

### 2. Get Sample Data Info
```bash
GET /api/admin/sample-data-info
```

## Testing Scenarios

### Authentication Testing

#### Register Individual Student
```bash
POST /api/auth/register-individual
Content-Type: application/json

{
  "name": "New Student",
  "dob": "1999-01-01", 
  "email": "newstudent@test.com",
  "wallet_address": "new-student.testnet"
}
```

#### Register Organization
```bash
POST /api/auth/register-organization
Content-Type: application/json

{
  "name": "New Academy",
  "contact_info": {
    "email": "contact@newacademy.com",
    "phone": "+1-555-0199"
  },
  "wallet_address": "new-academy.testnet"
}
```

### Certificate Testing

#### Issue Certificate (as Organization)
```bash
POST /api/certificates/issue
Content-Type: application/json

{
  "learner_wallet": "achievo-student.testnet",
  "course_id": "BLOCKCHAIN_101",
  "course_name": "Introduction to Blockchain", 
  "organization_wallet": "achievo-org.testnet",
  "skills": ["blockchain", "cryptocurrency"],
  "grade": "A"
}
```

#### Validate Certificate
```bash
POST /api/validation/verify
Content-Type: application/json

{
  "certificate_id": "your-certificate-id"
}
```

### Rewards Testing

#### Grant Reward (as Organization)
```bash
POST /api/rewards/grant
Content-Type: application/json

{
  "learner_wallet": "achievo-student.testnet",
  "certificate_id": "your-certificate-id",
  "reward_type": "completion_bonus",
  "amount": "10",
  "organization_wallet": "achievo-org.testnet"
}
```

#### List Student Rewards
```bash
GET /api/rewards/list/achievo-student.testnet
```

### Admin Testing

#### Verify Organization (Admin only)
```bash
POST /api/admin/verify-organization/org-doc-id
Headers: { "wallet_address": "achievo.testnet" }
```

#### List All Users (Admin only)
```bash
GET /api/admin/users
Headers: { "wallet_address": "achievo.testnet" }
```

## Meteor Wallet Integration

### Connect Wallet
1. Open Meteor Wallet extension
2. Switch to testnet network
3. Import/connect one of the sample accounts:
   - `achievo.testnet` (Admin)
   - `achievo-admin.testnet` (Superuser)  
   - `achievo-student.testnet` (Student)
   - `achievo-org.testnet` (Organization)

### Authentication Flow
1. Connect Meteor Wallet
2. Sign transactions when prompted
3. Wallet address will be used for authentication in API calls

## Sample Data Structure

### Admin Account
- Full system access
- Can verify organizations
- Can manage all users

### Student Account  
- Can register as individual
- Can receive certificates
- Can earn rewards

### Organization Account
- Can register and get verified
- Can issue certificates
- Can grant rewards
- Offers multiple courses

### NFT Certificate Testing

#### Mint NFT Certificate (as Verified Organization)
```bash
POST /api/nft/mint
Headers: { "wallet_address": "achievo-org.testnet" }
Content-Type: application/json

{
  "receiver_id": "achievo-student.testnet",
  "metadata": {
    "title": "Blockchain Expert Certificate",
    "description": "NFT certificate for completing advanced blockchain course",
    "media": "https://example.com/certificate.png"
  },
  "certificate_id": "cert_1"
}
```

#### Transfer NFT Certificate
```bash
POST /api/nft/transfer
Headers: { "wallet_address": "achievo-student.testnet" }
Content-Type: application/json

{
  "receiver_id": "another-student.testnet",
  "token_id": "nft_cert_1",
  "memo": "Transferring certificate"
}
```

#### Get NFT Certificates for Owner
```bash
GET /api/nft/owner/achievo-student.testnet?from_index=0&limit=10
```

#### Get Specific NFT Token
```bash
GET /api/nft/token/nft_cert_1
```

### Role Management Testing

#### Assign Role (as Admin)
```bash
POST /api/roles/assign
Headers: { "wallet_address": "achievo.testnet" }
Content-Type: application/json

{
  "account_id": "new-verifier.testnet",
  "role": "organization_verifier"
}
```

#### Remove Role (as Admin)
```bash
POST /api/roles/remove
Headers: { "wallet_address": "achievo.testnet" }
Content-Type: application/json

{
  "account_id": "old-moderator.testnet"
}
```

#### Get User Role
```bash
GET /api/roles/user/achievo-student.testnet
```

#### Get Current User Role
```bash
GET /api/roles/me
Headers: { "wallet_address": "achievo-student.testnet" }
```

### Enhanced Permission Testing

#### Grant Reward (Moderator Only)
```bash
POST /api/rewards/grant
Headers: { "wallet_address": "achievo-admin.testnet" }
Content-Type: application/json

{
  "learner_wallet": "achievo-student.testnet",
  "milestone": "Excellence Award",
  "granter_wallet": "achievo-admin.testnet"
}
```

#### Revoke Certificate (Moderator/Admin or Issuer)
```bash
POST /api/certificates/revoke
Headers: { "wallet_address": "achievo-admin.testnet" }
Content-Type: application/json

{
  "certificate_id": "cert_1",
  "reason": "Policy violation",
  "organization_wallet": "achievo-admin.testnet"
}
```

## Error Testing

### Invalid Authentication
```bash
# No wallet address
POST /api/admin/users
# Expected: 401 Unauthorized

# Wrong wallet address  
POST /api/admin/users
Headers: { "wallet_address": "invalid.testnet" }
# Expected: 403 Forbidden
```

### Role-Based Access Control
```bash
# User trying to access admin function
POST /api/roles/assign
Headers: { "wallet_address": "achievo-student.testnet" }
# Expected: 403 Forbidden

# User trying to grant rewards
POST /api/rewards/grant
Headers: { "wallet_address": "achievo-student.testnet" }
# Expected: 403 Forbidden

# Unverified organization trying to mint NFT
POST /api/nft/mint
Headers: { "wallet_address": "unverified-org.testnet" }
# Expected: 403 Forbidden
```

### Missing Required Fields
```bash
POST /api/auth/register-individual
Content-Type: application/json
{
  "name": "John Doe"
  # Missing required fields
}
# Expected: 400 Bad Request
```

## Notes

- All sample accounts are on NEAR testnet
- Use Meteor Wallet for authentication
- Admin endpoints require admin wallet addresses
- Initialize sample data before testing other features
- Check Firebase Firestore for data persistence
