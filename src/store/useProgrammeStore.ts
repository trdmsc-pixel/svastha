import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ConditionFlag } from '@/programme/types';
import { WeighIn } from '@/engine/programmeEngine';
import { DateKey, todayKey } from '@/lib/dates';
import { persistStorage, readRaw, removeKey } from '@/lib/storage';

export interface MedicineEntry {
  on: boolean;
  name: string; // brand + dose, written by the user from the prescription
  startedOn?: DateKey;
}

type ProgrammeData = Pick<ProgrammeState, 'programmeId' | 'startDate' | 'checks' | 'steps' | 'weighIns' | 'doctorDone' | 'questionsDone' | 'medicines' | 'remindersOn'>;

export interface ProgrammeState {
  programmeId: string | null;
  startDate: DateKey | null;
  /** Ticked routine item ids per day. */
  checks: Record<DateKey, string[]>;
  steps: Record<DateKey, number>;
  weighIns: WeighIn[];
  doctorDone: string[];
  questionsDone: string[];
  medicines: Record<ConditionFlag, MedicineEntry>;
  remindersOn: boolean;
  startProgramme: (id: string, startDate: DateKey, first?: Omit<WeighIn, 'date'> | null) => void;
  stopProgramme: () => void;
  toggleCheck: (date: DateKey, itemId: string) => boolean; // returns new checked state
  setSteps: (date: DateKey, steps: number) => void;
  addWeighIn: (w: WeighIn) => void;
  removeWeighIn: (date: DateKey) => void;
  toggleDoctor: (id: string) => void;
  toggleQuestion: (q: string) => void;
  setMedicine: (flag: ConditionFlag, patch: Partial<MedicineEntry>) => void;
  setRemindersOn: (on: boolean) => void;
}

const EMPTY_MEDS: Record<ConditionFlag, MedicineEntry> = {
  thyroid: { on: false, name: '' },
  b12: { on: false, name: '' },
  vitaminD: { on: false, name: '' },
  calcium: { on: false, name: '' },
  folic: { on: false, name: '' },
};

const INITIAL: ProgrammeData = {
  programmeId: null,
  startDate: null,
  checks: {},
  steps: {},
  weighIns: [],
  doctorDone: [],
  questionsDone: [],
  medicines: EMPTY_MEDS,
  remindersOn: true,
};

const programmeKey = (userId: string) => `svastha-programme-v1:${userId}`;

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export const useProgrammeStore = create<ProgrammeState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      startProgramme: (id, startDate, first) =>
        set((s) => ({
          programmeId: id,
          startDate,
          weighIns: first ? [...s.weighIns.filter((w) => w.date !== startDate), { date: startDate, ...first }] : s.weighIns,
        })),
      stopProgramme: () => set({ programmeId: null }),

      toggleCheck: (date, itemId) => {
        const cur = get().checks[date] ?? [];
        const next = toggle(cur, itemId);
        set((s) => ({ checks: { ...s.checks, [date]: next } }));
        return next.includes(itemId);
      },
      setSteps: (date, steps) => set((s) => ({ steps: { ...s.steps, [date]: Math.max(0, Math.round(steps)) } })),
      addWeighIn: (w) => set((s) => ({ weighIns: [...s.weighIns.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date)) })),
      removeWeighIn: (date) => set((s) => ({ weighIns: s.weighIns.filter((w) => w.date !== date) })),
      toggleDoctor: (id) => set((s) => ({ doctorDone: toggle(s.doctorDone, id) })),
      toggleQuestion: (q) => set((s) => ({ questionsDone: toggle(s.questionsDone, q) })),
      setMedicine: (flag, patch) =>
        set((s) => {
          const prev = s.medicines[flag];
          const next = { ...prev, ...patch };
          if (patch.on && !prev.on && !next.startedOn) next.startedOn = todayKey();
          return { medicines: { ...s.medicines, [flag]: next } };
        }),
      setRemindersOn: (on) => set({ remindersOn: on }),
    }),
    { name: programmeKey('anon'), storage: persistStorage, version: 1 }
  )
);

/** Flags derived from the medicines the user marked as prescribed. */
export function selectFlags(s: Pick<ProgrammeState, 'medicines'>): Partial<Record<ConditionFlag, boolean>> {
  const out: Partial<Record<ConditionFlag, boolean>> = {};
  (Object.keys(s.medicines) as ConditionFlag[]).forEach((k) => (out[k] = s.medicines[k].on));
  return out;
}

/** Each account keeps its own programme on the device (called from switchUserData). */
export async function switchProgrammeUser(userId: string | null): Promise<void> {
  const key = programmeKey(userId ?? 'anon');
  useProgrammeStore.persist.setOptions({ name: key });
  if (await readRaw(key)) await useProgrammeStore.persist.rehydrate();
  else useProgrammeStore.setState({ ...INITIAL });
}

export async function wipeProgrammeUser(userId: string): Promise<void> {
  await removeKey(programmeKey(userId));
  useProgrammeStore.setState({ ...INITIAL });
}

export function exportProgrammeData(): ProgrammeData {
  const { programmeId, startDate, checks, steps, weighIns, doctorDone, questionsDone, medicines, remindersOn } = useProgrammeStore.getState();
  return { programmeId, startDate, checks, steps, weighIns, doctorDone, questionsDone, medicines, remindersOn };
}
