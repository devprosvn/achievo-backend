
// Sample data for testing NEAR Certificate System
// All accounts use Meteor Wallet for authentication

const sampleData = {
  // Admin account
  admin: {
    wallet_address: "achievo.testnet",
    name: "Achievo Admin",
    email: "admin@achievo.io",
    role: "admin",
    type: "admin",
    permissions: ["manage_users", "verify_organizations", "system_config"],
    created_at: new Date("2024-01-01"),
    status: "active"
  },

  // Superuser account
  superuser: {
    wallet_address: "achievo-admin.testnet", 
    name: "Super Administrator",
    email: "superuser@achievo.io",
    role: "superuser",
    type: "superuser",
    permissions: ["all_permissions"],
    created_at: new Date("2024-01-01"),
    status: "active"
  },

  // Student account
  student: {
    wallet_address: "achievo-student.testnet",
    name: "John Student",
    dob: "1995-05-15",
    email: "student@achievo.io",
    type: "individual",
    role: "learner",
    certificates_earned: [],
    rewards_received: [],
    created_at: new Date("2024-01-15"),
    status: "active"
  },

  // Organization account
  organization: {
    wallet_address: "achievo-org.testnet",
    name: "Achievo Education Institute",
    contact_info: {
      email: "contact@achievo-edu.org",
      phone: "+1-555-0123",
      website: "https://achievo-edu.org",
      address: "123 Education St, Learning City, LC 12345"
    },
    type: "organization",
    verified: true,
    certificates_issued: [],
    courses_offered: [
      {
        course_id: "BLOCKCHAIN_101",
        course_name: "Introduction to Blockchain",
        description: "Learn the fundamentals of blockchain technology",
        duration: "8 weeks",
        skills: ["blockchain", "cryptocurrency", "smart_contracts"]
      },
      {
        course_id: "WEB3_DEV",
        course_name: "Web3 Development",
        description: "Build decentralized applications on NEAR Protocol",
        duration: "12 weeks", 
        skills: ["web3", "smart_contracts", "dapp_development", "near_protocol"]
      },
      {
        course_id: "DEFI_BASICS",
        course_name: "DeFi Fundamentals",
        description: "Understanding Decentralized Finance protocols",
        duration: "6 weeks",
        skills: ["defi", "liquidity_pools", "yield_farming", "tokenomics"]
      }
    ],
    created_at: new Date("2024-01-01"),
    verified_at: new Date("2024-01-02"),
    status: "verified"
  },

  // Sample certificates for testing
  sampleCertificates: [
    {
      certificate_id: "CERT_001",
      learner_wallet: "achievo-student.testnet",
      course_id: "BLOCKCHAIN_101",
      course_name: "Introduction to Blockchain",
      organization_wallet: "achievo-org.testnet",
      organization_name: "Achievo Education Institute",
      completion_date: "2024-02-15",
      grade: "A",
      skills: ["blockchain", "cryptocurrency", "smart_contracts"],
      ipfs_hash: "QmSampleHash123456789",
      status: "active",
      issued_at: new Date("2024-02-15")
    }
  ],

  // Sample rewards for testing
  sampleRewards: [
    {
      reward_id: "REWARD_001",
      learner_wallet: "achievo-student.testnet",
      certificate_id: "CERT_001",
      reward_type: "completion_bonus",
      amount: "10",
      currency: "NEAR",
      description: "Completion bonus for Blockchain 101 course",
      granted_at: new Date("2024-02-16"),
      status: "granted"
    }
  ],

  // Authentication helpers for Meteor Wallet
  meteorWalletConfig: {
    network: "testnet",
    accounts: [
      {
        wallet_address: "achievo.testnet",
        account_type: "admin",
        display_name: "Achievo Admin"
      },
      {
        wallet_address: "achievo-admin.testnet", 
        account_type: "superuser",
        display_name: "Super Administrator"
      },
      {
        wallet_address: "achievo-student.testnet",
        account_type: "student", 
        display_name: "John Student"
      },
      {
        wallet_address: "achievo-org.testnet",
        account_type: "organization",
        display_name: "Achievo Education Institute"
      }
    ]
  },

  // Test scenarios
  testScenarios: {
    // Individual registration
    registerStudent: {
      endpoint: "POST /api/auth/register-individual",
      payload: {
        name: "Jane Learner",
        dob: "1998-03-20",
        email: "jane@example.com",
        wallet_address: "jane-learner.testnet"
      }
    },

    // Organization registration
    registerOrganization: {
      endpoint: "POST /api/auth/register-organization", 
      payload: {
        name: "Tech Academy",
        contact_info: {
          email: "admin@techacademy.com",
          phone: "+1-555-0199"
        },
        wallet_address: "tech-academy.testnet"
      }
    },

    // Certificate issuance
    issueCertificate: {
      endpoint: "POST /api/certificates/issue",
      payload: {
        learner_wallet: "achievo-student.testnet",
        course_id: "WEB3_DEV",
        course_name: "Web3 Development", 
        organization_wallet: "achievo-org.testnet",
        skills: ["web3", "smart_contracts", "dapp_development"],
        grade: "A+"
      }
    },

    // Grant reward
    grantReward: {
      endpoint: "POST /api/rewards/grant",
      payload: {
        learner_wallet: "achievo-student.testnet",
        certificate_id: "CERT_002",
        reward_type: "excellence_award",
        amount: "25",
        organization_wallet: "achievo-org.testnet"
      }
    }
  }
};

// Helper function to seed database with sample data
async function seedDatabase() {
  const { db } = require('./config/firebase');
  
  try {
    console.log('Seeding database with sample data...');

    // Add admin user
    await db.collection('admins').doc('achievo-admin').set(sampleData.admin);
    console.log('✓ Admin user added');

    // Add superuser
    await db.collection('superusers').doc('achievo-superuser').set(sampleData.superuser);
    console.log('✓ Superuser added');

    // Add student
    await db.collection('users').doc('achievo-student').set(sampleData.student);
    console.log('✓ Student user added');

    // Add organization
    await db.collection('organizations').doc('achievo-org').set(sampleData.organization);
    console.log('✓ Organization added');

    // Add sample certificate
    await db.collection('certificates').doc('sample-cert-001').set(sampleData.sampleCertificates[0]);
    console.log('✓ Sample certificate added');

    // Add sample reward
    await db.collection('rewards').doc('sample-reward-001').set(sampleData.sampleRewards[0]);
    console.log('✓ Sample reward added');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Export for use in other files
module.exports = { sampleData, seedDatabase };
