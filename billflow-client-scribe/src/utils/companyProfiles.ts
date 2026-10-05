export interface CompanyProfile {
  id: 'principal' | 'secondary';
  label: string;
  name: string;
  address: string;
  email: string;
  rc: string;
  nif: string;
  nis: string;
  art: string;
  rib: string;
  capital: string;
  phone?: string;
  website?: string;
  logo?: string;
}

export const DEFAULT_PRINCIPAL_PROFILE: CompanyProfile = {
  id: 'principal',
  label: 'Registre Principal (00/16)',
  name: 'INSPECTION POWER',
  address: 'Villa N° 56, Rue N° 03, Rue Fekhar Zoubir, Bouzareah, Alger, ALGERIE',
  email: 'contact@inspectionpower.dz',
  rc: 'N° 06B0974736- 00/16',
  nif: '0006 16097473628',
  nis: '0006 161105986 39',
  art: '16115232033',
  rib: '038 01601 0000 822 00103',
  capital: '25.000.000,00 DA',
  phone: '021 12 34 56',
};

export const DEFAULT_SECONDARY_PROFILE: CompanyProfile = {
  id: 'secondary',
  label: 'Registre Secondaire (01/16)',
  name: 'INSPECTION POWER (Secondaire)',
  address: 'Adresse Registre Secondaire, Alger, ALGERIE',
  email: 'contact@inspectionpower.dz',
  rc: 'N° 06B0974736- 01/16',
  nif: '0006 16097473628',
  nis: '0006 161105986 39',
  art: '16115706067',
  rib: '038 01601 0000 822 00103',
  capital: '25.000.000,00 DA',
  phone: '021 12 34 56',
};

const STORAGE_KEY = 'billflow_company_profiles_v1';

export const getCompanyProfiles = (): { principal: CompanyProfile; secondary: CompanyProfile } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        principal: { ...DEFAULT_PRINCIPAL_PROFILE, ...(parsed.principal || {}) },
        secondary: { ...DEFAULT_SECONDARY_PROFILE, ...(parsed.secondary || {}) },
      };
    }
  } catch (error) {
    console.warn('Error reading company profiles from localStorage:', error);
  }

  return {
    principal: { ...DEFAULT_PRINCIPAL_PROFILE },
    secondary: { ...DEFAULT_SECONDARY_PROFILE },
  };
};

export const saveCompanyProfiles = (profiles: {
  principal: Partial<CompanyProfile>;
  secondary: Partial<CompanyProfile>;
}): void => {
  try {
    const current = getCompanyProfiles();
    const updated = {
      principal: { ...current.principal, ...profiles.principal, id: 'principal' as const },
      secondary: { ...current.secondary, ...profiles.secondary, id: 'secondary' as const },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('company_profiles_updated', { detail: updated }));
  } catch (error) {
    console.error('Error saving company profiles:', error);
  }
};

export const getCompanyProfileById = (
  entityId?: 'principal' | 'secondary' | string | null
): CompanyProfile => {
  const profiles = getCompanyProfiles();
  if (entityId === 'secondary') {
    return profiles.secondary;
  }
  return profiles.principal;
};
