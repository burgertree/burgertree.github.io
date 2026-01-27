let table;

// Load data and initialize table
fetch('data/data.json')
  .then(response => response.json())
  .then(data => {
    // Clean data: convert strings to numbers where needed
    data.forEach(row => {
      row['PC Pts'] = parseInt(row['PC Pts']) || 0;
      row['Price'] = parseFloat(row['Price']) || null;
    });

    table = new Tabulator("#table", {
      data: data,
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 20,
      movableColumns: true,
      resizableRows: false,
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
          headerFilterParams: { values: true }
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
          formatterParams: { decimal: ".", thousand: ",", symbol: "$" },
          headerFilter: "number"
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
            if (!val && val !== 0) return "";
            return Number(val).toLocaleString('en-CA', { maximumFractionDigits: 0 });
          },
          headerFilter: "number"
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
  });

// Predefined filters
function filterHighPoints() {
  // Filter for 10,000+ points (stored as number 10000 in data)
  table.setFilter("PC Pts", ">=", 10000);
}

function filterActive() {
  const today = new Date().toISOString().split('T')[0]; // e.g., "2026-01-27"
  table.setFilter([
    { field: "Valid From", type: "<=", value: today },
    { field: "Valid To", type: ">=", value: today },
    { field: "has_Expired", type: "=", value: "FALSE" }
  ]);
}

function clearFilters() {
  table.clearFilter();
}
