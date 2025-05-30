import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, CogIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const PhysicalExamROM = ({
  physicalExam,
  updateROMSeverity,
  updateROMPain,
  updatePhysicalExam,
  markSectionWNL,
  getExamStatusColor,
  expandedSections,
  toggleSection,
  examSettings,
  updateExamSettings
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(examSettings);

  // Sync tempSettings with examSettings when it changes
  useEffect(() => {
    setTempSettings(examSettings);
  }, [examSettings]);

  // ROM sections with their fields and normal ranges
  const romSections = [
    {
      key: 'cervicalSpine',
      title: 'Cervical Spine (Neck ROM)',
      fields: [
        { key: 'flexion', label: 'Flexion', normalRange: '60°' },
        { key: 'extension', label: 'Extension', normalRange: '55°' },
        { key: 'leftLateralFlex', label: 'Left Lateral Flexion', normalRange: '40°' },
        { key: 'rightLateralFlex', label: 'Right Lateral Flexion', normalRange: '40°' },
        { key: 'leftRotation', label: 'Left Rotation', normalRange: '80°' },
        { key: 'rightRotation', label: 'Right Rotation', normalRange: '80°' }
      ]
    },
    {
      key: 'thoracoLumbarSpine',
      title: 'Thoraco-Lumbar Spine (Back ROM)',
      fields: [
        { key: 'flexion', label: 'Flexion', normalRange: '90°' },
        { key: 'extension', label: 'Extension', normalRange: '30°' },
        { key: 'leftLateralFlex', label: 'Left Lateral Flexion', normalRange: '35°' },
        { key: 'rightLateralFlex', label: 'Right Lateral Flexion', normalRange: '35°' },
        { key: 'leftRotation', label: 'Left Rotation', normalRange: '30°' },
        { key: 'rightRotation', label: 'Right Rotation', normalRange: '30°' }
      ]
    },
    {
      key: 'upperExtremities',
      title: 'Upper Extremities',
      fields: [
        { key: 'shoulderFlexion', label: 'Shoulder Flexion', normalRange: '180°' },
        { key: 'shoulderAbduction', label: 'Shoulder Abduction', normalRange: '180°' },
        { key: 'elbowFlexion', label: 'Elbow Flexion', normalRange: '145°' },
        { key: 'wristFlexion', label: 'Wrist Flexion', normalRange: '80°' },
        { key: 'wristExtension', label: 'Wrist Extension', normalRange: '70°' }
      ]
    },
    {
      key: 'lowerExtremities',
      title: 'Lower Extremities',
      fields: [
        { key: 'hipFlexion', label: 'Hip Flexion', normalRange: '120°' },
        { key: 'hipAbduction', label: 'Hip Abduction', normalRange: '45°' },
        { key: 'kneeFlexion', label: 'Knee Flexion', normalRange: '135°' },
        { key: 'ankleFlexion', label: 'Ankle Dorsiflexion', normalRange: '20°' },
        { key: 'ankleExtension', label: 'Ankle Plantarflexion', normalRange: '50°' }
      ]
    }
  ];

  // Non-ROM sections (traditional status-based)
  const statusSections = [
    {
      key: 'headNeck',
      title: 'Head & Neck (Palpation)',
      fields: [
        { key: 'scalpSkull', label: 'Scalp & Skull' },
        { key: 'eyes', label: 'Eyes' },
        { key: 'ears', label: 'Ears' },
        { key: 'nose', label: 'Nose' },
        { key: 'throat', label: 'Throat' },
        { key: 'lymphNodes', label: 'Lymph Nodes' },
        { key: 'tmj', label: 'TMJ' }
      ]
    },
    {
      key: 'chestThorax',
      title: 'Chest & Thorax',
      fields: [
        { key: 'lungs', label: 'Lungs (Auscultation)' },
        { key: 'ribs', label: 'Ribs' },
        { key: 'sternum', label: 'Sternum' },
        { key: 'heartSounds', label: 'Heart Sounds' }
      ]
    },
    {
      key: 'abdomen',
      title: 'Abdomen',
      fields: [
        { key: 'inspection', label: 'Inspection' },
        { key: 'palpation', label: 'Palpation' },
        { key: 'bowelSounds', label: 'Bowel Sounds' },
        { key: 'tenderness', label: 'Tenderness/Guarding' }
      ]
    },
    {
      key: 'neurological',
      title: 'Neurological',
      fields: [
        { key: 'reflexes', label: 'Reflexes' },
        { key: 'sensation', label: 'Sensation' },
        { key: 'motorStrength', label: 'Motor Strength' },
        { key: 'coordination', label: 'Coordination' },
        { key: 'cranialNerves', label: 'Cranial Nerves' }
      ]
    },
    {
      key: 'postureGait',
      title: 'Posture & Gait',
      fields: [
        { key: 'posture', label: 'Posture' },
        { key: 'gait', label: 'Gait' },
        { key: 'balance', label: 'Balance' },
        { key: 'coordination', label: 'Coordination' }
      ]
    }
  ];

  // Generate clinical text for ROM findings
  const generateROMText = (section, field, data) => {
    const { severity, pain, normalRange } = data;
    const fieldLabel = romSections.find(s => s.key === section)?.fields.find(f => f.key === field)?.label || field;

    if (severity === 'WNL') {
      return `${fieldLabel} (normal ${normalRange}): Within normal limits.`;
    }

    const severityText = severity === 'Mild' ? 'mildly reduced' :
                        severity === 'Moderate' ? 'moderately reduced' :
                        severity === 'Severe' ? 'severely reduced' : 'reduced';

    const painText = pain ? ' with pain noted' : ', no pain';

    return `${fieldLabel} (normal ${normalRange}): ${severityText.charAt(0).toUpperCase() + severityText.slice(1)}${painText}.`;
  };

  // Generate clinical summary
  const generateClinicalSummary = () => {
    let summary = '';

    romSections.forEach(section => {
      const sectionData = physicalExam[section.key];
      const abnormalFindings = section.fields.filter(field =>
        sectionData[field.key]?.severity !== 'WNL'
      );

      if (abnormalFindings.length > 0) {
        summary += `\n${section.title} - Active:\n`;
        abnormalFindings.forEach(field => {
          summary += `- ${generateROMText(section.key, field.key, sectionData[field.key])}\n`;
        });
      }
    });

    return summary;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white">Physical Examination</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setTempSettings(examSettings); // Reset temp settings to current
                setShowSettings(!showSettings);
              }}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors flex items-center"
            >
              <CogIcon className="h-4 w-4 mr-2" />
              Customize Sections
            </button>
            <button
              onClick={() => {
                // Mark all visible sections as WNL
                const visibleSections = [...romSections, ...statusSections].filter(section =>
                  examSettings[section.key] !== false
                );
                visibleSections.forEach(section => {
                  markSectionWNL(section.key);
                });
              }}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              Mark All WNL
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 bg-gray-600 rounded-lg p-4 border border-gray-500">
            <h4 className="text-white font-medium mb-4">Customize Exam Sections</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ROM Sections */}
              <div>
                <h5 className="text-gray-300 font-medium mb-2">Range of Motion</h5>
                <div className="space-y-2">
                  {romSections.map(section => (
                    <label key={section.key} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={tempSettings[section.key] !== false}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          [section.key]: e.target.checked
                        }))}
                        className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">{section.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Sections */}
              <div>
                <h5 className="text-gray-300 font-medium mb-2">General Examination</h5>
                <div className="space-y-2">
                  {statusSections.map(section => (
                    <label key={section.key} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={tempSettings[section.key] !== false}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          [section.key]: e.target.checked
                        }))}
                        className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">{section.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <h5 className="text-gray-300 font-medium mb-2">Quick Presets</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      // Chiropractic Focus: Only spine and extremities
                      const chiroSections = ['cervicalSpine', 'thoracoLumbarSpine', 'upperExtremities', 'lowerExtremities', 'postureGait'];
                      const newSettings = {};
                      [...romSections, ...statusSections].forEach(section => {
                        newSettings[section.key] = chiroSections.includes(section.key);
                      });
                      setTempSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Chiropractic Focus
                  </button>
                  <button
                    onClick={() => {
                      // Full Medical: All sections
                      const newSettings = {};
                      [...romSections, ...statusSections].forEach(section => {
                        newSettings[section.key] = true;
                      });
                      setTempSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                  >
                    Full Medical Exam
                  </button>
                  <button
                    onClick={() => {
                      // Minimal: Only spine
                      const minimalSections = ['cervicalSpine', 'thoracoLumbarSpine'];
                      const newSettings = {};
                      [...romSections, ...statusSections].forEach(section => {
                        newSettings[section.key] = minimalSections.includes(section.key);
                      });
                      setTempSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                  >
                    Spine Only
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-500">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  💡 Tip: Customize which exam sections appear to reduce screen clutter. Settings are saved per doctor.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setTempSettings(examSettings); // Reset to current settings
                      setShowSettings(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Apply temp settings to actual settings
                      Object.keys(tempSettings).forEach(key => {
                        updateExamSettings(key, tempSettings[key]);
                      });
                      setShowSettings(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Apply Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ROM Sections */}
        {romSections.some(section => examSettings[section.key] !== false) && (
          <div className="space-y-4 mb-6">
            <h4 className="text-lg font-medium text-white border-b border-gray-600 pb-2">Range of Motion Assessment</h4>
            {romSections.filter(section => examSettings[section.key] !== false).map((section) => (
            <div key={section.key} className="bg-gray-600 rounded-lg overflow-hidden">
              {/* Section Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-500">
                <h5 className="text-white font-medium">{section.title}</h5>
                <button
                  onClick={() => markSectionWNL(section.key)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  Mark All WNL
                </button>
              </div>

              {/* ROM Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Motion
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Normal Range
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Pain?
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-500">
                    {section.fields.map((field) => {
                      const fieldData = physicalExam[section.key][field.key];
                      return (
                        <tr key={field.key} className="hover:bg-gray-500/20">
                          <td className="px-4 py-3 text-sm text-white font-medium">
                            {field.label}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {field.normalRange}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              {['WNL', 'Mild', 'Moderate', 'Severe'].map((severity) => (
                                <button
                                  key={severity}
                                  onClick={() => updateROMSeverity(section.key, field.key, severity)}
                                  className={`px-3 py-1 text-xs rounded transition-colors ${
                                    fieldData.severity === severity
                                      ? getExamStatusColor(severity)
                                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                  }`}
                                >
                                  {severity}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateROMPain(section.key, field.key, false)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${
                                  !fieldData.pain
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                              >
                                No
                              </button>
                              <button
                                onClick={() => updateROMPain(section.key, field.key, true)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${
                                  fieldData.pain
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                              >
                                Yes
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={fieldData.notes}
                              onChange={(e) => updatePhysicalExam(section.key, field.key, 'notes', e.target.value)}
                              placeholder="Optional notes..."
                              className="w-full px-3 py-1 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            ))}
          </div>
        )}

        {/* Status-based Sections */}
        {statusSections.some(section => examSettings[section.key] !== false) && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white border-b border-gray-600 pb-2">General Physical Examination</h4>
            {statusSections.filter(section => examSettings[section.key] !== false).map((section) => (
            <div key={section.key} className="bg-gray-600 rounded-lg overflow-hidden">
              {/* Section Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-500">
                <h5 className="text-white font-medium">{section.title}</h5>
                <button
                  onClick={() => markSectionWNL(section.key)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  Mark All WNL
                </button>
              </div>

              {/* Status Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Examination Area
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Notes/Findings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-500">
                    {section.fields.map((field) => {
                      const fieldData = physicalExam[section.key][field.key];
                      return (
                        <tr key={field.key} className="hover:bg-gray-500/20">
                          <td className="px-4 py-3 text-sm text-white font-medium">
                            {field.label}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={fieldData.status}
                              onChange={(e) => updatePhysicalExam(section.key, field.key, 'status', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                            >
                              <option value="WNL">Within Normal Limits</option>
                              <option value="Abnormal">Abnormal</option>
                              <option value="Not Tested">Not Tested</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={fieldData.notes}
                              onChange={(e) => updatePhysicalExam(section.key, field.key, 'notes', e.target.value)}
                              placeholder={fieldData.status === 'Abnormal' ? 'Describe abnormal findings...' : 'Optional notes...'}
                              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            ))}
          </div>
        )}

        {/* Clinical Summary */}
        {generateClinicalSummary() && (
          <div className="mt-6 bg-gray-600 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Clinical Summary</h4>
            <div className="bg-gray-700 rounded p-3">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {generateClinicalSummary()}
              </pre>
            </div>
          </div>
        )}

        {/* Auto-save indicator */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-400">
            ✅ Physical exam findings auto-save as you make selections
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhysicalExamROM;
