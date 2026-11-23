export type SchedType = 'day' | 'week' | 'month';
export type RepeatUnit = 'day' | 'week' | 'month';

export interface Sched {
  type: SchedType;
  /** day: la date · week: le lundi · month: le 1er du mois (format YYYY-MM-DD) */
  date: string;
}

export interface Item {
  id: string;
  parent_id: string | null;
  title: string;
  notes: string | null;
  done: boolean;
  done_at: string | null;
  position: number;
  /** 0 = normal, 1 = prioritaire (remonte en haut de sa liste) */
  priority: number;
  sched_type: SchedType | null;
  sched_date: string | null;
  /** priorité de sa période : pour un élément planifié sur une semaine ou un mois */
  sched_priority: boolean;
  /** rendez-vous : affiché dans une autre couleur, avec une heure optionnelle */
  is_appointment: boolean;
  /** "HH:MM:SS" (Postgres) ou "HH:MM" ; seulement pour les éléments planifiés sur un jour */
  start_time: string | null;
  /** heure de fin du rendez-vous (facultative) */
  end_time: string | null;
  /** lieu du rendez-vous (facultatif) */
  location: string | null;
  /** répétition : « tous les `repeat_every` jours / semaines / mois » (null = pas de répétition) */
  repeat_unit: RepeatUnit | null;
  repeat_every: number;
  /** couleur de l'objectif (sur l'objectif principal ; ses sous-tâches en héritent) */
  color: string | null;
  user_id?: string | null;
  created_at: string;
}

export interface Birthday {
  id: string;
  name: string;
  month: number; // 1–12
  day: number; // 1–31
  birth_year: number | null;
  created_at: string;
}

export type NewBirthday = Pick<Birthday, 'name' | 'month' | 'day' | 'birth_year'>;
