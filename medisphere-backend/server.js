require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');

const { evaluateRules, classifyRisk, parseBP, SEVERITY } = require('./rules/clinicalRules');
const { getRoutingConfig, resolveNotificationTargets } = require('./config/alertRouting');

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
      monitoring: '/monitoring/stats | /monitoring/patients | /monitoring/alerts | /monitoring/risk/:patientId',
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
  respiratoryRate: { type: Number, default: 16 },
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

const AlertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  patientName: String,
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  type: { type: String, required: true },
  message: String,
  confidence: Number,
  risk: String,
  vitals: Object,
  status: { type: String, enum: ['NEW', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'CLOSED'], default: 'NEW' },
  acknowledgedBy: String,
  acknowledgedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const RiskPredictionSchema = new mongoose.Schema({
  patientId: String,
  risk: String,
  confidence: Number,
  score: Number,
  factors: [String],
  timestamp: { type: Date, default: Date.now }
});

const PatientAssignmentSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  doctorUsername: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now }
});

const PredictionResultSchema = new mongoose.Schema({
  id: { type: String, required: true },
  patientId: { type: String, required: true },
  predictionType: { type: String, enum: ['CVD', 'DIABETES', 'CARDIO', 'HYPERTENSION'], required: true },
  riskType: { type: String },
  riskLevel: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], required: true },
  riskPercentage: { type: Number, required: true },
  confidence: { type: Number, required: true },
  predictionDate: { type: String },
  contributingFactors: [String],
  metrics: Object,
  createdAt: { type: Date, default: Date.now }
});

const AIModelVersionSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  name: String,
  type: String,
  accuracy: { type: Number, required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DEPRECATED'], default: 'INACTIVE' },
  trainedOn: Date,
  featuresCount: Number,
  createdAt: { type: Date, default: Date.now }
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
const Alert = conns.stream.model('alerts', AlertSchema);
const RiskPrediction = conns.stream.model('risk_predictions', RiskPredictionSchema);
const PatientAssignment = conns.patient.model('patient_assignments', PatientAssignmentSchema);
const PredictionResult = conns.stream.model('prediction_results', PredictionResultSchema);
const AIModelVersion = conns.stream.model('ai_model_versions', AIModelVersionSchema);

// Active SSE Clients for Real-Time Telemetry & Alert Broadcasts
let sseClients = [];

function broadcastSSEEvent(eventType, data) {
  sseClients.forEach(client => {
    try {
      client.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.error('SSE broadcast error:', e.message);
    }
  });
}

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

    // Direct login without OTP verification
    const token = jwt.sign({ username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: '86400s' });
    const refreshToken = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '604800s' });

    await logAudit(username, 'USER_LOGIN', username, 'User logged in successfully', req);

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
    const regex = new RegExp(query || '', 'i');
    let searchFilter = {
      $or: [
        { _id: regex },
        { firstName: regex },
        { lastName: regex },
        { email: regex }
      ]
    };

    const isDoctorOnly = (req.user.roles.includes('DOCTOR') || req.user.roles.includes('ROLE_DOCTOR')) &&
                         !req.user.roles.includes('ADMIN') && !req.user.roles.includes('ROLE_ADMIN');

    if (isDoctorOnly) {
      const assignments = await PatientAssignment.find({ doctorUsername: req.user.username });
      let assignedIds = assignments.map(a => a.patientId);
      if (assignedIds.length === 0) {
        // Fallback default assigned IDs for standard doctor usernames
        if (req.user.username === 'dr_smith') assignedIds = ['john_doe', 'jane_smith'];
        else if (req.user.username === 'dr_johnson' || req.user.username === 'dr_jones') assignedIds = ['robert_j', 'alex_jones'];
        else if (req.user.username === 'doctor') assignedIds = ['sarah_lee', 'michael_brown'];
        else assignedIds = ['emily_davis', 'PAT101'];
      }
      searchFilter._id = { $in: assignedIds };
    }

    const list = await Patient.find(searchFilter);
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
// MONITORING SERVICE PATHS (/monitoring/*) - MILESTONE 3
// ==========================================

function calculateAgeFromDob(dob) {
  if (!dob) return 45;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// 1. GET /monitoring/stats
app.get('/monitoring/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalPatients, todayAlerts, criticalAlerts, openAlerts, devicesCount] = await Promise.all([
      Patient.countDocuments(),
      Alert.countDocuments({ createdAt: { $gte: today } }),
      Alert.countDocuments({ severity: 'CRITICAL', createdAt: { $gte: today } }),
      Alert.countDocuments({ status: { $in: ['NEW', 'SENT', 'DELIVERED'] } }),
      WearableDevice.countDocuments({ status: 'ACTIVE' })
    ]);

    let assignedPatients = totalPatients;
    if (req.user.roles.includes('DOCTOR') || req.user.roles.includes('ROLE_DOCTOR')) {
      const count = await PatientAssignment.countDocuments({ doctorUsername: req.user.username });
      if (count > 0) assignedPatients = count;
    }

    return res.json({
      success: true,
      message: 'Monitoring stats fetched successfully',
      data: {
        patientsOnline: totalPatients,
        totalPatients,
        assignedPatients,
        todayAlerts,
        criticalAlerts,
        openAlerts,
        avgResponseTime: '3.8 min',
        simulatorStatus: 'ACTIVE'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 2. GET /monitoring/patients
app.get('/monitoring/patients', authenticateToken, async (req, res) => {
  try {
    let patientQuery = {};
    const isDoctorOnly = (req.user.roles.includes('DOCTOR') || req.user.roles.includes('ROLE_DOCTOR')) &&
                         !req.user.roles.includes('ADMIN') && !req.user.roles.includes('ROLE_ADMIN');

    if (isDoctorOnly) {
      const assignments = await PatientAssignment.find({ doctorUsername: req.user.username });
      let assignedIds = assignments.map(a => a.patientId);
      if (assignedIds.length === 0) {
        if (req.user.username === 'dr_smith') assignedIds = ['john_doe', 'jane_smith'];
        else if (req.user.username === 'dr_johnson' || req.user.username === 'dr_jones') assignedIds = ['robert_j', 'alex_jones'];
        else if (req.user.username === 'doctor') assignedIds = ['sarah_lee', 'michael_brown'];
        else assignedIds = ['emily_davis', 'PAT101'];
      }
      patientQuery = { _id: { $in: assignedIds } };
    }

    const patientList = await Patient.find(patientQuery);
    const result = await Promise.all(patientList.map(async (p) => {
      const twin = await HealthTwin.findOne({ patientId: p._id });
      const lastVitalRecord = await VitalRecord.findOne({ patientId: p._id }).sort({ recordedAt: -1 });
      const latestPrediction = await RiskPrediction.findOne({ patientId: p._id }).sort({ timestamp: -1 });
      const openAlertsCount = await Alert.countDocuments({ patientId: p._id, status: { $in: ['NEW', 'SENT', 'DELIVERED'] } });

      let vitals = null;
      if (lastVitalRecord) {
        vitals = {
          heartRate: lastVitalRecord.heartRate,
          spo2: lastVitalRecord.oxygenLevel,
          temperature: lastVitalRecord.temperature,
          bloodPressure: lastVitalRecord.bloodPressure || '120/80',
          respiratoryRate: lastVitalRecord.respiratoryRate || 16,
          lastUpdated: lastVitalRecord.recordedAt
        };
      } else if (twin && twin.vitalsHistory && twin.vitalsHistory.length > 0) {
        const lv = twin.vitalsHistory[twin.vitalsHistory.length - 1];
        vitals = {
          heartRate: lv.heartRate,
          spo2: lv.oxygenLevel,
          temperature: lv.temperature,
          bloodPressure: lv.bloodPressure || '120/80',
          respiratoryRate: lv.respiratoryRate || 16,
          lastUpdated: lv.recordedAt
        };
      } else {
        vitals = {
          heartRate: 72,
          spo2: 98,
          temperature: 36.6,
          bloodPressure: '120/80',
          respiratoryRate: 16,
          lastUpdated: new Date()
        };
      }

      const age = calculateAgeFromDob(p.dateOfBirth);
      const aiRisk = latestPrediction ? latestPrediction.risk : (twin ? twin.riskCategory : 'Low');
      const aiConfidence = latestPrediction ? latestPrediction.confidence : 88.5;

      return {
        patientId: p._id,
        patientName: `${p.firstName} ${p.lastName}`,
        age,
        gender: p.gender || 'Unknown',
        status: 'ONLINE',
        vitals,
        aiRisk: aiRisk === 'UNKNOWN' ? 'Low' : aiRisk,
        aiConfidence,
        openAlerts: openAlertsCount
      };
    }));

    return res.json({ success: true, message: 'Monitoring patient population compiled successfully', data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 3. GET /monitoring/alerts
app.get('/monitoring/alerts', authenticateToken, async (req, res) => {
  const { limit = 20, severity, status } = req.query;
  try {
    let filter = {};
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const list = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return res.json({ success: true, message: 'Recent monitoring alerts retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 4. GET /monitoring/alerts/history
app.get('/monitoring/alerts/history', authenticateToken, async (req, res) => {
  const { page = 1, limit = 20, severity, status, patientId, search } = req.query;
  try {
    let filter = {};
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (search) {
      const reg = new RegExp(search, 'i');
      filter.$or = [{ message: reg }, { patientName: reg }, { type: reg }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [list, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Alert.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      message: 'Alert history retrieved',
      data: {
        alerts: list,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 5. POST /monitoring/alerts/:id/acknowledge
app.post('/monitoring/alerts/:id/acknowledge', authenticateToken, async (req, res) => {
  const alertIdParam = req.params.id;
  try {
    const alert = await Alert.findOne({ $or: [{ alertId: alertIdParam }, { _id: alertIdParam }] });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found', data: null });
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = req.user.username;
    alert.acknowledgedAt = new Date();
    await alert.save();

    await logAudit(req.user.username, 'ACKNOWLEDGE_ALERT', alert.alertId, `Acknowledged alert ${alert.alertId} for patient ${alert.patientId}`, req);

    broadcastSSEEvent('alert_updated', alert);

    return res.json({ success: true, message: 'Alert acknowledged successfully', data: alert });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 6. GET /monitoring/risk/:patientId
app.get('/monitoring/risk/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  try {
    const patient = await Patient.findById(patientId);
    const twin = await HealthTwin.findOne({ patientId });
    const lastVital = await VitalRecord.findOne({ patientId }).sort({ recordedAt: -1 });

    const hr = lastVital ? lastVital.heartRate : 75;
    const spo2 = lastVital ? lastVital.oxygenLevel : 98;
    const temp = lastVital ? lastVital.temperature : 36.6;
    const bp = parseBP(lastVital ? lastVital.bloodPressure : '120/80');
    const rr = lastVital ? (lastVital.respiratoryRate || 16) : 16;

    const riskAnalysis = classifyRisk({
      heartRate: hr,
      spo2,
      temperature: temp,
      systolic: bp.systolic || 120,
      diastolic: bp.diastolic || 80,
      respiratoryRate: rr
    });

    const prediction = await RiskPrediction.create({
      patientId,
      risk: riskAnalysis.risk,
      confidence: riskAnalysis.confidence,
      score: riskAnalysis.score,
      factors: riskAnalysis.factors,
      timestamp: new Date()
    });

    return res.json({ success: true, message: 'AI Risk prediction evaluated successfully', data: prediction });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 7. Core Telemetry Ingress & Rule Evaluation: POST /monitoring/vitals
app.post('/monitoring/vitals', authenticateToken, async (req, res) => {
  const { patientId, heartRate, spo2, temperature, bloodPressure, respiratoryRate } = req.body;
  try {
    const patient = await Patient.findById(patientId);
    const age = calculateAgeFromDob(patient ? patient.dateOfBirth : null);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : patientId;

    const parsedBp = parseBP(bloodPressure || '120/80');
    const vitalsInput = {
      heartRate: Number(heartRate || 75),
      spo2: Number(spo2 || 98),
      temperature: Number(temperature || 36.6),
      systolic: parsedBp.systolic || 120,
      diastolic: parsedBp.diastolic || 80,
      respiratoryRate: Number(respiratoryRate || 16)
    };

    // Save vitals record
    const vitalRecord = await VitalRecord.create({
      id: `vit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId,
      heartRate: vitalsInput.heartRate,
      oxygenLevel: vitalsInput.spo2,
      temperature: vitalsInput.temperature,
      bloodPressure: bloodPressure || '120/80',
      respiratoryRate: vitalsInput.respiratoryRate,
      recordedAt: new Date()
    });

    // Evaluate Clinical Rules
    const triggeredRules = evaluateRules(vitalsInput, { age, conditions: patient ? patient.medicalHistory : [] });
    // Classify AI Risk
    const aiRiskObj = classifyRisk(vitalsInput);

    let generatedAlerts = [];
    if (triggeredRules.length > 0) {
      for (const tr of triggeredRules) {
        const alertId = `ALT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const alertDoc = await Alert.create({
          alertId,
          patientId,
          patientName,
          severity: tr.severity,
          type: tr.type,
          message: tr.message,
          confidence: aiRiskObj.confidence,
          risk: aiRiskObj.risk,
          vitals: vitalsInput,
          status: 'NEW',
          createdAt: new Date()
        });
        generatedAlerts.push(alertDoc);

        // Create Notification Log
        await NotificationLog.create({
          patientId,
          message: `[${tr.severity}] ${tr.message}`,
          type: tr.severity,
          status: 'UNREAD',
          createdAt: new Date()
        });

        // Dispatch email notification for CRITICAL severity
        if (tr.severity === 'CRITICAL' && patient && patient.email) {
          sendOtpEmail(patient.email, `ALERT: ${tr.message}`).catch(() => {});
        }

        // SSE Broadcast
        broadcastSSEEvent('alert', alertDoc);
      }
    }

    // Update Health Twin
    const twin = await HealthTwin.findOne({ patientId });
    if (twin) {
      twin.vitalsHistory.push(vitalRecord);
      if (twin.vitalsHistory.length > 50) twin.vitalsHistory.shift();
      twin.riskCategory = aiRiskObj.risk.toUpperCase();
      twin.lastRebuilt = new Date();
      await twin.save();
    }

    // Broadcast live telemetry SSE update
    broadcastSSEEvent('vitals', {
      patientId,
      vitals: {
        heartRate: vitalsInput.heartRate,
        spo2: vitalsInput.spo2,
        temperature: vitalsInput.temperature,
        bloodPressure: bloodPressure || '120/80',
        respiratoryRate: vitalsInput.respiratoryRate
      },
      aiRisk: aiRiskObj.risk,
      aiConfidence: aiRiskObj.confidence,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Vitals processed successfully',
      data: {
        vitals: vitalRecord,
        aiRisk: aiRiskObj,
        alerts: generatedAlerts
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 8. POST /monitoring/sos - Emergency SOS Alert Trigger
app.post('/monitoring/sos', authenticateToken, async (req, res) => {
  const { patientId, details } = req.body;
  try {
    const patient = await Patient.findById(patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : patientId;
    const alertId = `SOS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const alertDoc = await Alert.create({
      alertId,
      patientId,
      patientName,
      severity: 'CRITICAL',
      type: 'EMERGENCY_SOS',
      message: `CRITICAL Emergency SOS Triggered by Patient ${patientName}! ${details || 'Immediate emergency medical team dispatch requested.'}`,
      confidence: 99.9,
      risk: 'High',
      vitals: { heartRate: 135, spo2: 89, temperature: 37.8, bloodPressure: '175/110' },
      status: 'NEW',
      createdAt: new Date()
    });

    await NotificationLog.create({
      patientId,
      message: alertDoc.message,
      type: 'CRITICAL',
      status: 'UNREAD',
      createdAt: new Date()
    });

    // Update Twin risk to HIGH
    const twin = await HealthTwin.findOne({ patientId });
    if (twin) {
      twin.riskCategory = 'HIGH';
      twin.lastRebuilt = new Date();
      await twin.save();
    }

    await logAudit(req.user.username, 'TRIGGER_PATIENT_SOS', patientId, `Triggered emergency panic SOS alert: ${alertId}`, req);

    broadcastSSEEvent('alert', alertDoc);

    return res.json({ success: true, message: 'Emergency SOS dispatched to medical team', data: alertDoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 9. POST /monitoring/simulate/critical - Trigger Simulated Critical Vital Anomaly
app.post('/monitoring/simulate/critical', authenticateToken, async (req, res) => {
  const { patientId } = req.query;
  const targetId = patientId || 'john_doe';
  try {
    const patient = await Patient.findById(targetId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : targetId;

    const criticalVitals = {
      heartRate: 145,
      spo2: 88,
      temperature: 39.2,
      bloodPressure: '185/115',
      respiratoryRate: 28
    };

    const alertId = `ALT-SIM-${Date.now()}`;
    const alertDoc = await Alert.create({
      alertId,
      patientId: targetId,
      patientName,
      severity: 'CRITICAL',
      type: 'CARDIAC',
      message: `Simulated Critical Alert: Possible AFib & Severe Hypoxia (HR: 145 bpm, SpO2: 88%, BP: 185/115 mmHg). Immediate intervention required.`,
      confidence: 96.4,
      risk: 'High',
      vitals: criticalVitals,
      status: 'NEW',
      createdAt: new Date()
    });

    broadcastSSEEvent('alert', alertDoc);

    return res.json({ success: true, message: 'Simulated critical anomaly triggered successfully', data: alertDoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 10. GET /monitoring/stream/:username - SSE Telemetry & Event Stream
app.get('/monitoring/stream/:username', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const username = req.params.username;
  const clientId = `${username}-${Date.now()}`;
  const clientObj = { id: clientId, username, res };
  sseClients.push(clientObj);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, status: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  const timer = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
    } catch {}
  }, 15000);

  req.on('close', () => {
    clearInterval(timer);
    sseClients = sseClients.filter(c => c.id !== clientId);
    res.end();
  });
});

// 11. Doctor-Patient Assignments Endpoints (/monitoring/assignments/*)
app.get('/monitoring/assignments', authenticateToken, async (req, res) => {
  const { doctorUsername } = req.query;
  try {
    const list = await PatientAssignment.find({ doctorUsername });
    const assignedPatientIds = list.map(a => a.patientId);
    const patients = await Patient.find({ _id: { $in: assignedPatientIds } });
    return res.json({ success: true, message: 'Doctor assignments fetched', data: patients });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/monitoring/assignments/unassigned', authenticateToken, async (req, res) => {
  try {
    const allAssignments = await PatientAssignment.find({});
    const assignedIds = new Set(allAssignments.map(a => a.patientId));
    const unassigned = await Patient.find({ _id: { $nin: Array.from(assignedIds) } });
    return res.json({ success: true, message: 'Unassigned patients fetched', data: unassigned });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/monitoring/assignments/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  const { doctorUsername } = req.body;
  try {
    await PatientAssignment.deleteOne({ patientId });
    const assignment = await PatientAssignment.create({
      patientId,
      doctorUsername,
      assignedAt: new Date()
    });
    await logAudit(req.user.username, 'ASSIGN_PATIENT_DOCTOR', patientId, `Assigned patient ${patientId} to doctor ${doctorUsername}`, req);
    return res.json({ success: true, message: 'Patient assigned successfully', data: assignment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.delete('/monitoring/assignments/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  const { doctorUsername } = req.query;
  try {
    await PatientAssignment.deleteOne({ patientId, doctorUsername });
    await logAudit(req.user.username, 'UNASSIGN_PATIENT_DOCTOR', patientId, `Unassigned patient ${patientId} from doctor ${doctorUsername}`, req);
    return res.json({ success: true, message: 'Patient unassigned successfully', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});


// ==========================================
// DASHBOARD SERVICE PATHS (/dashboard/*)
// ==========================================
app.get('/dashboard/patient360', authenticateToken, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  const { patientId, doctorId } = req.query;
  
  try {
    // 1. Check consent (for audit logging only, does not block access)
    const consent = await Consent.findOne({ patientId, doctorId });
    const consentCheckResult = consent && consent.status === 'GRANTED';

    await logAudit(doctorId, 'QUERY_PATIENT_360', patientId, `Queried 360 patient dashboard. Consent check: ${consentCheckResult ? 'SUCCESS' : 'NO_CONSENT_RECORD'}`, req);

    // 2. Always load patient and twin data for authorized doctors
    const patientProfile = await Patient.findById(patientId);
    const digitalTwin = await HealthTwin.findOne({ patientId });

    const riskLevel = digitalTwin ? digitalTwin.riskCategory : 'UNKNOWN';
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
        alertStatusSummary: alertStatus
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
// AI PREDICTION SERVICE PATHS (/api/prediction/*, /api/explanation/*, /api/model/*)
// ==========================================

function calculateCvdRisk(payload) {
  const age = Number(payload.age || 60);
  const bp = Number(payload.bloodPressure || 135);
  const cholesterol = Number(payload.cholesterol || 210);
  const bmi = Number(payload.bmi || 28);
  const hr = Number(payload.heartRate || 85);

  let score = 0;
  const factors = [];

  if (bp > 140) { score += 30; factors.push(`Elevated Systolic Blood Pressure (${bp} mmHg)`); }
  else if (bp > 130) { score += 15; factors.push(`Prehypertension BP (${bp} mmHg)`); }

  if (cholesterol > 240) { score += 25; factors.push(`High Total Cholesterol (${cholesterol} mg/dL)`); }
  else if (cholesterol > 200) { score += 12; factors.push(`Borderline Cholesterol (${cholesterol} mg/dL)`); }

  if (age > 65) { score += 20; factors.push(`Advanced Age (${age} yrs)`); }
  else if (age > 50) { score += 10; factors.push(`Age Risk Factor (${age} yrs)`); }

  if (bmi > 30) { score += 15; factors.push(`Obesity (BMI ${bmi})`); }
  else if (bmi > 25) { score += 8; factors.push(`Overweight (BMI ${bmi})`); }

  if (hr > 100) { score += 10; factors.push(`Resting Tachycardia (${hr} bpm)`); }

  const percentage = Math.min(Math.max(score, 12), 96);
  let riskLevel = 'LOW';
  if (percentage >= 50) riskLevel = 'HIGH';
  else if (percentage >= 25) riskLevel = 'MEDIUM';

  const confidence = parseFloat((88 + (percentage / 10)).toFixed(1));

  return {
    riskLevel,
    riskPercentage: percentage,
    confidence: Math.min(confidence, 99.2),
    contributingFactors: factors.length > 0 ? factors : ['All clinical indicators within normal limits']
  };
}

function calculateDiabetesRisk(payload) {
  const hba1c = Number(payload.hba1c || 6.2);
  const bmi = Number(payload.bmi || 28);
  const age = Number(payload.age || 55);
  const bp = Number(payload.bloodPressure || 130);

  let score = 0;
  const factors = [];

  if (hba1c >= 6.5) { score += 45; factors.push(`Diabetic HbA1c Level (${hba1c}%)`); }
  else if (hba1c >= 5.7) { score += 25; factors.push(`Prediabetic HbA1c Level (${hba1c}%)`); }

  if (bmi > 30) { score += 25; factors.push(`High Body Mass Index (${bmi})`); }
  else if (bmi > 25) { score += 12; factors.push(`Elevated BMI (${bmi})`); }

  if (age > 45) { score += 15; factors.push(`Age > 45 yrs (${age})`); }
  if (bp > 130) { score += 10; factors.push(`Co-occurring Hypertension (${bp} mmHg)`); }

  const percentage = Math.min(Math.max(score, 10), 98);
  let riskLevel = 'LOW';
  if (percentage >= 50) riskLevel = 'HIGH';
  else if (percentage >= 25) riskLevel = 'MEDIUM';

  const confidence = parseFloat((89 + (percentage / 10)).toFixed(1));

  return {
    riskLevel,
    riskPercentage: percentage,
    confidence: Math.min(confidence, 99.5),
    contributingFactors: factors.length > 0 ? factors : ['Normal glucose tolerance and BMI']
  };
}

// 1. POST /api/prediction/cvd
app.post('/api/prediction/cvd', authenticateToken, async (req, res) => {
  const { patientId } = req.body;
  const pid = patientId || req.user.username;
  try {
    const riskData = calculateCvdRisk(req.body);
    const id = `PRED-CVD-${Date.now()}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const predDoc = await PredictionResult.create({
      id,
      patientId: pid,
      predictionType: 'CVD',
      riskType: 'CARDIO',
      riskLevel: riskData.riskLevel,
      riskPercentage: riskData.riskPercentage,
      confidence: riskData.confidence,
      predictionDate: dateStr,
      contributingFactors: riskData.contributingFactors,
      metrics: req.body,
      createdAt: new Date()
    });

    await RiskPrediction.create({
      patientId: pid,
      risk: riskData.riskLevel,
      confidence: riskData.confidence,
      score: riskData.riskPercentage,
      factors: riskData.contributingFactors,
      timestamp: new Date()
    });

    await logAudit(req.user.username, 'GENERATE_AI_PREDICTION', pid, `Generated CVD Risk Prediction: ${riskData.riskLevel} (${riskData.riskPercentage}%)`, req);

    return res.json({ success: true, message: 'CVD Risk prediction computed successfully', data: predDoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 2. POST /api/prediction/diabetes
app.post('/api/prediction/diabetes', authenticateToken, async (req, res) => {
  const { patientId } = req.body;
  const pid = patientId || req.user.username;
  try {
    const riskData = calculateDiabetesRisk(req.body);
    const id = `PRED-DIA-${Date.now()}`;
    const dateStr = new Date().toISOString().split('T')[0];

    const predDoc = await PredictionResult.create({
      id,
      patientId: pid,
      predictionType: 'DIABETES',
      riskType: 'METABOLIC',
      riskLevel: riskData.riskLevel,
      riskPercentage: riskData.riskPercentage,
      confidence: riskData.confidence,
      predictionDate: dateStr,
      contributingFactors: riskData.contributingFactors,
      metrics: req.body,
      createdAt: new Date()
    });

    await RiskPrediction.create({
      patientId: pid,
      risk: riskData.riskLevel,
      confidence: riskData.confidence,
      score: riskData.riskPercentage,
      factors: riskData.contributingFactors,
      timestamp: new Date()
    });

    await logAudit(req.user.username, 'GENERATE_AI_PREDICTION', pid, `Generated Diabetes Risk Prediction: ${riskData.riskLevel} (${riskData.riskPercentage}%)`, req);

    return res.json({ success: true, message: 'Diabetes Risk prediction computed successfully', data: predDoc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 3. GET /api/prediction/history/:patientId
app.get('/api/prediction/history/:patientId', authenticateToken, async (req, res) => {
  try {
    const list = await PredictionResult.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    return res.json({ success: true, message: 'Prediction history retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 4. GET /api/prediction/latest/:patientId
app.get('/api/prediction/latest/:patientId', authenticateToken, async (req, res) => {
  try {
    let latest = await PredictionResult.findOne({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    if (!latest) {
      latest = {
        id: `PRED-INIT-${req.params.patientId}`,
        patientId: req.params.patientId,
        predictionType: 'CVD',
        riskType: 'CARDIO',
        riskLevel: 'LOW',
        riskPercentage: 18.5,
        confidence: 94.2,
        predictionDate: new Date().toISOString().split('T')[0],
        contributingFactors: ['Baseline clinical metrics within normal ranges']
      };
    }
    return res.json({ success: true, message: 'Latest prediction retrieved', data: latest });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 5. DELETE /api/prediction/:id
app.delete('/api/prediction/:id', authenticateToken, async (req, res) => {
  try {
    await PredictionResult.deleteOne({ $or: [{ id: req.params.id }, { _id: req.params.id }] });
    return res.json({ success: true, message: 'Prediction record deleted successfully', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// 6. Model Performance & Validation Metrics
app.get('/api/prediction/accuracy', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      overallAccuracy: 92.4,
      sensitivity: 89.6,
      specificity: 94.1,
      f1Score: 0.91,
      aucRoc: 0.952
    }
  });
});

app.get('/api/prediction/calibration', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      brierScore: 0.082,
      expectedCalibrationError: 0.024,
      status: 'OPTIMALLY_CALIBRATED'
    }
  });
});

app.get('/api/prediction/bias-audit', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      genderParityRatio: 0.98,
      ageGroupFairnessScore: 0.96,
      disparateImpactStatus: 'PASS'
    }
  });
});

// ==========================================
// EXPLAINABILITY SERVICE PATHS (/api/explanation/*)
// ==========================================
app.get('/api/explanation/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  try {
    const latest = await PredictionResult.findOne({ patientId }).sort({ createdAt: -1 });
    const shapData = {
      patientId,
      riskLevel: latest ? latest.riskLevel : 'MEDIUM',
      baseValue: 0.18,
      predictionValue: latest ? (latest.riskPercentage / 100) : 0.45,
      features: [
        { name: 'Blood Pressure', value: '145 mmHg', shapValue: 0.28, direction: 'INCREASE' },
        { name: 'HbA1c', value: '7.5%', shapValue: 0.22, direction: 'INCREASE' },
        { name: 'Age', value: '65 yrs', shapValue: 0.15, direction: 'INCREASE' },
        { name: 'Cholesterol', value: '230 mg/dL', shapValue: 0.12, direction: 'INCREASE' },
        { name: 'BMI', value: '32.0', shapValue: 0.08, direction: 'INCREASE' },
        { name: 'Physical Activity', value: 'Regular', shapValue: -0.09, direction: 'DECREASE' },
        { name: 'Non-Smoker Status', value: 'Yes', shapValue: -0.14, direction: 'DECREASE' }
      ],
      summary: `Primary risk drivers for patient ${patientId} are elevated Systolic BP and HbA1c.`
    };
    return res.json({ success: true, message: 'SHAP explanation retrieved', data: shapData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/api/explanation/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  const data = req.body;
  try {
    const shapData = {
      patientId,
      riskLevel: data.riskLevel || 'MEDIUM',
      baseValue: 0.18,
      predictionValue: 0.52,
      features: [
        { name: 'Blood Pressure', value: `${data.bloodPressure || 145} mmHg`, shapValue: 0.26, direction: 'INCREASE' },
        { name: 'HbA1c', value: `${data.hba1c || 7.5}%`, shapValue: 0.24, direction: 'INCREASE' },
        { name: 'Age', value: `${data.age || 65} yrs`, shapValue: 0.16, direction: 'INCREASE' },
        { name: 'Cholesterol', value: `${data.cholesterol || 230} mg/dL`, shapValue: 0.11, direction: 'INCREASE' },
        { name: 'BMI', value: `${data.bmi || 32}`, shapValue: 0.09, direction: 'INCREASE' }
      ],
      summary: `Model explanation generated based on feature importance vector.`
    };
    return res.json({ success: true, message: 'SHAP explanation generated', data: shapData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/explanation/validate', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      fidelityScore: 0.94,
      consistencyRate: '98.2%',
      status: 'VALIDATED'
    }
  });
});

// ==========================================
// MODEL MANAGEMENT PATHS (/api/model/*)
// ==========================================
app.get('/api/model', authenticateToken, async (req, res) => {
  try {
    let list = await AIModelVersion.find({}).sort({ createdAt: -1 });
    if (list.length === 0) {
      list = [
        await AIModelVersion.create({ version: 'v2.1-xgboost', name: 'CardioRisk XGBoost Classifier', type: 'XGBoost', accuracy: 94.2, status: 'ACTIVE', trainedOn: new Date(), featuresCount: 18 }),
        await AIModelVersion.create({ version: 'v1.8-rf', name: 'Diabetes Risk Random Forest', type: 'RandomForest', accuracy: 91.6, status: 'INACTIVE', trainedOn: new Date(Date.now() - 30 * 86400000), featuresCount: 14 })
      ];
    }
    return res.json({ success: true, message: 'Models list retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/model/latest', authenticateToken, async (req, res) => {
  try {
    let model = await AIModelVersion.findOne({ status: 'ACTIVE' });
    if (!model) {
      model = await AIModelVersion.findOne({}).sort({ createdAt: -1 });
    }
    return res.json({ success: true, message: 'Latest active model retrieved', data: model });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/api/model/status', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: {
      activeVersion: 'v2.1-xgboost',
      status: 'READY',
      latency: '14ms',
      throughput: '450 req/sec'
    }
  });
});

app.post('/api/model', authenticateToken, async (req, res) => {
  try {
    const model = await AIModelVersion.create(req.body);
    return res.json({ success: true, message: 'Model version registered', data: model });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.put('/api/model/:version', authenticateToken, async (req, res) => {
  try {
    const { version } = req.params;
    if (req.body.status === 'ACTIVE') {
      await AIModelVersion.updateMany({ version: { $ne: version } }, { status: 'INACTIVE' });
    }
    const updated = await AIModelVersion.findOneAndUpdate({ version }, req.body, { new: true });
    return res.json({ success: true, message: 'Model status updated', data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.delete('/api/model/:version', authenticateToken, async (req, res) => {
  try {
    await AIModelVersion.deleteOne({ version: req.params.version });
    return res.json({ success: true, message: 'Model version deleted', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Notifications specific endpoints
app.get('/notifications/patient/:patientId', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  try {
    let list = await NotificationLog.find({ patientId }).sort({ createdAt: -1 });
    if (list.length === 0) {
      list = await NotificationLog.create([
        { patientId, message: 'Continuous vitals telemetry monitoring active', type: 'INFO', status: 'UNREAD', createdAt: new Date() },
        { patientId, message: 'Digital Health Twin updated with latest diagnostic metrics', type: 'SYSTEM', status: 'UNREAD', createdAt: new Date(Date.now() - 3600000) },
        { patientId, message: 'Upcoming Consultation with Dr. John Smith', type: 'APPOINTMENT', status: 'UNREAD', createdAt: new Date(Date.now() - 7200000) }
      ]);
    }
    return res.json({ success: true, message: 'Patient notifications retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.get('/notifications/doctor/:doctorId', authenticateToken, async (req, res) => {
  try {
    let list = await NotificationLog.find({}).sort({ createdAt: -1 }).limit(30);
    if (list.length === 0) {
      list = await NotificationLog.create([
        { patientId: 'john_doe', message: '[CRITICAL] Possible AFib detected for John Doe: HR 145 bpm', type: 'CRITICAL', status: 'UNREAD', createdAt: new Date() },
        { patientId: 'jane_smith', message: '[CRITICAL] Critical Oxygen Alert: SpO2 at 88% for Jane Smith', type: 'CRITICAL', status: 'UNREAD', createdAt: new Date(Date.now() - 900000) },
        { patientId: 'robert_j', message: '[HIGH] Hypertension Crisis: Systolic BP at 185 mmHg for Robert Johnson', type: 'HIGH', status: 'UNREAD', createdAt: new Date(Date.now() - 1800000) }
      ]);
    }
    return res.json({ success: true, message: 'Doctor notifications retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/notifications/doctor/:doctorId/read', authenticateToken, async (req, res) => {
  try {
    await NotificationLog.updateMany({ status: 'UNREAD' }, { status: 'READ' });
    return res.json({ success: true, message: 'All doctor notifications marked as read', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await NotificationLog.findByIdAndUpdate(req.params.id, { status: 'READ' });
    return res.json({ success: true, message: 'Notification marked as read', data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// Provider alias endpoint (/providers)
app.get('/providers', authenticateToken, async (req, res) => {
  try {
    const list = await Provider.find({});
    return res.json({ success: true, message: 'Providers retrieved', data: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
});

// ==========================================
// AUTOMATIC DATABASE SEEDER & CONTINUOUS TELEMETRY GENERATOR
// ==========================================
async function seedDatabaseIfEmpty() {
  try {
    const patientCount = await Patient.countDocuments();
    if (patientCount === 0) {
      console.log('[AUTO-SEEDER] MongoDB is empty. Seeding initial patient population, doctors, alerts, twins, predictions, and assignments...');

      // 1. Seed Patients
      const patientsData = [
        { _id: 'john_doe', firstName: 'John', lastName: 'Doe', email: 'john.doe@gmail.com', phoneNumber: '+1-555-0199', dateOfBirth: '1961-05-15', gender: 'Male', address: '123 Pine St, Seattle, WA', emergencyContactName: 'Mary Doe', emergencyContactPhone: '+1-555-0198', medicalHistory: ['Hypertension', 'Type 2 Diabetes'], insuranceProvider: 'Aetna Health', insurancePolicyNumber: 'AE-992384-01' },
        { _id: 'jane_smith', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@gmail.com', phoneNumber: '+1-555-0210', dateOfBirth: '1974-08-22', gender: 'Female', address: '456 Oak Ave, Portland, OR', emergencyContactName: 'Tom Smith', emergencyContactPhone: '+1-555-0211', medicalHistory: ['Asthma', 'Seasonal Allergies'], insuranceProvider: 'Blue Cross', insurancePolicyNumber: 'BC-883210-02' },
        { _id: 'robert_j', firstName: 'Robert', lastName: 'Johnson', email: 'robert.j@gmail.com', phoneNumber: '+1-555-0344', dateOfBirth: '1956-11-10', gender: 'Male', address: '789 Maple Rd, San Jose, CA', emergencyContactName: 'Sarah Johnson', emergencyContactPhone: '+1-555-0345', medicalHistory: ['Coronary Artery Disease', 'Hypertension'], insuranceProvider: 'UnitedHealth', insurancePolicyNumber: 'UH-774120-03' },
        { _id: 'alex_jones', firstName: 'Alex', lastName: 'Jones', email: 'alex.j@gmail.com', phoneNumber: '+1-555-0455', dateOfBirth: '1981-03-30', gender: 'Male', address: '321 Elm St, Austin, TX', emergencyContactName: 'Lisa Jones', emergencyContactPhone: '+1-555-0456', medicalHistory: ['Prehypertension'], insuranceProvider: 'Cigna', insurancePolicyNumber: 'CG-663219-04' },
        { _id: 'sarah_lee', firstName: 'Sarah', lastName: 'Lee', email: 'sarah.l@gmail.com', phoneNumber: '+1-555-0566', dateOfBirth: '1988-09-14', gender: 'Female', address: '654 Birch Ct, Denver, CO', emergencyContactName: 'David Lee', emergencyContactPhone: '+1-555-0567', medicalHistory: ['Normal Vitals'], insuranceProvider: 'Kaiser', insurancePolicyNumber: 'KP-551928-05' },
        { _id: 'michael_brown', firstName: 'Michael', lastName: 'Brown', email: 'michael.b@gmail.com', phoneNumber: '+1-555-0677', dateOfBirth: '1966-02-05', gender: 'Male', address: '987 Cedar Way, Phoenix, AZ', emergencyContactName: 'Laura Brown', emergencyContactPhone: '+1-555-0678', medicalHistory: ['Type 2 Diabetes'], insuranceProvider: 'Humana', insurancePolicyNumber: 'HU-449102-06' },
        { _id: 'emily_davis', firstName: 'Emily', lastName: 'Davis', email: 'emily.d@gmail.com', phoneNumber: '+1-555-0788', dateOfBirth: '1978-07-19', gender: 'Female', address: '147 Walnut Dr, Miami, FL', emergencyContactName: 'James Davis', emergencyContactPhone: '+1-555-0789', medicalHistory: ['Hypothyroidism'], insuranceProvider: 'Molina', insurancePolicyNumber: 'MO-338291-07' },
        { _id: 'PAT101', firstName: 'Patricia', lastName: 'Taylor', email: 'patricia.t@gmail.com', phoneNumber: '+1-555-0899', dateOfBirth: '1958-12-01', gender: 'Female', address: '258 Spruce Ln, Chicago, IL', emergencyContactName: 'Mark Taylor', emergencyContactPhone: '+1-555-0900', medicalHistory: ['Congestive Heart Failure', 'Hypertension'], insuranceProvider: 'Medicare', insurancePolicyNumber: 'MC-110099-08' }
      ];
      await Patient.insertMany(patientsData);

      // 2. Seed Providers
      const providersData = [
        { _id: 'dr_smith', name: 'Dr. John Smith', type: 'DOCTOR', specialty: 'Cardiology', department: 'Cardiovascular Care', schedule: ['Mon 9-5', 'Wed 9-5'], location: 'Clinic Suite 101', email: 'dr.smith@medisphere.com', phone: '+1-555-9001' },
        { _id: 'dr_jones', name: 'Dr. Emily Jones', type: 'DOCTOR', specialty: 'Endocrinology', department: 'Metabolic Health', schedule: ['Tue 9-5', 'Thu 9-5'], location: 'Clinic Suite 204', email: 'dr.jones@medisphere.com', phone: '+1-555-9002' },
        { _id: 'dr_williams', name: 'Dr. Robert Williams', type: 'DOCTOR', specialty: 'Pulmonology', department: 'Respiratory Medicine', schedule: ['Mon-Fri 8-4'], location: 'Clinic Suite 305', email: 'dr.williams@medisphere.com', phone: '+1-555-9003' }
      ];
      await Provider.insertMany(providersData);

      // 3. Seed Accounts
      const passHash = await bcrypt.hash('password123', 10);
      const usersData = [
        { username: 'john_doe', password: passHash, email: 'john.doe@gmail.com', roles: ['PATIENT'] },
        { username: 'jane_smith', password: passHash, email: 'jane.smith@gmail.com', roles: ['PATIENT'] },
        { username: 'robert_j', password: passHash, email: 'robert.j@gmail.com', roles: ['PATIENT'] },
        { username: 'alex_jones', password: passHash, email: 'alex.j@gmail.com', roles: ['PATIENT'] },
        { username: 'sarah_lee', password: passHash, email: 'sarah.l@gmail.com', roles: ['PATIENT'] },
        { username: 'PAT101', password: passHash, email: 'patricia.t@gmail.com', roles: ['PATIENT'] },
        { username: 'dr_smith', password: passHash, email: 'dr.smith@medisphere.com', roles: ['DOCTOR'] },
        { username: 'dr_jones', password: passHash, email: 'dr.jones@medisphere.com', roles: ['DOCTOR'] },
        { username: 'admin', password: passHash, email: 'admin@medisphere.com', roles: ['ADMIN'] }
      ];
      for (const u of usersData) {
        await User.updateOne({ username: u.username }, { $setOnInsert: u }, { upsert: true });
      }

      // 4. Seed Health Twins
      for (const p of patientsData) {
        const hr = 70 + Math.floor(Math.random() * 30);
        const spo2 = 94 + Math.floor(Math.random() * 5);
        await HealthTwin.create({
          patientId: p._id,
          completenessScore: 88,
          vitalsHistory: [
            { id: `v1-${p._id}`, patientId: p._id, heartRate: hr, bloodPressure: '135/85', temperature: 36.8, oxygenLevel: spo2, respiratoryRate: 16, recordedAt: new Date() }
          ],
          activeMedications: p.medicalHistory.includes('Hypertension') ? ['Lisinopril 10mg', 'Atorvastatin 20mg'] : ['Multivitamin'],
          activeConditions: p.medicalHistory,
          riskCategory: p.medicalHistory.includes('Hypertension') || p.medicalHistory.includes('Type 2 Diabetes') ? 'HIGH' : 'LOW',
          lastRebuilt: new Date()
        });
      }

      // 5. Seed Wearable Devices
      await WearableDevice.insertMany([
        { patientId: 'john_doe', deviceId: 'DEV-APPLE-991', deviceName: 'Apple Watch Series 9', deviceType: 'SMARTWATCH', status: 'ACTIVE', lastSyncedAt: new Date() },
        { patientId: 'jane_smith', deviceId: 'DEV-FITBIT-882', deviceName: 'Fitbit Sense 2', deviceType: 'FITNESS_BAND', status: 'ACTIVE', lastSyncedAt: new Date() },
        { patientId: 'robert_j', deviceId: 'DEV-GARMIN-773', deviceName: 'Garmin Venu 3', deviceType: 'SMARTWATCH', status: 'ACTIVE', lastSyncedAt: new Date() },
        { patientId: 'PAT101', deviceId: 'DEV-SAMSUNG-664', deviceName: 'Samsung Galaxy Watch 6', deviceType: 'SMARTWATCH', status: 'ACTIVE', lastSyncedAt: new Date() }
      ]);

      // 6. Seed Doctor-Patient Assignments
      await PatientAssignment.insertMany([
        { patientId: 'john_doe', doctorUsername: 'dr_smith' },
        { patientId: 'jane_smith', doctorUsername: 'dr_smith' },
        { patientId: 'robert_j', doctorUsername: 'dr_smith' },
        { patientId: 'PAT101', doctorUsername: 'dr_smith' },
        { patientId: 'alex_jones', doctorUsername: 'dr_jones' },
        { patientId: 'sarah_lee', doctorUsername: 'dr_jones' },
        { patientId: 'michael_brown', doctorUsername: 'dr_jones' },
        { patientId: 'emily_davis', doctorUsername: 'dr_jones' },
        { patientId: 'john_doe', doctorUsername: 'admin' },
        { patientId: 'jane_smith', doctorUsername: 'admin' },
        { patientId: 'robert_j', doctorUsername: 'admin' },
        { patientId: 'PAT101', doctorUsername: 'admin' }
      ]);

      // 7. Seed Alerts
      await Alert.insertMany([
        { alertId: 'ALT-1001', patientId: 'john_doe', patientName: 'John Doe', severity: 'CRITICAL', type: 'CARDIAC', message: 'Possible AFib: Heart rate 145 bpm in patient aged 65. Immediate cardiology review required.', confidence: 94.2, risk: 'High', vitals: { heartRate: 145, spo2: 95, temperature: 36.8, bloodPressure: '145/95', respiratoryRate: 18 }, status: 'NEW', createdAt: new Date() },
        { alertId: 'ALT-1002', patientId: 'jane_smith', patientName: 'Jane Smith', severity: 'CRITICAL', type: 'RESPIRATORY', message: 'Critical Oxygen Alert: SpO2 at 88% — hypoxia risk. Immediate oxygen therapy required.', confidence: 96.5, risk: 'High', vitals: { heartRate: 92, spo2: 88, temperature: 37.1, bloodPressure: '128/82', respiratoryRate: 24 }, status: 'NEW', createdAt: new Date(Date.now() - 900000) },
        { alertId: 'ALT-1003', patientId: 'robert_j', patientName: 'Robert Johnson', severity: 'HIGH', type: 'HYPERTENSION', message: 'Hypertension Crisis: Systolic BP at 185 mmHg — hypertensive emergency.', confidence: 91.8, risk: 'High', vitals: { heartRate: 98, spo2: 96, temperature: 36.9, bloodPressure: '185/115', respiratoryRate: 16 }, status: 'SENT', createdAt: new Date(Date.now() - 1800000) },
        { alertId: 'ALT-1004', patientId: 'PAT101', patientName: 'Patricia Taylor', severity: 'CRITICAL', type: 'EMERGENCY_SOS', message: 'CRITICAL Emergency SOS Triggered by Patient Patricia Taylor! Immediate emergency medical dispatch requested.', confidence: 99.9, risk: 'High', vitals: { heartRate: 135, spo2: 89, temperature: 37.5, bloodPressure: '175/110', respiratoryRate: 26 }, status: 'NEW', createdAt: new Date(Date.now() - 300000) },
        { alertId: 'ALT-1005', patientId: 'alex_jones', patientName: 'Alex Jones', severity: 'MEDIUM', type: 'CARDIAC', message: 'Elevated Heart Rate: 112 bpm — monitor closely.', confidence: 82.4, risk: 'Medium', vitals: { heartRate: 112, spo2: 97, temperature: 36.7, bloodPressure: '138/88', respiratoryRate: 18 }, status: 'ACKNOWLEDGED', acknowledgedBy: 'dr_jones', acknowledgedAt: new Date(Date.now() - 3600000), createdAt: new Date(Date.now() - 4000000) }
      ]);

      // 8. Seed Notifications
      await NotificationLog.insertMany([
        { patientId: 'john_doe', message: '[CRITICAL] Possible AFib detected for John Doe: HR 145 bpm', type: 'CRITICAL', status: 'UNREAD', createdAt: new Date() },
        { patientId: 'jane_smith', message: '[CRITICAL] Critical Oxygen Alert: SpO2 at 88%', type: 'CRITICAL', status: 'UNREAD', createdAt: new Date(Date.now() - 900000) },
        { patientId: 'robert_j', message: '[HIGH] Hypertension Crisis: Systolic BP at 185 mmHg', type: 'HIGH', status: 'UNREAD', createdAt: new Date(Date.now() - 1800000) },
        { patientId: 'PAT101', message: '[CRITICAL] Emergency SOS Triggered by Patricia Taylor', type: 'CRITICAL', status: 'UNREAD', createdAt: new Date(Date.now() - 300000) },
        { patientId: 'john_doe', message: 'Continuous vitals telemetry stream connected via Apple Watch', type: 'INFO', status: 'READ', createdAt: new Date(Date.now() - 7200000) }
      ]);

      // 9. Seed AI Predictions
      await PredictionResult.insertMany([
        { id: 'PRED-CVD-101', patientId: 'john_doe', predictionType: 'CVD', riskType: 'CARDIO', riskLevel: 'HIGH', riskPercentage: 78.5, confidence: 92.4, predictionDate: new Date().toISOString().split('T')[0], contributingFactors: ['Elevated Systolic Blood Pressure (145 mmHg)', 'High Total Cholesterol (230 mg/dL)', 'Advanced Age (65 yrs)'], createdAt: new Date() },
        { id: 'PRED-DIA-102', patientId: 'john_doe', predictionType: 'DIABETES', riskType: 'METABOLIC', riskLevel: 'HIGH', riskPercentage: 72.0, confidence: 94.1, predictionDate: new Date().toISOString().split('T')[0], contributingFactors: ['Diabetic HbA1c Level (7.5%)', 'High Body Mass Index (32.0)'], createdAt: new Date() },
        { id: 'PRED-CVD-103', patientId: 'jane_smith', predictionType: 'CVD', riskType: 'CARDIO', riskLevel: 'MEDIUM', riskPercentage: 42.0, confidence: 89.5, predictionDate: new Date().toISOString().split('T')[0], contributingFactors: ['Prehypertension BP (132 mmHg)'], createdAt: new Date() },
        { id: 'PRED-CVD-104', patientId: 'robert_j', predictionType: 'CVD', riskType: 'CARDIO', riskLevel: 'HIGH', riskPercentage: 85.0, confidence: 96.2, predictionDate: new Date().toISOString().split('T')[0], contributingFactors: ['Hypertension Crisis (185 mmHg)', 'Advanced Age (70 yrs)'], createdAt: new Date() },
        { id: 'PRED-CVD-105', patientId: 'PAT101', predictionType: 'CVD', riskType: 'CARDIO', riskLevel: 'HIGH', riskPercentage: 81.5, confidence: 95.5, predictionDate: new Date().toISOString().split('T')[0], contributingFactors: ['Resting Tachycardia (135 bpm)', 'Low SpO2 (89%)'], createdAt: new Date() }
      ]);

      await RiskPrediction.insertMany([
        { patientId: 'john_doe', risk: 'High', confidence: 92.4, score: 78.5, factors: ['Elevated Systolic Blood Pressure (145 mmHg)', 'High Total Cholesterol (230 mg/dL)'], timestamp: new Date() },
        { patientId: 'jane_smith', risk: 'Medium', confidence: 89.5, score: 42.0, factors: ['Prehypertension BP (132 mmHg)'], timestamp: new Date() },
        { patientId: 'robert_j', risk: 'High', confidence: 96.2, score: 85.0, factors: ['Hypertension Crisis (185 mmHg)'], timestamp: new Date() }
      ]);

      console.log('[AUTO-SEEDER] Database successfully populated with initial patients, providers, twins, alerts, predictions, and notifications!');
    }
  } catch (err) {
    console.error('[AUTO-SEEDER] Seeding failed:', err.message);
  }
}

function startContinuousTelemetryGenerator() {
  setInterval(async () => {
    try {
      const patientList = await Patient.find({}).limit(8);
      if (patientList.length === 0) return;

      for (const p of patientList) {
        const lastVital = await VitalRecord.findOne({ patientId: p._id }).sort({ recordedAt: -1 });

        const baseHr = lastVital ? lastVital.heartRate : 75;
        const baseSpo2 = lastVital ? lastVital.oxygenLevel : 97;
        const baseTemp = lastVital ? lastVital.temperature : 36.7;

        const hr = Math.max(52, Math.min(148, baseHr + Math.floor((Math.random() - 0.5) * 6)));
        const spo2 = Math.max(88, Math.min(100, parseFloat((baseSpo2 + (Math.random() - 0.5) * 0.8).toFixed(1))));
        const temp = parseFloat(Math.max(36.0, Math.min(39.5, baseTemp + (Math.random() - 0.5) * 0.2)).toFixed(1));
        const sys = Math.max(105, Math.min(185, 125 + Math.floor((Math.random() - 0.5) * 10)));
        const dia = Math.max(70, Math.min(115, 80 + Math.floor((Math.random() - 0.5) * 6)));
        const rr = Math.max(12, Math.min(28, 16 + Math.floor((Math.random() - 0.5) * 3)));

        const bpStr = `${sys}/${dia}`;

        const vitalRecord = await VitalRecord.create({
          id: `vit-${Date.now()}-${p._id}`,
          patientId: p._id,
          heartRate: hr,
          oxygenLevel: spo2,
          temperature: temp,
          bloodPressure: bpStr,
          respiratoryRate: rr,
          recordedAt: new Date()
        });

        const age = calculateAgeFromDob(p.dateOfBirth);
        const triggered = evaluateRules({ heartRate: hr, spo2, temperature: temp, systolic: sys, diastolic: dia, respiratoryRate: rr }, { age, conditions: p.medicalHistory });
        const aiRiskObj = classifyRisk({ heartRate: hr, spo2, temperature: temp, systolic: sys, diastolic: dia, respiratoryRate: rr });

        if (triggered.length > 0) {
          for (const tr of triggered) {
            const alertId = `ALT-LIVE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
            const alertDoc = await Alert.create({
              alertId,
              patientId: p._id,
              patientName: `${p.firstName} ${p.lastName}`,
              severity: tr.severity,
              type: tr.type,
              message: tr.message,
              confidence: aiRiskObj.confidence,
              risk: aiRiskObj.risk,
              vitals: { heartRate: hr, spo2, temperature: temp, bloodPressure: bpStr, respiratoryRate: rr },
              status: 'NEW',
              createdAt: new Date()
            });

            await NotificationLog.create({
              patientId: p._id,
              message: `[${tr.severity}] ${tr.message}`,
              type: tr.severity,
              status: 'UNREAD',
              createdAt: new Date()
            });

            broadcastSSEEvent('alert', alertDoc);
          }
        }

        broadcastSSEEvent('vitals', {
          patientId: p._id,
          vitals: { heartRate: hr, spo2, temperature: temp, bloodPressure: bpStr, respiratoryRate: rr },
          aiRisk: aiRiskObj.risk,
          aiConfidence: aiRiskObj.confidence,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      // Background loop
    }
  }, 5000);
}


app.listen(PORT, async () => {
  console.log(`Mock API Gateway running on port ${PORT}`);
  await seedDatabaseIfEmpty();
  startContinuousTelemetryGenerator();
});
