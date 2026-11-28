import { autofillTodaySteps, manualStepsProvider, mergeSteps, registerStepsProvider, resolveStepsProvider, StepsProvider, stepsAutofillEnabled } from '@/lib/stepsSource';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const fake = (steps: number | null, opts: Partial<StepsProvider> = {}): StepsProvider => ({
  id: 'healthkit', label: 'Apple Health',
  isAvailable: async () => true, requestPermission: async () => true, readToday: async () => steps, ...opts,
});

describe('steps source', () => {
  test('flag parsing', () => {
    expect(stepsAutofillEnabled({ EXPO_PUBLIC_STEPS_AUTOFILL: '1' })).toBe(true);
    expect(stepsAutofillEnabled({})).toBe(false);
  });
  test('falls back to manual when disabled, on web, unregistered or unavailable', async () => {
    expect(await resolveStepsProvider('ios', false)).toBe(manualStepsProvider);
    expect(await resolveStepsProvider('web', true)).toBe(manualStepsProvider);
    expect(await resolveStepsProvider('android', true)).toBe(manualStepsProvider);
    registerStepsProvider('ios', fake(5, { isAvailable: async () => false }));
    expect(await resolveStepsProvider('ios', true)).toBe(manualStepsProvider);
    registerStepsProvider('ios', fake(5));
    expect((await resolveStepsProvider('ios', true)).id).toBe('healthkit');
  });
  test('merge: device count raises, never lowers a manual entry', () => {
    expect(mergeSteps(undefined, 4321.4)).toBe(4321);
    expect(mergeSteps(3000, 5000)).toBe(5000);
    expect(mergeSteps(8000, 5000)).toBeNull();
    expect(mergeSteps(1000, null)).toBeNull();
    expect(mergeSteps(1000, -5)).toBeNull();
  });
  test('autofill respects permission and errors', async () => {
    expect(await autofillTodaySteps(0, fake(6000))).toBe(6000);
    expect(await autofillTodaySteps(0, fake(6000, { requestPermission: async () => false }))).toBeNull();
    expect(await autofillTodaySteps(0, fake(6000, { readToday: async () => { throw new Error('x'); } }))).toBeNull();
    expect(await autofillTodaySteps(0, manualStepsProvider)).toBeNull();
  });
});
