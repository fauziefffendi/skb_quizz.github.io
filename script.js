let currentQuestionIndex = 0;
let questions = [];
let userAnswers = [];
let timer;
let startTime;

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    document.getElementById(pageId).style.display = 'block';
}

document.getElementById('welcomeForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    localStorage.setItem('username', username);
    showPage('quizSetupPage');
});

document.getElementById('quizForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const subject = document.getElementById('subject').value;
    const questionCount = parseInt(document.getElementById('questionCount').value, 10);
    const questionType = document.getElementById('questionType').value;

    localStorage.setItem('subject', subject);
    localStorage.setItem('questionCount', questionCount);
    localStorage.setItem('questionType', questionType);

    fetch(`./quest/${subject}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error('File JSON tidak ditemukan');
            }
            return response.json();
        })
        .then(data => {
            const shuffled = data.sort(() => Math.random() - 0.5);

            if (questionType === 'optional') {
                questions = shuffled.filter(q => q.option1 && q.option2 && q.option3 && q.option4).slice(0, questionCount);
            } else {
                questions = shuffled.filter(q => !q.option1 && !q.option2 && !q.option3 && !q.option4).slice(0, questionCount);
            }

            if (questions.length === 0) {
                throw new Error('Tidak ada soal yang sesuai dengan jenis yang dipilih.');
            }

            userAnswers = Array(questions.length).fill(null);
            startTime = new Date();
            startTimer(questionCount * 35);
            showPage('quizPage');
            displayQuestion();
        })
        .catch(error => {
            console.error('Error fetching questions:', error);
            alert(error.message);
        });
});

function displayQuestion() {
    const question = questions[currentQuestionIndex];
    const questionContainer = document.getElementById('questionContainer');

    let optionsHTML = '';
    if (localStorage.getItem('questionType') === 'optional') {
        const options = [question.option1, question.option2, question.option3, question.option4];
        options.forEach((option, idx) => {
            const isChecked = userAnswers[currentQuestionIndex] === option ? 'checked' : '';
            optionsHTML += `
                <label>
                    <input type="radio" name="answer" value="${option}" ${isChecked}>
                    ${option}
                    ${question[`option${idx + 1}Image`] ? `<img src="${question[`option${idx + 1}Image`]}" alt="Option ${idx + 1} Image" style="max-width: 100%; height: auto;">` : ''}
                </label><br>
            `;
        });
    } else {
        const answerValue = userAnswers[currentQuestionIndex] || '';
        optionsHTML = `<input type="text" id="answerInput" value="${answerValue}">`;
    }

    questionContainer.innerHTML = `
        <h2>${question.question}</h2>
        ${question.questionImage ? `<img src="${question.questionImage}" alt="Question Image" style="max-width: 100%; height: auto;">` : ''}
        ${optionsHTML}
    `;

    document.getElementById('prevButton').style.display = currentQuestionIndex === 0 ? 'none' : 'inline';
    document.getElementById('nextButton').style.display = currentQuestionIndex === questions.length - 1 ? 'none' : 'inline';
    document.getElementById('finishButton').style.display = currentQuestionIndex === questions.length - 1 ? 'inline' : 'none';
}

document.getElementById('prevButton').addEventListener('click', function() {
    saveAnswer();
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
});

document.getElementById('nextButton').addEventListener('click', function() {
    saveAnswer();
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
});

document.getElementById('finishButton').addEventListener('click', function() {
    saveAnswer();
    clearInterval(timer);
    calculateScore();
});

function saveAnswer() {
    if (localStorage.getItem('questionType') === 'optional') {
        const selectedOption = document.querySelector('input[name="answer"]:checked');
        userAnswers[currentQuestionIndex] = selectedOption ? selectedOption.value : null;
    } else {
        const answerInput = document.getElementById('answerInput');
        userAnswers[currentQuestionIndex] = answerInput ? answerInput.value.trim().toLowerCase() : '';
    }
}

function calculateScore() {
    let correctAnswers = 0;
    let blankAnswers = 0;

    questions.forEach((question, index) => {
        const userAnswer = userAnswers[index]?.trim().toLowerCase();
        const correctAnswer = question.answer.trim().toLowerCase();

        if (!userAnswer) {
            blankAnswers++;
        } else if (userAnswer === correctAnswer) {
            correctAnswers++;
        }
    });

    const score = correctAnswers * 5;
    const totalQuestions = questions.length;
    const wrongAnswers = totalQuestions - correctAnswers - blankAnswers;

    const endTime = new Date();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    const timeFormatted = `${minutes}m ${seconds}s`;

    localStorage.setItem('score', score);
    localStorage.setItem('correctAnswers', correctAnswers);
    localStorage.setItem('wrongAnswers', wrongAnswers);
    localStorage.setItem('blankAnswers', blankAnswers);
    localStorage.setItem('timeTaken', timeFormatted);

    document.getElementById('score').textContent = score;
    document.getElementById('correctAnswers').textContent = correctAnswers;
    document.getElementById('wrongAnswers').textContent = wrongAnswers;
    document.getElementById('blankAnswers').textContent = blankAnswers;
    document.getElementById('timeTaken').textContent = timeFormatted;

    showPage('resultsPage');
}

document.getElementById('explanationButton').addEventListener('click', function() {
    showPage('explanationPage');
    displayExplanation();
});

function displayExplanation() {
    const explanationContainer = document.getElementById('explanationContainer');
    explanationContainer.innerHTML = '';

    questions.forEach((question, index) => {
        const userAnswer = userAnswers[index] ?? '(No Answer)';
        const isCorrect = userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();

        explanationContainer.innerHTML += `
            <div class="question">
                <h2>${question.question}</h2>
                ${question.questionImage ? `<img src="${question.questionImage}" alt="Question Image" style="max-width: 100%; height: auto;">` : ''}
                <p>Your Answer: <span style="color: ${isCorrect ? 'green' : 'red'};">${userAnswer}</span></p>
                <p>Correct Answer: <span style="color: green;">${question.answer}</span></p>
                ${question.answerImage ? `<img src="${question.answerImage}" alt="Correct Answer Image" style="max-width: 100%; height: auto;">` : ''}
                <p>Explanation: ${question.explanation}</p>
            </div>
        `;
    });
}

document.getElementById('replayButton').addEventListener('click', function() {
    resetQuiz();
    showPage('quizSetupPage');
});

document.getElementById('replayButton2').addEventListener('click', function() {
    resetQuiz();
    showPage('quizSetupPage');
});

document.getElementById('backButton').addEventListener('click', function() {
    showPage('resultsPage');
});

function resetQuiz() {
    currentQuestionIndex = 0;
    questions = [];
    userAnswers = [];
    clearInterval(timer);
}

function startTimer(duration) {
    let timerDisplay = document.getElementById('timer');
    let timerValue = duration;

    timer = setInterval(function() {
        const minutes = String(Math.floor(timerValue / 60)).padStart(2, '0');
        const seconds = String(timerValue % 60).padStart(2, '0');

        timerDisplay.textContent = `Time: ${minutes}:${seconds}`;

        if (--timerValue < 0) {
            clearInterval(timer);
            calculateScore();
        }
    }, 1000);
}