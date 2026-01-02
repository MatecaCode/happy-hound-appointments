export type NormalizedService = {
  id: string;
  name: string;
  requires_bath?: boolean;
  requires_grooming?: boolean;
  requires_vet?: boolean;
};

export type ServiceCategory = 'BATH' | 'GROOM' | 'VET' | 'OTHER';

export function getServiceCategory(service: NormalizedService | null | undefined): ServiceCategory {
  if (!service) return 'OTHER';
  if (service.requires_bath) return 'BATH';
  if (service.requires_grooming) return 'GROOM';
  if (service.requires_vet) return 'VET';
  return 'OTHER';
}


