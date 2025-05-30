import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DoctorLayout from '../components/doctor/DoctorLayout';
import PhotoUploadModal from '../components/doctor/PhotoUploadModal';
import AppointmentHistory from '../components/doctor/AppointmentHistory';
import PhysicalExamROM from '../components/doctor/PhysicalExamROM';
import ProcedureCodeModal from '../components/doctor/ProcedureCodeModal';
import DiagnosticCodeModal from '../components/doctor/DiagnosticCodeModal';
import SignatureCanvas from 'react-signature-canvas';

import {
  UserIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CameraIcon,
  ChartBarIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  TagIcon,
  XMarkIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  ClockIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

const PatientFlow = () => {
  const [user, setUser] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [visitData, setVisitData] = useState({
    diagnoses: [],
    procedureCodes: [],
    soapNotes: {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      painScale: null,
      createdBy: null,
      createdAt: null
    },
    physicalExam: {},
    alerts: [],
    doctorSignature: null
  });
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  // Document upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('X-Ray');
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [showDocumentCamera, setShowDocumentCamera] = useState(false);
  const [documentCameraStream, setDocumentCameraStream] = useState(null);
  const [capturedDocumentPhoto, setCapturedDocumentPhoto] = useState(null);
  const [documentPhotoName, setDocumentPhotoName] = useState('');
  const [showInsuranceDetails, setShowInsuranceDetails] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [painScaleHistory, setPainScaleHistory] = useState([]);
  const [showPainHistory, setShowPainHistory] = useState(false);
  const [soapNotesErrors, setSoapNotesErrors] = useState({});
  const [availableCodes, setAvailableCodes] = useState([]);
  const [codeSearchTerm, setCodeSearchTerm] = useState('');
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState([]);

  // Diagnostic codes state
  const [availableDiagnosticCodes, setAvailableDiagnosticCodes] = useState([]);
  const [diagnosticSearchTerm, setDiagnosticSearchTerm] = useState('');
  const [showDiagnosticDropdown, setShowDiagnosticDropdown] = useState(false);
  const [selectedDiagnosticCodes, setSelectedDiagnosticCodes] = useState([]);

  // Modal states
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

  // State for SOAP templates
  const [soapTemplates, setSoapTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');

  // State for "Same as Last" functionality
  const [loadingSameAsLast, setLoadingSameAsLast] = useState(false);

  // Signature and provider state
  const [clinicDoctors, setClinicDoctors] = useState([]);
  const signatureRef = useRef(null);

  // Physical exam state - New ROM-based structure
  const [physicalExam, setPhysicalExam] = useState({
    cervicalSpine: {
      flexion: { severity: 'WNL', pain: false, notes: '', normalRange: '60°' },
      extension: { severity: 'WNL', pain: false, notes: '', normalRange: '55°' },
      leftLateralFlex: { severity: 'WNL', pain: false, notes: '', normalRange: '40°' },
      rightLateralFlex: { severity: 'WNL', pain: false, notes: '', normalRange: '40°' },
      leftRotation: { severity: 'WNL', pain: false, notes: '', normalRange: '80°' },
      rightRotation: { severity: 'WNL', pain: false, notes: '', normalRange: '80°' }
    },
    thoracoLumbarSpine: {
      flexion: { severity: 'WNL', pain: false, notes: '', normalRange: '90°' },
      extension: { severity: 'WNL', pain: false, notes: '', normalRange: '30°' },
      leftLateralFlex: { severity: 'WNL', pain: false, notes: '', normalRange: '35°' },
      rightLateralFlex: { severity: 'WNL', pain: false, notes: '', normalRange: '35°' },
      leftRotation: { severity: 'WNL', pain: false, notes: '', normalRange: '30°' },
      rightRotation: { severity: 'WNL', pain: false, notes: '', normalRange: '30°' }
    },
    headNeck: {
      scalpSkull: { status: 'WNL', notes: '' },
      eyes: { status: 'WNL', notes: '' },
      ears: { status: 'WNL', notes: '' },
      nose: { status: 'WNL', notes: '' },
      throat: { status: 'WNL', notes: '' },
      lymphNodes: { status: 'WNL', notes: '' },
      tmj: { status: 'WNL', notes: '' }
    },
    chestThorax: {
      lungs: { status: 'WNL', notes: '' },
      ribs: { status: 'WNL', notes: '' },
      sternum: { status: 'WNL', notes: '' },
      heartSounds: { status: 'WNL', notes: '' }
    },
    abdomen: {
      inspection: { status: 'WNL', notes: '' },
      palpation: { status: 'WNL', notes: '' },
      bowelSounds: { status: 'WNL', notes: '' },
      tenderness: { status: 'WNL', notes: '' }
    },
    upperExtremities: {
      shoulderFlexion: { severity: 'WNL', pain: false, notes: '', normalRange: '180°' },
      shoulderAbduction: { severity: 'WNL', pain: false, notes: '', normalRange: '180°' },
      elbowFlexion: { severity: 'WNL', pain: false, notes: '', normalRange: '145°' },
      wristFlexion: { severity: 'WNL', pain: false, notes: '', normalRange: '80°' },
      wristExtension: { severity: 'WNL', pain: false, notes: '', normalRange: '70°' },
      handGrip: { status: 'WNL', notes: '' },
      fingerMovement: { status: 'WNL', notes: '' }
    },
    lowerExtremities: {
      hipFlexion: { severity: 'WNL', pain: false, notes: '', normalRange: '120°' },
      hipAbduction: { severity: 'WNL', pain: false, notes: '', normalRange: '45°' },
      kneeFlexion: { severity: 'WNL', pain: false, notes: '', normalRange: '135°' },
      ankleFlexion: { severity: 'WNL', pain: false, notes: '', normalRange: '20°' },
      ankleExtension: { severity: 'WNL', pain: false, notes: '', normalRange: '50°' },
      weightBearing: { status: 'WNL', notes: '' }
    },
    neurological: {
      reflexes: { status: 'WNL', notes: '' },
      sensation: { status: 'WNL', notes: '' },
      motorStrength: { status: 'WNL', notes: '' },
      coordination: { status: 'WNL', notes: '' },
      cranialNerves: { status: 'WNL', notes: '' }
    },
    postureGait: {
      posture: { status: 'WNL', notes: '' },
      gait: { status: 'WNL', notes: '' },
      balance: { status: 'WNL', notes: '' },
      coordination: { status: 'WNL', notes: '' }
    }
  });
  const [expandedSections, setExpandedSections] = useState({ headNeck: true });
  const [lastExamDate, setLastExamDate] = useState(null);

  // Exam settings state - controls which sections are visible
  const [examSettings, setExamSettings] = useState({
    cervicalSpine: true,
    thoracoLumbarSpine: true,
    upperExtremities: true,
    lowerExtremities: true,
    headNeck: true,
    chestThorax: true,
    abdomen: true,
    neurological: true,
    postureGait: true
  });

  const navigate = useNavigate();
  const { appointmentId } = useParams();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);

    // Check if user is doctor
    if (parsedUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadAppointmentData();
    loadProcedureCodes();
    loadSoapTemplates();
    loadClinicDoctors();
  }, [navigate, appointmentId]);

  // Fetch documents when patient data is loaded
  useEffect(() => {
    if (patient?._id) {
      fetchDocuments();
    }
  }, [patient?._id]);

  // Load exam settings when user is set
  useEffect(() => {
    if (user?.userId) {
      const saved = localStorage.getItem(`examSettings_${user.userId}`);
      if (saved) {
        try {
          setExamSettings(JSON.parse(saved));
        } catch (error) {
          console.error('Error loading exam settings:', error);
        }
      }
    }
  }, [user?.userId]);

  const loadAppointmentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');

      // Load appointment details
      const appointmentResponse = await axios.get(`/api/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (appointmentResponse.data.success) {
        const appointmentData = appointmentResponse.data.appointment;
        console.log('🔍 Appointment data received:', appointmentData);
        setAppointment(appointmentData);

        // Check if patient data is already included in appointment response
        if (appointmentData.patient) {
          // Patient data is already included in the appointment response
          console.log('✅ Patient data found in appointment:', appointmentData.patient);
          setPatient(appointmentData.patient);
          setDoctorNotes(appointmentData.patient.doctorNotes || '');
        } else if (appointmentData.patientId) {
          // Load patient details separately if not included
          const patientId = typeof appointmentData.patientId === 'object' ? appointmentData.patientId._id : appointmentData.patientId;
          console.log('🔍 Loading patient separately, ID:', patientId);
          const patientResponse = await axios.get(`/api/patients/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (patientResponse.data.success) {
            console.log('✅ Patient data loaded separately:', patientResponse.data.patient);
            setPatient(patientResponse.data.patient);
            setDoctorNotes(patientResponse.data.patient.doctorNotes || '');
          }
        }

        // Update appointment status to "In Progress" if it's "Checked-In"
        if (appointmentData.status === 'Checked-In') {
          try {
            await axios.patch(`/api/appointments/${appointmentId}/status`,
              { status: 'In Progress' },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('✅ Appointment status updated to In Progress');
          } catch (statusError) {
            console.warn('⚠️ Failed to update appointment status (non-critical):', statusError.response?.data || statusError.message);
            // Don't throw - this is non-critical for the patient flow
          }
        }
      }
    } catch (error) {
      console.error('Error loading appointment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPatients = () => {
    navigate('/doctor');
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);

    // Load procedure codes when procedures tab is selected
    if (section === 'procedures' && availableCodes.length === 0) {
      loadProcedureCodes();
    }

    // Load diagnostic codes when diagnoses tab is selected
    if (section === 'diagnoses' && availableDiagnosticCodes.length === 0) {
      loadDiagnosticCodes();
    }
  };

  // Load clinic doctors for provider selection
  const loadClinicDoctors = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/doctors/clinic-doctors', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setClinicDoctors(response.data.doctors);
      }
    } catch (error) {
      console.error('Error loading clinic doctors:', error);
    }
  };

  // Handle signature end
  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      setVisitData(prev => ({
        ...prev,
        doctorSignature: signatureData
      }));
    }
  };

  // Clear signature
  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setVisitData(prev => ({
        ...prev,
        doctorSignature: null
      }));
    }
  };

  // Load provider's saved signature
  const loadProviderSignature = async () => {
    if (!visitData.providerId) return;

    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/doctors/${visitData.providerId}/signature`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.signature) {
        if (signatureRef.current) {
          signatureRef.current.fromDataURL(response.data.signature);
          setVisitData(prev => ({
            ...prev,
            doctorSignature: response.data.signature
          }));
        }
      }
    } catch (error) {
      console.error('Error loading provider signature:', error);
    }
  };

  // Check if visit can be completed
  const canCompleteVisit = () => {
    return visitData.providerId &&
           visitData.doctorSignature &&
           visitData.signatureConfirmed;
  };

  const handleCompleteVisit = async () => {
    if (!canCompleteVisit()) {
      alert('Please select a provider, add signature, and confirm documentation before completing the visit.');
      return;
    }

    try {
      const token = localStorage.getItem('userToken');

      // Save visit data with provider information
      const completeVisitData = {
        ...visitData,
        providerId: visitData.providerId,
        providerSignature: visitData.doctorSignature,
        completedAt: new Date().toISOString(),
        completedBy: user?.userId
      };

      await axios.post(`/api/appointments/${appointmentId}/visit-data`, completeVisitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update appointment status to "Completed" and treatment status to "Ready for Checkout"
      await axios.patch(`/api/appointments/${appointmentId}/status`,
        { status: 'Completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Navigate back to today's patients with refresh trigger
      navigate('/doctor', { state: { refreshNeeded: true } });
    } catch (error) {
      console.error('Error completing visit:', error);
      alert('Failed to complete visit. Please try again.');
    }
  };

  // Handle "Same as Last" functionality
  const handleSameAsLast = async () => {
    if (!patient?._id) {
      alert('Patient data not available');
      return;
    }

    setLoadingSameAsLast(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/patients/${patient._id}/last-visit-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.hasLastVisit) {
        const lastVisitData = response.data.lastVisitData;

        // Show confirmation dialog
        const confirmMessage = `Copy data from last visit (${new Date(lastVisitData.visitDate).toLocaleDateString()})?\n\nThis will copy:\n• SOAP Notes\n• Procedure Codes\n• Diagnoses\n• Physical Exam findings\n\nCurrent data will be overwritten.`;

        if (confirm(confirmMessage)) {
          // Copy SOAP Notes (excluding pain scale to allow new entry)
          if (lastVisitData.soapNotes) {
            const newSoapNotes = {
              subjective: lastVisitData.soapNotes.subjective || '',
              objective: lastVisitData.soapNotes.objective || '',
              assessment: lastVisitData.soapNotes.assessment || '',
              plan: lastVisitData.soapNotes.plan || '',
              painScale: null, // Reset pain scale for new visit
              createdBy: user?.userId,
              createdAt: new Date().toISOString()
            };

            setVisitData(prev => ({
              ...prev,
              soapNotes: newSoapNotes
            }));

            // Auto-save SOAP notes
            try {
              await axios.patch(`/api/appointments/${appointmentId}/soap-notes`,
                { soapNotes: newSoapNotes },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log('✅ SOAP notes copied and saved');
            } catch (error) {
              console.error('Error saving copied SOAP notes:', error);
            }
          }

          // Copy Procedure Codes
          if (lastVisitData.procedureCodes && lastVisitData.procedureCodes.length > 0) {
            setSelectedCodes(lastVisitData.procedureCodes);
            setVisitData(prev => ({
              ...prev,
              procedureCodes: lastVisitData.procedureCodes
            }));
          }

          // Copy Diagnoses
          if (lastVisitData.diagnoses && lastVisitData.diagnoses.length > 0) {
            setSelectedDiagnosticCodes(lastVisitData.diagnoses);
            setVisitData(prev => ({
              ...prev,
              diagnoses: lastVisitData.diagnoses
            }));
          }

          // Copy Physical Exam
          if (lastVisitData.physicalExam && Object.keys(lastVisitData.physicalExam).length > 0) {
            setPhysicalExam(lastVisitData.physicalExam);
            setVisitData(prev => ({
              ...prev,
              physicalExam: lastVisitData.physicalExam
            }));
          }

          alert(`Successfully copied data from last visit (${new Date(lastVisitData.visitDate).toLocaleDateString()})`);
        }
      } else {
        alert('No previous visit data found for this patient.');
      }
    } catch (error) {
      console.error('Error loading last visit data:', error);
      alert('Failed to load last visit data. Please try again.');
    } finally {
      setLoadingSameAsLast(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  // Format date display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get status color for badges
  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'text-yellow-400 bg-yellow-900/20';
      case 'Checked-In': return 'text-blue-400 bg-blue-900/20';
      case 'In Progress': return 'text-orange-400 bg-orange-900/20';
      case 'Completed': return 'text-green-400 bg-green-900/20';
      case 'Checked-Out': return 'text-green-400 bg-green-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  // Check if insurance is expiring soon (within 30 days)
  const isInsuranceExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  // Save doctor notes
  const saveDoctorNotes = async () => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.patch(`/api/patients/${patient._id}/doctor-notes`, {
        notes: doctorNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error saving doctor notes:', error);
    }
  };

  // Handle photo update
  const handlePhotoUpdated = (newPhotoUrl) => {
    setPatient(prev => ({
      ...prev,
      profilePic: newPhotoUrl
    }));
  };

  // Helper function to get full photo URL
  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;

    // If it's already a full URL, return as is
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }

    // If it's a relative path, prepend the server URL
    const serverUrl = 'http://localhost:5001';
    return `${serverUrl}${photoPath}`;
  };

  // Document upload functions
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  // Document camera functions
  const startDocumentCamera = async () => {
    try {
      console.log('🎥 Starting document camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera for documents
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setDocumentCameraStream(stream);
      setShowDocumentCamera(true);
    } catch (error) {
      console.error('❌ Document camera error:', error);
      alert('Unable to access camera. Please check permissions or use file upload instead.');
    }
  };

  const captureDocumentPhoto = () => {
    const video = document.getElementById('documentVideo');
    const canvas = document.getElementById('documentCanvas');

    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      // Convert to blob and show naming interface
      canvas.toBlob((blob) => {
        setCapturedDocumentPhoto(blob);
        setDocumentPhotoName(`${selectedCategory}_${patient?.firstName || 'Patient'}_${new Date().toLocaleDateString().replace(/\//g, '-')}`);
        stopDocumentCamera();
      }, 'image/jpeg', 0.8);
    }
  };

  const confirmDocumentPhoto = () => {
    if (capturedDocumentPhoto && documentPhotoName.trim()) {
      const fileName = `${documentPhotoName.trim()}.jpg`;
      const file = new File([capturedDocumentPhoto], fileName, { type: 'image/jpeg' });
      setSelectedFile(file);
      setCapturedDocumentPhoto(null);
      setDocumentPhotoName('');
    }
  };

  const retakeDocumentPhoto = () => {
    setCapturedDocumentPhoto(null);
    setDocumentPhotoName('');
    startDocumentCamera();
  };

  const stopDocumentCamera = () => {
    if (documentCameraStream) {
      documentCameraStream.getTracks().forEach(track => track.stop());
      setDocumentCameraStream(null);
    }
    setShowDocumentCamera(false);
  };

  const handleDocumentUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('category', selectedCategory);

      const response = await axios.post(
        `/api/patients/${patient._id}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
          }
        }
      );

      if (response.data.success) {
        // Add the new document to the documents list
        setDocuments(prev => [...prev, response.data.document]);

        // Reset form
        setSelectedFile(null);
        setSelectedCategory('X-Ray');

        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';

        alert('Document uploaded successfully!');
      }
    } catch (error) {
      console.error('Document upload error:', error);
      alert(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await axios.delete(
        `/api/patients/${patient._id}/documents/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
          }
        }
      );

      if (response.data.success) {
        // Remove the document from the documents list
        setDocuments(prev => prev.filter(doc => doc._id !== documentId));
        alert('Document deleted successfully!');
      }
    } catch (error) {
      console.error('Document delete error:', error);
      alert(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleDocumentView = (document) => {
    // Open document in new tab
    window.open(document.filePath, '_blank');
  };

  // Fetch patient documents
  const fetchDocuments = async () => {
    try {
      const response = await axios.get(
        `/api/patients/${patient._id}/documents`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
          }
        }
      );

      if (response.data.success) {
        setDocuments(response.data.documents);
      }
    } catch (error) {
      console.error('Fetch documents error:', error);
    }
  };

  // Auto-save SOAP notes
  const handleSoapNotesChange = async (field, value) => {
    const updatedSoapNotes = {
      ...visitData.soapNotes,
      [field]: value,
      createdBy: user?.userId,
      createdAt: new Date().toISOString()
    };

    setVisitData(prev => ({
      ...prev,
      soapNotes: updatedSoapNotes
    }));

    // Clear any existing errors for this field
    if (soapNotesErrors[field]) {
      setSoapNotesErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Auto-save after a short delay
    setTimeout(async () => {
      try {
        const token = localStorage.getItem('userToken');
        await axios.patch(`/api/appointments/${appointmentId}/soap-notes`,
          { soapNotes: updatedSoapNotes },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('✅ SOAP notes auto-saved');
      } catch (error) {
        console.error('Error auto-saving SOAP notes:', error);
      }
    }, 1000);
  };

  // Load pain scale history
  const loadPainScaleHistory = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.get(`/api/patients/${patient._id}/pain-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPainScaleHistory(response.data.history);
      }
    } catch (error) {
      console.error('Error loading pain scale history:', error);
    }
  };

  // Validate SOAP notes before sign-off
  const validateSoapNotes = () => {
    const errors = {};

    if (!visitData.soapNotes.subjective.trim()) {
      errors.subjective = 'Subjective notes are required';
    }
    if (!visitData.soapNotes.objective.trim()) {
      errors.objective = 'Objective notes are required';
    }
    if (!visitData.soapNotes.assessment.trim()) {
      errors.assessment = 'Assessment is required';
    }
    if (!visitData.soapNotes.plan.trim()) {
      errors.plan = 'Plan is required';
    }
    if (!visitData.soapNotes.painScale || visitData.soapNotes.painScale < 1 || visitData.soapNotes.painScale > 10) {
      errors.painScale = 'Pain scale (1-10) is required';
    }

    setSoapNotesErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Load available procedure codes
  const loadProcedureCodes = async () => {
    try {
      console.log('🔄 Loading procedure codes...');
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/service-codes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📋 Service codes response:', response.data);

      if (response.data.success) {
        setAvailableCodes(response.data.serviceCodes);
        console.log('✅ Loaded procedure codes:', response.data.serviceCodes.length);
      } else {
        console.error('❌ Failed to load procedure codes:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error loading procedure codes:', error.response?.data || error.message);
    }
  };

  // Load available diagnostic codes
  const loadDiagnosticCodes = async () => {
    try {
      console.log('🔄 Loading diagnostic codes...');
      const token = localStorage.getItem('userToken');
      const response = await axios.get('/api/diagnostic-codes', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📋 Diagnostic codes response:', response.data);

      if (response.data.success) {
        // Sort alphabetically by description
        const sortedCodes = response.data.diagnosticCodes.sort((a, b) =>
          a.description.localeCompare(b.description)
        );
        setAvailableDiagnosticCodes(sortedCodes);
        console.log('✅ Loaded diagnostic codes:', sortedCodes.length);
      } else {
        console.error('❌ Failed to load diagnostic codes:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error loading diagnostic codes:', error.response?.data || error.message);
    }
  };

  // Filter codes based on search term with prioritized exact matches
  const filteredCodes = availableCodes
    .filter(code =>
      code.code.toLowerCase().includes(codeSearchTerm.toLowerCase()) ||
      code.description.toLowerCase().includes(codeSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!codeSearchTerm) return a.description.localeCompare(b.description);

      // Prioritize exact code matches first
      const aCodeMatch = a.code.toLowerCase() === codeSearchTerm.toLowerCase();
      const bCodeMatch = b.code.toLowerCase() === codeSearchTerm.toLowerCase();
      if (aCodeMatch && !bCodeMatch) return -1;
      if (!aCodeMatch && bCodeMatch) return 1;

      // Then prioritize codes that start with search term
      const aCodeStarts = a.code.toLowerCase().startsWith(codeSearchTerm.toLowerCase());
      const bCodeStarts = b.code.toLowerCase().startsWith(codeSearchTerm.toLowerCase());
      if (aCodeStarts && !bCodeStarts) return -1;
      if (!aCodeStarts && bCodeStarts) return 1;

      // Finally sort alphabetically
      return a.description.localeCompare(b.description);
    });

  // Filter diagnostic codes with prioritized exact matches
  const filteredDiagnosticCodes = availableDiagnosticCodes
    .filter(code =>
      code.code.toLowerCase().includes(diagnosticSearchTerm.toLowerCase()) ||
      code.description.toLowerCase().includes(diagnosticSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!diagnosticSearchTerm) return a.description.localeCompare(b.description);

      // Prioritize exact code matches first
      const aCodeMatch = a.code.toLowerCase() === diagnosticSearchTerm.toLowerCase();
      const bCodeMatch = b.code.toLowerCase() === diagnosticSearchTerm.toLowerCase();
      if (aCodeMatch && !bCodeMatch) return -1;
      if (!aCodeMatch && bCodeMatch) return 1;

      // Then prioritize codes that start with search term
      const aCodeStarts = a.code.toLowerCase().startsWith(diagnosticSearchTerm.toLowerCase());
      const bCodeStarts = b.code.toLowerCase().startsWith(diagnosticSearchTerm.toLowerCase());
      if (aCodeStarts && !bCodeStarts) return -1;
      if (!aCodeStarts && bCodeStarts) return 1;

      // Finally sort alphabetically
      return a.description.localeCompare(b.description);
    });

  // Add procedure code to selection
  const addProcedureCode = (code) => {
    // Check if code is already selected
    if (selectedCodes.find(selected => selected.code === code.code)) {
      return;
    }

    const newCode = {
      code: code.code,
      description: code.description,
      units: 1,
      notes: '',
      rate: code.rate || 0,
      isPackage: code.isPackage || false,
      category: code.category || 'General'
    };

    const updatedCodes = [...selectedCodes, newCode];
    setSelectedCodes(updatedCodes);

    // Update visit data
    setVisitData(prev => ({
      ...prev,
      procedureCodes: updatedCodes
    }));

    // Clear search and close dropdown
    setCodeSearchTerm('');
    setShowCodeDropdown(false);

    // Auto-save procedure codes
    saveProcedureCodes(updatedCodes);
  };

  // Remove procedure code from selection
  const removeProcedureCode = (codeToRemove) => {
    const updatedCodes = selectedCodes.filter(code => code.code !== codeToRemove);
    setSelectedCodes(updatedCodes);

    // Update visit data
    setVisitData(prev => ({
      ...prev,
      procedureCodes: updatedCodes
    }));

    // Auto-save procedure codes
    saveProcedureCodes(updatedCodes);
  };

  // Update procedure code details
  const updateProcedureCode = (codeToUpdate, field, value) => {
    const updatedCodes = selectedCodes.map(code =>
      code.code === codeToUpdate
        ? { ...code, [field]: value }
        : code
    );

    setSelectedCodes(updatedCodes);

    // Update visit data
    setVisitData(prev => ({
      ...prev,
      procedureCodes: updatedCodes
    }));

    // Auto-save procedure codes with debounce
    setTimeout(() => {
      saveProcedureCodes(updatedCodes);
    }, 1000);
  };

  // Save procedure codes to appointment
  const saveProcedureCodes = async (codes) => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.patch(`/api/appointments/${appointmentId}/procedure-codes`,
        { procedureCodes: codes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Procedure codes auto-saved');
    } catch (error) {
      console.error('Error saving procedure codes:', error);
    }
  };

  // Calculate total for selected codes
  const calculateTotal = () => {
    return selectedCodes.reduce((total, code) => {
      return total + (code.rate * code.units);
    }, 0);
  };

  // Check if code is part of active care package
  const isCodeInPackage = (code) => {
    if (!patient?.packages) return false;

    return patient.packages.some(pkg =>
      pkg.isActive &&
      pkg.includedCodes &&
      pkg.includedCodes.includes(code.code)
    );
  };

  // Add diagnostic code to selection
  const addDiagnosticCode = (code) => {
    // Check if code is already selected
    if (selectedDiagnosticCodes.find(selected => selected.code === code.code)) {
      return;
    }

    const newCode = {
      code: code.code,
      description: code.description,
      isPrimary: selectedDiagnosticCodes.length === 0, // First code is primary
      category: code.category || 'General',
      bodySystem: code.bodySystem || 'General'
    };

    const updatedCodes = [...selectedDiagnosticCodes, newCode];
    setSelectedDiagnosticCodes(updatedCodes);

    // Update visit data
    setVisitData(prev => ({
      ...prev,
      diagnoses: updatedCodes
    }));

    // Clear search and close dropdown
    setDiagnosticSearchTerm('');
    setShowDiagnosticDropdown(false);

    // Auto-save diagnostic codes
    saveDiagnosticCodes(updatedCodes);
  };

  // Remove diagnostic code from selection
  const removeDiagnosticCode = (codeToRemove) => {
    const updatedCodes = selectedDiagnosticCodes.filter(code => code.code !== codeToRemove);

    // If we removed the primary diagnosis, make the first remaining one primary
    if (updatedCodes.length > 0 && !updatedCodes.some(code => code.isPrimary)) {
      updatedCodes[0].isPrimary = true;
    }

    setSelectedDiagnosticCodes(updatedCodes);

    // Update visit data
    setVisitData(prev => ({
      ...prev,
      diagnoses: updatedCodes
    }));

    // Auto-save diagnostic codes
    saveDiagnosticCodes(updatedCodes);
  };

  // Set primary diagnostic code
  const setPrimaryDiagnosticCode = (codeToSetPrimary) => {
    const updatedCodes = selectedDiagnosticCodes.map(code => ({
      ...code,
      isPrimary: code.code === codeToSetPrimary
    }));

    setSelectedDiagnosticCodes(updatedCodes);

    // Update visit data
    setVisitData(prev => ({
      ...prev,
      diagnoses: updatedCodes
    }));

    // Auto-save diagnostic codes
    saveDiagnosticCodes(updatedCodes);
  };

  // Save diagnostic codes to appointment
  const saveDiagnosticCodes = async (codes) => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.patch(`/api/appointments/${appointmentId}/diagnostic-codes`,
        { diagnosticCodes: codes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Diagnostic codes auto-saved');
    } catch (error) {
      console.error('Error saving diagnostic codes:', error);
    }
  };

  // Modal handlers
  const handleProcedureModalApply = (codes) => {
    setSelectedCodes(codes);
    setVisitData(prev => ({
      ...prev,
      procedureCodes: codes
    }));
    saveProcedureCodes(codes);
  };

  const handleDiagnosticModalApply = (codes) => {
    // Ensure first code is primary if none are marked as primary
    const updatedCodes = codes.map((code, index) => ({
      ...code,
      isPrimary: index === 0 && !codes.some(c => c.isPrimary) ? true : (code.isPrimary || false)
    }));

    setSelectedDiagnosticCodes(updatedCodes);
    setVisitData(prev => ({
      ...prev,
      diagnoses: updatedCodes
    }));
    saveDiagnosticCodes(updatedCodes);
  };

  // Physical exam management functions - Updated for ROM structure
  const updatePhysicalExam = (section, field, type, value) => {
    setPhysicalExam(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: {
          ...prev[section][field],
          [type]: value
        }
      }
    }));

    // Auto-save after a short delay
    setTimeout(() => {
      savePhysicalExam();
    }, 1000);
  };

  // Update ROM severity
  const updateROMSeverity = (section, field, severity) => {
    updatePhysicalExam(section, field, 'severity', severity);
  };

  // Update ROM pain status
  const updateROMPain = (section, field, pain) => {
    updatePhysicalExam(section, field, 'pain', pain);
  };

  // Update exam settings
  const updateExamSettings = (sectionKey, isVisible) => {
    const newSettings = {
      ...examSettings,
      [sectionKey]: isVisible
    };
    setExamSettings(newSettings);

    // Save to localStorage
    if (user?.userId) {
      localStorage.setItem(`examSettings_${user.userId}`, JSON.stringify(newSettings));
    }
  };

  const savePhysicalExam = async () => {
    try {
      const token = localStorage.getItem('userToken');
      await axios.patch(`/api/appointments/${appointmentId}/physical-exam`,
        { physicalExam },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Physical exam auto-saved');
    } catch (error) {
      console.error('Error saving physical exam:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const markSectionWNL = (section) => {
    const updatedSection = {};
    Object.keys(physicalExam[section]).forEach(field => {
      const currentField = physicalExam[section][field];
      if (currentField.severity !== undefined) {
        // ROM field
        updatedSection[field] = {
          ...currentField,
          severity: 'WNL',
          pain: false,
          notes: 'Within Normal Limits'
        };
      } else {
        // Regular status field
        updatedSection[field] = {
          ...currentField,
          status: 'WNL',
          notes: 'Within Normal Limits'
        };
      }
    });

    setPhysicalExam(prev => ({
      ...prev,
      [section]: updatedSection
    }));

    // Auto-save
    setTimeout(() => {
      savePhysicalExam();
    }, 500);
  };

  const getExamStatusColor = (status) => {
    switch (status) {
      case 'WNL': return 'text-green-400 bg-green-900/20';
      case 'Normal': return 'text-green-400 bg-green-900/20';
      case 'Mild': return 'text-yellow-400 bg-yellow-900/20';
      case 'Moderate': return 'text-orange-400 bg-orange-900/20';
      case 'Severe': return 'text-red-400 bg-red-900/20';
      case 'Abnormal': return 'text-red-400 bg-red-900/20';
      case 'Not Tested': return 'text-gray-400 bg-gray-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getSectionProgress = (section) => {
    const fields = Object.keys(physicalExam[section]);
    const tested = fields.filter(field => physicalExam[section][field].status !== 'Not Tested').length;
    return `${tested}/${fields.length}`;
  };

  // Load SOAP templates
  const loadSoapTemplates = async () => {
    try {
      console.log('🔄 Loading SOAP templates...');
      const token = localStorage.getItem('userToken');
      console.log('🔑 Token exists:', !!token);

      const response = await axios.get('/api/soap-templates', {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📡 SOAP templates response:', response.data);

      if (response.data.success) {
        setSoapTemplates(response.data.templates);
        console.log('✅ Loaded SOAP templates:', response.data.templates.length);
      } else {
        console.error('❌ Failed to load SOAP templates:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error loading SOAP templates:', error.response?.data || error.message);
      console.error('❌ Full error:', error);
    }
  };

  // Apply SOAP template
  const applySoapTemplate = async (templateId) => {
    try {
      const token = localStorage.getItem('userToken');

      // Prepare macro values
      const macroValues = {
        patient_name: `${patient?.firstName} ${patient?.lastName}`,
        pain_scale: visitData.soapNotes.painScale || 5,
        visit_type: appointment?.visitType || 'Regular Visit',
        doctor_name: `${user?.firstName} ${user?.lastName}`
      };

      const response = await axios.post(`/api/soap-templates/${templateId}/apply`, {
        macroValues
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const { content } = response.data;

        // Update SOAP notes with template content
        const updatedSoapNotes = {
          ...visitData.soapNotes,
          subjective: content.subjective,
          objective: content.objective,
          assessment: content.assessment,
          plan: content.plan,
          painScale: content.painScale
        };

        setVisitData(prev => ({
          ...prev,
          soapNotes: updatedSoapNotes
        }));

        // Auto-save the applied template
        setTimeout(async () => {
          try {
            await axios.patch(`/api/appointments/${appointmentId}/soap-notes`,
              { soapNotes: updatedSoapNotes },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('✅ Template applied and auto-saved');
          } catch (error) {
            console.error('Error auto-saving applied template:', error);
          }
        }, 500);

        console.log('✅ SOAP template applied:', response.data.templateName);
      }
    } catch (error) {
      console.error('❌ Error applying SOAP template:', error);
    }
  };

  // Save current SOAP notes as new template
  const saveAsTemplate = async (templateData) => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await axios.post('/api/soap-templates', {
        templateName: templateData.templateName,
        subjective: visitData.soapNotes.subjective,
        objective: visitData.soapNotes.objective,
        assessment: visitData.soapNotes.assessment,
        plan: visitData.soapNotes.plan,
        defaultPain: visitData.soapNotes.painScale || 5,
        category: templateData.category || 'General',
        description: templateData.description || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log('✅ Template saved:', templateData.templateName);
        loadSoapTemplates(); // Reload templates
        setShowCreateTemplateModal(false);
      }
    } catch (error) {
      console.error('❌ Error saving template:', error);
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Patient Details Card */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Patient Overview</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Profile & Demographics */}
                <div className="space-y-4">
                  {/* Profile Picture */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      {patient?.profilePic ? (
                        <img
                          src={getPhotoUrl(patient.profilePic)}
                          alt={`${patient.firstName} ${patient.lastName}`}
                          className="w-24 h-24 rounded-full object-cover border-4 border-gray-600"
                          onError={(e) => {
                            console.error('Failed to load patient photo:', patient.profilePic);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {!patient?.profilePic && (
                        <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center border-4 border-gray-600">
                          <span className="text-white text-2xl font-bold">
                            {patient?.firstName?.charAt(0)?.toUpperCase()}{patient?.lastName?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => setShowPhotoUpload(true)}
                        className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700"
                        title="Update Photo"
                      >
                        <CameraIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Basic Demographics */}
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Patient Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white ml-2 font-medium">{patient?.firstName} {patient?.lastName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Record #:</span>
                        <span className="text-white ml-2">{patient?.recordNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">DOB:</span>
                        <span className="text-white ml-2">{formatDate(patient?.dateOfBirth)} ({calculateAge(patient?.dateOfBirth)} years)</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Gender:</span>
                        <span className="text-white ml-2">{patient?.gender || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Phone:</span>
                        <span className="text-white ml-2">{patient?.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white ml-2">{patient?.email || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Assigned Provider:</span>
                        <span className="text-white ml-2">{user?.firstName} {user?.lastName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Today's Appointment */}
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Today's Appointment</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Time:</span>
                        <span className="text-white ml-2">{formatTime(appointment?.appointmentTime)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white ml-2">{appointment?.visitType}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(appointment?.status)}`}>
                          {appointment?.status}
                        </span>
                      </div>
                      {appointment?.notes && (
                        <div>
                          <span className="text-gray-400">Notes:</span>
                          <p className="text-white text-xs mt-1 bg-gray-700 p-2 rounded">{appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle Column - Insurance & Billing */}
                <div className="space-y-4">
                  {/* Insurance Details */}
                  <div className="bg-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Insurance Details</h4>
                      <button
                        onClick={() => setShowInsuranceDetails(!showInsuranceDetails)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {showInsuranceDetails ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    {showInsuranceDetails && (
                      <div className="space-y-3">
                        {patient?.insurances?.filter(ins => ins.isPrimary).map((insurance, index) => (
                          <div key={index} className="border border-gray-500 rounded p-3">
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-400">Provider:</span>
                                <span className="text-white ml-2 font-medium">{insurance.insuranceName}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Member ID:</span>
                                <span className="text-white ml-2">{insurance.memberId}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Group ID:</span>
                                <span className="text-white ml-2">{insurance.groupId || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Co-pay:</span>
                                <span className="text-white ml-2">${insurance.copay || '0.00'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Expires:</span>
                                <span className={`ml-2 ${isInsuranceExpiringSoon(insurance.expirationDate) ? 'text-red-400 font-medium' : 'text-white'}`}>
                                  {formatDate(insurance.expirationDate)}
                                  {isInsuranceExpiringSoon(insurance.expirationDate) && (
                                    <span className="ml-2 text-xs bg-red-900/20 text-red-400 px-2 py-1 rounded">Expires Soon</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        )) || (
                          <p className="text-gray-400 text-sm">No primary insurance on file</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Billable Codes for Insurance */}
                  {showInsuranceDetails && patient?.insurances?.filter(ins => ins.isPrimary).length > 0 && (
                    <div className="bg-gray-600 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Billable Codes</h4>
                      <div className="max-h-32 overflow-y-auto">
                        <div className="text-center text-gray-400 text-sm py-4">
                          Billable codes integration coming soon
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Referral Status */}
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Referral Status</h4>
                    {patient?.referrals?.filter(ref => ref.isActive).length > 0 ? (
                      <div className="space-y-3">
                        {patient.referrals.filter(ref => ref.isActive).map((referral, index) => (
                          <div key={index} className="border border-gray-500 rounded p-3">
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-400">Required:</span>
                                <span className="text-green-400 ml-2 font-medium">Yes</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Referral #:</span>
                                <span className="text-white ml-2">{referral.referralNumber || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">From:</span>
                                <span className="text-white ml-2">{referral.source}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Expires:</span>
                                <span className={`ml-2 ${referral.remainingDays <= 3 ? 'text-red-400 font-medium' : 'text-white'}`}>
                                  {formatDate(referral.expirationDate)}
                                  {referral.remainingDays <= 3 && (
                                    <span className="ml-2 text-xs bg-red-900/20 text-red-400 px-2 py-1 rounded">
                                      {referral.remainingDays} days left
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400">Visits:</span>
                                <span className="text-white ml-2">{referral.visitsUsed} of {referral.totalVisits} used</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No active referrals</p>
                    )}
                  </div>
                </div>

                {/* Right Column - Care Packages & Notes */}
                <div className="space-y-4">
                  {/* Active Care Packages */}
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Active Care Packages</h4>
                    {patient?.packages?.filter(pkg => pkg.isActive).length > 0 ? (
                      <div className="space-y-3">
                        {patient.packages.filter(pkg => pkg.isActive).map((pkg, index) => (
                          <div key={index} className="border border-gray-500 rounded p-3">
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-400">Package:</span>
                                <span className="text-white ml-2 font-medium">{pkg.packageName}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Remaining:</span>
                                <span className={`ml-2 font-medium ${
                                  pkg.remainingVisits <= 1 ? 'text-red-400' :
                                  pkg.remainingVisits <= 3 ? 'text-yellow-400' : 'text-green-400'
                                }`}>
                                  {pkg.remainingVisits} of {pkg.totalVisits} visits
                                </span>
                                {pkg.remainingVisits <= 1 && (
                                  <span className="ml-2 text-xs bg-red-900/20 text-red-400 px-2 py-1 rounded">
                                    Inform Patient
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-400">Auto-deduction:</span>
                                <span className="text-white ml-2">{pkg.autoDeduct ? '1 per visit' : 'Manual'}</span>
                              </div>
                              {pkg.lastUsed && (
                                <div>
                                  <span className="text-gray-400">Last used:</span>
                                  <span className="text-white ml-2">{formatDate(pkg.lastUsed)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No active care packages</p>
                    )}
                  </div>

                  {/* Persistent Doctor Notes */}
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Doctor Notes</h4>
                    <div className="space-y-3">
                      <textarea
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                        onBlur={saveDoctorNotes}
                        placeholder="Quick observations that persist between visits..."
                        rows={4}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <p className="text-xs text-gray-400">
                        These notes are visible only to doctors and persist between visits
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'soap':
        return (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">SOAP Notes</h3>

                {/* Template Controls */}
                <div className="flex items-center space-x-3">
                  {/* Debug Info */}
                  <div className="text-xs text-gray-400">
                    Templates: {soapTemplates.length}
                  </div>

                  {/* Test Load Button */}
                  <button
                    onClick={() => {
                      console.log('🧪 Manual template load test');
                      loadSoapTemplates();
                    }}
                    className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                    title="Test load templates"
                  >
                    Test Load
                  </button>

                  {/* Template Selector */}
                  <div className="relative">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="px-3 py-2 bg-gray-600 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                    >
                      <option value="">Select Template ({soapTemplates.length} available)</option>
                      {soapTemplates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.templateName} ({template.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Apply Template Button */}
                  <button
                    onClick={() => {
                      if (selectedTemplate) {
                        applySoapTemplate(selectedTemplate);
                        setSelectedTemplate('');
                      }
                    }}
                    disabled={!selectedTemplate}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                    title="Apply selected template"
                  >
                    Apply
                  </button>

                  {/* Save as Template Button */}
                  <button
                    onClick={() => setShowCreateTemplateModal(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    title="Save current notes as template"
                  >
                    Save as Template
                  </button>

                  {/* Manage Templates Button */}
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 text-sm"
                    title="Manage templates"
                  >
                    Manage
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Subjective */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      1. Subjective (Patient Statement)
                      {soapNotesErrors.subjective && (
                        <span className="text-red-400 ml-2">*{soapNotesErrors.subjective}</span>
                      )}
                    </label>
                    <textarea
                      value={visitData.soapNotes.subjective}
                      onChange={(e) => handleSoapNotesChange('subjective', e.target.value)}
                      onBlur={(e) => handleSoapNotesChange('subjective', e.target.value)}
                      placeholder="What the patient tells you about their symptoms, pain level, concerns..."
                      rows={6}
                      className={`w-full px-3 py-2 bg-gray-600 text-white rounded-md border ${
                        soapNotesErrors.subjective ? 'border-red-500' : 'border-gray-500'
                      } focus:border-blue-500 focus:outline-none`}
                    />
                  </div>

                  {/* Assessment */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      3. Assessment (Clinical Impression)
                      {soapNotesErrors.assessment && (
                        <span className="text-red-400 ml-2">*{soapNotesErrors.assessment}</span>
                      )}
                    </label>
                    <textarea
                      value={visitData.soapNotes.assessment}
                      onChange={(e) => handleSoapNotesChange('assessment', e.target.value)}
                      onBlur={(e) => handleSoapNotesChange('assessment', e.target.value)}
                      placeholder="Your professional assessment, diagnosis, clinical reasoning..."
                      rows={6}
                      className={`w-full px-3 py-2 bg-gray-600 text-white rounded-md border ${
                        soapNotesErrors.assessment ? 'border-red-500' : 'border-gray-500'
                      } focus:border-blue-500 focus:outline-none`}
                    />
                  </div>

                  {/* Pain Scale */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      5. Pain Scale (1–10)
                      {soapNotesErrors.painScale && (
                        <span className="text-red-400 ml-2">*{soapNotesErrors.painScale}</span>
                      )}
                    </label>
                    <div className="space-y-3">
                      {/* Slider */}
                      <div className="relative">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={visitData.soapNotes.painScale || 5}
                          onChange={(e) => handleSoapNotesChange('painScale', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                          <span>5</span>
                          <span>6</span>
                          <span>7</span>
                          <span>8</span>
                          <span>9</span>
                          <span>10</span>
                        </div>
                      </div>

                      {/* Current Value Display */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">Current: </span>
                          <span className={`text-2xl font-bold ${
                            visitData.soapNotes.painScale <= 3 ? 'text-green-400' :
                            visitData.soapNotes.painScale <= 6 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {visitData.soapNotes.painScale || '-'}
                          </span>
                          <span className="text-gray-400">/10</span>
                        </div>

                        {/* Pain History Button */}
                        <button
                          onClick={() => {
                            loadPainScaleHistory();
                            setShowPainHistory(!showPainHistory);
                          }}
                          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
                          title="View pain scale history"
                        >
                          <ChartBarIcon className="h-4 w-4" />
                          <span>History</span>
                        </button>
                      </div>

                      {/* Pain Scale Description */}
                      <p className="text-xs text-gray-400">
                        Rate the patient's pain today: 1 (no pain) to 10 (worst possible pain)
                      </p>

                      {/* Pain History Modal */}
                      {showPainHistory && (
                        <div className="bg-gray-600 rounded-lg p-3 border border-gray-500">
                          <h5 className="text-white font-medium mb-2">Recent Pain Scale History</h5>
                          {painScaleHistory.length > 0 ? (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {painScaleHistory.map((entry, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-gray-400">{formatDate(entry.date)}</span>
                                  <span className={`font-medium ${
                                    entry.painScale <= 3 ? 'text-green-400' :
                                    entry.painScale <= 6 ? 'text-yellow-400' : 'text-red-400'
                                  }`}>
                                    {entry.painScale}/10
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">No previous pain scale records</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Objective */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      2. Objective (Clinical Observations)
                      {soapNotesErrors.objective && (
                        <span className="text-red-400 ml-2">*{soapNotesErrors.objective}</span>
                      )}
                    </label>
                    <textarea
                      value={visitData.soapNotes.objective}
                      onChange={(e) => handleSoapNotesChange('objective', e.target.value)}
                      onBlur={(e) => handleSoapNotesChange('objective', e.target.value)}
                      placeholder="Your clinical observations, examination findings, measurements..."
                      rows={6}
                      className={`w-full px-3 py-2 bg-gray-600 text-white rounded-md border ${
                        soapNotesErrors.objective ? 'border-red-500' : 'border-gray-500'
                      } focus:border-blue-500 focus:outline-none`}
                    />
                  </div>

                  {/* Plan */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      4. Plan (Treatment Plan)
                      {soapNotesErrors.plan && (
                        <span className="text-red-400 ml-2">*{soapNotesErrors.plan}</span>
                      )}
                    </label>
                    <textarea
                      value={visitData.soapNotes.plan}
                      onChange={(e) => handleSoapNotesChange('plan', e.target.value)}
                      onBlur={(e) => handleSoapNotesChange('plan', e.target.value)}
                      placeholder="Treatment plan, follow-up instructions, recommendations..."
                      rows={6}
                      className={`w-full px-3 py-2 bg-gray-600 text-white rounded-md border ${
                        soapNotesErrors.plan ? 'border-red-500' : 'border-gray-500'
                      } focus:border-blue-500 focus:outline-none`}
                    />
                  </div>

                  {/* Last Visit Info (if available) */}
                  {patient?.visitHistory && patient.visitHistory.length > 0 && (
                    <div className="bg-gray-600 rounded-lg p-4">
                      <h5 className="text-white font-medium mb-2">Previous Visit</h5>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div>
                          <span className="text-gray-400">Date:</span>
                          <span className="ml-2">{formatDate(patient.visitHistory[0].appointmentDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Type:</span>
                          <span className="ml-2">{patient.visitHistory[0].visitType}</span>
                        </div>
                        {patient.visitHistory[0].painScale && (
                          <div>
                            <span className="text-gray-400">Pain Scale:</span>
                            <span className={`ml-2 font-medium ${
                              patient.visitHistory[0].painScale <= 3 ? 'text-green-400' :
                              patient.visitHistory[0].painScale <= 6 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {patient.visitHistory[0].painScale}/10
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-save indicator */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  ✅ Notes auto-save when you finish typing or move to another field
                </p>
              </div>
            </div>
          </div>
        );

      case 'diagnoses':
        return (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white">ICD-10 Diagnoses</h3>
                <button
                  onClick={() => {
                    if (availableDiagnosticCodes.length === 0) {
                      loadDiagnosticCodes();
                    }
                    setShowDiagnosticModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Select Diagnostic Codes</span>
                </button>
              </div>

              {/* Selected Diagnostic Codes */}
              {selectedDiagnosticCodes.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">Selected Diagnoses ({selectedDiagnosticCodes.length})</h4>
                  </div>

                  <div className="space-y-3">
                    {selectedDiagnosticCodes.map((code, index) => (
                      <div key={code.code} className="bg-gray-600 rounded-lg p-4 border border-gray-500">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-mono text-green-400 font-medium">{code.code}</span>
                              <span className="text-white font-medium">{code.description}</span>
                              {code.isPrimary && (
                                <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">PRIMARY</span>
                              )}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {code.category && (
                                <span className="bg-gray-800 px-2 py-1 rounded text-xs mr-2">{code.category}</span>
                              )}
                              {code.bodySystem && (
                                <span className="bg-gray-800 px-2 py-1 rounded text-xs">{code.bodySystem}</span>
                              )}
                              {code.notes && (
                                <div className="text-gray-400 text-xs mt-1">Notes: {code.notes}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (availableDiagnosticCodes.length === 0) {
                                loadDiagnosticCodes();
                              }
                              setShowDiagnosticModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 ml-4"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-400">
                      ✅ Diagnostic codes auto-save and sync with checkout
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardDocumentListIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No diagnostic codes selected</p>
                  <p className="text-gray-500 text-sm">Click "Select Diagnostic Codes" to add ICD-10 diagnoses for this visit</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'procedures':
        return (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white">Procedure Codes</h3>
                <button
                  onClick={() => {
                    if (availableCodes.length === 0) {
                      loadProcedureCodes();
                    }
                    setShowProcedureModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Select Procedure Codes</span>
                </button>
              </div>

              {/* Selected Codes Display */}
              {selectedCodes.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">Selected Procedure Codes ({selectedCodes.length})</h4>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Total: ${calculateTotal().toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedCodes.map((code, index) => (
                      <div key={code.code} className="bg-gray-600 rounded-lg p-4 border border-gray-500">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-mono text-blue-400 font-medium">({code.code})</span>
                              <span className="text-white font-medium">{code.description}</span>
                              {code.isPackage && (
                                <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs rounded-full">
                                  Package
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400 text-sm">
                              Units: {code.units} • Rate: ${code.rate || 0} • Total: ${((code.rate || 0) * code.units).toFixed(2)}
                              {code.notes && (
                                <div className="text-gray-400 text-xs mt-1">Notes: {code.notes}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (availableCodes.length === 0) {
                                loadProcedureCodes();
                              }
                              setShowProcedureModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 ml-4"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-400">
                      ✅ Procedure codes auto-save and sync with checkout
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No procedure codes selected</p>
                  <p className="text-gray-500 text-sm">Click "Select Procedure Codes" to add codes performed during this visit</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'alerts':
        return (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Patient Alerts</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-gray-400">Create alerts that will appear in future visits</p>
                  <button
                    onClick={() => setShowAlertModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Alert
                  </button>
                </div>

                {visitData.alerts.length > 0 ? (
                  <div className="space-y-3">
                    {visitData.alerts.map((alert, index) => (
                      <div key={index} className="bg-gray-600 rounded-lg p-4 border-l-4 border-yellow-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-white font-medium">{alert.type}</h4>
                            <p className="text-gray-300 text-sm mt-1">{alert.message}</p>
                            <span className="text-xs text-gray-400">Priority: {alert.priority}</span>
                          </div>
                          <button
                            onClick={() => {
                              const newAlerts = visitData.alerts.filter((_, i) => i !== index);
                              setVisitData(prev => ({ ...prev, alerts: newAlerts }));
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    No alerts created for this patient
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'exam':

        return (
          <PhysicalExamROM
            physicalExam={physicalExam}
            updateROMSeverity={updateROMSeverity}
            updateROMPain={updateROMPain}
            updatePhysicalExam={updatePhysicalExam}
            markSectionWNL={markSectionWNL}
            getExamStatusColor={getExamStatusColor}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            examSettings={examSettings}
            updateExamSettings={updateExamSettings}
          />
        );

      case 'records':
        return (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Patient Records</h3>
              <div className="space-y-4">
                {/* Upload Section */}
                <div className="bg-gray-600 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Upload New Document</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Document Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="X-Ray">X-Ray</option>
                        <option value="MRI">MRI</option>
                        <option value="CT Scan">CT Scan</option>
                        <option value="Lab Report">Lab Report</option>
                        <option value="Insurance Card">Insurance Card</option>
                        <option value="Referral">Referral</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Select File</label>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="document-file-input"
                            />
                            <label
                              htmlFor="document-file-input"
                              className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors"
                            >
                              <FolderIcon className="h-5 w-5 mr-2" />
                              Choose File
                            </label>
                          </div>
                          <button
                            onClick={startDocumentCamera}
                            className="w-full flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                          >
                            <CameraIcon className="h-5 w-5 mr-2" />
                            Take Photo
                          </button>
                        </div>
                        {selectedFile && (
                          <p className="text-sm text-gray-400">
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDocumentUpload}
                      disabled={!selectedFile || uploading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                  </div>
                </div>

                {/* Existing Records */}
                <div className="bg-gray-600 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Existing Records</h4>
                  {documents && documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((file, index) => (
                        <div key={file._id || index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                              <FolderIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{file.originalName || file.fileName}</p>
                              <p className="text-gray-400 text-sm">
                                {file.category} • {new Date(file.uploadedAt).toLocaleDateString()}
                                {file.fileSize && ` • ${(file.fileSize / 1024 / 1024).toFixed(2)} MB`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDocumentView(file)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDocumentDelete(file._id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <FolderIcon className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                      <p>No records uploaded yet</p>
                      <p className="text-sm">Upload MRIs, X-rays, lab reports, and other patient documents</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Camera Modal */}
            {showDocumentCamera && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">Take Document Photo</h3>
                    <button
                      onClick={stopDocumentCamera}
                      className="text-gray-400 hover:text-white"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        id="documentVideo"
                        autoPlay
                        playsInline
                        muted
                        ref={(video) => {
                          if (video && documentCameraStream) {
                            video.srcObject = documentCameraStream;
                          }
                        }}
                        className="w-full h-64 object-cover rounded-lg bg-gray-900"
                      />
                      <canvas id="documentCanvas" className="hidden" />
                    </div>

                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={captureDocumentPhoto}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        📸 Capture Photo
                      </button>
                      <button
                        onClick={stopDocumentCamera}
                        className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Photo Naming Modal */}
            {capturedDocumentPhoto && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">Name Your Document</h3>
                    <button
                      onClick={() => {
                        setCapturedDocumentPhoto(null);
                        setDocumentPhotoName('');
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Document Name</label>
                      <input
                        type="text"
                        value={documentPhotoName}
                        onChange={(e) => setDocumentPhotoName(e.target.value)}
                        placeholder="Enter a name for this document..."
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={retakeDocumentPhoto}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Retake Photo
                      </button>
                      <button
                        onClick={confirmDocumentPhoto}
                        disabled={!documentPhotoName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Use This Photo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'templates':
        return (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Templates</h3>
              <div className="text-center text-gray-400 py-8">
                Clinical templates coming soon
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <AppointmentHistory
            patient={patient}
            currentAppointmentId={appointmentId}
          />
        );

      case 'signature':
        return (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Review & Signature</h3>
              <div className="space-y-6">
                {/* Visit Summary */}
                <div className="bg-gray-600 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Visit Summary</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Patient:</span>
                      <span className="text-white ml-2">{patient?.firstName} {patient?.lastName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Visit Type:</span>
                      <span className="text-white ml-2">{appointment?.visitType}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white ml-2">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Time:</span>
                      <span className="text-white ml-2">{formatTime(appointment?.appointmentTime)}</span>
                    </div>
                  </div>
                </div>

                {/* SOAP Notes Summary */}
                {(visitData.soapNotes.subjective || visitData.soapNotes.objective || visitData.soapNotes.assessment || visitData.soapNotes.plan) && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">SOAP Notes Summary</h4>
                    <div className="space-y-3 text-sm">
                      {visitData.soapNotes.subjective && (
                        <div>
                          <span className="text-gray-400 font-medium">Subjective:</span>
                          <p className="text-white mt-1">{visitData.soapNotes.subjective}</p>
                        </div>
                      )}
                      {visitData.soapNotes.objective && (
                        <div>
                          <span className="text-gray-400 font-medium">Objective:</span>
                          <p className="text-white mt-1">{visitData.soapNotes.objective}</p>
                        </div>
                      )}
                      {visitData.soapNotes.assessment && (
                        <div>
                          <span className="text-gray-400 font-medium">Assessment:</span>
                          <p className="text-white mt-1">{visitData.soapNotes.assessment}</p>
                        </div>
                      )}
                      {visitData.soapNotes.plan && (
                        <div>
                          <span className="text-gray-400 font-medium">Plan:</span>
                          <p className="text-white mt-1">{visitData.soapNotes.plan}</p>
                        </div>
                      )}
                      {visitData.soapNotes.painScale && (
                        <div>
                          <span className="text-gray-400 font-medium">Pain Scale:</span>
                          <span className={`ml-2 font-medium ${
                            visitData.soapNotes.painScale <= 3 ? 'text-green-400' :
                            visitData.soapNotes.painScale <= 6 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {visitData.soapNotes.painScale}/10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Procedure Codes Summary */}
                {selectedCodes.length > 0 && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Procedure Codes Performed</h4>
                    <div className="space-y-2">
                      {selectedCodes.map((code, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-mono text-blue-400">[{code.code}]</span>
                            <span className="text-white ml-2">{code.description}</span>
                            {code.units > 1 && (
                              <span className="text-gray-400 ml-2">× {code.units}</span>
                            )}
                            {code.notes && (
                              <div className="text-gray-400 text-xs mt-1 ml-6">{code.notes}</div>
                            )}
                          </div>
                          <span className="text-white font-medium">${((code.rate || 0) * code.units).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-500 pt-2 mt-2">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-white">Total:</span>
                          <span className="text-white">${calculateTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Physical Exam Summary */}
                {Object.values(physicalExam).some(section =>
                  Object.values(section).some(field => field.status !== 'Not Tested')
                ) && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Physical Examination Summary</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(physicalExam).map(([sectionKey, sectionData]) => {
                        const testedFields = Object.entries(sectionData).filter(([_, field]) => field.status !== 'Not Tested');
                        if (testedFields.length === 0) return null;

                        const sectionTitle = {
                          headNeck: 'Head & Neck',
                          chestThorax: 'Chest & Thorax',
                          abdomen: 'Abdomen',
                          upperExtremities: 'Upper Extremities',
                          lowerExtremities: 'Lower Extremities',
                          neurological: 'Neurological',
                          postureGait: 'Posture & Gait'
                        }[sectionKey];

                        return (
                          <div key={sectionKey}>
                            <span className="text-gray-400 font-medium">{sectionTitle}:</span>
                            <div className="ml-4 mt-1 space-y-1">
                              {testedFields.map(([fieldKey, field]) => (
                                <div key={fieldKey} className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded text-xs ${getExamStatusColor(field.status)}`}>
                                    {field.status}
                                  </span>
                                  <span className="text-white">
                                    {fieldKey === 'scalpSkull' ? 'Scalp & Skull' :
                                     fieldKey === 'lymphNodes' ? 'Lymph Nodes' :
                                     fieldKey === 'cervicalSpine' ? 'Cervical Spine' :
                                     fieldKey === 'thoracicSpine' ? 'Thoracic Spine' :
                                     fieldKey === 'bowelSounds' ? 'Bowel Sounds' :
                                     fieldKey === 'posturalAlignment' ? 'Postural Alignment' :
                                     fieldKey === 'gaitPattern' ? 'Gait Pattern' :
                                     fieldKey === 'assistiveDevice' ? 'Assistive Device' :
                                     fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}
                                  </span>
                                  {field.notes && (
                                    <span className="text-gray-300 text-xs">- {field.notes}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Diagnostic Codes Summary */}
                {selectedDiagnosticCodes.length > 0 && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Diagnostic Codes</h4>
                    <div className="space-y-2">
                      {selectedDiagnosticCodes.map((code, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <span className="font-mono text-blue-400">[{code.code}]</span>
                          <span className="text-white">{code.description}</span>
                          {code.isPrimary && (
                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">PRIMARY</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerts Summary */}
                {visitData.alerts.length > 0 && (
                  <div className="bg-gray-600 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Alerts Created</h4>
                    <div className="space-y-2">
                      {visitData.alerts.map((alert, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-white">{alert.type}: {alert.message}</span>
                          <span className="text-gray-400">{alert.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Doctor Signature */}
                <div className="bg-gray-600 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Doctor Signature</h4>
                  <div className="space-y-4">
                    {/* Provider Selection */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Treating Provider *</label>
                      <select
                        value={visitData.providerId || ''}
                        onChange={(e) => setVisitData(prev => ({ ...prev, providerId: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="">Select Provider...</option>
                        {clinicDoctors.map(doctor => (
                          <option key={doctor._id} value={doctor._id}>
                            Dr. {doctor.firstName} {doctor.lastName} {doctor.credentials?.npiNumber ? `(NPI: ${doctor.credentials.npiNumber})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Signature Canvas */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Digital Signature *</label>
                      <div className="border border-gray-500 rounded-lg bg-white">
                        <SignatureCanvas
                          ref={signatureRef}
                          onEnd={handleSignatureEnd}
                          penColor="black"
                          minWidth={1}
                          maxWidth={3}
                          velocityFilterWeight={0.7}
                          minDistance={3}
                          throttle={16}
                          canvasProps={{
                            width: 400,
                            height: 150,
                            className: 'signature-canvas',
                            style: {
                              border: 'none',
                              display: 'block',
                              cursor: 'crosshair'
                            }
                          }}
                          backgroundColor="white"
                          clearOnResize={false}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <button
                          onClick={clearSignature}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Clear Signature
                        </button>
                        {visitData.providerId && (
                          <button
                            onClick={loadProviderSignature}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Use Saved Signature
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="signatureConfirm"
                        checked={visitData.signatureConfirmed || false}
                        onChange={(e) => setVisitData(prev => ({ ...prev, signatureConfirmed: e.target.checked }))}
                        className="rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="signatureConfirm" className="text-sm text-gray-300">
                        I confirm that I have reviewed all visit documentation and it is accurate
                      </label>
                    </div>
                  </div>
                </div>

                {/* Complete Visit Button */}
                <div className="bg-gray-600 rounded-lg p-4">
                  <button
                    onClick={handleCompleteVisit}
                    disabled={!canCompleteVisit()}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      canCompleteVisit()
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Complete Visit & Return to Patients
                  </button>
                  {!canCompleteVisit() && (
                    <p className="text-sm text-gray-400 mt-2 text-center">
                      Please select a provider, add signature, and confirm documentation
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DoctorLayout flowMode={true} onBackToPatients={handleBackToPatients}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout flowMode={true} onBackToPatients={handleBackToPatients}>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
        }

        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
          background: #4b5563;
        }

        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: #4b5563;
        }
      `}</style>
      <div className="flex flex-col h-full">
        {/* Patient Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {patient?.firstName} {patient?.lastName}
              </h1>
              <p className="text-gray-400">
                {appointment?.visitType} • {formatTime(appointment?.appointmentTime)} • In Treatment
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-orange-600 text-white text-sm rounded-full">
                In Treatment
              </span>
            </div>
          </div>
        </div>

        {/* Flow Navigation */}
        <div className="flex space-x-1 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: UserIcon },
            { id: 'soap', label: 'SOAP Notes', icon: PencilSquareIcon },
            { id: 'procedures', label: 'Procedures', icon: DocumentTextIcon },
            { id: 'diagnoses', label: 'Diagnoses', icon: ClipboardDocumentListIcon },
            { id: 'exam', label: 'Physical Exam', icon: UserGroupIcon },
            { id: 'records', label: 'Records', icon: FolderIcon },
            { id: 'history', label: 'Visit Timeline', icon: ClockIcon },
            { id: 'alerts', label: 'Alerts', icon: ExclamationTriangleIcon },
            { id: 'signature', label: 'Review & Sign', icon: CheckCircleIcon },
          ].map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {section.label}
              </button>
            );
          })}

          {/* Same as Last Button */}
          <button
            onClick={handleSameAsLast}
            disabled={loadingSameAsLast}
            className="flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
            title="Copy data from last visit (SOAP notes, procedures, diagnoses, physical exam)"
          >
            {loadingSameAsLast ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            )}
            Same as Last
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {renderSectionContent()}
        </div>

        {/* Create Template Modal */}
        {showCreateTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-white mb-4">Save as Template</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                saveAsTemplate({
                  templateName: formData.get('templateName'),
                  category: formData.get('category'),
                  description: formData.get('description')
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Template Name *</label>
                    <input
                      type="text"
                      name="templateName"
                      required
                      placeholder="e.g., Lumbar Adjustment"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Category</label>
                    <select
                      name="category"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="General">General</option>
                      <option value="Chiropractic">Chiropractic</option>
                      <option value="Evaluation">Evaluation</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Headache">Headache</option>
                      <option value="Sports Medicine">Sports Medicine</option>
                      <option value="Prenatal">Prenatal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Brief description of when to use this template..."
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateTemplateModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Template Management Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Manage SOAP Templates</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Search Templates */}
              <div className="mb-4">
                <input
                  type="text"
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Templates List */}
              <div className="space-y-3">
                {soapTemplates
                  .filter(template =>
                    template.templateName.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
                    template.category.toLowerCase().includes(templateSearchTerm.toLowerCase())
                  )
                  .map((template) => (
                    <div key={template._id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-white font-medium">{template.templateName}</h4>
                            <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-xs rounded-full">
                              {template.category}
                            </span>
                            {template.usageCount > 0 && (
                              <span className="text-gray-400 text-xs">
                                Used {template.usageCount} times
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-gray-400 text-sm mb-2">{template.description}</p>
                          )}
                          <div className="text-xs text-gray-500">
                            Created: {new Date(template.createdAt).toLocaleDateString()}
                            {template.lastUsed && (
                              <span className="ml-4">
                                Last used: {new Date(template.lastUsed).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              applySoapTemplate(template._id);
                              setShowTemplateModal(false);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Apply
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this template?')) {
                                try {
                                  const token = localStorage.getItem('userToken');
                                  await axios.delete(`/api/soap-templates/${template._id}`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  loadSoapTemplates();
                                } catch (error) {
                                  console.error('Error deleting template:', error);
                                }
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                {soapTemplates.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No templates available</p>
                    <p className="text-gray-500 text-sm">Create your first template by saving current SOAP notes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Procedure Code Modal */}
        <ProcedureCodeModal
          isOpen={showProcedureModal}
          onClose={() => setShowProcedureModal(false)}
          availableCodes={availableCodes}
          selectedCodes={selectedCodes}
          onApply={handleProcedureModalApply}
        />

        {/* Diagnostic Code Modal */}
        <DiagnosticCodeModal
          isOpen={showDiagnosticModal}
          onClose={() => setShowDiagnosticModal(false)}
          availableCodes={availableDiagnosticCodes}
          selectedCodes={selectedDiagnosticCodes}
          onApply={handleDiagnosticModalApply}
        />

        {/* Photo Upload Modal */}
        <PhotoUploadModal
          isOpen={showPhotoUpload}
          onClose={() => setShowPhotoUpload(false)}
          patient={patient}
          onPhotoUpdated={handlePhotoUpdated}
        />
      </div>
    </DoctorLayout>
  );
};

export default PatientFlow;
