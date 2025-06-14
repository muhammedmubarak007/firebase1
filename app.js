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

// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
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

// Initialize App
function init() {
    setupAuthListener();
    setupEventListeners();
}

// Auth State Listener
function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            userEmailDisplay.textContent = user.email;
            showAdminPanel();
            loadUserItems();
        } else {
            showAuthPanel();
        }
    });
}

// Event Listeners
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    itemForm.addEventListener('submit', handleItemSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
}

// Show/Hide Panels
function showAuthPanel() {
    authContainer.style.display = 'block';
    adminContainer.style.display = 'none';
    resetForm();
}

function showAdminPanel() {
    authContainer.style.display = 'none';
    adminContainer.style.display = 'block';
}

// Authentication Handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
}

// Item Management
async function loadUserItems() {
    if (!currentUser) return;
    
    itemsList.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading your items...</td></tr>';

    try {
        const q = query(
            collection(db, 'menuItems'),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        itemsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            itemsList.innerHTML = '<tr><td colspan="4" class="text-center py-4">No items found. Add your first item!</td></tr>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-btn me-2" data-id="${doc.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${doc.id}">Delete</button>
                </td>
            `;
            itemsList.appendChild(row);
        });

        // Add event listeners after creating rows
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editItem(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteItem(btn.dataset.id));
        });

    } catch (error) {
        console.error("Error loading items: ", error);
        itemsList.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error loading items: ${error.message}</td></tr>`;
    }
}

async function handleItemSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('item-name').value.trim();
    const price = parseFloat(document.getElementById('item-price').value);
    const description = document.getElementById('item-description').value.trim();
    
    if (!name || isNaN(price)) {
        alert('Please provide at least name and price');
        return;
    }
    
    try {
        if (isEditing) {
            await updateItem(itemIdInput.value, name, price, description);
        } else {
            await addItem(name, price, description);
        }
        resetForm();
        await loadUserItems();
    } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item: ' + error.message);
    }
}

async function addItem(name, price, description) {
    if (!currentUser) throw new Error("User not authenticated");
    
    await addDoc(collection(db, 'menuItems'), {
        name,
        price,
        description: description || null,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

async function updateItem(id, name, price, description) {
    if (!currentUser) throw new Error("User not authenticated");
    
    await updateDoc(doc(db, 'menuItems', id), {
        name,
        price,
        description: description || null,
        updatedAt: serverTimestamp()
    });
}

async function editItem(id) {
    try {
        const docRef = doc(db, 'menuItems', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            alert("Item not found");
            return;
        }
        
        const item = docSnap.data();
        
        // Verify ownership
        if (item.userId !== currentUser.uid) {
            alert("You can only edit your own items");
            return;
        }
        
        itemIdInput.value = id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-description').value = item.description || '';
        
        isEditing = true;
        formTitle.textContent = 'Edit Item';
        submitBtn.textContent = 'Update Item';
        cancelEditBtn.style.display = 'block';
    } catch (error) {
        console.error('Error editing item:', error);
        alert('Error editing item: ' + error.message);
    }
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const docRef = doc(db, 'menuItems', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            alert("Item not found");
            return;
        }
        
        // Verify ownership
        if (docSnap.data().userId !== currentUser.uid) {
            alert("You can only delete your own items");
            return;
        }
        
        await deleteDoc(docRef);
        await loadUserItems();
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item: ' + error.message);
    }
}

function resetForm() {
    itemForm.reset();
    itemIdInput.value = '';
    isEditing = false;
    formTitle.textContent = 'Add New Item';
    submitBtn.textContent = 'Add Item';
    cancelEditBtn.style.display = 'none';
}

// Initialize App
document.addEventListener('DOMContentLoaded', init);