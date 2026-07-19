export interface PrivacySection {
  id: string;
  category: 'data' | 'ai' | 'security';
  title: string;
  content: string;
}

export interface DataTableRow {
  dataType: string;
  purpose: string;
  retention: string;
  sharedWith: string;
  required: string;
}

export const PRIVACY_POLICY_META = {
  appName: "PostureCare",
  companyName: "PostureCare Spinal Laboratories Private Limited",
  website: "https://posturecare.health",
  supportEmail: "support@posturecare.health",
  dpoEmail: "compliance@posturecare.health",
  country: "India",
  governingLaws: "India's Digital Personal Data Protection (DPDP) Act 2023, General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and local consumer protection standards.",
  lastUpdated: "July 2026",
};

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "intro",
    category: "data",
    title: "1. Introduction & Scope",
    content: `Welcome to PostureCare. This Privacy Policy (\"Policy\") governs the collection, processing, local caching, and cloud synchronization of personal data and biomechanical telemetry when using the PostureCare mobile and companion web applications (the \"App\"), and our connected posture-monitoring wearable hardware (the \"Wearable\" or \"Device\").

This Wearable and companion App are owned and operated by PostureCare Spinal Laboratories Private Limited (\"Company\", \"we\", \"us\", or \"our\"), a company incorporated under the laws of the Republic of India.

We are highly committed to protecting your bodily privacy and digital security. This policy is designed to be comprehensive, legally sound under India's Digital Personal Data Protection (DPDP) Act 2023, the European Union's General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA), while remaining easily understandable to ordinary users. By using the Wearable or the App, you explicitly consent to the data collection and processing activities described herein.`
  },
  {
    id: "info_we_collect",
    category: "data",
    title: "2. Information We Collect",
    content: `To provide accurate real-time haptic posture feedback and weekly progress analytics, we process data that falls into three distinct categories:
• Information You Provide directly to us during profile creation.
• Information Collected Automatically through app interactions, diagnostics, and BLE channels.
• Posture Telemetry derived from the physical Wearable sensor.

We adhere strictly to the principle of data minimization: we collect only the minimum set of data parameters necessary to calculate your spinal orientation, and nothing more.`
  },
  {
    id: "info_you_provide",
    category: "data",
    title: "3. Information You Provide",
    content: `When establishing an account, you may provide the following direct inputs:
• Account Identity: Your full name (optional) and valid email address. This is used for account verification, password resets, and critical firmware notifications.
• Access Credentials: A secure password, which is hashed immediately on the client side using robust cryptographic hashing algorithms. We never store or transmit your raw, plaintext password.
• Demographics & Biometrics: Physical traits including Age, Height, and Weight. These parameters are optional but highly recommended; they enable our on-device algorithms to adjust muscle fatigue thresholds and posture quality thresholds based on average clinical spine lengths.`
  },
  {
    id: "info_auto",
    category: "data",
    title: "4. Information Collected Automatically",
    content: `When the App is running, we automatically capture technical parameters to preserve system reliability and debug wireless synchronization faults:
• Companion Connection Data: Bluetooth Device ID, device model number, and hardware MAC address.
• Operational Telemetry: Firmware Version currently flashed on the ESP32 controller, battery level, active App version, and operating system version (iOS, Android, or macOS/Windows).
• Device Diagnostics: Local Bluetooth connection attempt counts, packet transmission retry rates, and internal device calibration profiles.
• Crash Reports: Thread stacks and memory crash dumps collected in the event of an unexpected App crash. These crash dumps are stripped of personal user details and do not contain postural angles or coordinate streams.`
  },
  {
    id: "posture_data",
    category: "data",
    title: "5. Strict Biomechanical Posture Data Collection",
    content: `The connected PostureCare Wearable contains a high-precision LSM6DS3 triaxial accelerometer and gyroscope. It is strictly limited to measuring raw spatial angles to monitor user posture.

• STRICT BIOMETRIC EXCLUSIONS: We DO NOT collect, monitor, or store sensitive health metrics such as heart rate, blood oxygen levels (SpO2), ECG waveforms, body temperature, calories burned, sleep cycles, or GPS location coordinates.
• Local Processing Window: Raw high-frequency accelerometer waves are processed instantly in browser memory or on the ESP32 microchip to calculate your instantaneous Spinal Angle.
• Telemetry Storage: We store only the calculated Spinal Angle, timestamps of posture changes, active session duration, and slouch incidents. These parameters are encrypted on-device during localized caching and synced using secure HTTPS pipelines.`
  },
  {
    id: "bluetooth_perms",
    category: "security",
    title: "6. Bluetooth Permissions & Spatial Location Scanning",
    content: `The Wearable operates peer-to-peer using Bluetooth Low Energy (BLE). 

• BLE Exclusive Use: Bluetooth permissions are utilized solely to scan for, establish, and maintain connection with your physical PostureCare Wearable Pod.
• Location Permission Guard: On certain mobile operating systems (including older versions of Android), BLE scanning requires coarse or precise location permission to identify nearby hardware beacons.
• NO LOCATION RETENTION: We explicitly state that PostureCare DOES NOT access, collect, track, or share your physical GPS coordinates or geographical location. The permission is purely a mobile OS technical requirement for BLE communication.`
  },
  {
    id: "notification_perms",
    category: "data",
    title: "7. Notification Permission",
    content: `The App will request permission to send you local push notifications. If granted, notifications are used strictly for:
• Real-time posture slouch alerts and active session status reminders.
• Daily streak goals achieved, encouraging behavioral adherence.
• Critical firmware update alerts to patch security layers or hardware calibration drifts.

You can modify or completely revoke push notification permissions at any time through your operating system's settings panel.`
  },
  {
    id: "pairing",
    category: "security",
    title: "8. Device Pairing Safety & Proximity",
    content: `To pair your Wearable, you must bring the physical sensor pod within immediate Bluetooth range (less than 5 meters) of your companion smartphone or laptop. The pairing pipeline uses standard secure pairing protocols to ensure third-party devices in your vicinity cannot intercept your posture signal or read your live angular data stream.`
  },
  {
    id: "firmware",
    category: "security",
    title: "9. Secure OTA Firmware Updates",
    content: `To keep your hardware running safely, the App occasionally pulls official, digitally-signed firmware binaries from our secure servers and transfers them Over-The-Air (OTA) to your Wearable. 

These updates are executed solely to:
• Resolve firmware-level security bugs.
• Optimize battery discharge performance.
• Refine the accelerometer calibration matrices.

OTA updates never install tracking code or modify the data-minimization architecture of the hardware.`
  },
  {
    id: "how_use",
    category: "data",
    title: "10. How We Use Your Data",
    content: `We process your personal data and posture history strictly for the following purposes:
• Biomechanical Feedback: To display real-time spinal alignment graphs, track slouch duration, and issue custom-vibrated haptic reminders.
• Historical Visualization: To generate weekly posture compliance charts, trend lines, and average focus scores.
• AI Clinician Summaries: To compile anonymized statistics and submit them to the Google Gemini Flash API, generating secure clinical insights.
• Customer Support: To identify device connection bottlenecks, verify firmware revisions, and resolve user-submitted bug tickets.
• Safety Auditing: To detect malicious API requests, prevent device-spoofing, and guarantee server reliability.`
  },
  {
    id: "legal_basis",
    category: "ai",
    title: "11. Legal Basis for Processing",
    content: `Under global privacy frameworks, our legal grounds for processing your posture data include:
• Consent: You provide explicit, unambiguous consent when agreeing to this Policy and checking the verification boxes on our gate screen.
• Contractual Performance: Processing is required to deliver the core behavioral posture feedback service you requested when pairing the Wearable.
• Legitimate Interests: Processing diagnostic crash logs is necessary to secure our API endpoints, prevent fraud, and maintain app stability.`
  },
  {
    id: "storage",
    category: "security",
    title: "12. Local Data Storage & Offline Sandboxing",
    content: `PostureCare is engineered with a localized-first layout:
• Local IndexedDB Cache: All session records and hourly telemetry are stored inside your browser's secure IndexedDB sandbox.
• Local State (Redux): Your active session parameters, device battery levels, and UI preferences are kept in memory using Redux.
• Clear Site Data Sovereignty: You can instantly delete all local logs at any time by selecting the "Delete Account" button or clearing your browser's site cookies and storage.`
  },
  {
    id: "cloud_sync",
    category: "security",
    title: "13. Cloud Synchronization & Transport Encryption",
    content: `When connected to the internet, your local telemetry is synchronized with our secure Firestore databases. 

• Transport Cryptography: All data moving between the App, Wearable, and our cloud database is encrypted in transit using SSL/TLS 1.3 protocol.
• Storage Encryption: All records synced with our databases are encrypted at rest using enterprise-grade AES-256 standard encryption.
• Access Control: Firestore security rules are strictly locked down to ensure that only authenticated users can read or write their own documents.`
  },
  {
    id: "sharing",
    category: "ai",
    title: "14. No Sale of Personal Information",
    content: `We value your trust. We adhere to the following strict sharing rules:
• WE DO NOT SELL, RENT, OR TRADE YOUR PERSONAL INFORMATION OR POSTURE DATA TO THIRD-PARTY ADVERTISERS OR DATA BROKERS.
• Sub-processors: We share data only with trusted service infrastructure (e.g., Firebase Authentication to maintain logins, Google Cloud for encrypted databases, and the secure Google Gemini Flash API for clinician reports).
• User-Initiated Sharing: You may choose to export your posture logs in CSV format or email your clinical reports to your physician or orthopedist. We only execute these transfers upon your explicit command.`
  },
  {
    id: "security",
    category: "security",
    title: "15. Cryptographic & Administrative Security Measures",
    content: `We implement robust technical and administrative barriers to prevent data breaches:
• Real-time database rules preventing unauthorized file reading.
• Client-side password hashing so database operators cannot read your credentials.
• Isolation of diagnostic crash reports from posture data.
• Automatic session timeouts and continuous logging audits.`
  },
  {
    id: "retention",
    category: "data",
    title: "16. Data Retention Policy",
    content: `We retain your data only for as long as your account remains active, or as long as necessary to provide posture insights. 

• Posture Telemetry: Retained indefinitely while your account exists to display historical trends, or until you execute a manual deletion request.
• Diagnostic logs: Retained for a maximum of thirty (30) days, after which they are permanently overwritten.
• Inactive Accounts: If an account remains completely inactive for more than twenty-four (24) consecutive months, we reserve the right to archive your records and notify you via email prior to permanent deletion.`
  },
  {
    id: "deletion",
    category: "data",
    title: "17. Immediate Account & Data Deletion",
    content: `You possess complete sovereignty over your records:
• In-App Deletion: You can trigger immediate account deletion via your Profile Settings tab inside the companion application.
• Immediate Erasure: Selecting account deletion triggers a cascading delete sequence that instantly removes your Firebase Authentication profile, purges your cloud Firestore records, and wipes your local IndexedDB cache.
• No Backups Retained: Once deletion is confirmed, your historical posture data is gone forever and cannot be recovered by our team.`
  },
  {
    id: "export",
    category: "data",
    title: "18. Exporting Your Posture Data",
    content: `We believe in data portability. At any time, you can go to your Profile Screen and download a complete, structured CSV spreadsheet containing all your historic spinal measurements, calibration angles, and posture compliance logs. You can use this file for your own records or share it with clinical specialists.`
  },
  {
    id: "rights",
    category: "security",
    title: "19. Global User Rights (GDPR, DPDP, CCPA)",
    content: `Depending on your country of residence, you enjoy robust statutory rights regarding your personal information:
• Right to Access: Request a summary of all data parameters we hold about you.
• Right to Correction: Update inaccurate profile values (such as an incorrect weight or email).
• Right to Erasure (\"To Be Forgotten\"): Demand immediate removal of all digital records from our databases.
• Right to Restrict Processing: Limit the scope of data analysis or revoke consent for cloud synchronization.
• Right to Lodge Complaints: Escalate concerns to the Data Protection Board of India or your local European Supervisory Authority.

To exercise any of these statutory rights, please contact our compliance node at compliance@posturecare.health.`
  },
  {
    id: "children",
    category: "data",
    title: "20. Children's Privacy Guard",
    content: `The Wearable and App are strictly intended for use by individuals who are at least 18 years of age. We do not knowingly or intentionally collect personal data from children under the age of 18 (or under the age of majority in your jurisdiction). If we discover that a minor has bypass-registered an account, we will immediately execute an emergency account purge and erase all telemetry from our cloud servers.`
  },
  {
    id: "transfers",
    category: "security",
    title: "21. International Data Transfers",
    content: `Your synchronized posture data is hosted on secure, access-controlled cloud servers. If you are accessing the service from the European Union, the United States, or other regions, please note that your data may be transferred to and processed on servers located in India or other global secure hubs. We utilize Standard Contractual Clauses (SCCs) and HIPAA-aligned safety measures to ensure all international transfers maintain equivalent privacy safeguards.`
  },
  {
    id: "changes",
    category: "security",
    title: "22. Changes to this Privacy Policy",
    content: `We reserve the right to update this Privacy Policy from time to time to accommodate new hardware sensors, software updates, or regulatory compliance mandates. If we execute a material change, we will post a prominent notice inside the App and notify you via email. The \"Last Updated\" date at the top of this document will be updated accordingly. Continued use of the App or Wearable after an update constitutes acceptance of the modified Policy.`
  },
  {
    id: "contact",
    category: "security",
    title: "23. Corporate Compliance Contact",
    content: `If you have any questions, concerns, or formal legal complaints regarding this Privacy Policy, please contact our Data Protection Officer (DPO):

Company Name: PostureCare Spinal Laboratories Private Limited
Support Email: support@posturecare.health
Compliance Email: compliance@posturecare.health
Website: posturecare.health
Corporate Office: Connaught Place, New Delhi, 110001, India

Thank you for trusting PostureCare with your physical conditioning. Align your spine and protect your health.`
  }
];

export const PRIVACY_TABLE_ROWS: DataTableRow[] = [
  {
    dataType: "Personal Identity (Name, Email)",
    purpose: "Account authentication, password recovery, and secure verification",
    retention: "Until account is deleted by user",
    sharedWith: "Firebase Authentication (infrastructure only)",
    required: "Required for custom accounts (Optional for Guest Mode)"
  },
  {
    dataType: "Demographics (Age, Height, Weight)",
    purpose: "Fine-tune accelerometer thresholds & coordinate scales based on spinal dimensions",
    retention: "Until account is deleted by user",
    sharedWith: "Strictly private. None.",
    required: "Optional (highly recommended)"
  },
  {
    dataType: "Spinal Angle Telemetry",
    purpose: "Calculate slouch duration, render realtime alignment widget, and trigger local haptic alerts",
    retention: "Until account is deleted, or immediate user-triggered purge",
    sharedWith: "Secure cloud database (Firestore). Processed anonymously by Google Gemini for Clinician Reports.",
    required: "Required for core app functionality"
  },
  {
    dataType: "Device Settings & Calibration Bounds",
    purpose: "Preserve calibrated upright angles and save haptic buzzer intensity preference",
    retention: "Until account is deleted",
    sharedWith: "Strictly private. None.",
    required: "Required to pair wearable"
  },
  {
    dataType: "Device Diagnostics (Battery, Firmware, OS, Bluetooth retry rates)",
    purpose: "Monitor wireless signal drops, troubleshoot Over-The-Air firmware updates, and track reliability",
    retention: "Maximum of 30 days",
    sharedWith: "Diagnostics compiler (infrastructure only)",
    required: "Optional"
  }
];
