function parsePoints(str) {
  if (!str) return 0;
  const clean = str.toString().replace(/,/g, '').trim();
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

let table;

fetch('data/data.json')
  .then(response => response.json())
  .then(rawData => {
    // Clean data + log sample
    const data = rawData.map(row => ({
      ...row,
      'PC Pts': parsePoints(row['PC Pts']),
      'Price': parseFloat(row['Price']) || null,
      'Province': (row['Province'] || '').toString().trim(),
      'Retailer': (row['Retailer'] || '').toString().trim(),
      'Brand': (row['Brand'] || '').toString().trim(),
      'Name': (row['Name'] || '').toString().trim(),
      'Description': (row['Description'] || '').toString().trim(),
      'Save %': (row['Save %'] || '').toString().trim()
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
          headerFilter: "autocomplete",
          headerFilterParams: {
            values: retailers,
            allowEmpty: true,
            searchFunc: "contains"
          },
          width: 140  // ← Critical: fixed width
        },
        {
          title: "Province",
          field: "Province",
          hozAlign: "center",
          headerFilter: "select",  // ← Dropdown, not text
          headerFilterParams: {
            values: ["", ...provinces]  // include blank option
          },
          width: 90
        },
        {
          title: "Brand",
          field: "Brand",
          hozAlign: "center",
          headerFilter: "autocomplete",
          headerFilterParams: {
            values: brands,
            allowEmpty: true,
            searchFunc: "contains"
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
          formatterParams: { decimal: ".", thousand: ",", symbol: "$" }
        },
        {
          title: "Save %",
          field: "Save %",
          hozAlign: "center",
          headerFilter: "select",  // ← Dropdown with ranges
          headerFilterParams: {
            values: {
              "": "All",
              "20": "> 20%",
              "50": "> 50%",
              "75": "> 75%"
            }
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

    // Custom filter logic for Save % dropdown
    table.on("headerFilterChanged", function(filter) {
      if (filter.field === "Save %") {
        const value = filter.value;
        if (value === "") {
          table.removeFilter("customSave");
        } else {
          const threshold = parseInt(value);
          table.setFilter("customSave", function(data) {
            const saveStr = data["Save %"];
            if (!saveStr) return false;
            // Extract number from "Save 30%" → 30
            const match = saveStr.match(/(\d+)%/);
            const saveNum = match ? parseInt(match[1], 10) : 0;
            return saveNum >= threshold;
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

function clearFilters() {
  table.clearFilter();
}