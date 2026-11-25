'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase';
import { addDaysISO, daysBetween } from './ext-logic';
import { todayISO } from './dates';

export interface ExtEntry {
  key: string;
  kind: 'gite' | 'menage' | 'plantes' | 'chien';
  icon: string;
  title: string;
  detail?: string[];
  /** ménage validé dans l'appli gîtes */
  done?: boolean;
  /** libellé de retard, ex. « en retard de 2 j » */
  late?: string;
  url?: string;
}

interface GiteRes {
  id: string;
  gite: string;
  locataire: string;
  arrivee: string;
  depart: string;
  personnes: number | null;
  notes: string | null;
  menageDone: boolean;
  materiel?: string[];
  enCours?: boolean;
  suivante?: { arrivee: string; personnes: number | null; locataire: string } | null;
}
interface Plantes {
  count: number;
  groups: { code: string; label: string; emoji: string; plants: string[] }[];
}
interface DogReminder {
  id: string;
  type: string;
  date_prochain_rappel: string;
}

interface Ext {
  loaded: boolean;
  errors: string[];
  entriesOn: (iso: string) => ExtEntry[];
}

const Ctx = createContext<Ext>({ loaded: false, errors: [], entriesOn: () => [] });

const URLS = {
  gite: process.env.NEXT_PUBLIC_URL_GITES,
  plantes: process.env.NEXT_PUBLIC_URL_PLANTES,
  chien: process.env.NEXT_PUBLIC_URL_VANYA,
};

/** Garde en mémoire ce que les autres applis affichent (lecture seule), et le recharge au retour sur l'appli */
export function ExternalProvider({ children }: { children: ReactNode }) {
  const [gites, setGites] = useState<GiteRes[]>([]);
  const [plantes, setPlantes] = useState<Plantes | null>(null);
  const [dogs, setDogs] = useState<DogReminder[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const errs: string[] = [];
    const sb = getSupabase();
    try {
      const { data } = await sb.auth.getSession();
      const res = await fetch('/api/ext/agenda', {
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      });
      const j = (await res.json()) as { gites?: GiteRes[]; plantes?: Plantes | null; errors?: string[]; error?: string };
      if (!res.ok) {
        // 503 = pas encore configuré : on reste discret
        if (res.status !== 503) errs.push(j.error ?? 'liaison projet A');
      } else {
        setGites(j.gites ?? []);
        setPlantes(j.plantes ?? null);
        errs.push(...(j.errors ?? []));
      }
    } catch {
      /* hors connexion : on garde ce qu'on avait */
    }
    try {
      // rappels de santé de Vanya : même projet que Bullet, lecture directe
      const { data, error } = await sb
        .from('dog_health_reminders')
        .select('id,type,date_prochain_rappel')
        .eq('actif', true)
        .not('date_prochain_rappel', 'is', null);
      if (error) errs.push('chien : ' + error.message);
      else setDogs((data ?? []) as DogReminder[]);
    } catch {
      /* idem */
    }
    setErrors(errs);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void reload();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const entriesOn = useCallback(
    (iso: string): ExtEntry[] => {
      const today = todayISO();
      const out: ExtEntry[] = [];

      for (const r of gites) {
        const who = [r.locataire, r.personnes ? `${r.personnes} pers.` : null].filter(Boolean).join(' · ');
        const detail = [who, r.notes ?? ''].filter(Boolean);
        if (r.arrivee === iso)
          out.push({ key: `arr-${r.id}`, kind: 'gite', icon: '🏡', title: `Arrivée · ${r.gite}`, detail, url: URLS.gite });
        if (r.depart === iso)
          out.push({ key: `dep-${r.id}`, kind: 'gite', icon: '🏡', title: `Départ · ${r.gite}`, detail: [who], url: URLS.gite });

        // ménage : le jour du départ ; s'il n'est pas validé, il reste affiché jusqu'à 3 jours après
        const emporter = !r.menageDone && !r.enCours && r.materiel?.length ? `🧳 À emporter : ${r.materiel.join(', ')}` : null;
        const prochaine = r.suivante
          ? `👥 Prochaine arrivée : ${r.suivante.personnes ? `${r.suivante.personnes} pers.` : 'nb de personnes non renseigné'} (le ${r.suivante.arrivee.slice(8, 10)}/${r.suivante.arrivee.slice(5, 7)})`
          : 'Pas de réservation ensuite';
        const late = daysBetween(r.depart, today);
        const showLate = iso === today && !r.menageDone && late > 0 && late <= 3;
        if (r.depart === iso || showLate) {
          out.push({
            key: `men-${r.id}`,
            kind: 'menage',
            icon: '🧹',
            title: `Ménage · ${r.gite}`,
            detail: r.menageDone ? undefined : [emporter, prochaine, 'À valider dans l\'appli gîtes'].filter((x): x is string => !!x),
            done: r.menageDone,
            late: showLate && r.depart !== iso ? `départ il y a ${late} j` : undefined,
            url: URLS.gite,
          });
        }
      }

      // la veille d'un ménage : rappel du matériel à préparer
      for (const r of gites) {
        if (r.menageDone || iso < today || addDaysISO(r.depart, -1) !== iso) continue;
        out.push({
          key: `eve-${r.id}`,
          kind: 'menage',
          icon: '🧳',
          title: `Demain : ménage · ${r.gite}`,
          detail: [
            r.suivante
              ? `👥 Prépare pour ${r.suivante.personnes ? `${r.suivante.personnes} pers.` : '? pers.'} (arrivée le ${r.suivante.arrivee.slice(8, 10)}/${r.suivante.arrivee.slice(5, 7)})`
              : 'Pas de réservation ensuite',
            r.enCours
              ? 'Ménage déjà commencé dans l\'appli gîtes'
              : r.materiel?.length
                ? `🧳 À emporter : ${r.materiel.join(', ')}`
                : 'Pas de matériel particulier',
          ],
          url: URLS.gite,
        });
      }

      if (iso === today && plantes && plantes.count > 0) {
        out.push({
          key: 'plantes',
          kind: 'plantes',
          icon: '🌱',
          title: `Plantes · ${plantes.count} soin${plantes.count > 1 ? 's' : ''} à faire`,
          url: URLS.plantes,
        });
      }

      for (const d of dogs) {
        const overdue = d.date_prochain_rappel < today;
        if (d.date_prochain_rappel === iso || (iso === today && overdue)) {
          out.push({
            key: `dog-${d.id}`,
            kind: 'chien',
            icon: '🐶',
            title: d.type,
            late: iso === today && overdue ? `en retard de ${daysBetween(d.date_prochain_rappel, today)} j` : undefined,
            url: URLS.chien,
          });
        }
      }
      return out;
    },
    [gites, plantes, dogs]
  );

  const value = useMemo(() => ({ loaded, errors, entriesOn }), [loaded, errors, entriesOn]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useExternal = () => useContext(Ctx);
