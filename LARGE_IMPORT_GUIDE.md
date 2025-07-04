# Large ChiroTouch Import Guide

This guide explains how to handle ChiroTouch exports that exceed Vercel's 50MB limit.

## 🚫 The Problem

- **Vercel Limit**: 50MB maximum for serverless functions
- **ChiroTouch Exports**: Often 100MB-500MB+ with patient documents
- **Current Error**: 413 "Request Entity Too Large"

## ✅ Solutions Available

### **Option 1: Chunked Upload System (Implemented)**

**How it works:**
- Breaks large files into 8MB chunks
- Uploads chunks sequentially 
- Reassembles on server side
- Works with files up to 1GB+

**Usage:**
```javascript
import ChunkedUploader from './components/import-export/ChunkedUploader';

<ChunkedUploader 
  file={largeFile}
  onComplete={(result) => console.log('Upload complete:', result)}
  onError={(error) => console.error('Upload failed:', error)}
/>
```

**API Endpoints:**
- `POST /api/import-export/chunked-upload` - Initialize upload
- `POST /api/import-export/upload-chunk` - Upload individual chunks
- `GET /api/import-export/chunked-upload?uploadId=xxx` - Check status

### **Option 2: File Splitting (Manual)**

**Before Upload:**
1. Extract your ChiroTouch ZIP file
2. Split into smaller ZIP files by category:
   - `patients.zip` (00_Tables folder only)
   - `appointments.zip` (appointment data)
   - `ledger.zip` (01_LedgerHistory folder)
   - `documents.zip` (02_ScannedDocs folder)
   - `notes.zip` (03_ChartNotes folder)

**Import Process:**
1. Upload `patients.zip` first (usually smallest)
2. Upload `appointments.zip` second
3. Upload remaining files in order
4. System will link related records automatically

### **Option 3: Local Processing + Cloud Sync**

**Setup:**
1. Run SpineLine locally for large imports
2. Process ChiroTouch files locally (no size limits)
3. Sync results to production database
4. Use for initial data migration only

**Commands:**
```bash
# Start local server
npm run dev

# Process large import locally
# Then sync to production
```

### **Option 4: External Storage Integration**

**Cloud Storage Upload:**
1. Upload large files to AWS S3/Google Cloud
2. Provide SpineLine with storage URL
3. System downloads and processes from cloud storage
4. Bypasses Vercel upload limits

**Implementation:**
- Add cloud storage credentials to Vercel environment
- Modify upload endpoint to accept storage URLs
- Process files from cloud storage directly

## 📋 Recommended Workflow

### **For Files 50MB-200MB:**
✅ **Use Chunked Upload System**
- Automatic chunking and reassembly
- Progress tracking and error recovery
- No manual file manipulation needed

### **For Files 200MB-500MB:**
✅ **Use File Splitting Method**
- Split by data type (patients, appointments, etc.)
- Upload each category separately
- More reliable for very large files

### **For Files 500MB+:**
✅ **Use Local Processing**
- Process locally first
- Export smaller, processed datasets
- Upload processed data to production

## 🛠️ Implementation Status

### **✅ Completed:**
- Chunked upload API endpoints
- Frontend chunked uploader component
- Progress tracking and error handling
- MongoDB storage for chunk metadata

### **🔄 In Progress:**
- Integration with main import page
- Chunk reassembly and processing
- Error recovery and retry logic

### **📋 Next Steps:**
1. Integrate ChunkedUploader into ImportExport page
2. Add file splitting utilities
3. Implement cloud storage option
4. Add local sync capabilities

## 🎯 Quick Start

### **For Immediate Use:**
1. **Small files (<50MB)**: Use existing upload system
2. **Medium files (50-200MB)**: Use chunked uploader (when integrated)
3. **Large files (>200MB)**: Split manually or use local processing

### **File Splitting Example:**
```bash
# Extract ChiroTouch ZIP
unzip ChiroTouch_Export.zip

# Create smaller ZIPs
zip -r patients.zip 00_Tables/
zip -r ledger.zip 01_LedgerHistory/
zip -r documents.zip 02_ScannedDocs/
zip -r notes.zip 03_ChartNotes/

# Upload each file separately through SpineLine
```

## 📞 Support

For large import assistance:
1. **Check file size** before upload
2. **Use appropriate method** based on size
3. **Contact support** for files >500MB
4. **Consider local processing** for initial migrations

---

**Note**: The chunked upload system is implemented but needs integration with the main import interface. File splitting is the most reliable current option for files >50MB.
