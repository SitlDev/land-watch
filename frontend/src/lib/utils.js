export function calcTitleRisk(parcel, listing) {
  let score = 0;
  const flags = [];
  if (parcel.priorTaxSales >= 2) { score += 35; flags.push({ sev:'high', text:`${parcel.priorTaxSales} prior tax sales on record` }); }
  else if (parcel.priorTaxSales === 1) { score += 18; flags.push({ sev:'med', text:'1 prior tax sale — verify chain of title' }); }
  if (parcel.ownershipYears < 2 && parcel.ownershipYears > 0) { score += 20; flags.push({ sev:'high', text:`Ownership only ${parcel.ownershipYears.toFixed(1)} yrs` }); }
  else if (parcel.ownershipYears < 5 && parcel.ownershipYears > 0) { score += 8; flags.push({ sev:'low', text:`Short ownership (${parcel.ownershipYears.toFixed(1)} yrs)` }); }
  if (parcel.encumbrances.length >= 2) { score += 25; flags.push({ sev:'high', text:`${parcel.encumbrances.length} encumbrances on title` }); }
  else if (parcel.encumbrances.length === 1) { score += 12; flags.push({ sev:'med', text:`Encumbrance: ${parcel.encumbrances[0]}` }); }
  if (parcel.taxDelinquentYears >= 4) { score += 20; flags.push({ sev:'high', text:`${parcel.taxDelinquentYears} years tax delinquency` }); }
  else if (parcel.taxDelinquentYears >= 3) { score += 10; flags.push({ sev:'med', text:`${parcel.taxDelinquentYears} years tax delinquency` }); }
  if (!parcel.lastSaleDate) { score += 10; flags.push({ sev:'med', text:'No recorded prior sale — unknown chain' }); }
  if (listing.auctionType === 'Tax Lien') { score += 5; flags.push({ sev:'low', text:'Tax lien — owner retains redemption rights' }); }
  const level = score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
  const color = score >= 50 ? '#b04020' : score >= 25 ? '#b07a00' : '#1a7f5a';
  return { score: Math.min(score, 100), level, color, flags };
}

export function fmt(n, prefix='$') {
  if (n == null) return '—';
  if (n >= 1000000) return `${prefix}${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `${prefix}${(n/1000).toFixed(0)}k`;
  return `${prefix}${n}`;
}

export function scoreColor(s) {
  if (s >= 85) return '#1a7f5a';
  if (s >= 70) return '#b07a00';
  return '#b04020';
}

export function riskColor(level) {
  if (level === 'LOW') return '#1a7f5a';
  if (level === 'MEDIUM') return '#b07a00';
  return '#b04020';
}

export function actionColor(action) {
  if (action === 'Act Fast') return '#b04020';
  if (action === 'Investigate') return '#b07a00';
  return '#888';
}

export function daysLabel(d) {
  if (d <= 0) return 'TODAY';
  if (d === 1) return '1d';
  return `${d}d`;
}

export function bidDiscount(price, assessed) {
  if (!price || !assessed || assessed === 0) return null;
  return Math.round((1 - price / assessed) * 100);
}

export function dealRatio(price, assessed) {
  if (!price || !assessed || price === 0) return null;
  return (assessed / price).toFixed(1);
}

export function platformLabel(p) {
  const map = { govease:'GovEase', bid4assets:'Bid4Assets', realauction:'RealAuction', civicsource:'CivicSource', grantstreet:'Grant Street', direct:'Direct' };
  return map[p] || p;
}

export function platformColor(p) {
  const map = { govease:'#1a7f5a', bid4assets:'#1a4fa0', realauction:'#7b2fa0', civicsource:'#b05a00', grantstreet:'#005f6b', direct:'#666' };
  return map[p] || '#888';
}

export function typeColor(t) {
  if (t === 'Tax Lien') return '#1a4fa0';
  if (t === 'Tax Deed') return '#7b2fa0';
  if (t === 'Government Surplus') return '#005f6b';
  return '#888';
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
}

export function formatDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {month:'short', day:'numeric'});
}

export function redemptionProgress(auctionDate, days) {
  if (!days || days === 0) return 100;
  const start = new Date(auctionDate);
  const now = new Date();
  const elapsed = Math.floor((now - start) / 86400000);
  return Math.min(100, Math.round(elapsed / days * 100));
}

export function titleClearDate(auctionDate, days) {
  if (!days) return null;
  const d = new Date(auctionDate);
  d.setDate(d.getDate() + days);
  return d;
}

export function annualReturn(price, rate) {
  if (!price || !rate) return null;
  return Math.round(price * rate / 100);
}
