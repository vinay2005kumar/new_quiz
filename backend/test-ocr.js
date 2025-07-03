const imageProcessor = require('./services/imageProcessing');
const path = require('path');

// Test function to debug OCR processing
async function testOCR() {
  try {
    console.log('🔍 Testing OCR with sample text...');
    
    // Simulate the text that would be extracted from your image
    const sampleText = `Q2. What is the output? (2 marks) [Negative: 0.5]

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

print(factorial(4))

A) 24*
B) 12
C) 16
D) Error`;

    console.log('📝 Sample text to parse:');
    console.log(sampleText);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test the parsing function directly
    const result = imageProcessor.parseQuizContent(sampleText);
    
    console.log('✅ Parsing successful!');
    console.log('📊 Results:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.questions && result.questions.length > 0) {
      const question = result.questions[0];
      console.log('\n🎯 First question details:');
      console.log('Question:', question.question);
      console.log('Options:', question.options);
      console.log('Correct Answer Index:', question.correctAnswer);
      console.log('Correct Answer:', question.options[question.correctAnswer]);
      console.log('Is Code Question:', question.isCodeQuestion);
    }
    
  } catch (error) {
    console.error('❌ Error during OCR test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testOCR();
