// =================================================================
// 1. GLOBAL ORDER DATA (DYNAMIC)
// =================================================================
let orders = []; // Orders will be loaded dynamically from the database
let activeStatusFilter = 'all';

// =================================================================
// 2. CORE DOM ELEMENTS
// =================================================================
// FIX: Target the <tbody> inside the new scrollable table (#orders-body-table)
const ordersTableBody = document.querySelector('#orders-body-table tbody'); 
const orderSearchInput = document.getElementById('order-search');
const statusFilterBtns = document.querySelectorAll('.status-btn');
const emptyOrdersMessage = document.getElementById('empty-orders-message');

// =================================================================
// 3. DATA FETCHING (NEW LOGIC)
// =================================================================

/**
 * Fetches the list of orders from the server.
 */
async function fetchOrders() {
    try {
        // Fetch data from the PHP controller (using the correct path)
        const response = await fetch('../controllers/manage_orders.php');
        const data = await response.json();

        if (data.status === 'success') {
            // Update the global orders array
            orders = data.orders.map(order => ({
                // PHP sends 'id' as an integer. Use parseInt or keep it as a string
                id: order.id.toString(), 
                
                // CRITICAL: Ensure this key matches the PHP output ('customer_name')
                customer: order.customer_name, 
                
                date: order.order_date.split(' ')[0], 
                total: parseFloat(order.total),
                status: order.status
            }));
            
            // Re-render the view after fetching new data
            filterAndRenderOrders();
            console.log("Orders loaded successfully:", orders.length, "items.");
        } else {
            console.error('Failed to load orders:', data.message);
            // Fallback for visual feedback
            emptyOrdersMessage.textContent = `Error loading orders: ${data.message}`;
            emptyOrdersMessage.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Network error while fetching orders:', error);
        emptyOrdersMessage.textContent = 'Network error. Could not load orders.';
        emptyOrdersMessage.classList.remove('hidden');
    }
}


// =================================================================
// 4. RENDERING AND FILTERING
// =================================================================

/**
 * Renders the order list in the table.
 * @param {Array<Object>} orderList - The filtered list of orders.
 */
function renderOrders(orderList) {
    // ordersTableBody now correctly references the <tbody> of #orders-body-table
    ordersTableBody.innerHTML = ''; // Clear existing rows

    if (orderList.length === 0) {
        emptyOrdersMessage.classList.remove('hidden');
        return;
    }
    emptyOrdersMessage.classList.add('hidden');

    orderList.forEach(order => {
        // Correctly converts status "Pending Payment" to CSS class "status-pending-payment"
        const statusClass = `status-${order.status.toLowerCase().replace(/\s/g, '-')}`; 
        
        const row = `
            <tr data-order-id="${order.id}" data-status="${order.status}">
                <td>${order.id}</td>
                <td>${order.customer}</td>
                <td>${order.date}</td>
                <td>₱${order.total.toFixed(2)}</td>
                <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                <td>
                    <select class="action-btn" data-order-id="${order.id}">
                        <option value="">Change Status</option>
                        <option value="Pending Payment" ${order.status === 'Pending Payment' ? 'disabled' : ''}>Pending Payment</option>
                        <option value="Paid" ${order.status === 'Paid' ? 'disabled' : ''}>Paid</option>
                        <option value="Processing" ${order.status === 'Processing' ? 'disabled' : ''}>Processing</option>
                        <option value="Completed" ${order.status === 'Completed' ? 'disabled' : ''}>Completed</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'disabled' : ''}>Cancelled</option>
                    </select>
                </td>
            </tr>
        `;
        ordersTableBody.insertAdjacentHTML('beforeend', row);
    });
    
    // Re-attach listeners every time the table is rendered
    attachEventListeners();
}

/**
 * Filters the main order list based on search term and status.
 */
function filterAndRenderOrders() {
    const searchTerm = orderSearchInput.value.toLowerCase();
    
    let filteredList = orders.filter(order => {
        // Status filter: Converts status to the slug used in the data-status attribute for comparison
        const statusSlug = order.status.toLowerCase().replace(/\s/g, '-');
        const matchesStatus = (activeStatusFilter === 'all' || statusSlug === activeStatusFilter);
        
        // Search filter
        const matchesSearch = order.id.toLowerCase().includes(searchTerm) ||
                                  order.customer.toLowerCase().includes(searchTerm);
                                  
        return matchesStatus && matchesSearch;
    });

    // Update count on buttons
    updateStatusCounts(); 
    
    renderOrders(filteredList);
}

/**
 * Updates the counts displayed on the status filter buttons.
 */
function updateStatusCounts() {
    // Recalculate counts for all new statuses
    const statusCounts = {
        'pending-payment': orders.filter(o => o.status === 'Pending Payment').length,
        'paid': orders.filter(o => o.status === 'Paid').length,
        'processing': orders.filter(o => o.status === 'Processing').length,
        'completed': orders.filter(o => o.status === 'Completed').length,
        'cancelled': orders.filter(o => o.status === 'Cancelled').length,
        'all': orders.length
    };

    // Update button text using the data-status attribute
    document.querySelector('.status-btn[data-status="all"]').innerHTML = `All (${statusCounts.all})`;
    document.querySelector('.status-btn[data-status="pending-payment"]').innerHTML = `Pending Payment (${statusCounts['pending-payment']})`;
    document.querySelector('.status-btn[data-status="paid"]').innerHTML = `Paid (${statusCounts.paid})`;
    document.querySelector('.status-btn[data-status="processing"]').innerHTML = `Processing (${statusCounts.processing})`;
    document.querySelector('.status-btn[data-status="completed"]').innerHTML = `Completed (${statusCounts.completed})`;
    document.querySelector('.status-btn[data-status="cancelled"]').innerHTML = `Cancelled (${statusCounts.cancelled})`;
}

// =================================================================
// 5. EVENT HANDLERS AND LISTENERS
// =================================================================

/**
 * Handles status change and sends update to the server.
 */
async function handleStatusChange(event) {
    const selectElement = event.target;
    const orderId = selectElement.dataset.orderId;
    const newStatus = selectElement.value;

    if (!newStatus || newStatus === "Change Status") return;

    // The logic to send the update to the server
    try {
        const response = await fetch('../controllers/update_order_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderId,
                status: newStatus
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // 1. Update the order locally in the array
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex > -1) {
                orders[orderIndex].status = newStatus;
            }

            alert(`Order ${orderId} status successfully changed to ${newStatus}.`);
        } else {
            alert(`Failed to update order status: ${data.message}`);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('A network error occurred while trying to update the status.');
    }
    
    // Reset dropdown and re-render the view regardless of success/fail
    selectElement.value = ""; 
    filterAndRenderOrders();
}

function handleStatusFilterClick(event) {
    const newStatus = event.target.dataset.status; 
    if (!newStatus) return;

    // Update active filter state
    activeStatusFilter = newStatus;
    
    // Update active button styling
    statusFilterBtns.forEach(btn => btn.classList.remove('active-status-btn'));
    event.target.classList.add('active-status-btn');
    
    // Rerender the list
    filterAndRenderOrders();
}

function attachEventListeners() {
    // Attach listener to the Status change dropdowns
    document.querySelectorAll('.action-btn').forEach(select => {
        // Ensures listener is only attached once
        select.removeEventListener('change', handleStatusChange); 
        select.addEventListener('change', handleStatusChange);
    });
}


// =================================================================
// 6. INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners for filtering
    statusFilterBtns.forEach(btn => {
        btn.addEventListener('click', handleStatusFilterClick);
    });
    orderSearchInput.addEventListener('input', filterAndRenderOrders);

    // Set 'All' filter button as active on load
    const allBtn = document.querySelector('.status-btn[data-status="all"]');
    if (allBtn) {
        allBtn.classList.add('active-status-btn');
    }

    // Initial data load: Fetch orders from the database
    fetchOrders(); 
});