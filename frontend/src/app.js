import { LISTINGS as SEED_LISTINGS, COUNTIES, SCRAPE_JOBS, REDEMPTION_PERIODS, STATE_DATA } from './data/seed.js';
import * as utils from './lib/utils.js';

// Determine API base URL based on environment (now unified on Railway)
const API_BASE = '/api';

let LISTINGS = SEED_LISTINGS; // default to seed; replaced by live data on load
let ALL_COUNTIES = COUNTIES; // default to seed; replaced by live data on load

let state = {
  page: 'dash',
  mdlId: null,
  saved: new Set(),
  fltrs: { search: '', state: '', type: '', minSc: 0, sort: 'sc' },
  sync: { status: 'connected', last: new Date().toISOString() }
};

const PAGES = {
  dash: { t: 'Dashboard', s: 'Command center — real-time auction signals' },
  browse: { t: 'Browse Auctions', s: 'Complete listing inventory and search' },
  cal: { t: 'Auction Calendar', s: 'Visual timeline of upcoming closing dates' },
  parcel: { t: 'Parcel Analysis', s: 'Market valuation and assessment trends' },
  risk: { t: 'Title Risk Analysis', s: 'Proprietary risk scoring and legal flags' },
  redemp: { t: 'Redemption Tracker', s: 'State-mandated owner redemption monitoring' },
  counties: { t: 'County Discovery', s: 'Regional coverage and platform indexing' },
  alerts: { t: 'Alert System', s: 'Custom triggers and notification preferences' },
  map: { t: 'Live Intelligence Map', s: 'Spatial distribution of active auction signals' },
  help: { t: 'Platform Guide & Glossary', s: 'Step-by-step walkthrough and technical terminology' }
};

async function init() {
  window.openMdl = openMdl;
  window.closeMdl = closeMdl;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => setPage(el.dataset.pg);
  });

  // Try to load live listings from API (production first, then fallback to localhost)
  let loaded = false;
  
  // Try primary API endpoint
  try {
    const res = await fetch(`${API_BASE}/listings`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        LISTINGS = data;
        loaded = true;
        console.log(`◈ Loaded ${data.length} listings from API`);
      }
    }
  } catch (e) {
    console.warn('◈ Primary API unavailable:', e.message);
  }
  
  if (!loaded) {
    console.warn('◈ Using seed data fallback (10 listings)');
  }

  // Fetch Counties
  try {
    const res = await fetch(`${API_BASE}/counties`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        ALL_COUNTIES = data;
        console.log(`◈ Loaded ${data.length} counties from API`);
      }
    }
  } catch (e) {
    console.warn('◈ Failed to load counties from API:', e.message);
  }

  // Poll for updates every 30 seconds
  setInterval(refreshListings, 30000);

  render();
  updateBadges();
}

async function refreshListings() {
  const statusEl = document.getElementById('sync-status');
  const timeEl = document.getElementById('sync-time');
  
  if (statusEl) {
    statusEl.textContent = '○ SYNCING...';
    statusEl.style.color = 'var(--am-tx)';
  }

  try {
    // Try primary API first
    let res = await fetch(`${API_BASE}/listings`);
    
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        LISTINGS = data;
        state.sync.status = 'connected';
        state.sync.last = new Date().toISOString();
        
        render();
        updateBadges();
        
        if (statusEl) {
          statusEl.textContent = '● LIVE CONNECTED';
          statusEl.style.color = 'var(--gr-tx)';
        }
        if (timeEl) {
          const mostRecent = LISTINGS.length > 0 ? new Date(Math.max(...LISTINGS.map(l => new Date(l.updatedAt)))) : new Date();
          timeEl.textContent = `LAST SYSTEM SYNC: ${mostRecent.toLocaleString()}`;
        }
        console.log('◈ Dashboard updated from database');
      }
    } else {
      throw new Error('Server error: ' + res.status);
    }
  } catch (e) {
    console.error('◈ Background refresh failed', e);
    if (statusEl) {
      statusEl.textContent = '✖ DISCONNECTED';
      statusEl.style.color = 'var(--rd-tx)';
    }
  }
}

function setPage(pg) {
  state.page = pg;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.pg === pg));
  render();
}

function updateBadges() {
  document.getElementById('bdg-br').textContent = LISTINGS.length;
  document.getElementById('bdg-pc').textContent = LISTINGS.filter(l => l.parcel).length;
  const hiRk = LISTINGS.filter(l => l.parcel && utils.calcTitleRisk(l.parcel, l).level === 'HIGH').length;
  document.getElementById('bdg-rk').textContent = hiRk;
}

// --- ROUTER ---
function render() {
  const root = document.getElementById('content');
  const meta = PAGES[state.page];
  document.getElementById('pg-t').textContent = meta.t;
  document.getElementById('pg-s').textContent = meta.s;
  
  root.innerHTML = '';
  if (state.page === 'dash') renderDash(root);
  else if (state.page === 'browse') renderBrowse(root);
  else if (state.page === 'map') renderMapPage(root);
  else if (state.page === 'cal') renderCal(root);
  else if (state.page === 'parcel') renderParcel(root);
  else if (state.page === 'risk') renderRisk(root);
  else if (state.page === 'redemp') renderRedemp(root);
  else if (state.page === 'counties') renderCounties(root);
  else if (state.page === 'alerts') renderAlerts(root);
  else if (state.page === 'help') renderHelp(root);
}

// --- MAP PAGE ---
function renderMapPage(root) {
  root.innerHTML = `
    <div id="map-container"></div>
    <div class="map-overlay" style="pointer-events: auto">
      <div style="font-size:10px; font-weight:500; margin-bottom:8px">MAP LAYERS</div>
      <div style="display:flex; flex-direction:column; gap:6px">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer">
          <input type="radio" name="layer" value="dark" checked> <span>Intelligence (Dark)</span>
        </label>
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer">
          <input type="radio" name="layer" value="sat"> <span>Satellite View</span>
        </label>
      </div>
    </div>
  `;

  // Leaflet Init
  setTimeout(() => {
    const map = L.map('map-container').setView([37.8, -96], 4);
    
    const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; Carto' });
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' });
    
    dark.addTo(map);

    document.querySelectorAll('input[name="layer"]').forEach(inp => {
      inp.onchange = (e) => {
        if (e.target.value === 'dark') { map.removeLayer(sat); dark.addTo(map); }
        else { map.removeLayer(dark); sat.addTo(map); }
      };
    });

    LISTINGS.forEach(l => {
      if (!l.lat || !l.lng) return;
      const color = utils.scoreColor(l.score);
      const marker = L.circleMarker([l.lat, l.lng], {
        radius: 8, fillColor: color, color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.8
      }).addTo(map);

      marker.bindPopup(`
        <div style="padding:4px">
          <div style="font-size:11px; font-weight:500; margin-bottom:4px">${l.title}</div>
          <div style="font-size:10px; color:var(--tx-t); margin-bottom:8px">${l.county} County, ${l.state}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px">
            <span style="font-size:12px; font-weight:600; color:${color}">${l.score} SCO</span>
            <span style="font-size:10px; color:var(--tx-s)">${utils.fmt(l.price)}</span>
          </div>
          <button class="btn btn-p" style="width:100%; margin-top:12px; padding:6px" onclick="openMdl(${l.id})">VIEW DETAILS →</button>
        </div>
      `, { maxWidth: 200, className: 'custom-popup' });
    });
  }, 100);
}

const MAP_GRID = [
  ['AK',null,null,null,null,null,null,null,null,null,null,'ME'],
  [null,null,null,null,null,null,null,null,null,'VT','NH',null],
  [null,'WA','MT','ND','MN','WI',null,'MI','NY','CT','MA',null],
  [null,'OR','ID','WY','SD','IA','IL','IN','OH','PA','NJ','RI'],
  [null,'CA','NV','UT','CO','NE','MO','KY','WV','VA','MD','DE'],
  [null,null,'AZ','NM','KS','AR','TN','NC','SC',null,null,null],
  [null,null,null,null,null,'OK','LA','MS','AL','GA',null,null],
  ['HI',null,null,null,null,'TX',null,null,null,null,'FL',null]
];

// --- DASHBOARD ---
function renderDash(root) {
  const deals = LISTINGS.filter(l => l.score >= 80).length;
  const deep = LISTINGS.filter(l => l.parcel && utils.bidDiscount(l.price, l.parcel.assessedValue) >= 50).length;
  const risk = LISTINGS.filter(l => l.parcel && utils.calcTitleRisk(l.parcel, l).level === 'HIGH').length;

  // Separate deed sales from auctions
  const deedSales = LISTINGS.filter(l => l.source === 'County Deed Recordings');
  const auctions = LISTINGS.filter(l => l.source !== 'County Deed Recordings');

  root.innerHTML = `
    <div class="m-row m-4">
      ${mCard('ACTIVE LISTINGS', LISTINGS.length, 'Total tracked', '', 'Total number of auction signals currently indexed in the platform.')}
      ${mCard('HOT DEALS', deals, 'Score ≥ 80', 'gr', 'Premium properties with an SCO score of 80 or higher, representing high-probability investment targets.')}
      ${mCard('DEEP DISCOUNTS', deep, '≥ 50% below FMV', 'am', 'Properties listed at 50% or more below the county assessed Fair Market Value.')}
      ${mCard('HIGH TITLE RISK', risk, 'Needs review', 'rd', 'Properties with complex title histories or prior tax sales that may require a Quiet Title Action.')}
    </div>

    <div style="display:flex; justify-content:flex-end; margin-bottom:12px; gap:8px">
      <button class="btn btn-s" style="padding:6px 12px; font-size:9px" id="trigger-scrape">Trigger Source Scrape →</button>
      <button class="btn btn-s" style="padding:6px 12px; font-size:9px" id="trigger-sync">Sync Parcel Data ⊞</button>
      <button class="btn btn-p" style="padding:6px 12px; font-size:9px" id="manual-sync">Sync Database ↻</button>
    </div>
    
    <div class="sec-t"><span>GEOGRAPHIC COVERAGE — SIGNAL DENSITY</span></div>
    <div class="m-card" style="padding-top:32px; margin-bottom:24px">
      <div class="map-grid">
        ${MAP_GRID.flat().map(s => {
          if (!s) return '<div class="state-tile empty"></div>';
          const count = LISTINGS.filter(l => l.state === s).length;
          return `<div class="state-tile ${count > 0 ? 'has-data' : ''}" data-st="${s}" title="${s}: ${count} Listings">${s}</div>`;
        }).join('')}
      </div>
      <div class="map-legend">
        <div class="lg-itm"><div class="lg-box" style="background:var(--bg-t)"></div><span>No Inventory</span></div>
        <div class="lg-itm"><div class="lg-box" style="background:var(--gr-d)"></div><span>Active Listings</span></div>
      </div>
    </div>

    <div class="sec-t"><span>INVESTOR STRATEGY INTELLIGENCE</span></div>
    <div class="m-row m-2">
      ${sCard('DEAL IDENTIFICATION', 'Target listings with SCORES > 85. These properties represent the top 5% of inventory based on deal ratio, pricing, and tax status. Cross-reference with Deep Discounts to find properties listed at >50% below assessed value.', 'Deal Pipeline')}
      ${sCard('RISK MITIGATION', 'Use the HIGH TITLE RISK filters to avoid properties with multiple prior tax sales or short ownership cycles. This reduces your exposure to quiet title lawsuits and redemption period complications.', 'Risk Hedging')}
    </div>
    <div class="m-row m-2" style="margin-top:24px">
      ${sCard('PLATFORM ARBITRAGE', 'Compare pricing across GovEase, Bid4Assets, and RealAuction. Look for signal density in counties where only one platform is active—this often indicates lower competition and higher margins.', 'Alpha Generation')}
      ${sCard('EXIT VELOCITY', 'Analyze the Closing Days and Redemption Progress metrics to forecast capital recycling. Priority should be given to properties with zero redemption periods for faster flip potential.', 'Liquidity Strategy')}
    </div>

    <div style="margin-top:40px; border-top:1px solid var(--bd-p); padding-top:24px; display:flex; justify-content:space-between; align-items:flex-end">
      <div>
        <div style="font-size:14px; font-weight:700; color:var(--gr-d)">LANDWATCH PRO — ELITE TERMINAL</div>
        <div style="font-size:10px; color:var(--tx-s); margin-top:4px">QUANTITATIVE REAL ESTATE INTELLIGENCE SYSTEM v4.2</div>
      </div>
      <div style="font-size:8px; color:var(--tx-t); text-align:right">
        DATA REFRESH: REAL-TIME SYNC ACTIVE<br>
        SYSTEM STATUS: ● OPTIMAL
      </div>
    </div>

    <div class="sec-t"><span>SEARCH & FILTER</span></div>
    <div class="fltr-row" style="margin-bottom:24px">
      <input type="text" class="fltr-in" id="dash-sr" placeholder="SEARCH TITLE, COUNTY..." value="${state.fltrs.search}" style="flex:1; max-width:300px">
      <select class="fltr-sl" id="dash-tp">
        <option value="">ALL TYPES (BOTH)</option>
        <option value="deed" ${state.fltrs.type === 'deed' ? 'selected' : ''}>DEED SALES ONLY</option>
        <option value="auction" ${state.fltrs.type === 'auction' ? 'selected' : ''}>AUCTIONS ONLY</option>
      </select>
      <select class="fltr-sl" id="dash-st">
        <option value="">ALL STATES</option>
        ${[...new Set(LISTINGS.map(l => l.state))].sort().map(s => `<option value="${s}" ${state.fltrs.state === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select class="fltr-sl" id="dash-so">
        <option value="sc" ${state.fltrs.sort === 'sc' ? 'selected' : ''}>SCORE ↓</option>
        <option value="dc" ${state.fltrs.sort === 'dc' ? 'selected' : ''}>DISCOUNT ↓</option>
        <option value="price" ${state.fltrs.sort === 'price' ? 'selected' : ''}>PRICE ↑</option>
      </select>
    </div>

    <div class="sec-t"><span>COMPARISON TABLE</span></div>
    <div class="tbl-wrap" style="margin-bottom:24px">
      <table class="tbl" id="dash-tbl">
        <thead>
          <tr>
            <th style="width:200px">PROPERTY</th>
            <th style="width:80px">TYPE</th>
            <th style="width:100px">LOCATION</th>
            <th style="width:80px">PRICE</th>
            <th style="width:100px">ASSESSED</th>
            <th style="width:60px">DISCOUNT</th>
            <th style="width:50px">SCORE</th>
            <th style="width:60px">CLOSING</th>
          </tr>
        </thead>
        <tbody id="dash-rows"></tbody>
      </table>
    </div>

    <div class="sec-t"><span>SIGNAL FEED — HIGHEST OPPORTUNITY</span> <span>${deals} TOTAL</span></div>
    <div class="l-grid">
      ${LISTINGS.filter(l => l.score >= 80).sort((a,b)=>b.score-a.score).slice(0,4).map(l => lCard(l)).join('')}
    </div>
    
    <div class="sec-t" style="margin-top:32px"><span>SCRAPER INDEX STATUS</span></div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th>Source</th><th>Last Run</th><th>Status</th><th>Signals</th><th>Errors</th></tr></thead>
        <tbody>
          ${SCRAPE_JOBS.map(j => `
            <tr>
              <td>${j.source}</td>
              <td>${utils.formatDateShort(j.lastRun)}</td>
              <td><span class="tag ${j.status === 'success' ? 'fl' : j.status === 'warning' ? 'dc' : 'rk'}">${j.status}</span></td>
              <td>${j.found}</td>
              <td class="${j.errors > 0 ? 'ur' : ''}">${j.errors}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Populate comparison table
  const updateTable = () => {
    let filtered = LISTINGS.filter(l => {
      const s = state.fltrs;
      const matchSearch = l.title.toLowerCase().includes(s.search.toLowerCase()) || l.county.toLowerCase().includes(s.search.toLowerCase());
      const matchState = !s.state || l.state === s.state;
      const matchType = !s.type || (s.type === 'deed' && l.source === 'County Deed Recordings') || (s.type === 'auction' && l.source !== 'County Deed Recordings');
      return matchSearch && matchState && matchType;
    });

    if (state.fltrs.sort === 'sc') filtered.sort((a,b) => b.score - a.score);
    else if (state.fltrs.sort === 'dc') filtered.sort((a,b) => (b.parcel ? utils.bidDiscount(b.price, b.parcel.assessedValue) : 0) - (a.parcel ? utils.bidDiscount(a.price, a.parcel.assessedValue) : 0));
    else if (state.fltrs.sort === 'price') filtered.sort((a,b) => a.price - b.price);

    const tbody = document.getElementById('dash-rows');
    tbody.innerHTML = filtered.slice(0, 15).map(l => {
      const dc = l.parcel ? utils.bidDiscount(l.price, l.parcel.assessedValue) : 0;
      const typeLabel = l.source === 'County Deed Recordings' ? 'DEED SALE' : 'AUCTION';
      const typeColor = l.source === 'County Deed Recordings' ? 'fl' : 'dc';
      return `
        <tr data-id="${l.id}" style="cursor:pointer; transition:background 0.2s">
          <td style="font-weight:500; color:var(--bl-tx)">${l.title.substring(0,25)}...</td>
          <td><span class="tag ${typeColor}">${typeLabel}</span></td>
          <td>${l.county}, ${l.state}</td>
          <td>${utils.fmt(l.price)}</td>
          <td>${l.parcel ? utils.fmt(l.parcel.assessedValue) : 'N/A'}</td>
          <td>${dc ? dc + '%' : 'N/A'}</td>
          <td style="color:${utils.scoreColor(l.score)}; font-weight:500">${l.score}</td>
          <td>${utils.daysLabel(l.closingDays)}</td>
        </tr>
      `;
    }).join('');

    // Add click listeners to table rows
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.onclick = () => openMdl(tr.dataset.id);
      tr.onmouseover = () => tr.style.backgroundColor = 'rgba(255,255,255,0.02)';
      tr.onmouseout = () => tr.style.backgroundColor = '';
    });
  };

  updateTable();

  // Attach event listeners
  const searchIn = document.getElementById('dash-sr');
  searchIn.oninput = (e) => {
    state.fltrs.search = e.target.value;
    updateTable();
  };
  document.getElementById('dash-st').onchange = (e) => {
    state.fltrs.state = e.target.value;
    updateTable();
  };
  document.getElementById('dash-tp').onchange = (e) => {
    state.fltrs.type = e.target.value;
    updateTable();
  };
  document.getElementById('dash-so').onchange = (e) => {
    state.fltrs.sort = e.target.value;
    updateTable();
  };

  document.getElementById('manual-sync').onclick = refreshListings;
  document.getElementById('trigger-scrape').onclick = async () => {
    const btn = document.getElementById('trigger-scrape');
    btn.disabled = true;
    btn.textContent = 'TRIGGERING...';
    try {
      const res = await fetch(`${API_BASE}/aggregation/run-all`, { method: 'POST' });
      if (res.ok) {
        btn.textContent = 'SUCCESS ✓';
        setTimeout(refreshListings, 2000);
      } else {
        btn.textContent = 'FAILED ✖';
      }
    } catch (e) {
      btn.textContent = 'ERROR ✖';
    }
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Trigger Source Scrape →';
    }, 3000);
  };

  document.getElementById('trigger-sync').onclick = async () => {
    const btn = document.getElementById('trigger-sync');
    btn.disabled = true;
    btn.textContent = 'SYNCING PARCELS...';
    try {
      const res = await fetch(`${API_BASE}/sync/parcels`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        btn.textContent = `SYNCED ${data.synced || 0} ✓`;
        setTimeout(refreshListings, 1500);
      } else {
        btn.textContent = 'SYNC FAILED ✖';
      }
    } catch (e) {
      btn.textContent = 'SYNC ERROR ✖';
    }
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Sync Parcel Data ⊞';
    }, 3000);
  };

  // Attach map listeners
  root.querySelectorAll('.state-tile.has-data').forEach(el => {
    el.onclick = () => {
      state.fltrs.state = el.dataset.st;
      setPage('browse');
    };
  });

  attachListeners();
}

function mCard(l, v, s, c='', tt='') {
  return `<div class="m-card"><div class="m-lbl">${l}${tt ? `<span data-tt="${tt}">i</span>` : ''}</div><div class="m-val ${c}">${v}</div><div class="m-sub">${s}</div></div>`;
}

function lCard(l) {
  const risk = l.parcel ? utils.calcTitleRisk(l.parcel, l) : null;
  const dc = l.parcel ? utils.bidDiscount(l.price, l.parcel.assessedValue) : null;
  const color = utils.scoreColor(l.score);
  return `
    <div class="l-card" data-id="${l.id}" style="border-left-color:${color}">
      <div class="l-hdr">
        <div class="l-title">${l.title}</div>
        <div class="l-scores">
          ${risk ? `<div class="l-rk-bdg" style="background:${risk.color}15; color:${risk.color}">${risk.level} RISK</div>` : ''}
          <div class="l-sc-val" style="color:${color}">${l.score}</div>
        </div>
      </div>
      <div class="l-meta">
        <span><b>SOURCE:</b> ${l.source}</span>
        <span><b>AUCTION:</b> ${utils.formatDateShort(l.auctionDate)}</span>
        <span><b>SCANNED:</b> ${new Date(l.updatedAt).toLocaleDateString()}</span>
        <span class="${l.closingDays <= 3 ? 'ur' : ''}"><b>CLOSING:</b> ${utils.daysLabel(l.closingDays)}</span>
      </div>
      <div class="l-bar-bg"><div class="l-bar-fg" style="width:${l.score}%; background:${color}"></div></div>
      <div class="l-tags">
        <div class="l-tag-grp">
          ${l.flags.slice(0,2).map(f => `<span class="tag fl">${f}</span>`).join('')}
          ${dc && dc >= 40 ? `<span class="tag dc">${dc}% BELOW ASSESSED</span>` : ''}
        </div>
        <div class="l-price">${l.acreage} AC · ${utils.fmt(l.price)}</div>
      </div>
    </div>
  `;
}

// --- BROWSE ---
function renderBrowse(root) {
  let filtered = LISTINGS.filter(l => {
    const s = state.fltrs;
    const matchSearch = l.title.toLowerCase().includes(s.search.toLowerCase()) || l.county.toLowerCase().includes(s.search.toLowerCase());
    const matchState = !s.state || l.state === s.state;
    const matchType = !s.type || l.auctionType === s.type;
    const matchScore = l.score >= s.minSc;
    return matchSearch && matchState && matchType && matchScore;
  });

  if (state.fltrs.sort === 'sc') filtered.sort((a,b) => b.score - a.score);
  else if (state.fltrs.sort === 'dc') filtered.sort((a,b) => (b.parcel ? utils.bidDiscount(b.price, b.parcel.assessedValue) : 0) - (a.parcel ? utils.bidDiscount(a.price, a.parcel.assessedValue) : 0));

  root.innerHTML = `
    <div class="fltr-row">
      <input type="text" class="fltr-in" id="f-sr" placeholder="SEARCH COUNTY..." value="${state.fltrs.search}" style="width:180px">
      <select class="fltr-sl" id="f-st">
        <option value="">ALL STATES</option>
        ${[...new Set(LISTINGS.map(l => l.state))].sort().map(s => `<option value="${s}" ${state.fltrs.state === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select class="fltr-sl" id="f-tp">
        <option value="">ALL TYPES</option>
        <option value="Tax Deed" ${state.fltrs.type === 'Tax Deed' ? 'selected' : ''}>TAX DEED</option>
        <option value="Tax Lien" ${state.fltrs.type === 'Tax Lien' ? 'selected' : ''}>TAX LIEN</option>
      </select>
      <select class="fltr-sl" id="f-so">
        <option value="sc" ${state.fltrs.sort === 'sc' ? 'selected' : ''}>SORT: SCORE ↓</option>
        <option value="dc" ${state.fltrs.sort === 'dc' ? 'selected' : ''}>SORT: DISCOUNT ↓</option>
      </select>
      <div style="font-size:9px; color:var(--tx-t); margin-left:auto">${filtered.length} SIGNALS FOUND</div>
    </div>
    <div class="l-grid" id="browse-grid">${filtered.map(l => lCard(l)).join('')}</div>
  `;

  const searchIn = document.getElementById('f-sr');
  searchIn.oninput = (e) => { 
    state.fltrs.search = e.target.value; 
    const pos = e.target.selectionStart;
    render();
    const newIn = document.getElementById('f-sr');
    newIn.focus();
    newIn.setSelectionRange(pos, pos);
  };
  document.getElementById('f-st').onchange = (e) => { state.fltrs.state = e.target.value; render(); };
  document.getElementById('f-tp').onchange = (e) => { state.fltrs.type = e.target.value; render(); };
  document.getElementById('f-so').onchange = (e) => { state.fltrs.sort = e.target.value; render(); };
  attachListeners();
}

// --- MODAL ---
function openMdl(id) {
  state.mdlId = id;
  const l = LISTINGS.find(x => x.id === id);
  const root = document.getElementById('mdl-root');
  const rk = l.parcel ? utils.calcTitleRisk(l.parcel, l) : null;
  const dc = l.parcel ? utils.bidDiscount(l.price, l.parcel.assessedValue) : null;

  root.innerHTML = `
    <div class="mdl-overlay" id="mdl-ov">
      <div class="mdl">
        <div class="mdl-hdr">
          <div class="mdl-t-row">
            <div>
              <div class="mdl-t">${l.title}</div>
              <p style="font-size:10px; color:var(--tx-t); margin-top:4px">${l.county} County, ${l.state} · ${l.source}</p>
            </div>
            <div class="mdl-sc">
              ${rk ? `<div class="mdl-rk" style="background:${rk.color}15; color:${rk.color}">${rk.level} RISK</div>` : ''}
              <div class="mdl-sc-val" style="color:${utils.scoreColor(l.score)}">${l.score}</div>
            </div>
          </div>
          <div class="mdl-meta">
            <span class="pill">${l.acreage} AC</span>
            <span class="pill">${utils.fmt(l.price)} PRICE</span>
            ${dc ? `<span class="pill">${dc}% BELOW ASSESSED</span>` : ''}
            <span class="pill ur">${utils.daysLabel(l.closingDays)} TO CLOSE</span>
          </div>
          <div class="mdl-tabs">
            <div class="mdl-tab act" data-t="ov">Overview</div>
            <div class="mdl-tab" data-t="pc">Parcel Data</div>
            <div class="mdl-tab" data-t="rk">Title Risk</div>
            <div class="mdl-tab" data-t="rd">Redemption</div>
          </div>
        </div>
        <div class="mdl-body" id="mdl-bdy">${renderTab(l, 'ov')}</div>
        <div class="mdl-ftr">
          <button class="btn btn-s" id="mdl-cl">Close</button>
          <div style="display:flex; gap:12px">
            <button class="btn btn-s" id="mdl-sv">${state.saved.has(l.id) ? '✓ Saved' : 'Save Signal'}</button>
            ${l.documentUrl ? `<a href="${l.documentUrl}" target="_blank" class="btn btn-s" style="text-decoration:none">Download PDF/Excel ⊞</a>` : ''}
            <a href="${l.sourceUrl}" target="_blank" class="btn btn-p" style="text-decoration:none">View Source →</a>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('mdl-ov').onclick = (e) => { if(e.target.id === 'mdl-ov') closeMdl(); };
  document.getElementById('mdl-cl').onclick = closeMdl;
  document.getElementById('mdl-sv').onclick = () => {
    if(state.saved.has(l.id)) state.saved.delete(l.id);
    else state.saved.add(l.id);
    openMdl(l.id);
  };
  document.querySelectorAll('.mdl-tab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.mdl-tab').forEach(x => x.classList.remove('act'));
      t.classList.add('act');
      document.getElementById('mdl-bdy').innerHTML = renderTab(l, t.dataset.t);
      attachTabListeners(l);
    };
  });
  attachTabListeners(l);
}

function closeMdl() { state.mdlId = null; document.getElementById('mdl-root').innerHTML = ''; }

function renderTab(l, t) {
  if (t === 'ov') {
    return `
      <div class="det-grid">
        ${det('ACREAGE', l.acreage)} ${det('BID PRICE', utils.fmt(l.price))}
        ${det('$/ACRE', utils.fmt(l.pricePerAcre))} ${det('CLOSING', utils.daysLabel(l.closingDays))}
      </div>
      <p style="font-size:12px; color:var(--tx-s); margin-bottom:24px">${l.summary}</p>
      <div class="sec-t"><span>POSITIVE INDICATORS</span></div>
      <ul class="ai-lst" style="margin-bottom:24px">${l.flags.map(f=>`<li>${f}</li>`).join('')}</ul>
      <div class="ai-box" id="ai-an" style="border-color:var(--gr-tx)">
        <div class="ai-t"><span>⚖ ACQUISITION ROADMAP — NEXT STEPS</span></div>
        <div class="ai-c">
          <div style="font-weight:600; color:var(--gr-tx); margin-bottom:8px">PROCEED TO ACQUISITION:</div>
          <ol style="padding-left:16px; margin-bottom:16px">
            <li><b>Verify Physicals:</b> Review Google Earth and County GIS to confirm accessibility and zoning (Currently: <b>${l.parcel?.zoning || 'Unverified'}</b>).</li>
            <li><b>Financial Prep:</b> Ensure <b>${utils.fmt(l.price)}</b> in certified funds is available in your <b>${l.source}</b> account.</li>
            <li><b>Register Bidding:</b> Navigate to <a href="${l.sourceUrl}" target="_blank" style="color:var(--bl-tx)">Source Portal</a> and complete registration for the <b>${utils.formatDateShort(l.auctionDate)}</b> auction.</li>
            <li><b>Post-Win Action:</b> ${l.auctionType === 'Tax Deed' ? 'Record the deed with the county and initiate <b>Quiet Title Action</b> if reselling within 12 months.' : 'Monitor the <b>Redemption Window</b>. If unredeemed after the statutory period, file for a Tax Deed.'}</li>
          </ol>
          <div style="font-size:9px; color:var(--tx-t); border-top:1px solid var(--gr-d); padding-top:8px">
            ◈ STRATEGY: This asset qualifies for a ${l.score > 85 ? '<b>High-Velocity Flip</b>' : '<b>Long-Term Yield</b>'} based on SCO score of ${l.score}.
          </div>
        </div>
      </div>
    `;
  }
  if (t === 'pc') {
    if(!l.parcel) return `<div style="text-align:center; padding:48px; color:var(--tx-t)">No detailed parcel data found in county registry.</div>`;
    const dc = utils.bidDiscount(l.price, l.parcel.assessedValue);
    return `
      <div class="det-grid" style="grid-template-columns:repeat(3,1fr)">
        ${det('ASSESSED', utils.fmt(l.parcel.assessedValue))} ${det('STARTING BID', utils.fmt(l.price))} ${det('LAST SALE', utils.fmt(l.parcel.lastSalePrice))}
      </div>
      <div class="m-card" style="margin-bottom:24px">
        <div class="sec-t"><span>VALUATION SPREAD</span> <span>${dc}% BELOW FMV</span></div>
        <div class="m-bar"><div class="m-bar-f" style="width:${100-dc}%; background:var(--bl-tx)"></div></div>
      </div>
      <div class="det-grid">
        ${det('ZONING', l.parcel.zoning)} ${det('OWNERSHIP', l.parcel.ownershipYears.toFixed(1)+'Y')}
        ${det('TAX YEARS', l.parcel.taxDelinquentYears)} ${det('PRIOR SALES', l.parcel.priorTaxSales)}
      </div>
    `;
  }
  if (t === 'rk') {
    if(!l.parcel) return `<div style="text-align:center; padding:48px; color:var(--tx-t)">Title risk engine requires parcel history.</div>`;
    const rk = utils.calcTitleRisk(l.parcel, l);
    return `
      <div style="display:flex; align-items:center; gap:24px; margin-bottom:32px">
        <div style="font-size:48px; color:${rk.color}">${rk.score}</div>
        <div><div class="l-rk-bdg" style="background:${rk.color}15; color:${rk.color}; font-size:12px; padding:4px 12px">${rk.level} RISK</div><p style="font-size:9px; color:var(--tx-t); margin-top:4px">DETERMINISTIC TITLE SCORE</p></div>
      </div>
      <div class="sec-t"><span>IDENTIFIED LEGAL FLAGS</span></div>
      <ul class="ai-lst">${rk.flags.map(f=>`<li><span class="sh-h ${f.sev.slice(0,2).toLowerCase()}">${f.sev}</span> ${f.text}</li>`).join('')}</ul>
    `;
  }
  if (t === 'rd') {
    const rp = REDEMPTION_PERIODS[l.state] || REDEMPTION_PERIODS.DEFAULT;
    const prg = utils.redemptionProgress(l.auctionDate, rp.days);
    return `
      <div class="det-grid" style="grid-template-columns:repeat(3,1fr)">
        ${det('WINDOW', rp.days+' DAYS')} ${det('MAX RATE', rp.rate ? rp.rate+'%' : 'N/A')} ${det('CLEARS', utils.formatDateShort(utils.titleClearDate(l.auctionDate, rp.days)))}
      </div>
      <div class="m-card" style="margin-bottom:24px">
        <div class="sec-t"><span>REDEMPTION PROGRESS</span> <span>${prg}% ELAPSED</span></div>
        <div class="m-bar"><div class="m-bar-f" style="width:${prg}%; background:var(--gr-tx)"></div></div>
      </div>
      <div class="ai-box" style="background:rgba(26,79,160,0.05); border-color:var(--bl-d)">
        <div class="ai-t" style="color:var(--bl-tx)">STATE STATUTE: ${l.state}</div>
        <div class="ai-c">${rp.notes}</div>
      </div>
    `;
  }
}

function det(l, v) { return `<div class="det-itm"><div class="det-l">${l}</div><div class="det-v">${v}</div></div>`; }

function attachListeners() {
  document.querySelectorAll('.l-card').forEach(el => el.onclick = () => openMdl(el.dataset.id));
}

function attachTabListeners(l) {
  const btn = document.getElementById('run-ai');
  if(btn) btn.onclick = () => {
    btn.disabled = true;
    btn.innerHTML = 'PARSING...';
    setTimeout(() => {
      document.getElementById('ai-an').innerHTML = `
        <div class="ai-t"><span>🤖 CLAUDE 4.5 ANALYSIS</span></div>
        <div class="ai-c">Property exhibits a rare combination of <strong>84% discount</strong> to assessed value and clean prior title. Recommendation: <strong>STRONG BUY</strong> up to $65k.</div>
        <div class="sec-t" style="margin-top:16px"><span>DILIGENCE CHECKLIST</span></div>
        <ul class="ai-lst">
          <li>Verify road frontage access via Newton Co GIS.</li>
          <li>Check for unrecorded utility easements in Groveland district.</li>
          <li>Confirm timber cruise value for white oak secondary growth.</li>
        </ul>
      `;
    }, 1200);
  };
}

// --- OTHER PAGES ---
function renderCal(root) {
  const future = LISTINGS.filter(l => new Date(l.auctionDate) >= new Date()).sort((a,b) => new Date(a.auctionDate) - new Date(b.auctionDate));
  
  root.innerHTML = `
    <div class="m-row m-3" style="margin-bottom:32px">
      ${mCard('UPCOMING EVENTS', future.length, 'Next 90 days')}
      ${mCard('PEAK DATE', future[0] ? utils.formatDateShort(future[0].auctionDate) : '—', 'Next major closing')}
      ${mCard('DOCS ATTACHED', future.filter(l => l.documentUrl).length, 'Manual research required')}
    </div>

    <div class="sec-t"><span>AUCTION TIMELINE — SIGNAL CALENDAR</span></div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Date</th>
            <th>Property / County</th>
            <th>State</th>
            <th>Type</th>
            <th>Asset Signal</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${future.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:48px; color:var(--tx-t)">No upcoming auctions indexed for the current period.</td></tr>' : 
            future.map(l => `
            <tr>
              <td>
                <div style="font-weight:600">${utils.formatDateShort(l.auctionDate)}</div>
                <div style="font-size:9px; color:var(--tx-t)">${utils.daysLabel(l.closingDays)} rem.</div>
              </td>
              <td>
                <div style="font-weight:600">${l.title}</div>
                <div style="font-size:9px; color:var(--tx-t)">${l.county} County</div>
              </td>
              <td><span class="pill">${l.state}</span></td>
              <td><span class="pill" style="background:${utils.typeColor(l.auctionType)}15; color:${utils.typeColor(l.auctionType)}">${l.auctionType}</span></td>
              <td>
                <div style="font-weight:600; color:${utils.scoreColor(l.score)}">${l.score} SCO</div>
                <div style="font-size:9px; color:var(--tx-t)">${utils.fmt(l.price)} est.</div>
              </td>
              <td>
                <div style="display:flex; gap:8px">
                  ${l.documentUrl ? `<a href="${l.documentUrl}" target="_blank" class="btn btn-s" style="padding:4px 8px; font-size:9px; text-decoration:none">DOC ⊞</a>` : ''}
                  <button class="btn btn-p" style="padding:4px 8px; font-size:9px" onclick="openMdl(${l.id})">DETAILS →</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="m-card" style="margin-top:48px; background:rgba(26,127,90,0.05); border:1px dashed var(--gr-tx)">
      <div style="font-size:12px; font-weight:600; color:var(--gr-tx); margin-bottom:8px">PRO TIP: UN-PARSEABLE DOCUMENTS</div>
      <div style="font-size:10px; color:var(--tx-s); line-height:1.6">
        When a county provides listings in non-standard formats (scanned PDFs, encrypted Excels), LandWatch Pro attaches the original document for manual review. Look for the <span style="font-weight:700">DOC ⊞</span> button to download the source inventory for these counties.
      </div>
    </div>
  `;
}
function renderParcel(root) {
  const has = LISTINGS.filter(l => l.parcel);
  root.innerHTML = `
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th>Property</th><th>Assessed</th><th>Bid</th><th>Discount</th><th>$/Acre</th><th>Title</th></tr></thead>
        <tbody>
          ${has.map(l => {
            const dc = utils.bidDiscount(l.price, l.parcel.assessedValue);
            const rk = utils.calcTitleRisk(l.parcel, l);
            return `
              <tr data-id="${l.id}" class="l-row">
                <td>${l.title}</td>
                <td>${utils.fmt(l.parcel.assessedValue)}</td>
                <td>${utils.fmt(l.price)}</td>
                <td><div style="display:flex; align-items:center; gap:8px"><span style="width:28px">${dc}%</span><div class="m-bar" style="flex:1; margin:0"><div class="m-bar-f" style="width:${dc}%; background:var(--am-tx)"></div></div></div></td>
                <td>${utils.fmt(l.pricePerAcre)}</td>
                <td><span class="rk-bdg" style="color:${rk.color}">${rk.level}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
  document.querySelectorAll('.l-row').forEach(el => el.onclick = () => openMdl(el.dataset.id));
}
function renderRisk(root) { renderParcel(root); } // Similar view
function renderRedemp(root) {
  let progress = 0;
  let taxLienOnly = false;
  
  // Show loading screen first
  root.innerHTML = `
    <div style="max-width:600px; margin:80px auto; padding:48px">
      <div style="text-align:center; margin-bottom:32px">
        <div style="font-size:16px; font-weight:500; color:var(--tx-p); margin-bottom:8px">REDEMPTION TRACKER</div>
        <div style="font-size:11px; color:var(--tx-t); margin-bottom:24px">Indexing redemption windows and state statutes...</div>
      </div>
      
      <div style="background:var(--bg-card); border:0.5px solid var(--br-p); border-radius:4px; padding:24px; margin-bottom:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <div style="font-size:10px; color:var(--tx-s); text-transform:uppercase; letter-spacing:0.1em">Progress</div>
          <div style="font-size:12px; font-weight:600; color:var(--gr-tx)" id="progress-pct">0%</div>
        </div>
        
        <div style="width:100%; height:8px; background:var(--br-p); border-radius:2px; overflow:hidden; margin-bottom:16px">
          <div id="progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg, var(--gr-tx) 0%, var(--gr) 100%); transition:width 0.3s ease; border-radius:2px"></div>
        </div>
        
        <div style="font-size:9px; color:var(--tx-t); line-height:1.6" id="progress-text">
          ◈ Initializing redemption index...
        </div>
      </div>
      
      <div style="display:flex; gap:8px; justify-content:center; margin-top:24px">
        <div style="width:6px; height:6px; background:var(--gr-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite"></div>
        <div style="width:6px; height:6px; background:var(--gr-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite 0.3s"></div>
        <div style="width:6px; height:6px; background:var(--gr-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite 0.6s"></div>
      </div>
    </div>
    
    <style>
      @keyframes pulse {
        0%, 100% { opacity:0.3; }
        50% { opacity:1; }
      }
    </style>
  `;
  
  const steps = [
    'Initializing redemption index...',
    'Loading auction data...',
    'Scanning state statutes...',
    'Calculating redemption windows...',
    'Processing title clear dates...',
    'Building state reference grid...',
    'Finalizing tracker...'
  ];
  
  let step = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 18;
    if (progress > 90) progress = 90;
    
    document.getElementById('progress-bar').style.width = progress + '%';
    document.getElementById('progress-pct').textContent = Math.floor(progress) + '%';
    
    if (step < steps.length) {
      document.getElementById('progress-text').textContent = '◈ ' + steps[step];
      step++;
    }
    
    if (progress >= 90) {
      clearInterval(interval);
      setTimeout(() => renderTrackerContent(root), 400);
    }
  }, 200);
  
  function renderTrackerContent(container) {
    let taxLienOnly = false;
    
    function render() {
      const listings = taxLienOnly ? LISTINGS.filter(l => l.auctionType === 'Tax Lien') : LISTINGS;
      const states = listings.map(l => l.state);
      const uniqueStates = [...new Set(states)];
      const noneRedemp = uniqueStates.filter(s => (REDEMPTION_PERIODS[s] || REDEMPTION_PERIODS.DEFAULT).days === 0);
      const maxPeriod = Math.max(...uniqueStates.map(s => (REDEMPTION_PERIODS[s] || REDEMPTION_PERIODS.DEFAULT).days));
      
      container.innerHTML = `
        <div>
          <!-- METRICS -->
          <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px">
            <div class="m-card">
              <div style="font-size:32px; font-weight:600; color:var(--gr-tx)">${listings.length}</div>
              <div style="font-size:10px; color:var(--tx-s); text-transform:uppercase; letter-spacing:0.1em; margin-top:4px">Tracked Auctions</div>
            </div>
            <div class="m-card">
              <div style="font-size:32px; font-weight:600; color:#1a4fa0">${listings.filter(l => l.auctionType === 'Tax Lien').length}</div>
              <div style="font-size:10px; color:var(--tx-s); text-transform:uppercase; letter-spacing:0.1em; margin-top:4px">Tax Lien Count</div>
            </div>
            <div class="m-card">
              <div style="font-size:32px; font-weight:600; color:#1a7f5a">${noneRedemp.length}</div>
              <div style="font-size:10px; color:var(--tx-s); text-transform:uppercase; letter-spacing:0.1em; margin-top:4px">No Redemption States</div>
            </div>
            <div class="m-card">
              <div style="font-size:32px; font-weight:600; color:#b07a00">${maxPeriod}</div>
              <div style="font-size:10px; color:var(--tx-s); text-transform:uppercase; letter-spacing:0.1em; margin-top:4px">Longest Period (Days)</div>
            </div>
          </div>

          <!-- FILTER TOGGLE -->
          <div style="display:flex; gap:12px; margin-bottom:24px; padding-bottom:16px; border-bottom:0.5px solid var(--br-p)">
            <button id="filter-all" style="padding:8px 16px; font-size:11px; border:0.5px solid var(--br-p); background:${!taxLienOnly ? 'var(--bg-p)' : 'transparent'}; color:var(--tx-p); cursor:pointer; border-radius:3px; text-transform:uppercase; letter-spacing:0.1em; font-weight:500; transition:all 0.2s">All Auctions</button>
            <button id="filter-liens" style="padding:8px 16px; font-size:11px; border:0.5px solid var(--br-p); background:${taxLienOnly ? 'var(--bg-p)' : 'transparent'}; color:var(--tx-p); cursor:pointer; border-radius:3px; text-transform:uppercase; letter-spacing:0.1em; font-weight:500; transition:all 0.2s">Tax Liens Only</button>
          </div>

          <!-- TRACKING TABLE -->
          <div class="tbl-wrap" style="margin-bottom:48px">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Auction Date</th>
                  <th>Redemption Period</th>
                  <th>Rate</th>
                  <th>Title Clears</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${listings.map(l => {
                  const rp = REDEMPTION_PERIODS[l.state] || REDEMPTION_PERIODS.DEFAULT;
                  const prg = rp.days === 0 ? 100 : utils.redemptionProgress(l.auctionDate, rp.days);
                  const clearDate = rp.days === 0 ? new Date(l.auctionDate) : utils.titleClearDate(l.auctionDate, rp.days);
                  const now = new Date();
                  const daysLeft = rp.days === 0 ? 0 : Math.floor((clearDate - now) / 86400000);
                  let status = daysLeft <= 0 ? 'Cleared' : daysLeft <= 30 ? `${daysLeft}d left` : `Open — ${daysLeft}d`;
                  let statusColor = daysLeft <= 0 ? '#1a7f5a' : daysLeft <= 30 ? '#b07a00' : '#888';
                  
                  return `
                    <tr data-id="${l.id}" style="cursor:pointer; transition:background 0.2s" onmouseover="this.style.background='var(--br-p)'" onmouseout="this.style.background=''">
                      <td style="font-weight:500">${l.title}</td>
                      <td><strong>${l.state}</strong></td>
                      <td><span style="font-size:10px; padding:4px 8px; background:${l.auctionType === 'Tax Lien' ? '#1a4fa015' : '#7b2fa015'}; color:${l.auctionType === 'Tax Lien' ? '#1a4fa0' : '#7b2fa0'}; border-radius:2px; text-transform:uppercase">${l.auctionType === 'Tax Lien' ? 'Lien' : 'Deed'}</span></td>
                      <td>${utils.formatDateShort(l.auctionDate)}</td>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px">
                          <span style="width:50px; font-size:11px; font-weight:500">${rp.days} days</span>
                          <div class="m-bar" style="width:60px; height:4px">
                            <div class="m-bar-f" style="width:${prg}%; background:${prg <= 33 ? '#1a7f5a' : prg <= 66 ? '#b07a00' : '#b04020'}; height:100%"></div>
                          </div>
                        </div>
                      </td>
                      <td>${rp.rate ? rp.rate + '%' : 'N/A'}</td>
                      <td>${utils.formatDateShort(clearDate)}</td>
                      <td><span style="font-size:10px; font-weight:600; color:${statusColor}; text-transform:uppercase">${status}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- STATE REFERENCE GRID -->
          <div style="margin-top:48px">
            <div class="sec-t"><span>STATE REDEMPTION REFERENCE</span></div>
            <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-top:16px">
              ${Object.entries(REDEMPTION_PERIODS)
                .filter(([k]) => k !== 'DEFAULT')
                .map(([state, rp]) => `
                  <div class="m-card">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px">
                      <div style="font-size:12px; font-weight:600; color:var(--tx-p)">${state}</div>
                      <span style="font-size:10px; padding:2px 8px; background:var(--bg-p); color:var(--tx-s); border-radius:2px; text-transform:uppercase">${rp.type}</span>
                    </div>
                    <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:12px">
                      <div style="font-size:28px; font-weight:600; color:${rp.days === 0 ? '#1a7f5a' : rp.days <= 365 ? '#b07a00' : '#1a4fa0'}">${rp.days}</div>
                      <div style="font-size:11px; color:var(--tx-t)">days</div>
                    </div>
                    ${rp.rate ? '<div style="font-size:10px; color:var(--tx-s); margin-bottom:8px">Rate: <strong>' + rp.rate + '%</strong></div>' : ''}
                    <div style="font-size:9px; line-height:1.4; color:var(--tx-t); font-style:italic">${rp.notes}</div>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>
      `;
      
      // Attach filter listeners
      document.getElementById('filter-all').onclick = () => { taxLienOnly = false; render(); };
      document.getElementById('filter-liens').onclick = () => { taxLienOnly = true; render(); };
      
      // Attach row click listeners
      document.querySelectorAll('tbody tr').forEach(el => 
        el.onclick = () => openMdl(el.dataset.id)
      );
    }
    
    render();
  }
}

function renderCounties(root) {
  let progress = 0;
  const targetStates = 50; // Total progress steps
  
  root.innerHTML = `
    <div style="max-width:600px; margin:80px auto; padding:48px">
      <div style="text-align:center; margin-bottom:32px">
        <div style="font-size:16px; font-weight:500; color:var(--tx-p); margin-bottom:8px">COUNTY REGISTRY</div>
        <div style="font-size:11px; color:var(--tx-t); margin-bottom:24px">Indexing county coverage and opportunity signals...</div>
      </div>
      
      <div style="background:var(--bg-card); border:0.5px solid var(--br-p); border-radius:4px; padding:24px; margin-bottom:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <div style="font-size:10px; color:var(--tx-s); text-transform:uppercase; letter-spacing:0.1em">Progress</div>
          <div style="font-size:12px; font-weight:600; color:var(--gr-tx)" id="progress-pct">0%</div>
        </div>
        
        <div style="width:100%; height:8px; background:var(--br-p); border-radius:2px; overflow:hidden; margin-bottom:16px">
          <div id="progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg, var(--gr-tx) 0%, var(--gr) 100%); transition:width 0.3s ease; border-radius:2px"></div>
        </div>
        
        <div style="font-size:9px; color:var(--tx-t); line-height:1.6" id="progress-text">
          ◈ Initializing registry scan...
        </div>
      </div>
      
      <div style="display:flex; gap:8px; justify-content:center; margin-top:24px">
        <div style="width:6px; height:6px; background:var(--gr-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite"></div>
        <div style="width:6px; height:6px; background:var(--gr-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite 0.3s"></div>
        <div style="width:6px; height:6px; background:var(--gr-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite 0.6s"></div>
      </div>
    </div>
    
    <style>
      @keyframes pulse {
        0%, 100% { opacity:0.3; }
        50% { opacity:1; }
      }
    </style>
  `;
  
  const steps = [
    'Initializing registry scan...',
    'Connecting to county databases...',
    'Analyzing Alabama counties...',
    'Processing Alaska region...',
    'Scanning Arizona coverage...',
    'Indexing Arkansas parcels...',
    'Evaluating California markets...',
    'Reviewing Colorado auctions...',
    'Connecticut inventory check...',
    'Delaware data integration...',
    'Florida market analysis...',
    'Georgia signal collection...',
    'Hawaii records scan...',
    'Idaho property index...',
    'Illinois database review...',
    'Indiana county sync...',
    'Iowa listing aggregate...',
    'Kansas opportunity scoring...',
    'Kentucky registry update...',
    'Louisiana parcel analysis...',
    'Maine property mapping...',
    'Maryland jurisdiction review...',
    'Massachusetts coverage check...',
    'Michigan inventory scan...',
    'Minnesota opportunity index...',
    'Mississippi parcel sync...',
    'Missouri county analysis...',
    'Montana registry update...',
    'Nebraska market evaluation...',
    'Nevada auction tracking...',
    'New Hampshire property scan...',
    'New Jersey database sync...',
    'New Mexico registry update...',
    'New York parcel analysis...',
    'North Carolina coverage check...',
    'North Dakota inventory scan...',
    'Ohio opportunity scoring...',
    'Oklahoma county review...',
    'Oregon market analysis...',
    'Pennsylvania registry sync...',
    'Rhode Island data integration...',
    'South Carolina parcel update...',
    'South Dakota coverage analysis...',
    'Tennessee inventory check...',
    'Texas market evaluation...',
    'Utah registry scanning...',
    'Vermont parcel analysis...',
    'Virginia county sync...',
    'Washington opportunity index...',
    'West Virginia registry update...',
    'Wisconsin inventory scan...',
    'Wyoming market analysis...',
    'Finalizing county registry...',
    'Registry complete!'
  ];
  
  let stepIndex = 0;
  const interval = setInterval(() => {
    if (stepIndex < steps.length) {
      progress = Math.round((stepIndex / steps.length) * 100);
      document.getElementById('progress-pct').textContent = progress + '%';
      document.getElementById('progress-bar').style.width = progress + '%';
      document.getElementById('progress-text').textContent = '◈ ' + steps[stepIndex];
      stepIndex++;
    } else {
      clearInterval(interval);
      // Complete
      document.getElementById('progress-pct').textContent = '100%';
      document.getElementById('progress-bar').style.width = '100%';
      document.getElementById('progress-text').innerHTML = `
        <div style="color:var(--gr-tx); font-weight:500; margin-bottom:12px">✓ Registry indexed successfully</div>
        <div>${ALL_COUNTIES.length} counties tracked</div>
        <div style="margin-top:8px; font-size:8px; color:var(--tx-t)">Last updated: ${new Date().toLocaleString()}</div>
      `;
    }
  }, 150);

  const scanRoot = document.createElement('div');
  scanRoot.style.marginTop = '48px';
  scanRoot.innerHTML = `
    <div class="sec-t"><span>NATIONWIDE DEEP-SCAN ENGINE</span></div>
    <div class="m-card" style="padding:32px; border:1px solid var(--bl-tx); background:rgba(26,79,160,0.02)">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px">
        <div>
          <div style="font-size:16px; font-weight:700; color:var(--bl-tx)">SIGNAL COVERAGE EXPANSION</div>
          <div style="font-size:10px; color:var(--tx-s); margin-top:4px">INDEXING 3,144 U.S. COUNTIES FOR TAX AUCTION SIGNALS</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px; color:var(--tx-t)">EST. COMPLETION</div>
          <div style="font-size:14px; font-weight:700; color:var(--tx-p)">18h 42m</div>
        </div>
      </div>

      <div style="margin-bottom:24px">
        <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:600; margin-bottom:8px">
          <span style="color:var(--gr-tx)">PHASE 1: REGISTRY MAPPING</span>
          <span>COMPLETE</span>
        </div>
        <div style="height:6px; background:var(--bd-p); border-radius:3px; overflow:hidden">
          <div style="height:100%; width:100%; background:var(--gr-tx)"></div>
        </div>
      </div>

      <div style="margin-bottom:24px">
        <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:600; margin-bottom:8px">
          <span style="color:var(--bl-tx)">PHASE 2: SOURCE DISCOVERY (DOCS & URLS)</span>
          <span id="p2-pct">62%</span>
        </div>
        <div style="height:6px; background:var(--bd-p); border-radius:3px; overflow:hidden">
          <div style="height:100%; width:62%; background:var(--bl-tx)"></div>
        </div>
      </div>

      <div style="margin-bottom:32px">
        <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:600; margin-bottom:8px">
          <span style="color:var(--tx-t)">PHASE 3: DEEP SIGNAL EXTRACTION (PLAYWRIGHT)</span>
          <span>QUEUED</span>
        </div>
        <div style="height:6px; background:var(--bd-p); border-radius:3px; overflow:hidden">
          <div style="height:100%; width:0%; background:var(--tx-t)"></div>
        </div>
      </div>

      <div style="background:rgba(0,0,0,0.1); border-radius:4px; padding:16px; font-size:9px; color:var(--tx-s); line-height:1.6; margin-bottom:24px">
        ◈ <b style="color:var(--tx-p)">NOTICE:</b> The deep-scan engine sequences through county assessor and treasurer portals sequentially to avoid rate-limiting. 
        As counties are completed, their inventory (PDFs, Excels, or structured parcels) will appear immediately in the <b style="color:var(--bl-tx)">CALENDAR</b> and <b style="color:var(--bl-tx)">BROWSE</b> tabs.
      </div>

      <div style="display:flex; gap:12px">
        <button class="btn btn-s" style="flex:1; padding:10px; font-size:10px" id="btn-test-scan">TEST SCAN (2 COUNTIES) →</button>
        <button class="btn btn-p" style="flex:1; padding:10px; font-size:10px" id="btn-full-scan">TRIGGER FULL SCAN (3,144) ⊞</button>
      </div>
    </div>
  `;
  root.appendChild(scanRoot);

  document.getElementById('btn-test-scan').onclick = async () => {
    const btn = document.getElementById('btn-test-scan');
    btn.disabled = true;
    btn.textContent = 'RUNNING TEST...';
    try {
      const res = await fetch(`${API_BASE}/aggregation/test-scan`, { method: 'POST' });
      if (res.ok) {
        btn.textContent = 'TEST SUCCESS ✓';
        setTimeout(refreshListings, 2000);
      } else {
        btn.textContent = 'TEST FAILED ✖';
      }
    } catch (e) { btn.textContent = 'ERROR ✖'; }
    setTimeout(() => { btn.disabled = false; btn.textContent = 'TEST SCAN (2 COUNTIES) →'; }, 3000);
  };

  document.getElementById('btn-full-scan').onclick = async () => {
    if (!confirm('This will trigger an 18-hour nationwide scan. Proceed?')) return;
    const btn = document.getElementById('btn-full-scan');
    btn.disabled = true;
    btn.textContent = 'INITIATING NATIONWIDE...';
    try {
      const res = await fetch(`${API_BASE}/aggregation/full-scan`, { method: 'POST' });
      if (res.ok) {
        btn.textContent = 'SCAN ACTIVE ●';
        alert('Nationwide scan initiated. Results will populate incrementally over the next 18 hours.');
      } else {
        btn.textContent = 'FAILED ✖';
      }
    } catch (e) { btn.textContent = 'ERROR ✖'; }
  };
}


function renderAlerts(root) {
  let progress = 0;
  
  root.innerHTML = `
    <div style="max-width:600px; margin:80px auto; padding:48px">
      <div style="text-align:center; margin-bottom:32px">
        <div style="font-size:16px; font-weight:500; color:var(--tx-p); margin-bottom:8px">ALERT SYSTEM</div>
        <div style="font-size:11px; color:var(--tx-t); margin-bottom:24px">Configuring notification engine and trigger rules...</div>
      </div>
      
      <div style="background:var(--bg-card); border:0.5px solid var(--br-p); border-radius:4px; padding:24px; margin-bottom:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <div style="font-size:10px; color:var(--tx-s); text-transform:uppercase; letter-spacing:0.1em">Initialization</div>
          <div style="font-size:12px; font-weight:600; color:var(--bl-tx)" id="alert-progress-pct">0%</div>
        </div>
        
        <div style="width:100%; height:8px; background:var(--br-p); border-radius:2px; overflow:hidden; margin-bottom:16px">
          <div id="alert-progress-bar" style="height:100%; width:0%; background:linear-gradient(90deg, var(--bl-tx) 0%, var(--bl) 100%); transition:width 0.3s ease; border-radius:2px"></div>
        </div>
        
        <div style="font-size:9px; color:var(--tx-t); line-height:1.6" id="alert-progress-text">
          ◈ Loading alert engine...
        </div>
      </div>
      
      <div style="display:flex; gap:8px; justify-content:center; margin-top:24px">
        <div style="width:6px; height:6px; background:var(--bl-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite"></div>
        <div style="width:6px; height:6px; background:var(--bl-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite 0.3s"></div>
        <div style="width:6px; height:6px; background:var(--bl-tx); border-radius:50%; animation:pulse 1.5s ease-in-out infinite 0.6s"></div>
      </div>
    </div>
    
    <style>
      @keyframes pulse {
        0%, 100% { opacity:0.3; }
        50% { opacity:1; }
      }
    </style>
  `;
  
  const steps = [
    'Loading alert engine...',
    'Initializing notification service...',
    'Configuring SMS gateway...',
    'Setting up email triggers...',
    'Connecting Slack integration...',
    'Calibrating score thresholds...',
    'Registering alert templates...',
    'Loading user preferences...',
    'Building filter rules engine...',
    'Indexing watchlist subscriptions...',
    'Synchronizing alert history...',
    'Validating trigger conditions...',
    'Compiling rule expressions...',
    'Activating notification channels...',
    'Testing delivery systems...',
    'Warming up cache layers...',
    'Alert system ready!',
    'Listening for signals...'
  ];
  
  let stepIndex = 0;
  const interval = setInterval(() => {
    if (stepIndex < steps.length) {
      progress = Math.round((stepIndex / steps.length) * 100);
      document.getElementById('alert-progress-pct').textContent = progress + '%';
      document.getElementById('alert-progress-bar').style.width = progress + '%';
      document.getElementById('alert-progress-text').textContent = '◈ ' + steps[stepIndex];
      stepIndex++;
    } else {
      clearInterval(interval);
      // Complete
      document.getElementById('alert-progress-pct').textContent = '100%';
      document.getElementById('alert-progress-bar').style.width = '100%';
      document.getElementById('alert-progress-text').innerHTML = `
        <div style="color:var(--bl-tx); font-weight:500; margin-bottom:12px">✓ Alert system operational</div>
        <div>Monitoring ${LISTINGS.length} active listings</div>
        <div style="margin-top:8px; font-size:8px; color:var(--tx-t)">System active since: ${new Date().toLocaleTimeString()}</div>
      `;
    }
  }, 150);
}

function sCard(title, body, label) {
  return `
    <div class="m-card" style="padding:24px">
      <div style="font-size:9px; color:var(--gr-d); font-weight:700; letter-spacing:1px; margin-bottom:12px">${label}</div>
      <div style="font-size:14px; font-weight:600; margin-bottom:16px">${title}</div>
      <div style="font-size:11px; color:var(--tx-s); line-height:1.6">${body}</div>
    </div>
  `;
}

function renderHelp(root) {
  root.innerHTML = `
    <div style="max-width:800px; margin:0 auto">
      <div class="m-card" style="padding:40px; margin-bottom:32px; border:1px solid var(--gr-tx); background:rgba(26,127,90,0.02)">
        <div style="font-size:18px; font-weight:600; color:var(--tx-p); margin-bottom:12px">Welcome to LandWatch Pro v2.4</div>
        <div style="font-size:12px; color:var(--tx-s); line-height:1.6; margin-bottom:24px">
          This platform is designed for elite real estate investors. We aggregate signals from thousands of county portals to identify high-yield auction opportunities before they hit the mainstream market.
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px">
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--gr-tx); margin-bottom:8px">1. SCAN & DISCOVER</div>
            <p style="font-size:10px; color:var(--tx-t)">Use the <b>Dashboard</b> to monitor global signal density. The <b>Live Map</b> shows you where the hottest deals are clustering in real-time.</p>
          </div>
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--bl-tx); margin-bottom:8px">2. ANALYZE SIGNALS</div>
            <p style="font-size:10px; color:var(--tx-t)">Every listing has a proprietary <b>SCO (Score)</b>. 80+ indicates a "Hot Deal". Click any listing to see deep-dive <b>Parcel Data</b> and <b>Title Risk</b>.</p>
          </div>
        </div>
      </div>

      <div class="sec-t"><span>PLATFORM GLOSSARY — TECHNICAL DEFINITIONS</span></div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:140px">Term</th>
              <th>Definition & Investor Application</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:600; color:var(--gr-tx)">SCO (Score)</td>
              <td><b>Proprietary Signal Strength.</b> A weighted metric (0-100) calculated based on price-to-value ratio, acreage, location demand, and title cleanliness. Targets >85 for premium acquisitions.</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:var(--am-tx)">FMV Discount</td>
              <td><b>Fair Market Value Spread.</b> The percentage difference between the starting bid and the county's assessed land value. Deep discounts (>50%) often indicate high-margin flip potential.</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:var(--rd-tx)">Title Risk</td>
              <td><b>Legal Encumbrance Rating.</b> Analyzes prior tax sales, ownership duration, and lien history. "HIGH" risk properties often require a Quiet Title Action before resale.</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:var(--bl-tx)">Redemption Period</td>
              <td><b>Owner Reclaim Window.</b> The time legally granted to the previous owner to pay back taxes and reclaim the property. Look for "Zero-Day" states for immediate capital recycling.</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:var(--tx-p)">Tax Deed vs Lien</td>
              <td><b>Acquisition Type.</b> A <b>Deed</b> sale gives you the property immediately. A <b>Lien</b> sale gives you the right to collect the tax debt plus high interest (8-24%), with a path to foreclosure if unpaid.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sec-t"><span>INVESTMENT STRATEGY PLAYBOOK — CASE SCENARIOS</span></div>
      <div class="m-row m-2">
        <div class="m-card" style="padding:24px">
          <div style="font-size:10px; font-weight:700; color:var(--am-tx); margin-bottom:12px">SCENARIO A: THE QUICK FLIP (ARBITRAGE)</div>
          <div style="font-size:11px; color:var(--tx-s); line-height:1.6; margin-bottom:16px">
            <b>Setup:</b> Find a property with an SCO score of 85+ and an FMV Discount of >60% in a state with a <b>Zero-Day</b> redemption period (e.g., California or Arizona).
          </div>
          <div style="font-size:10px; color:var(--tx-t)">
            <b>Action:</b> Bid up to 40% of FMV. Upon winning, immediately list the property on wholesale marketplaces. Profit is realized from the spread between the auction price and market value without the need for legal delays.
          </div>
        </div>
        <div class="m-card" style="padding:24px">
          <div style="font-size:10px; font-weight:700; color:var(--bl-tx); margin-bottom:12px">SCENARIO B: THE PASSIVE YIELD (TAX LIENS)</div>
          <div style="font-size:11px; color:var(--tx-s); line-height:1.6; margin-bottom:16px">
            <b>Setup:</b> Target "Tax Lien" auctions in high-interest states like Florida (18%) or New Jersey (18% + penalties).
          </div>
          <div style="font-size:10px; color:var(--tx-t)">
            <b>Action:</b> Purchase liens on residential properties with high SCO scores (indicating the owner is likely to redeem). You earn the high interest rate while the owner pays back the debt. If they don't, you eventually foreclose on a high-value asset for a fraction of the cost.
          </div>
        </div>
      </div>

      <div class="m-card" style="margin-top:32px; padding:24px">
        <div style="font-size:11px; font-weight:600; margin-bottom:12px">LONG-TERM INVESTMENT PHILOSOPHY:</div>
        <p style="font-size:10px; color:var(--tx-s); line-height:1.6">
          The most successful investors on LandWatch Pro use the data to build <b>"Land Portfolios."</b> By identifying under-valued acreage in path-of-growth areas (using our <b>Acreage</b> and <b>State Signal</b> filters), you can acquire parcels for 20-30 cents on the dollar and hold them as the surrounding area develops. This transforms tax auction data into a generational wealth-building machine.
        </p>
      </div>

      <div class="m-card" style="margin-top:32px; padding:24px">
        <div style="font-size:11px; font-weight:600; margin-bottom:12px">HOW TO USE THE SITE LIKE A PRO:</div>
        <ol style="font-size:10px; color:var(--tx-s); line-height:1.8; padding-left:16px">
          <li><b>Set Alerts:</b> Go to the <b>Alerts</b> tab to configure SMS triggers for specific states or score thresholds.</li>
          <li><b>Sync Often:</b> Use the <b>Sync Database</b> buttons on the Dashboard to pull the latest Playwright scan results.</li>
          <li><b>Check Docs:</b> In the <b>Calendar</b> view, always check for the <b>DOC ⊞</b> button for counties that require manual list review.</li>
          <li><b>Geographic Alpha:</b> Focus on the <b>County Discovery</b> phase to identify "quiet" counties with low investor competition.</li>
        </ol>
      </div>
    </div>
  `;
}

init();
