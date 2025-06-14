import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Firebase configuration (no databaseURL needed for Firestore)
const firebaseConfig = {
    apiKey: "AIzaSyDVszBM0A89MND9nnuLQyyfqEqUYgFvXG0",
    authDomain: "fir-68576.firebaseapp.com",
    projectId: "fir-68576",
    storageBucket: "fir-68576.firebasestorage.app",
    messagingSenderId: "974193542526",
    appId: "1:974193542526:web:4f7679ff82a59f622c5f2f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
        
        // Add document to Firestore
        await addDoc(collection(db, "submissions"), {
            name,
            email,
            message,
            timestamp: serverTimestamp() // Firebase server-side timestamp
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
    const q = query(
        collection(db, "submissions"),
        orderBy("timestamp", "desc"),
        limit(5)
    );
    
    onSnapshot(q, (querySnapshot) => {
        submissionList.innerHTML = '';
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const card = document.createElement('div');
                card.className = 'submission-card';
                card.innerHTML = `
                    <h3>${data.name}</h3>
                    <p><strong>Email:</strong> ${data.email}</p>
                    <p><strong>Message:</strong> ${data.message}</p>
                    <small>${data.timestamp?.toDate().toLocaleString() || 'Pending timestamp'}</small>
                `;
                submissionList.appendChild(card);
            });
        } else {
            submissionList.innerHTML = '<p>No submissions yet</p>';
        }
    });
}

// Initialize
setupRealtimeListener();