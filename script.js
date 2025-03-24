document.addEventListener("DOMContentLoaded", function () {
    const GEMINI_API_KEY = 'AIzaSyBlPQqUB4dveIKl3c9PebtjYqY_2O_m0dU'; // Replace with your API key
    const startButton = document.getElementById('startInterview');
    const submitButton = document.getElementById('submitAnswers');
    const nextButton = document.getElementById('nextQuestions');
    const stopButton = document.getElementById('stopInterview');
    const loadingDiv = document.getElementById('loading');
   
    const questionSection = document.getElementById('questionSection');
    const technicalQuestionsDiv = document.getElementById('technicalQuestions');
    const hrQuestionsDiv = document.getElementById('hrQuestions');
    const scoreSection = document.getElementById('scoreSection');
    const scoreTableBody = document.querySelector("#scoreTable tbody");

    const bookmarkList = document.getElementById('bookmarkList');  // For displaying bookmarked questions
    let bookmarks = JSON.parse(localStorage.getItem('bookmarkedQuestions')) || [];


    // Rate limiting configuration
    const REQUEST_DELAY = 2000; // 2 seconds between requests
    const MAX_RETRIES = 3;
    let lastRequestTime = 0;
    let requestQueue = [];
    let isProcessingQueue = false;


    let questions = { technical: [], hr: [] };
    let scores = [];
    let currentSet = 0;


    // Event Listeners
    startButton.addEventListener('click', () => {
        console.log('Start Interview clicked');
        startInterview();
    });


    submitButton.addEventListener('click', () => {
        console.log('Submit Answers clicked');
        submitAnswers();
    });


    nextButton.addEventListener('click', async () => {
        console.log('Next Questions clicked');
        currentSet++;
        await generateAndDisplayNextQuestions();
    });


    stopButton.addEventListener('click', () => {
        console.log('Stop Interview clicked');
        resetInterview();
    });


    // Start Interview
    async function startInterview() {
        const interviewTopic = document.getElementById('interviewTopic').value.trim();
        if (!interviewTopic) {
            alert("Please enter an interview topic.");
            return;
        }


        loadingDiv.style.display = 'block';
        startButton.disabled = true;


        try {
            questions = await generateQuestions(interviewTopic, currentSet);
            displayQuestions();
           
            startButton.style.display = 'none';
            questionSection.style.display = 'block';
            submitButton.style.display = 'block';
            stopButton.style.display = 'block';
        } catch (error) {
            console.error("Error generating questions:", error);
            alert("Failed to generate questions. Please try again.");
        } finally {
            loadingDiv.style.display = 'none';
            startButton.disabled = false;
        }
    }


    // Generate Questions
    async function generateQuestions(topic, currentSetIndex = 0) {
        const difficulty = determineDifficulty(currentSetIndex);
        console.log(`Generating ${difficulty} questions for set ${currentSetIndex}`);
       
        const technicalPrompt = `Generate 5 technical interview questions for a ${topic} role at ${difficulty} difficulty. Return only the questions, without any numbering or introductory text.`;
        const hrPrompt = `Generate 5 HR interview questions for a ${topic} role at ${difficulty} difficulty. Return only the questions, without any numbering or introductory text.`;
   
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
        if (currentSetIndex < 2) return 'easy';
        if (currentSetIndex < 4) return 'medium';
        return 'hard';
    }


    // Clean Question Text
    function cleanQuestionText(text) {
        return text
            .replace(/^\d+\.?\s*/, '') // Remove leading numbers
            .replace(/\*\*/g, '')       // Remove bold markers
            .replace(/^Question:\s*/i, '') // Remove question prefix
            .replace(/^["']|["']$/g, '')  // Remove quotes
            .trim();
    }


    // Display Questions
    function displayQuestions() {
        technicalQuestionsDiv.innerHTML = '';
        hrQuestionsDiv.innerHTML = '';
   
        const questionsPerSet = 5;
        const startIndex = currentSet * questionsPerSet;
        const startQuestionNumber = startIndex + 1;
   
        // Check if we have enough questions for this set
        if (questions.technical.length <= startIndex || questions.hr.length <= startIndex) {
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
   
        nextButton.style.display = 'block';
        nextButton.disabled = false;
    }

    // Function to set a cookie (with expiration)
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000)); // Cookie expiration
        const expires = "expires=" + date.toUTCString();
        document.cookie = `${name}=${value};${expires};path=/`;
    }

    // Function to get a cookie by name
    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                return cookie.substring(name.length + 1);
            }
        }
        return "";
    }

    function toggleBookmark(question, id, icon) {
        let bookmarkedQuestions = JSON.parse(decodeURIComponent(getCookie("bookmarks") || "[]"));
    
        if (bookmarkedQuestions.includes(question)) {
            bookmarkedQuestions = bookmarkedQuestions.filter(q => q !== question);
            icon.classList.remove("fas");
            icon.classList.add("far");
        } else {
            bookmarkedQuestions.push(question);
            icon.classList.remove("far");
            icon.classList.add("fas");
        }
    
        setCookie("bookmarks", encodeURIComponent(JSON.stringify(bookmarkedQuestions)), 7);
    }
    

    function restoreBookmarks() {
        const bookmarkedQuestions = JSON.parse(decodeURIComponent(getCookie("bookmarks") || "[]"));
        
        document.querySelectorAll('.question').forEach(questionElement => {
            const questionText = questionElement.querySelector('p').innerText.split(": ")[1];
            const bookmarkIcon = questionElement.querySelector('.bookmark-icon');
    
            if (bookmarkedQuestions.includes(questionText)) {
                bookmarkIcon.classList.remove("far");
                bookmarkIcon.classList.add("fas");
            }
        });
    }
    

    window.onload = restoreBookmarks;
    window.toggleBookmark = toggleBookmark;

    // Create Question Element
    function createQuestionElement(question, id, questionNumber) {
        const bookmarkedQuestions = JSON.parse(getCookie("bookmarks") || "[]");
        const isBookmarked = bookmarkedQuestions.includes(question);

        return `
            <div class="question">
                <p><strong>Question ${questionNumber}:</strong> ${question}</p>
                <textarea id="answer-${id}" placeholder="Type your answer here..." rows="3"></textarea>
                <!-- Bookmark Icon with dynamic class -->
                <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark bookmark-icon" aria-label="Bookmark this question" 
   onclick="toggleBookmark('${question}', '${id}', this)"></i>
                <div id="feedback-${id}" class="feedback"></div>
            </div>
        `;
    }

    // Submit Answers
    async function submitAnswers() {
        loadingDiv.style.display = 'block';
        submitButton.disabled = true;
        scores = [];
       
        const questionsPerSet = 5;
        const technicalQuestionsForCurrentSet = questions.technical.slice(currentSet * questionsPerSet, (currentSet + 1) * questionsPerSet);
        const hrQuestionsForCurrentSet = questions.hr.slice(currentSet * questionsPerSet, (currentSet + 1) * questionsPerSet);
       
        const allQuestions = [
            ...technicalQuestionsForCurrentSet,
            ...hrQuestionsForCurrentSet
        ];


        let totalScore = 0;


        for (let i = 0; i < allQuestions.length; i++) {
            const questionType = i < questionsPerSet ? 'technical' : 'hr';
            const qNumber = currentSet * questionsPerSet + (i % questionsPerSet) + 1;
            const answerElement = document.getElementById(`answer-${questionType}-${qNumber}`);
           
            if (!answerElement) {
                console.warn(`Answer element not found for question ${i}, id: answer-${questionType}-${qNumber}`);
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


                const feedbackElement = document.getElementById(`feedback-${questionType}-${qNumber}`);
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
                    comment: 'Evaluation failed'
                });
            }
        }


        loadingDiv.style.display = 'none';
        submitButton.disabled = false;
        showScoreSummary(totalScore);
    }
   
    async function generateAndDisplayNextQuestions() {
        loadingDiv.style.display = 'block';
        nextButton.disabled = true;
        submitButton.disabled = true;
   
        try {
            const interviewTopic = document.getElementById('interviewTopic').value.trim();
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
                    ...newQuestions.technical
                ];
            }
           
            if (!questions.hr[currentSet * 5]) {
                questions.hr = [
                    ...questions.hr,
                    ...newQuestions.hr
                ];
            }
           
            // Clear any previous feedback and reset scores
            scores = [];
            scoreSection.style.display = 'none';
           
            // Display the new questions
            displayQuestions();
            submitButton.style.display = 'block';
        } catch (error) {
            console.error("Error generating next set of questions:", error);
            alert("Failed to generate the next set of questions. Please try again.");
            currentSet--; // Revert the set increment since we failed
        } finally {
            loadingDiv.style.display = 'none';
            nextButton.disabled = false;
            submitButton.disabled = false;
        }
    }
   
    // Evaluate Answer
    async function evaluateAnswer(question, answer) {
        const prompt = `Evaluate this answer to "${question}":\n\n${answer}\n\nProvide a score (1-10) and brief feedback. Format your response as "Score: X. Feedback text here."`;
        const response = await queuedRequest(prompt);
       
        // Handle API response format
        const responseText = Array.isArray(response) ? response.join(' ') : response;
        const scoreMatch = responseText.match(/Score:\s*(\d+)/i);
        let score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 1;
       
        // Clean up feedback text - extract text after "Score: X" or use the whole text if no match
        let comment = scoreMatch
            ? responseText.substring(responseText.indexOf(scoreMatch[0]) + scoreMatch[0].length).trim()
            : responseText;
           
        // Remove leading period if present
        comment = comment.replace(/^\./, '').trim();
   
        return {
            score,
            comment: comment || 'No feedback available'
        };
    }    
   
    function determineNextDifficulty(averageScore) {
        if (averageScore >= 8) {
            return 'harder';
        } else if (averageScore >= 5) {
            return 'moderate';
        } else {
            return 'easier';
        }
    }


    // Show Score Summary
    function showScoreSummary(totalScore) {
        scoreTableBody.innerHTML = scores.map((score, index) => {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${score.question}</td>
                    <td>${score.score}/10</td>
                    <td>${score.comment}</td>
                </tr>
            `;
        }).join('');


        // Add total score row
        scoreTableBody.innerHTML += `
            <tr class="total-score">
                <td colspan="4">Total Score: ${totalScore}/${scores.length * 10}</td>
            </tr>
        `;


        scoreSection.style.display = 'block';
        nextButton.style.display = 'block';
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
        await new Promise(r => setTimeout(r, REQUEST_DELAY));
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
                await new Promise(r => setTimeout(r, REQUEST_DELAY - timeSinceLast));
            }


            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            });


            lastRequestTime = Date.now();
           
            if (!response.ok) {
                if (response.status === 429 && retryCount < MAX_RETRIES) {
                    const delay = 5000 * (retryCount + 1);
                    console.warn(`Rate limited. Retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    return getGeminiResponse(prompt, retryCount + 1);
                }
                throw new Error(`API Error: ${response.status}`);
            }


            const data = await response.json();
            return data.candidates[0].content.parts[0].text
                .split('\n')
                .filter(q => q.trim() !== '');
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }
});

