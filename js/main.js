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
      columnDefaults: {
        headerHozAlign: "center"
      },
      columns: [
        {
          title: "Retailer",
          field: "Retailer",
          hozAlign: "center",
          headerFilter: "list",
          headerFilterParams: {
            values: ["", ...retailers],
            clearable: true
          },
          width: 140
        },
        {
          title: "Province",
          field: "Province",
          hozAlign: "center",
          headerFilter: "list",
          headerFilterParams: {
            values: ["", ...provinces],
            clearable: true
          },
          width: 90
        },
        {
          title: "Brand",
          field: "Brand",
          hozAlign: "center",
          headerFilter: "list",
          headerFilterParams: {
            values: ["", ...brands],
            clearable: true
          },
          width: 130
        },
        {
          title: "Name",
          field: "Name",
          hozAlign: "left",
          headerHozAlign: "left",
          headerFilter: "input",
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
          headerFilter: "list",
          headerFilterParams: {
            values: {
              "": "All",
              "20": "≥ 20%",
              "50": "≥ 50%",
              "75": "≥ 75%"
            },
            clearable: true
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

    // Custom filter logic for Save % dropdown - filter by NUMERIC value
    table.on("headerFilterChanged", function(filter) {
      if (filter.field === "Save %") {
        const value = filter.value;
        if (value === "") {
          table.removeFilter("customSave");
        } else {
          const threshold = parseInt(value);
          table.setFilter("customSave", function(data) {
            return data.Save_Numeric >= threshold;
          });
        }
      }
    });
  })
  .catch(err => {
    console.error("Failed to load ", err);
    document.getElementById("table").innerHTML = "<p style='text-align:center;color:red;'>Error loading deals.</p>";
  });

// ===== FILTER BUTTONS =====
function filterHighPoints() {
  table.setFilter("PC Pts", ">=", 10000);
}

function filterActive() {
  const today = new Date().toISOString().split('T')[0];
  table.setFilter([
    { field: "Valid From", type: "<=", value: today },
    { field: "Valid To", type: ">=", value: today },
    { field: "has_Expired", type: "=", value: "FALSE" }
  ]);
}

function filterBC() {
  const today = new Date().toISOString().split('T')[0];
  table.setFilter([
    { field: "Province", type: "=", value: "BC" },
    { field: "Valid From", type: "<=", value: today },
    { field: "Valid To", type: ">=", value: today },
    [
      { field: "PC Pts", type: ">=", value: 1000 },
      { field: "Save %", type: "!=", value: "" }
    ]
  ]);
}

function filterON() {
  const today = new Date().toISOString().split('T')[0];
  table.setFilter([
    { field: "Province", type: "=", value: "ON" },
    { field: "Valid From", type: "<=", value: today },
    { field: "Valid To", type: ">=", value: today },
    [
      { field: "PC Pts", type: ">=", value: 1000 },
      { field: "Save %", type: "!=", value: "" }
    ]
  ]);
}

function filterAB() {
  const today = new Date().toISOString().split('T')[0];
  table.setFilter([
    { field: "Province", type: "=", value: "AB" },
    { field: "Valid From", type: "<=", value: today },
    { field: "Valid To", type: ">=", value: today },
    [
      { field: "PC Pts", type: ">=", value: 1000 },
      { field: "Save %", type: "!=", value: "" }
    ]
  ]);
}

function filterMagicHour() {
  const allData = table.getData();
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  // Filter to only Shoppers Drug Mart deals
  const sdmDeals = allData.filter(deal => {
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
  table.clearFilter();
  // Reset to original data
  fetch('data/data.json')
    .then(response => response.json())
    .then(rawData => {
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
      table.setData(data);
    });
}