import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Phone, User, MapPin, AlertCircle, CheckCircle, Activity, ShieldAlert, Mic, MessageSquare, Send, Globe, X, Settings, History, Navigation, Compass, HeartPulse } from 'lucide-react';
import MapComponent from '../components/MapComponent';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const formatPhoneNumber = (value) => {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  const limited = clean.slice(0, 11);
  if (limited.length > 4) {
    return `${limited.slice(0, 4)}-${limited.slice(4)}`;
  }
  return limited;
};

const translations = {
  en: {
    serviceName: "GWADAR AMBULANCE",
    subtitle: "Ambulance Dispatch System",
    emergencySos: "EMERGENCY SOS",
    voiceMessage: "Send Voice Note",
    textMessage: "Send Message",
    shareLocation: "Send Location",
    callAmbulance: "Call Ambulance: 0335-0267742",
    updateProfile: "Update Profile",
    reqReceived: "Request Received",
    nearestAssigned: "Ambulance Assigned",
    enRoute: "En Route",
    arrived: "Paramedics Reached",
    transporting: "Transporting",
    completed: "Completed",
    details: "Details",
    landmark: "Landmark / Location",
    name: "Patient Name",
    phone: "Contact Number",
    emergencyType: "Emergency Type",
    accident: "Accident / Trauma",
    cardiac: "Cardiac Arrest",
    maternal: "Pregnancy / Maternal",
    respiratory: "Respiratory",
    other: "Other Critical",
    reqNow: "🚨 Request Ambulance",
    placeholderName: "e.g. Abdullah Baloch",
    placeholderPhone: "e.g. 0335-0267742",
    placeholderLandmark: "e.g. Near Indus Hospital, New Town",
    finding: "Locating ambulance...",
    locSelected: "Location Selected",
    tapMap: "Tap map to set pin",
    reset: "Request New Transport",
    voiceTitle: "Send Voice Note",
    textTitle: "Send Text Message",
    simDialing: "Calling control room...",
    voiceRecord: "Tap to record description",
    voiceRecording: "Recording...",
    sendLocSuccess: "Location shared!",
    textPlaceholder: "Describe situation or landmarks...",
    profileTitle: "Profile Settings",
    profileSuccess: "Profile saved successfully!",
    historyTitle: "Request History",
    historyEmpty: "No history found.",
    detectGps: "🎯 Detect My Location",
    gpsDetecting: "Locating...",
    gpsVerified: "GPS Verified",
    presetLocations: "Quick Landmarks:",
    etaLabel: "Estimated Arrival",
    distLabel: "Distance",
    speedLabel: "Speed",
    firstAidTitle: "🩺 First-Aid Guidance",
    chatTitle: "💬 Chat Timeline",
    cprCardiacGuide: "Cardiac First Aid:\n1. Lay the patient flat on their back on a firm surface.\n2. Place hands on center of chest & compress hard and fast (100-120 per minute).\n3. Keep airway open. If trained, deliver 2 rescue breaths after every 30 compressions.\n4. Stay calm, help is approaching.",
    traumaAccidentGuide: "Trauma First Aid:\n1. Apply firm, direct pressure on any bleeding wounds using a clean cloth.\n2. Keep the patient warm and still to prevent medical shock.\n3. Do NOT move the patient if you suspect neck or spinal injuries.\n4. Reassure the patient and talk to them.",
    maternityGuide: "Pregnancy/Maternal Guidance:\n1. Help the patient lie down on their left side to maximize blood flow.\n2. Encourage slow, deep breaths to ease panic.\n3. Support their lower back and keep comfortable cushions nearby.\n4. Keep clean sheets ready. Our paramedic is en route.",
    respiratoryGuide: "Respiratory Distress Guidance:\n1. Sit the patient upright. Do NOT lay them flat as it restricts breathing.\n2. Loosen any tight clothing around the neck or chest.\n3. Keep windows open for maximum fresh ventilation.\n4. Help them use their prescribed inhaler if available.",
    otherGuide: "General Medical Guidance:\n1. Keep the patient comfortable and sitting or lying down.\n2. Monitor their breathing rate and level of consciousness.\n3. Do NOT give them anything to eat or drink.\n4. Note down any medications they have recently taken."
  },
  ur: {
    serviceName: "گوادر ایمبولینس",
    subtitle: "ایمبولینس ڈسپیچ سسٹم",
    emergencySos: "ہنگامی ایس او ایس (SOS)",
    voiceMessage: "صوتی پیغام بھیجیں",
    textMessage: "ٹیکسٹ پیغام بھیجیں",
    shareLocation: "میری لوکیشن بھیجیں",
    callAmbulance: "کال ایمبولینس: 0335-0267742",
    updateProfile: "پروفائل کی ترتیبات تبدیل کریں",
    reqReceived: "درخواست موصول ہو گئی",
    nearestAssigned: "ایمبولینس تفویض ہو گئی",
    enRoute: "راستے میں ہے",
    arrived: "عملہ پہنچ گیا",
    transporting: "ہسپتال منتقلی",
    completed: "مکمل ہو گئی",
    details: "تفصیلات",
    landmark: "جگہ / پتہ",
    name: "مریض کا نام",
    phone: "رابطہ نمبر",
    emergencyType: "ہنگامی حالت",
    accident: "حادثہ / چوٹ",
    cardiac: "دل کا دورہ",
    maternal: "حمل / زچگی",
    respiratory: "سانس کی تکلیف",
    other: "دیگر شدید حالت",
    reqNow: "🚨 ایمبولینس طلب کریں",
    placeholderName: "مثال: عبداللہ بلوچ",
    placeholderPhone: "مثال: 0335-0267742",
    placeholderLandmark: "مثال: فش ہاربر کے قریب، گوادر",
    finding: "ایمبولینس تلاش کی جا رہی ہے...",
    locSelected: "لوکیشن منتخب ہو گئی",
    tapMap: "پن سیٹ کرنے کے لیے نقشے پر کلک کریں",
    reset: "نئی درخواست درج کریں",
    voiceTitle: "صوتی پیغام بھیجیں",
    textTitle: "ٹیکسٹ پیغام بھیجیں",
    simDialing: "کنٹرول روم کو کال کی جا رہی ہے...",
    voiceRecord: "ریکارڈ کرنے کے لیے کلک کریں",
    voiceRecording: "ریکارڈنگ جاری ہے...",
    sendLocSuccess: "لوکیشن شیئر کر دی گئی!",
    textPlaceholder: "حالت اور پتے کی تفصیل لکھیں...",
    profileTitle: "پروفائل کی ترتیبات",
    profileSuccess: "پروفائل کی ترتیبات کامیابی سے محفوظ ہو گئیں!",
    historyTitle: "درخواست کی تاریخ",
    historyEmpty: "کوئی ہسٹری نہیں ملی",
    detectGps: "🎯 اپنی لوکیشن معلوم کریں",
    gpsDetecting: "لوکیشن معلوم کی جا رہی ہے...",
    gpsVerified: "جی پی ایس تصدیق شدہ",
    presetLocations: "مشہور جگہیں:",
    etaLabel: "پہنچنے کا وقت",
    distLabel: "فاصلہ",
    speedLabel: "رفتار",
    firstAidTitle: "🩺 ابتدائی طبی امداد",
    chatTitle: "💬 پیغام رسانی",
    cprCardiacGuide: "دل کے دورے کی امداد:\n1۔ مریض کو سخت اور سیدھی جگہ پر چت لٹائیں۔\n2۔ اپنے ہاتھ سینے کے درمیان رکھ کر تیزی سے دبائیں (منٹ میں 100 سے 120 بار)۔\n3۔ اگر تربیت یافتہ ہیں تو ہر 30 بار دبانے کے بعد 2 سانسیں دیں۔\n4۔ پرسکون رہیں، ایمبولینس آ رہی ہے۔",
    traumaAccidentGuide: "حادثے کی امداد:\n1۔ صاف کپڑے کی مدد سے بہتے ہوئے خون پر مضبوطی سے دباؤ ڈالیں۔\n2۔ مریض کو گرم اور پرسکون رکھیں تاکہ وہ صدمے میں نہ جائے۔\n3۔ گردن یا کمر کی چوٹ کی صورت میں مریض کو ہلانے سے گریز کریں۔\n4۔ مریض سے باتیں کر کے ان کا حوصلہ بڑھائیں۔",
    maternityGuide: "حمل کی ہنگامی حالت:\n1۔ مریضہ کو بائیں کروٹ پر لٹائیں تاکہ خون کا بہاؤ بہتر ہو۔\n2۔ انہیں گہرے اور آہستہ سانس لینے کی ترغیب دیں۔\n3۔ کمر کے نچلے حصے کو سپورٹ دیں اور نرم تکیے پاس رکھیں۔\n4۔ صاف چادریں تیار رکھیں، عملہ پہنچ رہا ہے۔",
    respiratoryGuide: "سانس کی تکلیف:\n1۔ مریض کو سیدھا بٹھائیں۔ انہیں ہرگز سیدھا مت لٹائیں اس سے سانس لینے میں دشواری ہوگی۔\n2۔ گردن اور سینے کے تنگ کپڑے ڈھیلے کر دیں۔\n3۔ تازہ ہوا کے لیے کھڑکیاں کھول دیں۔\n4۔ اگر مریض کے پاس انہیلر ہے تو اس کا استعمال کروائیں۔",
    otherGuide: "عام طبی امداد:\n1۔ مریض کو پرسکون اور آرام دہ حالت میں رکھیں۔\n2۔ ان کے سانس لینے کی رفتار اور ہوش کو چیک کرتے رہیں۔\n3۔ انہیں کھانے یا پینے کے لیے کچھ بھی مت دیں۔\n4۔ مریض کے زیر استعمال ادویات کو نوٹ کر کے رکھیں۔"
  }
};;


const firstAidSteps = {
  en: {
    'Cardiac Arrest': {
      title: "Cardiac Emergency (CPR)",
      color: "#ef4444",
      icon: "❤️",
      dangerAlert: "ACT FAST! Every second counts. Start CPR immediately.",
      steps: [
        { title: "Check Responsiveness", desc: "Tap the shoulders and shout 'Are you okay?'. Check if they are breathing normally." },
        { title: "Call for Help", desc: "Verify that an ambulance has been requested and dispatch is active." },
        { title: "Chest Compressions", desc: "Place hands stacked on the center of the chest. Push hard & fast (2 inches deep).", highlight: "Use the Metronome below to match the correct rhythm (110 compressions/min)." },
        { title: "Rescue Breaths", desc: "Tilt head back, lift chin. Pinch nose & give 2 rescue breaths after every 30 compressions if trained." }
      ],
      interactiveType: "metronome"
    },
    'Accident': {
      title: "Trauma & Hemorrhage Control",
      color: "#f97316",
      icon: "🩹",
      dangerAlert: "Do not move the patient if you suspect spinal/neck trauma unless absolutely necessary.",
      steps: [
        { title: "Control Severe Bleeding", desc: "Apply direct pressure to the wound with a clean cloth, bandage, or bare hand if necessary." },
        { title: "Elevate & Pack", desc: "Elevate the bleeding limb above heart level. Pack deep wounds with clean dressing." },
        { title: "Shock Management", desc: "Keep the patient warm using blankets. Lay them flat and elevate feet 12 inches if no spine injury." },
        { title: "Stabilize Fractures", desc: "Do not attempt to realign bones. Immobilize the limb using a splint or rolled newspapers." }
      ]
    },
    'Maternal': {
      title: "Pregnancy & Emergency Delivery",
      color: "#8b5cf6",
      icon: "🤰",
      dangerAlert: "Support and calm the mother. Keep the environment clean and warm.",
      steps: [
        { title: "Positioning", desc: "Help the mother lie on her left side. This maximizes blood flow to the baby." },
        { title: "Deep Breathing", desc: "Guide her to practice controlled, deep breathing. Use the Breathing Pacer below to manage anxiety." },
        { title: "Clean Environment", desc: "Gather clean towels, sheets, and warm water. Wash hands thoroughly." },
        { title: "Newborn Support", desc: "Once delivered, dry the baby immediately, wrap in warm cloth, and place on mother's chest." }
      ],
      interactiveType: "pacer"
    },
    'Respiratory': {
      title: "Severe Respiratory Distress",
      color: "#0284c7",
      icon: "🫁",
      dangerAlert: "Do NOT force the patient to lie down. This restricts oxygen intake.",
      steps: [
        { title: "Position Upright", desc: "Help the patient sit comfortably in an upright position (tripod stance) to ease lung expansion." },
        { title: "Pursed-Lip Breathing", desc: "Encourage breathing in through the nose and slowly out through pursed lips." },
        { title: "Medication", desc: "Assist them with their prescribed rescue inhaler or nebulizer if available." },
        { title: "Pacer Assistance", desc: "Follow the Breathing Pacer below to reduce hyperventilation and panic." }
      ],
      interactiveType: "pacer"
    },
    'Other': {
      title: "General Critical Emergencies",
      color: "#64748b",
      icon: "🩺",
      dangerAlert: "Do not give the patient anything to eat or drink. Monitor consciousness.",
      steps: [
        { title: "Assess & Monitor", desc: "Check airway, breathing, and pulse. Note if they are responsive, drowsy, or unconscious." },
        { title: "Recovery Position", desc: "If unconscious but breathing, roll them onto their side (recovery position) to keep the airway clear." },
        { title: "Gather History", desc: "Find their ID, note down existing medical conditions, allergies, or medications taken." }
      ]
    }
  },
  ur: {
    'Cardiac Arrest': {
      title: "دل کا دورہ (CPR)",
      color: "#ef4444",
      icon: "❤️",
      dangerAlert: "فوری اقدام کریں! ہر سیکنڈ اہم ہے۔ فوراً سی پی آر (CPR) شروع کریں۔",
      steps: [
        { title: "ہوش و حواس چیک کریں", desc: "کندھوں کو تھپتھپائیں اور پکاریں 'کیا آپ ٹھیک ہیں؟'۔ سانس چیک کریں۔" },
        { title: "مدد کے لیے پکاریں", desc: "یقینی بنائیں کہ ایمبولینس کی درخواست بھیجی جا چکی ہے اور فعال ہے۔" },
        { title: "چھاتی کو دبانا (Compressions)", desc: "ہاتھوں کو چھاتی کے مرکز میں رکھیں۔ 2 انچ گہرا اور تیزی سے دبائیں (منٹ میں 100 سے 120 بار)۔", highlight: "نیچے دیے گئے میٹرونوم کی رفتار کے مطابق دباؤ ڈالیں۔" },
        { title: "بناؤٹی سانسیں", desc: "سر کو پیچھے جھکائیں، تھوڑی اٹھائیں۔ ناک بند کر کے ہر 30 بار دبانے کے بعد 2 سانسیں دیں۔" }
      ],
      interactiveType: "metronome"
    },
    'Accident': {
      title: "چوٹ اور خون بہنا",
      color: "#f97316",
      icon: "🩹",
      dangerAlert: "اگر ریڑھ کی ہڈی یا گردن کی چوٹ کا شبہ ہو تو مریض کو ہرگز حرکت نہ دیں۔",
      steps: [
        { title: "شدید خون بہنا روکیں", desc: "صاف کپڑے یا پٹی سے زخم پر براہ راست دباؤ ڈالیں۔" },
        { title: "زخم کو اونچا کریں", desc: "خون بہنے والے حصے کو دل کی سطح سے اوپر اٹھائیں۔ زخم کو صاف پٹی سے ڈھانپیں۔" },
        { title: "شاک کا علاج", desc: "مریض کو کمبل سے گرم رکھیں۔ سیدھا لٹائیں اور پاؤں 12 انچ اوپر اٹھائیں۔" },
        { title: "ہڈی کا ٹوٹنا", desc: "ہڈی کو سیدھا کرنے کی کوشش نہ کریں۔ لکڑی یا رولڈ اخبار کی مدد سے عضو کو ساکت کریں۔" }
      ]
    },
    'Maternal': {
      title: "حمل اور ہنگامی زچگی",
      color: "#8b5cf6",
      icon: "🤰",
      dangerAlert: "ماں کو تسلی دیں۔ ماحول کو صاف ستھرا اور گرم رکھیں۔",
      steps: [
        { title: "پوزیشننگ", desc: "ماں کو بائیں کروٹ لٹائیں۔ اس سے بچے کو خون کا بہاؤ بہتر ہوتا ہے۔" },
        { title: "گہرے سانس", desc: "انہیں گہرے اور پرسکون سانس لینے کی ہدایت کریں۔ گھبراہٹ کم کرنے کے لیے نیچے بریتھنگ پیسر استعمال کریں۔" },
        { title: "صاف ماحول", desc: "صاف تولیے، چادریں اور گرم پانی تیار کریں۔ ہاتھ اچھی طرح دھوئیں۔" },
        { title: "نوزائیدہ کی دیکھ بھال", desc: "پیدائش کے فوراً بعد بچے کو خشک کریں، گرم کپڑے میں لپیٹیں اور ماں کے سینے پر رکھیں۔" }
      ],
      interactiveType: "pacer"
    },
    'Respiratory': {
      title: "سانس کی شدید تکلیف",
      color: "#0284c7",
      icon: "🫁",
      dangerAlert: "مریض کو زبردستی لیٹنے پر مجبور نہ کریں، اس سے سانس لینے میں مزید رکاوٹ ہوتی ہے۔",
      steps: [
        { title: "سیدھا بٹھائیں", desc: "مریض کو آرام دہ حالت میں سیدھا بٹھائیں تاکہ پھیپھڑوں کو ہوا مل سکے۔" },
        { title: "ہونٹ گول کر کے سانس چھوڑنا", desc: "ناک سے سانس لینے اور ہونٹ گول کر کے آہستہ آہستہ باہر نکالنے کی ترغیب دیں۔" },
        { title: "ادویات", desc: "اگر ان کے پاس تجویز کردہ انہیلر یا نیبولائزر ہے تو استعمال میں مدد کریں۔" },
        { title: "سانس کا پیسر", desc: "گھبراہٹ اور تیز سانس لینے کو کنٹرول کرنے کے لیے نیچے دیے گئے بریتھنگ پیسر کو فالو کریں۔" }
      ],
      interactiveType: "pacer"
    },
    'Other': {
      title: "عام طبی ہنگامی حالات",
      color: "#64748b",
      icon: "🩺",
      dangerAlert: "مریض کو کھانے پینے کے لیے کچھ نہ دیں۔ ان کے ہوش کو مسلسل مانیٹر کریں۔",
      steps: [
        { title: "جائزہ اور نگرانی", desc: "ہوا کی نالی، سانس اور نبض چیک کریں۔ دیکھیں کہ آیا وہ جواب دے رہے ہیں یا بے ہوش ہیں۔" },
        { title: "ریکوری پوزیشن", desc: "اگر مریض بے ہوش ہے لیکن سانس لے رہا ہے، تو انہیں کروٹ کے بل لٹائیں تاکہ ہوا کی نالی صاف رہے۔" },
        { title: "تفصیلات جمع کریں", desc: "شناختی کارڈ تلاش کریں، اور ان کی بیماریاں، الرجی یا لی گئی ادویات نوٹ کریں۔" }
      ]
    }
  }
};

export default function CitizenApp({ token, currentUser, hospitals, ambulances, requests, onNewRequestCreated, lang, setLang, showMapModal, setShowMapModal, showHistoryModal, setShowHistoryModal }) {
  const t = translations[lang];

  // Voice recording simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState(0);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);
  const recordIntervalRef = useRef(null);

  // Real voice recording refs & Base64 storage
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [audioBase64, setAudioBase64] = useState('');

  // Two-way chat input state
  const [chatInput, setChatInput] = useState('');

  // Modal visibility states
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showFirstAidModal, setShowFirstAidModal] = useState(false);
  const [localAdviceType, setLocalAdviceType] = useState('Cardiac Arrest');
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [pacerSeconds, setPacerSeconds] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState({});


  // GPS detection mock simulation
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('checking'); // 'checking' | 'detected' | 'denied' | 'error'
  const [gpsCoords, setGpsCoords] = useState(null);

  // Booking Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(formatPhoneNumber(currentUser?.phone || ''));
  const [emergencyType, setEmergencyType] = useState('Accident');
  const [locationName, setLocationName] = useState('New Town, Gwadar');
  const [userPin, setUserPin] = useState({ latitude: 25.1219, longitude: 62.3254 }); // Centered around Gwadar
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Active request being tracked
  const [activeRequest, setActiveRequest] = useState(null);
  const [assignedAmbulance, setAssignedAmbulance] = useState(null);
  const [socket, setSocket] = useState(null);

  // Sync assignedAmbulance if activeRequest or ambulances change
  useEffect(() => {
    if (activeRequest?.assigned_ambulance_id && ambulances.length > 0) {
      const amb = ambulances.find(a => a.id === activeRequest.assigned_ambulance_id);
      setAssignedAmbulance(amb || null);
    } else {
      setAssignedAmbulance(null);
    }
  }, [activeRequest?.assigned_ambulance_id, ambulances]);

  // Ref to always have the latest activeRequest state inside callbacks
  const activeRequestRef = useRef(activeRequest);
  useEffect(() => {
    activeRequestRef.current = activeRequest;
  }, [activeRequest]);

  // Synchronize userPin with activeRequest coordinates on refresh/load
  useEffect(() => {
    if (activeRequest && activeRequest.latitude && activeRequest.longitude) {
      setUserPin({
        latitude: activeRequest.latitude,
        longitude: activeRequest.longitude
      });
    }
  }, [activeRequest?.id, activeRequest?.latitude, activeRequest?.longitude]);

  // Metronome Beep Player (Web Audio API)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1); // beep lasts 100ms
    } catch (err) {
      console.error(err);
    }
  };

  // Metronome runner (110 BPM)
  useEffect(() => {
    let interval;
    if (metronomeOn && showFirstAidModal && localAdviceType === 'Cardiac Arrest') {
      playBeep();
      interval = setInterval(() => {
        playBeep();
      }, 545); // ~110 BPM
    } else {
      setMetronomeOn(false);
    }
    return () => clearInterval(interval);
  }, [metronomeOn, showFirstAidModal, localAdviceType]);

  // Breathing Pacer runner (12s cycle: 4s inhale, 4s hold, 4s exhale)
  useEffect(() => {
    let interval;
    if (showFirstAidModal && (localAdviceType === 'Maternal' || localAdviceType === 'Respiratory')) {
      interval = setInterval(() => {
        setPacerSeconds(prev => (prev + 1) % 12);
      }, 1000);
    } else {
      setPacerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [showFirstAidModal, localAdviceType]);


  // Simulated Chat Messages State
  const [chatMessages, setChatMessages] = useState([]);

  const detectGps = () => {
    setGpsStatus('checking');
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { latitude, longitude };
        setGpsCoords(coords);
        setUserPin(coords);
        setGpsStatus('detected');
        setLocationName(lang === 'en' ? "Live GPS Location" : "لائیو جی پی ایس لوکیشن");
      },
      (err) => {
        console.warn("GPS high accuracy failed, retrying with low accuracy...", err);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const coords = { latitude, longitude };
            setGpsCoords(coords);
            setUserPin(coords);
            setGpsStatus('detected');
            setLocationName(lang === 'en' ? "Live GPS Location" : "لائیو جی پی ایس لوکیشن");
          },
          (err2) => {
            console.error("GPS detection failed completely:", err2);
            setGpsStatus('denied');
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  };

  useEffect(() => {
    detectGps();
  }, []);

  // Continuous patient GPS watch when dispatch is active
  useEffect(() => {
    if (!activeRequest || !['Assigned', 'En Route', 'Reached Patient'].includes(activeRequest.status)) {
      return;
    }

    console.log("Starting continuous GPS watch for active dispatch...");
    let activeWatchId = null;

    const startWatch = (highAccuracy) => {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Citizen moved. Streaming coordinates:", latitude, longitude);
          fetch(`${BACKEND_URL}/api/requests/${activeRequest.id}/location`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ latitude, longitude })
          })
          .then(res => {
            if (!res.ok) console.error("Failed to stream GPS coordinates");
          })
          .catch(err => console.error("GPS streaming error:", err));
        },
        (err) => {
          console.warn("watchPosition error, retrying with low accuracy...", err);
          if (highAccuracy) {
            navigator.geolocation.clearWatch(id);
            activeWatchId = startWatch(false);
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 3000 : 10000, maximumAge: 0 }
      );
      return id;
    };

    activeWatchId = startWatch(true);

    return () => {
      console.log("Stopping continuous GPS watch...");
      if (activeWatchId !== null) {
        navigator.geolocation.clearWatch(activeWatchId);
      }
    };
  }, [activeRequest?.id, activeRequest?.status, token]);

  const authHeaders = { 'Authorization': `Bearer ${token}` };

  // Sync profile details if currentUser updates
  useEffect(() => {
    if (currentUser) {
      setPhone(formatPhoneNumber(currentUser.phone || ''));
    }
  }, [currentUser]);

  // Load active request from sessionStorage on mount (persistence across refresh)
  useEffect(() => {
    const savedRequestId = sessionStorage.getItem('active_emergency_request_id');
    if (savedRequestId) {
      fetch(`${BACKEND_URL}/api/requests`, { headers: authHeaders })
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          const req = data.find(r => r.id === savedRequestId);
          if (req && req.status !== 'Completed') {
            setActiveRequest(req);
            // Fetch assigned ambulance if exists
            if (req.assigned_ambulance_id) {
              fetch(`${BACKEND_URL}/api/ambulances`, { headers: authHeaders })
                .then(res => res.ok ? res.json() : [])
                .then(ambs => {
                  if (!Array.isArray(ambs)) return;
                  const amb = ambs.find(a => a.id === req.assigned_ambulance_id);
                  setAssignedAmbulance(amb);
                });
            }
          } else {
            sessionStorage.removeItem('active_emergency_request_id');
          }
        })
        .catch(err => console.error("Error loading active request", err));
    }
  }, [token]);

  // WebSockets setup for real-time tracking
  useEffect(() => {
    if (!activeRequest) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Citizen socket connected:', newSocket.id);
      newSocket.emit('join:tracking', activeRequest.id);
      
      // Initialize Chat Welcome Message
      setChatMessages([
        {
          id: 1,
          sender: "dispatcher",
          text: lang === 'en' ? "Emergency request logged. Allocating nearest ambulance." : "ہنگامی درخواست موصول ہو گئی۔ قریبی ایمبولینس تفویض کی جا رہی ہے۔",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    });

    newSocket.on('tracking:updated', (data) => {
      console.log('Real-time tracking update received:', data);
      if (data.request) {
        const oldStatus = activeRequestRef.current?.status;
        setActiveRequest(data.request);
        
        // Dynamic chat responses based on status transitions
        if (data.request.status === 'Assigned' && oldStatus === 'Pending') {
          addDispatcherMessage(lang === 'en' ? "Ambulance assigned (Unit: GWD-7861)." : "ایمبولینس تفویض ہو گئی (یونٹ: GWD-7861)۔");
        } else if (data.request.status === 'En Route' && oldStatus === 'Assigned') {
          addDispatcherMessage(lang === 'en' ? "Ambulance is en route. Track live location on map." : "ایمبولینس روانہ ہو چکی ہے۔ نقشے پر لائیو ٹریک کریں۔");
        } else if (data.request.status === 'Reached Patient' && oldStatus === 'En Route') {
          addDispatcherMessage(lang === 'en' ? "Paramedics have reached your location." : "طبی عملہ آپ کی لوکیشن پر پہنچ چکا ہے۔");
        }

        if (data.request.status === 'Completed') {
          sessionStorage.removeItem('active_emergency_request_id');
          setAssignedAmbulance(null);
        }
      }
      if (data.ambulance) {
        setAssignedAmbulance(data.ambulance);
      }
    });

    newSocket.on('request:updated', (updatedReq) => {
      console.log('Real-time request update received globally:', updatedReq);
      if (activeRequestRef.current && updatedReq.id === activeRequestRef.current.id) {
        const oldStatus = activeRequestRef.current?.status;
        setActiveRequest(updatedReq);

        // Dynamic chat responses based on status transitions
        if (updatedReq.status === 'Assigned' && oldStatus === 'Pending') {
          addDispatcherMessage(lang === 'en' ? "Ambulance assigned (Unit: GWD-7861)." : "ایمبولینس تفویض ہو گئی (یونٹ: GWD-7861)۔");
        } else if (updatedReq.status === 'En Route' && oldStatus === 'Assigned') {
          addDispatcherMessage(lang === 'en' ? "Ambulance is en route. Track live location on map." : "ایمبولینس روانہ ہو چکی ہے۔ نقشے پر لائیو ٹریک کریں۔");
        } else if (updatedReq.status === 'Reached Patient' && oldStatus === 'En Route') {
          addDispatcherMessage(lang === 'en' ? "Paramedics have reached your location." : "طبی عملہ آپ کی لوکیشن پر پہنچ چکا ہے۔");
        }

        if (updatedReq.status === 'Completed') {
          sessionStorage.removeItem('active_emergency_request_id');
          setAssignedAmbulance(null);
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [activeRequest?.id, lang]);

  const addDispatcherMessage = (text) => {
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: "dispatcher",
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleMapClick = (coords) => {
    if (!activeRequest) {
      setUserPin(coords);
    }
  };


  const handleBooking = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim() || !phone.trim() || !locationName.trim()) {
      setError(lang === 'en' ? 'Please fill in all details.' : 'براہ کرم تمام معلومات فراہم کریں۔');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          citizen_name: name,
          citizen_phone: phone,
          emergency_type: emergencyType,
          latitude: userPin.latitude,
          longitude: userPin.longitude,
          location_name: locationName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit request.');
      }

      const newReq = await response.json();
      setActiveRequest(newReq);
      sessionStorage.setItem('active_emergency_request_id', newReq.id);
      if (onNewRequestCreated) onNewRequestCreated(newReq);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real GPS detector
  const handleGpsDetect = () => {
    detectGps();
  };


  // Real voice recording handlers using browser APIs
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioBase64(reader.result);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceNoteDuration(0);
      setHasVoiceNote(false);
      recordIntervalRef.current = setInterval(() => {
        setVoiceNoteDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert(lang === 'en' ? "Microphone permission denied or not supported." : "مائیکروفون تک رسائی کی اجازت نہیں ہے۔");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordIntervalRef.current);
      setHasVoiceNote(true);
    }
  };

  const handleSendVoice = async () => {
    if (!audioBase64) return;

    if (activeRequest) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/requests/${activeRequest.id}/voice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ voice_base64: audioBase64 })
        });
        if (response.ok) {
          alert(lang === 'en' ? "Voice message sent successfully to control room!" : "صوتی پیغام گوادر کنٹرول روم کو بھیج دیا گیا ہے!");
          setHasVoiceNote(false);
          setVoiceNoteDuration(0);
          setAudioBase64('');
        }
      } catch (err) {
        console.error("Error sending voice message:", err);
      }
    }
  };

  const sendChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !socket || !activeRequest) return;

    socket.emit('chat:send-message', {
      requestId: activeRequest.id,
      sender: 'user',
      text: chatInput.trim()
    });

    setChatInput('');
  };

  const handleCitizenVerify = async (agreement) => {
    if (!activeRequest) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/requests/${activeRequest.id}/citizen-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agreement })
      });
      if (response.ok) {
        const updatedReq = await response.json();
        setActiveRequest(updatedReq);
      }
    } catch (err) {
      console.error("Verification submit failed:", err);
    }
  };

  const handleReset = () => {
    setActiveRequest(null);
    setAssignedAmbulance(null);
    setName('');
    setPhone(formatPhoneNumber(currentUser?.phone || ''));
    setLocationName('New Town, Gwadar');
    setUserPin({ latitude: 25.1219, longitude: 62.3254 });
    setChatMessages([]);
  };

  const getStatusStep = () => {
    if (!activeRequest) return 0;
    switch (activeRequest.status) {
      case 'Pending': return 1;
      case 'Assigned': return 2;
      case 'En Route': return 3;
      case 'Reached Patient': return 4;
      case 'At Hospital': return 5;
      case 'Completed - Awaiting Verification': return 6;
      case 'Completed': return 7;
      default: return 0;
    }
  };

  const currentStep = getStatusStep();

  // Dynamic First-Aid advice builder based on emergency type
  const getFirstAidAdvice = () => {
    if (!activeRequest) return '';
    switch (activeRequest.emergency_type) {
      case 'Cardiac Arrest': return t.cprCardiacGuide;
      case 'Accident': return t.traumaAccidentGuide;
      case 'Maternal': return t.maternityGuide;
      case 'Respiratory': return t.respiratoryGuide;
      default: return t.otherGuide;
    }
  };

  // Haversine calculation for tracking stats
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const remainingDist = activeRequest && assignedAmbulance 
    ? getDistance(activeRequest.latitude, activeRequest.longitude, assignedAmbulance.latitude, assignedAmbulance.longitude)
    : 0;

  // ETA Calculation (Distance / Avg Speed of 50 km/h) converted to minutes
  const etaMinutes = remainingDist > 0 ? Math.ceil((remainingDist / 50) * 60) : 0;

  const historyRequests = requests.filter(r => r.status === 'Completed' || r.status === 'Completed - Awaiting Verification');

  return (
    <div className="view-container" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      


      {!activeRequest ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Main Home Dashboard Hero */}
          <div className="glass-panel" style={{ 
            padding: '3rem 2rem', 
            borderRadius: '24px', 
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.75rem',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Pulsing decorative background indicator */}
            <div style={{
              position: 'absolute', top: '-10%', right: '-10%', width: '120px', height: '120px',
              borderRadius: '50%', background: 'rgba(239, 68, 68, 0.05)', filter: 'blur(30px)'
            }} />


            {/* Big Action Buttons Row */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '1rem',
              width: '100%',
              maxWidth: '450px',
              marginTop: '0.5rem'
            }}>
              {/* Button 1: Request Ambulance Form Modal trigger */}
              <button
                onClick={() => setShowRequestForm(true)}
                className="btn btn-danger pulse-red-glow"
                style={{
                  padding: '1.25rem 2rem',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  background: '#ef4444',
                  color: 'white'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(239, 68, 68, 0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.3)'; }}
              >
                <span style={{ fontSize: '1.6rem' }}>🚨</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: '"Outfit", sans-serif' }}>
                    {lang === 'en' ? 'Request Ambulance Now' : 'ابھی ایمبولینس طلب کریں'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    {lang === 'en' ? 'Tap to open emergency SOS booking form' : 'ہنگامی امداد کے لیے فارم کھولیں'}
                  </div>
                </div>
              </button>

              {/* Call Hotline Button */}
              <a
                href="tel:03350267742"
                className="btn btn-primary pulse-blue-glow"
                style={{
                  padding: '1.25rem 2rem',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 10px 25px rgba(2, 132, 199, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  background: 'var(--primary-blue)',
                  color: 'white',
                  textDecoration: 'none'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(2, 132, 199, 0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(2, 132, 199, 0.3)'; }}
              >
                <span style={{ fontSize: '1.6rem' }}>📞</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: '"Outfit", sans-serif' }}>
                    {lang === 'en' ? 'Call Ambulance Hotline' : 'کال ایمبولینس ہاٹ لائن'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    {lang === 'en' ? 'Tap to call 0335-0267742 directly' : 'براہ راست 0267742-0335 پر کال کریں'}
                  </div>
                </div>
              </a>

              {/* Button 3: First Aid Modal trigger */}
              <button
                onClick={() => setShowFirstAidModal(true)}
                className="btn btn-success pulse-green-glow"
                style={{
                  padding: '1.25rem 2rem',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 10px 25px rgba(22, 163, 74, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  background: 'var(--primary-green)',
                  color: 'white'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(22, 163, 74, 0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(22, 163, 74, 0.3)'; }}
              >
                <span style={{ fontSize: '1.6rem' }}>🩺</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: '"Outfit", sans-serif' }}>
                    {lang === 'en' ? 'View First-Aid Guide' : 'ابتدائی طبی امداد کی گائیڈ'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                    {lang === 'en' ? 'Learn life-saving medical procedures' : 'زندگی بچانے کے لیے طبی طریقے سیکھیں'}
                  </div>
                </div>
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Active Tracking Screen Layout */
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1.5rem',
          alignItems: 'stretch'
        }}>
          
          {/* Left Panel: ETA & Timeline & Guidance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Tracking Status */}
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--primary-red)', margin: 0 }}>
                  ✚ {lang === 'en' ? 'Live Tracker' : 'لائیو ٹریکر'}
                </h2>
                <span className="badge badge-red pulse-red-glow" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>{activeRequest.status}</span>
              </div>

              {activeRequest.status === 'Completed - Awaiting Verification' && (
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.05)', 
                  border: '1px solid rgba(59, 130, 246, 0.15)', 
                  borderRadius: '8px', 
                  padding: '0.85rem', 
                  marginBottom: '0.85rem',
                  fontSize: '0.82rem',
                  lineHeight: '1.4'
                }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--primary-blue)' }}>
                    {lang === 'en' ? "Verify Delivery Completion" : "ڈلیوری کی تصدیق کریں"}
                  </p>
                  <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)' }}>
                    {lang === 'en' 
                      ? "The driver has claimed you were delivered safely to the hospital. Do you agree that the trip is complete?" 
                      : "ڈرائیور نے دعویٰ کیا ہے کہ آپ کو ہسپتال پہنچا دیا گیا ہے۔ کیا آپ اس بات سے متفق ہیں کہ سفر مکمل ہو گیا ہے؟"}
                  </p>

                  {activeRequest.citizen_agreement === undefined || activeRequest.citizen_agreement === null ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleCitizenVerify('Agreed')}
                        className="btn btn-success"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', fontWeight: 'bold', borderRadius: '6px' }}
                      >
                        👍 {lang === 'en' ? "Agree" : "متفق ہوں"}
                      </button>
                      <button
                        onClick={() => handleCitizenVerify('Disputed')}
                        className="btn btn-danger"
                        style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', fontWeight: 'bold', borderRadius: '6px' }}
                      >
                        👎 {lang === 'en' ? "Disagree" : "غیر متفق"}
                      </button>
                    </div>
                  ) : (
                    <div style={{ 
                      fontWeight: 'bold', 
                      color: activeRequest.citizen_agreement === 'Agreed' ? 'var(--primary-green)' : 'var(--primary-red)',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>{activeRequest.citizen_agreement === 'Agreed' ? '✅' : '⚠️'}</span>
                      {activeRequest.citizen_agreement === 'Agreed' 
                        ? (lang === 'en' ? "You verified completion. Awaiting dispatcher archive." : "آپ نے سفر مکمل ہونے کی تصدیق کی ہے۔")
                        : (lang === 'en' ? "Disagreement registered. Dispatcher will review and resolve." : "اختلاف رجسٹرڈ ہو گیا۔ ڈسپیچر جائزہ لے گا۔")}
                    </div>
                  )}
                </div>
              )}

              {/* ETA & Distance */}
              {assignedAmbulance && (activeRequest.status === 'Assigned' || activeRequest.status === 'En Route') && (
                <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-red)', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <Navigation size={14} className="pulse-icon" /> {t.etaLabel}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {etaMinutes > 0 ? `${etaMinutes} mins` : "Approaching..."}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    <span>{t.distLabel}: <b>{remainingDist.toFixed(2)} km</b></span>
                    <span>{t.speedLabel}: <b>50 km/h</b></span>
                  </div>
                </div>
              )}

              {/* Stepper Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.5rem 0' }}>
                {[
                  { key: 1, label: t.reqReceived },
                  { key: 2, label: t.nearestAssigned },
                  { key: 3, label: t.enRoute },
                  { key: 4, label: t.arrived },
                  { key: 5, label: t.transporting },
                  { key: 6, label: lang === 'en' ? 'Transport Completed' : 'نقل و حمل مکمل' }
                ].map(step => (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: currentStep >= step.key ? (step.key === 6 ? '#22c55e' : 'var(--primary-green)') : 'rgba(0,0,0,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: 'bold', color: currentStep >= step.key ? 'white' : 'var(--text-secondary)'
                    }}>
                      {currentStep > step.key ? '✓' : step.key}
                    </div>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: currentStep === step.key ? 'bold' : 'normal', 
                      color: currentStep >= step.key ? (step.key === 6 ? '#15803d' : 'var(--text-primary)') : 'var(--text-muted)' 
                    }}>
                      {step.label}
                      {currentStep === step.key && step.key < 6 && (
                        <span style={{ marginLeft: '0.35rem', fontSize: '0.6rem', background: 'var(--primary-red)', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700 }}>LIVE</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Responder Info */}
              {assignedAmbulance ? (
                <div style={{ padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--primary-green)', backgroundColor: '#f8fafc', marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {assignedAmbulance.photo ? (
                      <img 
                        src={assignedAmbulance.photo} 
                        alt="Ambulance" 
                        style={{ width: '80px', height: '60px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: '80px', height: '60px', borderRadius: '6px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        🚑
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 'bold', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Driver: {assignedAmbulance.driver_name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0.25rem 0' }}>
                        Vehicle: <b>{assignedAmbulance.vehicle_number}</b>
                      </p>
                      {assignedAmbulance.model && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0 0.25rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Model: <b>{assignedAmbulance.model}</b>
                        </p>
                      )}
                      <a href={`tel:${assignedAmbulance.driver_phone}`} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)' }}>
                        📞 Call Driver
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--primary-orange)', display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: '#f8fafc', marginTop: '0.75rem' }}>
                  <div className="pulse-icon" style={{ fontSize: '1.2rem' }}>⌛</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{t.finding}</div>
                </div>
              )}

              <button onClick={handleReset} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.75rem', padding: '0.4rem', fontSize: '0.8rem' }}>
                {t.reset}
              </button>
            </div>

            {/* Compact First Aid Guidance */}
            <div className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'white' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-red)', marginBottom: '0.4rem' }}>
                <HeartPulse size={14} className="pulse-icon" /> {t.firstAidTitle}
              </h3>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-secondary)', 
                whiteSpace: 'pre-line', 
                lineHeight: '1.4',
                background: '#fafafa',
                padding: '0.6rem',
                borderRadius: '6px',
                borderLeft: '2px solid var(--primary-blue)'
              }}>
                {getFirstAidAdvice()}
              </div>
            </div>

          </div>

          {/* Right Panel: Map & Chat Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Map Container */}
            <div className="glass-panel" style={{ borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '420px', position: 'relative' }}>
              {/* Map title bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  🗺️ {lang === 'en' ? 'Live Tracking Map' : 'لائیو ٹریکنگ نقشہ'}
                  <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>● LIVE</span>
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  {lang === 'en' ? 'Tap ⛶ to expand' : 'بڑا کرنے کے لیے ⛶ دبائیں'}
                </span>
              </div>
              {/* Map fills remaining space — no overflow:hidden so expand button works */}
              <div style={{ flex: 1, position: 'relative' }}>
                <MapComponent
                  ambulances={assignedAmbulance ? [assignedAmbulance] : ambulances}
                  requests={[activeRequest]}
                  hospitals={hospitals}
                  selectedRequestId={activeRequest.id}
                  showRoutes={true}
                  isCitizen={true}
                  userPin={userPin}
                  onMapClick={(coords) => {
                    if (activeRequest) {
                      console.log("Citizen clicked map during tracking, updating location manually:", coords);
                      fetch(`${BACKEND_URL}/api/requests/${activeRequest.id}/location`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude })
                      })
                      .then(res => {
                        if (res.ok) {
                          res.json().then(updatedReq => {
                            setActiveRequest(updatedReq);
                          });
                        }
                      })
                      .catch(err => console.error("Failed to update citizen location:", err));
                    }
                  }}
                />
              </div>
            </div>

            {/* Chat & Reassurance Panel with Inline Voice Note Recorder */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'white', display: 'flex', flexDirection: 'column', height: '280px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-blue)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                <MessageSquare size={14} /> {t.chatTitle}
              </h3>
              
              {/* Chat Messages */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem', marginBottom: '0.4rem' }}>
                {(() => {
                  const displayChatMessages = [
                    ...(activeRequest?.chat_history ? activeRequest.chat_history.map(c => ({
                      id: c.id,
                      sender: c.sender,
                      text: c.text,
                      time: new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    })) : []),
                    ...chatMessages.filter(m => m.sender === 'dispatcher' && !activeRequest?.chat_history?.some(c => c.text === m.text))
                  ];

                  return displayChatMessages.map(msg => (
                    <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div style={{ 
                        background: msg.sender === 'user' ? 'var(--primary-blue)' : '#f1f5f9',
                        color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        lineHeight: '1.3'
                      }}>
                        {msg.text}
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.1rem', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                        {msg.time}
                      </span>
                    </div>
                  ));
                })()}
              </div>

              {/* Chat Input Area (Inline Text + Voice Recorder) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {hasVoiceNote && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    background: 'rgba(22, 163, 74, 0.06)', 
                    border: '1px solid rgba(22, 163, 74, 0.15)', 
                    borderRadius: '6px', 
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.75rem',
                    color: 'var(--primary-green)'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      🎙️ {lang === 'en' ? `Voice Note (${voiceNoteDuration}s)` : `صوتی پیغام (${voiceNoteDuration}s)`}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button 
                        onClick={handleSendVoice} 
                        className="btn btn-success" 
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px' }}
                      >
                        {lang === 'en' ? 'Send' : 'بھیجیں'}
                      </button>
                      <button 
                        onClick={() => {
                          setHasVoiceNote(false);
                          setVoiceNoteDuration(0);
                          setAudioBase64('');
                        }} 
                        className="btn" 
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px', background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }}
                      >
                        {lang === 'en' ? 'Cancel' : 'منسوخ'}
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem' }}>
                  {isRecording ? (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      background: 'rgba(239, 68, 68, 0.06)', 
                      border: '1px solid rgba(239, 68, 68, 0.15)', 
                      borderRadius: '6px', 
                      padding: '0.35rem 0.6rem',
                      fontSize: '0.75rem',
                      color: 'var(--primary-red)'
                    }}>
                      <span className="pulse-icon" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}>
                        🔴 {lang === 'en' ? 'Recording...' : 'ریکارڈنگ...'} ({voiceNoteDuration}s)
                      </span>
                      <button 
                        type="button" 
                        onClick={stopRecording} 
                        className="btn btn-danger" 
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px' }}
                      >
                        {lang === 'en' ? 'Stop' : 'روکیں'}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Microphone Toggle Button */}
                      <button 
                        type="button" 
                        onClick={startRecording} 
                        className="btn" 
                        style={{ 
                          padding: 0, 
                          borderRadius: '50%', 
                          background: 'rgba(0, 0, 0, 0.04)', 
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px'
                        }}
                        title={t.voiceMessage}
                      >
                        <Mic size={14} />
                      </button>

                      {/* Text Field */}
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', marginBottom: 0, flex: 1 }} 
                        placeholder={lang === 'en' ? "Type message..." : "پیغام لکھیں..."} 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)} 
                        disabled={hasVoiceNote}
                      />

                      {/* Send Button */}
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ 
                          padding: 0, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px' 
                        }} 
                        disabled={!chatInput.trim() || hasVoiceNote}
                      >
                        <Send size={12} />
                      </button>
                    </>
                  )}
                </form>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Modal: Request Ambulance Form */}
      {showRequestForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            boxShadow: 'var(--shadow-2xl)',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setShowRequestForm(false)}
              style={{
                position: 'absolute', right: '1.25rem', top: '1.25rem',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                transition: 'background 0.2s', zIndex: 100
              }}
              onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
              onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
            >
              ✕
            </button>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🚨 {lang === 'en' ? 'Request Ambulance' : 'ایمبولینس درخواست'}
              </h2>
            </div>

            {error && <div className="alert-banner alert-banner-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}>{error}</div>}

            <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t.name}</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
                    placeholder={t.placeholderName} 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t.phone}</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
                    placeholder={t.placeholderPhone} 
                    value={phone} 
                    onChange={e => setPhone(formatPhoneNumber(e.target.value))} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t.emergencyType}</label>
                <select 
                  className="form-input" 
                  value={emergencyType} 
                  onChange={e => setEmergencyType(e.target.value)} 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <option value="Accident">{t.accident}</option>
                  <option value="Cardiac Arrest">{t.cardiac}</option>
                  <option value="Maternal">{t.maternal}</option>
                  <option value="Respiratory">{t.respiratory}</option>
                  <option value="Other">{t.other}</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{t.landmark}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
                  placeholder={t.placeholderLandmark} 
                  value={locationName} 
                  onChange={e => setLocationName(e.target.value)} 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--primary-blue)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    cursor: 'pointer',
                    width: '100%',
                    marginTop: '0.4rem'
                  }}
                >
                  🗺️ {lang === 'en' ? 'Select Location on Map' : 'نقشے پر لوکیشن منتخب کریں'}
                </button>
              </div>

              {/* GPS and Location Status Banner */}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {gpsStatus === 'checking' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--primary-blue)', fontSize: '0.8rem', padding: '0.4rem', fontWeight: 600 }}>
                    <div className="pulse-icon">📡</div>
                    <span>Verifying GPS Coordinates...</span>
                  </div>
                )}

                {gpsStatus === 'detected' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(22, 163, 74, 0.05)', border: '1px solid rgba(22, 163, 74, 0.15)', borderRadius: '6px', padding: '0.5rem', color: 'var(--primary-green)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <span>🛰️</span> {t.gpsVerified}
                  </div>
                )}

                {(gpsStatus === 'denied' || gpsStatus === 'error') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '0.5rem', borderRadius: '6px', color: 'var(--primary-red)', fontSize: '0.75rem', fontWeight: 'bold', lineHeight: '1.4' }}>
                      <span>⚠️</span> GPS Location Required. Please allow location access. Note: Secure context (HTTPS or localhost) is required for browser GPS to function.
                    </div>
                    <button
                      type="button"
                      onClick={handleGpsDetect}
                      className="btn btn-primary"
                      style={{ 
                        width: '100%', 
                        padding: '0.4rem 0.8rem', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>🔄</span> Retry GPS Detection
                    </button>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-danger pulse-red-glow" 
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  fontSize: '1.05rem', 
                  fontWeight: '800', 
                  borderRadius: '8px', 
                  marginTop: '0.25rem',
                  boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' 
                }} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending Alert...' : t.reqNow}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: First Aid Guidance */}
      {showFirstAidModal && (() => {
        const guideData = firstAidSteps[lang]?.[localAdviceType] || firstAidSteps['en']?.[localAdviceType] || { title: "", steps: [], color: "#64748b" };
        return (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{
              background: 'white',
              padding: '1.75rem',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '620px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              position: 'relative',
              boxShadow: 'var(--shadow-2xl)',
              border: '1px solid var(--border-color)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <button
                onClick={() => {
                  setMetronomeOn(false);
                  setShowFirstAidModal(false);
                }}
                style={{
                  position: 'absolute', right: '1.25rem', top: '1.25rem',
                  background: '#f1f5f9', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                  transition: 'background 0.2s', zIndex: 100
                }}
                onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
              >
                ✕
              </button>
              
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontFamily: '"Outfit", sans-serif' }}>
                <HeartPulse size={24} style={{ color: 'var(--primary-red)' }} />
                {t.firstAidTitle}
              </h3>
              
              <div style={{ padding: '0.25rem 0 0 0', borderTop: '1px solid var(--border-color)' }}>
                {/* Horizontal Navigation Tabs */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem', marginTop: '0.5rem' }}>
                  {['Cardiac Arrest', 'Accident', 'Maternal', 'Respiratory', 'Other'].map(type => {
                    const stepItem = firstAidSteps['en'][type];
                    const isSelected = localAdviceType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setMetronomeOn(false);
                          setLocalAdviceType(type);
                        }}
                        className="btn"
                        style={{ 
                          padding: '0.4rem 0.8rem', 
                          fontSize: '0.75rem', 
                          borderRadius: '15px',
                          background: isSelected ? stepItem.color : '#f1f5f9',
                          color: isSelected ? 'white' : 'var(--text-secondary)',
                          border: '1px solid rgba(0,0,0,0.05)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ marginRight: '0.2rem' }}>{stepItem.icon}</span>
                        {type === 'Cardiac Arrest' ? t.cardiac : type === 'Accident' ? t.accident : type === 'Maternal' ? t.maternal : type === 'Respiratory' ? t.respiratory : t.other}
                      </button>
                    );
                  })}
                </div>
                
                {/* Alert banner for high risk emergencies */}
                {guideData.dangerAlert && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#b91c1c',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    marginBottom: '1rem'
                  }}>
                    <span>⚠️</span>
                    <span>{guideData.dangerAlert}</span>
                  </div>
                )}

                {/* Steps List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.2rem', marginBottom: '1.25rem' }}>
                  {guideData.steps.map((step, idx) => {
                    const stepKey = `${localAdviceType}-${idx}`;
                    const isChecked = !!checkedSteps[stepKey];
                    return (
                      <div 
                        key={idx} 
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'flex-start',
                          background: isChecked ? 'rgba(241, 245, 249, 0.5)' : '#f8fafc',
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          borderLeft: `4px solid ${isChecked ? '#16a34a' : guideData.color}`,
                          transition: 'all 0.2s ease',
                          opacity: isChecked ? 0.7 : 1
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setCheckedSteps(prev => ({
                              ...prev,
                              [stepKey]: e.target.checked
                            }));
                          }}
                          style={{
                            marginTop: '0.15rem',
                            width: '15px',
                            height: '15px',
                            cursor: 'pointer',
                            accentColor: '#16a34a'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                            {idx + 1}. {step.title}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem', lineHeight: '1.4' }}>
                            {step.desc}
                          </div>
                          {step.highlight && (
                            <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <span>ℹ️</span> {step.highlight}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CPR Metronome Interactive Panel */}
                {guideData.interactiveType === 'metronome' && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.03)',
                    border: '1px solid rgba(239, 68, 68, 0.12)',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                      ⏱️ CPR COMPRESSION pace metronome (110 BPM)
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div 
                        className={metronomeOn ? "cpr-pulse-active" : ""}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1.1rem',
                          boxShadow: '0 3px 8px rgba(239, 68, 68, 0.25)'
                        }}
                      >
                        ❤️
                      </div>
                      
                      <button
                        onClick={() => setMetronomeOn(!metronomeOn)}
                        className="btn"
                        style={{
                          padding: '0.45rem 1.1rem',
                          borderRadius: '20px',
                          background: metronomeOn ? '#334155' : '#ef4444',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        {metronomeOn 
                          ? (lang === 'en' ? 'Stop Metronome' : 'میٹرونوم بند کریں')
                          : (lang === 'en' ? 'Start Metronome' : 'میٹرونوم شروع کریں')
                        }
                      </button>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                      {lang === 'en' 
                        ? "Push down on the chest exactly in sync with the heart beats/beeps." 
                        : "دھڑکن/بیپ کی رفتار کے مطابق مریض کے سینے پر دباؤ ڈالیں۔"
                      }
                    </div>
                  </div>
                )}

                {/* Breathing Calming Pacer Panel */}
                {guideData.interactiveType === 'pacer' && (
                  <div style={{
                    background: 'rgba(2, 132, 199, 0.03)',
                    border: '1px solid rgba(2, 132, 199, 0.12)',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                      🫁 EMERGENCY DEEP BREATHING PACER
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', height: '50px' }}>
                      <div 
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1rem',
                          boxShadow: '0 3px 8px rgba(2, 132, 199, 0.25)',
                          transition: 'transform 1s ease-in-out, background-color 1s ease-in-out',
                          transform: pacerSeconds < 4 ? 'scale(1.2)' : pacerSeconds < 8 ? 'scale(1.2)' : 'scale(0.85)',
                          background: pacerSeconds < 4 ? '#0284c7' : pacerSeconds < 8 ? '#0369a1' : '#0ea5e9'
                        }}
                      >
                        🫁
                      </div>
                      
                      <div style={{ textAlign: 'left', minWidth: '160px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0284c7' }}>
                          {pacerSeconds < 4 
                            ? (lang === 'en' ? 'IN HALE...' : 'سانس اندر لے جائیں...') 
                            : pacerSeconds < 8 
                              ? (lang === 'en' ? 'HOLD...' : 'سانس روکیں...') 
                              : (lang === 'en' ? 'EXHALE...' : 'سانس باہر نکالیں...')
                          }
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                          {lang === 'en' ? 'Follow the icon expansion' : 'آئیکن کی حرکت کے مطابق سانس لیں'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button
                  onClick={() => {
                    setMetronomeOn(false);
                    setShowFirstAidModal(false);
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.5rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {lang === 'en' ? 'Close' : 'بند کریں'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Map Pin Selector */}
      {showMapModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            boxShadow: 'var(--shadow-2xl)',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setShowMapModal(false)}
              style={{
                position: 'absolute', right: '1.25rem', top: '1.25rem',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                zIndex: 1000,
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
              onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
            >
              ✕
            </button>
            
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              🗺️ {lang === 'en' ? 'Select Location on Map' : 'نقشے پر لوکیشن منتخب کریں'}
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-blue)' }}>
                📍 {t.locSelected}
              </span>
              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {userPin.latitude.toFixed(5)}, {userPin.longitude.toFixed(5)}
              </span>
            </div>
            
            <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', position: 'relative' }}>
              <MapComponent
                ambulances={ambulances}
                hospitals={hospitals}
                userPin={userPin}
                onMapClick={handleMapClick}
                showRoutes={false}
                isCitizen={true}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t.tapMap}
              </span>
              <button
                onClick={() => setShowMapModal(false)}
                className="btn btn-primary"
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {lang === 'en' ? 'Confirm Location' : 'لوکیشن کنفرم کریں'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request History (opened from Settings) */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowHistoryModal(false)}
              style={{
                position: 'absolute', right: '1.25rem', top: '1.25rem',
                background: '#f1f5f9', border: 'none', borderRadius: '50%',
                width: '34px', height: '34px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem',
                transition: 'background 0.2s', zIndex: 100
              }}
              onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
              onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontFamily: '"Outfit", sans-serif' }}>
                📋 {lang === 'en' ? 'Request History' : 'درخواستوں کی تاریخ'}
              </h2>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {lang === 'en' ? `${historyRequests.length} completed request(s) found` : `${historyRequests.length} مکمل شدہ درخواستیں ملیں`}
              </p>
            </div>

            {/* History List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {historyRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '16px', background: '#f8fafc' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>📭</span>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>
                    {lang === 'en' ? 'No previous ambulance requests found.' : 'کوئی سابقہ درخواست نہیں ملی۔'}
                  </p>
                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem' }}>
                    {lang === 'en' ? 'Your past requests will appear here once completed.' : 'آپ کی مکمل شدہ درخواستیں یہاں نظر آئیں گی۔'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {historyRequests.map(req => (
                    <div key={req.id} style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '14px',
                      padding: '1.1rem',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                    className="history-card"
                    >
                      {/* Emergency Type + Date */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          background: req.emergency_type === 'Cardiac Arrest' ? 'rgba(239,68,68,0.1)' : req.emergency_type === 'Accident' ? 'rgba(245,158,11,0.1)' : req.emergency_type === 'Maternal' ? 'rgba(168,85,247,0.1)' : 'rgba(2,132,199,0.1)',
                          color: req.emergency_type === 'Cardiac Arrest' ? '#ef4444' : req.emergency_type === 'Accident' ? '#f59e0b' : req.emergency_type === 'Maternal' ? '#a855f7' : '#0284c7',
                          border: '1px solid currentColor',
                          borderColor: req.emergency_type === 'Cardiac Arrest' ? 'rgba(239,68,68,0.25)' : req.emergency_type === 'Accident' ? 'rgba(245,158,11,0.25)' : req.emergency_type === 'Maternal' ? 'rgba(168,85,247,0.25)' : 'rgba(2,132,199,0.25)'
                        }}>
                          {req.emergency_type}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                          {new Date(req.created_at || req.time || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Name */}
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        👤 {req.citizen_name}
                      </div>

                      {/* Location */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.3rem', alignItems: 'flex-start', lineHeight: '1.4' }}>
                        <span>📍</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {req.location_name}
                        </span>
                      </div>

                      {/* Status Footer */}
                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.6rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                        <span style={{
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          color: req.status === 'Completed' ? '#16a34a' : '#f59e0b'
                        }}>
                          {req.status === 'Completed' ? '✅' : '⏳'}
                          {req.status === 'Completed' ? (lang === 'en' ? 'Completed' : 'مکمل') : (lang === 'en' ? 'Awaiting Verification' : 'تصدیق کا انتظار')}
                        </span>
                        {req.citizen_agreement ? (
                          <span style={{
                            fontWeight: 800,
                            color: req.citizen_agreement === 'Agreed' ? '#16a34a' : '#ef4444',
                            background: req.citizen_agreement === 'Agreed' ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: req.citizen_agreement === 'Agreed' ? '1px solid rgba(22,163,74,0.2)' : '1px solid rgba(239,68,68,0.2)'
                          }}>
                            {req.citizen_agreement === 'Agreed' ? '👍 Verified' : '👎 Disputed'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {lang === 'en' ? 'Unverified' : 'غیر تصدیق شدہ'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.75rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {lang === 'en' ? 'Close' : 'بند کریں'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
