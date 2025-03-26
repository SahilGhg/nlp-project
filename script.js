const { jsPDF } = window.jspdf;
document.addEventListener("DOMContentLoaded", function () {
  const GEMINI_API_KEY = "AIzaSyBlPQqUB4dveIKl3c9PebtjYqY_2O_m0dU"; // Replace with your API key
  const startButton = document.getElementById("startInterview");
    const submitButton = document.getElementById("submitAnswers");
    const nextButton = document.getElementById("nextQuestions");
    const stopButton = document.getElementById("stopInterview");
    const loadingDiv = document.getElementById("loading");
    const bookmarkButton = document.getElementById("showBookmarks");
    const bookmarkListDiv = document.getElementById("bookmarkList");
    const bookmarkSection = document.getElementById("bookmarkSection");
    const questionSection = document.getElementById("questionSection");
    const technicalQuestionsDiv = document.getElementById("technicalQuestions");
    const hrQuestionsDiv = document.getElementById("hrQuestions");
    const scoreSection = document.getElementById("scoreSection");
    const scoreTableBody = document.querySelector("#scoreTable tbody");

    // Rate limiting configuration
    const REQUEST_DELAY = 2000; // 2 seconds between requests
    const MAX_RETRIES = 3;
    let lastRequestTime = 0;
    let requestQueue = [];
    let isProcessingQueue = false;

    let questions = { technical: [], hr: [] };
    let scores = [];
    let currentSet = 0;
    let bookmarks = getBookmarksFromCookies();

    // ========== BOOKMARK FUNCTIONS ==========
    function getCookie(name) {
        let cookieArr = document.cookie.split("; ");
        for (let cookie of cookieArr) {
            let [key, value] = cookie.split("=");
            if (key === name) {
                return decodeURIComponent(value);
            }
        }
        return null;
    }    

    function getBookmarksFromCookies() {
        try {
            let jsonBookmarks = getCookie("bookmarks");
            if (jsonBookmarks) {
                let bookmarksArray = JSON.parse(jsonBookmarks);
                console.log("Parsed Bookmarks:", bookmarksArray);
                return bookmarksArray;
            } else {
                console.log("No bookmarks found.");
                return [];
            }
        } catch (error) {
            console.error("Error parsing bookmarks JSON:", error);
            return [];
        }
    }

    // Add event listener for toggling bookmark visibility
    bookmarkButton.addEventListener("click", function () {
        bookmarkListDiv.style.display = bookmarkListDiv.style.display === "none" ? "block" : "none";
    });    

    // Handle bookmark icon click dynamically
    document.addEventListener('click', function (e) {
        if (e.target && e.target.closest('.bookmark-icon')) {
            const icon = e.target.closest('.bookmark-icon');
            const id = icon.dataset.id;
            const questionText = icon.parentNode.querySelector('p').innerText;

            // Toggle the bookmark functionality
            if (bookmarks.some(b => b.id === id)) {
                bookmarks = bookmarks.filter(b => b.id !== id);
                icon.classList.remove('bookmarked');
                icon.querySelector('i').classList.remove('fa-solid');
                icon.querySelector('i').classList.add('fa-regular');
            } else {
                bookmarks.push({ id, question: questionText });
                icon.classList.add('bookmarked');
                icon.querySelector('i').classList.remove('fa-regular');
                icon.querySelector('i').classList.add('fa-solid');
            }

            updateBookmarksList();
            document.cookie = `bookmarks=${JSON.stringify(bookmarks)}; path=/`;
        }
    });

    // Function to update the bookmarks display in the list
    function updateBookmarksList() {
        bookmarkListDiv.innerHTML = '';

        if (bookmarks.length > 0) {
            bookmarks.forEach(bookmark => {
                const questionItem = document.createElement("div");
                questionItem.classList.add("bookmark-item");
                questionItem.innerHTML = `
                    <p>${bookmark.question}</p>
                    // <span class="remove-bookmark" data-id="${bookmark.id}">Remove</span>
                `;
                bookmarkListDiv.appendChild(questionItem);
            });
        } else {
            bookmarkListDiv.innerHTML = '<p>No bookmarks added. Bookmark questions during your interview for quick review later.</p>';
        }
    }

    // Handle bookmark removal in the list
    document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('remove-bookmark')) {
            const id = e.target.dataset.id;
            bookmarks = bookmarks.filter(b => b.id !== id);
            updateBookmarksList();
            const bookmarkIcon = document.querySelector(`.bookmark-icon[data-id="${id}"]`);
            if (bookmarkIcon) {
                bookmarkIcon.classList.remove('bookmarked');
            }
            document.cookie = `bookmarks=${JSON.stringify(bookmarks)}; path=/`;
        }
    });

    // Initial update of bookmarks list when the page loads
    updateBookmarksList();
    // ========== END BOOKMARK FUNCTIONS ==========

    // ========== SPEECH RECOGNITION ==========
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let currentTargetId = null;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map((result) => result[0])
                .map((result) => result.transcript)
                .join("");

            if (currentTargetId) {
                const textarea = document.getElementById(currentTargetId);
                if (textarea) {
                    textarea.value = transcript;
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            stopRecording();
            alert("Speech recognition error: " + event.error);
        };

        recognition.onend = () => {
            stopRecording();
        };
    } else {
        console.warn("Speech recognition not supported in this browser");
        document.querySelectorAll('.mic-button').forEach(btn => btn.style.display = 'none');
    }

    document.addEventListener("click", (e) => {
        if (e.target.closest(".mic-button")) {
            const button = e.target.closest(".mic-button");
            const targetId = button.dataset.target;

            if (recognition) {
                if (button.classList.contains("active")) {
                    stopRecording();
                } else {
                    startRecording(button, targetId);
                }
            }
        }
    });

    function startRecording(button, targetId) {
        if (window.confirm("Allow the website to use your microphone?")) {
            currentTargetId = targetId;
            button.classList.add("active");
            try {
                recognition.start();
            } catch (err) {
                console.error("Speech recognition start failed:", err);
                stopRecording();
                alert("Couldn't access microphone. Please check your permissions.");
            }
        }
    }

    function stopRecording() {
        if (recognition) {
            try {
                recognition.stop();
            } catch (err) {
                console.error("Speech recognition stop failed:", err);
            }
        }

        if (currentTargetId) {
            const button = document.querySelector(`.mic-button[data-target="${currentTargetId}"]`);
            if (button) {
                button.classList.remove("active");
            }
            currentTargetId = null;
        }
    }
  // ========== END OF SPEECH RECOGNITION ADDITION ==========

  // Event Listeners
  startButton.addEventListener("click", () => {
    console.log("Start Interview clicked");
    startInterview();
  });

  submitButton.addEventListener("click", () => {
    console.log("Submit Answers clicked");
    submitAnswers();
  });

  nextButton.addEventListener("click", async () => {
    console.log("Next Questions clicked");
    currentSet++;
    await generateAndDisplayNextQuestions();
  });

  stopButton.addEventListener("click", () => {
    console.log("Stop Interview clicked");
    resetInterview();
  });

  // Start Interview
  async function startInterview() {
    const interviewTopic = document
      .getElementById("interviewTopic")
      .value.trim();
    if (!interviewTopic) {
      alert("Please enter an interview topic.");
      return;
    }

    loadingDiv.style.display = "block";
    startButton.disabled = true;

    try {
      questions = await generateQuestions(interviewTopic, currentSet);
      displayQuestions();

      startButton.style.display = "none";
      questionSection.style.display = "block";
      submitButton.style.display = "block";
      stopButton.style.display = "block";
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("Failed to generate questions. Please try again.");
    } finally {
      bookmarkSection.style.display = "block"
      loadingDiv.style.display = "block";
      startButton.disabled = false;
      document.getElementById('downloadPDF').style.display = 'inline-block';
    }
  }
  //pdf
  function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set default font
    doc.setFont('helvetica');
    
    // Add title
    doc.setFontSize(20);
    doc.text('Interview Performance Report', 105, 20, { align: 'center' });
    
    // Add interview topic
    const topic = document.getElementById('interviewTopic').value;
    doc.setFontSize(14);
    doc.text(`Topic: ${topic}`, 14, 30);
    
    // Add date
    const today = new Date();
    doc.text(`Date: ${today.toLocaleDateString()}`, 14, 40);
    
    // Add score summary
    doc.setFontSize(16);
    doc.text('Score Summary', 14, 50);
    
    // Set initial yPosition and line height
    let yPosition = 60;
    const lineHeight = 7;
    const paragraphSpacing = 10;
    
    // Add questions and feedback
    scores.forEach((score, index) => {
        // Check if we need a new page
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${index + 1}. ${score.question}`, 14, yPosition);
        doc.setFont(undefined, 'normal');
        
        // Move down for score
        yPosition += lineHeight;
        doc.text(`Score: ${score.score}/10`, 14, yPosition);
        
        // Move down for feedback
        yPosition += lineHeight;
        
        // Split feedback into multiple lines if needed
        const feedbackLines = doc.splitTextToSize(`Feedback: ${score.comment}`, 180);
        feedbackLines.forEach(line => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(line, 20, yPosition);
            yPosition += lineHeight;
        });
        
        // Add spacing between questions
        yPosition += paragraphSpacing;
    });
    
    // Add performance analysis on a new page
    doc.addPage();
    yPosition = 20;
    doc.setFontSize(16);
    doc.text('Performance Analysis', 14, yPosition);
    
    // Get performance data
    const techScores = scores.slice(0, 5).map(s => s.score);
    const hrScores = scores.slice(5).map(s => s.score);
    const techAverage = (techScores.reduce((a, b) => a + b, 0) / techScores.length).toFixed(1);
    const hrAverage = (hrScores.reduce((a, b) => a + b, 0) / hrScores.length).toFixed(1);
    
    yPosition += paragraphSpacing;
    doc.setFontSize(14);
    doc.text(`Technical Skills Average: ${techAverage}/10`, 14, yPosition);
    yPosition += paragraphSpacing;
    doc.text(`Soft Skills Average: ${hrAverage}/10`, 14, yPosition);
    yPosition += paragraphSpacing * 2;
    
    // Add areas to improve with model answers
    const weaknesses = scores.filter(s => s.score <= 5);
    if (weaknesses.length > 0) {
        doc.setFontSize(16);
        doc.text('Areas to Improve with Model Answers', 14, yPosition);
        yPosition += paragraphSpacing;
        
        doc.setFontSize(12);
        weaknesses.forEach((item, index) => {
            // Check for page break
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Question
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${item.question}`, 14, yPosition);
            doc.setFont(undefined, 'normal');
            yPosition += lineHeight;
            
            // Current feedback
            const feedbackLines = doc.splitTextToSize(`Current feedback: ${item.comment}`, 180);
            feedbackLines.forEach(line => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(line, 20, yPosition);
                yPosition += lineHeight;
            });
            
            // Get model answer from the page if available
            const answerElement = document.querySelector(`.answer-content[data-question="${encodeURIComponent(item.question)}"]`);
            let modelAnswer = "Model answer not available";
            
            if (answerElement && answerElement.textContent.trim() && 
                !answerElement.textContent.includes("Could not generate") && 
                !answerElement.querySelector('.loading-dots-small')) {
                modelAnswer = answerElement.textContent.trim();
            }
            
            // Model answer
            const modelAnswerLines = doc.splitTextToSize(`Model answer: ${modelAnswer}`, 180);
            modelAnswerLines.forEach(line => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(line, 20, yPosition);
                yPosition += lineHeight;
            });
            
            yPosition += paragraphSpacing;
        });
    }
    
    // Save the PDF
    doc.save('interview_report.pdf');
}
document.getElementById('downloadPDF').addEventListener('click', generatePDF);
  // Generate Questions
  async function generateQuestions(topic, currentSetIndex = 0) {
    const difficulty = determineDifficulty(currentSetIndex);
    const techCategory = document.getElementById('techCategory').value;
    const hrCategory = document.getElementById('hrCategory').value;
    
    console.log(`Generating ${difficulty} questions for set ${currentSetIndex}`);
    
    // Modify prompts to include categories
    const technicalPrompt = `Generate 5 non repeated technical interview questions for a ${topic} role at ${difficulty} difficulty. ` +
                           `Focus on ${techCategory} aspects. Return only the questions, without any numbering or introductory text.`;
    
    const hrPrompt = `Generate 5 HR interview questions for a ${topic} role at ${difficulty} difficulty. ` +
                    `Focus on ${hrCategory} aspects. Return only the questions, without any numbering or introductory text.`;

    const [technicalQuestions, hrQuestions] = await Promise.all([
        queuedRequest(technicalPrompt),
        queuedRequest(hrPrompt)
    ]);
    
    return {
        technical: technicalQuestions.map(cleanQuestionText),
        hr: hrQuestions.map(cleanQuestionText),
    };
}

  function determineDifficulty(currentSetIndex) {
    // Implement logic to determine difficulty based on currentSet or user performance
    if (currentSetIndex < 2) return "easy";
    if (currentSetIndex < 4) return "medium";
    return "hard";
  }

  // Clean Question Text
  function cleanQuestionText(text) {
    return text
      .replace(/^\d+\.?\s*/, "") // Remove leading numbers
      .replace(/\*\*/g, "") // Remove bold markers
      .replace(/^Question:\s*/i, "") // Remove question prefix
      .replace(/^["']|["']$/g, "") // Remove quotes
      .trim();
  }

  // Display Questions
  function displayQuestions() {
    technicalQuestionsDiv.innerHTML = "";
    hrQuestionsDiv.innerHTML = "";

    const questionsPerSet = 5;
    const startIndex = currentSet * questionsPerSet;
    const startQuestionNumber = startIndex + 1;

    // Check if we have enough questions for this set
    if (
      questions.technical.length <= startIndex ||
      questions.hr.length <= startIndex
    ) {
      console.error("Not enough questions available for this set");
      return;
    }

    // Display technical questions
    for (let i = 0; i < questionsPerSet; i++) {
      const questionIndex = startIndex + i;
      if (questionIndex < questions.technical.length) {
        const qNumber = startQuestionNumber + i;
        technicalQuestionsDiv.innerHTML += createQuestionElement(
          questions.technical[questionIndex],
          `technical-${qNumber}`,
          qNumber
        );
      }
    }

    // Display HR questions
    for (let i = 0; i < questionsPerSet; i++) {
      const questionIndex = startIndex + i;
      if (questionIndex < questions.hr.length) {
        const qNumber = startQuestionNumber + i;
        hrQuestionsDiv.innerHTML += createQuestionElement(
          questions.hr[questionIndex],
          `hr-${qNumber}`,
          qNumber
        );
      }
    }

    nextButton.style.display = "block";
    nextButton.disabled = false;
  }

  // Create Question Element (Modified with friend's mic button)
  function createQuestionElement(question, id, questionNumber) {
    const isBookmarked = bookmarks.some(b => b.id === id);
    return `
        <div class="question">
            <p><strong>Question ${questionNumber}:</strong> ${question}</p>
            <div class="answer-container">
                <textarea id="answer-${id}" placeholder="Type your answer here..." rows="3"></textarea>
                <button class="mic-button" data-target="answer-${id}" aria-label="Press and hold to record answer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </button>
            </div>
            <span class="bookmark-icon" data-id="${id}">
                <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
            </span>
            <div id="feedback-${id}" class="feedback"></div>
        </div>
    `;
}

  // Submit Answers
  async function submitAnswers() {
    loadingDiv.style.display = "block";
    submitButton.disabled = true;
    scores = [];

    const questionsPerSet = 5;
    const technicalQuestionsForCurrentSet = questions.technical.slice(
      currentSet * questionsPerSet,
      (currentSet + 1) * questionsPerSet
    );
    const hrQuestionsForCurrentSet = questions.hr.slice(
      currentSet * questionsPerSet,
      (currentSet + 1) * questionsPerSet
    );

    const allQuestions = [
      ...technicalQuestionsForCurrentSet,
      ...hrQuestionsForCurrentSet,
    ];

    let totalScore = 0;

    for (let i = 0; i < allQuestions.length; i++) {
      const questionType = i < questionsPerSet ? "technical" : "hr";
      const qNumber = currentSet * questionsPerSet + (i % questionsPerSet) + 1;
      const answerElement = document.getElementById(
        `answer-${questionType}-${qNumber}`
      );

      if (!answerElement) {
        console.warn(
          `Answer element not found for question ${i}, id: answer-${questionType}-${qNumber}`
        );
        continue;
      }

      const answer = answerElement.value.trim();
      if (!answer) {
        console.log(`No answer provided for question ${i}`);
        continue;
      }

      try {
        const feedback = await evaluateAnswer(allQuestions[i], answer);
        scores.push({ question: allQuestions[i], ...feedback });
        totalScore += feedback.score;

        const feedbackElement = document.getElementById(
          `feedback-${questionType}-${qNumber}`
        );
        if (feedbackElement) {
          feedbackElement.innerHTML = `
                        <p><strong>Feedback:</strong> ${feedback.comment}</p>
                        <p><strong>Score:</strong> ${feedback.score}/10</p>
                    `;
        }
      } catch (error) {
        console.error(`Error evaluating answer ${i}:`, error);
        scores.push({
          question: allQuestions[i],
          score: 0,
          comment: "Evaluation failed",
        });
      }
    }

    loadingDiv.style.display = "none";
    submitButton.disabled = false;
    showScoreSummary(totalScore);
  }

  async function generateAndDisplayNextQuestions() {
    loadingDiv.style.display = "block";
    nextButton.disabled = true;
    submitButton.disabled = true;

    try {
      const interviewTopic = document
        .getElementById("interviewTopic")
        .value.trim();
      if (!interviewTopic) {
        alert("Please enter an interview topic.");
        return;
      }

      console.log(`Generating next set of questions (set ${currentSet})`);

      // Generate new questions based on the interview topic and current set
      const newQuestions = await generateQuestions(interviewTopic, currentSet);

      // Add new questions to our existing arrays
      if (!questions.technical[currentSet * 5]) {
        questions.technical = [
          ...questions.technical,
          ...newQuestions.technical,
        ];
      }

      if (!questions.hr[currentSet * 5]) {
        questions.hr = [...questions.hr, ...newQuestions.hr];
      }

      // Clear any previous feedback and reset scores
      scores = [];
      scoreSection.style.display = "none";

      // Display the new questions
      displayQuestions();
      submitButton.style.display = "block";
    } catch (error) {
      console.error("Error generating next set of questions:", error);
      alert("Failed to generate the next set of questions. Please try again.");
      currentSet--; // Revert the set increment since we failed
    } finally {
      loadingDiv.style.display = "none";
      nextButton.disabled = false;
      submitButton.disabled = false;
    }
  }

  // Evaluate Answer
  async function evaluateAnswer(question, answer) {
    const prompt = `Evaluate this answer to "${question}":\n\n${answer}\n\nProvide a score (1-10) and brief feedback in 2-3 lines. Format your response as "Score: X. Feedback text here."`;
    const response = await queuedRequest(prompt);

    // Handle API response format
    const responseText = Array.isArray(response)
      ? response.join(" ")
      : response;
    const scoreMatch = responseText.match(/Score:\s*(\d+)/i);
    let score = scoreMatch
      ? Math.min(10, Math.max(1, parseInt(scoreMatch[1])))
      : 1;

    // Clean up feedback text - extract text after "Score: X" or use the whole text if no match
    let comment = scoreMatch
      ? responseText
          .substring(responseText.indexOf(scoreMatch[0]) + scoreMatch[0].length)
          .trim()
      : responseText;

    // Remove leading period if present
    comment = comment.replace(/^\./, "").trim();

    return {
      score,
      comment: comment || "No feedback available",
    };
  }

  function determineNextDifficulty(averageScore) {
    if (averageScore >= 8) {
      return "harder";
    } else if (averageScore >= 5) {
      return "moderate";
    } else {
      return "easier";
    }
  }

  // Show Score Summary
  function showScoreSummary(totalScore) {
    scoreTableBody.innerHTML = scores
      .map((score, index) => {
        return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${score.question}</td>
                    <td>${score.score}/10</td>
                    <td>${score.comment}</td>
                </tr>
            `;
      })
      .join("");

    // Calculate category averages
    const techScores = scores.slice(0, 5).map((s) => s.score);
    const hrScores = scores.slice(5).map((s) => s.score);
    const techAverage =
      techScores.reduce((a, b) => a + b, 0) / techScores.length;
    const hrAverage = hrScores.reduce((a, b) => a + b, 0) / hrScores.length;
    const overallAverage = (techAverage + hrAverage) / 2;

    // Add total score row
    const totalPossible = scores.length * 10;
    scoreTableBody.innerHTML += `
            <tr class="total-score">
                <td colspan="4">Total Score: ${totalScore}/${totalPossible}</td>
            </tr>
            <tr class="analysis-row">
                <td colspan="4">
                    <div class="score-analysis">
                        <h3>Performance Analysis</h3>
                        
                        <!-- Bar Graph Visualization -->
                        <div class="bar-graph-container">
                            <div class="bar-graph">
                                <div class="bar technical" style="width: ${
                                  techAverage * 10
                                }%">
                                    <span>Technical: ${techAverage.toFixed(
                                      1
                                    )}/10</span>
                                </div>
                                <div class="bar hr" style="width: ${
                                  hrAverage * 10
                                }%">
                                    <span>HR: ${hrAverage.toFixed(1)}/10</span>
                                </div>
                                <div class="bar overall" style="width: ${
                                  overallAverage * 10
                                }%">
                                    <span>Overall: ${overallAverage.toFixed(
                                      1
                                    )}/10</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Performance Analysis -->
                        <div class="performance-details">
                            <div class="performance-category technical">
                                <h4>Technical Skills</h4>
                                <p>Average Score: ${techAverage.toFixed(
                                  1
                                )}/10</p>
                                ${generateStrengthsWeaknesses(
                                  scores.slice(0, 5)
                                )}
                            </div>
                            <div class="performance-category hr">
                                <h4>Soft Skills</h4>
                                <p>Average Score: ${hrAverage.toFixed(1)}/10</p>
                                ${generateStrengthsWeaknesses(scores.slice(5))}
                            </div>
                            <div class="performance-summary">
                                <h4>Summary</h4>
                                <p>${getPerformanceSummary(
                                  techAverage,
                                  hrAverage
                                )}</p>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;

    scoreSection.style.display = "block";
    nextButton.style.display = "block";
    loadSuggestedAnswers();
  }
  async function loadSuggestedAnswers() {
    const answerElements = document.querySelectorAll(".answer-content");

    for (const element of answerElements) {
      const question = decodeURIComponent(element.dataset.question);
      const prompt = `Provide a concise model answer (3-4 lines) for this interview question: "${question}". 
            The answer should be professional, structured, and directly address the question.`;

      try {
        const response = await queuedRequest(prompt);
        const answer = Array.isArray(response) ? response.join(" ") : response;
        element.innerHTML = `<p>${answer.replace(/\n/g, "<br>")}</p>`;
      } catch (error) {
        console.error("Error generating suggested answer:", error);
        element.innerHTML = `<p class="error">Could not generate suggested answer. Please try again.</p>`;
      }
    }
  }

  function generateStrengthsWeaknesses(scores) {
    const strengths = scores.filter((s) => s.score >= 8);
    const weaknesses = scores.filter((s) => s.score <= 5);

    let html = "";

    if (strengths.length > 0) {
      html += `<div class="strengths"><h5>Strengths:</h5><ul>`;
      strengths.forEach((item) => {
        html += `<li><strong>${item.question}</strong> (Score: ${item.score}/10) - ${item.comment}</li>`;
      });
      html += `</ul></div>`;
    }

    if (weaknesses.length > 0) {
      html += `<div class="weaknesses"><h5>Areas to Improve:</h5><ul>`;
      weaknesses.forEach((item) => {
        // Generate a prompt for the question
        const improvementPrompt = `Provide a model answer (3-4 lines) for this interview question: "${item.question}". 
                Focus on clarity, structure, and relevance to the role.`;

        html += `
                    <li>
                        <strong>${item.question}</strong>
                        <div class="suggested-answer">
                            <p>Model answer:</p>
                            <div class="answer-content" data-question="${encodeURIComponent(
                              item.question
                            )}">
                                <div class="loading-dots-small"></div>
                            </div>
                        </div>
                    </li>`;
      });
      html += `</ul></div>`;
    }

    return html;
  }

  // Helper function to generate performance summary
  function getPerformanceSummary(techAvg, hrAvg) {
    if (techAvg >= 8 && hrAvg >= 8) {
      return "Excellent performance across both technical and soft skills!";
    } else if (techAvg >= 8) {
      return "Strong technical skills demonstrated. Could work on communication aspects.";
    } else if (hrAvg >= 8) {
      return "Excellent soft skills. Consider strengthening technical knowledge.";
    } else if (techAvg >= 6 && hrAvg >= 6) {
      return "Good overall performance with room for improvement in both areas.";
    } else {
      return "Significant room for improvement. Focus on practicing both technical and soft skills.";
    }
  }

  function calculateAverageScore(scores) {
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, { score }) => sum + score, 0);
    return total / scores.length;
  }

  // Reset Interview
  function resetInterview() {
    console.log("Resetting interview...");
    window.location.reload();
  }

  // Queue Requests
  async function queuedRequest(prompt) {
    return new Promise((resolve, reject) => {
      requestQueue.push({ prompt, resolve, reject });
      processQueue();
    });
  }

  // Process Queue
  async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    isProcessingQueue = true;

    const { prompt, resolve, reject } = requestQueue.shift();
    try {
      const result = await getGeminiResponse(prompt);
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Add delay before processing next request
    await new Promise((r) => setTimeout(r, REQUEST_DELAY));
    isProcessingQueue = false;
    processQueue();
  }

  // Get Gemini Response
  async function getGeminiResponse(prompt, retryCount = 0) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
      const now = Date.now();
      const timeSinceLast = now - lastRequestTime;
      if (timeSinceLast < REQUEST_DELAY) {
        await new Promise((r) => setTimeout(r, REQUEST_DELAY - timeSinceLast));
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      lastRequestTime = Date.now();

      if (!response.ok) {
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const delay = 5000 * (retryCount + 1);
          console.warn(`Rate limited. Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          return getGeminiResponse(prompt, retryCount + 1);
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text
        .split("\n")
        .filter((q) => q.trim() !== "");
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }
});