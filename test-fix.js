const messageAnalyzer = require('./api/message-analyzer');

// Sample data for testing
const sampleData = {
  header: {
    CANAL: "TEST",
    SERVICIO: "1004",
    USUARIO: "SISTEMA"
  },
  response: {
    field1: "value1",
    field2: "value2"
  }
};

// Sample structure for testing
const sampleStructure = {
  elements: [
    {
      type: 'field',
      name: 'field1',
      length: 10,
      fieldType: 'alfanumerico'
    },
    {
      type: 'field',
      name: 'field2',
      length: 10,
      fieldType: 'numerico'
    }
  ]
};

try {
  console.log('Testing formatValue function...');
  
  // Test with alfanumerico type
  const alfaValue = messageAnalyzer.formatValue("test", 10, "alfanumerico");
  console.log('Format alfanumerico:', alfaValue);
  
  // Test with numerico type
  const numValue = messageAnalyzer.formatValue("123", 10, "numerico");
  console.log('Format numerico:', numValue);
  
  // Test with undefined type
  const undefinedTypeValue = messageAnalyzer.formatValue("test", 10, undefined);
  console.log('Format undefined type:', undefinedTypeValue);
  
  console.log('Testing formatDataMessage function...');
  const formattedMessage = messageAnalyzer.formatDataMessage(sampleData.response, sampleStructure);
  console.log('Formatted message:', formattedMessage);
  
  console.log('All tests passed successfully!');
} catch (error) {
  console.error('Test failed:', error);
}
