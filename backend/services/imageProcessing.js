const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');

class ImageProcessor {
  constructor() {
    this.worker = null;
  }

  async initialize() {
    if (!this.worker) {
      this.worker = await createWorker('eng');
    }
  }

  async preprocessImage(imagePath) {
    try {
      // Enhance image for better OCR
      const processedImagePath = path.join(
        path.dirname(imagePath),
        'processed_' + path.basename(imagePath)
      );

      await sharp(imagePath)
        .resize(2000, null, { // Resize to reasonable width while maintaining aspect ratio
          withoutEnlargement: true
        })
        .sharpen() // Sharpen the image
        .normalize() // Normalize the image contrast
        .threshold(128) // Convert to black and white
        .toFile(processedImagePath);

      return processedImagePath;
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      throw error;
    }
  }

  async extractTextFromImage(imagePath) {
    try {
      await this.initialize();
      
      // Preprocess the image
      const processedImagePath = await this.preprocessImage(imagePath);
      
      // Perform OCR
      const { data: { text } } = await this.worker.recognize(processedImagePath);
      
      return this.parseQuizContent(text);
    } catch (error) {
      console.error('Text extraction failed:', error);
      throw error;
    }
  }

  parseQuizContent(text) {
    console.log('Raw text from image:', text);

    // Preserve original text with indentation for code detection
    const originalText = text;

    // Split text into lines but preserve empty lines for code blocks
    const lines = text.split('\n');
    console.log('Processed lines:', lines);
    
    let questions = [];
    let currentQuestion = null;
    let currentOptions = [];
    let currentCorrectAnswer = null;
    let isCodeBlock = false;
    let codeLines = [];

    // Helper function to detect if text needs formatting preservation (Universal)
    const needsFormatPreservation = (text) => {
      // Simple check: if text has intentional formatting, preserve it
      return (
        text.includes('\n') ||           // Multiple lines
        /^\s{2,}/m.test(text) ||        // Lines with 2+ leading spaces (indentation)
        /\t/.test(text) ||              // Contains tabs
        text.split('\n').some(line =>
          line.trim() !== line &&       // Line has leading/trailing spaces
          line.trim().length > 0        // But is not empty
        )
      );
    };

    // Keep the old function name for compatibility - now uses simple formatting detection
    const detectCodeBlock = (text) => {
      return needsFormatPreservation(text);
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip completely empty lines
      if (!trimmedLine) continue;

      // Match question pattern: starts with a number or Q followed by number
      if (/^(Q?\d+[\.\)])/.test(trimmedLine)) {
        // Save previous question if complete
        if (currentQuestion && currentOptions.length === 4 && currentCorrectAnswer !== null) {
          // Check if question contains code and preserve formatting
          const questionText = detectCodeBlock(currentQuestion) ?
            currentQuestion : currentQuestion;

          questions.push({
            question: questionText,
            options: [...currentOptions],
            correctAnswer: currentCorrectAnswer,
            marks: 1,
            isCodeQuestion: detectCodeBlock(currentQuestion)
          });
        }

        currentQuestion = trimmedLine;
        currentOptions = [];
        currentCorrectAnswer = null;
        continue;
      }
      
      // Match option pattern: starts with A-D followed by space or dot or parenthesis
      // Also handle options with asterisk (*) indicating correct answer
      const optionMatch = line.match(/^([A-D])(?:[\.\)\s]+)(.+)/);
      if (optionMatch) {
        const optionText = optionMatch[2].trim();
        const optionLetter = optionMatch[1];

        // Check if this option has an asterisk (indicating correct answer)
        if (optionText.endsWith('*')) {
          currentCorrectAnswer = optionLetter.charCodeAt(0) - 'A'.charCodeAt(0);
          currentOptions.push(optionText.replace(/\*$/, '').trim());
        } else {
          currentOptions.push(optionText);
        }
        continue;
      }
      
      // Match correct answer pattern (traditional format)
      const answerMatch = line.toLowerCase().match(/correct\s*answer\s*[:\-\s]\s*([a-d])/);
      if (answerMatch) {
        currentCorrectAnswer = answerMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);

        // Save question if we have all components
        if (currentQuestion && currentOptions.length === 4) {
          questions.push({
            question: currentQuestion,
            options: [...currentOptions],
            correctAnswer: currentCorrectAnswer,
            marks: 1,
            isCodeQuestion: detectCodeBlock(currentQuestion)
          });

          currentQuestion = null;
          currentOptions = [];
          currentCorrectAnswer = null;
        }
        continue;
      }

      // If we have a current question, this might be a continuation
      if (currentQuestion && currentOptions.length < 4) {
        // Check if this line contains code (preserve formatting)
        if (detectCodeBlock(line) || line.match(/^\s{2,}/)) {
          // This looks like code - preserve original formatting with line breaks
          currentQuestion += '\n' + line;
        } else if (trimmedLine) {
          // Regular text continuation - only add if not empty
          // Check if this looks like a separate statement (like print function call)
          if (trimmedLine.match(/^(print|console\.log|System\.out|cout|printf)\s*\(/)) {
            // This is a separate statement, add with newline
            currentQuestion += '\n\n' + trimmedLine;
          } else {
            // Regular text continuation
            currentQuestion += ' ' + trimmedLine;
          }
        }
      }
    }
    
    // Add last question if complete (handle case where correct answer was marked with asterisk)
    if (currentQuestion && currentOptions.length === 4) {
      // If no correct answer was explicitly found, default to 0 (option A)
      if (currentCorrectAnswer === null) {
        currentCorrectAnswer = 0;
        console.warn('No correct answer found for question, defaulting to option A');
      }

      questions.push({
        question: currentQuestion,
        options: [...currentOptions],
        correctAnswer: currentCorrectAnswer,
        marks: 1,
        isCodeQuestion: detectCodeBlock(currentQuestion)
      });
    }
    
    console.log('Parsed questions:', questions);
    
    if (questions.length === 0) {
      throw new Error('No valid questions could be extracted from the image. Make sure each question has 4 options and a correct answer.');
    }
    
    return {
      questions,
      totalMarks: questions.length // Each question is worth 1 mark
    };
  }

  convertAnswerToIndex(answer) {
    // Convert A, B, C, D to 0, 1, 2, 3 (case insensitive)
    if (answer.match(/[A-Da-d]/)) {
      return answer.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    }
    // Convert 1, 2, 3, 4 to 0, 1, 2, 3
    return parseInt(answer) - 1;
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

module.exports = new ImageProcessor(); 