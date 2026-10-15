import type { Service } from '@/lib/supabase';
import type { FormField } from '@/types';
import { TANZANIA_EMBLEM_DATA_URL } from './emblem';

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  description_en?: string;
  path: string;
  active?: boolean;
  name: string;
  name_en?: string;
  fee: number;
  form_schema: FormField[];
  diaspora_form_schema?: FormField[];
  created_at: string;
}

export const TANZANIA_LOGO_URL = TANZANIA_EMBLEM_DATA_URL;

export const SERVICES_LIST: ServiceItem[] = [
  {
    id: 'kibali_mazishi',
    title: 'Kibali cha Mazishi',
    name: 'Kibali cha Mazishi',
    name_en: 'Burial Permit',
    description: 'Ombi la kibali cha taratibu za mazishi mtaani.',
    description_en: 'Application for burial permit and funeral arrangements.',
    fee: 2000,
    form_schema: [],
    created_at: new Date().toISOString(),
    path: '/apply/kibali-mazishi',
    active: true,
  },
  {
    id: 'kibali_sherehe',
    title: 'Kibali cha Sherehe',
    name: 'Kibali cha Sherehe',
    name_en: 'Celebration Permit',
    description: 'Ombi la kibali cha kuandaa sherehe au mikutano ya kijamii.',
    description_en: 'Permit for celebration or public event planning.',
    fee: 10000,
    form_schema: [],
    created_at: new Date().toISOString(),
    path: '/apply/kibali-sherehe',
    active: true,
  },
  {
    id: 'barua_utambulisho',
    title: 'Barua ya Utambulisho',
    name: 'Barua ya Utambulisho',
    name_en: 'Introduction Letter',
    description: 'Ombi la barua rasmi ya utambulisho kutoka kwa Afisa Mtendaji.',
    description_en: 'Official letter of introduction for institutions and partnerships.',
    fee: 2000,
    form_schema: [],
    created_at: new Date().toISOString(),
    path: '/apply/barua-utambulisho',
    active: true,
  },
  {
    id: 'taarifa_mgogoro',
    title: 'Taarifa ya Mgogoro',
    name: 'Taarifa ya Mgogoro',
    name_en: 'Dispute Report',
    description: 'Kutoa taarifa ya mgogoro wa kifamilia, ardhi au kijamii.',
    description_en: 'Report a family, land or community dispute for mediation.',
    fee: 1000,
    form_schema: [],
    created_at: new Date().toISOString(),
    path: '/apply/taarifa-mgogoro',
    active: true,
  },
  {
    id: 'business_portal',
    title: 'Business Portal',
    name: 'Business Portal',
    name_en: 'Business Portal',
    description: 'Portal ya usimamizi wa biashara, idhini na leseni.',
    description_en: 'Business registration and licensing portal.',
    fee: 0,
    form_schema: [],
    created_at: new Date().toISOString(),
    path: '/staff/business-approval',
    active: true,
  },
];

export const CITIZEN_VISIBLE_SERVICES = SERVICES_LIST.filter((service) => service.id !== 'business_portal');
export const BUSINESS_PORTAL_SERVICE = SERVICES_LIST.find((service) => service.id === 'business_portal') ?? SERVICES_LIST[0];
export const INITIAL_SERVICES = SERVICES_LIST;

export const HARDCODED_SERVICES = SERVICES_LIST as unknown as Service[];
export const SERVICES = SERVICES_LIST;
export default SERVICES_LIST;
