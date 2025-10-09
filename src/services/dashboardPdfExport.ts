// src/services/dashboardPdfExport.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardData {
  period: string;
  stats: {
    stocks: number;
    chargements: number;
    receptions: number;
    utilisateurs: number;
    tours: number;
    toursCompleted: number;
  };
  trends?: {
    stocksTrend: number;
    chargementsTrend: number;
    toursTrend: number;
  };
  chartData: Array<{ day: string; entrees: number; sorties: number }>;
  stockByLocation?: Array<{ name: string; value: number }>;
  tourStats?: Array<{ status: string; count: number }>;
  activity: Array<{ id: string; text: string; time: string }>;
  companyName?: string;
  userName?: string;
}

export async function generateDashboardPDF(data: DashboardData) {
  const doc = new jsPDF();
  let yPos = 20;

  // ============ EN-TÊTE ============
  doc.setFillColor(39, 146, 176); // Couleur #2792B0
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT DE DASHBOARD', 105, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName || 'Sloti - Gestion Logistique', 105, 25, { align: 'center' });

  yPos = 45;

  // ============ INFORMATIONS GÉNÉRALES ============
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Période: ${data.period}`, 20, yPos);
  doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 20, yPos + 5);
  doc.text(`Par: ${data.userName || 'Utilisateur'}`, 20, yPos + 10);

  yPos += 25;

  // ============ KPI - INDICATEURS CLÉS ============
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(39, 146, 176);
  doc.text('📊 INDICATEURS CLÉS DE PERFORMANCE', 20, yPos);
  
  yPos += 10;

  // Tableau des KPI
  const kpiData = [
    ['Indicateur', 'Valeur', 'Tendance'],
    ['Stocks suivis (SKU)', data.stats.stocks.toString(), data.trends ? `${data.trends.stocksTrend > 0 ? '↗' : '↘'} ${Math.abs(data.trends.stocksTrend)}%` : '-'],
    ['Chargements prévus', data.stats.chargements.toString(), 'Cette semaine'],
    ['Réceptions prévues', data.stats.receptions.toString(), 'Cette semaine'],
    ['Tournées actives', data.stats.tours.toString(), `${data.stats.toursCompleted} terminées`],
    ['Utilisateurs actifs', data.stats.utilisateurs.toString(), 'Dans l\'entreprise'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [kpiData[0]],
    body: kpiData.slice(1),
    theme: 'grid',
    headStyles: { 
      fillColor: [39, 146, 176], 
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: { 
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 60, halign: 'center' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ============ FLUX LOGISTIQUES ============
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(39, 146, 176);
  doc.text('📈 FLUX LOGISTIQUES HEBDOMADAIRES', 20, yPos);

  yPos += 10;

  const fluxData = [
    ['Jour', 'Entrées', 'Sorties', 'Solde'],
    ...data.chartData.map(d => [
      d.day,
      d.entrees.toString(),
      d.sorties.toString(),
      (d.entrees - d.sorties).toString()
    ])
  ];

  // Calcul totaux
  const totalEntrees = data.chartData.reduce((sum, d) => sum + d.entrees, 0);
  const totalSorties = data.chartData.reduce((sum, d) => sum + d.sorties, 0);
  const solde = totalEntrees - totalSorties;

  fluxData.push([
    'TOTAL',
    totalEntrees.toString(),
    totalSorties.toString(),
    solde.toString()
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [fluxData[0]],
    body: fluxData.slice(1, -1),
    foot: [fluxData[fluxData.length - 1]],
    theme: 'striped',
    headStyles: { 
      fillColor: [39, 146, 176],
      fontStyle: 'bold',
      fontSize: 10
    },
    footStyles: {
      fillColor: [229, 231, 235],
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: { 
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'center', cellWidth: 40 },
      2: { halign: 'center', cellWidth: 40 },
      3: { halign: 'center', cellWidth: 40, fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ============ DISTRIBUTION DES STOCKS ============
  if (data.stockByLocation && data.stockByLocation.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(39, 146, 176);
    doc.text('📦 DISTRIBUTION DES STOCKS PAR EMPLACEMENT', 20, yPos);

    yPos += 10;

    const totalStock = data.stockByLocation.reduce((sum, s) => sum + s.value, 0);
    const stockTableData = [
      ['Emplacement', 'Quantité', 'Pourcentage'],
      ...data.stockByLocation.map(s => [
        s.name,
        s.value.toString(),
        `${((s.value / totalStock) * 100).toFixed(1)}%`
      ])
    ];

    autoTable(doc, {
      startY: yPos,
      head: [stockTableData[0]],
      body: stockTableData.slice(1),
      theme: 'grid',
      headStyles: { 
        fillColor: [59, 130, 246],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // ============ STATISTIQUES DES TOURNÉES ============
  if (data.tourStats && data.tourStats.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(39, 146, 176);
    doc.text('🚚 ÉTAT DES TOURNÉES (30 DERNIERS JOURS)', 20, yPos);

    yPos += 10;

    const totalTours = data.tourStats.reduce((sum, t) => sum + t.count, 0);
    const tourTableData = [
      ['Statut', 'Nombre', 'Pourcentage'],
      ...data.tourStats.map(t => [
        t.status,
        t.count.toString(),
        totalTours > 0 ? `${((t.count / totalTours) * 100).toFixed(1)}%` : '0%'
      ])
    ];

    autoTable(doc, {
      startY: yPos,
      head: [tourTableData[0]],
      body: tourTableData.slice(1),
      theme: 'grid',
      headStyles: { 
        fillColor: [251, 146, 60],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // ============ ACTIVITÉ RÉCENTE ============
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(39, 146, 176);
  doc.text('🔔 ACTIVITÉ RÉCENTE', 20, yPos);

  yPos += 10;

  const activityData = [
    ['Heure', 'Action'],
    ...data.activity.slice(0, 10).map(a => [
      a.time,
      a.text
    ])
  ];

  autoTable(doc, {
    startY: yPos,
    head: [activityData[0]],
    body: activityData.slice(1),
    theme: 'striped',
    headStyles: { 
      fillColor: [107, 114, 128],
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: { 
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 35, fontSize: 7 },
      1: { cellWidth: 145 }
    }
  });

  // ============ PIED DE PAGE ============
  const totalPages = (doc as any).internal.pages.length - 1;
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 285, 190, 285);
    
    // Texte du pied de page
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.setFont('helvetica', 'normal');
    
    doc.text(
      'Sloti - Plateforme de gestion logistique',
      20,
      290
    );
    
    doc.text(
      `Page ${i} / ${totalPages}`,
      190,
      290,
      { align: 'right' }
    );
    
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Télécharge le PDF du dashboard
 */
export async function downloadDashboardPDF(data: DashboardData) {
  const doc = await generateDashboardPDF(data);
  const fileName = `rapport-dashboard-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}

/**
 * Imprime le PDF du dashboard
 */
export async function printDashboardPDF(data: DashboardData) {
  const doc = await generateDashboardPDF(data);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}

/**
 * Envoie le PDF par email (nécessite backend)
 */
export async function emailDashboardPDF(data: DashboardData, email: string) {
  const doc = await generateDashboardPDF(data);
  const pdfBlob = doc.output('blob');
  
  // TODO: Implémenter l'envoi via votre API backend
  const formData = new FormData();
  formData.append('pdf', pdfBlob, 'rapport-dashboard.pdf');
  formData.append('email', email);
  
  // Exemple d'appel API
  // await fetch('/api/send-report', {
  //   method: 'POST',
  //   body: formData
  // });
  
  console.log('Envoi du PDF par email à:', email);
  return pdfBlob;
}