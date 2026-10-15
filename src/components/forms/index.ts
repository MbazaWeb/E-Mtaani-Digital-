import type { ComponentType } from 'react';
import type { FormProps } from './types';
import { KibariMazishiForm } from './KibariMazishiForm';
import { KibariShereheForm } from './KibariShereheForm';
import { BaruaUtambulishoForm } from './BaruaUtambulishoForm';
import { MgogoroMashauriForm } from './MgogoroMashauriForm';

export * from './KibariMazishiForm';
export * from './KibariShereheForm';
export * from './BaruaUtambulishoForm';
export * from './MgogoroMashauriForm';

export const SERVICE_FORMS: Record<string, ComponentType<FormProps>> = {
  'Kibali cha Mazishi': KibariMazishiForm,
  'Kibali cha Sherehe': KibariShereheForm,
  'Barua ya Utambulisho': BaruaUtambulishoForm,
  'Taarifa ya Mgogoro': MgogoroMashauriForm,
};

export function hasServiceForm(serviceName: string): boolean {
  return !!SERVICE_FORMS[serviceName];
}
