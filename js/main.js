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

let table;
let allDeals = []; // Store original data
let activeFilters = {
  province: 'All',
  retailer: 'All',
  brand: '',
  save: 'All',
  points: 'All'
};

fetch('data/data.json')
  .then(response => response.json())
  .then(rawData => {
    // Clean data + add numeric Save % field
    const data = rawData.map(row => ({
      ...row,
      'PC Pts': parsePoints(row['PC Pts']),
      'Price': parseFloat(row['Price']) || null,
      'Province': (row['Province'] || '').toString().trim(),
      'Retailer': (row['Retailer'] || '').toString().trim(),
      'Brand': (row['Brand'] || '').toString().trim(),
      'Name': (row['Name'] || '').toString().trim(),
      'Description': (row['Description'] || '').toString().trim(),
      'Save %': (row['Save %'] || '').toString().trim(),
      'Save_Numeric': parseSavePercent(row['Save %'])
    }));

    // Store original data
    allDeals = data;

    // Extract UNIQUE, NON-EMPTY values
    const provinces = [...new Set(
      data.map(r => r.Province).filter(p => p && p.length > 0)
    )].sort();

    const retailers = [...new Set(
      data.map(r => r.Retailer).filter(r => r && r.length > 0)
    )].sort();

    const brands = [...new Set(
      data.map(r => r.Brand).filter(b => b && b.length > 0)
    )].sort();

    console.log("✅ Filter counts:", { retailers: retailers.length, provinces: provinces.length, brands: brands.length });

    table = new Tabulator("#table", {
      data,
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 20,
      movableColumns: true,
      width: "100%",
      columns: [
        {
          title: "Retailer",
          field: "Retailer",
          hozAlign: "center",
          width: 140
        },
        {
          title: "Province",
          field: "Province",
          hozAlign: "center",
          width: 90
        },
        {
          title: "Brand",
          field: "Brand",
          hozAlign: "center",
          width: 130
        },
        {
          title: "Name",
          field: "Name",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          minWidth: 200,
          widthGrow: 2
        },
        {
          title: "Description",
          field: "Description",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          minWidth: 150,
          widthGrow: 1
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
          }
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
          width: 100
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
          }
        },
        {
          title: "Valid<br>From",
          field: "Valid From",
          hozAlign: "center"
        },
        {
          title: "Valid<br>To",
          field: "Valid To",
          hozAlign: "center"
        },
        {
          title: "Details",
          field: "Item Web URL",
          hozAlign: "center",
          formatter: function(cell) {
            const url = cell.getValue();
            return url ? `<a href="${url}" target="_blank" rel="noopener">View</a>` : "";
          }
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
      
      // Update active state
      this.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Update active filters
      activeFilters[filterType] = filterValue;
      
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

  // Province filter
  if (activeFilters.province !== 'All') {
    filteredData = filteredData.filter(d => d.Province === activeFilters.province);
  }

  // Retailer filter
  if (activeFilters.retailer !== 'All') {
    filteredData = filteredData.filter(d => d.Retailer === activeFilters.retailer);
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
  document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.value === value) {
      btn.classList.add('active');
    }
  });
  activeFilters[filterType] = value;
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
  
  // Filter to only Shoppers Drug Mart deals
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
    document.getElementById("table").innerHTML = "<p style='text-align:center;padding:40px;color:#666;'>No Magic Hour deals available today. Check back soon!</p>";
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