// src/hooks/useVitrineConfig.ts
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface HeroConfig {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  cta_primary: string;
  cta_secondary: string;
}

export interface PricingPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

export interface PricingConfig {
  starter: PricingPlan;
  pro: PricingPlan;
  enterprise: PricingPlan;
  early_bird: {
    active: boolean;
    discount: number;
    text: string;
  };
}

export interface AboutConfig {
  stats: {
    years: number;
    dev_years: number;
    jobs: number;
    terrain: number;
  };
  quote: string;
  timeline: Array<{
    period: string;
    title: string;
    description: string;
    active?: boolean;
  }>;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQConfig {
  items: FAQItem[];
}

export type VitrineSection = 'hero' | 'pricing' | 'about' | 'faq';

export function useVitrineConfig<T>(section: VitrineSection) {
  const [config, setConfig] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger la config
  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vitrine_config')
        .select('data')
        .eq('section', section)
        .single();

      if (error) throw error;
      setConfig(data.data as T);
    } catch (err: any) {
      console.error(`Erreur chargement config ${section}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder la config
  const saveConfig = async (newConfig: T): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('vitrine_config')
        .update({ data: newConfig as any })
        .eq('section', section);

      if (error) throw error;

      setConfig(newConfig);
      return true;
    } catch (err: any) {
      console.error(`Erreur sauvegarde config ${section}:`, err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    loadConfig();
  }, [section]);

  return {
    config,
    loading,
    error,
    saveConfig,
    reload: loadConfig,
  };
}

export default useVitrineConfig;