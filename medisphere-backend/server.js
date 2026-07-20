require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'medisphere-secret-key-12345';

// Root API info route
app.get('/', (req, res) => {
  res.json({
    name: 'MediSphere API Gateway',
    version: '1.0.0',
    status: 'UP',
    description: 'Enterprise Healthcare Platform Mock API Gateway',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/actuator/health',
      auth: '/auth/login | /auth/register | /auth/verify-otp',
      patients: '/patients | /patients/search | /patients/:id',
      fhir: '/fhir/patient/:id | /fhir/observation/:id | /fhir/medication/:id',
      twin: '/twin/:patientId | /twin/rebuild',
      consent: '/consent/grant | /consent/revoke | /consent/history',
      vitals: '/vitals/send | /vitals/live/:patientId | /vitals/history/:patientId',
      labs: '/labs/:patientId',
      admin: '/admin/system-health | /admin/statistics',
      appointments: '/appointments/patient/:patientId'
    },
    frontend: 'http://localhost:5173'
  });
});

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-User', 'X-Auth-Roles'],
  credentials: true
}));
app.use(express.json());

// MongoDB connections
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
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

const conns = {};
for (const [key, db] of Object.entries(dbNames)) {
  conns[key] = mongoose.createConnection(`${mongoUri}/${db}`);
}

// Schemas
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

const UserOtpSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

const PredictionSchema = new mongoose.Schema({
  id: String,
  patientId: String,
  predictionType: String,
  riskType: String,
  riskLevel: String,
  riskPercentage: Number,
  confidence: Number,
  modelVersion: String,
  predictionDate: String,
  age: Number,
  bloodPressure: Number,
  bmi: Number,
  hba1c: Number,
  cholesterol: Number,
  heartRate: Number,
  createdAt: { type: Date, default: Date.now }
});

const ExplanationSchema = new mongoose.Schema({
  patientId: String,
  riskLevel: String,
  baseValue: Number,
  predictionValue: Number,
  featureImportances: [mongoose.Schema.Types.Mixed],
  narrative: String,
  generatedAt: { type: Date, default: Date.now }
});

const ModelVersionSchema = new mongoose.Schema({
  version: String,
  accuracy: Number,
  status: String,
  trainedAt: { type: Date, default: Date.now }
});

// Models
const User = conns.auth.model('users', UserSchema);
const Patient = conns.patient.model('patients', PatientSchema);
const Provider = conns.provider.model('providers', ProviderSchema);
const Consent = conns.consent.model('consents', ConsentSchema);
const HealthTwin = conns.twin.model('health_twins', HealthTwinSchema);
const WearableDevice = conns.wearable.model('wearables', WearableDeviceSchema);
const AuditLog = conns.audit.model('audit_logs', AuditLogSchema);
const VitalRecord = conns.stream.model('vitals', VitalSchema);
const NotificationLog = conns.notification.model('notifications', NotificationSchema);
const UserOtp = conns.auth.model('user_otps', UserOtpSchema);
const Prediction = conns.twin.model('predictions', PredictionSchema);
const Explanation = conns.twin.model('explanations', ExplanationSchema);
const ModelVersion = conns.twin.model('model_versions', ModelVersionSchema);

// Initial default models if collection is empty
(async () => {
  try {
    const count = await ModelVersion.countDocuments();
    if (count === 0) {
      await ModelVersion.insertMany([
        { version: 'v1.0.0', accuracy: 91.4, status: 'ACTIVE', trainedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
        { version: 'v1.1.0-beta', accuracy: 93.8, status: 'INACTIVE', trainedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000) }
      ]);
    }
  } catch (e) {}
})();

// DLQ Mock Array in memory
let dlqPayloads = [
  { id: "dlq-101", rawPayload: '{"patientId": "invalid_user", "heartRate": -23, "steps": "abc"}', reason: "Invalid vital parameters: negative heartRate, steps type mismatch", timestamp: new Date(Date.now() - 3600000) }
];

const fallbackPatientProfiles = {
  john_doe: {
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
  admin: {
    _id: 'admin',
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@medisphere.com',
    phoneNumber: '+1-555-0000',
    dateOfBirth: '1980-01-01',
    gender: 'Other',
    address: 'Headquarters',
    emergencyContactName: 'Support Desk',
    emergencyContactPhone: '+1-555-0001',
    medicalHistory: [],
    insuranceProvider: 'Internal',
    insurancePolicyNumber: 'INT-001'
  }
};

const fallbackDigitalTwins = {
  john_doe: {
    patientId: 'john_doe',
    completenessScore: 86,
    vitalsHistory: [],
    activeMedications: ['Lisinopril', 'Metformin'],
    activeConditions: ['Hypertension', 'Diabetes'],
    riskCategory: 'MEDIUM',
    lastRebuilt: new Date()
  }
};

function buildFallbackDashboard(patientId, doctorId) {
  const patientProfile = fallbackPatientProfiles[patientId] || fallbackPatientProfiles.john_doe;
  const digitalTwin = fallbackDigitalTwins[patientId] || fallbackDigitalTwins.john_doe;
  const riskLevel = digitalTwin.riskCategory || 'UNKNOWN';
  return {
    patientId,
    patientProfile,
    digitalTwin,
    consentCheckResult: true,
    healthRiskLevel: riskLevel,
    alertStatusSummary: riskLevel === 'HIGH' ? 'ALERT' : 'NORMAL'
  };
}

// Helper: HIPAA Audit logger
async function logAudit(username, action, resource, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1') : '127.0.0.1';
    await AuditLog.create({
      username: username || 'anonymous',
      action,
      resource,
      timestamp: new Date(),
      ipAddress: ip,
      details
    });
  } catch (err) {
    console.error('Failed to log audit:', err);
  }
}

// Helper: Send OTP Email (Real SMTP or Ethereal Sandbox fallback)
async function sendOtpEmail(email, otp) {
  let transporter;
  const useRealSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  try {
    if (useRealSmtp) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Ethereal auto-generation
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"MediSphere 2FA" <no-reply@medisphere.com>',
      to: email,
      subject: 'MediSphere One-Time Verification Code',
      text: `Your MediSphere 2FA verification code is: ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #0a0f1d; color: #fff;">
          <h2 style="color: #00f2fe; border-bottom: 2px solid rgba(0, 242, 254, 0.2); padding-bottom: 10px;">MediSphere Security Verification</h2>
          <p style="color: #94a3b8; font-size: 14px;">A login request was made for your MediSphere account. Use the following One-Time Password (OTP) to finalize your login:</p>
          <div style="font-size: 32px; font-weight: bold; color: #00f2fe; text-align: center; margin: 30px 0; letter-spacing: 5px; text-shadow: 0 0 10px rgba(0,242,254,0.3);">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #64748b;">This verification code is valid for 5 minutes. If you did not make this request, please contact administrator immediately.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (!useRealSmtp) {
      console.log(`[EMAIL OTP] Test email generated on Ethereal sandbox.`);
      console.log(`[EMAIL OTP] View Inbox: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`[EMAIL OTP] Real email dispatched successfully to: ${email}`);
    }
  } catch (err) {
    console.error('Nodemailer failed to dispatch email:', err);
  }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid authorization header', data: null });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Set Gateway headers like Spring Gateway
    req.headers['x-auth-user'] = decoded.username;
    req.headers['x-auth-roles'] = decoded.roles.join(',');
    
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token', data: null });
  }
}

// Role-based Authorization Middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.some(r => r.includes(role)));
    if (!hasRole) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient role privileges', data: null });
    }
    next();
  };
}

// ==========================================
// AUTH SERVICE PATHS (/auth/*)
// ==========================================
app.post('/auth/register', async (req, res) => {
  const { username, password, email, roles } = req.body;
  
  try {
    const existsUser = await User.findOne({ username });
    if (existsUser) {
      return res.json({ success: false, message: 'Username is already taken', data: null });
    }
    const existsEmail = await User.findOne({ email });
    if (existsEmail) {
      return res.json({ success: false, message: 'Email is already registered', data: null });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      email,
      roles: roles || ['PATIENT']
    });

    // Create matching patient record if role is patient
    if (newUser.roles.includes('PATIENT')) {
      await Patient.create({
        _id: username,
        firstName: username.split('_')[0] || username,
        lastName: username.split('_')[1] || 'Patient',
        email,
        phoneNumber: '',
        dateOfBirth: '1990-01-01',
        gender: 'Other',
        medicalHistory: [],
        insuranceProvider: '',
        insurancePolicyNumber: ''
      });
      
      // Create empty twin
      await HealthTwin.create({
        patientId: username,
        completenessScore: 30.0,
        vitalsHistory: [],
        activeMedications: [],
        activeConditions: [],
        riskCategory: 'UNKNOWN',
        lastRebuilt: new Date()
      });
    }

    // Create provider record if doctor
    if (newUser.roles.includes('DOCTOR')) {
      await Provider.create({
        _id: username,
        name: `Dr. ${username.charAt(0).toUpperCase() + username.slice(1)}`,
        type: 'DOCTOR',
        specialty: 'General Practice',
        department: 'Outpatient Care',
        schedule: ['Mon 9-5', 'Wed 9-5'],
        location: 'Clinic Suite 101',
        email,
        phone: ''
      });
    }

    await logAudit(username, 'USER_REGISTER', username, 'Registered user account with roles: ' + JSON.stringify(roles));

    return res.json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        roles: newUser.roles
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password', data: null });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Invalid username or password', data: null });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Save in DB (overwrite existing for that username)
    await UserOtp.deleteOne({ username });
    await UserOtp.create({ username, otp, expiresAt });

    console.log(`[EMAIL OTP] Generated code ${otp} for user ${username} (triggering email dispatch to ${user.email})`);
    
    // Dispatch OTP email asynchronously
    sendOtpEmail(user.email, otp);
    
    await logAudit(username, 'GENERATE_OTP', username, `OTP generated and dispatched to registered email: ${user.email}`, req);

    return res.json({
      success: true,
      message: 'OTP sent to your email address',
      data: {
        otpRequired: true,
        email: user.email
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/auth/verify-otp', async (req, res) => {
  const { username, otp } = req.body;
  const normalizedOtp = String(otp ?? '').trim();
  console.log(`[EMAIL OTP DIAGNOSTIC] Incoming verify: user="${username}", otp="${normalizedOtp}" (type=${typeof normalizedOtp})`);
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`[EMAIL OTP DIAGNOSTIC] User "${username}" not found in DB`);
      return res.status(404).json({ success: false, message: 'User not found', data: null });
    }

    const otpRecord = await UserOtp.findOne({ username });
    if (!otpRecord) {
      console.log(`[EMAIL OTP DIAGNOSTIC] No stored OTP found for user "${username}"`);
      return res.status(400).json({ success: false, message: 'No active OTP found for this user', data: null });
    }

    const storedOtp = String(otpRecord.otp ?? '').trim();
    console.log(`[EMAIL OTP DIAGNOSTIC] Stored OTP record: otp="${storedOtp}" (type=${typeof storedOtp}), expiresAt=${otpRecord.expiresAt}`);

    if (new Date() > otpRecord.expiresAt) {
      console.log(`[EMAIL OTP DIAGNOSTIC] OTP expired. Current time=${new Date()}, expiresAt=${otpRecord.expiresAt}`);
      await UserOtp.deleteOne({ username });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.', data: null });
    }

    if (storedOtp !== normalizedOtp) {
      console.log(`[EMAIL OTP DIAGNOSTIC] OTP mismatch! Stored="${storedOtp}", Received="${normalizedOtp}"`);
      return res.status(400).json({ success: false, message: 'Invalid OTP code', data: null });
    }

    // Success - delete OTP
    await UserOtp.deleteOne({ username });

    // Emit JWT token
    const token = jwt.sign({ username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: '86400s' });
    const refreshToken = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '604800s' });

    await logAudit(username, 'VERIFY_OTP_SUCCESS', username, 'OTP verification successful. User session opened.', req);
    await logAudit(username, 'USER_LOGIN', username, 'User logged in successfully via 2FA', req);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: token,
        refreshToken: refreshToken,
        tokenType: 'Bearer',
        expiresIn: 86400
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/auth/forgot-password', async (req, res) => {
  const { username, email, newPassword } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.json({ success: false, message: 'Account credentials mismatch' });
    }

    if (user.email !== email) {
      return res.json({ success: false, message: 'Account credentials mismatch' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    await logAudit(username, 'FORGOT_PASSWORD_RESET', username, 'Password reset requested and updated successfully via Forgot Password option', req);

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.query;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token parameter required', data: null });
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    // Fetch current roles from DB to prevent stale/downgraded privilege
    const userRecord = await User.findOne({ username: decoded.username });
    const roles = userRecord ? userRecord.roles : decoded.roles || ['PATIENT'];
    const newAccessToken = jwt.sign({ username: decoded.username, roles }, JWT_SECRET, { expiresIn: '86400s' });
    const newRefreshToken = jwt.sign({ username: decoded.username }, JWT_SECRET, { expiresIn: '604800s' });

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: 86400
      }
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token', data: null });
  }
});

app.get('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', data: null });
    }
    return res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/auth/logout', authenticateToken, async (req, res) => {
  await logAudit(req.user.username, 'USER_LOGOUT', req.user.username, 'User logged out', req);
  return res.json({ success: true, message: 'Logged out successfully', data: null });
});


// ==========================================
// PATIENT SERVICE PATHS (/patients/*)
// ==========================================
app.post('/patients', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    await logAudit(req.user.username, 'CREATE_PATIENT', patient._id, 'Created patient record for ' + patient.firstName + ' ' + patient.lastName, req);
    return res.json({ success: true, message: 'Patient record created successfully', data: patient });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/patients/search', authenticateToken, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  const { query } = req.query;
  try {
    const regex = new RegExp(query, 'i');
    const list = await Patient.find({
      $or: [
        { _id: regex },
        { firstName: regex },
        { lastName: regex },
        { email: regex }
      ]
    });
    return res.json({ success: true, message: 'Patient search completed', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/patients/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found', data: null });
    }
    await logAudit(req.user.username, 'VIEW_PATIENT_DEMOGRAPHICS', req.params.id, 'Viewed patient profile data', req);
    return res.json({ success: true, message: 'Patient profile retrieved successfully', data: patient });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.put('/patients/update', authenticateToken, async (req, res) => {
  const { id } = req.query;
  try {
    const updated = await Patient.findByIdAndUpdate(id, req.body, { new: true });
    await logAudit(req.user.username, 'UPDATE_PATIENT_DEMOGRAPHICS', id, 'Updated patient demographic profile info', req);
    return res.json({ success: true, message: 'Patient profile updated successfully', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.put('/patients/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAudit(req.user.username, 'UPDATE_PATIENT_DEMOGRAPHICS', req.params.id, 'Updated patient demographic profile info', req);
    return res.json({ success: true, message: 'Patient profile updated successfully', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.delete('/patients/:id', authenticateToken, async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    await logAudit(req.user.username, 'DELETE_PATIENT', req.params.id, 'Deleted patient demographic record', req);
    return res.json({ success: true, message: 'Patient record deleted successfully', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// CONSENT SERVICE PATHS (/consent/*)
// ==========================================
app.post('/consent/grant', authenticateToken, async (req, res) => {
  const { patientId, doctorId, authorizedResourceTypes, expiresAt } = req.body;
  try {
    await Consent.deleteOne({ patientId, doctorId }); // overwrite existing
    const granted = await Consent.create({
      patientId,
      doctorId,
      status: 'GRANTED',
      grantedAt: new Date(),
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 3600 * 1000),
      authorizedResourceTypes: authorizedResourceTypes || ['Vitals', 'Medications', 'Conditions']
    });
    await logAudit(req.user.username, 'GRANT_CONSENT', patientId, 'Granted HIPAA data access consent to doctor: ' + doctorId, req);
    return res.json({ success: true, message: 'Consent granted successfully', data: granted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/consent/revoke', authenticateToken, async (req, res) => {
  const { patientId, doctorId } = req.query;
  try {
    const consent = await Consent.findOneAndUpdate(
      { patientId, doctorId },
      { status: 'REVOKED' },
      { new: true }
    );
    await logAudit(req.user.username, 'REVOKE_CONSENT', patientId, 'Revoked HIPAA data access consent from doctor: ' + doctorId, req);
    return res.json({ success: true, message: 'Consent revoked successfully', data: consent });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/consent/check', authenticateToken, async (req, res) => {
  const { patientId, doctorId, resourceType } = req.query;
  try {
    const consent = await Consent.findOne({ patientId, doctorId });
    if (!consent || consent.status !== 'GRANTED') {
      return res.json({ success: true, message: 'Access denied or consent missing/expired', data: false });
    }
    const isExpired = new Date() > new Date(consent.expiresAt);
    if (isExpired) {
      consent.status = 'EXPIRED';
      await consent.save();
      return res.json({ success: true, message: 'Access denied or consent missing/expired', data: false });
    }
    
    // Check resource type
    if (resourceType && !consent.authorizedResourceTypes.includes(resourceType)) {
       return res.json({ success: true, message: `Access denied: resource type ${resourceType} not authorized`, data: false });
    }

    return res.json({ success: true, message: 'Access authorized under HIPAA rules', data: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: false });
  }
});

app.get('/consent/history', authenticateToken, async (req, res) => {
  const { patientId } = req.query;
  try {
    const list = await Consent.find({ patientId });
    return res.json({ success: true, message: 'Consent history retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// PROVIDER SERVICE PATHS (/provider/*)
// ==========================================
app.post('/provider/register', authenticateToken, async (req, res) => {
  try {
    const provider = await Provider.create(req.body);
    await logAudit(req.user.username, 'REGISTER_PROVIDER', provider._id, 'Registered provider directory listing', req);
    return res.json({ success: true, message: 'Healthcare provider registered successfully', data: provider });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/provider/schedule', authenticateToken, async (req, res) => {
  const { providerId } = req.query;
  const schedule = req.body;
  try {
    const updated = await Provider.findByIdAndUpdate(providerId, { schedule }, { new: true });
    return res.json({ success: true, message: 'Provider schedule updated successfully', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/provider/list', authenticateToken, async (req, res) => {
  const { type, specialty } = req.query;
  try {
    let query = {};
    if (type) query.type = type;
    if (specialty) query.specialty = specialty;
    const list = await Provider.find(query);
    return res.json({ success: true, message: 'Providers list retrieved successfully', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/provider/:id', authenticateToken, async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found', data: null });
    }
    return res.json({ success: true, message: 'Provider details retrieved successfully', data: provider });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// WEARABLE SERVICE PATHS (/wearable/*)
// ==========================================
app.post('/wearable/register', authenticateToken, async (req, res) => {
  const { patientId, deviceId, deviceName, deviceType } = req.body;
  try {
    const device = await WearableDevice.create({
      patientId,
      deviceId,
      deviceName,
      deviceType,
      status: 'ACTIVE',
      lastSyncedAt: new Date()
    });
    await logAudit(req.user.username, 'REGISTER_WEARABLE', deviceId, 'Registered wearable sensor for patient ' + patientId, req);
    return res.json({ success: true, message: 'Wearable device registered successfully', data: device });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/wearable/sync', authenticateToken, async (req, res) => {
  const { deviceId } = req.query;
  const vitalDTO = req.body; // VitalDTO
  try {
    const device = await WearableDevice.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not registered', data: null });
    }
    device.lastSyncedAt = new Date();
    await device.save();

    // 1. Add record to stream's vitals collection
    const vitalRecord = await VitalRecord.create({
      ...vitalDTO,
      recordedAt: new Date()
    });

    // 2. Append to Digital Twin history and recalculate risk
    const twin = await HealthTwin.findOne({ patientId: device.patientId });
    if (twin) {
      twin.vitalsHistory.push(vitalRecord);
      // Keep only last 50 vitals
      if (twin.vitalsHistory.length > 50) {
        twin.vitalsHistory.shift();
      }

      // Check vital boundaries for alerts
      const hr = vitalDTO.heartRate;
      const oxy = vitalDTO.oxygenLevel;
      let isRiskCritical = false;
      let alertMsg = '';
      
      if (hr > 120 || hr < 50) {
        isRiskCritical = true;
        alertMsg = `Critical Heart Rate alert: ${hr} BPM`;
      }
      if (oxy < 92) {
        isRiskCritical = true;
        alertMsg += (alertMsg ? ' & ' : '') + `Critical SpO2 alert: ${oxy}%`;
      }

      if (isRiskCritical) {
        twin.riskCategory = 'HIGH';
        
        // Log Critical Alarm Notification
        await NotificationLog.create({
          patientId: device.patientId,
          message: `Vital alarm for patient ${device.patientId}: ${alertMsg}`,
          type: 'CRITICAL',
          status: 'UNREAD',
          createdAt: new Date()
        });
      } else if (hr > 100 || oxy < 95) {
        twin.riskCategory = 'MEDIUM';
        
        await NotificationLog.create({
          patientId: device.patientId,
          message: `Elevated vitals monitored: Heart rate ${hr} BPM, Oxygen ${oxy}%`,
          type: 'WARNING',
          status: 'UNREAD',
          createdAt: new Date()
        });
      } else {
        twin.riskCategory = 'LOW';
      }

      twin.lastRebuilt = new Date();
      await twin.save();
    }

    return res.json({ success: true, message: 'Wearable vitals streamed successfully', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/wearable/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const list = await WearableDevice.find({ patientId: req.params.patientId });
    return res.json({ success: true, message: 'Linked wearable devices list retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// KAFKA STREAM SERVICE PATHS (/stream/*)
// ==========================================
app.post('/stream/replay', authenticateToken, async (req, res) => {
  const { patientId } = req.query;
  try {
    // Generate some random simulated vitals and stream them
    const now = Date.now();
    const vitals = [];
    for (let i = 0; i < 5; i++) {
      const time = new Date(now - i * 60000); // 1 min apart
      vitals.push({
        id: `replay-${patientId}-${i}`,
        patientId,
        heartRate: Math.round(70 + Math.random() * 25),
        bloodPressure: '128/82',
        temperature: 36.6,
        oxygenLevel: Math.round(96 + Math.random() * 4),
        caloriesBurned: 50,
        sleepMinutes: 0,
        steps: 120,
        recordedAt: time
      });
    }

    // Add them to the patient's twin history
    const twin = await HealthTwin.findOne({ patientId });
    if (twin) {
      twin.vitalsHistory.push(...vitals);
      if (twin.vitalsHistory.length > 50) {
        twin.vitalsHistory = twin.vitalsHistory.slice(twin.vitalsHistory.length - 50);
      }
      twin.lastRebuilt = new Date();
      await twin.save();
    }

    await logAudit(req.user.username, 'KAFKA_STREAM_REPLAY', patientId, 'Triggered Kafka vitals telemetry replay sequence', req);
    return res.json({ success: true, message: 'Event replay started successfully for patient: ' + patientId, data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/stream/dlq', authenticateToken, async (req, res) => {
  const { rawPayload, reason } = req.query;
  try {
    const item = {
      id: `dlq-${Date.now()}`,
      rawPayload,
      reason,
      timestamp: new Date()
    };
    dlqPayloads.unshift(item);
    await logAudit(req.user.username, 'KAFKA_STREAM_DLQ_ROUTE', 'DLQ_MOCK', 'Routed faulty payload to Dead Letter Queue: ' + reason, req);
    return res.json({ success: true, message: 'Mock payload routed to DLQ successfully', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Extra endpoint to view DLQ
app.get('/stream/dlq/list', authenticateToken, (req, res) => {
  return res.json({ success: true, message: 'DLQ logs fetched successfully', data: dlqPayloads });
});


// ==========================================
// FHIR SERVICE PATHS (/fhir/*)
// ==========================================
app.get('/fhir/patient/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found', data: null });
    }
    
    // FHIR R4 standard JSON format
    const fhirResource = {
      resourceType: "Patient",
      id: patient._id,
      active: true,
      name: [
        {
          use: "official",
          family: patient.lastName,
          given: [patient.firstName]
        }
      ],
      telecom: [
        { system: "phone", value: patient.phoneNumber, use: "mobile" },
        { system: "email", value: patient.email, use: "home" }
      ],
      gender: patient.gender ? patient.gender.toLowerCase() : "unknown",
      birthDate: patient.dateOfBirth,
      address: [
        { text: patient.address }
      ],
      contact: [
        {
          relationship: [
            {
              coding: [
                { system: "http://terminology.hl7.org/CodeSystem/v2-0131", code: "C", display: "Emergency Contact" }
              ]
            }
          ],
          name: { text: patient.emergencyContactName },
          telecom: [{ system: "phone", value: patient.emergencyContactPhone }]
        }
      ]
    };

    return res.json({ success: true, message: 'Patient FHIR Resource generated successfully', data: JSON.stringify(fhirResource, null, 2) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/fhir/observation/:id', authenticateToken, async (req, res) => {
  try {
    const twin = await HealthTwin.findOne({ patientId: req.params.id });
    const lastVital = (twin && twin.vitalsHistory.length > 0) ? twin.vitalsHistory[twin.vitalsHistory.length - 1] : { heartRate: 72, recordedAt: new Date() };

    const fhirResource = {
      resourceType: "Observation",
      id: `obs-${req.params.id}`,
      status: "final",
      category: [
        {
          coding: [
            { system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }
          ]
        }
      ],
      code: {
        coding: [
          { system: "http://loinc.org", code: "8867-4", display: "Heart rate" }
        ],
        text: "Heart rate"
      },
      subject: {
        reference: `Patient/${req.params.id}`
      },
      effectiveDateTime: lastVital.recordedAt,
      valueQuantity: {
        value: lastVital.heartRate,
        unit: "beats/minute",
        system: "http://unitsofmeasure.org",
        code: "/min"
      }
    };

    return res.json({ success: true, message: 'Observation FHIR Resource generated successfully', data: JSON.stringify(fhirResource, null, 2) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/fhir/medication/:id', authenticateToken, async (req, res) => {
  try {
    const twin = await HealthTwin.findOne({ patientId: req.params.id });
    const medications = twin ? twin.activeMedications : [];

    const fhirResource = {
      resourceType: "MedicationRequest",
      id: `med-${req.params.id}`,
      status: "active",
      intent: "order",
      subject: {
        reference: `Patient/${req.params.id}`
      },
      medicationCodeableConcept: {
        text: medications.join(', ') || "No active medications"
      },
      authoredOn: new Date()
    };

    return res.json({ success: true, message: 'Medication FHIR Resource generated successfully', data: JSON.stringify(fhirResource, null, 2) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/fhir/sync/:id', authenticateToken, async (req, res) => {
  try {
    await logAudit(req.user.username, 'FHIR_SYNC', req.params.id, 'Synced local EHR with HL7 FHIR servers', req);
    return res.json({ success: true, message: 'FHIR records synced with external hospital APIs successfully', data: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: false });
  }
});


// ==========================================
// DIGITAL TWIN SERVICE PATHS (/twin/*)
// ==========================================
app.post('/twin/create', authenticateToken, async (req, res) => {
  const { patientId } = req.query;
  try {
    const twin = await HealthTwin.create({
      patientId,
      completenessScore: 50.0,
      vitalsHistory: [],
      activeMedications: [],
      activeConditions: [],
      riskCategory: 'LOW',
      lastRebuilt: new Date()
    });
    return res.json({ success: true, message: 'Digital Health Twin created successfully', data: twin });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.put('/twin/update', authenticateToken, async (req, res) => {
  const { patientId } = req.query;
  try {
    const twin = await HealthTwin.findOneAndUpdate({ patientId }, req.body, { new: true });
    return res.json({ success: true, message: 'Digital Health Twin updated successfully', data: twin });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/twin/:patientId', authenticateToken, async (req, res) => {
  try {
    const twin = await HealthTwin.findOne({ patientId: req.params.patientId });
    if (!twin) {
      return res.status(404).json({ success: false, message: 'Digital Health Twin not found', data: null });
    }
    return res.json({ success: true, message: 'Digital Health Twin retrieved successfully', data: twin });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/twin/rebuild', authenticateToken, async (req, res) => {
  const { patientId } = req.query;
  try {
    const twin = await HealthTwin.findOne({ patientId });
    if (!twin) {
      return res.status(404).json({ success: false, message: 'Twin not found', data: null });
    }

    // Recalculate completeness score based on filled fields
    const patient = await Patient.findById(patientId);
    let filledFields = 0;
    let totalFields = 8;
    
    if (patient) {
      if (patient.firstName) filledFields++;
      if (patient.lastName) filledFields++;
      if (patient.email) filledFields++;
      if (patient.phoneNumber) filledFields++;
      if (patient.dateOfBirth) filledFields++;
      if (patient.gender) filledFields++;
      if (patient.emergencyContactName) filledFields++;
      if (patient.insuranceProvider) filledFields++;
    }

    const fieldScore = (filledFields / totalFields) * 50; // up to 50%
    const vitalsScore = twin.vitalsHistory.length > 0 ? 50 : 10; // up to 50%

    twin.completenessScore = Math.round(fieldScore + vitalsScore);
    twin.lastRebuilt = new Date();
    await twin.save();
    
    await logAudit(req.user.username, 'REBUILD_DIGITAL_TWIN', patientId, 'Triggered machine learning digital twin rebuilding algorithm', req);
    return res.json({ success: true, message: 'Digital Health Twin analysis rebuilt successfully', data: twin });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// AUDIT SERVICE PATHS (/audit/*)
// ==========================================
app.get('/audit/logs', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const { username } = req.query;
  try {
    let query = {};
    if (username) {
      query.username = username;
    }
    const list = await AuditLog.find(query).sort({ timestamp: -1 });
    return res.json({ success: true, message: 'Audit logs retrieved successfully', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// DASHBOARD SERVICE PATHS (/dashboard/*)
// ==========================================
app.get(['/dashboard/patient360', '/api/dashboard/patient360'], authenticateToken, async (req, res) => {
  const patientId = req.query.patientId || 'john_doe';
  const doctorId = req.query.doctorId || req.user?.username || 'doctor';
  
  try {
    const consent = await Consent.findOne({ patientId, doctorId });
    const consentCheckResult = consent ? consent.status === 'GRANTED' : true;

    await logAudit(req.user?.username || doctorId, 'QUERY_PATIENT_360', patientId, `Queried 360 patient dashboard. Consent check: ${consentCheckResult ? 'SUCCESS' : 'NO_CONSENT_RECORD'}`, req);

    let patientProfile = await Patient.findById(patientId);
    if (!patientProfile) {
      patientProfile = fallbackPatientProfiles[patientId] || fallbackPatientProfiles.john_doe;
      if (patientProfile && !patientProfile._id) patientProfile._id = patientId;
    }

    let digitalTwin = await HealthTwin.findOne({ patientId });
    if (!digitalTwin) {
      digitalTwin = fallbackDigitalTwins[patientId] || fallbackDigitalTwins.john_doe;
    } else {
      digitalTwin = digitalTwin.toObject ? digitalTwin.toObject() : digitalTwin;
    }

    // Ensure vitalsHistory is non-empty for telemetry charts & 3D body
    if (!digitalTwin.vitalsHistory || digitalTwin.vitalsHistory.length === 0) {
      const liveHistory = await VitalRecord.find({ patientId }).sort({ recordedAt: -1 }).limit(10);
      if (liveHistory && liveHistory.length > 0) {
        digitalTwin.vitalsHistory = liveHistory.reverse();
      } else {
        digitalTwin.vitalsHistory = [
          { recordedAt: '10:00 AM', heartRate: 72, oxygenLevel: 98, temperature: 36.6, bloodPressure: '120/80' },
          { recordedAt: '11:00 AM', heartRate: 75, oxygenLevel: 97, temperature: 36.7, bloodPressure: '122/82' },
          { recordedAt: '12:00 PM', heartRate: 88, oxygenLevel: 99, temperature: 36.8, bloodPressure: '125/84' },
          { recordedAt: '01:00 PM', heartRate: 76, oxygenLevel: 98, temperature: 36.6, bloodPressure: '120/80' },
          { recordedAt: '02:00 PM', heartRate: 80, oxygenLevel: 98, temperature: 36.7, bloodPressure: '121/81' }
        ];
      }
    }

    const riskLevel = digitalTwin ? (digitalTwin.riskCategory || 'MEDIUM') : 'MEDIUM';
    const alertStatus = riskLevel === 'HIGH' ? 'ALERT' : 'NORMAL';

    return res.json({
      success: true,
      message: 'Patient 360 degree dashboard compiled successfully',
      data: {
        patientId,
        patientProfile,
        digitalTwin,
        consentCheckResult,
        healthRiskLevel: riskLevel,
        alertStatusSummary: alertStatus,
        labReports: [
          { test: 'HbA1c Glucose', value: '6.8 %', range: '4.0 - 5.6 %', status: 'Elevated' },
          { test: 'Total Cholesterol', value: '215 mg/dL', range: '< 200 mg/dL', status: 'Elevated' },
          { test: 'Systolic Blood Pressure', value: '135 mmHg', range: '< 120 mmHg', status: 'Elevated' },
          { test: 'SpO2 Oxygen Saturation', value: '98 %', range: '95 - 100 %', status: 'Normal' }
        ],
        medicalTimeline: [
          { date: '2026-07-15', event: '3D Health Twin Rebuild & AI Risk Audit', doctor: 'Dr. Sarah Jenkins' },
          { date: '2026-06-28', event: 'Comprehensive Cardiology Telemetry Check', doctor: 'Dr. Robert Vance' },
          { date: '2026-05-10', event: 'Routine EHR FHIR Synchronization', doctor: 'System Sync' }
        ],
        activePrescriptions: [
          { medication: 'Lisinopril', dosage: '10mg', frequency: 'Once Daily', doctorId: 'Dr. Vance' },
          { medication: 'Metformin', dosage: '500mg', frequency: 'Twice Daily', doctorId: 'Dr. Jenkins' }
        ]
      }
    });
  } catch (err) {
    console.warn('Patient 360 dashboard fallback triggered:', err.message);
    return res.json({
      success: true,
      message: 'Patient 360 degree dashboard compiled successfully using fallback data',
      data: buildFallbackDashboard(patientId, doctorId)
    });
  }
});


// Extra Notification API for alerts
app.get('/notifications/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const list = await NotificationLog.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    return res.json({ success: true, message: 'Notifications retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/notifications/read', authenticateToken, async (req, res) => {
  const { patientId } = req.body;
  try {
    await NotificationLog.updateMany({ patientId, status: 'UNREAD' }, { status: 'READ' });
    return res.json({ success: true, message: 'All notifications marked as read', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Health check endpoint
app.get('/actuator/health', (req, res) => {
  return res.json({ status: 'UP' });
});


// ==========================================
// ADMIN SERVICE PATHS (/admin/*)
// ==========================================
app.get('/admin/system-health', authenticateToken, async (req, res) => {
  try {
    const roles = req.user.roles || [];
    if (!roles.some(r => r.includes('ADMIN'))) {
      return res.status(403).json({ success: false, message: 'Admin access required', data: null });
    }

    // Check MongoDB connectivity
    const mongoStatus = mongoose.STATES[mongoose.connection.readyState];

    // Aggregate counts
    const [totalPatients, totalConsents, totalAudits, totalDevices] = await Promise.all([
      Patient.countDocuments(),
      Consent.countDocuments({ status: 'GRANTED' }),
      AuditLog.countDocuments(),
      WearableDevice.countDocuments({ status: 'ACTIVE' })
    ]);

    return res.json({
      success: true,
      message: 'System health retrieved successfully',
      data: {
        status: 'HEALTHY',
        timestamp: new Date().toISOString(),
        services: {
          apiGateway: { status: 'UP', responseTime: '12ms', version: '1.0.0' },
          mongodb: { status: mongoStatus === 'connected' ? 'UP' : 'DEGRADED', responseTime: '8ms', collections: 9 },
          kafka: { status: 'UP', throughput: '1.2 K/s', topics: ['vitals-stream', 'audit-events', 'notifications'], lag: 0 },
          fhirServer: { status: 'UP', version: 'R4', endpoint: 'https://hapi.fhir.org/baseR4', lastCheck: new Date().toISOString() },
          oauth2: { status: 'UP', provider: 'SMART on FHIR', tokenEndpoint: '/auth/token', issuer: 'medisphere-auth' }
        },
        metrics: {
          totalPatients,
          activeConsents: totalConsents,
          auditTrailSize: totalAudits,
          liveDevices: totalDevices,
          cpuUsage: `${Math.floor(15 + Math.random() * 30)}%`,
          memoryUsage: `${Math.floor(40 + Math.random() * 20)}%`,
          uptime: process.uptime().toFixed(0) + 's',
          requestsPerMinute: Math.floor(80 + Math.random() * 40)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/admin/statistics', authenticateToken, async (req, res) => {
  try {
    const roles = req.user.roles || [];
    if (!roles.some(r => r.includes('ADMIN'))) {
      return res.status(403).json({ success: false, message: 'Admin access required', data: null });
    }

    const [totalPatients, totalDoctors, totalConsents, revokedConsents, totalAudits, totalDevices, totalTwins] = await Promise.all([
      Patient.countDocuments(),
      Provider.countDocuments({ type: 'DOCTOR' }),
      Consent.countDocuments({ status: 'GRANTED' }),
      Consent.countDocuments({ status: 'REVOKED' }),
      AuditLog.countDocuments(),
      WearableDevice.countDocuments(),
      HealthTwin.countDocuments()
    ]);

    // Disease distribution from twins
    const twins = await HealthTwin.find({}, 'activeConditions riskCategory');
    const conditionCount = {};
    const riskDist = { LOW: 0, MEDIUM: 0, HIGH: 0, UNKNOWN: 0 };
    twins.forEach(t => {
      (t.activeConditions || []).forEach(c => { conditionCount[c] = (conditionCount[c] || 0) + 1; });
      riskDist[t.riskCategory || 'UNKNOWN'] = (riskDist[t.riskCategory || 'UNKNOWN'] || 0) + 1;
    });

    // Recent audit activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const recentActivity = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return res.json({
      success: true,
      message: 'System statistics retrieved successfully',
      data: {
        summary: { totalPatients, totalDoctors, totalConsents, revokedConsents, totalAudits, totalDevices, totalTwins },
        diseaseDistribution: Object.entries(conditionCount).map(([name, value]) => ({ name, value })),
        riskDistribution: Object.entries(riskDist).map(([name, value]) => ({ name, value })),
        consentStats: {
          granted: totalConsents,
          revoked: revokedConsents,
          total: totalConsents + revokedConsents
        },
        auditActivity: recentActivity,
        fhirSyncStats: { totalSyncs: Math.floor(totalPatients * 2.3), lastSync: new Date().toISOString(), successRate: '98.7%' },
        kafkaStats: { messagesProcessed: Math.floor(totalDevices * 1440), failedMessages: Math.floor(totalDevices * 2), dlqSize: dlqPayloads.length }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// VITALS SERVICE PATHS (/vitals/*)
// ==========================================
app.post('/vitals/send', authenticateToken, async (req, res) => {
  const vitalDTO = req.body;
  try {
    const record = await VitalRecord.create({ ...vitalDTO, recordedAt: new Date() });
    // Update twin
    const twin = await HealthTwin.findOne({ patientId: vitalDTO.patientId });
    if (twin) {
      twin.vitalsHistory.push(record);
      if (twin.vitalsHistory.length > 50) twin.vitalsHistory.shift();
      const hr = vitalDTO.heartRate;
      const oxy = vitalDTO.oxygenLevel;
      if (hr > 120 || hr < 50 || oxy < 92) {
        twin.riskCategory = 'HIGH';
        await NotificationLog.create({
          patientId: vitalDTO.patientId,
          message: `Critical vital alert: HR=${hr}bpm, SpO2=${oxy}%`,
          type: 'CRITICAL', status: 'UNREAD', createdAt: new Date()
        });
      } else if (hr > 100 || oxy < 95) {
        twin.riskCategory = 'MEDIUM';
      } else {
        twin.riskCategory = 'LOW';
      }
      twin.lastRebuilt = new Date();
      await twin.save();
    }
    await logAudit(req.user.username, 'VITALS_SEND', vitalDTO.patientId, `Vitals pushed: HR=${vitalDTO.heartRate}, SpO2=${vitalDTO.oxygenLevel}`, req);
    return res.json({ success: true, message: 'Vitals recorded and twin updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/vitals/live/:patientId', authenticateToken, async (req, res) => {
  // Server-Sent Events for live vitals streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');

  const patientId = req.params.patientId;
  let interval;

  const sendVitals = async () => {
    try {
      const twin = await HealthTwin.findOne({ patientId });
      const lastVital = twin && twin.vitalsHistory.length > 0
        ? twin.vitalsHistory[twin.vitalsHistory.length - 1]
        : { heartRate: 72, oxygenLevel: 98, temperature: 36.6, bloodPressure: '120/80' };

      // Add small random variation for live feel
      const liveVital = {
        heartRate: Math.max(50, Math.min(150, (lastVital.heartRate || 72) + Math.floor((Math.random() - 0.5) * 6))),
        oxygenLevel: Math.max(88, Math.min(100, (lastVital.oxygenLevel || 98) + (Math.random() - 0.5))),
        temperature: parseFloat(((lastVital.temperature || 36.6) + (Math.random() - 0.5) * 0.2).toFixed(1)),
        bloodPressure: lastVital.bloodPressure || '120/80',
        timestamp: new Date().toISOString(),
        patientId
      };

      res.write(`data: ${JSON.stringify(liveVital)}\n\n`);
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
    }
  };

  await sendVitals();
  interval = setInterval(sendVitals, 3000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

app.get('/vitals/history/:patientId', authenticateToken, async (req, res) => {
  try {
    const records = await VitalRecord.find({ patientId: req.params.patientId })
      .sort({ recordedAt: -1 })
      .limit(100);
    return res.json({ success: true, message: 'Vitals history retrieved', data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// LAB REPORTS PATHS (/labs/*)
// ==========================================
app.get('/labs/:patientId', authenticateToken, async (req, res) => {
  try {
    const twin = await HealthTwin.findOne({ patientId: req.params.patientId });
    // Generate realistic lab data based on conditions
    const conditions = twin ? twin.activeConditions : [];
    const hasDiabetes = conditions.some(c => c.toLowerCase().includes('diabet'));
    const hasHypertension = conditions.some(c => c.toLowerCase().includes('hypertens'));

    const labs = [
      { test: 'HbA1c', value: hasDiabetes ? '7.2%' : '5.4%', range: '4.0% - 5.6%', status: hasDiabetes ? 'Elevated' : 'Normal', unit: '%', date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), trend: hasDiabetes ? 'rising' : 'stable' },
      { test: 'Hemoglobin', value: '14.2', range: '13.8 - 17.2', status: 'Normal', unit: 'g/dL', date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), trend: 'stable' },
      { test: 'Total Cholesterol', value: hasHypertension ? '218' : '185', range: '< 200', status: hasHypertension ? 'Borderline' : 'Normal', unit: 'mg/dL', date: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(), trend: hasHypertension ? 'rising' : 'stable' },
      { test: 'LDL Cholesterol', value: hasHypertension ? '145' : '105', range: '< 130', status: hasHypertension ? 'Elevated' : 'Normal', unit: 'mg/dL', date: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(), trend: 'stable' },
      { test: 'HDL Cholesterol', value: '52', range: '> 40', status: 'Normal', unit: 'mg/dL', date: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(), trend: 'stable' },
      { test: 'Fasting Glucose', value: hasDiabetes ? '138' : '92', range: '70 - 99', status: hasDiabetes ? 'High' : 'Normal', unit: 'mg/dL', date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), trend: hasDiabetes ? 'rising' : 'stable' },
      { test: 'Creatinine (Kidney)', value: '0.9', range: '0.7 - 1.2', status: 'Normal', unit: 'mg/dL', date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), trend: 'stable' },
      { test: 'ALT (Liver)', value: '28', range: '7 - 40', status: 'Normal', unit: 'U/L', date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), trend: 'stable' },
      { test: 'TSH (Thyroid)', value: '2.1', range: '0.4 - 4.0', status: 'Normal', unit: 'mIU/L', date: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(), trend: 'stable' },
      { test: 'Vitamin D', value: '28', range: '30 - 100', status: 'Deficient', unit: 'ng/mL', date: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(), trend: 'falling' }
    ];

    await logAudit(req.user.username, 'VIEW_LAB_REPORTS', req.params.patientId, 'Viewed patient lab report panel', req);
    return res.json({ success: true, message: 'Lab reports retrieved', data: labs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// APPOINTMENTS PATHS (/appointments/*)
// ==========================================
const AppointmentSchema = new mongoose.Schema({
  patientId: String,
  doctorId: String,
  doctorName: String,
  specialty: String,
  date: Date,
  time: String,
  type: String,
  status: String,
  notes: String,
  location: String,
  createdAt: { type: Date, default: Date.now }
});

const Appointment = conns.patient.model('appointments', AppointmentSchema);

app.post('/appointments', authenticateToken, async (req, res) => {
  try {
    const appt = await Appointment.create({ ...req.body, createdAt: new Date() });
    await logAudit(req.user.username, 'SCHEDULE_APPOINTMENT', req.body.patientId, `Appointment scheduled with ${req.body.doctorId}`, req);
    return res.json({ success: true, message: 'Appointment scheduled successfully', data: appt });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/appointments/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const list = await Appointment.find({ patientId: req.params.patientId }).sort({ date: 1 });
    await logAudit(req.user.username, 'VIEW_APPOINTMENTS', req.params.patientId, 'Viewed appointment schedule', req);
    return res.json({ success: true, message: 'Appointments retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.put('/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, message: 'Appointment updated', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.delete('/appointments/:id', authenticateToken, async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Appointment cancelled', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// AI PREDICTION SERVICE PATHS (/api/prediction/*)
// ==========================================

// Helper function to calculate CVD risk score
function calculateCvdRisk(age = 50, bp = 120, bmi = 24, cholesterol = 180, heartRate = 75) {
  let score = 10;
  if (age > 60) score += 25; else if (age > 45) score += 15;
  if (bp > 140) score += 30; else if (bp > 125) score += 15;
  if (bmi > 30) score += 20; else if (bmi > 25) score += 10;
  if (cholesterol > 240) score += 25; else if (cholesterol > 200) score += 15;
  if (heartRate > 100) score += 10;
  
  const riskPercentage = Math.min(Math.max(score, 5), 98);
  let riskLevel = 'LOW';
  if (riskPercentage >= 65) riskLevel = 'HIGH';
  else if (riskPercentage >= 35) riskLevel = 'MEDIUM';
  
  return { riskPercentage, riskLevel };
}

// Helper function to calculate Diabetes risk score
function calculateDiabetesRisk(age = 50, bmi = 24, hba1c = 5.5, bp = 120) {
  let score = 10;
  if (hba1c >= 6.5) score += 45; else if (hba1c >= 5.7) score += 25;
  if (bmi > 30) score += 25; else if (bmi > 25) score += 12;
  if (age > 50) score += 15;
  if (bp > 130) score += 10;

  const riskPercentage = Math.min(Math.max(score, 5), 98);
  let riskLevel = 'LOW';
  if (riskPercentage >= 65) riskLevel = 'HIGH';
  else if (riskPercentage >= 35) riskLevel = 'MEDIUM';

  return { riskPercentage, riskLevel };
}

app.post('/api/prediction/cvd', authenticateToken, async (req, res) => {
  try {
    const { patientId, age, bloodPressure, bmi, hba1c, cholesterol, heartRate } = req.body;
    const pid = patientId || 'PAT101';
    const { riskPercentage, riskLevel } = calculateCvdRisk(age, bloodPressure, bmi, cholesterol, heartRate);

    const prediction = await Prediction.create({
      id: `pred-${Date.now()}`,
      patientId: pid,
      predictionType: 'CVD',
      riskType: 'CARDIO',
      riskLevel,
      riskPercentage,
      confidence: 92.5,
      modelVersion: 'v1.0.0',
      predictionDate: new Date().toISOString().split('T')[0],
      age: age || 65,
      bloodPressure: bloodPressure || 145,
      bmi: bmi || 32,
      hba1c: hba1c || 7.5,
      cholesterol: cholesterol || 230,
      heartRate: heartRate || 115
    });

    await logAudit(req.user?.username || 'system', 'AI_CVD_PREDICTION', pid, `CVD Risk Prediction generated: ${riskLevel} (${riskPercentage}%)`, req);
    return res.json({ success: true, message: 'CVD risk prediction completed successfully', data: prediction });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/api/prediction/diabetes', authenticateToken, async (req, res) => {
  try {
    const { patientId, age, bloodPressure, bmi, hba1c, cholesterol, heartRate } = req.body;
    const pid = patientId || 'PAT101';
    const { riskPercentage, riskLevel } = calculateDiabetesRisk(age, bmi, hba1c, bloodPressure);

    const prediction = await Prediction.create({
      id: `pred-${Date.now()}`,
      patientId: pid,
      predictionType: 'DIABETES',
      riskType: 'DIABETES',
      riskLevel,
      riskPercentage,
      confidence: 94.1,
      modelVersion: 'v1.0.0',
      predictionDate: new Date().toISOString().split('T')[0],
      age: age || 65,
      bloodPressure: bloodPressure || 145,
      bmi: bmi || 32,
      hba1c: hba1c || 7.5,
      cholesterol: cholesterol || 230,
      heartRate: heartRate || 115
    });

    await logAudit(req.user?.username || 'system', 'AI_DIABETES_PREDICTION', pid, `Diabetes Risk Prediction generated: ${riskLevel} (${riskPercentage}%)`, req);
    return res.json({ success: true, message: 'Diabetes risk prediction completed successfully', data: prediction });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/prediction/history/:patientId', authenticateToken, async (req, res) => {
  try {
    const history = await Prediction.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    if (history.length === 0) {
      // Seed default history item for smooth UI experience
      const defaultPred = {
        id: `pred-seed-${req.params.patientId}`,
        patientId: req.params.patientId,
        predictionType: 'CVD',
        riskType: 'CARDIO',
        riskLevel: 'HIGH',
        riskPercentage: 78,
        confidence: 92.5,
        modelVersion: 'v1.0.0',
        predictionDate: new Date().toISOString().split('T')[0],
        age: 65, bloodPressure: 145, bmi: 32, hba1c: 7.5, cholesterol: 230, heartRate: 115
      };
      return res.json({ success: true, message: 'Prediction history retrieved successfully', data: [defaultPred] });
    }
    return res.json({ success: true, message: 'Prediction history retrieved successfully', data: history });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/prediction/latest/:patientId', authenticateToken, async (req, res) => {
  try {
    let latest = await Prediction.findOne({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    if (!latest) {
      latest = {
        id: `pred-seed-${req.params.patientId}`,
        patientId: req.params.patientId,
        predictionType: 'CVD',
        riskType: 'CARDIO',
        riskLevel: 'HIGH',
        riskPercentage: 78,
        confidence: 92.5,
        modelVersion: 'v1.0.0',
        predictionDate: new Date().toISOString().split('T')[0],
        age: 65, bloodPressure: 145, bmi: 32, hba1c: 7.5, cholesterol: 230, heartRate: 115
      };
    }
    return res.json({ success: true, message: 'Latest prediction retrieved successfully', data: latest });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.delete('/api/prediction/:id', authenticateToken, async (req, res) => {
  try {
    await Prediction.deleteOne({ id: req.params.id });
    return res.json({ success: true, message: 'Prediction deleted successfully', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/prediction/accuracy', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    message: 'Accuracy metrics retrieved',
    data: {
      overallAccuracy: 91.4,
      cvdAccuracy: 89.7,
      diabetesAccuracy: 93.1,
      f1Score: 0.88,
      auc: 0.92,
      modelVersion: 'v1.0.0',
      evaluationDate: new Date().toISOString().split('T')[0]
    }
  });
});

app.get('/api/prediction/calibration', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    message: 'Calibration metrics retrieved',
    data: {
      brierScore: 0.12,
      expectedCalibrationError: 0.08,
      calibrationSlope: 1.02,
      calibrationIntercept: -0.03,
      hosmerLemeshowP: 0.45,
      status: 'WELL_CALIBRATED'
    }
  });
});

app.get('/api/prediction/bias-audit', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    message: 'Bias audit results retrieved',
    data: {
      demographicParity: 0.95,
      equalizedOdds: 0.93,
      disparateImpact: 0.97,
      genderBias: 'LOW',
      ageBias: 'NEGLIGIBLE',
      overallFairness: 'PASS',
      auditDate: new Date().toISOString().split('T')[0]
    }
  });
});


// ==========================================
// AI EXPLAINABILITY SERVICE PATHS (/api/explanation/*)
// ==========================================

function buildShapFactors(bp = 145, hba1c = 7.5, chol = 230, age = 65, bmi = 32, hr = 115) {
  return [
    { factor: 'Blood Pressure', value: `${bp} mmHg`, impact: bp > 130 ? 'High' : 'Normal', contribution: Math.min(Math.round((bp - 120) * 0.4), 25), direction: bp > 120 ? 'INCREASES_RISK' : 'DECREASES_RISK' },
    { factor: 'HbA1c', value: `${hba1c}%`, impact: hba1c > 6.0 ? 'Elevated' : 'Normal', contribution: Math.min(Math.round((hba1c - 5.5) * 8), 20), direction: hba1c > 5.7 ? 'INCREASES_RISK' : 'DECREASES_RISK' },
    { factor: 'Cholesterol', value: `${chol} mg/dL`, impact: chol > 200 ? 'Elevated' : 'Normal', contribution: Math.min(Math.round((chol - 180) * 0.15), 18), direction: chol > 200 ? 'INCREASES_RISK' : 'DECREASES_RISK' },
    { factor: 'Age', value: `${age} yrs`, impact: age > 50 ? 'Risk Factor' : 'Low', contribution: Math.min(Math.round((age - 40) * 0.3), 15), direction: age > 45 ? 'INCREASES_RISK' : 'DECREASES_RISK' },
    { factor: 'BMI', value: `${bmi}`, impact: bmi > 28 ? 'Overweight' : 'Normal', contribution: Math.min(Math.round((bmi - 24) * 0.8), 12), direction: bmi > 25 ? 'INCREASES_RISK' : 'DECREASES_RISK' },
    { factor: 'Heart Rate', value: `${hr} bpm`, impact: hr > 100 ? 'Elevated' : 'Normal', contribution: Math.min(Math.round((hr - 75) * 0.15), 10), direction: hr > 90 ? 'INCREASES_RISK' : 'DECREASES_RISK' }
  ];
}

app.post('/api/explanation/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  const { age, bloodPressure, bmi, hba1c, cholesterol, heartRate, riskLevel } = req.body;
  try {
    const factors = buildShapFactors(bloodPressure, hba1c, cholesterol, age, bmi, heartRate);
    const explanationData = {
      patientId,
      riskLevel: riskLevel || 'HIGH',
      baseValue: 15.0,
      predictionValue: 78.0,
      featureImportances: factors,
      topFactors: factors,
      narrative: `SHAP feature attribution analysis indicates Systolic Blood Pressure (${bloodPressure || 145} mmHg) and HbA1c (${hba1c || 7.5}%) are the top risk drivers for patient ${patientId}.`,
      generatedAt: new Date()
    };

    await Explanation.findOneAndUpdate({ patientId }, explanationData, { upsert: true, new: true });
    await logAudit(req.user?.username || 'system', 'AI_SHAP_EXPLANATION', patientId, 'Generated SHAP explainability feature matrix', req);

    return res.json({ success: true, message: 'Explanation generated successfully', data: explanationData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/explanation/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  try {
    let explanation = await Explanation.findOne({ patientId });
    if (!explanation) {
      const factors = buildShapFactors(145, 7.5, 230, 65, 32, 115);
      explanation = {
        patientId,
        riskLevel: 'HIGH',
        baseValue: 15.0,
        predictionValue: 78.0,
        featureImportances: factors,
        topFactors: factors,
        narrative: `SHAP feature attribution analysis indicates Systolic Blood Pressure (145 mmHg) and HbA1c (7.5%) are the top risk drivers for patient ${patientId}.`,
        generatedAt: new Date()
      };
    }
    return res.json({ success: true, message: 'Explanation retrieved successfully', data: explanation });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/explanation/validate', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    message: 'Explainability engine validation complete',
    data: {
      engineStatus: 'ACTIVE',
      shapVersion: '0.42.1',
      supportedMethods: ['TreeSHAP', 'KernelSHAP', 'RuleBased'],
      activeMethod: 'RuleBased',
      factorsCovered: 6,
      lastValidation: new Date().toISOString()
    }
  });
});


// ==========================================
// AI MODEL MANAGEMENT SERVICE PATHS (/api/model/*)
// ==========================================

app.post('/api/model', authenticateToken, async (req, res) => {
  try {
    const { version, accuracy, status } = req.body;
    const model = await ModelVersion.create({
      version,
      accuracy: accuracy || 90.0,
      status: status || 'INACTIVE',
      trainedAt: new Date()
    });
    await logAudit(req.user?.username || 'system', 'CREATE_MODEL_VERSION', version, `Registered AI model version ${version}`, req);
    return res.json({ success: true, message: 'Model version registered successfully', data: model });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/model', authenticateToken, async (req, res) => {
  try {
    let models = await ModelVersion.find().sort({ trainedAt: -1 });
    if (models.length === 0) {
      models = [
        { version: 'v1.0.0', accuracy: 91.4, status: 'ACTIVE', trainedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
        { version: 'v1.1.0-beta', accuracy: 93.8, status: 'INACTIVE', trainedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000) }
      ];
    }
    return res.json({ success: true, message: 'All model versions retrieved', data: models });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/model/latest', authenticateToken, async (req, res) => {
  try {
    let active = await ModelVersion.findOne({ status: 'ACTIVE' });
    if (!active) {
      active = { version: 'v1.0.0', accuracy: 91.4, status: 'ACTIVE', trainedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) };
    }
    return res.json({ success: true, message: 'Latest active model retrieved', data: active });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.put('/api/model/:version', authenticateToken, async (req, res) => {
  const { version } = req.params;
  const { status, accuracy } = req.body;
  try {
    if (status === 'ACTIVE') {
      // Deactivate all other models first
      await ModelVersion.updateMany({}, { status: 'INACTIVE' });
    }
    const updated = await ModelVersion.findOneAndUpdate(
      { version },
      { ...(status && { status }), ...(accuracy && { accuracy }) },
      { new: true, upsert: true }
    );
    await logAudit(req.user?.username || 'system', 'UPDATE_MODEL_VERSION', version, `Updated AI model version ${version} status to ${status}`, req);
    return res.json({ success: true, message: 'Model version updated successfully', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.delete('/api/model/:version', authenticateToken, async (req, res) => {
  try {
    await ModelVersion.deleteOne({ version: req.params.version });
    await logAudit(req.user?.username || 'system', 'DELETE_MODEL_VERSION', req.params.version, `Deleted AI model version ${req.params.version}`, req);
    return res.json({ success: true, message: 'Model version deleted successfully', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/model/status', authenticateToken, async (req, res) => {
  try {
    const models = await ModelVersion.find();
    const active = models.find(m => m.status === 'ACTIVE') || models[0];
    return res.json({
      success: true,
      message: 'Model management status retrieved',
      data: {
        totalModels: models.length || 2,
        activeModel: active ? active.version : 'v1.0.0',
        activeModelAccuracy: active ? active.accuracy : 91.4,
        pipelineStatus: 'HEALTHY',
        lastTrainingDate: '2026-07-12',
        nextScheduledTraining: '2026-08-01',
        infrastructure: 'MediSphere AI Prediction Pipeline v1.0'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


app.listen(PORT, () => {
  console.log(`Mock API Gateway running on port ${PORT}`);
});
