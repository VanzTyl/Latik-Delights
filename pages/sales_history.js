document.addEventListener('DOMContentLoaded', () => {
    // Global variables
    let allSalesData = [];
    let currentFilteredData = []; 
    
    // --- DOM Elements ---
    // FIX: Target the <tbody> inside the new scrollable table (#sales-body-table)
    const salesTableBody = document.querySelector('#sales-body-table tbody'); 
    const totalRevenueEl = document.getElementById('total-revenue');
    const totalOrdersEl = document.getElementById('total-orders');
    const avgDailySalesEl = document.getElementById('avg-daily-sales');
    const emptyMessageEl = document.getElementById('empty-sales-message');
    
    // Filter elements
    const dateStartEl = document.getElementById('date-start');
    const dateEndEl = document.getElementById('date-end');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const orderSearchEl = document.getElementById('order-search');

    // New Export Elements
    const exportBtn = document.getElementById('export-sheets-btn');
    const exportFilenameEl = document.getElementById('export-filename'); 
    
    // Modal elements
    const detailsModal = document.getElementById('details-modal');
    const modalOrderIdEl = document.getElementById('modal-order-id');
    const detailsTableBody = document.getElementById('details-table-body');
    const detailsGrandTotalEl = document.getElementById('details-grand-total');
    const closeModalBtn = detailsModal.querySelector('.close-btn');

    const feedbackEl = document.getElementById('export-feedback');

    // --- Utility Functions ---

    /**
     * Helper function to format currency
     * @param {number} amount
     * @returns {string} Formatted currency string
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { 
            style: 'currency', 
            currency: 'PHP' 
        }).format(amount);
    };

    /**
     * Calculates summary metrics from the current filtered data set.
     * @param {Array<Object>} data - The array of sales orders.
     */
    const updateSummaryMetrics = (data) => {
        const totalRevenue = data.reduce((sum, order) => sum + order.total_amount, 0);
        const totalOrders = data.length;

        let avgDailySales = 0;
        
        if (totalOrders > 0) {
            const uniqueDates = new Set(data.map(order => order.order_date));
            const totalDays = uniqueDates.size || 1; 

            avgDailySales = totalRevenue / totalDays;
        }

        totalRevenueEl.textContent = formatCurrency(totalRevenue);
        totalOrdersEl.textContent = totalOrders;
        avgDailySalesEl.textContent = formatCurrency(avgDailySales);
    };

    /**
     * Renders the sales data to the table and updates the currentFilteredData.
     * @param {Array<Object>} data - The array of sales orders to display.
     */
    const renderTable = (data) => {
        currentFilteredData = data; // Store the data being displayed
        salesTableBody.innerHTML = '';
        exportBtn.disabled = (data.length === 0);

        if (data.length === 0) {
            emptyMessageEl.classList.remove('hidden');
            return;
        }

        emptyMessageEl.classList.add('hidden');

        data.forEach(order => {
            const row = salesTableBody.insertRow();
            
            const dateObj = new Date(order.order_date + 'T' + order.order_time);
            const formattedDate = dateObj.toLocaleDateString('en-PH');
            const formattedTime = dateObj.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });

            row.insertCell().textContent = order.order_id;
            row.insertCell().textContent = order.customer_name;
            row.insertCell().textContent = formattedDate;
            row.insertCell().textContent = formattedTime;
            row.insertCell().textContent = formatCurrency(order.total_amount);

            const statusCell = row.insertCell();
            statusCell.innerHTML = `<span class="status-badge status-completed">${order.status}</span>`;

            const detailsCell = row.insertCell();
            const detailsBtn = document.createElement('button');
            detailsBtn.textContent = 'View Details';
            detailsBtn.classList.add('details-btn');
            detailsBtn.onclick = () => showOrderDetails(order);
            detailsCell.appendChild(detailsBtn);
        });
    };

    /**
     * Filters the global sales data based on user inputs.
     */
    const filterAndSearchData = () => {
        const startDate = dateStartEl.value;
        const endDate = dateEndEl.value;
        const searchTerm = orderSearchEl.value.toLowerCase().trim();

        let filteredData = allSalesData.filter(order => {
            let matchesDate = true;
            let matchesSearch = true;

            if (startDate) {
                if (order.order_date < startDate) matchesDate = false;
            }
            if (endDate) {
                if (order.order_date > endDate) matchesDate = false;
            }

            if (searchTerm) {
                const orderIdStr = String(order.order_id);
                const customerNameStr = String(order.customer_name).toLowerCase();
                
                if (!orderIdStr.includes(searchTerm) && !customerNameStr.includes(searchTerm)) {
                    matchesSearch = false;
                }
            }

            return matchesDate && matchesSearch;
        });

        // Use the new filtered data
        renderTable(filteredData);
        updateSummaryMetrics(filteredData);
    };

    /**
     * Helper function to execute a download request.
     * @param {string} endpoint - The PHP file endpoint (e.g., '../controllers/export_summary.php')
     * @param {string} finalFileName - The name for the downloaded file (e.g., 'MyReport_Summary.csv')
     */
    const executeDownload = async (endpoint, finalFileName) => {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ salesData: currentFilteredData })
        });

        if (!response.ok) {
            // Throw an error that includes the file name for better feedback
            throw new Error(`Server returned an error for ${finalFileName}`);
        }

        const blob = await response.blob();
        
        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = finalFileName; 
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    /**
     * Handles the Dual CSV export process.
     */
    const exportSalesData = async () => {
        if (currentFilteredData.length === 0) {
            feedbackEl.innerHTML = '<span class="text-red-500">No data to export.</span>';
            return;
        }
        
        // Use default if input is empty
        const baseFileName = exportFilenameEl.value.trim() || 'Sales_Report';
        
        exportBtn.disabled = true;
        feedbackEl.innerHTML = '<span class="text-blue-500">Generating Summary file (1 of 2)...</span>';

        try {
            // 1. Download Sales Summary
            const summaryFileName = `${baseFileName}_Sales_Summary.csv`;
            await executeDownload(
                '../controllers/export_summary.php', 
                summaryFileName
            );

            feedbackEl.innerHTML = '<span class="text-blue-500">Generating Details file (2 of 2)...</span>';

            // 2. Download Order Details
            // Add a small delay to help browsers process two quick downloads
            await new Promise(resolve => setTimeout(resolve, 500)); 
            
            const detailsFileName = `${baseFileName}_Order_Details.csv`;
            await executeDownload(
                '../controllers/export_details.php', 
                detailsFileName
            );

            feedbackEl.innerHTML = `<span class="text-green-600">Successfully generated both CSV files: "${summaryFileName}" and "${detailsFileName}".</span>`;

        } catch (error) {
            console.error('Export error:', error);
            feedbackEl.innerHTML = `<span class="text-red-600">Export failed: ${error.message}.</span>`;
        } finally {
            exportBtn.disabled = false;
        }
    };


    // --- Modal Logic ---

    const showOrderDetails = (order) => {
        modalOrderIdEl.textContent = order.order_id;
        detailsTableBody.innerHTML = '';

        order.details.forEach(item => {
            const row = detailsTableBody.insertRow();
            row.insertCell().textContent = item.product_name;
            row.insertCell().textContent = item.quantity;
            row.insertCell().textContent = formatCurrency(item.unit_price);
            row.insertCell().textContent = formatCurrency(item.quantity * item.unit_price);
        });

        detailsGrandTotalEl.textContent = formatCurrency(order.total_amount);
        detailsModal.classList.remove('hidden');
    };

    const hideOrderDetails = () => {
        detailsModal.classList.add('hidden');
    };

    // --- Event Listeners Initialization ---

    applyFiltersBtn.addEventListener('click', filterAndSearchData);
    orderSearchEl.addEventListener('input', filterAndSearchData);
    closeModalBtn.addEventListener('click', hideOrderDetails);
    
    // Listener for Export button
    exportBtn.addEventListener('click', exportSalesData); 

    window.addEventListener('click', (event) => {
        if (event.target === detailsModal) {
            hideOrderDetails();
        }
    });

    // --- Data Fetching ---

    const fetchSalesData = async () => {
        try {
            const response = await fetch('../controllers/sales_history.php'); 
            const result = await response.json();

            if (result.status === 'success') {
                allSalesData = result.data;
                renderTable(allSalesData);
                updateSummaryMetrics(allSalesData);
            } else {
                console.error('Error fetching sales data:', result.message);
                emptyMessageEl.textContent = `Error loading sales data: ${result.message}`;
                emptyMessageEl.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Network error:', error);
            emptyMessageEl.textContent = 'Network error occurred while fetching sales data.';
            emptyMessageEl.classList.remove('hidden');
        }
    };

    fetchSalesData();
});