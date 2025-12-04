/**
 * inventory.js
 * Handles the logic for the Inventory Management page:
 * - Fetching and rendering the product list.
 * - Calculating and displaying summary statistics (Total, In Stock, Low Stock).
 * - Handling search and filter operations.
 * - Managing the Add/Edit Product modal and form submissions.
 * - Handling Delete actions with a confirmation modal for both Products and Categories.
 */

// --- CONFIGURATION ---
const API_URLS = {
    // Using absolute paths for reliability
    getAll: '/LatikDelights/controllers/get_all_products.php',
    create: '/LatikDelights/controllers/create_product.php',
    update: '/LatikDelights/controllers/update_product.php',
    delete: '/LatikDelights/controllers/delete_product.php',
    // CATEGORY APIs
    getAllCategory: '/LatikDelights/controllers/get_all_categories.php',
    createCategory: '/LatikDelights/controllers/create_category.php',
    deleteCategory: '/LatikDelights/controllers/delete_category.php',
};

const LOW_STOCK_THRESHOLD = 10;
let allProducts = []; // Stores the full list of products
let allCategories = []; // NEW: Stores the full list of categories
let productIdToDelete = null; // Stores the ID of the product currently slated for deletion
let categoryIdToDelete = null; // NEW: Stores the ID of the category currently slated for deletion

// --- GLOBAL DOM ELEMENTS ---
const tableBody = document.querySelector('#inventory-body-table tbody');
const emptyMessage = document.getElementById('empty-inventory-message');

// Modals
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const deleteModal = document.getElementById('delete-modal');
const toastContainer = document.getElementById('toast-container');

// NEW: Category Modal Elements
const categoryModal = document.getElementById('category-modal');
const addCategoryForm = document.getElementById('add-category-form');
const categoryListUl = document.getElementById('category-list');
const emptyCategoriesMessage = document.getElementById('empty-categories-message');


// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners for the filter/action section
    document.getElementById('product-search').addEventListener('input', handleSearch);
    document.getElementById('add-product-btn').addEventListener('click', () => openProductModal('add'));
    
    // NEW: Category Management Button
    document.getElementById('manage-categories-btn').addEventListener('click', openCategoryModal);

    // Attach form submit listener for Add/Edit Modal
    productForm.addEventListener('submit', handleFormSubmit);

    // --- Modal Close Listeners for Add/Edit Product Modal ---
    productModal.querySelector('.close-btn').addEventListener('click', () => closeModal(productModal));
    
    // --- Delete Modal Listeners (Shared for Product and Category) ---
    document.getElementById('cancel-delete-btn').addEventListener('click', () => closeModal(deleteModal));
    deleteModal.querySelector('.delete-close-btn').addEventListener('click', () => closeModal(deleteModal));
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete); // Unified Delete Handler

    // NEW: Category Modal Listeners
    categoryModal.querySelector('.category-close-btn').addEventListener('click', () => closeModal(categoryModal));
    addCategoryForm.addEventListener('submit', handleAddCategorySubmit);

    // Global modal close listener (handles all modals)
    window.addEventListener('click', (event) => {
        if (event.target == productModal) {
            closeModal(productModal);
        } else if (event.target == deleteModal) {
            closeModal(deleteModal);
        } else if (event.target == categoryModal) { 
            closeModal(categoryModal);
        }
    });

    // Initial data load - fetch both categories and products
    fetchCategories(); 
    fetchProducts();
});


// ------------------------------------------
// --- CATEGORY DATA FETCHING & RENDERING ---
// ------------------------------------------

async function fetchCategories() {
    console.log('Fetching categories...');
    try {
        const response = await fetch(API_URLS.getAllCategory);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json(); 

        if (result.status === 'success') {
            allCategories = result.data;
            populateCategorySelect();
            renderCategoryList();
        } else {
            console.error('Error fetching categories:', result.message);
            showToast('Failed to load categories for product form.', 'error');
        }
    } catch (error) {
        console.error('Network or parsing error for categories:', error);
    }
}

function populateCategorySelect() {
    const select = document.getElementById('product-category');
    select.innerHTML = '<option value="">Select Category</option>'; 
    
    allCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id; 
        option.textContent = category.name;
        select.appendChild(option);
    });
}

function openCategoryModal() {
    renderCategoryList(); 
    categoryModal.classList.remove('hidden');
}

function renderCategoryList() {
    categoryListUl.innerHTML = '';

    if (allCategories.length === 0) {
        emptyCategoriesMessage.classList.remove('hidden');
        return;
    }

    emptyCategoriesMessage.classList.add('hidden');

    allCategories.forEach(category => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span style="flex-grow: 1;">${category.name} (ID: ${category.id})</span>
            <button class="delete-category-btn" data-id="${category.id}" data-name="${category.name}" title="Delete Category">
                <i class="fas fa-trash-alt"></i> Delete
            </button>
        `;
        categoryListUl.appendChild(listItem);
    });

    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openDeleteModalCategory(parseInt(e.currentTarget.dataset.id), e.currentTarget.dataset.name));
    });
}


// ----------------------------------
// --- CATEGORY CRUD CONTROLLERS ---
// ----------------------------------

async function handleAddCategorySubmit(e) {
    e.preventDefault();
    const inputField = document.getElementById('new-category-name');
    const categoryName = inputField.value.trim();

    if (!categoryName) {
        showToast('Category name cannot be empty.', 'error');
        return;
    }
    
    const submitBtn = addCategoryForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

    try {
        const response = await fetch(API_URLS.createCategory, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: categoryName })
        });

        const result = await response.json();
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
        inputField.value = ''; // Clear input

        showToast(result.message, result.status);
        if (result.status === 'success') {
            fetchCategories(); // Refresh all category data
        }

    } catch (error) {
        console.error('Category Creation Error:', error);
        showToast('A network error occurred while adding category.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add';
    }
}

// Function to open the shared delete modal for a category
function openDeleteModalCategory(categoryId, categoryName) {
    productIdToDelete = null; // Clear product ID
    categoryIdToDelete = categoryId;
    document.getElementById('product-name-to-delete').innerHTML = `the category "<strong>${categoryName}</strong>" (ID: ${categoryId})`;
    document.getElementById('delete-modal-title').textContent = `Confirm Category Deletion`;
    document.getElementById('confirm-delete-btn').textContent = 'Delete Category';
    deleteModal.classList.remove('hidden');
}

// Function to perform the category deletion
async function confirmDeleteCategory() {
    closeModal(deleteModal); 

    if (categoryIdToDelete === null) {
        showToast('Error: No category ID selected for deletion.', 'error');
        return;
    }

    const id = categoryIdToDelete;
    categoryIdToDelete = null; 

    try {
        const response = await fetch(API_URLS.deleteCategory, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });

        const result = await response.json();

        if (result.status === 'success' || result.status === 'info') {
            showToast(result.message, result.status);
            if (result.status === 'success') {
                fetchCategories(); 
                fetchProducts(); 
            }
        } else {
            showToast(`Deletion Failed: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Category Deletion Error:', error);
        showToast('A network error occurred during category deletion.', 'error');
    }
}


// -------------------------------------
// --- DATA FETCHING (Product Logic) ---
// -------------------------------------

async function fetchProducts() {
    console.log('Fetching products...');
    
    // Clear the table and show a temporary loading state
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading inventory...</td></tr>';
    emptyMessage.classList.add('hidden');

    try {
        const response = await fetch(API_URLS.getAll);
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status} - Could not load ${API_URLS.getAll}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json(); 

        if (result.status === 'success') {
            allProducts = result.data;
            renderProducts(allProducts);
            updateSummaryCards(allProducts);
        } else {
            console.error('Error fetching products:', result.message);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Failed to load products: ' + result.message + '</td></tr>';
            updateSummaryCards([]);
        }
    } catch (error) {
        console.error('Network or parsing error:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Connection error or invalid JSON response. Please check server status and API URL.</td></tr>';
        updateSummaryCards([]);
        showToast('Error fetching product data.', 'error');
    }
}


// ------------------------------------
// --- RENDERING AND UI UPDATES (Product Logic) ---
// ------------------------------------

function renderProducts(productsToRender) {
    tableBody.innerHTML = '';

    if (productsToRender.length === 0) {
        emptyMessage.classList.remove('hidden');
        return;
    }

    emptyMessage.classList.add('hidden');

    productsToRender.forEach(product => {
        const stockStatus = getStockStatus(product.stock);
        const statusBadge = `<span class="stock-badge stock-${stockStatus.class}">${stockStatus.label}</span>`;
        
        const row = tableBody.insertRow();
        row.dataset.productId = product.id;

        // Note: The product controller must return the category NAME for this column
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.category}</td> 
            <td>₱${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="edit-btn" data-id="${product.id}" title="Edit Product">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" data-id="${product.id}" data-name="${product.name}" title="Delete Product">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openProductModal('edit', parseInt(e.currentTarget.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        // Open the confirmation modal on delete click
        btn.addEventListener('click', (e) => openDeleteModalProduct(parseInt(e.currentTarget.dataset.id), e.currentTarget.dataset.name));
    });
}

function getStockStatus(stock) {
    if (stock > LOW_STOCK_THRESHOLD) {
        return { label: 'In Stock', class: 'high' };
    } else if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) {
        return { label: 'Low Stock', class: 'low' };
    } else {
        return { label: 'Out of Stock', class: 'out' };
    }
}

function updateSummaryCards(products) {
    const totalProducts = products.length;
    const totalInStock = products.reduce((sum, p) => sum + (p.stock > 0 ? p.stock : 0), 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;

    document.getElementById('total-products-value').textContent = totalProducts;
    document.getElementById('in-stock-value').textContent = totalInStock;
    document.getElementById('low-stock-value').textContent = lowStockCount;
}

// --- TOAST NOTIFICATIONS ---

function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = '';
    
    if (type === 'success') {
        icon = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'error') {
        icon = '<i class="fas fa-exclamation-triangle"></i>';
    } else {
        icon = '<i class="fas fa-info-circle"></i>';
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);

    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10); // Small delay for transition

    // Hide and remove the toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 500); // Wait for transition to finish
    }, duration);
}


// --- SEARCH FUNCTIONALITY ---

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.id.toString().includes(searchTerm)
    );
    
    renderProducts(filteredProducts);
}


// --------------------------------------
// --- MODAL AND CRUD LOGIC (Product & Shared) ---
// --------------------------------------

function closeModal(modalElement) {
    modalElement.classList.add('hidden');
}

function openProductModal(mode, productId = null) {
    const modalTitle = document.getElementById('modal-title');
    const saveButton = productForm.querySelector('.action-btn');

    productForm.reset();
    
    const idField = document.getElementById('product-id');
    const nameField = document.getElementById('product-name');
    const categoryField = document.getElementById('product-category');
    const priceField = document.getElementById('product-price');
    const stockField = document.getElementById('product-stock');

    // Ensure all fields have a 'name' attribute for FormData
    idField.setAttribute('name', 'id');
    nameField.setAttribute('name', 'name');
    // categoryField now uses name="category_id" from the HTML update
    priceField.setAttribute('name', 'price');
    stockField.setAttribute('name', 'stock');

    if (mode === 'add') {
        modalTitle.textContent = 'Add New Product';
        saveButton.textContent = 'Add Product';
        idField.value = '';
    } else if (mode === 'edit' && productId !== null) {
        modalTitle.textContent = 'Edit Product';
        saveButton.textContent = 'Save Changes';
        
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            idField.value = product.id;
            nameField.value = product.name;
            
            // Find the category ID from the category name returned by the product controller
            const categoryId = allCategories.find(c => c.name === product.category)?.id;
            
            // Set the value for the <select> element using the ID
            categoryField.value = categoryId || ''; 
            priceField.value = parseFloat(product.price).toFixed(2); 
            stockField.value = product.stock;
        }
    }
    
    productModal.classList.remove('hidden');
}


async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(productForm);
    const productData = Object.fromEntries(formData.entries());
    
    productData.id = productData.id ? parseInt(productData.id) : null;
    productData.price = parseFloat(productData.price);
    productData.stock = parseInt(productData.stock);
    
    const isAdding = productData.id === 0 || productData.id === null || productData.id === '';
    
    // Remove ID for adding operation
    if (isAdding) {
        delete productData.id;
    }

    const url = isAdding ? API_URLS.create : API_URLS.update;
    const method = 'POST'; 

    try {
        const submitBtn = productForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        const result = await response.json();
        
        submitBtn.disabled = false;
        submitBtn.textContent = isAdding ? 'Add Product' : 'Save Changes'; 

        if (result.status === 'success' || result.status === 'info') {
            showToast(result.message, result.status === 'success' ? 'success' : 'info');
            closeModal(productModal);
            fetchProducts(); 
        } else {
            showToast(`Operation Failed: ${result.message}`, 'error');
        }

    } catch (error) {
        console.error('Submission Error:', error);
        showToast('A network error occurred during submission.', 'error');
        const submitBtn = productForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = isAdding ? 'Add Product' : 'Save Changes';
    }
}


// Function to open the shared delete modal for a product
function openDeleteModalProduct(productId, productName) {
    productIdToDelete = productId;
    categoryIdToDelete = null; 
    document.getElementById('product-name-to-delete').innerHTML = `the product "<strong>${productName}</strong>" (ID: ${productId})`;
    document.getElementById('delete-modal-title').textContent = `Confirm Product Deletion`;
    document.getElementById('confirm-delete-btn').textContent = 'Delete Product';
    deleteModal.classList.remove('hidden');
}


// Function to perform the product deletion
async function confirmDeleteProduct() {
    closeModal(deleteModal); 

    if (productIdToDelete === null) {
        showToast('Error: No product ID selected for deletion.', 'error');
        return;
    }

    const id = productIdToDelete;
    productIdToDelete = null; 

    try {
        const response = await fetch(API_URLS.delete, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: id })
        });

        const result = await response.json();

        if (result.status === 'success') {
            showToast(result.message, 'success');
            fetchProducts(); 
        } else {
            showToast(`Deletion Failed: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Deletion Error:', error);
        showToast('A network error occurred during deletion.', 'error');
    }
}


// The main handler for the shared delete button (checks which ID is set)
async function confirmDelete() {
    if (productIdToDelete !== null) {
        await confirmDeleteProduct();
    } else if (categoryIdToDelete !== null) {
        await confirmDeleteCategory();
    } else {
        closeModal(deleteModal);
        showToast('No item was selected for deletion.', 'info');
    }
}