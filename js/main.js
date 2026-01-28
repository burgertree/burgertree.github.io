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

    // Extract unique values
    const provinces = [...new Set(data.map(r => r.Province).filter(p => p))].sort();
    const retailers = [...new Set(data.map(r => r.Retailer).filter(r => r))].sort();
    const brands = [...new Set(data.map(r => r.Brand).filter(b => b))].sort();

    // Build retailer list for disclaimer (top 5)
    const topRetailers = [...new Set(data.map(r => r.Retailer))].slice(0, 5).join(', ');

    // Update footer disclaimer dynamically (optional)
    const footer = document.querySelector('footer p');
    if (footer) {
      footer.innerHTML = `<strong>Disclaimer:</strong> Data sourced from public flyers of retailers including ${topRetailers}, and others.`;
    }

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
          headerHozAlign: "center",
          headerFilter: "autocomplete",
          headerFilterParams: { values: retailers, allowEmpty: true },
          width: 140
        },
        {
          title: "Province",
          field: "Province",
          hozAlign: "center",
          headerHozAlign: "center",
          headerFilter: "select",
          headerFilterParams: { values: ["", ...provinces] },
          width: 90
        },
        {
          title: "Brand",
          field: "Brand",
          hozAlign: "center",
          headerHozAlign: "center",
          headerFilter: "autocomplete",
          headerFilterParams: { values: brands, allowEmpty: true },
          width: 120
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
          // ❌ No headerFilter → not searchable
          formatter: "plaintext",
          minWidth: 150,
          widthGrow: 1
        },
        {
          title: "Price",
          field: "Price",
          hozAlign: "center",
          headerHozAlign: "center",
          formatter: "money",
          formatterParams: { decimal: ".", thousand: ",", symbol: "$" },
          width: 80
        },
        {
          title: "Save %",
          field: "Save %",
          hozAlign: "center",
          headerHozAlign: "center",
          headerFilter: "input",
          width: 80
        },
        {
          title: "PC Pts",
          field: "PC Pts",
          hozAlign: "center",
          headerHozAlign: "center",
          sorter: "number",
          formatter: function(cell) {
            const val = cell.getValue();
            if (val === null || val === undefined || val === 0) return "";
            return val.toLocaleString('en-CA', { maximumFractionDigits: 0 });
          },
          width: 90
        },
        {
          title: "Valid From",
          field: "Valid From",
          hozAlign: "center",
          headerHozAlign: "center",
          width: 100
        },
        {
          title: "Valid To",
          field: "Valid To",
          hozAlign: "center",
          headerHozAlign: "center",
          width: 100
        },
        {
          title: "Details",
          field: "Item Web URL",
          hozAlign: "center",
          headerHozAlign: "center",
          formatter: function(cell) {
            const url = cell.getValue();
            return url ? `<a href="${url}" target="_blank" rel="noopener">View</a>` : "";
          },
          width: 80
        }
      ]
    });
  })
  .catch(err => {
    console.error("Failed to load ", err);
    document.getElementById("table").innerHTML = "<p style='text-align:center;color:red;'>Error loading deals.</p>";
  });

// Global filter functions
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
