/**
 * Seed Script: Inserts the 8 master patients into MongoDB.
 * 
 * Usage:
 *   node seed_patients.js
 * 
 * Prerequisites:
 *   - MongoDB running on localhost:27017
 *   - Run: npm install mongodb (if not installed)
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'medisphere_patient';
const COLLECTION = 'patients';

const patients = [
  {
    _id: 'john_doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john_doe@medisphere.io',
    phoneNumber: '+1-555-0101',
    dateOfBirth: new Date('1981-05-15'),
    gender: 'Male',
    address: '742 Evergreen Terrace, Medical District',
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+1-555-0102',
    medicalHistory: ['Acute Tachycardia / AFib'],
    insuranceProvider: 'Aetna Global Health',
    insurancePolicyNumber: 'POL-JOHN_DOE-99',
    primaryCondition: 'Acute Tachycardia / AFib',
    aiRisk: 'High',
    aiConfidence: 94.5,
    age: 45
  },
  {
    _id: 'jane_smith',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane_smith@medisphere.io',
    phoneNumber: '+1-555-0103',
    dateOfBirth: new Date('1988-03-22'),
    gender: 'Female',
    address: '123 Health Way, Seattle WA',
    emergencyContactName: 'John Smith',
    emergencyContactPhone: '+1-555-0104',
    medicalHistory: ['Hypoxia / Respiratory Distress'],
    insuranceProvider: 'Blue Cross Shield',
    insurancePolicyNumber: 'POL-JANE_SMITH-99',
    primaryCondition: 'Hypoxia / Respiratory Distress',
    aiRisk: 'High',
    aiConfidence: 91.2,
    age: 38
  },
  {
    _id: 'robert_j',
    firstName: 'Robert',
    lastName: 'Johnson',
    email: 'robert_j@medisphere.io',
    phoneNumber: '+1-555-0105',
    dateOfBirth: new Date('1964-11-08'),
    gender: 'Male',
    address: '456 Maple Drive, Portland OR',
    emergencyContactName: 'Mary Johnson',
    emergencyContactPhone: '+1-555-0106',
    medicalHistory: ['Hypertension Stage 2'],
    insuranceProvider: 'UnitedHealth',
    insurancePolicyNumber: 'POL-ROBERT_J-99',
    primaryCondition: 'Hypertension Stage 2',
    aiRisk: 'Medium',
    aiConfidence: 87.6,
    age: 62
  },
  {
    _id: 'eleanor_v',
    firstName: 'Eleanor',
    lastName: 'Vance',
    email: 'eleanor_v@medisphere.io',
    phoneNumber: '+1-555-0107',
    dateOfBirth: new Date('1972-07-19'),
    gender: 'Female',
    address: '789 Oak Lane, Austin TX',
    emergencyContactName: 'William Vance',
    emergencyContactPhone: '+1-555-0108',
    medicalHistory: ['Arrhythmia Monitoring'],
    insuranceProvider: 'Cigna',
    insurancePolicyNumber: 'POL-ELEANOR_V-99',
    primaryCondition: 'Arrhythmia Monitoring',
    aiRisk: 'Low',
    aiConfidence: 96.0,
    age: 54
  },
  {
    _id: 'marcus_b',
    firstName: 'Marcus',
    lastName: 'Brody',
    email: 'marcus_b@medisphere.io',
    phoneNumber: '+1-555-0109',
    dateOfBirth: new Date('1964-02-14'),
    gender: 'Male',
    address: '321 Pine Street, Denver CO',
    emergencyContactName: 'Emily Brody',
    emergencyContactPhone: '+1-555-0110',
    medicalHistory: ['COPD / Asthma'],
    insuranceProvider: 'Humana',
    insurancePolicyNumber: 'POL-MARCUS_B-99',
    primaryCondition: 'COPD / Asthma',
    aiRisk: 'Medium',
    aiConfidence: 85.3,
    age: 62
  },
  {
    _id: 'clara_o',
    firstName: 'Clara',
    lastName: 'Oswald',
    email: 'clara_o@medisphere.io',
    phoneNumber: '+1-555-0111',
    dateOfBirth: new Date('1995-09-23'),
    gender: 'Female',
    address: '654 Elm Ave, Chicago IL',
    emergencyContactName: 'Dave Oswald',
    emergencyContactPhone: '+1-555-0112',
    medicalHistory: ['Tachycardia / Elevated HR'],
    insuranceProvider: 'Kaiser Permanente',
    insurancePolicyNumber: 'POL-CLARA_O-99',
    primaryCondition: 'Tachycardia / Elevated HR',
    aiRisk: 'High',
    aiConfidence: 92.8,
    age: 31
  },
  {
    _id: 'david_t',
    firstName: 'David',
    lastName: 'Tennant',
    email: 'david_t@medisphere.io',
    phoneNumber: '+1-555-0113',
    dateOfBirth: new Date('1978-04-18'),
    gender: 'Male',
    address: '987 Birch Blvd, Boston MA',
    emergencyContactName: 'Georgia Tennant',
    emergencyContactPhone: '+1-555-0114',
    medicalHistory: ['Type II Diabetes'],
    insuranceProvider: 'Aetna Global Health',
    insurancePolicyNumber: 'POL-DAVID_T-99',
    primaryCondition: 'Type II Diabetes',
    aiRisk: 'Low',
    aiConfidence: 97.1,
    age: 48
  },
  {
    _id: 'sophia_l',
    firstName: 'Sophia',
    lastName: 'Loren',
    email: 'sophia_l@medisphere.io',
    phoneNumber: '+1-555-0115',
    dateOfBirth: new Date('1959-01-30'),
    gender: 'Female',
    address: '159 Cedar Court, Miami FL',
    emergencyContactName: 'Carlo Loren',
    emergencyContactPhone: '+1-555-0116',
    medicalHistory: ['Coronary Artery Disease'],
    insuranceProvider: 'Anthem',
    insurancePolicyNumber: 'POL-SOPHIA_L-99',
    primaryCondition: 'Coronary Artery Disease',
    aiRisk: 'Medium',
    aiConfidence: 88.4,
    age: 67
  }
];

async function seed() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    for (const patient of patients) {
      const exists = await collection.findOne({ _id: patient._id });
      if (exists) {
        await collection.replaceOne({ _id: patient._id }, patient);
        console.log(`  🔄 Updated existing patient: ${patient.firstName} ${patient.lastName} (${patient._id})`);
      } else {
        await collection.insertOne(patient);
        console.log(`  ✅ Inserted patient: ${patient.firstName} ${patient.lastName} (${patient._id})`);
      }
    }

    const count = await collection.countDocuments();
    console.log(`\n🎉 Done! Total patients in database: ${count}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

seed();
