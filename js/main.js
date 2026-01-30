// Helper: Parse "15,000" → 15000
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
    // Clean data
    const data = rawData.map(row => ({
      ...row,
      'PC Pts': parsePoints(row['PC Pts']),
      'Price': parseFloat(row['Price']) || null,
      'Province': (row['Province'] || '').toString().trim(),
      'Retailer': (row['Retailer'] || '').toString().trim(),
      'Brand': (row['Brand'] || '').toString().trim(),
      'Name': (row['Name'] || '').toString().trim(),
      'Description': (row['Description'] || '').toString().trim()
    }));

    // Extract unique, non-empty values
    const provinces = [...new Set(data.map(r => r.Province).filter(p => p))].sort();
    const retailers = [...new Set(data.map(r => r.Retailer).filter(r => r))].sort();
    const brands = [...new Set(data.map(r => r.Brand).filter(b => b))].sort();

    // Debug: check filter values
    console.log("Filter counts → Retailers:", retailers.length, "Provinces:", provinces.length, "Brands:", brands.length);

    // Initialize table
    table = new Tabulator("#table", {
       data,
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 20,
      movableColumns: true,
      resizableRows: false,
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
          headerFilterParams: { values: retailers, allowEmpty: true },
          width: 130,
          minWidth: 100
        },
        {
          title: "Province",
          field: "Province",
          hozAlign: "center",
          headerFilter: "select",
          headerFilterParams: { values: ["", ...provinces] },
          width: 90,
          minWidth: 80
        },
        {
          title: "Brand",
          field: "Brand",
          hozAlign: "center",
          headerFilter: "autocomplete",
          headerFilterParams: { values: brands, allowEmpty: true },
          width: 120,
          minWidth: 100
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
          headerFilter: "input"
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
  })
  .catch(err => {
    console.error("Failed to load ", err);
    document.getElementById("table").innerHTML = "<p style='text-align:center;color:red;'>Error loading deals.</p>";
  });

// ===== FILTER FUNCTIONS =====
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