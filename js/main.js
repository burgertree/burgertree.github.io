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
        { title: "Retailer", field: "Retailer", headerFilter: "input" },
        { title: "Province", field: "Province", headerFilter: "input" },
        { title: "Brand", field: "Brand", headerFilter: "input" },
        { title: "Name", field: "Name", widthGrow: 2 },
        { title: "Price", field: "Price", formatter: "money", formatterParams: { decimal: ".", thousand: ",", symbol: "$" } },
        { title: "Save %", field: "Save %" },
        { title: "PC Pts", field: "PC Pts", sorter: "number", headerFilter: "number" },
        { title: "Valid From", field: "Valid From" },
        { title: "Valid To", field: "Valid To" },
        {
          title: "Details",
          formatter: function(cell) {
            const url = cell.getRow().getData()['Item Web URL'];
            return url ? `<a href="${url}" target="_blank">View Product</a>` : "";
          }
        }
      ]
    });
  });

// Predefined filters
function filterHighPoints() {
  table.setFilter("PC Pts", ">=", 10000);
}

function filterActive() {
  const today = "2026-01-27"; // Replace with dynamic date if needed
  table.setFilter([
    { field: "Valid From", type: "<=", value: today },
    { field: "Valid To", type: ">=", value: today },
    { field: "has_Expired", type: "=", value: "FALSE" }
  ]);
}

function clearFilters() {
  table.clearFilter();
}
