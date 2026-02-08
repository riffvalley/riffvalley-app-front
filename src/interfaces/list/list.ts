export type SpecialListType = 'web' | 'app' | 'noticias' | 'videos' | 'riffValley' | 'otros';

export interface List {
    id?: string;
    name: string;
    type: string;
    specialType?: SpecialListType;
    listDate?: string;
    link?: string;
  }
