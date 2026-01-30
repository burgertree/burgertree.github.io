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
  
  // Find overlapping deals with different "types"
  // We'll define "type" based on having PC Points vs having Save %
  const magicDeals = [];
  
  for (let i = 0; i < allData.length; i++) {
    for (let j = i + 1; j < allData.length; j++) {
      const d1 = allData[i];
      const d2 = allData[j];
      
      // Define deal types
      const d1HasPoints = (d1['PC Pts'] || 0) >= 1000;
      const d2HasPoints = (d2['PC Pts'] || 0) >= 1000;
      const d1HasSave = (d1.Save_Numeric || 0) >= 20;
      const d2HasSave = (d2.Save_Numeric || 0) >= 20;
      
      // Skip if both have same type (both points or both save)
      const d1Type = d1HasPoints ? 'points' : (d1HasSave ? 'save' : 'none');
      const d2Type = d2HasPoints ? 'points' : (d2HasSave ? 'save' : 'none');
      
      if (d1Type === 'none' || d2Type === 'none' || d1Type === d2Type) {
        continue;
      }
      
      // Check date overlap
      const d1From = new Date(d1['Valid From']);
      const d1To = new Date(d1['Valid To']);
      const d2From = new Date(d2['Valid From']);
      const d2To = new Date(d2['Valid To']);
      
      const overlapStart = d1From > d2From ? d1From : d2From;
      const overlapEnd = d1To < d2To ? d1To : d2To;
      
      // If there's an overlap and it includes today
      if (overlapStart < overlapEnd && today >= overlapStart && today <= overlapEnd) {
        if (!magicDeals.includes(d1)) magicDeals.push(d1);
        if (!magicDeals.includes(d2)) magicDeals.push(d2);
      }
    }
  }
  
  if (magicDeals.length > 0) {
    table.setData(magicDeals);
    console.log(`✨ Found ${magicDeals.length} Magic Hour deals with overlapping periods!`);
  } else {
    alert("No Magic Hour deals found with overlapping valid periods today.");
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