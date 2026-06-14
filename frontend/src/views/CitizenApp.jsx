import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Phone, User, MapPin, AlertCircle, CheckCircle, Activity, ShieldAlert, Mic, MessageSquare, Send, Globe, X, Settings, History, Navigation, Compass, HeartPulse } from 'lucide-react';
import MapComponent from '../components/MapComponent';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

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
    placeholderLandmark: "e.g. Near GDA Hospital, New Town",
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


export default function CitizenApp({ token, currentUser, hospitals, ambulances, requests, onNewRequestCreated }) {
  const [lang, setLang] = useState('en');
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

  // Collapsible accordion drawer states
  const [showHistory, setShowHistory] = useState(false);
  const [showFirstAid, setShowFirstAid] = useState(false);
  const [localAdviceType, setLocalAdviceType] = useState('Cardiac Arrest');

  // GPS detection mock simulation
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('checking'); // 'checking' | 'detected' | 'denied' | 'error'
  const [gpsCoords, setGpsCoords] = useState(null);

  // Booking Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [emergencyType, setEmergencyType] = useState('Accident');
  const [locationName, setLocationName] = useState('New Town, Gwadar');
  const [userPin, setUserPin] = useState({ latitude: 25.1219, longitude: 62.3254 }); // Centered around Gwadar
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Active request being tracked
  const [activeRequest, setActiveRequest] = useState(null);
  const [assignedAmbulance, setAssignedAmbulance] = useState(null);
  const [socket, setSocket] = useState(null);

  // Ref to always have the latest activeRequest state inside callbacks
  const activeRequestRef = useRef(activeRequest);
  useEffect(() => {
    activeRequestRef.current = activeRequest;
  }, [activeRequest]);

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
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setGpsCoords(coords);
        setUserPin(coords);
        setGpsStatus('detected');
        setLocationName(lang === 'en' ? "Live GPS Location" : "لائیو جی پی ایس لوکیشن");
      },
      (err) => {
        console.error("GPS detection error:", err);
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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
    const watchId = navigator.geolocation.watchPosition(
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
      (err) => console.error("watchPosition error:", err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      console.log("Stopping continuous GPS watch...");
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activeRequest?.id, activeRequest?.status, token]);

  const authHeaders = { 'Authorization': `Bearer ${token}` };

  // Sync profile details if currentUser updates
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone);
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
    setName(currentUser?.name || '');
    setPhone(currentUser?.phone || '');
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

  const historyRequests = requests.filter(r => r.status === 'Completed');

  return (
    <div className="view-container" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Thin Header Bar */}
      <header className="glass-panel citizen-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0.75rem 1.25rem', 
        borderRadius: '12px', 
        marginBottom: '1.5rem',
        background: 'white',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px', height: '32px',
            backgroundColor: 'var(--primary-red)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 'bold', fontSize: '1.1rem',
            boxShadow: '0 3px 6px rgba(239,68,68,0.2)'
          }}>✚</div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-red)', margin: 0, lineHeight: 1.1 }}>{t.serviceName}</h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>{t.subtitle}</span>
          </div>
        </div>

        {/* Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <User size={14} style={{ color: 'var(--primary-blue)' }} />
          <span><b>{currentUser?.name || 'Citizen'}</b> ({currentUser?.phone || ''})</span>
        </div>

        {/* Language & Hotline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.2rem', background: '#f1f5f9', padding: '0.2rem', borderRadius: '20px' }}>
            <button 
              onClick={() => setLang('en')} 
              className={`btn`} 
              style={{ 
                padding: '0.25rem 0.6rem', 
                fontSize: '0.7rem', 
                borderRadius: '15px',
                background: lang === 'en' ? 'white' : 'transparent',
                color: lang === 'en' ? 'var(--primary-red)' : 'var(--text-secondary)',
                boxShadow: lang === 'en' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('ur')} 
              className={`btn`}
              style={{ 
                padding: '0.25rem 0.6rem', 
                fontSize: '0.7rem', 
                borderRadius: '15px',
                background: lang === 'ur' ? 'white' : 'transparent',
                color: lang === 'ur' ? 'var(--primary-red)' : 'var(--text-secondary)',
                boxShadow: lang === 'ur' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              اردو
            </button>
          </div>

          <a href="tel:03350267742" className="btn" style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.75rem',
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--primary-red)',
            border: '1px dashed var(--primary-red)',
            borderRadius: '20px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 'bold'
          }}>
            <Phone size={12} /> Call 0335-0267742
          </a>
        </div>
      </header>

      {!activeRequest ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main 2-column home dashboard */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
            gap: '1.5rem'
          }}>
            
            {/* Left Column: SOS Form */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', background: 'white', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                      onChange={e => setPhone(e.target.value)} 
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center', background: 'rgba(22, 163, 74, 0.05)', border: '1px solid rgba(22, 163, 74, 0.15)', borderRadius: '6px', padding: '0.5rem', color: 'var(--primary-green)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>🛰️</span> GPS Location Verified & Secured
                      </div>
                      <span style={{ fontSize: '0.7rem', opacity: 0.85, fontFamily: 'monospace' }}>
                        ({userPin.latitude.toFixed(6)}, {userPin.longitude.toFixed(6)})
                      </span>
                    </div>
                  )}

                  {(gpsStatus === 'denied' || gpsStatus === 'error') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '0.5rem', borderRadius: '6px', color: 'var(--primary-red)', fontSize: '0.75rem', fontWeight: 'bold', lineHeight: '1.4' }}>
                        <span>⚠️</span> GPS Location Required. Please enable GPS and allow location access in your browser to request an ambulance.
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
                  disabled={isSubmitting || gpsStatus !== 'detected'}
                >
                  {isSubmitting ? 'Sending Alert...' : t.reqNow}
                </button>
              </form>
            </div>

            {/* Right Column: Leaflet Map selector */}
            <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-blue)' }}>
                  📍 {t.locSelected}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {userPin.latitude.toFixed(4)}, {userPin.longitude.toFixed(4)}
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex' }}>
                <MapComponent
                  ambulances={ambulances}
                  hospitals={hospitals}
                  userPin={userPin}
                  onMapClick={handleMapClick}
                  showRoutes={false}
                />
              </div>
              <div style={{ background: '#f8fafc', padding: '0.4rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
                {t.tapMap}
              </div>
            </div>

          </div>

          {/* Collapsible Drawers (History & First Aid) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* First Aid Guidance Drawer */}
            <div className="glass-panel" style={{ borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
              <button 
                onClick={() => setShowFirstAid(!showFirstAid)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HeartPulse size={16} style={{ color: 'var(--primary-red)' }} />
                  {t.firstAidTitle}
                </span>
                <span style={{ fontSize: '0.7rem' }}>{showFirstAid ? '▲' : '▼'}</span>
              </button>
              
              {showFirstAid && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: '#fafafa' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {['Cardiac Arrest', 'Accident', 'Maternal', 'Respiratory', 'Other'].map(type => (
                      <button
                        key={type}
                        onClick={() => setLocalAdviceType(type)}
                        className={`btn`}
                        style={{ 
                          padding: '0.25rem 0.6rem', 
                          fontSize: '0.7rem', 
                          borderRadius: '15px',
                          background: localAdviceType === type ? 'var(--primary-red)' : 'white',
                          color: localAdviceType === type ? 'white' : 'var(--text-secondary)',
                          border: '1px solid rgba(0,0,0,0.08)'
                        }}
                      >
                        {type === 'Cardiac Arrest' ? t.cardiac : type === 'Accident' ? t.accident : type === 'Maternal' ? t.maternal : type === 'Respiratory' ? t.respiratory : t.other}
                      </button>
                    ))}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)', 
                    whiteSpace: 'pre-line', 
                    lineHeight: '1.4',
                    background: 'white',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--primary-red)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    {localAdviceType === 'Cardiac Arrest' && t.cprCardiacGuide}
                    {localAdviceType === 'Accident' && t.traumaAccidentGuide}
                    {localAdviceType === 'Maternal' && t.maternityGuide}
                    {localAdviceType === 'Respiratory' && t.respiratoryGuide}
                    {localAdviceType === 'Other' && t.otherGuide}
                  </div>
                </div>
              )}
            </div>

            {/* Request History Drawer */}
            <div className="glass-panel" style={{ borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <History size={16} style={{ color: 'var(--primary-blue)' }} />
                  {t.historyTitle}
                </span>
                <span style={{ fontSize: '0.7rem' }}>{showHistory ? '▲' : '▼'}</span>
              </button>
              
              {showHistory && (
                <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', background: '#fafafa' }}>
                  {historyRequests.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                      {t.historyEmpty}
                    </p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '0.4rem' }}>Date</th>
                            <th style={{ padding: '0.4rem' }}>Emergency</th>
                            <th style={{ padding: '0.4rem' }}>Location</th>
                            <th style={{ padding: '0.4rem' }}>Hospital</th>
                            <th style={{ padding: '0.4rem' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyRequests.map(req => (
                            <tr key={req.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                              <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>
                                {new Date(req.created_at).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '0.4rem' }}>
                                <span className="badge badge-red" style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem' }}>{req.emergency_type}</span>
                              </td>
                              <td style={{ padding: '0.4rem' }}>{req.location_name}</td>
                              <td style={{ padding: '0.4rem' }}>
                                {hospitals.find(h => h.id === req.assigned_hospital_id)?.name || 'None'}
                              </td>
                              <td style={{ padding: '0.4rem' }}>
                                <span className="badge badge-green" style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem' }}>Completed</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* Active Tracking Screen Layout */
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
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
            <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden', display: 'flex', height: '400px' }}>
              <MapComponent
                ambulances={assignedAmbulance ? [assignedAmbulance] : []}
                requests={[activeRequest]}
                hospitals={hospitals}
                selectedRequestId={activeRequest.id}
                showRoutes={true}
              />
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

    </div>
  );
}
