// Models index file
// This file will export all Mongoose models

module.exports = {
  User: require('./User'),
  Clinic: require('./Clinic'),
  Patient: require('./Patient'),
  Appointment: require('./Appointment'),
  Ledger: require('./Ledger'),
  Checkout: require('./Checkout'),
  ServiceCode: require('./ServiceCode'),
  DiagnosticCode: require('./DiagnosticCode'),
  SoapTemplate: require('./SoapTemplate'),
  DxCluster: require('./DxCluster'),
  CareKit: require('./CareKit'),
  // Treatment: require('./Treatment')
};
