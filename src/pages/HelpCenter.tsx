import { useState, useMemo } from 'react';
import { Book, Search, HelpCircle, LayoutDashboard, Calendar, Package, Truck, TrendingUp, TrendingDown, Boxes, BarChart3, MessageSquare, FileText, ChevronRight, ExternalLink, Download } from 'lucide-react';

// Types
interface GuideSection {
  id: string;
  title: string;
  icon: any;
  content: {
    objective: string;
    features: string[];
    steps: string[];
    tips: string[];
    timeGain: string;
  };
}

// Données des guides (extrait de ton guide markdown)
const guides: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Intuitif',
    icon: LayoutDashboard,
    content: {
      objective: 'Le dashboard centralise toutes vos métriques clés en temps réel pour un pilotage efficace de votre logistique.',
      features: [
        'KPIs en temps réel (stocks, chargements, réceptions, tournées)',
        'Graphiques hebdomadaires des flux logistiques',
        'Distribution des stocks par emplacement',
        'Évolution des tendances avec pourcentages'
      ],
      steps: [
        'Cliquez sur "Accueil" dans le menu latéral',
        'Le dashboard se charge automatiquement avec les données de la semaine',
        'Utilisez les flèches ← et → pour changer de semaine',
        'Cliquez sur "Exporter PDF" pour générer un rapport complet'
      ],
      tips: [
        'Les tendances vertes (↗) indiquent une hausse, les rouges (↘) une baisse',
        'Survolez les graphiques pour voir les valeurs exactes',
        'Le dashboard se rafraîchit automatiquement toutes les 5 minutes'
      ],
      timeGain: '45 minutes par jour en centralisant toutes vos métriques'
    }
  },
  {
    id: 'planning',
    title: 'Planning Collaboratif',
    icon: Calendar,
    content: {
      objective: 'Planifiez et coordonnez toutes vos réceptions et expéditions en équipe, avec notifications automatiques.',
      features: [
        'Création de réceptions et expéditions',
        'Vue calendrier hebdomadaire',
        'Codes couleur par type d\'événement',
        'Notifications automatiques à l\'équipe'
      ],
      steps: [
        'Menu latéral → "Planning"',
        'Cliquez sur "Nouvelle réception" ou "Nouvelle expédition"',
        'Remplissez les informations requises (date, marchandise, quantité)',
        'Validez la création - les notifications sont envoyées automatiquement'
      ],
      tips: [
        'Utilisez les codes couleur pour identifier rapidement les types',
        'Les notifications sont envoyées automatiquement à tous les membres',
        'Vous pouvez filtrer par type (réceptions/expéditions)'
      ],
      timeGain: 'Zéro conflit de planning grâce à la synchronisation en temps réel'
    }
  },
  {
    id: 'chargement-3d',
    title: 'Chargement 3D',
    icon: Package,
    content: {
      objective: 'Visualisez en 3D le chargement de vos camions et optimisez l\'espace disponible.',
      features: [
        'Rendu 3D interactif du camion',
        'Placement manuel ou automatique des palettes',
        'Calcul du taux de remplissage',
        'Vue à 360° avec contrôles souris'
      ],
      steps: [
        'Menu → "Chargement 3D" ou "Chargement Auto"',
        'Importez MasterData (dimensions produits)',
        'Importez Listing Palettes (liste à charger)',
        'Configurez les dimensions du camion',
        'Mode Auto : Cliquez "Optimiser" - résultat en 5 secondes'
      ],
      tips: [
        'Le mode auto optimise jusqu\'à 30% d\'espace gagné',
        'Rotation : clic gauche + glisser, Zoom : molette',
        'Activez le gerbage automatique pour empiler les palettes'
      ],
      timeGain: 'Optimisation instantanée en 5 secondes avec jusqu\'à 30% d\'espace gagné'
    }
  },
  {
    id: 'tournees',
    title: 'Gestion des Tournées',
    icon: Truck,
    content: {
      objective: 'Optimisez vos routes de livraison avec GPS, suivi en temps réel et planification intelligente.',
      features: [
        'Création de tournées multi-stops',
        'Optimisation des itinéraires',
        'Assignation des chauffeurs',
        'Suivi GPS en temps réel'
      ],
      steps: [
        'Menu → "Tournées" → "Nouvelle tournée"',
        'Ajoutez les arrêts avec adresses et produits',
        'Cliquez "Optimiser la route" pour le meilleur itinéraire',
        'Démarrez la tournée pour activer le suivi GPS',
        'Validez chaque livraison en temps réel'
      ],
      tips: [
        'L\'optimisation peut réduire jusqu\'à 20% des kilomètres',
        'Notifications en temps réel à chaque livraison',
        'Vous pouvez réorganiser manuellement les stops si besoin'
      ],
      timeGain: 'Jusqu\'à 20% de km économisés grâce à l\'optimisation des routes'
    }
  },
  {
    id: 'stocks',
    title: 'Gestion des Stocks',
    icon: Boxes,
    content: {
      objective: 'Suivez en temps réel tous vos mouvements de stock avec alertes automatiques.',
      features: [
        'Inventaire complet avec quantités',
        'Alertes de rupture de stock',
        'Historique des mouvements',
        'Recherche avancée par EAN/référence'
      ],
      steps: [
        'Menu → "Stocks" pour voir l\'inventaire complet',
        'Utilisez la recherche pour trouver un article',
        'Cliquez sur un produit pour voir les détails',
        'Configurez les seuils d\'alerte si nécessaire',
        'Consultez l\'historique dans l\'onglet "Mouvements"'
      ],
      tips: [
        'Les articles en rupture apparaissent en rouge',
        'Les alertes sont envoyées par email et dans le chat',
        'Synchronisation automatique avec les entrées/sorties'
      ],
      timeGain: 'Stocks toujours à jour en temps réel sans saisie manuelle'
    }
  },
  {
    id: 'entrees-stock',
    title: 'Entrées de Stock',
    icon: TrendingUp,
    content: {
      objective: 'Enregistrez rapidement toutes vos réceptions avec traçabilité complète.',
      features: [
        'Scan de code-barres',
        'Validation des quantités',
        'Historique complet',
        'Attribution automatique des emplacements'
      ],
      steps: [
        'Menu → "Stock" → "Entrées"',
        'Scannez le code-barres ou recherchez le produit',
        'Indiquez la quantité reçue',
        'Sélectionnez l\'emplacement de stockage',
        'Validez - le stock est mis à jour instantanément'
      ],
      tips: [
        'Le scan de code-barres est 10x plus rapide',
        'Les emplacements sont suggérés automatiquement',
        'Toutes les entrées sont horodatées et traçables'
      ],
      timeGain: 'Traçabilité totale avec historique complet de chaque mouvement'
    }
  },
  {
    id: 'sorties-stock',
    title: 'Sorties de Stock',
    icon: TrendingDown,
    content: {
      objective: 'Gérez vos expéditions avec validation multi-niveaux pour zéro erreur.',
      features: [
        'Picking guidé',
        'Validation par scan',
        'Contrôle des quantités',
        'Génération des documents de transport'
      ],
      steps: [
        'Menu → "Stock" → "Sorties"',
        'Sélectionnez le type (expédition, transfert, retour)',
        'Scannez les articles à sortir',
        'Validation multi-niveaux (préparateur → contrôleur → superviseur)',
        'Générez les documents (bon de livraison, étiquettes)'
      ],
      tips: [
        'La validation multi-niveaux élimine 99% des erreurs',
        'Les documents sont générés automatiquement en PDF',
        'Historique complet pour audit et traçabilité'
      ],
      timeGain: 'Zéro erreur d\'expédition grâce à la validation multi-niveaux'
    }
  },
  {
    id: 'synoptique-3d',
    title: 'Vue Synoptique 3D',
    icon: Boxes,
    content: {
      objective: 'Explorez votre entrepôt en 3D et localisez instantanément n\'importe quelle palette.',
      features: [
        'Rendu 3D de l\'entrepôt complet',
        'Localisation en temps réel des palettes',
        'Recherche instantanée',
        'Navigation interactive'
      ],
      steps: [
        'Menu → "Stock" → "Vue Synoptique 3D"',
        'Explorez avec la souris (rotation, zoom, déplacement)',
        'Utilisez la recherche pour localiser un produit',
        'Le système surligne l\'emplacement en 3D en 3 secondes',
        'Cliquez sur une palette pour voir les détails'
      ],
      tips: [
        'Les palettes pleines sont en vert, les incomplètes en orange',
        'Double-cliquez pour zoomer directement sur un emplacement',
        'Utilisez le mode "Vue aérienne" pour une vision d\'ensemble'
      ],
      timeGain: 'Recherche en 3 secondes au lieu de chercher physiquement'
    }
  },
  {
    id: 'masterdata',
    title: 'MasterData',
    icon: BarChart3,
    content: {
      objective: 'Centralisez toutes les données maîtres dans une base unique et fiable.',
      features: [
        'Gestion des articles (EAN, dimensions, poids)',
        'Fichier clients',
        'Fichier fournisseurs',
        'Import/Export Excel massif'
      ],
      steps: [
        'Menu → "MasterData"',
        'Cliquez "Nouvel article" ou "Importer Excel"',
        'Renseignez les informations (EAN, nom, dimensions, poids)',
        'Gérez les clients et fournisseurs dans les onglets dédiés',
        'Exportez en Excel/CSV quand nécessaire'
      ],
      tips: [
        'Le MasterData est la source de vérité pour tous les modules',
        'Les imports Excel acceptent jusqu\'à 10 000 lignes',
        'Mettez à jour régulièrement pour éviter les erreurs'
      ],
      timeGain: 'Une seule source de vérité élimine les incohérences'
    }
  },
  {
    id: 'chat',
    title: 'Chat Intégré',
    icon: MessageSquare,
    content: {
      objective: 'Communiquez instantanément avec votre équipe sans quitter la plateforme.',
      features: [
        'Messages instantanés',
        'Canaux par équipe/projet',
        'Notifications en temps réel',
        'Partage de fichiers'
      ],
      steps: [
        'Cliquez sur l\'icône messagerie en haut à droite',
        'Rejoignez un canal (#général, #logistique, #entrepôt)',
        'Tapez votre message et utilisez @ pour mentionner',
        'Partagez des fichiers par glisser-déposer',
        'Messages directs 1-à-1 disponibles'
      ],
      tips: [
        'Utilisez @all pour notifier tout le canal',
        'Épinglez les messages importants',
        'Activez les notifications desktop pour ne rien manquer'
      ],
      timeGain: 'Communication instantanée sans emails interminables'
    }
  },
  {
    id: 'inventaire',
    title: 'Inventaire',
    icon: FileText,
    content: {
      objective: 'Réalisez des inventaires complets ou partiels rapidement avec validation automatique.',
      features: [
        'Mode inventaire guidé',
        'Scan de code-barres',
        'Comparaison stock théorique vs réel',
        'Génération d\'écarts automatique'
      ],
      steps: [
        'Menu → "Inventaire" → "Nouvel inventaire"',
        'Choisissez le type (complet, partiel, tournant)',
        'Comptez les articles en scannant les codes-barres',
        'Le système compare automatiquement avec le stock théorique',
        'Validez les écarts et ajustez les stocks automatiquement'
      ],
      tips: [
        'Inventaires tournants mensuels pour éviter les gros écarts',
        'Plusieurs personnes peuvent compter en simultané',
        'Les écarts < 5% sont normaux dans la logistique'
      ],
      timeGain: 'Inventaire 3x plus rapide avec scan et ajustements automatiques'
    }
  }
];

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<string>('dashboard');

  // Filtrage des guides selon la recherche
  const filteredGuides = useMemo(() => {
    if (!searchTerm) return guides;
    
    const term = searchTerm.toLowerCase();
    return guides.filter(guide => 
      guide.title.toLowerCase().includes(term) ||
      guide.content.objective.toLowerCase().includes(term) ||
      guide.content.features.some(f => f.toLowerCase().includes(term))
    );
  }, [searchTerm]);

  const currentGuide = guides.find(g => g.id === selectedGuide);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header avec recherche */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Book className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Centre d'aide Sloti
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Trouvez rapidement comment utiliser chaque fonctionnalité
              </p>
            </div>
          </div>
          
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher une fonctionnalité, un guide..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar navigation */}
        <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-180px)] overflow-y-auto sticky top-[180px]">
          <nav className="p-4">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-3">
              {filteredGuides.length} {filteredGuides.length > 1 ? 'Guides disponibles' : 'Guide disponible'}
            </div>
            
            <div className="space-y-1">
              {filteredGuides.map(guide => {
                const Icon = guide.icon;
                const isActive = selectedGuide === guide.id;
                
                return (
                  <button
                    key={guide.id}
                    onClick={() => setSelectedGuide(guide.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                      <span className="font-medium">{guide.title}</span>
                      {isActive && (
                        <ChevronRight size={16} className="ml-auto" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Contenu du guide */}
        <main className="flex-1 p-8 overflow-y-auto">
          {currentGuide ? (
            <div className="max-w-4xl">
              {/* En-tête du guide */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <currentGuide.icon className="text-white" size={32} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                      {currentGuide.title}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Objectif */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-6 mb-8">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Objectif</h3>
                    <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                      {currentGuide.content.objective}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fonctionnalités principales */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Fonctionnalités principales
                </h3>
                <ul className="space-y-3">
                  {currentGuide.content.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0 w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Étapes d'utilisation */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🚀</span>
                  Comment l'utiliser
                </h3>
                <div className="space-y-4">
                  {currentGuide.content.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Astuces */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-6 mb-8">
                <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-300 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  Astuces
                </h3>
                <ul className="space-y-3">
                  {currentGuide.content.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-yellow-600 dark:text-yellow-400 font-bold">→</span>
                      <span className="text-yellow-900 dark:text-yellow-200 leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gain de temps */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">⏱️</div>
                  <h3 className="text-xl font-bold">Gain de temps</h3>
                </div>
                <p className="text-green-50 text-lg font-medium">
                  {currentGuide.content.timeGain}
                </p>
              </div>

              {/* Boutons d'action */}
              <div className="mt-8 flex gap-4 flex-wrap">
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md">
                  <Download size={18} />
                  Télécharger en PDF
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors border border-gray-300 dark:border-gray-600">
                  <ExternalLink size={18} />
                  Voir une vidéo tutoriel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <HelpCircle className="mx-auto mb-4 text-gray-400" size={64} />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Aucun guide trouvé
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                Essayez une autre recherche ou sélectionnez un module dans la liste
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}