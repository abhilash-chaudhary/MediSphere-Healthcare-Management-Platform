const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Database URIs
const mongoUri = 'mongodb://localhost:27017';
const dbNames = {
  auth: 'medisphere_auth',
  patient: 'medisphere_patient',
  twin: 'medisphere_twin',
  consent: 'medisphere_consent',
  provider: 'medisphere_provider',
  wearable: 'medisphere_wearable',
  audit: 'medisphere_audit',
  stream: 'medisphere_stream',
  notification: 'medisphere_notification'
};

// Open connections
const connections = {};
for (const [key, db] of Object.entries(dbNames)) {
  connections[key] = mongoose.createConnection(`${mongoUri}/${db}`);
}

// Schemas matching Java entities
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  roles: [String]
});

const PatientSchema = new mongoose.Schema({
  _id: { type: String },
  firstName: String,
  lastName: String,
  email: String,
  phoneNumber: String,
  dateOfBirth: String,
  gender: String,
  address: String,
  emergencyContactName: String,
  emergencyContactPhone: String,
  medicalHistory: [String],
  insuranceProvider: String,
  insurancePolicyNumber: String
});

const ProviderSchema = new mongoose.Schema({
  _id: { type: String },
  name: String,
  type: String,
  specialty: String,
  department: String,
  schedule: [String],
  location: String,
  email: String,
  phone: String
});

const ConsentSchema = new mongoose.Schema({
  patientId: String,
  doctorId: String,
  status: String,
  grantedAt: Date,
  expiresAt: Date,
  authorizedResourceTypes: [String]
});

const VitalSchema = new mongoose.Schema({
  id: String,
  patientId: String,
  heartRate: Number,
  bloodPressure: String,
  temperature: Number,
  oxygenLevel: Number,
  caloriesBurned: Number,
  sleepMinutes: Number,
  steps: Number,
  recordedAt: Date
});

const HealthTwinSchema = new mongoose.Schema({
  patientId: String,
  completenessScore: Number,
  vitalsHistory: [VitalSchema],
  activeMedications: [String],
  activeConditions: [String],
  riskCategory: String,
  lastRebuilt: Date
});

const WearableDeviceSchema = new mongoose.Schema({
  patientId: String,
  deviceId: String,
  deviceName: String,
  deviceType: String,
  status: String,
  lastSyncedAt: Date
});

const AuditLogSchema = new mongoose.Schema({
  username: String,
  action: String,
  resource: String,
  timestamp: Date,
  ipAddress: String,
  details: String
});

const NotificationSchema = new mongoose.Schema({
  patientId: String,
  message: String,
  type: String,
  status: String,
  createdAt: Date
});

// Models
const User = connections.auth.model('users', UserSchema);
const Patient = connections.patient.model('patients', PatientSchema);
const Provider = connections.provider.model('providers', ProviderSchema);
const Consent = connections.consent.model('consents', ConsentSchema);
const HealthTwin = connections.twin.model('health_twins', HealthTwinSchema);
const WearableDevice = connections.wearable.model('wearables', WearableDeviceSchema);
const AuditLog = connections.audit.model('audit_logs', AuditLogSchema);
const VitalRecord = connections.stream.model('vitals', VitalSchema);
const NotificationLog = connections.notification.model('notifications', NotificationSchema);

async function seed() {
  console.log('Starting MongoDB Database Seeding for MediSphere...');

  try {
    // 1. Clear existing collections
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Provider.deleteMany({});
    await Consent.deleteMany({});
    await HealthTwin.deleteMany({});
    await WearableDevice.deleteMany({});
    await AuditLog.deleteMany({});
    await VitalRecord.deleteMany({});
    await NotificationLog.deleteMany({});
    console.log('Cleared existing database collections.');

    // 2. Hash passwords
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const doctorPass = await bcrypt.hash('doctor123', salt);
    const patientPass = await bcrypt.hash('patient123', salt);

    // 3. Create Users (1 Admin, 5 Doctors, 10 Patients)
    const users = [
      { username: 'admin', password: adminPass, email: 'admin@medisphere.com', roles: ['ROLE_ADMIN', 'ADMIN'] },
      
      { username: 'dr_smith', password: doctorPass, email: 'arthur.smith@medisphere.com', roles: ['ROLE_DOCTOR', 'DOCTOR'] },
      { username: 'dr_adams', password: doctorPass, email: 'sarah.adams@medisphere.com', roles: ['ROLE_DOCTOR', 'DOCTOR'] },
      { username: 'dr_chen', password: doctorPass, email: 'kevin.chen@medisphere.com', roles: ['ROLE_DOCTOR', 'DOCTOR'] },
      { username: 'dr_patel', password: doctorPass, email: 'anita.patel@medisphere.com', roles: ['ROLE_DOCTOR', 'DOCTOR'] },
      { username: 'dr_white', password: doctorPass, email: 'robert.white@medisphere.com', roles: ['ROLE_DOCTOR', 'DOCTOR'] },
      
      { username: 'john_doe', password: patientPass, email: 'john.doe@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'jane_smith', password: patientPass, email: 'jane.smith@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'robert_j', password: patientPass, email: 'robert.j@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'alex_jones', password: patientPass, email: 'alex.jones@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'sarah_lee', password: patientPass, email: 'sarah.lee@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'michael_brown', password: patientPass, email: 'michael.brown@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'emily_davis', password: patientPass, email: 'emily.davis@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'david_wilson', password: patientPass, email: 'david.wilson@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'lisa_taylor', password: patientPass, email: 'lisa.taylor@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] },
      { username: 'james_miller', password: patientPass, email: 'james.miller@gmail.com', roles: ['ROLE_PATIENT', 'PATIENT'] }
    ];
    await User.insertMany(users);
    console.log('Inserted Users (Admin, 5 Doctors, 10 Patients).');

    // 4. Create Patients (10 detailed patient files)
    const patients = [
      {
        _id: 'john_doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@gmail.com',
        phoneNumber: '+1-555-0199',
        dateOfBirth: '1985-05-15',
        gender: 'Male',
        address: '123 Pine St, Seattle, WA 98101',
        emergencyContactName: 'Mary Doe',
        emergencyContactPhone: '+1-555-0198',
        medicalHistory: ['Mild Hypertension', 'Seasonal Allergies'],
        insuranceProvider: 'Aetna Health',
        insurancePolicyNumber: 'AE-992384-01'
      },
      {
        _id: 'jane_smith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@gmail.com',
        phoneNumber: '+1-555-0244',
        dateOfBirth: '1990-08-22',
        gender: 'Female',
        address: '456 Elm St, Portland, OR 97201',
        emergencyContactName: 'David Smith',
        emergencyContactPhone: '+1-555-0245',
        medicalHistory: ['Mild Intermittent Asthma'],
        insuranceProvider: 'Blue Cross Blue Shield',
        insurancePolicyNumber: 'BC-112349-02'
      },
      {
        _id: 'robert_j',
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert.j@gmail.com',
        phoneNumber: '+1-555-0377',
        dateOfBirth: '1962-11-03',
        gender: 'Male',
        address: '789 Oak Ave, San Francisco, CA 94102',
        emergencyContactName: 'Helen Johnson',
        emergencyContactPhone: '+1-555-0378',
        medicalHistory: ['Type 2 Diabetes Mellitus', 'Coronary Artery Disease', 'Hyperlipidemia'],
        insuranceProvider: 'UnitedHealthcare',
        insurancePolicyNumber: 'UH-887410-09'
      },
      {
        _id: 'alex_jones',
        firstName: 'Alex',
        lastName: 'Jones',
        email: 'alex.jones@gmail.com',
        phoneNumber: '+1-555-0455',
        dateOfBirth: '1978-04-12',
        gender: 'Male',
        address: '101 Cedar Rd, Boston, MA 02108',
        emergencyContactName: 'Emily Jones',
        emergencyContactPhone: '+1-555-0456',
        medicalHistory: ['Generalized Anxiety Disorder', 'Gastroesophageal Reflux'],
        insuranceProvider: 'Cigna Health',
        insurancePolicyNumber: 'CI-300481-11'
      },
      {
        _id: 'sarah_lee',
        firstName: 'Sarah',
        lastName: 'Lee',
        email: 'sarah.lee@gmail.com',
        phoneNumber: '+1-555-0561',
        dateOfBirth: '1983-09-30',
        gender: 'Female',
        address: '202 Maple Dr, Denver, CO 80202',
        emergencyContactName: 'Benson Lee',
        emergencyContactPhone: '+1-555-0562',
        medicalHistory: ['Hypothyroidism', 'Vitamin D Deficiency'],
        insuranceProvider: 'Humana',
        insurancePolicyNumber: 'HU-519280-44'
      },
      {
        _id: 'michael_brown',
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@gmail.com',
        phoneNumber: '+1-555-0610',
        dateOfBirth: '1955-01-25',
        gender: 'Male',
        address: '303 Birch Ave, Chicago, IL 60601',
        emergencyContactName: 'Linda Brown',
        emergencyContactPhone: '+1-555-0611',
        medicalHistory: ['Chronic Obstructive Pulmonary Disease (COPD)', 'Essential Hypertension'],
        insuranceProvider: 'Medicare',
        insurancePolicyNumber: 'MC-800492-99'
      },
      {
        _id: 'emily_davis',
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@gmail.com',
        phoneNumber: '+1-555-0720',
        dateOfBirth: '1995-12-14',
        gender: 'Female',
        address: '404 Walnut Ln, Austin, TX 78701',
        emergencyContactName: 'James Davis',
        emergencyContactPhone: '+1-555-0721',
        medicalHistory: ['Chronic Migraines', 'IBS'],
        insuranceProvider: 'Aetna Health',
        insurancePolicyNumber: 'AE-334928-12'
      },
      {
        _id: 'david_wilson',
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david.wilson@gmail.com',
        phoneNumber: '+1-555-0830',
        dateOfBirth: '1970-07-08',
        gender: 'Male',
        address: '505 Redwood Rd, Miami, FL 33101',
        emergencyContactName: 'Patricia Wilson',
        emergencyContactPhone: '+1-555-0831',
        medicalHistory: ['Chronic Gout', 'Mild Osteoarthritis'],
        insuranceProvider: 'Blue Cross Blue Shield',
        insurancePolicyNumber: 'BC-992018-77'
      },
      {
        _id: 'lisa_taylor',
        firstName: 'Lisa',
        lastName: 'Taylor',
        email: 'lisa.taylor@gmail.com',
        phoneNumber: '+1-555-0940',
        dateOfBirth: '1988-03-19',
        gender: 'Female',
        address: '606 Cypress Cir, Phoenix, AZ 85001',
        emergencyContactName: 'Mark Taylor',
        emergencyContactPhone: '+1-555-0941',
        medicalHistory: ['Rheumatoid Arthritis', 'Iron Deficiency Anemia'],
        insuranceProvider: 'Cigna Health',
        insurancePolicyNumber: 'CI-119283-05'
      },
      {
        _id: 'james_miller',
        firstName: 'James',
        lastName: 'Miller',
        email: 'james.miller@gmail.com',
        phoneNumber: '+1-555-1022',
        dateOfBirth: '1965-06-21',
        gender: 'Male',
        address: '707 Alder St, Salt Lake City, UT 84101',
        emergencyContactName: 'Karen Miller',
        emergencyContactPhone: '+1-555-1023',
        medicalHistory: ['Severe Obstructive Sleep Apnea', 'Obesity Class II', 'Gastroesophageal Reflux'],
        insuranceProvider: 'UnitedHealthcare',
        insurancePolicyNumber: 'UH-229480-14'
      }
    ];
    await Patient.insertMany(patients);
    console.log('Inserted 10 Patient Demographics.');

    // 5. Create Providers (5 Doctors across specialties)
    const providers = [
      {
        _id: 'dr_smith',
        name: 'Dr. Arthur Smith',
        type: 'DOCTOR',
        specialty: 'Cardiology',
        department: 'Cardiovascular Medicine',
        schedule: ['Mon 9-5', 'Wed 9-5', 'Fri 9-5'],
        location: 'Building A, Suite 302',
        email: 'arthur.smith@medisphere.com',
        phone: '+1-555-0901'
      },
      {
        _id: 'dr_adams',
        name: 'Dr. Sarah Adams',
        type: 'DOCTOR',
        specialty: 'Pulmonology',
        department: 'Pulmonary & Critical Care',
        schedule: ['Tue 9-5', 'Thu 9-5'],
        location: 'Building B, Suite 415',
        email: 'sarah.adams@medisphere.com',
        phone: '+1-555-0902'
      },
      {
        _id: 'dr_chen',
        name: 'Dr. Kevin Chen',
        type: 'DOCTOR',
        specialty: 'Neurology',
        department: 'Neurological Sciences',
        schedule: ['Mon 10-4', 'Thu 10-4'],
        location: 'Building C, Suite 108',
        email: 'kevin.chen@medisphere.com',
        phone: '+1-555-0903'
      },
      {
        _id: 'dr_patel',
        name: 'Dr. Anita Patel',
        type: 'DOCTOR',
        specialty: 'Endocrinology',
        department: 'Diabetes & Metabolism',
        schedule: ['Wed 9-5', 'Fri 9-5'],
        location: 'Building A, Suite 105',
        email: 'anita.patel@medisphere.com',
        phone: '+1-555-0904'
      },
      {
        _id: 'dr_white',
        name: 'Dr. Robert White',
        type: 'DOCTOR',
        specialty: 'Pediatrics',
        department: 'General Pediatrics',
        schedule: ['Mon-Fri 8-12'],
        location: 'Building B, Suite 101',
        email: 'robert.white@medisphere.com',
        phone: '+1-555-0905'
      }
    ];
    await Provider.insertMany(providers);
    console.log('Inserted 5 Providers (Doctors).');

    // 6. Create Consents (Active, Revoked, Expired)
    const consents = [
      { patientId: 'john_doe', doctorId: 'dr_smith', status: 'GRANTED', grantedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() + 335 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Medications', 'Conditions'] },
      { patientId: 'jane_smith', doctorId: 'dr_adams', status: 'GRANTED', grantedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() + 355 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Conditions'] },
      { patientId: 'robert_j', doctorId: 'dr_smith', status: 'GRANTED', grantedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() + 360 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Medications', 'Conditions'] },
      { patientId: 'robert_j', doctorId: 'dr_patel', status: 'GRANTED', grantedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() + 360 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Medications'] },
      { patientId: 'alex_jones', doctorId: 'dr_chen', status: 'GRANTED', grantedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() + 345 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Medications'] },
      { patientId: 'sarah_lee', doctorId: 'dr_patel', status: 'GRANTED', grantedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() + 353 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Medications', 'Conditions'] },
      { patientId: 'emily_davis', doctorId: 'dr_chen', status: 'GRANTED', grantedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() + 364 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Conditions'] },
      { patientId: 'michael_brown', doctorId: 'dr_adams', status: 'GRANTED', grantedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() + 350 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Medications', 'Conditions'] },
      
      // Revoked and Expired consents for realism
      { patientId: 'john_doe', doctorId: 'dr_adams', status: 'REVOKED', grantedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() - 30 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals'] },
      { patientId: 'jane_smith', doctorId: 'dr_smith', status: 'EXPIRED', grantedAt: new Date(Date.now() - 400 * 24 * 3600 * 1000), expiresAt: new Date(Date.now() - 35 * 24 * 3600 * 1000), authorizedResourceTypes: ['Vitals', 'Medications'] }
    ];
    await Consent.insertMany(consents);
    console.log('Inserted privacy consents (Active, Revoked, Expired).');

    // 7. Vitals Generator (28 records = 7 days at 6 hours intervals)
    function generateVitals(patientId, baseHeart, baseBP_sys, baseBP_dia, baseOxy, baseTemp, count = 28) {
      const history = [];
      const now = Date.now();
      for (let i = count - 1; i >= 0; i--) {
        const time = new Date(now - i * 3600 * 1000 * 6);
        const heartRate = Math.round(baseHeart + (Math.random() - 0.5) * 12);
        const sys = Math.round(baseBP_sys + (Math.random() - 0.5) * 18);
        const dia = Math.round(baseBP_dia + (Math.random() - 0.5) * 10);
        const bloodPressure = `${sys}/${dia}`;
        const oxygenLevel = Math.min(100, Math.round((baseOxy + (Math.random() - 0.5) * 2.5) * 10) / 10);
        const temperature = Math.round((baseTemp + (Math.random() - 0.5) * 0.8) * 10) / 10;
        const caloriesBurned = Math.round(350 + Math.random() * 250);
        const steps = Math.round(1000 + Math.random() * 4500);
        const sleepMinutes = Math.round(380 + Math.random() * 150);

        history.push({
          id: `vit-${patientId}-${i}`,
          patientId,
          heartRate,
          bloodPressure,
          temperature,
          oxygenLevel,
          caloriesBurned,
          sleepMinutes,
          steps,
          recordedAt: time
        });
      }
      return history;
    }

    // 8. Create Health Twins for all 10 patients
    const twins = [
      {
        patientId: 'john_doe',
        completenessScore: 88.0,
        activeMedications: ['Lisinopril 10mg Daily'],
        activeConditions: ['Mild Essential Hypertension'],
        riskCategory: 'MEDIUM',
        vitalsHistory: generateVitals('john_doe', 72, 134, 84, 98.2, 36.6),
        lastRebuilt: new Date()
      },
      {
        patientId: 'jane_smith',
        completenessScore: 92.0,
        activeMedications: ['Albuterol HFA Inhaler as needed'],
        activeConditions: ['Mild Intermittent Asthma'],
        riskCategory: 'LOW',
        vitalsHistory: generateVitals('jane_smith', 65, 118, 76, 99.1, 36.7),
        lastRebuilt: new Date()
      },
      {
        patientId: 'robert_j',
        completenessScore: 96.0,
        activeMedications: ['Metformin 500mg Twice Daily', 'Atorvastatin 20mg Daily', 'Aspirin 81mg Daily'],
        activeConditions: ['Type 2 Diabetes Mellitus', 'Coronary Artery Disease', 'Hyperlipidemia'],
        riskCategory: 'HIGH',
        vitalsHistory: generateVitals('robert_j', 82, 142, 88, 95.4, 36.8),
        lastRebuilt: new Date()
      },
      {
        patientId: 'alex_jones',
        completenessScore: 85.0,
        activeMedications: ['Escitalopram 10mg Daily', 'Omeprazole 20mg Daily'],
        activeConditions: ['Generalized Anxiety Disorder (GAD)', 'GERD'],
        riskCategory: 'LOW',
        vitalsHistory: generateVitals('alex_jones', 75, 120, 78, 98.6, 36.5),
        lastRebuilt: new Date()
      },
      {
        patientId: 'sarah_lee',
        completenessScore: 90.0,
        activeMedications: ['Levothyroxine 75mcg Daily', 'Cholecalciferol 2000 IU Daily'],
        activeConditions: ['Hypothyroidism', 'Vitamin D Deficiency'],
        riskCategory: 'LOW',
        vitalsHistory: generateVitals('sarah_lee', 68, 115, 72, 98.9, 36.4),
        lastRebuilt: new Date()
      },
      {
        patientId: 'michael_brown',
        completenessScore: 94.0,
        activeMedications: ['Tiotropium Bromide Inhaler Daily', 'Fluticasone/Salmeterol Twice Daily', 'Amlodipine 5mg Daily'],
        activeConditions: ['COPD Stage II', 'Essential Hypertension'],
        riskCategory: 'HIGH',
        vitalsHistory: generateVitals('michael_brown', 80, 138, 82, 94.5, 36.6),
        lastRebuilt: new Date()
      },
      {
        patientId: 'emily_davis',
        completenessScore: 87.0,
        activeMedications: ['Sumatriptan 50mg as needed', 'Propranolol 40mg Twice Daily'],
        activeConditions: ['Chronic Migraines', 'Irritable Bowel Syndrome'],
        riskCategory: 'MEDIUM',
        vitalsHistory: generateVitals('emily_davis', 70, 112, 70, 99.0, 36.8),
        lastRebuilt: new Date()
      },
      {
        patientId: 'david_wilson',
        completenessScore: 89.0,
        activeMedications: ['Allopurinol 100mg Daily', 'Meloxicam 7.5mg Daily as needed'],
        activeConditions: ['Chronic Gouty Arthritis', 'Mild Osteoarthritis of Knee'],
        riskCategory: 'MEDIUM',
        vitalsHistory: generateVitals('david_wilson', 76, 128, 80, 97.8, 36.6),
        lastRebuilt: new Date()
      },
      {
        patientId: 'lisa_taylor',
        completenessScore: 93.0,
        activeMedications: ['Methotrexate 15mg Weekly', 'Folic Acid 1mg Daily', 'Ferrous Sulfate 325mg Daily'],
        activeConditions: ['Rheumatoid Arthritis', 'Iron Deficiency Anemia'],
        riskCategory: 'MEDIUM',
        vitalsHistory: generateVitals('lisa_taylor', 74, 122, 75, 98.1, 36.7),
        lastRebuilt: new Date()
      },
      {
        patientId: 'james_miller',
        completenessScore: 95.0,
        activeMedications: ['Famotidine 20mg Daily', 'Multivitamin Daily'],
        activeConditions: ['Severe Obstructive Sleep Apnea', 'Obesity Class II', 'Chronic GERD'],
        riskCategory: 'HIGH',
        vitalsHistory: generateVitals('james_miller', 84, 136, 86, 93.8, 36.5),
        lastRebuilt: new Date()
      }
    ];
    await HealthTwin.insertMany(twins);
    console.log('Inserted 10 Digital Twins & 280+ Vital History trend points.');

    // 9. Create Wearables
    const wearables = [
      { patientId: 'john_doe', deviceId: 'WD-101', deviceName: 'Apple Watch Series 8', deviceType: 'Smartwatch', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'jane_smith', deviceId: 'WD-102', deviceName: 'Fitbit Charge 6', deviceType: 'Fitness Tracker', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'robert_j', deviceId: 'WD-103', deviceName: 'Garmin Vivosmart 5', deviceType: 'Fitness Tracker', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'alex_jones', deviceId: 'WD-104', deviceName: 'Oura Ring Gen 3', deviceType: 'Smart Ring', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'sarah_lee', deviceId: 'WD-105', deviceName: 'Apple Watch SE', deviceType: 'Smartwatch', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'michael_brown', deviceId: 'WD-106', deviceName: 'Withings ScanWatch', deviceType: 'Smartwatch', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'emily_davis', deviceId: 'WD-107', deviceName: 'Fitbit Luxe', deviceType: 'Fitness Tracker', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'david_wilson', deviceId: 'WD-108', deviceName: 'Samsung Galaxy Watch 5', deviceType: 'Smartwatch', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'lisa_taylor', deviceId: 'WD-109', deviceName: 'Garmin Lily', deviceType: 'Smartwatch', status: 'ACTIVE', lastSyncedAt: new Date() },
      { patientId: 'james_miller', deviceId: 'WD-110', deviceName: 'Philips Respironics CPAP', deviceType: 'Medical Device', status: 'ACTIVE', lastSyncedAt: new Date() }
    ];
    await WearableDevice.insertMany(wearables);
    console.log('Inserted 10 Linked Wearable Devices.');

    // 10. Create 25+ detailed HIPAA Audit Logs (Busy platform activity)
    const auditLogs = [];
    const logActions = [
      { action: 'USER_LOGIN', desc: 'User logged in successfully via 2FA' },
      { action: 'VIEW_PATIENT_360', desc: 'Accessed patient clinical digital twin 360 overview' },
      { action: 'REBUILD_HEALTH_TWIN', desc: 'Rebuilt clinical health twin machine learning completeness parameters' },
      { action: 'CONSENT_GRANTED', desc: 'Patient authorized digital consent record for medical provider' },
      { action: 'SYNC_WEARABLE_DEVICE', desc: 'Synchronized telemetry packets from linked smartwatch wearable' },
      { action: 'EMERGENCY_OVERRIDE', desc: 'Bypassed digital consent under emergency care conditions (M.A.C.S)' }
    ];
    const logUsers = ['dr_smith', 'dr_adams', 'dr_chen', 'dr_patel', 'admin', 'john_doe', 'jane_smith'];
    const logPatients = ['john_doe', 'jane_smith', 'robert_j', 'alex_jones', 'sarah_lee', 'michael_brown', 'emily_davis'];

    // Seed 25 log entries spanning the last 48 hours
    for (let i = 0; i < 28; i++) {
      const time = new Date(Date.now() - i * 90 * 60 * 1000); // every 1.5 hours
      const user = logUsers[i % logUsers.length];
      const actionObj = logActions[i % logActions.length];
      const patient = logPatients[i % logPatients.length];
      
      let details = actionObj.desc;
      if (actionObj.action === 'VIEW_PATIENT_360' || actionObj.action === 'REBUILD_HEALTH_TWIN' || actionObj.action === 'EMERGENCY_OVERRIDE') {
        details += ` for patient: ${patient}`;
      } else if (actionObj.action === 'CONSENT_GRANTED') {
        details = `Patient ${patient} granted medical access consent to medical clinician: ${user}`;
      }

      auditLogs.push({
        username: user,
        action: actionObj.action,
        resource: actionObj.action === 'USER_LOGIN' ? 'auth' : patient,
        timestamp: time,
        ipAddress: `192.168.1.${10 + (i % 25)}`,
        details
      });
    }
    await AuditLog.insertMany(auditLogs);
    console.log('Inserted 28 detailed HIPAA Audit Logs.');

    // 11. Create Notifications
    const notifications = [];
    const patientsWithAlerts = ['john_doe', 'robert_j', 'james_miller', 'michael_brown'];
    patientsWithAlerts.forEach((pid, index) => {
      notifications.push({
        patientId: pid,
        message: index % 2 === 0 
          ? `Urgent: Wearable detected abnormal vitals trend. Check your Heart Rate log.`
          : `System Reminder: Please sync your paired wearable device to restore Digital Twin scores.`,
        type: index % 2 === 0 ? 'WARNING' : 'INFO',
        status: 'UNREAD',
        createdAt: new Date(Date.now() - index * 4 * 3600 * 1000)
      });
    });
    await NotificationLog.insertMany(notifications);
    console.log('Inserted patient alerting logs.');

    console.log('MongoDB database seeding completed successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    // Close all connections
    for (const conn of Object.values(connections)) {
      await conn.close();
    }
    console.log('Closed all database connections.');
  }
}

seed();
