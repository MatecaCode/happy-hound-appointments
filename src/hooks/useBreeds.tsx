
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Breed {
  id: string;
  name: string;
  size_category?: string;
}

export const useBreeds = () => {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBreeds();
  }, []);

  const fetchBreeds = async () => {
    try {
      const { data, error } = await supabase
        .from('breeds')
        .select('id, name, size_category')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setBreeds(data || []);
    } catch (error) {
      console.error('Error fetching breeds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { breeds, isLoading, refetch: fetchBreeds };
};
