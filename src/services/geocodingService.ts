// src/services/geocodingService.ts
interface GeocodingResult {
    latitude: number;
    longitude: number;
    quality_score: number;
  }
  
  interface AddressSuggestion {
    display_name: string;
    address: string;
    city: string;
    postcode: string;
    latitude: number;
    longitude: number;
  }
  
  export class GeocodingService {
    private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
    
    /**
     * Géocode une adresse complète
     */
    static async geocodeAddress(
      address: string,
      postalCode?: string,
      city?: string
    ): Promise<GeocodingResult | null> {
      try {
        const fullAddress = [address, postalCode, city, 'France']
          .filter(Boolean)
          .join(', ');
  
        const params = new URLSearchParams({
          q: fullAddress,
          format: 'json',
          limit: '1',
          countrycodes: 'fr',
          addressdetails: '1'
        });
  
        const response = await fetch(
          `${this.NOMINATIM_BASE_URL}/search?${params}`,
          {
            headers: {
              'User-Agent': 'Sloti-Logistics-App',
              'Accept': 'application/json'
            }
          }
        );
  
        if (!response.ok) {
          throw new Error(`Geocoding API error: ${response.status}`);
        }
  
        const data = await response.json();
  
        if (!data || data.length === 0) {
          console.warn('Aucun résultat de géocodage pour:', fullAddress);
          return null;
        }
  
        const result = data[0];
  
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          quality_score: this.calculateQualityScore(result)
        };
  
      } catch (error) {
        console.error('Erreur de géocodage:', error);
        return null;
      }
    }
  
    private static calculateQualityScore(result: any): number {
      const type = result.type || '';
      
      if (type === 'house' || type === 'building') return 1.0;
      if (type === 'street' || type === 'road') return 0.8;
      if (type === 'postcode') return 0.6;
      if (type === 'city' || type === 'town') return 0.4;
      
      return 0.5;
    }
  
    /**
     * Batch geocoding avec délai pour respecter les limites
     */
    static async geocodeMultiple(
      addresses: Array<{ id: string; address: string; postalCode?: string; city?: string }>
    ): Promise<Map<string, GeocodingResult>> {
      const results = new Map<string, GeocodingResult>();
  
      for (const addr of addresses) {
        const result = await this.geocodeAddress(
          addr.address,
          addr.postalCode,
          addr.city
        );
  
        if (result) {
          results.set(addr.id, result);
        }
  
        // Délai de 1 seconde entre chaque requête (limite Nominatim)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
  
      return results;
    }
  
    /**
     * Recherche d'adresses avec autocomplétion
     */
    static async searchAddresses(query: string, limit: number = 5): Promise<AddressSuggestion[]> {
      try {
        if (query.length < 3) {
          return [];
        }
  
        const params = new URLSearchParams({
          q: `${query}, France`,
          format: 'json',
          limit: limit.toString(),
          countrycodes: 'fr',
          addressdetails: '1',
          extratags: '1',
          namedetails: '1'
        });
  
        const response = await fetch(
          `${this.NOMINATIM_BASE_URL}/search?${params}`,
          {
            headers: {
              'User-Agent': 'Sloti-Logistics-App',
              'Accept': 'application/json'
            }
          }
        );
  
        if (!response.ok) {
          throw new Error(`Geocoding API error: ${response.status}`);
        }
  
        const data = await response.json();
  
        return data.map((item: any) => {
          const addr = item.address || {};
          
          // Construire une adresse courte et lisible
          let shortAddress = '';
          let displayName = '';
          
          // Si c'est un commerce/POI
          if (item.namedetails?.name || item.name) {
            const poiName = item.namedetails?.name || item.name;
            const street = addr.road || addr.street || '';
            const houseNumber = addr.house_number || '';
            
            shortAddress = poiName;
            displayName = `${poiName}${street ? ', ' + (houseNumber ? houseNumber + ' ' : '') + street : ''}`;
          } 
          // Si c'est une adresse normale
          else {
            const houseNumber = addr.house_number || '';
            const street = addr.road || addr.street || '';
            
            if (houseNumber && street) {
              shortAddress = `${houseNumber} ${street}`;
              displayName = shortAddress;
            } else if (street) {
              shortAddress = street;
              displayName = street;
            } else {
              shortAddress = addr.suburb || addr.hamlet || addr.village || '';
              displayName = shortAddress;
            }
          }
  
          const city = addr.city || addr.town || addr.village || '';
          const postcode = addr.postcode || '';
  
          return {
            display_name: `${displayName}${city ? ', ' + postcode + ' ' + city : ''}`,
            address: shortAddress,
            city: city,
            postcode: postcode,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon)
          };
        });
  
      } catch (error) {
        console.error('Erreur recherche adresses:', error);
        return [];
      }
    }
  
    /**
     * Recherche spécifique de commerces/POI avec Overpass API
     */
    static async searchPlaces(query: string, limit: number = 5): Promise<AddressSuggestion[]> {
      try {
        if (query.length < 3) {
          return [];
        }
  
        // D'abord essayer avec Nominatim standard
        const nominatimResults = await this.searchAddresses(query, limit);
        
        // Si on cherche un commerce spécifique, chercher aussi avec Overpass
        const isCommerce = /leclerc|carrefour|auchan|intermarché|lidl|super|hyper|magasin|centre.*commercial/i.test(query);
        
        if (isCommerce) {
          try {
            // Overpass query pour chercher les commerces
            const overpassQuery = `
              [out:json][timeout:5];
              area["ISO3166-1"="FR"][admin_level=2];
              (
                node(area)["shop"]["name"~"${query}",i];
                node(area)["amenity"="supermarket"]["name"~"${query}",i];
                way(area)["shop"]["name"~"${query}",i];
                way(area)["amenity"="supermarket"]["name"~"${query}",i];
              );
              out center 5;
            `;
  
            const response = await fetch('https://overpass-api.de/api/interpreter', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: `data=${encodeURIComponent(overpassQuery)}`
            });
  
            if (response.ok) {
              const data = await response.json();
              
              const overpassResults = data.elements.map((element: any) => {
                const lat = element.lat || element.center?.lat;
                const lon = element.lon || element.center?.lon;
                const name = element.tags?.name || 'Commerce';
                const postcode = element.tags?.['addr:postcode'] || '';
                const city = element.tags?.['addr:city'] || '';
  
                // Format court : Nom, Code postal Ville
                const displayName = `${name}${city ? ', ' + postcode + ' ' + city : ''}`;
  
                return {
                  display_name: displayName,
                  address: name,
                  city: city,
                  postcode: postcode,
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lon)
                };
              }).filter((r: any) => r.latitude && r.longitude);
  
              // Fusionner les résultats en évitant les doublons
              const combined = [...overpassResults, ...nominatimResults];
              const unique = combined.filter((item, index, self) =>
                index === self.findIndex((t) => (
                  Math.abs(t.latitude - item.latitude) < 0.0001 &&
                  Math.abs(t.longitude - item.longitude) < 0.0001
                ))
              );
  
              return unique.slice(0, limit);
            }
          } catch (overpassError) {
            console.warn('Overpass API failed, using only Nominatim:', overpassError);
          }
        }
  
        return nominatimResults;
  
      } catch (error) {
        console.error('Erreur recherche places:', error);
        return [];
      }
    }
  }
  
  // Export du type pour l'utiliser ailleurs
  export type { AddressSuggestion };