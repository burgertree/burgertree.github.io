function parsePoints(str) {
  if (!str) return 0;
  const clean = str.toString().replace(/,/g, '').trim();
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

// Helper: Extract numeric percentage from "Save 30%" → 30
function parseSavePercent(str) {
  if (!str) return 0;
  const match = str.toString().match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 0;
}

// Helper: Calculate days until expiry
function calculateExpiry(validTo) {
  if (!validTo || validTo === '') {
    console.warn('Missing Valid To date');
    return 'N/A';
  }
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse date in YYYY-MM-DD format
    const expiryDate = new Date(validTo + 'T23:59:59');
    
    // Check if date is valid
    if (isNaN(expiryDate.getTime())) {
      console.warn('Invalid date format:', validTo);
      return 'Invalid';
    }
    
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  } catch (error) {
    console.error('Error calculating expiry:', error, 'for date:', validTo);
    return 'Error';
  }
}

let table;
let allDeals = []; // Store original data
let activeFilters = {
  province: ['All'],
  retailer: ['All'],
  brand: '',
  save: 'All',
  points: 'All'
};

fetch('data/data.json')
  .then(response => response.json())
  .then(rawData => {
    // Clean data + add numeric Save % field and expiry
    const data = rawData.map(row => ({
      ...row,
      'PC Pts': parsePoints(row['PC Pts']),
      'Price': parseFloat(row['Price']) || null,
      'Province': (row['Province'] || '').toString().trim(),
      'Retailer': (row['Retailer'] || '').toString().trim(),
      'Brand': (row['Brand'] || '').toString().trim(),
      'Name': (row['Name'] || '').toString().trim(),
      'Offer': (row['Offer'] || '').toString().trim(),
      'Details': (row['Details'] || '').toString().trim(),
      'Terms': (row['Terms'] || '').toString().trim(),
      'Item Web URL': (row['Item Web URL'] || '').toString().trim(),
      'Valid From': (row['Valid From'] || '').toString().trim(),
      'Valid To': (row['Valid To'] || '').toString().trim(),
      'Save %': (row['Save %'] || '').toString().trim(),
      'Save_Numeric': parseSavePercent(row['Save %']),
      'Expiry': calculateExpiry(row['Valid To'])
    }));

    // Store original data
    allDeals = data;

    console.log("✅ Data loaded:", allDeals.length, "deals");
    console.log("📅 Sample Valid To:", data[0]?.['Valid To']);
    console.log("⏰ Sample Expiry:", data[0]?.['Expiry']);

    table = new Tabulator("#table", {
      data,
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 20,
      movableColumns: true,
      resizableColumns: true,
      width: "100%",
      columns: [
        {
          title: "Retailer",
          field: "Retailer",
          hozAlign: "center",
          widthGrow: 1,
          minWidth: 120,
          resizable: true
        },
        {
          title: "Province",
          field: "Province",
          hozAlign: "center",
          width: 80,
          resizable: true
        },
        {
          title: "Brand",
          field: "Brand",
          hozAlign: "center",
          widthGrow: 1,
          minWidth: 100,
          resizable: true
        },
        {
          title: "Name",
          field: "Name",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          widthGrow: 3,
          minWidth: 200,
          resizable: true
        },
        {
          title: "Price",
          field: "Price",
          hozAlign: "center",
          formatter: "money",
          formatterParams: { 
            decimal: ".", 
            thousand: ",", 
            symbol: "$",
            precision: 2
          },
          width: 80,
          resizable: true
        },
        {
          title: "Save %",
          field: "Save %",
          hozAlign: "center",
          sorter: function(a, b, aRow, bRow) {
            const aNum = aRow.getData().Save_Numeric;
            const bNum = bRow.getData().Save_Numeric;
            return aNum - bNum;
          },
          width: 90,
          resizable: true
        },
        {
          title: "PC Pts",
          field: "PC Pts",
          hozAlign: "center",
          sorter: "number",
          formatter: function(cell) {
            const val = cell.getValue();
            if (val === null || val === undefined || val === 0) return "";
            return val.toLocaleString('en-CA', { maximumFractionDigits: 0 });
          },
          width: 90,
          resizable: true
        },
        {
          title: "Offer",
          field: "Offer",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          widthGrow: 2,
          minWidth: 150,
          resizable: true
        },
        {
          title: "Details",
          field: "Details",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          widthGrow: 2,
          minWidth: 150,
          resizable: true
        },
        {
          title: "Terms",
          field: "Terms",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          widthGrow: 2,
          minWidth: 150,
          resizable: true
        },
        {
          title: "Expiry",
          field: "Expiry",
          hozAlign: "center",
          width: 90,
          resizable: true
        },
        {
          title: "URL",
          field: "Item Web URL",
          hozAlign: "center",
          formatter: function(cell) {
            const url = cell.getValue();
            return url ? `<a href="${url}" target="_blank" rel="noopener">View</a>` : "";
          },
          width: 70,
          resizable: true
        }
      ]
    });

    // Setup filter button listeners
    setupFilterButtons();
  })
  .catch(err => {
    console.error("Failed to load ", err);
    document.getElementById("table").innerHTML = "<p style='text-align:center;color:red;'>Error loading deals.</p>";
  });

// Setup filter button event listeners
function setupFilterButtons() {
  // Handle all filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const filterType = this.dataset.filter;
      const filterValue = this.dataset.value;
      
      // Handle province and retailer with multiple selection
      if (filterType === 'province' || filterType === 'retailer') {
        if (filterValue === 'All') {
          // Select "All" - deselect everything else
          this.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          activeFilters[filterType] = ['All'];
        } else {
          // Deselect "All" if it was selected
          const allBtn = this.parentElement.querySelector('[data-value="All"]');
          if (allBtn) allBtn.classList.remove('active');
          
          // Toggle this button
          if (this.classList.contains('active')) {
            // Deselect
            this.classList.remove('active');
            const index = activeFilters[filterType].indexOf(filterValue);
            if (index > -1) {
              activeFilters[filterType].splice(index, 1);
            }
            
            // If nothing selected, revert to "All"
            if (activeFilters[filterType].length === 0 || 
                (activeFilters[filterType].length === 1 && activeFilters[filterType][0] === 'All')) {
              if (allBtn) allBtn.classList.add('active');
              activeFilters[filterType] = ['All'];
            }
          } else {
            // Select
            this.classList.add('active');
            if (activeFilters[filterType].includes('All')) {
              activeFilters[filterType] = [filterValue];
            } else {
              if (!activeFilters[filterType].includes(filterValue)) {
                activeFilters[filterType].push(filterValue);
              }
            }
          }
        }
      } else {
        // Single selection for other filters (save, points)
        this.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        activeFilters[filterType] = filterValue;
      }
      
      // Apply filters
      applyFilters();
    });
  });
  
  // Handle brand text input
  document.getElementById('filter-brand').addEventListener('input', function() {
    activeFilters.brand = this.value.toLowerCase().trim();
    applyFilters();
  });
}

// Apply all active filters
function applyFilters() {
  let filteredData = [...allDeals];

  // Province filter (multiple selection)
  if (!activeFilters.province.includes('All')) {
    filteredData = filteredData.filter(d => activeFilters.province.includes(d.Province));
  }

  // Retailer filter (multiple selection)
  if (!activeFilters.retailer.includes('All')) {
    filteredData = filteredData.filter(d => activeFilters.retailer.includes(d.Retailer));
  }

  // Brand filter
  if (activeFilters.brand) {
    filteredData = filteredData.filter(d => 
      (d.Brand || '').toLowerCase().includes(activeFilters.brand)
    );
  }

  // Save % filter
  if (activeFilters.save !== 'All') {
    const threshold = parseInt(activeFilters.save);
    filteredData = filteredData.filter(d => d.Save_Numeric >= threshold);
  }

  // PC Points filter
  if (activeFilters.points !== 'All') {
    if (activeFilters.points === '100-999') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 100 && d['PC Pts'] < 1000);
    } else if (activeFilters.points === '1000-9999') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 1000 && d['PC Pts'] < 10000);
    } else if (activeFilters.points === '10000+') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 10000);
    }
  }

  table.setData(filteredData);
}

// Set active button for a filter group
function setActiveFilter(filterType, value) {
  if (filterType === 'province' || filterType === 'retailer') {
    // Multiple selection filters - reset to single value
    document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === value) {
        btn.classList.add('active');
      }
    });
    activeFilters[filterType] = [value];
  } else {
    // Single selection filters
    document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === value) {
        btn.classList.add('active');
      }
    });
    activeFilters[filterType] = value;
  }
}

// ===== FILTER BUTTONS =====
function filterHighPoints() {
  setActiveFilter('points', '10000+');
  applyFilters();
}

function filterActive() {
  const today = new Date().toISOString().split('T')[0];
  let filteredData = allDeals.filter(d => {
    return d['Valid From'] <= today && 
           d['Valid To'] >= today && 
           d['has_Expired'] === 'FALSE';
  });
  table.setData(filteredData);
}

function filterBC() {
  setActiveFilter('province', 'BC');
  setActiveFilter('points', '1000-9999');
  applyFilters();
  
  // Additional filter for active deals
  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d => 
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterON() {
  setActiveFilter('province', 'ON');
  setActiveFilter('points', '1000-9999');
  applyFilters();
  
  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d => 
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterAB() {
  setActiveFilter('province', 'AB');
  setActiveFilter('points', '1000-9999');
  applyFilters();
  
  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d => 
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterMagicHour() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter to only Shoppers Drug Mart deals from allDeals (not current table data)
  const sdmDeals = allDeals.filter(deal => {
    const retailer = (deal.Retailer || '').toLowerCase();
    return retailer.includes('shoppers') || retailer.includes('drug mart');
  });
  
  // Group deals by product
  const productMap = new Map();
  
  sdmDeals.forEach(deal => {
    const productKey = `${deal.Brand || ''}|${deal.Name || ''}`.toLowerCase().trim();
    if (!productKey || productKey === '|') return;
    
    if (!productMap.has(productKey)) {
      productMap.set(productKey, []);
    }
    productMap.get(productKey).push(deal);
  });
  
  const magicDeals = [];
  const magicPairs = [];
  
  // Find products with 2+ overlapping deals
  productMap.forEach((deals, productKey) => {
    const validDeals = deals.filter(d => 
      (d['PC Pts'] || 0) >= 1000 || (d.Save_Numeric || 0) >= 10
    );
    
    if (validDeals.length < 2) return;
    
    // Check all pairs of deals for overlaps
    for (let i = 0; i < validDeals.length; i++) {
      for (let j = i + 1; j < validDeals.length; j++) {
        const d1 = validDeals[i];
        const d2 = validDeals[j];
        
        const d1From = new Date(d1['Valid From'] + 'T00:00:00');
        const d1To = new Date(d1['Valid To'] + 'T23:59:59');
        const d2From = new Date(d2['Valid From'] + 'T00:00:00');
        const d2To = new Date(d2['Valid To'] + 'T23:59:59');
        
        const overlapStart = d1From > d2From ? d1From : d2From;
        const overlapEnd = d1To < d2To ? d1To : d2To;
        
        if (overlapStart <= overlapEnd && today >= overlapStart && today <= overlapEnd) {
          const durationDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
          
          if (!magicDeals.includes(d1)) magicDeals.push(d1);
          if (!magicDeals.includes(d2)) magicDeals.push(d2);
          
          const d1Info = (d1['PC Pts'] || 0) >= 1000 
            ? `${d1['PC Pts'].toLocaleString()} pts`
            : d1['Save %'] || 'offer';
          const d2Info = (d2['PC Pts'] || 0) >= 1000 
            ? `${d2['PC Pts'].toLocaleString()} pts`
            : d2['Save %'] || 'offer';
          
          magicPairs.push({
            product: d1.Name || 'Unknown',
            brand: d1.Brand || '',
            deal1: d1Info,
            deal2: d2Info,
            overlapStart: overlapStart.toISOString().split('T')[0],
            overlapEnd: overlapEnd.toISOString().split('T')[0],
            durationDays: durationDays
          });
        }
      }
    }
  });
  
  if (magicDeals.length > 0) {
    table.setData(magicDeals);
    
    console.log(`✨ Found ${magicPairs.length} Magic Hour opportunities (${magicDeals.length} deals):`);
    magicPairs.forEach((pair, idx) => {
      console.log(`${idx + 1}. ${pair.brand} ${pair.product}`);
      console.log(`   💰 ${pair.deal1} + ${pair.deal2}`);
      console.log(`   📅 ${pair.overlapStart} to ${pair.overlapEnd} (${pair.durationDays} days)`);
    });
  } else {
    table.setData([]);
    console.log("❌ No Magic Hour deals found.");
    const tableContainer = document.getElementById("table");
    if (tableContainer) {
      tableContainer.innerHTML = "<p style='text-align:center;padding:40px;color:#666;'>No Magic Hour deals available today. Check back soon!</p>";
    }
  }
}

function clearFilters() {
  // Reset all filter buttons to "All"
  setActiveFilter('province', 'All');
  setActiveFilter('retailer', 'All');
  setActiveFilter('save', 'All');
  setActiveFilter('points', 'All');
  
  // Clear brand input
  document.getElementById('filter-brand').value = '';
  activeFilters.brand = '';
  
  // Reset table to all data
  table.setData(allDeals);
}