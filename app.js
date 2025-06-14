// Import Firebase modules
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
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const storage = getStorage(app);

// DOM Elements (same as before)
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
const imagePreview = document.getElementById('image-preview');

// State
let currentUser = null;
let isEditing = false;
let selectedFile = null;

// Initialize the app
function init() {
    // Check auth state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showAdminPanel();
            loadItems();
        } else {
            showAuthPanel();
        }
    });

    // Event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    itemForm.addEventListener('submit', handleItemSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
    document.getElementById('item-image').addEventListener('change', handleImageSelect);
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

// Load items from Firestore
async function loadItems() {
    itemsList.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    try {
        const q = query(collection(db, 'menuItems'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            itemsList.innerHTML = '<tr><td colspan="5" class="text-center">No items found</td></tr>';
            return;
        }
        
        itemsList.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${item.imageUrl || 'https://via.placeholder.com/50'}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                <td>${item.name}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.description.substring(0, 50)}${item.description.length > 50 ? '...' : ''}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-btn" data-id="${doc.id}">Edit</button>
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
        itemsList.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading items</td></tr>';
        console.error('Error loading items: ', error);
    }
}

// Handle image selection (same as before)
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.innerHTML = `<img src="${e.target.result}" class="preview-image" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

// Handle item form submission (same as before)
function handleItemSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('item-name').value;
    const price = parseFloat(document.getElementById('item-price').value);
    const description = document.getElementById('item-description').value;
    
    if (!name || isNaN(price) || !description) {
        alert('Please fill all fields correctly');
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
        let imageUrl = null;
        
        if (selectedFile) {
            imageUrl = await uploadImage(selectedFile);
        }
        
        await saveItemToFirestore(null, name, price, description, imageUrl);
        resetForm();
        loadItems();
    } catch (error) {
        console.error('Error adding item: ', error);
        alert('Error adding item: ' + error.message);
    }
}

// Update existing item
async function updateItem(id, name, price, description) {
    try {
        let imageUrl = null;
        
        if (selectedFile) {
            imageUrl = await uploadImage(selectedFile);
        } else {
            // Keep existing image if no new one was selected
            const docRef = doc(db, 'menuItems', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                imageUrl = docSnap.data().imageUrl;
            }
        }
        
        await saveItemToFirestore(id, name, price, description, imageUrl);
        resetForm();
        loadItems();
    } catch (error) {
        console.error('Error updating item: ', error);
        alert('Error updating item: ' + error.message);
    }
}

// Upload image to Firebase Storage
async function uploadImage(file) {
    const storageRef = ref(storage, 'menuItems/' + Date.now() + '_' + file.name);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
}

// Save item data to Firestore
async function saveItemToFirestore(id, name, price, description, imageUrl) {
    const itemData = {
        name,
        price,
        description,
        updatedAt: serverTimestamp()
    };
    
    if (imageUrl) {
        itemData.imageUrl = imageUrl;
    }
    
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
        document.getElementById('item-id').value = id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-description').value = item.description;
        
        // Show image preview if exists
        if (item.imageUrl) {
            imagePreview.innerHTML = `<img src="${item.imageUrl}" class="preview-image" alt="Preview">`;
        } else {
            imagePreview.innerHTML = '';
        }
        
        // Update UI for editing
        isEditing = true;
        formTitle.textContent = 'Edit Item';
        submitBtn.textContent = 'Update Item';
        cancelEditBtn.style.display = 'block';
        selectedFile = null;
        
        // Scroll to form
        document.getElementById('item-form').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error getting item: ', error);
        alert('Error getting item: ' + error.message);
    }
}

// Delete item
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        await deleteDoc(doc(db, 'menuItems', id));
        loadItems();
    } catch (error) {
        console.error('Error deleting item: ', error);
        alert('Error deleting item: ' + error.message);
    }
}

// Cancel edit and reset form (same as before)
function cancelEdit() {
    resetForm();
}

// Reset form to initial state (same as before)
function resetForm() {
    itemForm.reset();
    itemIdInput.value = '';
    imagePreview.innerHTML = '';
    isEditing = false;
    selectedFile = null;
    formTitle.textContent = 'Add New Item';
    submitBtn.textContent = 'Add Item';
    cancelEditBtn.style.display = 'none';
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);