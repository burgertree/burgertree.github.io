let table;

// Helper: Parse "15,000" or "15000" → 15000 (number)
function parsePoints(str) {
  if (!str) return 0;
  // Remove commas and non-digit chars (except minus, though unlikely)
  const clean = str.toString().replace(/,/g, '').trim();
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

fetch('data/data.json')
  .then(response => response.json())
  .then(rawData => {
    // Clean data
    const data = rawData.map(row => {
      // Parse PC Pts correctly (handles "15,000", "15000", etc.)
      const pcPts = parsePoints(row['PC Pts']);
      
      return {
        ...row,
        'PC Pts': pcPts,
        'Price': parseFloat(row['Price']) || null,
        'Province': (row['Province'] || '').toString().trim(),
        'Brand': (row['Brand'] || '').toString().trim()
      };
    });

    // Get unique provinces (non-empty, trimmed)
    const provinces = [...new Set(
      data
        .map(r => r.Province)
        .filter(p => p && p.length > 0)
    )].sort();

    // Initialize table
    table = new Tabulator("#table", {
      data: data,
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 20,
      movableColumns: true,
      columns: [
        {
          title: "Retailer",
          field: "Retailer",
          headerFilter: "autocomplete",
          headerFilterParams: { allowEmpty: true }
        },
        {
          title: "Province",
          field: "Province",
          headerFilter: "select",
          headerFilterParams: {
            values: ["", ...provinces] // include blank option
          }
        },
        {
          title: "Brand",
          field: "Brand",
          headerFilter: "autocomplete",
          headerFilterParams: { allowEmpty: true }
        },
        {
          title: "Name",
          field: "Name",
          widthGrow: 2,
          headerFilter: "input"
        },
        {
          title: "Price",
          field: "Price",
          formatter: "money",
          formatterParams: { decimal: ".", thousand: ",", symbol: "$", symbolAfter: false }
        },
        {
          title: "Save %",
          field: "Save %",
          headerFilter: "input"
        },
        {
          title: "PC Pts",
          field: "PC Pts",
          sorter: "number",
          formatter: function(cell) {
            const val = cell.getValue();
            if (val === null || val === undefined || val === 0) return "";
            return val.toLocaleString('en-CA', { maximumFractionDigits: 0 });
          },
          hozAlign: "right"
        },
        {
          title: "Valid From",
          field: "Valid From"
        },
        {
          title: "Valid To",
          field: "Valid To"
        },
        {
          title: "Details",
          formatter: function(cell) {
            const url = cell.getRow().getData()['Item Web URL'];
            return url ? `<a href="${url}" target="_blank" rel="noopener">View Product</a>` : "";
          }
        }
      ]
    });
  })
  .catch(err => {
    console.error("Failed to load data:", err);
    document.getElementById("table").innerHTML = "<p>Error loading deals. Please try again later.</p>";
  });

// Filter functions
function filterHighPoints() {
  table.setFilter("PC Pts", ">=", 10000);
}

function filterActive() {
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  table.setFilter([
    { field: "Valid From", type: "<=", value: today },
    { field: "Valid To", type: ">=", value: today },
    { field: "has_Expired", type: "=", value: "FALSE" }
      ]);
    }

function clearFilters() {
  table.clearFilter();
}
