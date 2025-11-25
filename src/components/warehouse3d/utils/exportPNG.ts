import { WarehouseStats, WarehouseConfig } from '../types';

interface ExportPNGOptions {
  canvas: HTMLCanvasElement;
  stats: WarehouseStats;
  config: WarehouseConfig;
  title?: string;
  companyName?: string;
}

export const exportWarehousePNG = ({
  canvas,
  stats,
  config,
  title = 'Vue Entrepôt 3D',
  companyName = 'Sloti'
}: ExportPNGOptions): void => {
  // Dimensions
  const padding = 40;
  const headerHeight = 80;
  const footerHeight = 140;
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  
  const totalWidth = imgWidth + padding * 2;
  const totalHeight = imgHeight + headerHeight + footerHeight + padding * 2;

  // Créer le canvas final
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = totalWidth;
  exportCanvas.height = totalHeight;
  const ctx = exportCanvas.getContext('2d')!;

  // Fond
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // === HEADER ===
  const headerY = padding;
  
  // Logo / Titre
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`🏭 ${title}`, padding, headerY + 35);
  
  // Company name
  ctx.fillStyle = '#64748b';
  ctx.font = '18px Arial';
  ctx.fillText(companyName, padding, headerY + 60);
  
  // Date
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px Arial';
  const date = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  ctx.fillText(date, totalWidth - padding, headerY + 35);

  // Ligne séparatrice
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, headerY + 70);
  ctx.lineTo(totalWidth - padding, headerY + 70);
  ctx.stroke();

  // === IMAGE 3D ===
  const imgY = headerHeight + padding;
  
  // Bordure autour de l'image
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.strokeRect(padding - 2, imgY - 2, imgWidth + 4, imgHeight + 4);
  
  // Screenshot 3D
  ctx.drawImage(canvas, padding, imgY);

  // === FOOTER - STATS ===
  const footerY = imgY + imgHeight + 20;
  
  // Ligne séparatrice
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, footerY);
  ctx.lineTo(totalWidth - padding, footerY);
  ctx.stroke();

  // Stats en colonnes
  const statsY = footerY + 30;
  const colWidth = (totalWidth - padding * 2) / 4;

  // Calculer le taux de remplissage
  const fillRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

  const statsData = [
    { label: 'Configuration', value: `${config.rows}×${config.racksPerRow} racks`, color: '#3b82f6' },
    { label: 'Capacité', value: `${stats.occupied}/${stats.total} pos.`, color: '#8b5cf6' },
    { label: 'Remplissage', value: `${fillRate}%`, color: fillRate > 80 ? '#22c55e' : fillRate > 50 ? '#f59e0b' : '#ef4444' },
    { label: 'Stock total', value: `${stats.totalQty} unités`, color: '#06b6d4' },
  ];

  statsData.forEach((stat, i) => {
    const x = padding + colWidth * i + colWidth / 2;
    
    // Valeur
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(stat.value, x, statsY + 5);
    
    // Label
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Arial';
    ctx.fillText(stat.label, x, statsY + 28);
  });

  // === LÉGENDE PALETTES ===
  const legendY = statsY + 55;
  
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Légende:', padding, legendY);

  // EUR
  ctx.fillStyle = '#cd853f';
  ctx.fillRect(padding + 80, legendY - 12, 20, 14);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '14px Arial';
  ctx.fillText(`EUR/EPAL (${stats.eurCount})`, padding + 108, legendY);

  // CHEP
  ctx.fillStyle = '#0066cc';
  ctx.fillRect(padding + 250, legendY - 12, 20, 14);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`CHEP (${stats.chepCount})`, padding + 278, legendY);

  // Alertes
  if (stats.overflowCount > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding + 400, legendY - 12, 20, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`⚠ Dépassements (${stats.overflowCount})`, padding + 428, legendY);
  }

  // Dimensions entrepôt
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Arial';
  ctx.fillText(
    `${config.levelCount} niveaux × ${config.bayWidth}m baie × ${config.rackHeight}m haut`,
    totalWidth - padding,
    legendY
  );

  // === WATERMARK ===
  ctx.fillStyle = '#334155';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Généré par Sloti • sloti.app', totalWidth / 2, totalHeight - 15);

  // === EXPORT ===
  const link = document.createElement('a');
  link.download = `entrepot-3d-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = exportCanvas.toDataURL('image/png', 1.0);
  link.click();
};