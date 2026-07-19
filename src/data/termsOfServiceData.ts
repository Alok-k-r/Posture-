export interface TOSClause {
  num: number;
  title: string;
  content: string;
}

export const TOS_META = {
  product: "PostureCare",
  company: "PostureCare Spinal Laboratories Private Limited",
  jurisdiction: "New Delhi, India",
  lastUpdated: "July 2026"
};

export const TOS_CLAUSES: TOSClause[] = [
  {
    num: 1,
    title: "1. Acceptance of Terms",
    content: "These Terms of Service (\"Agreement\" or \"Terms\") constitute a legally binding contract between you (\"User\", \"you\", or \"your\") and PostureCare Spinal Laboratories Private Limited (\"Company\", \"we\", \"us\", or \"our\"), governing your access and use of the PostureCare mobile and web applications (the \"App\"), our cloud services, and your integration with the paired PostureCare wearable hardware devices, including the ESP32 LSM6DS3 accelerometer sensor pods and associated accessories (collectively, the \"Hardware\" or \"Device\").\n\nBy creating an account, pairing the Hardware, or otherwise accessing the App, you acknowledge that you have read, understood, and agree to be bound by this entire Agreement. If you do not agree to these terms, you must instantly cease all use of the Hardware and uninstall the App."
  },
  {
    num: 2,
    title: "2. Eligibility",
    content: "You must be at least eighteen (18) years of age, or the age of legal majority in your jurisdiction of residence, whichever is greater, to create an account or pair a Device. By executing this Agreement, you represent and warrant that you possess the full legal right, capacity, and authority to enter into this contract.\n\nThe App and Device are intended for global deployment. However, users in restricted sanitary or high-risk therapeutic profiles must not participate in the physical postural conditioning modules without explicit orthopedist authorization."
  },
  {
    num: 3,
    title: "3. User Accounts",
    content: "To access the App's telemetry, session records, and clinician interaction modules, you must establish a secure account. You represent and warrant that all registration details entered (including Name, Age, Height, Weight, and Email) are strictly accurate and truthful.\n\nYou are solely responsible for maintaining the absolute confidentiality of your login credentials (username and password) and for any and all activity that occurs under your account. You agree to immediately notify our security response node at support@posturecare.health of any unauthorized account access, security breach, or compromised credentials. The Company shall not be liable for any loss, damage, or biometric exposure resulting from your failure to protect your login parameters."
  },
  {
    num: 4,
    title: "4. Device Pairing",
    content: "The App is engineered to pair with physical wearable Hardware equipped with advanced Inertial Measurement Units (IMUs). Pairing is established locally via Bluetooth Low Energy (BLE) or encrypted Wi-Fi websocket pipelines. You acknowledge that pairing requires proximity, specific hardware compatibility, and consistent local signal integrity.\n\nYou agree that the Company does not guarantee uninterrupted pairing and is not liable for data loss or missed postural slouch incidents caused by local signal noise, physical interference, or pairing dropouts."
  },
  {
    num: 5,
    title: "5. Bluetooth Permissions",
    content: "To facilitate local haptic alerts, posture angular stream transmission, and firmware updates, you must grant the App persistent access to your mobile operating system's Bluetooth permissions (including Background Bluetooth and Location Services where required by the OS to scan for BLE beacons).\n\nYou acknowledge that Bluetooth communications are subject to physical obstruction, radio-frequency interference, and protocol crashes. The App's alert delivery mechanisms may fail to initiate if Bluetooth services are disabled, restricted, or experience background termination by the operating system."
  },
  {
    num: 6,
    title: "6. Internet Connectivity",
    content: "Certain core features of the App, including historical database backup, cloud synchronizations, server-side Google Gemini Flash AI \"Clinician Reports\" compilation, and medical appointment scheduling, require active internet connectivity (cellular data or Wi-Fi).\n\nYou acknowledge that the Company is not responsible for internet outages, carrier fees, server response delay, or connection throttling. When offline, the App operates in a sandboxed Offline Mode with localized haptic constraints, and remote services will remain completely unavailable."
  },
  {
    num: 7,
    title: "7. Firmware Updates",
    content: "From time to time, the Company may release essential firmware updates for your wearable Hardware to patch security vulnerabilities, recalibrate accelerometer bias, or introduce new analytical layers. These updates are pushed OTA (Over-The-Air) via Bluetooth from the App.\n\nYou agree to install all firmware updates promptly. The Company is not responsible for Device malfunction, complete firmware corruption (\"bricking\"), battery drainage, or loss of device calibration resulting from aborted updates, battery depletion during the flash cycle, or the use of modified or unofficial firmware packages."
  },
  {
    num: 8,
    title: "8. Device Synchronization",
    content: "Physical angle telemetry is logged locally on the wearable Hardware and synchronized with the App. Synchronization may occur in real-time or via batch uploads.\n\nYou acknowledge that sync failures may occur due to memory bounds on the ESP32 chip, signal dropouts, or application crashes. In the event of a sync failure, raw angular records stored on the Hardware's temporary buffer may be permanently overwritten or lost, and the Company shall have zero liability for such data loss."
  },
  {
    num: 9,
    title: "9. Data Synchronization",
    content: "If you establish internet connectivity, your localized posture scores, weekly streak metrics, and anonymized diagnostic reports are automatically synchronized with our secure HIPAA-aligned cloud database nodes.\n\nYou agree that cloud synchronization is subject to scheduled maintenance, server-side failures, and database routing delays. While the App implements a local Redux queue to retry pending uploads when returning online, the Company does not guarantee the instantaneous or perpetual preservation of your synchronized cloud telemetry."
  },
  {
    num: 10,
    title: "10. Health Disclaimer",
    content: "THE POSTURECARE SOFTWARE, HARDWARE, AND GENERATED ALERTS (INCLUDING DYNAMIC ALARM HUMS AND COGNITIVE VOCAL COACHING COMMANDS) ARE DESIGNED SOLELY TO ASSIST USERS IN BEHAVIORAL POSTURAL AWARENESS AND CONDITIONING. POSTURECARE DOES NOT PROVIDE ANY HEALTHCARE SERVICES, PHYSIOTHERAPY, OR FORMAL ORTHOPEDIC DIAGNOSES.\n\nBiomechanical training involves active engagement of your spinal, cervical, and core musculature. It is common to experience mild muscular soreness, fatigue, or stiffness in the rhomboids, trapezius, and upper back during the initial phase of postural adaptation. However, PostureCare is not a substitute for clinical exercise programs and you participate in all behavioral training voluntarily and at your own risk."
  },
  {
    num: 11,
    title: "11. Medical Disclaimer",
    content: "POSTURECARE IS NOT A CERTIFIED MEDICAL DEVICE AND HAS NOT BEEN CLEARED, APPROVED, OR REVIEWED BY THE FOOD AND DRUG ADMINISTRATION (FDA) OR ANY OTHER MEDICAL REGULATORY AUTHORITY. ALL CLINICAL REPORTS, POSTURE QUALITY RATINGS, PROGRESS METRICS, AND AI-GENERATED INSIGHTS GENERATED BY THE APP ARE STRICTLY EDUCATIONAL IN NATURE.\n\nTHE SOFTWARE AND HARDWARE ARE NOT INTENDED FOR USE IN THE DIAGNOSIS OF SPINE DISEASES OR OTHER CLINICAL CONDITIONS, OR IN THE CURE, MITIGATION, TREATMENT, OR PREVENTION OF PATHOLOGIES, INCLUDING STRUCTURAL SCOLIOSIS, KYPHOSIS, HERNIATED DISCS, SPINAL STENOSIS, OR ACUTE SPINAL DEFORMITIES. THE INFORMATION AND REPORTS DO NOT CONSTITUTE MEDICAL ADVICE. ALWAYS CONSULT WITH A LICENSED PHYSICIAN, PHYSIOTHERAPIST, OR ORTHOPEDIST BEFORE ENGAGING IN INTENSE MUSCULOSKELETAL CORRECTION PATTERNS, ESPECIALLY IF YOU SUFFER FROM CHRONIC BACK CONDITIONS OR SPINAL RECONSTRUCTIONS."
  },
  {
    num: 12,
    title: "12. Accuracy of Data",
    content: "The Hardware utilizes an LSM6DS3 triaxial accelerometer and gyroscope to approximate your spinal alignment angle relative to your calibrated baseline state.\n\nYou acknowledge that sensor accuracy is inherently limited by:\n• Physical device displacement or slipping on the body.\n• Incorrect baseline calibrations (e.g. calibrating while slouching).\n• Extreme rapid movements, twisting, or changing chairs.\n• Differences in individual anatomical spine structure.\n\nAll angle telemetry, focus duration statistics, and dynamic integrity ratings are estimations. The Company warrants no absolute accuracy, and you must not rely on App metrics for clinical evaluations."
  },
  {
    num: 13,
    title: "13. User Responsibilities",
    content: "As a condition of using PostureCare, you agree to:\n• Calibrate the Device correctly using a neutral, clinically upright spinal posture as instructed by the App.\n• Charge the Hardware utilizing only certified, official micro-USB/USB-C chargers and accessories to prevent thermal runaway or lithium-ion battery degradation.\n• Fasten the wearable pod securely to prevent physical drops, water submersion, or physical damage.\n• Discontinue use immediately if the Hardware becomes excessively warm, emits unusual odors, or causes skin irritation/allergic reactions from prolonged contact."
  },
  {
    num: 14,
    title: "14. Acceptable Use Policy",
    content: "You agree to use the App, Device, and Cloud services strictly in compliance with all applicable local, national, and international laws, rules, and regulations.\n\nYour license to use PostureCare is personal, non-assignable, and non-transferable. You shall access the API nodes, scheduling portals, and databases only through the official user interfaces provided within the App."
  },
  {
    num: 15,
    title: "15. Prohibited Uses",
    content: "You are strictly forbidden from:\n• Attempting to scrape, crawl, reverse engineer, decompile, or extract the source code of the App, on-device ML model weights, or firmware binaries.\n• Bypassing or attempting to bypass security features, API firewalls, or user authentication gates.\n• Flooding or executing Denial of Service (DoS) attacks against PostureCare cloud servers.\n• Modifying raw BLE communication frames or spoofing IMU coordinate streams to fabricate artificial posture scores.\n\nThe Company reserves the absolute right to remotely terminate or disable your cloud synchronization and App features if any prohibited usage or abuse pattern is detected."
  },
  {
    num: 16,
    title: "16. User Generated Content",
    content: "To the extent that the App permits you to enter customizable parameters, custom haptic alarm profiles, note descriptions for clinician summaries, or core demographic data, you grant the Company a worldwide, perpetual, royalty-free, fully sub-licensable license to host, cache, transmit, and aggregate such data.\n\nYou represent and warrant that your content does not violate any third-party intellectual property, privacy, or moral rights, and you are solely responsible for all texts and metrics you submit."
  },
  {
    num: 17,
    title: "17. Intellectual Property",
    content: "The App, Hardware, firmware, on-device machine learning architectures, localized analytical algorithms (including our proprietary dynamic threshold calculation layers), visual layout assets, UI code, and marketing assets are the exclusive intellectual property of PostureCare Spinal Laboratories Private Limited, protected by international copyright, patent, trademark, and trade secret laws.\n\nNo license, title, or interest in our proprietary mathematical models or design patterns is transferred to you under this Agreement, except for the limited, revocable license to access the App for individual behavioral training."
  },
  {
    num: 18,
    title: "18. Open Source Components",
    content: "The App is constructed utilizing high-grade open-source components, which are governed by their respective licenses (such as MIT, Apache 2.0, or BSD).\nOur Software Bill of Materials (SBOM) includes:\n• React (Component Library)\n• Vite (Build System)\n• Redux Toolkit (State Management)\n• Recharts & D3 (Visualization Engine)\n• Motion (Physics Animation Framework)\n• Lucide React (SVG Vector Asset Package)\n• Tailwind CSS (Style Engine)\n\nTo the extent of any conflict between this Agreement and any open-source license, the respective open-source license shall control regarding that specific third-party library."
  },
  {
    num: 19,
    title: "19. Subscription and Payments",
    content: "Certain advanced features, such as continuous cloud backup synchronization, priority orthopedist appointments, and advanced server-side Gemini Flash Clinical Report summaries, may require a paid premium subscription.\n\nIf you enroll in a premium tier, you agree to pay all applicable fees, taxes, and recurring billing charges. All transactions are securely processed through integrated third-party payment gateways. We store no physical credit card or financial credentials on our databases."
  },
  {
    num: 20,
    title: "20. Refund Policy",
    content: "All software subscription payments and premium service fees are completely non-refundable.\n\nRegarding physical Hardware purchases (the Wearable Sensor Pods), refunds are governed by our limited 14-day hardware returns policy. The Hardware must be returned undamaged in its original sterile packaging. The user is responsible for all shipping charges associated with returns."
  },
  {
    num: 21,
    title: "21. Third-Party Services",
    content: "The App may integrate or coordinate with third-party software nodes, including Google Maps, Firebase Authentication, cloud database storage providers, and external clinician databases.\n\nYou acknowledge that the Company exercises zero operational control over third-party platforms. We assume no liability, warranty, or obligation for the downtime, data breaches, or API modifications of any third-party services integrated within the PostureCare workspace."
  },
  {
    num: 22,
    title: "22. Privacy Policy Reference",
    content: "Your privacy and biological security are our highest priorities. All collection, localized caching, and cloud backups of your personal profile, biomechanical variables, and diagnostic records are strictly governed by our comprehensive PostureCare Privacy & Security Policy.\n\nBy agreeing to these Terms, you also acknowledge that you have read, understood, and accept our Privacy Policy, which is incorporated by reference herein."
  },
  {
    num: 23,
    title: "23. Device Warranty Disclaimer",
    content: "THE HARDWARE AND DEVICE COMPONENT NODES ARE PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.\n\nTO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY EXPLICITLY DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, STRUCTURAL INTEGRITY, AND NON-INFRINGEMENT. THE COMPANY DOES NOT WARRANT THAT THE DEVICE WILL RESIST WATER, DROPS, HEAT DISSIPATION FAULTS, OR THAT IT WILL OPERATE WITHOUT MINOR SENSOR SKEWS OR BLUETOOTH DROPOUTS."
  },
  {
    num: 24,
    title: "24. Limitation of Liability",
    content: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE JURISDICTIONAL LAW, IN NO EVENT SHALL POSTURECARE SPINAL LABORATORIES PRIVATE LIMITED, ITS OFFICERS, DIRECTORS, INVESTORS, EMPLOYEES, OR HARDWARE SUPPLIERS BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES.\n\nTHIS INCLUDES, BUT IS NOT LIMITED TO, DAMAGES FOR PHYSICAL SPINE INJURIES, CORE MUSCLE STRAIN, SENSORY COMPACTION, DATA LOSS, LOST OR STOLEN DEVICES, OR THE COSTS OF PROCURING ALTERNATIVE COCHLEAR OR CLINICAL REGIMENS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.\n\nOUR TOTAL CUMULATIVE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THIS AGREEMENT, THE APP, OR THE DEVICE SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO THE COMPANY FOR THE SOFTWARE OR HARDWARE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM. THIS LIMITATION IS CUMULATIVE AND WILL NOT BE ENLARGED BY MORE THAN ONE INCIDENT."
  },
  {
    num: 25,
    title: "25. Indemnification",
    content: "You agree to defend, indemnify, and hold harmless the Company and its affiliates, directors, agents, and employees from and against any and all claims, damages, liabilities, costs, and expenses (including reasonable attorney fees) arising from:\n• Your misuse of the App or Hardware.\n• Your breach of any clause or warranty in this Agreement.\n• Your violation of any third-party medical, privacy, or proprietary rights.\n• Any physical injuries, skin allergies, or muscle fatigue resulting from your postural training adjustments."
  },
  {
    num: 26,
    title: "26. Service Availability",
    content: "While we strive to maintain uninterrupted access to our cloud dashboards, clinician report pipelines, and diagnostic modules, you agree that we do not warrant continuous availability.\n\nServices may be subject to scheduled database optimization, server maintenance, local power failures, cloud provider down times, and emergency service updates. We reserve the absolute right to modify, suspend, or discontinue any feature, graph, or module within the App at any time without notice or liability."
  },
  {
    num: 27,
    title: "27. Device Compatibility",
    content: "The App is designed to run on modern web browsers and mobile platforms with advanced Web Bluetooth and websocket API support.\n\nThe Company does not warrant that the App will be compatible with all operating system versions, browser distributions, or physical hardware architectures. It is your sole responsibility to ensure that your smartphone, tablet, or laptop meets the minimum technical specifications required to operate the BLE or local Wi-Fi bridges."
  },
  {
    num: 28,
    title: "28. Battery and Hardware Disclaimer",
    content: "The wearable Device features an integrated rechargeable lithium-ion battery. You acknowledge and agree that:\n• Lithium-ion batteries degrade over time, leading to reduced runtime between charges.\n• You must charge the Device using only official, standard USB chargers. The use of high-voltage chargers or damaged cables may cause battery swelling, chemical leaks, or thermal runaway.\n• You must not expose the Hardware to direct sunlight, high humidity, or sub-zero temperatures.\n• The Device is not waterproof. Water exposure may corrode the LSM6DS3 sensor pins and cause dangerous battery shorts."
  },
  {
    num: 29,
    title: "29. Security",
    content: "We implement commercial-grade digital and administrative controls to protect your synchronized statistics, account information, and clinical reports.\n\nHowever, you acknowledge that no digital transmission over the internet or BLE channel is 100% secure. The Company cannot guarantee that unauthorized third parties will never be able to defeat our security barriers or use your personal data for improper purposes. You use the cloud synchronization gates at your own risk."
  },
  {
    num: 30,
    title: "30. Account Suspension",
    content: "The Company reserves the right to immediately suspend your account, restrict your BLE pairing pipeline, or block your access to the App's analytical dashboards if:\n• We suspect any fraudulent, illegal, or abusive behavior.\n• You violate the terms, eligibility parameters, or acceptable usage provisions.\n• Your connected Hardware broadcasts corrupted, malformed, or hostile websocket payloads.\n• You have outstanding, unpaid subscription fees."
  },
  {
    num: 31,
    title: "31. Account Termination",
    content: "You may terminate this Agreement at any time by deleting your account from the Profile settings and uninstalling the App.\n\nUpon termination, all licenses granted to you herein immediately cease, and you must destroy or return any associated documentation. The Company may purge or archive your cloud database logs upon account termination in compliance with local legal requirements, and shall have no obligation to export your historical telemetry after account deletion."
  },
  {
    num: 32,
    title: "32. Governing Law",
    content: "This Agreement and any dispute arising out of or in connection with it shall be governed by, and construed in accordance with, the laws of the Republic of India, without regard to its conflicts of law principles.\n\nFor any legal actions or proceedings not subject to the Arbitration clause herein, the courts of New Delhi, India shall have exclusive jurisdiction."
  },
  {
    num: 33,
    title: "33. Arbitration",
    content: "Any dispute, controversy, or claim arising out of, relating to, or in connection with this Agreement, including its existence, validity, interpretation, performance, breach, or termination, shall be referred to and finally resolved by binding arbitration.\n\nThe arbitration shall be conducted in New Delhi, India, in accordance with the Indian Arbitration and Conciliation Act, 1996, as amended. The tribunal shall consist of a sole arbitrator appointed by mutual consent of both parties. The language of the arbitration shall be English, and the arbitral award shall be final and binding on both parties."
  },
  {
    num: 34,
    title: "34. Changes to Terms",
    content: "We reserve the right, at our sole discretion, to modify or replace these Terms of Service at any time. If a revision is material, we will provide at least thirty (30) days' notice by posting a notice in the App or emailing your registered account.\n\nBy continuing to access the App, pair the Device, or view your analytics after those revisions become effective, you agree to be bound by the updated terms. It is your responsibility to review this page periodically for changes."
  },
  {
    num: 35,
    title: "35. Contact Information",
    content: "If you have any questions, concerns, or legal notices regarding these Terms of Service, please contact our legal and compliance node:\n\nCompany Name: PostureCare Spinal Laboratories Private Limited\nSupport Email: support@posturecare.health\nWebsite: posturecare.health\nRegistered Office Address: Connaught Place, New Delhi, 110001, India\n\nThank you for choosing PostureCare. Align your spine, strengthen your back, and live healthy."
  }
];
