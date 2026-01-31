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
      'Save_Numeric': parseSavePercent(row['Save %'])  // Add numeric field for sorting/filtering
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

    // DEBUG: Check if filters will work
    console.log("✅ Filter counts:", { retailers: retailers.length, provinces: provinces.length, brands: brands.length });
    if (retailers.length === 0 || provinces.length === 0 || brands.length === 0) {
      console.warn("⚠️ One or more filter lists are empty. Check your data.json for blank values.");
    }

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
            // Sort by numeric value, not string
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

    // Setup custom filter event listeners
    setupCustomFilters();
  })
  .catch(err => {
    console.error("Failed to load ", err);
    document.getElementById("table").innerHTML = "<p style='text-align:center;color:red;'>Error loading deals.</p>";
  });

// Setup custom filter controls
function setupCustomFilters() {
  document.getElementById('filter-province').addEventListener('change', applyCustomFilters);
  document.getElementById('filter-retailer').addEventListener('change', applyCustomFilters);
  document.getElementById('filter-brand').addEventListener('input', applyCustomFilters);
  document.getElementById('filter-save').addEventListener('change', applyCustomFilters);
  document.getElementById('filter-points').addEventListener('change', applyCustomFilters);
}

// Apply all custom filters
function applyCustomFilters() {
  const province = document.getElementById('filter-province').value;
  const retailer = document.getElementById('filter-retailer').value;
  const brand = document.getElementById('filter-brand').value.toLowerCase().trim();
  const save = document.getElementById('filter-save').value;
  const points = document.getElementById('filter-points').value;

  let filteredData = [...allDeals];

  // Province filter
  if (province && province !== 'All') {
    filteredData = filteredData.filter(d => d.Province === province);
  }

  // Retailer filter
  if (retailer && retailer !== 'All') {
    filteredData = filteredData.filter(d => d.Retailer === retailer);
  }

  // Brand filter (text search)
  if (brand) {
    filteredData = filteredData.filter(d => 
      (d.Brand || '').toLowerCase().includes(brand)
    );
  }

  // Save % filter
  if (save && save !== 'All') {
    const threshold = parseInt(save);
    filteredData = filteredData.filter(d => d.Save_Numeric >= threshold);
  }

  // PC Points filter
  if (points && points !== 'All') {
    if (points === '100-999') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 100 && d['PC Pts'] < 1000);
    } else if (points === '1000-9999') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 1000 && d['PC Pts'] < 10000);
    } else if (points === '10000+') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 10000);
    }
  }

  table.setData(filteredData);
}

// ===== FILTER BUTTONS =====
function filterHighPoints() {
  document.getElementById('filter-points').value = '10000+';
  applyCustomFilters();
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
  document.getElementById('filter-province').value = 'BC';
  document.getElementById('filter-points').value = '1000-9999';
  applyCustomFilters();
  
  // Additional filter for active deals
  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d => 
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterON() {
  document.getElementById('filter-province').value = 'ON';
  document.getElementById('filter-points').value = '1000-9999';
  applyCustomFilters();
  
  // Additional filter for active deals
  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d => 
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterAB() {
  document.getElementById('filter-province').value = 'AB';
  document.getElementById('filter-points').value = '1000-9999';
  applyCustomFilters();
  
  // Additional filter for active deals
  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d => 
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterMagicHour() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  // Filter to only Shoppers Drug Mart deals
  const sdmDeals = allDeals.filter(deal => {
    const retailer = (deal.Retailer || '').toLowerCase();
    return retailer.includes('shoppers') || retailer.includes('drug mart');
  });
  
  // Group deals by product (using Name + Brand as identifier)
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
  
  // Find products with 2+ overlapping deals (any combination)
  productMap.forEach((deals, productKey) => {
    // Only consider products with significant offers
    const validDeals = deals.filter(d => 
      (d['PC Pts'] || 0) >= 1000 || (d.Save_Numeric || 0) >= 10
    );
    
    // Need at least 2 deals to have a magic hour
    if (validDeals.length < 2) return;
    
    // Check all pairs of deals for overlaps
    for (let i = 0; i < validDeals.length; i++) {
      for (let j = i + 1; j < validDeals.length; j++) {
        const d1 = validDeals[i];
        const d2 = validDeals[j];
        
        // Parse dates (format: 2026-01-31)
        const d1From = new Date(d1['Valid From'] + 'T00:00:00');
        const d1To = new Date(d1['Valid To'] + 'T23:59:59');
        const d2From = new Date(d2['Valid From'] + 'T00:00:00');
        const d2To = new Date(d2['Valid To'] + 'T23:59:59');
        
        // Calculate overlap
        const overlapStart = d1From > d2From ? d1From : d2From;
        const overlapEnd = d1To < d2To ? d1To : d2To;
        
        // Check if there's an overlap and it includes today
        if (overlapStart <= overlapEnd && today >= overlapStart && today <= overlapEnd) {
          const durationDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
          
          // Add both deals to magic deals list
          if (!magicDeals.includes(d1)) magicDeals.push(d1);
          if (!magicDeals.includes(d2)) magicDeals.push(d2);
          
          // Determine deal types for logging
          const d1Info = (d1['PC Pts'] || 0) >= 1000 
            ? `${d1['PC Pts'].toLocaleString()} pts`
            : d1['Save %'] || 'offer';
          const d2Info = (d2['PC Pts'] || 0) >= 1000 
            ? `${d2['PC Pts'].toLocaleString()} pts`
            : d2['Save %'] || 'offer';
          
          // Track the magic pair
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
    
    // Log detailed magic hour info
    console.log(`✨ Found ${magicPairs.length} Magic Hour opportunities (${magicDeals.length} deals):`);
    magicPairs.forEach((pair, idx) => {
      console.log(`${idx + 1}. ${pair.brand} ${pair.product}`);
      console.log(`   💰 ${pair.deal1} + ${pair.deal2}`);
      console.log(`   📅 ${pair.overlapStart} to ${pair.overlapEnd} (${pair.durationDays} days)`);
    });
  } else {
    // No magic hours found - clear table and show message
    table.setData([]);
    console.log("❌ No Magic Hour deals found. Magic Hours occur when the same product at Shoppers Drug Mart has 2+ overlapping offers that include today.");
    document.getElementById("table").innerHTML = "<p style='text-align:center;padding:40px;color:#666;'>No Magic Hour deals available today. Check back soon!</p>";
  }
}

function clearFilters() {
  // Reset all filter dropdowns
  document.getElementById('filter-province').value = 'All';
  document.getElementById('filter-retailer').value = 'All';
  document.getElementById('filter-brand').value = '';
  document.getElementById('filter-save').value = 'All';
  document.getElementById('filter-points').value = 'All';
  
  // Reset table to all data
  table.setData(allDeals);
}