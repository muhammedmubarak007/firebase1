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

// Firebase configuration - REPLACE WITH YOUR CONFIG
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

// Initialize the app
function init() {
    // Check auth state
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

    // Event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    itemForm.addEventListener('submit', handleItemSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
}

// Show authentication panel
function showAuthPanel() {
    authContainer.style.display = 'block';
    adminContainer.style.display = 'none';
}

// Show admin panel
function showAdminPanel() {
    authContainer.style.display = 'none';
    adminContainer.style.display = 'block';
}

// Handle login
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

// Handle logout
async function handleLogout() {
    try {
        await signOut(auth);
        resetForm();
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
}

// Load items for the current user
async function loadUserItems() {
    if (!currentUser) return;
    
    itemsList.innerHTML = '<tr><td colspan="4" class="text-center">Loading your items...</td></tr>';
    
    try {
        const q = query(
            collection(db, 'menuItems'),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        
        itemsList.innerHTML = '';
        
        if (querySnapshot.empty) {
            itemsList.innerHTML = '<tr><td colspan="4" class="text-center">You have no menu items yet</td></tr>';
            return;
        }

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
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editItem(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteItem(btn.dataset.id));
        });
        
    } catch (error) {
        console.error('Error loading items:', error);
        itemsList.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading your items</td></tr>';
    }
}

// Handle item form submission
function handleItemSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('item-name').value;
    const price = parseFloat(document.getElementById('item-price').value);
    const description = document.getElementById('item-description').value;
    
    if (!name || isNaN(price)) {
        alert('Name and price are required');
        return;
    }
    
    if (isEditing) {
        updateItem(itemIdInput.value, name, price, description);
    } else {
        addItem(name, price, description);
    }
}

// Add new item to Firestore
async function addItem(name, price, description) {
    try {
        await saveItemToFirestore(null, name, price, description);
        resetForm();
        loadUserItems();
    } catch (error) {
        console.error('Error adding item:', error);
        alert('Error adding item: ' + error.message);
    }
}

// Update existing item
async function updateItem(id, name, price, description) {
    try {
        await saveItemToFirestore(id, name, price, description);
        resetForm();
        loadUserItems();
    } catch (error) {
        console.error('Error updating item:', error);
        alert('Error updating item: ' + error.message);
    }
}

// Save item data to Firestore
async function saveItemToFirestore(id, name, price, description) {
    const itemData = {
        name,
        price,
        description: description || null,
        userId: currentUser.uid,
        updatedAt: serverTimestamp()
    };
    
    if (id) {
        // Update existing document
        const docRef = doc(db, 'menuItems', id);
        await updateDoc(docRef, itemData);
    } else {
        // Add new document
        itemData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'menuItems'), itemData);
    }
}

// Delete item with confirmation and ownership check
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        // Verify the item belongs to current user
        const docRef = doc(db, 'menuItems', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            alert('Item not found');
            return;
        }
        
        if (docSnap.data().userId !== currentUser.uid) {
            alert('You can only delete your own items');
            return;
        }
        
        await deleteDoc(docRef);
        loadUserItems();
        alert('Item deleted successfully');
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item: ' + error.message);
    }
}

// Edit item
async function editItem(id) {
    try {
        const docRef = doc(db, 'menuItems', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            alert('Item not found');
            return;
        }
        
        const item = docSnap.data();
        
        // Verify ownership
        if (item.userId !== currentUser.uid) {
            alert('You can only edit your own items');
            return;
        }
        
        document.getElementById('item-id').value = id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-description').value = item.description || '';
        
        // Update UI for editing
        isEditing = true;
        formTitle.textContent = 'Edit Item';
        submitBtn.textContent = 'Update Item';
        cancelEditBtn.style.display = 'block';
    } catch (error) {
        console.error('Error getting item:', error);
        alert('Error getting item: ' + error.message);
    }
}

// Cancel edit and reset form
function cancelEdit() {
    resetForm();
}

// Reset form to initial state
function resetForm() {
    itemForm.reset();
    itemIdInput.value = '';
    isEditing = false;
    formTitle.textContent = 'Add New Item';
    submitBtn.textContent = 'Add Item';
    cancelEditBtn.style.display = 'none';
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);