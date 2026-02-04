// Cookie Consent Logic
document.addEventListener("DOMContentLoaded", function () {
  if (!localStorage.getItem("cookieConsent")) {
    const banner = document.createElement("div");
    banner.id = "cookie-banner";
    banner.innerHTML = `
      <div class="banner-container">
        <div class="banner-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 15.5v.01"></path><path d="M12 12v.01"></path><path d="M11 17v.01"></path><path d="M7 14v.01"></path></svg>
        </div>
        <div class="banner-text">
          <strong>We value your privacy</strong>
          <p>We use cookies to enhance your experience and serve personalized ads via Google AdSense. 
          <a href="privacy.html">Privacy Policy</a></p>
        </div>
        <div class="banner-actions">
          <button id="accept-cookies">Got it!</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);
    banner.style.display = "block";

    document.getElementById("accept-cookies").addEventListener("click", function () {
      localStorage.setItem("cookieConsent", "true");
      banner.style.display = "none";
    });
  }
});

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

// Helper: Calculate days until expiry
function calculateExpiry(validToValue) {
  // Convert to string and trim
  const validTo = String(validToValue || '').trim();

  if (!validTo || validTo === '' || validTo === 'undefined' || validTo === 'null') {
    return 'N/A';
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try parsing the date
    let expiryDate;

    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(validTo)) {
      expiryDate = new Date(validTo + 'T00:00:00');
    }
    // Handle YYYY年M月D日 format (e.g., 2026年2月25日)
    else if (/(\d{4})年(\d{1,2})月(\d{1,2})日/.test(validTo)) {
      const match = validTo.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // 0-indexed months
      const day = parseInt(match[3]);
      expiryDate = new Date(year, month, day);
    }
    else {
      expiryDate = new Date(validTo);
    }

    // Check if date is valid
    if (isNaN(expiryDate.getTime())) {
      console.warn('Invalid date:', validTo);
      return validTo; // Return original value so user can see what's wrong
    }

    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'In 1 day';
    return `In ${diffDays} days`;
  } catch (error) {
    console.error('Error calculating expiry:', error, 'for date:', validTo);
    return validToValue; // Return original so we can see it
  }
}

let table;
let allDeals = []; // Store original data
let activeFilters = {
  province: ['All'],
  retailer: ['All'],
  brand: '',
  save: 'All',
  points: 'All',
  magicHour: false
};

fetch('data/data.json')
  .then(response => response.json())
  .then(rawData => {
    // Debug: Log the first row to see actual column names
    if (rawData.length > 0) {
      console.log("=== DEBUG INFO ===");
      console.log("📋 All column names:", Object.keys(rawData[0]));
      console.log("📋 First complete row:", rawData[0]);

      // Try to find date columns
      const dateColumns = Object.keys(rawData[0]).filter(key =>
        key.toLowerCase().includes('valid') ||
        key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('expir')
      );
      console.log("📅 Possible date columns:", dateColumns);

      dateColumns.forEach(col => {
        console.log(`   ${col}:`, rawData[0][col]);
      });
    }

    // Clean data + add numeric Save % field and expiry
    const data = rawData.map((row, index) => {
      // Try to find the Valid To column with various possible names
      let validTo = '';
      const possibleNames = [
        'Valid To', 'Valid_To', 'ValidTo', 'valid_to', 'valid to',
        'Validité jusqu\'au', 'End Date', 'end_date', 'Expiry', 'expiry'
      ];

      for (let name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          validTo = row[name];
          if (index === 0) console.log(`✅ Found Valid To in column: "${name}" = "${validTo}"`);
          break;
        }
      }

      // Same for Valid From
      let validFrom = '';
      const possibleFromNames = [
        'Valid From', 'Valid_From', 'ValidFrom', 'valid_from', 'valid_from',
        'Start Date', 'start_date'
      ];

      for (let name of possibleFromNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          validFrom = row[name];
          break;
        }
      }

      const expiry = calculateExpiry(validTo);
      if (index === 0) console.log(`⏰ Calculated expiry: "${expiry}"`);

      return {
        ...row,
        'PC Pts': parsePoints(row['PC Pts']),
        'Price': parseFloat(row['Price']) || null,
        'Province': (row['Province'] || '').toString().trim(),
        'Retailer': (row['Retailer'] || '').toString().trim(),
        'Brand': (row['Brand'] || '').toString().trim(),
        'Name': (row['Name'] || '').toString().trim(),
        'Offer': (row['Offer'] || '').toString().trim(),
        'Details': (row['Details'] || '').toString().trim(),
        'Terms': (row['Terms'] || '').toString().trim(),
        'Item Web URL': (row['Item Web URL'] || row['Item_Web_URL'] || '').toString().trim(),
        'Valid From': validFrom.toString().trim(),
        'Valid To': validTo.toString().trim(),
        'Save %': (row['Save %'] || '').toString().trim(),
        'Save_Numeric': parseSavePercent(row['Save %']),
        'Expiry': expiry
      };
    });

    // Store original data
    allDeals = data;

    console.log("✅ Data loaded:", allDeals.length, "deals");

    table = new Tabulator("#table", {
      data,
      layout: "fitDataFill",
      pagination: "local",
      paginationSize: 20,
      movableColumns: true,
      resizableColumns: true,
      virtualDomBuffer: 300,
      height: "calc(100vh - 200px)", // Increased height (was 350px/300px)
      placeholder: "No deals found matching your criteria", // Added placeholder
      columns: [
        {
          title: "Retailer",
          field: "Retailer",
          hozAlign: "center",
          widthGrow: 1,
          minWidth: 120,
          resizable: true,
          frozen: false
        },
        {
          title: "Province",
          field: "Province",
          hozAlign: "center",
          width: 80,
          resizable: true
        },
        {
          title: "Brand",
          field: "Brand",
          hozAlign: "center",
          widthGrow: 1,
          minWidth: 100,
          resizable: true
        },
        {
          title: "Name",
          field: "Name",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          widthGrow: 3,
          minWidth: 200,
          resizable: true
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
          },
          width: 80,
          resizable: true
        },
        {
          title: "Save %",
          field: "Save %",
          hozAlign: "center",
          sorter: function (a, b, aRow, bRow) {
            const aNum = aRow.getData().Save_Numeric;
            const bNum = bRow.getData().Save_Numeric;
            return aNum - bNum;
          },
          width: 90,
          resizable: true
        },
        {
          title: "PC Pts",
          field: "PC Pts",
          hozAlign: "center",
          sorter: "number",
          formatter: function (cell) {
            const val = cell.getValue();
            if (val === null || val === undefined || val === 0) return "";
            return val.toLocaleString('en-CA', { maximumFractionDigits: 0 });
          },
          width: 90,
          resizable: true
        },
        {
          title: "Offer",
          field: "Offer",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          widthGrow: 2,
          minWidth: 150,
          resizable: true
        },
        {
          title: "Details",
          field: "Details",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          widthGrow: 2,
          minWidth: 150,
          resizable: true
        },
        {
          title: "Terms",
          field: "Terms",
          hozAlign: "left",
          headerHozAlign: "left",
          formatter: "plaintext",
          widthGrow: 2,
          minWidth: 150,
          resizable: true
        },
        {
          title: "Expiry",
          field: "Expiry",
          hozAlign: "center",
          width: 100,
          resizable: true
        },
        {
          title: "URL",
          field: "Item Web URL",
          hozAlign: "center",
          formatter: function (cell) {
            const url = cell.getValue();
            return url ? `<a href="${url}" target="_blank" rel="noopener">View</a>` : "";
          },
          width: 70,
          resizable: true
        }
      ]
    });

    // Setup filter button listeners
    setupFilterButtons();
  })
  .catch(err => {
    console.error("Failed to load ", err);
    document.getElementById("table").innerHTML = "<p style='text-align:center;color:red;'>Error loading deals.</p>";
  });

// Setup filter button event listeners
function setupFilterButtons() {
  // Handle all filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const filterType = this.dataset.filter;
      const filterValue = this.dataset.value;

      // Handle province and retailer with multiple selection
      if (filterType === 'province' || filterType === 'retailer') {
        if (filterValue === 'All') {
          // Select "All" - deselect everything else
          this.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          activeFilters[filterType] = ['All'];
        } else {
          // Deselect "All" if it was selected
          const allBtn = this.parentElement.querySelector('[data-value="All"]');
          if (allBtn) allBtn.classList.remove('active');

          // Toggle this button
          if (this.classList.contains('active')) {
            // Deselect
            this.classList.remove('active');
            const index = activeFilters[filterType].indexOf(filterValue);
            if (index > -1) {
              activeFilters[filterType].splice(index, 1);
            }

            // If nothing selected, revert to "All"
            if (activeFilters[filterType].length === 0 ||
              (activeFilters[filterType].length === 1 && activeFilters[filterType][0] === 'All')) {
              if (allBtn) allBtn.classList.add('active');
              activeFilters[filterType] = ['All'];
            }
          } else {
            // Select
            this.classList.add('active');
            if (activeFilters[filterType].includes('All')) {
              activeFilters[filterType] = [filterValue];
            } else {
              if (!activeFilters[filterType].includes(filterValue)) {
                activeFilters[filterType].push(filterValue);
              }
            }
          }
        }
      } else {
        // Single selection for other filters (save, points)
        this.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        activeFilters[filterType] = filterValue;
      }

      // Apply filters
      applyFilters();
    });
  });

  // Handle brand text input
  document.getElementById('filter-brand').addEventListener('input', function () {
    activeFilters.brand = this.value.toLowerCase().trim();
    applyFilters();
  });
}

// Apply all active filters
function applyFilters() {
  let filteredData = [...allDeals];

  // Magic Hour Filter (Shoppers overlap)
  if (activeFilters.magicHour) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sdmDeals = filteredData.filter(deal => {
      const retailer = (deal.Retailer || '').toLowerCase();
      return retailer.includes('shoppers') || retailer.includes('drug mart');
    });

    const productMap = new Map();
    sdmDeals.forEach(deal => {
      const productKey = `${deal.Brand || ''}|${deal.Name || ''}`.toLowerCase().trim();
      if (!productKey || productKey === '|') return;
      if (!productMap.has(productKey)) productMap.set(productKey, []);
      productMap.get(productKey).push(deal);
    });

    const magicDeals = [];
    productMap.forEach((deals) => {
      const validDeals = deals.filter(d => (d['PC Pts'] || 0) >= 1000 || (d.Save_Numeric || 0) >= 10);
      if (validDeals.length < 2) return;

      for (let i = 0; i < validDeals.length; i++) {
        for (let j = i + 1; j < validDeals.length; j++) {
          const d1 = validDeals[i];
          const d2 = validDeals[j];
          const d1From = new Date(d1['Valid From'] + 'T00:00:00');
          const d1To = new Date(d1['Valid To'] + 'T23:59:59');
          const d2From = new Date(d2['Valid From'] + 'T00:00:00');
          const d2To = new Date(d2['Valid To'] + 'T23:59:59');
          const overlapStart = d1From > d2From ? d1From : d2From;
          const overlapEnd = d1To < d2To ? d1To : d2To;

          if (overlapStart <= overlapEnd && today >= overlapStart && today <= overlapEnd) {
            if (!magicDeals.includes(d1)) magicDeals.push(d1);
            if (!magicDeals.includes(d2)) magicDeals.push(d2);
          }
        }
      }
    });
    filteredData = magicDeals;
  }

  // Province filter (multiple selection)
  if (!activeFilters.province.includes('All')) {
    filteredData = filteredData.filter(d => activeFilters.province.includes(d.Province));
  }

  // Retailer filter (multiple selection)
  if (!activeFilters.retailer.includes('All')) {
    filteredData = filteredData.filter(d => activeFilters.retailer.includes(d.Retailer));
  }

  // Brand filter
  if (activeFilters.brand) {
    filteredData = filteredData.filter(d =>
      (d.Brand || '').toLowerCase().includes(activeFilters.brand)
    );
  }

  // Save % filter
  if (activeFilters.save !== 'All') {
    const threshold = parseInt(activeFilters.save);
    filteredData = filteredData.filter(d => d.Save_Numeric >= threshold);
  }

  // PC Points filter
  if (activeFilters.points !== 'All') {
    if (activeFilters.points === '100-999') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 100 && d['PC Pts'] < 1000);
    } else if (activeFilters.points === '1000-9999') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 1000 && d['PC Pts'] < 10000);
    } else if (activeFilters.points === '10000+') {
      filteredData = filteredData.filter(d => d['PC Pts'] >= 10000);
    }
  }

  table.setData(filteredData);
}

// Set active button for a filter group
function setActiveFilter(filterType, value) {
  if (filterType === 'province' || filterType === 'retailer') {
    // Multiple selection filters - reset to single value
    document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === value) {
        btn.classList.add('active');
      }
    });
    activeFilters[filterType] = [value];
  } else {
    // Single selection filters
    document.querySelectorAll(`[data-filter="${filterType}"]`).forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === value) {
        btn.classList.add('active');
      }
    });
    activeFilters[filterType] = value;
  }
}

// ===== FILTER BUTTONS =====
function filterHighPoints() {
  activeFilters.magicHour = false;
  setActiveFilter('points', '10000+');
  applyFilters();
}

function filterActive() {
  activeFilters.magicHour = false;
  const today = new Date().toISOString().split('T')[0];
  let filteredData = allDeals.filter(d => {
    return d['Valid From'] <= today &&
      d['Valid To'] >= today &&
      (d['has_Expired'] === 'FALSE' || d['has_Expired'] === undefined);
  });
  table.setData(filteredData);
}

function filterBC() {
  activeFilters.magicHour = false;
  setActiveFilter('province', 'BC');
  setActiveFilter('points', '1000-9999');
  applyFilters();

  // Additional filter for active deals
  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d =>
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterON() {
  activeFilters.magicHour = false;
  setActiveFilter('province', 'ON');
  setActiveFilter('points', '1000-9999');
  applyFilters();

  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d =>
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterAB() {
  activeFilters.magicHour = false;
  setActiveFilter('province', 'AB');
  setActiveFilter('points', '1000-9999');
  applyFilters();

  const today = new Date().toISOString().split('T')[0];
  const currentData = table.getData();
  const activeData = currentData.filter(d =>
    d['Valid From'] <= today && d['Valid To'] >= today
  );
  table.setData(activeData);
}

function filterMagicHour() {
  activeFilters.magicHour = !activeFilters.magicHour;
  const btn = document.querySelector('.magic-hour-btn');
  if (btn) {
    if (activeFilters.magicHour) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }
  applyFilters();
}

function clearFilters() {
  // Reset activeFilters object
  activeFilters = {
    province: ['All'],
    retailer: ['All'],
    brand: '',
    save: 'All',
    points: 'All',
    magicHour: false
  };

  // Reset all filter buttons UI
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.value === 'All') {
      btn.classList.add('active');
    }
  });

  // Reset Magic Hour button UI
  const magicBtn = document.querySelector('.magic-hour-btn');
  if (magicBtn) magicBtn.classList.remove('active');

  // Clear brand input
  const brandInput = document.getElementById('filter-brand');
  if (brandInput) brandInput.value = '';

  // Reset table to all data
  table.setData(allDeals);
}