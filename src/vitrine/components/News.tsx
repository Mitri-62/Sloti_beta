// src/vitrine/components/News.tsx
import { useEffect, useState } from "react";
import { Package, Zap, Handshake, Truck, Users, Award, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "../../supabaseClient";

interface NewsItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  icon_color: string;
  link: string;
  link_text: string;
  published: boolean;
  created_at: string;
  order: number;
}

// Mapping des icônes
const iconMap: { [key: string]: any } = {
  Package,
  Zap,
  Handshake,
  Truck,
  Users,
  Award,
  TrendingUp,
  Sparkles,
};

// Mapping des couleurs
const colorMap: { [key: string]: string } = {
  blue: "bg-blue-100 text-blue-600",
  yellow: "bg-yellow-100 text-yellow-600",
  green: "bg-green-100 text-green-600",
  red: "bg-red-100 text-red-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
  indigo: "bg-indigo-100 text-indigo-600",
  pink: "bg-pink-100 text-pink-600",
};

const focusRingMap: { [key: string]: string } = {
  blue: "focus-within:ring-blue-500",
  yellow: "focus-within:ring-yellow-500",
  green: "focus-within:ring-green-500",
  red: "focus-within:ring-red-500",
  purple: "focus-within:ring-purple-500",
  orange: "focus-within:ring-orange-500",
  indigo: "focus-within:ring-indigo-500",
  pink: "focus-within:ring-pink-500",
};

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("published", true)
        .order("order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNews(data || []);
    } catch (err: any) {
      console.error("Erreur lors du chargement des actualités:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section id="news" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-900">
            Actualités
          </h2>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="news" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-900">
            Actualités
          </h2>
          <div className="text-center text-red-600 py-12">
            <p>Erreur lors du chargement des actualités.</p>
          </div>
        </div>
      </section>
    );
  }

  if (news.length === 0) {
    return (
      <section id="news" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-900">
            Actualités
          </h2>
          <div className="text-center text-gray-600 py-12">
            <p>Aucune actualité disponible pour le moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      id="news" 
      className="py-12 sm:py-16 lg:py-20 bg-gray-50"
      aria-labelledby="news-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 
          id="news-title"
          className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-900"
        >
          Actualités
        </h2>

        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item, index) => {
            const Icon = iconMap[item.icon] || Package;
            const colorClass = colorMap[item.icon_color] || colorMap.blue;
            const focusRing = focusRingMap[item.icon_color] || focusRingMap.blue;
            
            return (
              <article 
                key={item.id}
                className={`bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center focus-within:ring-2 ${focusRing} ${
                  index === news.length - 1 && news.length % 3 !== 0 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div 
                  className={`w-16 h-16 flex items-center justify-center rounded-full ${colorClass} mb-4`}
                  aria-hidden="true"
                >
                  <Icon size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 flex-grow">
                  {item.description}
                </p>
                <a 
                  href={item.link}
                  className="text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  aria-label={`${item.link_text} - ${item.title}`}
                >
                  {item.link_text} →
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}