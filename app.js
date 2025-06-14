import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    set, 
    onValue 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDVszBM0A89MND9nnuLQyyfqEqUYgFvXG0",
    authDomain: "fir-68576.firebaseapp.com",
    databaseURL: "https://fir-68576-default-rtdb.firebaseio.com",
    projectId: "fir-68576",
    storageBucket: "fir-68576.firebasestorage.app",
    messagingSenderId: "974193542526",
    appId: "1:974193542526:web:4f7679ff82a59f622c5f2f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM elements
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const statusDiv = document.getElementById('status');
const submissionList = document.getElementById('submissionList');

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    
    // Validate inputs
    if (!name || !email || !message) {
        showStatus('All fields are required', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showStatus('Please enter a valid email', 'error');
        return;
    }

    try {
        // Show loading state
        submitBtn.disabled = true;
        showStatus('Submitting...', '');
        
        // Create new submission
        const newSubmissionRef = push(ref(db, 'submissions'));
        
        await set(newSubmissionRef, {
            name,
            email,
            message,
            timestamp: Date.now()
        });
        
        showStatus('Submission successful!', 'success');
        form.reset();
    } catch (error) {
        console.error('Submission error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
    }
});

// Display status messages
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type || '';
}

// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Real-time submission display
function setupRealtimeListener() {
    const submissionsRef = ref(db, 'submissions');
    
    onValue(submissionsRef, (snapshot) => {
        const data = snapshot.val();
        submissionList.innerHTML = '';
        
        if (data) {
            // Convert to array and sort by timestamp (newest first)
            const submissions = Object.entries(data)
                .map(([id, submission]) => ({ id, ...submission }))
                .sort((a, b) => b.timestamp - a.timestamp);
            
            // Display up to 5 most recent submissions
            submissions.slice(0, 5).forEach(sub => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <strong>${sub.name}</strong> (${new Date(sub.timestamp).toLocaleString()})
                    <p>${sub.message}</p>
                `;
                submissionList.appendChild(li);
            });
        } else {
            submissionList.innerHTML = '<li>No submissions yet</li>';
        }
    });
}

// Initialize
setupRealtimeListener();