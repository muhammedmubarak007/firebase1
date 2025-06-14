import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDVszBM0A89MND9nnuLQyyfqEqUYgFvXG0",
    authDomain: "fir-68576.firebaseapp.com",
    databaseURL: "https://fir-68576-default-rtdb.firebaseio.com", // THIS WAS MISSING
    projectId: "fir-68576",
    storageBucket: "fir-68576.firebasestorage.app",
    messagingSenderId: "974193542526",
    appId: "1:974193542526:web:4f7679ff82a59f622c5f2f",
    measurementId: "G-63G58BYVHS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM elements
const form = document.getElementById('dataForm');
const statusDiv = document.getElementById('status');

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    
    // Clear previous status
    statusDiv.className = '';
    statusDiv.textContent = '';
    
    try {
        // Show loading state
        form.querySelector('button').disabled = true;
        
        // Create a new reference with an auto-generated ID
        const newDataRef = push(ref(db, 'submissions'));
        
        // Set the data at the new reference
        await set(newDataRef, {
            name,
            email,
            message,
            timestamp: Date.now()
        });
        
        // Show success message
        statusDiv.textContent = 'Data submitted successfully!';
        statusDiv.classList.add('success');
        
        // Reset form
        form.reset();
    } catch (error) {
        console.error('Error submitting data:', error);
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.classList.add('error');
    } finally {
        // Re-enable button
        form.querySelector('button').disabled = false;
    }
});