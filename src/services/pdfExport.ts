import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export async function generateTourPDF(tour: any, stops: any[]) {
  const doc = new jsPDF();

  // En-tête
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('BORDEREAU DE LIVRAISON', 105, 20, { align: 'center' });

  // Informations tournée
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const tourInfo = [
    `Tournée: ${tour.name}`,
    `Date: ${format(new Date(tour.date), 'EEEE d MMMM yyyy', { locale: fr })}`,
    `Heure de départ: ${tour.start_time ? new Date(tour.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}`,
    `Chauffeur: ${tour.driver?.name || 'Non assigné'}`,
    `Véhicule: ${tour.vehicle?.name || 'Non assigné'} ${tour.vehicle?.license_plate ? `(${tour.vehicle.license_plate})` : ''}`,
    `Distance totale: ${tour.total_distance_km || 0} km`
  ];

  let yPos = 35;
  tourInfo.forEach(info => {
    doc.text(info, 20, yPos);
    yPos += 6;
  });

  // Tableau des stops
  const tableData = stops.map((stop, index) => [
    index + 1,
    stop.customer_name,
    stop.address,
    `${stop.time_window_start} - ${stop.time_window_end}`,
    `${stop.weight_kg} kg`,
    stop.status === 'completed' ? '✓' : '☐'
  ]);

  autoTable(doc, {
    startY: yPos + 5,
    head: [['#', 'Client', 'Adresse', 'Créneau', 'Poids', 'Livré']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10 },
      5: { cellWidth: 15, halign: 'center' }
    }
  });

  // Signature
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.text('Signature chauffeur:', 20, finalY);
  doc.rect(20, finalY + 5, 60, 20);
  doc.text('Signature client:', 120, finalY);
  doc.rect(120, finalY + 5, 60, 20);

  // Pied de page
  doc.setFontSize(8);
  doc.text(
    `Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`,
    105,
    285,
    { align: 'center' }
  );

  return doc;
}

export function downloadTourPDF(tour: any, stops: any[]) {
  generateTourPDF(tour, stops).then(doc => {
    doc.save(`tournee-${tour.name}-${format(new Date(tour.date), 'yyyy-MM-dd')}.pdf`);
  });
}

export function printTourPDF(tour: any, stops: any[]) {
  generateTourPDF(tour, stops).then(doc => {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  });
}