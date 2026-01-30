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
  
  // Group deals by product (using Name + Brand as identifier)
  const productMap = new Map();
  
  allData.forEach(deal => {
    const productKey = `${deal.Brand || ''}|${deal.Name || ''}`.toLowerCase().trim();
    if (!productKey || productKey === '|') return;
    
    if (!productMap.has(productKey)) {
      productMap.set(productKey, []);
    }
    productMap.get(productKey).push(deal);
  });
  
  const magicDeals = [];
  const magicPairs = [];
  
  // Find products with overlapping points + save offers
  productMap.forEach((deals, productKey) => {
    // Separate into points deals and save deals
    const pointsDeals = deals.filter(d => (d['PC Pts'] || 0) >= 1000);
    const saveDeals = deals.filter(d => (d.Save_Numeric || 0) >= 10); // Lower threshold for save
    
    // Check for overlaps between points and save deals
    pointsDeals.forEach(pDeal => {
      saveDeals.forEach(sDeal => {
        // Skip if it's the same deal
        if (pDeal === sDeal) return;
        
        // Parse dates
        const pFrom = new Date(pDeal['Valid From']);
        const pTo = new Date(pDeal['Valid To']);
        const sFrom = new Date(sDeal['Valid From']);
        const sTo = new Date(sDeal['Valid To']);
        
        pFrom.setHours(0, 0, 0, 0);
        pTo.setHours(23, 59, 59, 999);
        sFrom.setHours(0, 0, 0, 0);
        sTo.setHours(23, 59, 59, 999);
        
        // Calculate overlap
        const overlapStart = pFrom > sFrom ? pFrom : sFrom;
        const overlapEnd = pTo < sTo ? pTo : sTo;
        
        // Check if there's an overlap and it includes today
        if (overlapStart <= overlapEnd && today >= overlapStart && today <= overlapEnd) {
          const durationDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
          
          // Add both deals to magic deals list
          if (!magicDeals.includes(pDeal)) magicDeals.push(pDeal);
          if (!magicDeals.includes(sDeal)) magicDeals.push(sDeal);
          
          // Track the magic pair
          magicPairs.push({
            product: pDeal.Name || 'Unknown',
            brand: pDeal.Brand || '',
            points: pDeal['PC Pts'],
            save: sDeal['Save %'],
            overlapStart: overlapStart.toISOString().split('T')[0],
            overlapEnd: overlapEnd.toISOString().split('T')[0],
            durationDays: durationDays
          });
        }
      });
    });
  });
  
  if (magicDeals.length > 0) {
    table.setData(magicDeals);
    
    // Log detailed magic hour info
    console.log(`✨ Found ${magicPairs.length} Magic Hour opportunities (${magicDeals.length} deals):`);
    magicPairs.forEach((pair, idx) => {
      console.log(`${idx + 1}. ${pair.brand} ${pair.product}`);
      console.log(`   💰 ${pair.points.toLocaleString()} pts + ${pair.save}`);
      console.log(`   📅 ${pair.overlapStart} to ${pair.overlapEnd} (${pair.durationDays} days)`);
    });
    
    alert(`✨ Found ${magicPairs.length} Magic Hour deals where you can stack PC Points + Save offers! Check console for details.`);
  } else {
    alert("No Magic Hour deals found today. Magic Hours occur when the same product has both a PC Points offer AND a Save % offer with overlapping dates.");
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