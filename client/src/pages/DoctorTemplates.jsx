import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DoctorLayout from '../components/doctor/DoctorLayout';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const DoctorTemplates = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('soap');
  const [templates, setTemplates] = useState({
    soap: [],
    procedures: [],
    diagnostics: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const navigate = useNavigate();

  const tabs = [
    { id: 'soap', label: 'SOAP Templates', icon: DocumentTextIcon, count: templates.soap.length },
    { id: 'procedures', label: 'Procedure Bundles', icon: ClipboardDocumentListIcon, count: templates.procedures.length },
    { id: 'diagnostics', label: 'Diagnostic Templates', icon: BeakerIcon, count: templates.diagnostics.length },
    { id: 'alerts', label: 'Alert Templates', icon: ExclamationTriangleIcon, count: templates.alerts.length }
  ];

  const commonTags = [
    'Neck Pain', 'Back Pain', 'Headache', 'Sports Injury', 'Decompression',
    'Follow-Up', 'Initial Consultation', 'Maintenance', 'Acute', 'Chronic'
  ];

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    setUser(parsedUser);
    loadTemplates();
  }, [navigate]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');

      // Load SOAP templates
      const soapResponse = await axios.get('/api/soap-templates', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Load other template types (you'll need to create these endpoints)
      const procedureResponse = await axios.get('/api/templates/procedures', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const diagnosticResponse = await axios.get('/api/templates/diagnostics', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const alertResponse = await axios.get('/api/templates/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTemplates({
        soap: soapResponse.data.templates || [],
        procedures: procedureResponse.data.templates || [],
        diagnostics: diagnosticResponse.data.templates || [],
        alerts: alertResponse.data.templates || []
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      // Set empty arrays if endpoints don't exist yet
      setTemplates({
        soap: [],
        procedures: [],
        diagnostics: [],
        alerts: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = async (templateId, type) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      let endpoint;

      switch (type) {
        case 'soap':
          endpoint = `/api/soap-templates/${templateId}`;
          break;
        case 'procedures':
          endpoint = `/api/templates/procedures/${templateId}`;
          break;
        case 'diagnostics':
          endpoint = `/api/templates/diagnostics/${templateId}`;
          break;
        case 'alerts':
          endpoint = `/api/templates/alerts/${templateId}`;
          break;
      }

      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const getFilteredTemplates = () => {
    const currentTemplates = templates[activeTab] || [];

    return currentTemplates.filter(template => {
      const matchesSearch = !searchTerm ||
        template.templateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTag = selectedTag === 'all' ||
        template.category === selectedTag ||
        template.tags?.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  };

  const getAllTags = () => {
    const currentTemplates = templates[activeTab] || [];
    const tags = new Set();

    currentTemplates.forEach(template => {
      if (template.category) tags.add(template.category);
      if (template.tags) {
        template.tags.forEach(tag => tags.add(tag));
      }
    });

    return Array.from(tags);
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Templates</h1>
            <p className="text-gray-400">Manage your clinical templates and automation tools</p>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Template
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                  <span className="ml-2 bg-gray-700 text-gray-300 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tag Filter */}
            <div className="lg:w-64">
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {getAllTags().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredTemplates().map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              type={activeTab}
              onEdit={() => handleEditTemplate(template)}
              onDelete={() => handleDeleteTemplate(template._id, activeTab)}
            />
          ))}
        </div>

        {getFilteredTemplates().length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No templates found</p>
            <p className="text-gray-500 text-sm">
              {templates[activeTab].length === 0
                ? `Create your first ${activeTab} template to get started.`
                : 'Try adjusting your search or filters.'
              }
            </p>
          </div>
        )}

        {/* Create/Edit Template Modal */}
        {showCreateModal && (
          <TemplateModal
            template={editingTemplate}
            type={activeTab}
            onClose={() => {
              setShowCreateModal(false);
              setEditingTemplate(null);
            }}
            onSave={() => {
              loadTemplates();
              setShowCreateModal(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </div>
    </DoctorLayout>
  );
};

// Template Card Component
const TemplateCard = ({ template, type, onEdit, onDelete }) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'soap': return DocumentTextIcon;
      case 'procedures': return ClipboardDocumentListIcon;
      case 'diagnostics': return BeakerIcon;
      case 'alerts': return ExclamationTriangleIcon;
      default: return DocumentTextIcon;
    }
  };

  const Icon = getTypeIcon();

  return (
    <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-blue-400" />
          <h3 className="text-white font-medium">{template.templateName}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-white"
            title="Edit Template"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-400"
            title="Delete Template"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {template.description && (
        <p className="text-gray-400 text-sm mb-3">{template.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {template.category && (
            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full">
              {template.category}
            </span>
          )}
          {template.tags?.map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          Used {template.usageCount || 0} times
        </div>
      </div>
    </div>
  );
};

// Template Modal Component
const TemplateModal = ({ template, type, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    templateName: template?.templateName || '',
    description: template?.description || '',
    category: template?.category || '',
    tags: template?.tags || [],
    content: template?.content || getDefaultContent(type)
  });
  const [loading, setLoading] = useState(false);

  function getDefaultContent(templateType) {
    switch (templateType) {
      case 'soap':
        return {
          subjective: '',
          objective: '',
          assessment: '',
          plan: ''
        };
      case 'procedures':
        return {
          codes: [],
          notes: ''
        };
      case 'diagnostics':
        return {
          codes: [],
          notes: ''
        };
      case 'alerts':
        return {
          message: '',
          severity: 'medium',
          conditions: []
        };
      default:
        return {};
    }
  }

  const handleSave = async () => {
    if (!formData.templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      let endpoint, method;

      if (template) {
        // Editing existing template
        switch (type) {
          case 'soap':
            endpoint = `/api/soap-templates/${template._id}`;
            break;
          case 'procedures':
            endpoint = `/api/templates/procedures/${template._id}`;
            break;
          case 'diagnostics':
            endpoint = `/api/templates/diagnostics/${template._id}`;
            break;
          case 'alerts':
            endpoint = `/api/templates/alerts/${template._id}`;
            break;
        }
        method = 'put';
      } else {
        // Creating new template
        switch (type) {
          case 'soap':
            endpoint = '/api/soap-templates';
            break;
          case 'procedures':
            endpoint = '/api/templates/procedures';
            break;
          case 'diagnostics':
            endpoint = '/api/templates/diagnostics';
            break;
          case 'alerts':
            endpoint = '/api/templates/alerts';
            break;
        }
        method = 'post';
      }

      await axios[method](endpoint, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const renderContentEditor = () => {
    switch (type) {
      case 'soap':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Subjective</label>
              <textarea
                value={formData.content.subjective}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, subjective: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Subjective findings template..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Objective</label>
              <textarea
                value={formData.content.objective}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, objective: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Objective findings template..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Assessment</label>
              <textarea
                value={formData.content.assessment}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, assessment: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Assessment template..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Plan</label>
              <textarea
                value={formData.content.plan}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, plan: e.target.value }
                }))}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Plan template..."
              />
            </div>
          </div>
        );
      default:
        return (
          <div>
            <label className="block text-sm text-gray-400 mb-2">Template Content</label>
            <textarea
              value={JSON.stringify(formData.content, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData(prev => ({ ...prev, content: parsed }));
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              rows={10}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Template content (JSON format)..."
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Template Name *</label>
            <input
              type="text"
              value={formData.templateName}
              onChange={(e) => setFormData(prev => ({ ...prev, templateName: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter template name..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of when to use this template..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Neck Pain, Follow-Up, etc."
            />
          </div>

          {renderContentEditor()}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorTemplates;
