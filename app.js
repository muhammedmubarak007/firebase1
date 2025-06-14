import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDVszBM0A89MND9nnuLQyyfqEqUYgFvXG0",
    authDomain: "fir-68576.firebaseapp.com",
    databaseURL: "https://fir-68576-default-rtdb.firebaseio.com",
    projectId: "fir-68576",
    storageBucket: "fir-68576.firebasestorage.app",
    messagingSenderId: "974193542526",
    appId: "1:974193542526:web:4f7679ff82a59f622c5f2f",
    measurementId: "G-63G58BYVHS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// DOM elements
const form = document.getElementById('dataForm');
const submitBtn = document.getElementById('submitBtn');
const statusDiv = document.getElementById('status');

// Test database connection
async function testConnection() {
    try {
        const testRef = ref(database, 'connection_test');
        await set(testRef, {
            timestamp: Date.now(),
            message: "Connection test"
        });
        return true;
    } catch (error) {
        console.error("Connection test failed:", error);
        showStatus(`Database connection error: ${error.message}`, 'error');
        return false;
    }
}

// Show status message
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
}

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate connection first
    const isConnected = await testConnection();
    if (!isConnected) return;
    
    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    
    // Basic validation
    if (!name || !email) {
        showStatus('Name and email are required', 'error');
        return;
    }

    // Disable button during submission
    submitBtn.disabled = true;
    showStatus('Submitting data...', '');

    try {
        // Create a new reference with an auto-generated ID
        const newDataRef = push(ref(database, 'submissions'));
        
        // Set the data at the new reference
        await set(newDataRef, {
            name,
            email,
            message: message || 'No message provided',
            timestamp: Date.now()
        });
        
        showStatus('Data submitted successfully!', 'success');
        form.reset();
    } catch (error) {
        console.error('Submission error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
    }
});

// Initial connection test when page loads
document.addEventListener('DOMContentLoaded', async () => {
    await testConnection();
});