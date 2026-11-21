export type SchedType = 'day' | 'week' | 'month';

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
  sched_type: SchedType | null;
  sched_date: string | null;
  /** rendez-vous : affiché dans une autre couleur, avec une heure optionnelle */
  is_appointment: boolean;
  /** "HH:MM:SS" (Postgres) ou "HH:MM" ; seulement pour les éléments planifiés sur un jour */
  start_time: string | null;
  created_at: string;
}
