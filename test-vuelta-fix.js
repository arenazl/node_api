const messageAnalyzer = require('./api/message-analyzer');
const fs = require('fs');
const path = require('path');

// Function to simulate the /api/services/vuelta endpoint
async function simulateVueltaEndpoint() {
  try {
    // Sample service number and stream
    const service_number = "1004";
    
    // Create a minimal header structure for testing
    const headerStructure = {
      totalLength: 102,
      fields: [
        { name: "CANAL", type: "alfanumerico", length: 10 },
        { name: "SERVICIO", type: "numerico", length: 10 },
        { name: "USUARIO", type: "alfanumerico", length: 10 },
        // More fields would be here in a real structure...
      ]
    };
    
    // Create a minimal service structure for testing
    const serviceStructure = {
      serviceName: "Test Service",
      response: {
        elements: [
          {
            type: 'field',
            name: 'ESTADO',
            length: 2,
            fieldType: 'alfanumerico'
          },
          {
            type: 'field',
            name: 'CANT-REG',
            length: 2,
            fieldType: 'numerico'
          },
          {
            type: 'occurrence',
            id: 'occ_1',
            index: 1,
            count: 2,
            fields: [
              {
                type: 'field',
                name: 'FIELD1',
                length: 10,
                fieldType: 'alfanumerico'
              },
              {
                type: 'field',
                name: 'FIELD2',
                length: 10,
                fieldType: 'numerico'
              }
            ]
          }
        ]
      }
    };
    
    // Create a sample stream - 102 chars header + response body 
    const stream = 'TEST      0000001004USER      ' + '0'.repeat(72) + // 102 char header
                   'OK' +       // ESTADO field
                   '02' +       // CANT-REG field (2 occurrences)
                   'Value1     ' +  // First occurrence FIELD1
                   '0000001234' +   // First occurrence FIELD2
                   'Value2     ' +  // Second occurrence FIELD1
                   '0000005678';    // Second occurrence FIELD2
    
    console.log('Testing parseDataMessage function with validateOccurrences=true...');
    
    // This is the part that was failing before with "fieldType is not defined"
    const bodyMessage = stream.substring(102); // Skip header
    console.log('Body message:', bodyMessage);
    
    // Process the body of the response with validation
    const responseData = messageAnalyzer.parseDataMessage(
      bodyMessage,
      serviceStructure.response,
      true // Activate occurrence validation (this triggered the original error)
    );
    
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    console.log('Test passed successfully!');
    return true;
    
  } catch (error) {
    console.error('ERROR:', error);
    return false;
  }
}

// Run the test
simulateVueltaEndpoint().then(success => {
  if (success) {
    console.log('The fix for the "fieldType is not defined" error is successful!');
  } else {
    console.log('The fix did not resolve the issue');
  }
});
