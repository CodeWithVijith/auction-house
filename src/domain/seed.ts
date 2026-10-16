import type { Snapshot } from './types';
export const uid = () => crypto.randomUUID();
export function seed(sample = true): Snapshot {
  return {
    schemaVersion: 3,
    id: uid(),
    revision: 0,
    eventName: 'Auction House',
    season: 'Premier League 2026',
    unit: 'POINTS',
    configurationLocked: false,
    isSample: sample,
    players: sample
      ? [
          ['Arjun Mehta', 'Batter', 'Senior', '24', 'Bengaluru'],
          ['Rohan Nair', 'All-rounder', 'Senior', '26', 'Kochi'],
          ['Karthik Rao', 'Bowler', 'Senior', '23', 'Hyderabad'],
          ['Dev Sharma', 'Wicketkeeper', 'Junior', '21', 'Pune'],
          ['Sahil Khan', 'Batter', 'Senior', '25', 'Mumbai'],
          ['Vikram Patel', 'Bowler', 'Junior', '22', 'Ahmedabad'],
        ].map(([name, role, category, age, city], i) => ({
          id: uid(),
          registrationCode: 'PL-' + String(i + 1).padStart(3, '0'),
          name,
          role,
          category,
          age: Number(age),
          city,
          photoUrl: '',
        }))
      : [],
    teams: sample
      ? [
          'Royal Strikers|RS|#7258c9',
          'Coastal Sharks|CS|#288ab3',
          'Thunder XI|TX|#d28c29',
          'Green Falcons|GF|#21846d',
        ].map((v) => {
          const [name, shortName, color] = v.split('|');
          return {
            id: uid(),
            name,
            shortName,
            color,
            startingBudgets: { POINTS: 1000, INR: 1000000 },
            maxPlayers: 11,
          };
        })
      : [],
    rounds: [],
    currentRoundId: null,
    currentSelection: null,
    outcomes: [],
    corrections: [],
    preferences: {
      autoNext: true,
      showPhoto: true,
      showAge: true,
      showCity: true,
    },
  };
}
