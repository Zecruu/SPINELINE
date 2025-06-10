import { connectDB } from '../../server/config/db.js';
import { verifyToken } from '../../server/middleware/auth.js';
import Patient from '../../server/models/Patient.js';
import Appointment from '../../server/models/Appointment.js';
import ServiceCode from '../../server/models/ServiceCode.js';
import Checkout from '../../server/models/Checkout.js';
import Ledger from '../../server/models/Ledger.js';
import XLSX from 'xlsx';

// Helper function to convert data to CSV
const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) return '';

  const csvHeaders = headers.join(',');
  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
};

// Helper function to convert data to Excel
const convertToExcel = (data, headers, sheetName = 'Sheet1') => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    // Verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { type, format, dateRange, startDate, endDate, status } = req.query;
    const { clinicId } = user;

    console.log(`📤 Export request: type=${type}, format=${format}, clinic=${clinicId}`);

    let data = [];
    let headers = [];
    let filename = '';

    // Build date filter
    let dateFilter = {};
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      switch (dateRange) {
        case 'today':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          };
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          dateFilter = { $gte: weekStart };
          break;
        case 'month':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
          };
          break;
        case 'year':
          dateFilter = {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lt: new Date(now.getFullYear() + 1, 0, 1)
          };
          break;
        case 'custom':
          if (startDate && endDate) {
            dateFilter = {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            };
          }
          break;
      }
    }

    switch (type) {
      case 'patients':
        const patientQuery = { clinicId };
        if (status && status !== 'all') {
          patientQuery.status = status === 'active' ? 'Active' : 'Inactive';
        }
        if (dateFilter && Object.keys(dateFilter).length > 0) {
          patientQuery.createdAt = dateFilter;
        }

        const patients = await Patient.find(patientQuery).lean();
        data = patients.map(patient => ({
          recordNumber: patient.recordNumber,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '',
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          address: `${patient.address?.street || ''}, ${patient.address?.city || ''}, ${patient.address?.state || ''} ${patient.address?.zipCode || ''}`.trim(),
          status: patient.status,
          createdAt: new Date(patient.createdAt).toLocaleDateString(),
          lastVisit: patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : '',
          notes: patient.notes || ''
        }));
        headers = ['recordNumber', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email', 'address', 'status', 'createdAt', 'lastVisit', 'notes'];
        filename = `patients-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'appointments':
        const appointmentQuery = { clinicId };
        if (dateFilter && Object.keys(dateFilter).length > 0) {
          appointmentQuery.appointmentDate = dateFilter;
        }

        const appointments = await Appointment.find(appointmentQuery)
          .populate('patientId', 'firstName lastName recordNumber')
          .lean();

        data = appointments.map(apt => ({
          appointmentDate: new Date(apt.appointmentDate).toLocaleDateString(),
          appointmentTime: apt.appointmentTime,
          patientName: apt.patientId ? `${apt.patientId.firstName} ${apt.patientId.lastName}` : 'Unknown',
          recordNumber: apt.patientId?.recordNumber || '',
          visitType: apt.visitType,
          status: apt.status,
          duration: apt.duration,
          providerName: apt.providerName || '',
          notes: apt.notes || '',
          totalAmount: apt.totalAmount || 0,
          copayAmount: apt.copayAmount || 0
        }));
        headers = ['appointmentDate', 'appointmentTime', 'patientName', 'recordNumber', 'visitType', 'status', 'duration', 'providerName', 'notes', 'totalAmount', 'copayAmount'];
        filename = `appointments-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'billing':
        const serviceCodes = await ServiceCode.find({ clinicId }).lean();
        data = serviceCodes.map(code => ({
          code: code.code,
          description: code.description,
          category: code.category,
          unitRate: code.unitRate,
          isPackage: code.isPackage ? 'Yes' : 'No',
          totalSessions: code.packageDetails?.totalSessions || '',
          isActive: code.isActive ? 'Yes' : 'No',
          usageCount: code.usageCount || 0,
          lastUsed: code.lastUsed ? new Date(code.lastUsed).toLocaleDateString() : ''
        }));
        headers = ['code', 'description', 'category', 'unitRate', 'isPackage', 'totalSessions', 'isActive', 'usageCount', 'lastUsed'];
        filename = `billing-codes-export-${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    // Generate file based on format
    let fileBuffer;
    let contentType;
    let fileExtension;

    switch (format) {
      case 'csv':
        fileBuffer = Buffer.from(convertToCSV(data, headers), 'utf8');
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'xlsx':
        fileBuffer = convertToExcel(data, headers, type);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      default:
        return res.status(400).json({ message: 'Invalid export format' });
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    console.log(`✅ Export completed: ${data.length} records, ${fileBuffer.length} bytes`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      message: 'Export failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
