interface AvatarProps {
    username: string;
    size?: 'sm' | 'md' | 'lg';
  }
  
  export function Avatar({ username, size = 'md' }: AvatarProps) {
    const sizes = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base'
    };
  
    const getInitials = (name: string): string => {
      if (!name || typeof name !== 'string') return '?';
      
      const cleaned = name.trim();
      if (cleaned.length === 0) return '?';
      
      // Retirer les emojis et caractères spéciaux
      const alphaOnly = cleaned.replace(/[^\p{L}\p{N}\s]/gu, '');
      if (alphaOnly.length === 0) return cleaned[0];
      
      const parts = alphaOnly.split(/\s+/).filter(Boolean);
      if (parts.length === 0) return cleaned[0];
      
      if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
      }
      
      return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
    };
  
    return (
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0`}>
        {getInitials(username)}
      </div>
    );
  }