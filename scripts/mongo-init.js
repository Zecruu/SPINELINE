// MongoDB Initialization Script for Docker
// This script creates the initial database and user for SpineLine

// Switch to the spineline database
db = db.getSiblingDB('spineline');

// Create a user for the application
db.createUser({
  user: 'spineline_user',
  pwd: 'spineline_password_change_this',
  roles: [
    {
      role: 'readWrite',
      db: 'spineline'
    }
  ]
});

// Create initial collections with indexes
db.createCollection('users');
db.createCollection('clinics');
db.createCollection('patients');
db.createCollection('appointments');
db.createCollection('servicecodes');
db.createCollection('diagnosticcodes');
db.createCollection('soaptemplates');
db.createCollection('checkouts');
db.createCollection('ledgers');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ clinicId: 1 });

db.clinics.createIndex({ clinicId: 1 }, { unique: true });

db.patients.createIndex({ clinicId: 1 });
db.patients.createIndex({ recordNumber: 1, clinicId: 1 }, { unique: true });
db.patients.createIndex({ email: 1, clinicId: 1 });

db.appointments.createIndex({ clinicId: 1, appointmentDate: 1, appointmentTime: 1 });
db.appointments.createIndex({ clinicId: 1, patientId: 1, appointmentDate: 1 });
db.appointments.createIndex({ clinicId: 1, status: 1, appointmentDate: 1 });
db.appointments.createIndex({ clinicId: 1, providerId: 1, appointmentDate: 1 });
db.appointments.createIndex({ clinicId: 1, assignedDoctor: 1, appointmentDate: 1 });

db.servicecodes.createIndex({ clinicId: 1, code: 1 }, { unique: true });
db.servicecodes.createIndex({ clinicId: 1, isActive: 1 });

db.diagnosticcodes.createIndex({ clinicId: 1, code: 1 }, { unique: true });
db.diagnosticcodes.createIndex({ clinicId: 1, isActive: 1 });

db.soaptemplates.createIndex({ clinicId: 1, templateName: 1 });
db.soaptemplates.createIndex({ clinicId: 1, isActive: 1 });

db.checkouts.createIndex({ clinicId: 1, appointmentId: 1 });
db.checkouts.createIndex({ clinicId: 1, checkoutDate: 1 });
db.checkouts.createIndex({ receiptNumber: 1 }, { unique: true, sparse: true });

db.ledgers.createIndex({ clinicId: 1, transactionDate: 1 });
db.ledgers.createIndex({ clinicId: 1, patientId: 1, transactionDate: 1 });
db.ledgers.createIndex({ receiptNumber: 1 }, { unique: true, sparse: true });

print('SpineLine database initialized successfully!');
print('Created user: spineline_user');
print('Created collections with indexes');
print('Remember to change the default password in production!');
