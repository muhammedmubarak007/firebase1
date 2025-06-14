import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Firebase configuration
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
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const authContainer = document.getElementById('auth-container');
const adminContainer = document.getElementById('admin-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const itemForm = document.getElementById('item-form');
const itemsList = document.getElementById('items-list');
const cancelEditBtn = document.getElementById('cancel-edit');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const itemIdInput = document.getElementById('item-id');
const userEmailDisplay = document.getElementById('user-email');

// App State
let currentUser = null;
let isEditing = false;

// Helper Functions
function resetForm() {
    itemForm.reset();
    itemIdInput.value = '';
    isEditing = false;
    formTitle.textContent = 'Add New Item';
    submitBtn.textContent = 'Add Item';
    cancelEditBtn.style.display = 'none';
}

function cancelEdit() {
    resetForm();
}

function showAuthPanel() {
    authContainer.style.display = 'block';
    adminContainer.style.display = 'none';
    resetForm();
}

function showAdminPanel() {
    authContainer.style.display = 'none';
    adminContainer.style.display = 'block';
}

function verifyUserAuthenticated() {
    if (!currentUser) {
        throw new Error("User not authenticated");
    }
}

// Item Management Functions
async function saveItemToFirestore(id, name, price, description) {
    verifyUserAuthenticated();
    
    const itemData = {
        name,
        price,
        description: description || null,
        userId: currentUser.uid, // Critical for security
        updatedAt: serverTimestamp()
    };
    
    console.log("Saving item data:", { id, ...itemData });

    if (id) {
        await updateDoc(doc(db, 'menuItems', id), itemData);
    } else {
        itemData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'menuItems'), itemData);
    }
}

async function deleteItem(itemId) {
    verifyUserAuthenticated();
    
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const docRef = doc(db, 'menuItems', itemId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("Item not found");
        }
        
        if (docSnap.data().userId !== currentUser.uid) {
            throw new Error("You can only delete your own items");
        }
        
        await deleteDoc(docRef);
        await loadUserItems();
        alert("Item deleted successfully");
    } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete item: " + error.message);
    }
}

async function editItem(id) {
    verifyUserAuthenticated();
    
    try {
        const docRef = doc(db, 'menuItems', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("Item not found");
        }
        
        const item = docSnap.data();
        
        if (item.userId !== currentUser.uid) {
            throw new Error("You can only edit your own items");
        }
        
        document.getElementById('item-id').value = id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-description').value = item.description || '';
        
        isEditing = true;
        formTitle.textContent = 'Edit Item';
        submitBtn.textContent = 'Update Item';
        cancelEditBtn.style.display = 'block';
    } catch (error) {
        console.error("Edit error:", error);
        alert("Error editing item: " + error.message);
    }
}

async function loadUserItems() {
    if (!currentUser) {
        itemsList.innerHTML = '<tr><td colspan="4" class="loading-message">Please login to view items</td></tr>';
        return;
    }
    
    itemsList.innerHTML = '<tr><td colspan="4" class="loading-message">Loading your items...</td></tr>';

    try {
        const q = query(
            collection(db, 'menuItems'),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            itemsList.innerHTML = '<tr><td colspan="4" class="loading-message">No items found. Add your first item!</td></tr>';
            return;
        }

        itemsList.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.description || '-'}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-warning edit-btn me-2" data-id="${doc.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${doc.id}">Delete</button>
                </td>
            `;
            itemsList.appendChild(row);
        });

        // Add event listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editItem(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteItem(btn.dataset.id));
        });

    } catch (error) {
        console.error("Load error details:", {
            message: error.message,
            code: error.code,
            user: currentUser?.uid
        });
        itemsList.innerHTML = `
            <tr>
                <td colspan="4" class="error-message text-center py-4">
                    Error loading items: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Form Handlers
async function handleItemSubmit(e) {
    e.preventDefault();
    
    try {
        verifyUserAuthenticated();
        
        const name = document.getElementById('item-name').value.trim();
        const price = parseFloat(document.getElementById('item-price').value);
        const description = document.getElementById('item-description').value.trim();
        
        if (!name || isNaN(price)) {
            throw new Error("Name and valid price are required");
        }
        
        if (isEditing) {
            await saveItemToFirestore(itemIdInput.value, name, price, description);
        } else {
            await saveItemToFirestore(null, name, price, description);
        }
        
        resetForm();
        await loadUserItems();
    } catch (error) {
        console.error("Submit error:", error);
        alert('Operation failed: ' + error.message);
    }
}

// Auth Handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login error:", error);
        alert('Login failed: ' + error.message);
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
        alert('Logout failed: ' + error.message);
    }
}

// Initialize App
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    itemForm.addEventListener('submit', handleItemSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
}

function init() {
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.uid : "None");
        if (user) {
            currentUser = user;
            userEmailDisplay.textContent = user.email;
            showAdminPanel();
            loadUserItems();
        } else {
            showAuthPanel();
        }
    });

    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);