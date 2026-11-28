import { Programme } from './types';

/**
 * 8-Week Reset — a vegetarian / satvic home routine for a homemaker on a school-run schedule.
 * Content mirrors the printed plan (daily routine, food, move, doctor checklist).
 * Wellness guidance only — medicine items appear only once the user marks them as prescribed.
 */
export const RESET_8: Programme = {
  id: 'reset-8',
  name: '8-Week Reset',
  tagline: 'Same time every day. Small ticks, big change.',
  weeks: 8,
  goals: ['3 L water', '7,000+ steps', '3× dairy', '0 fried / maida'],
  winThreshold: 0.8,

  routine: [
    { id: 'wake', time: '08:00', emoji: '💧', title: 'Wake up · 1 glass of water', detail: 'Start the day with water before anything else', kind: 'water', track: true, remind: true, reminderTitle: 'Good morning ☀️', reminderBody: 'One glass of water first. Today is a new tick sheet.' },
    { id: 'thyroid', time: '08:00', emoji: '💊', title: 'Thyroid tablet with plain water', detail: 'No tea, milk or food for 1 hour', kind: 'medicine', track: true, remind: true, requires: 'thyroid', reminderTitle: 'Thyroid tablet 💊', reminderBody: 'Plain water only. Tea and breakfast after 9:00.' },
    { id: 'school', time: '08:00', endTime: '08:45', emoji: '🎒', title: 'Get Nitya ready for school', detail: 'Keep breakfast batter or dough ready the night before', kind: 'family', track: false, remind: false },
    { id: 'breakfast', time: '09:00', emoji: '🍳', title: 'Sit down and eat breakfast', detail: 'Protein + curd + tea with less sugar. Never skip. Don’t eat while cooking.', kind: 'meal', key: true, track: true, remind: true, reminderTitle: 'Breakfast time 🍳', reminderBody: 'Sit down and eat. Protein + curd. Check today’s menu.' },
    { id: 'bottle1', time: '09:30', endTime: '12:00', emoji: '💧', title: 'Kitchen & house work · Bottle 1', detail: 'Finish 1 litre by 12. Keep the bottle on the kitchen slab.', kind: 'water', track: true, remind: false },
    { id: 'fruit', time: '11:00', emoji: '🍎', title: '1 fruit', detail: 'Guava, apple, orange, papaya or pomegranate', kind: 'meal', track: true, remind: true, reminderTitle: 'Fruit break 🍎', reminderBody: 'One whole fruit now. Not juice.' },
    { id: 'sun', time: '12:00', emoji: '☀️', title: '20 min sun + 1 glass chaas', detail: 'Face and arms in the sun. Hang clothes or chop veggies on the terrace.', kind: 'sun', track: true, remind: true, reminderTitle: 'Sun + chaas ☀️', reminderBody: '20 minutes in the sun and a glass of masala chaas.' },
    { id: 'lunch', time: '14:00', emoji: '🥗', title: 'Lunch: salad first, then the plate rule', detail: '½ sabzi + salad · ¼ dal / paneer · ¼ roti / rice · + curd', kind: 'meal', key: true, track: true, remind: true, reminderTitle: 'Lunch 🥗', reminderBody: 'Salad first. Then ½ sabzi, ¼ dal, ¼ roti. Curd on the side.' },
    { id: 'b12', time: '14:00', emoji: '💊', title: 'B12 with lunch', detail: 'As your doctor prescribed', kind: 'medicine', track: true, remind: false, requires: 'b12' },
    { id: 'vitd', time: '14:00', emoji: '💊', title: 'Vitamin D sachet (weekly)', detail: 'Mix in milk or take with a meal that has some ghee', kind: 'medicine', track: true, remind: true, requires: 'vitaminD', days: [6], reminderTitle: 'Vitamin D day 💊', reminderBody: 'Your weekly Vitamin D with lunch today.' },
    { id: 'walk-lunch', time: '14:30', emoji: '🚶‍♀️', title: 'Walk 10 minutes', detail: 'Inside the house or on the terrace. Don’t lie down straight after food.', kind: 'move', track: true, remind: true, reminderTitle: '10-minute walk 🚶‍♀️', reminderBody: 'A short walk after lunch helps digestion and blood sugar.' },
    { id: 'calcium', time: '15:00', emoji: '💊', title: 'Calcium / iron tablet', detail: 'At least 4 hours away from the thyroid tablet', kind: 'medicine', track: true, remind: true, requires: 'calcium', reminderTitle: 'Calcium / iron 💊', reminderBody: 'Time for your calcium or iron tablet.' },
    { id: 'rest', time: '15:00', endTime: '16:30', emoji: '🛋️', title: 'Rest or chores · nap 20 min max', kind: 'rest', track: false, remind: false },
    { id: 'snack', time: '16:30', emoji: '🍵', title: 'Tea + healthy snack', detail: 'Roasted chana, makhana or 5 almonds', kind: 'meal', track: true, remind: true, reminderTitle: 'Chai time 🍵', reminderBody: 'Tea with roasted chana or makhana. Skip the biscuits.' },
    { id: 'exercise', time: '17:15', endTime: '18:00', emoji: '💪', title: 'Exercise: brisk walk + workout', detail: 'This time is fixed. Tell the family.', kind: 'move', key: true, track: true, remind: true, reminderTitle: 'Your 45 minutes 💪', reminderBody: 'Shoes on. Walk first, then today’s workout.' },
    { id: 'bottle2', time: '18:00', emoji: '💧', title: 'Bottle 2 done · relax with Nitya', kind: 'water', track: true, remind: true, reminderTitle: 'Bottle 2 💧', reminderBody: 'Is your second litre done?' },
    { id: 'folic', time: '19:00', emoji: '💊', title: 'Folic acid', detail: 'As your gynaecologist prescribed', kind: 'medicine', track: true, remind: true, requires: 'folic', reminderTitle: 'Folic acid 💊', reminderBody: 'Time for your folic acid.' },
    { id: 'dinner', time: '20:45', emoji: '🌙', title: 'Eat your dinner by 9 PM', detail: 'Lightest meal of the day. Nothing fried. Kitchen closes after dinner.', kind: 'meal', key: true, track: true, remind: true, reminderTitle: 'Dinner by 9 🌙', reminderBody: 'Light dinner now. The kitchen closes after.' },
    { id: 'walk-night', time: '21:30', emoji: '🚶', title: '10 min walk or 5 min Vajrasana', kind: 'move', track: true, remind: true, reminderTitle: 'Evening walk 🚶', reminderBody: '10 minutes together, or 5 minutes of Vajrasana.' },
    { id: 'phone', time: '22:15', emoji: '📵', title: 'Phone away · warm haldi milk', detail: 'No sugar. Optional, only if hungry.', kind: 'sleep', track: false, remind: true, reminderTitle: 'Wind down 📵', reminderBody: 'Phone away. Tick today’s boxes before sleeping.' },
    { id: 'sleep', time: '23:00', emoji: '😴', title: 'Sleep by 11', detail: 'Sleep is when the body repairs and burns fat', kind: 'sleep', track: true, remind: false },
  ],

  phases: [
    { index: 0, label: 'Start', fromWeek: 1, toWeek: 2, walkMin: 25, steps: 6000, rounds: 2 },
    { index: 1, label: 'Build', fromWeek: 3, toWeek: 4, walkMin: 35, steps: 7500, rounds: 3 },
    { index: 2, label: 'Strong', fromWeek: 5, toWeek: 8, walkMin: 40, steps: 9000, rounds: 3 },
  ],

  workoutByWeekday: { 0: 'strength', 1: 'yoga', 2: 'strength', 3: 'yoga', 4: 'strength', 5: 'yoga', 6: 'rest' },

  strength: [
    { id: 'squat', name: 'Chair Squat', how: 'Sit down on a chair slowly, then stand up. Arms forward, chest up.', reps: ['10', '12', '15'] },
    { id: 'pushup', name: 'Wall Push-up', how: 'Hands on the wall, shoulder-width. Chest to the wall, then push back.', reps: ['10', '12', '15 on kitchen slab'] },
    { id: 'bridge', name: 'Glute Bridge', how: 'Lie on your back, knees bent. Lift your hips, squeeze 2 sec, lower slowly.', reps: ['12', '15', '20'] },
    { id: 'march', name: 'Standing March', how: 'Lift your knees to hip height and swing your arms. Go fast.', reps: ['30 sec', '45 sec', '60 sec'], seconds: [30, 45, 60] },
    { id: 'birddog', name: 'Bird-Dog', how: 'On hands and knees. Stretch your opposite arm and leg out, hold 3 sec. Switch.', reps: ['6 each side', '8 each side', '10 each side'] },
    { id: 'legraise', name: 'Side Leg Raise', how: 'Lie on your side. Lift your top leg slowly, then lower. Switch sides.', reps: ['10 each side', '12 each side', '15 each side'] },
    { id: 'plank', name: 'Knee Plank', how: 'On forearms and knees, body in a straight line, tummy tight. Breathe.', reps: ['15 sec', '20 sec', '30 sec'], seconds: [15, 20, 30] },
  ],

  yoga: [
    { id: 'tadasana', name: 'Tadasana with arms up', how: 'Stand tall, stretch your arms up, rise on your toes. 5 slow breaths.', reps: ['3 times', '3 times', '3 times'] },
    { id: 'catcow', name: 'Cat-Cow', how: 'On hands and knees. Breathe in, arch the back down. Breathe out, round it up.', reps: ['10 rounds', '10 rounds', '12 rounds'] },
    { id: 'cobra', name: 'Bhujangasana (Cobra)', how: 'Lie on your tummy and lift your chest using your back. Shoulders down.', reps: ['3 × 15 sec', '3 × 15 sec', '3 × 20 sec'], seconds: [15, 15, 20] },
    { id: 'setu', name: 'Setu Bandhasana (Bridge)', how: 'Lift your hips and hold at the top. Breathe slowly.', reps: ['3 × 15 sec', '3 × 15 sec', '3 × 20 sec'], seconds: [15, 15, 20] },
    { id: 'child', name: 'Balasana (Child pose)', how: 'Sit back on your heels, forehead down, arms forward. Relax.', reps: ['1 minute', '1 minute', '1 minute'], seconds: [60, 60, 60] },
    { id: 'anulom', name: 'Anulom-Vilom', how: 'Sit straight and breathe in and out through one nostril at a time, slowly.', reps: ['5 minutes', '5 minutes', '5 minutes'], seconds: [300, 300, 300] },
  ],

  menu: {
    0: { breakfast: { title: 'Paneer moong chilla (2)', detail: 'Green chutney + tea' }, lunch: { title: 'Rajma + 1 katori rice', detail: 'Big salad + curd' }, snack: { title: 'Roasted chana', detail: '1 handful + tea' }, dinner: { title: 'Lauki chana dal + 2 roti', detail: 'Cucumber raita' } },
    1: { breakfast: { title: 'Poha with peas + peanuts', detail: '1 katori curd' }, lunch: { title: 'Palak paneer + 2 roti', detail: 'Salad' }, snack: { title: 'Masala makhana', detail: 'See recipes' }, dinner: { title: 'Veg moong dal khichdi', detail: 'Curd + roasted papad' } },
    2: { breakfast: { title: '1 paneer paratha', detail: 'On tawa, ½ tsp ghee + curd' }, lunch: { title: 'Dal chawal + gajar-matar', detail: 'Salad + curd' }, snack: { title: 'Sprouts chaat', detail: 'Lemon + chaat masala' }, dinner: { title: 'Satvic paneer bhurji', detail: '1 roti + tomato soup' } },
    3: { breakfast: { title: 'Besan veggie chilla (2)', detail: 'Curd + tea' }, lunch: { title: 'Kadhi + small rice', detail: 'Beans / bhindi + salad' }, snack: { title: 'Chaas + 5 almonds', detail: '+ 2 walnut halves' }, dinner: { title: 'Namkeen veg dalia', detail: 'Curd' } },
    4: { breakfast: { title: 'Veg paneer sandwich', detail: 'No-maida bread + hung curd spread' }, lunch: { title: 'Lauki chana dal + 2 roti', detail: 'Aloo-gajar (more gajar) + curd' }, snack: { title: 'Roasted peanuts', detail: 'Small handful + tea' }, dinner: { title: 'Mixed veg + moong dal', detail: '2 roti' } },
    5: { breakfast: { title: 'Veggie curd rice', detail: 'Small portion, jeera-rai tadka + peanuts' }, lunch: { title: 'Chhole + 1 roti', detail: 'Or small rice + salad + curd' }, snack: { title: 'Masala makhana', detail: '+ tea' }, dinner: { title: 'Eating-out night 🍽️', detail: 'Follow the eating-out rules, or tawa paneer tikka at home' } },
    6: { breakfast: { title: 'Pizza bread 🍕', detail: 'Hung curd + paneer + veggies + a little mozzarella' }, lunch: { title: 'Family favourite', detail: 'Any dish, same plate rule' }, snack: { title: 'Fruit chaat', detail: 'With chaat masala' }, dinner: { title: 'Methi / palak dal', detail: '2 roti + seasonal sabzi' } },
  },

  dailyFixed: [
    { title: '11 AM · 1 fruit', detail: 'Guava, apple, orange, papaya, pomegranate' },
    { title: '12 PM · Masala chaas', detail: 'Jeera, pudina, kala namak' },
    { title: 'Every day · 1 tbsp seed mix', detail: 'Alsi + sunflower + til on curd or salad' },
    { title: 'Always · Iodised salt', detail: 'Needed for the thyroid' },
  ],

  plateRules: ['Salad first, then the rest', 'Sit and eat. No eating while cooking', 'Stop at 80% full', 'Kitchen closes after dinner'],

  portions: [
    { item: 'Roti (medium, no ghee on top)', amount: '2' },
    { item: 'Rice (cooked)', amount: '1 katori' },
    { item: 'Dal / rajma / chhole', amount: '1 big katori' },
    { item: 'Sabzi', amount: '1–2 katori' },
    { item: 'Paneer', amount: '60–80 g' },
    { item: 'Oil, whole day', amount: '3 tsp' },
    { item: 'Ghee, whole day', amount: '1 tsp' },
  ],

  swaps: [
    { from: 'Processed cheese slices', to: 'Hung curd spread or grated paneer' },
    { from: 'Zero-sugar cola every day', to: 'Nimbu-pudina fizz or chaas (cola 2× a week)' },
    { from: 'Fruit juice', to: 'Whole fruit' },
    { from: 'Namkeen or biscuits with tea', to: 'Roasted chana, makhana or peanuts' },
    { from: 'Ghee spread on paratha', to: 'Tawa-cooked, ½ tsp ghee, with curd' },
    { from: 'Big plate of rice', to: '1 katori rice + extra dal + salad' },
    { from: 'Aloo-heavy sabzi', to: 'More gajar, matar, beans' },
    { from: 'Tasting bites while cooking', to: 'Munch a cucumber or carrot' },
    { from: 'Mithai craving', to: '1 date + ½ walnut, or fruit with curd' },
  ],

  recipes: [
    { id: 'chilla', name: 'Paneer Moong Chilla', tag: 'High-protein breakfast', minutes: 15, steps: ['Soak 1 cup moong dal 4 hrs or overnight.', 'Grind with ginger, green chilli, jeera and salt.', 'Spread thin on a non-stick tawa with ½ tsp oil.', 'Fill with grated paneer, coriander and chaat masala. Fold.', 'Serve with green chutney.'] },
    { id: 'hungcurd', name: 'Hung Curd Spread', tag: 'Replaces cheese', minutes: 5, steps: ['Hang 2 cups curd in muslin for 3–4 hrs.', 'Mix black pepper, oregano or chilli flakes and salt.', 'Add finely chopped capsicum.', 'Use in sandwiches and on pizza bread. Keeps 3 days.'] },
    { id: 'bhurji', name: 'Satvic Paneer Bhurji', tag: '10-minute dinner', minutes: 10, steps: ['1 tsp ghee, jeera, hing, grated ginger.', 'Add tomato and capsicum, then haldi and salt. Cook 3 min.', 'Add 100 g crumbled paneer, kasuri methi, pinch of garam masala.', 'Cook 2 min and finish with coriander.'] },
    { id: 'makhana', name: 'Masala Makhana', tag: 'Replaces namkeen', minutes: 8, steps: ['Roast 2 cups makhana in 1 tsp ghee on low flame, 5–6 min.', 'Toss with haldi, black pepper, kala namak and chaat masala.', 'Cool and store in a jar for the week.'] },
    { id: 'sprouts', name: 'Sprouts Chaat', tag: 'Protein + fibre snack', minutes: 5, steps: ['1 katori boiled moong sprouts.', 'Add tomato, cucumber, pomegranate.', 'Lemon, roasted jeera, kala namak, green chilli, coriander.'] },
    { id: 'fizz', name: 'Nimbu-Pudina Fizz', tag: 'Replaces cola', minutes: 2, steps: ['Chilled soda water in a nice glass.', 'Juice of ½ lemon + kala namak + roasted jeera.', 'Crushed mint leaves and ice. Zero sugar.'] },
  ],

  doctor: [
    { id: 'preg', title: 'Home pregnancy test', detail: 'First morning urine. If positive, see a gynaecologist within days.', when: 'Today' },
    { id: 'endo', title: 'Thyroid doctor (Endocrinologist)', detail: 'Take the report. Say: “We are planning a baby next year.”', when: 'This week' },
    { id: 'tests', title: 'Ask about follow-up tests', detail: 'TSH + Free T4 + Anti-TPO · Homocysteine · Ferritin · Folate · PTH · Ultrasound abdomen', when: 'At the visit' },
    { id: 'gyn', title: 'Gynaecologist pre-pregnancy visit', detail: 'Folic acid · periods regular? · rubella immunity · blood group', when: 'This month' },
    { id: 'meds', title: 'Tell doctors about every medicine', detail: 'Including ayurvedic / herbal products and acidity tablets', when: 'Every visit' },
  ],

  doctorQuestions: [
    'Do I need a thyroid tablet now? Which dose and what time?',
    'What TSH should I reach before we try for a baby?',
    'Is my B12 low from food or poor absorption? Injections or tablets?',
    'Which Vitamin D course? Do I need calcium too?',
    'Could my high ALP be from bones (low Vitamin D)?',
    'When should I start folic acid, and how much?',
    'When should each test be repeated?',
  ],

  redFlags: [
    'Numbness or weakness in the legs',
    'Yellow eyes or dark urine',
    'Chest pain or fainting',
    'A lump in the neck or trouble swallowing',
    'Feeling very low or hopeless',
  ],
};
