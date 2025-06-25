const utils = require('../../src/helpers');
console.assert(utils.toEnvName('testName') == 'TEST_NAME'); // Should return 'TEST_NAME'
console.assert(utils.toEnvName('testName!*@*') == 'TEST_NAME'); // Should return 'TEST_NAME'
console.assert(utils.toEnvName('TestName!*@*') == 'TEST_NAME'); // Should return 'TEST_NAME'
console.assert(utils.toEnvName('Test-Name!*@*') == 'TEST_NAME'); // Should return 'TEST_NAME'
