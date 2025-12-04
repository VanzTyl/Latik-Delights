// =================================================================
// 1. GLOBAL VARIABLES
// =================================================================
let products = []; // Products will be loaded from the database via fetchProducts()
let cart = [];     // Cart remains the local storage for the current order
let currentView = 'card-view'; // Default view is card

// DOM Elements
const productsContainer = document.getElementById('products-list');
const cardViewContent = document.getElementById('card-view-content');
const tableViewContent = document.getElementById('table-view-content');
const cartItemsContainer = document.getElementById('cart-items-container');
const orderTotalElement = document.getElementById('order-total-price');
const processOrderBtn = document.getElementById('process-order-btn');
const productSearchInput = document.getElementById('product-search');
const filterDropdown = document.getElementById('filter-dropdown');
const customerNameInput = document.getElementById('customer-name');

// =================================================================
// 2. PRODUCT FETCHING
// =================================================================

/**
 * Fetches products from the server (controllers/get_products.php) and updates the local products array.
 */
async function fetchProducts() {
    try {
        const response = await fetch('../controllers/get_products.php');
        
        // Ensure response is OK before trying to parse JSON
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();

        // FIX 1: CRITICAL - Change 'data.products' to 'data.data'
        if (data.status === 'success' && Array.isArray(data.data)) {
            products = data.data; // <--- CORRECTED: Use 'data.data'
            renderProducts(products);  // Render the newly fetched list
            console.log("Products loaded successfully:", products.length, "items.");
        } else {
            console.error('Failed to load products:', data.message);
            showToast(`❌ Error loading products: ${data.message}`);
            renderProducts([]); // Render empty list to prevent crash
        }
    } catch (error) {
        console.error('Network error while fetching products:', error);
        // This is the common error displayed when the PHP file path is wrong or the server is down
        showToast("❌ Network error. Could not connect to product database.");
        renderProducts([]); // Render empty list to prevent crash
    }
}

// =================================================================
// 3. CART MANAGEMENT
// =================================================================

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    
    // Safety check: Find the product in the product list to check stock
    if (!product) return; 

    // Check stock against the current cart quantity
    const cartItem = cart.find(item => item.id === productId);
    const currentCartQuantity = cartItem ? cartItem.quantity : 0;
    
    if (product.stock <= currentCartQuantity) {
        showToast(`⚠️ Cannot add more. Only ${product.stock} left.`);
        return;
    }

    if (cartItem) {
        cartItem.quantity += 1;
        showToast(`➕ Added another ${product.name} to cart.`);
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
        showToast(`✅ Added ${product.name} to cart.`);
    }
    renderCart();
}

function updateCartQuantity(productId, delta) {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        if (delta > 0) {
            // Increment
            if (cartItem.quantity < product.stock) {
                cartItem.quantity += 1;
            } else {
                showToast(`⚠️ Max stock reached for ${product.name}.`);
            }
        } else if (delta < 0) {
            // Decrement
            cartItem.quantity -= 1;
        }

        if (cartItem.quantity <= 0) {
            // Remove item if quantity is zero or less
            cart = cart.filter(item => item.id !== productId);
            showToast(`🗑️ Removed ${product.name} from cart.`);
        }
    }
    renderCart();
}

function calculateTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// =================================================================
// 4. RENDERING FUNCTIONS
// =================================================================

function renderProducts(filteredProducts) {
    // FIX 2: Guard clause to prevent the map() error
    if (!Array.isArray(filteredProducts)) {
        console.error("renderProducts received non-array data:", filteredProducts);
        filteredProducts = [];
    }

    // Render Card View
    cardViewContent.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <div class="product-image">Image Placeholder</div>
            <h5>${product.name}</h5>
            <div class="product-price">₱${parseFloat(product.price).toFixed(2)}</div>
            <div class="product-stock">Stock: ${product.stock}</div>
            <button class="add-to-cart-card-btn" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                ${product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
        </div>
    `).join('');

    // Render Table View
    const tableBody = tableViewContent.querySelector('tbody');
    tableBody.innerHTML = filteredProducts.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>₱${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>
                <button class="add-to-cart-table-btn" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                    ${product.stock > 0 ? 'Add' : 'N/A'}
                </button>
            </td>
        </tr>
    `).join('');
    
    // Ensure the correct view is shown after rendering
    if (currentView === 'card-view') {
        cardViewContent.classList.remove('hidden');
        tableViewContent.classList.add('hidden');
    } else {
        cardViewContent.classList.add('hidden');
        tableViewContent.classList.remove('hidden');
    }
}

function renderCart() {
    const total = calculateTotal();
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="empty-cart-message">Your cart is empty. Add products to start an order.</p>`;
        // Currency Symbol Update (Empty state total)
        orderTotalElement.textContent = '₱0.00';
        processOrderBtn.disabled = true;
        return;
    }

    processOrderBtn.disabled = false;
    
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-details">
                <h6>${item.name}</h6>
                <span>₱${parseFloat(item.price).toFixed(2)} each</span>
            </div>
            <div class="item-quantity-controls">
                <button onclick="updateCartQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateCartQuantity(${item.id}, 1)">+</button>
            </div>
            <div class="cart-item-price">₱${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');

    // Currency Symbol Update (Grand total)
    orderTotalElement.textContent = `₱${total.toFixed(2)}`;
}

// =================================================================
// 5. VIEW TOGGLE AND FILTERING
// =================================================================

function toggleView(view) {
    currentView = view;
    // Assuming you have 'active-view' classes defined in your CSS
    document.getElementById('card-view').classList.toggle('active-view', view === 'card-view');
    document.getElementById('table-view').classList.toggle('active-view', view === 'table-view');

    cardViewContent.classList.toggle('hidden', view !== 'card-view');
    tableViewContent.classList.toggle('hidden', view !== 'table-view');
}

function filterAndSortProducts() {
    const searchTerm = productSearchInput.value.toLowerCase();
    const sortBy = filterDropdown.value;

    let filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm)
    );

    // Sorting logic 
    if (sortBy === 'low-to-high') {
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === 'high-to-low') {
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortBy === 'name-asc') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    renderProducts(filtered);
}

// =================================================================
// 6. TOAST AND CHECKOUT LOGIC (AJAX INTEGRATION)
// =================================================================

let toastTimeout;
function showToast(message) {
    // Create the toast element if it doesn't exist
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    
    clearTimeout(toastTimeout);
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Handles the process order button click.
 * Sends order data to controllers/create_order.php for processing.
 */
async function handleProcessOrder() {
    const customerName = customerNameInput.value.trim();
    const total = calculateTotal().toFixed(2);
    
    if (cart.length === 0) {
        showToast("⚠️ Cannot process an empty order.");
        return;
    }

    if (customerName === "") {
        showToast("⚠️ Please enter the Customer's Name before processing.");
        customerNameInput.focus();
        return;
    }
    
    // Prepare items data structure for the PHP controller
    const orderDetails = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price // Use 'unit_price' to match PHP controller's expectation
    }));

    try {
        const response = await fetch('../controllers/create_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // FIX 3: CRITICAL - Change payload keys to match PHP controller's expectation
            body: JSON.stringify({
                customer_name: customerName, // <-- CORRECTED: PHP expects 'customer_name'
                details: orderDetails,        // <-- CORRECTED: PHP expects 'details'
                total: total
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // 1. Successful Processing: Clear cart, clear input, re-render, and show toast
            cart = [];
            customerNameInput.value = ""; // Clear input after successful order
            renderCart();
            
            // 2. Re-fetch products to reflect updated stock counts from the database
            fetchProducts();
            
            // Currency Symbol Update (Toast message)
            showToast(`Order #${data.order_id || new Date().getTime().toString().slice(-5)} for ${customerName} processed (₱${total})!`);
        } else {
            // Handle server-side failure (e.g., inventory error, DB error)
            showToast(`❌ Order failed: ${data.message}`);
        }

    } catch (error) {
        console.error('Network or system error during order creation:', error);
        showToast("❌ System error. Check console for details.");
    }
}


// =================================================================
// 7. INITIALIZATION AND EVENT LISTENERS
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initial data load: Fetch products from the database
    fetchProducts(); 
    
    renderCart();

    // Event Listeners
    document.getElementById('card-view').addEventListener('click', () => toggleView('card-view'));
    document.getElementById('table-view').addEventListener('click', () => toggleView('table-view'));
    processOrderBtn.addEventListener('click', handleProcessOrder);
    productSearchInput.addEventListener('input', filterAndSortProducts);
    filterDropdown.addEventListener('change', filterAndSortProducts);
});