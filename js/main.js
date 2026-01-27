// Helper: Parse "15,000" or "15000" → 15000
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
    // Clean and normalize data
    const data = rawData.map(row => ({
      ...row,
      'PC Pts': parsePoints(row['PC Pts']),
      'Price': parseFloat(row['Price']) || null,
      'Province': (row['Province'] || '').toString().trim(),
      'Retailer': (row['Retailer'] || '').toString().trim(),
      'Brand': (row['Brand'] || '').toString().trim()
    }));

    // Extract unique values for filters
    const provinces = [...new Set(data.map(r => r.Province).filter(p => p))].sort();
    const retailers = [...new Set(data.map(r => r.Retailer).filter(r => r))].sort();
    const brands = [...new Set(data.map(r => r.Brand).filter(b => b))].sort();

    // Initialize Tabulator
    table = new Tabulator("#table", {
      data,
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 20,
      movableColumns: true,
      resizableRows: false,
      width: "100%",
      columnDefaults: {
        headerFilterLiveFilter: false,
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
          }
        },
        {
          title: "Province",
          field: "Province",
          hozAlign: "center",
          headerFilter: "list",
          headerFilterParams: {
            values: ["", ...provinces],
            clearable: true
          }
        },
        {
          title: "Brand",
          field: "Brand",
          hozAlign: "center",
          headerFilter: "list",
          headerFilterParams: {
            values: ["", ...brands],
            clearable: true
          }
        },
        {
          title: "Name",
          field: "Name",
          hozAlign: "left",
          headerHozAlign: "left",
          widthGrow: 2,
          headerFilter: "input"
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
          title: "Valid From",
          field: "Valid From",
          hozAlign: "center"
        },
        {
          title: "Valid To",
          field: "Valid To",
          hozAlign: "center"
        },
        {
          title: "Details",
          field: "Item Web URL",
          hozAlign: "center",
          formatter: function(cell) {
            const url = cell.getValue();
            return url ? `<a href="${url}" target="_blank" rel="noopener">View Product</a>` : "";
          }
        }
      ]
    });
  })
  .catch(err => {
    console.error("Failed to load data:", err);
    document.getElementById("table").innerHTML = "<p style='text-align:center;color:red;'>Error loading deals. Please try again later.</p>";
  });

// Global filter functions (called from HTML buttons)
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

function clearFilters() {
  table.clearFilter();
}
