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
            loadUserItems(user.uid);
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
async function loadUserItems(userId) {
    try {
        const q = query(
            collection(db, 'menuItems'),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        itemsList.innerHTML = querySnapshot.empty 
            ? '<tr><td colspan="4" class="text-center py-4">You have no menu items yet</td></tr>'
            : '';
            
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            itemsList.appendChild(createItemRow(doc.id, item));
        });
        
    } catch (error) {
        itemsList.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error loading your items</td></tr>';
        console.error('Error loading items:', error);
    }
}

function createItemRow(id, item) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${item.name}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>${item.description || '-'}</td>
        <td>
            <button class="btn btn-sm btn-warning edit-btn me-2" data-id="${id}">Edit</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${id}">Delete</button>
        </td>
    `;
    
    row.querySelector('.edit-btn').addEventListener('click', () => editItem(id));
    row.querySelector('.delete-btn').addEventListener('click', () => deleteItem(id));
    
    return row;
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
        await loadUserItems(currentUser.uid);
    } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item: ' + error.message);
    }
}

async function addItem(name, price, description) {
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
        
        if (!docSnap.exists() || docSnap.data().userId !== currentUser.uid) {
            alert("You can only edit your own items");
            return;
        }
        
        const item = docSnap.data();
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
        
        if (!docSnap.exists() || docSnap.data().userId !== currentUser.uid) {
            alert("You can only delete your own items");
            return;
        }
        
        await deleteDoc(docRef);
        await loadUserItems(currentUser.uid);
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