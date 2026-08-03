export type ModuleStatus = 'live' | 'soon';
export type ModuleIcon = 'vihar' | 'gift' | 'briefcase' | 'mala';

// Screen name for a `live` module's destination — must be a param-less route
// on AppStackParamList (see src/Vihar/screens/RootNavigator.tsx).
export type LiveRoute = 'MainTabs' | 'DigitalMala';

export type ModuleConfig = {
  key: string;
  label: string;
  subtitle: string;
  status: ModuleStatus;
  icon: ModuleIcon;
  route?: LiveRoute;      // set for `live` modules only
  todayCount?: number;    // Digital Mala progress chip
  malaSize?: number;      // Digital Mala progress chip (108 = one full mala)
};

// Drives the Main Dashboard module list — add a module here to add a card,
// no layout changes needed. `live` modules render full-width, stacked above
// the grid in array order; `soon` modules flow 2-up, with an odd trailing
// card spanning both columns.
export const MODULES: ModuleConfig[] = [
  {
    key: 'vihar',
    label: 'Vihar',
    subtitle: 'Track Gurudev vihar, routes & nearby locations',
    status: 'live',
    icon: 'vihar',
    route: 'MainTabs',
  },
  {
    key: 'digitalMala',
    label: 'Digital Mala',
    subtitle: 'Chant Navkar aloud — AI counts every accurate recitation',
    status: 'live',
    icon: 'mala',
    route: 'DigitalMala',
    // Placeholder until MainDashboardScreen loads the user's real
    // today-count from the API — must not be a fabricated non-zero value.
    todayCount: 0,
    malaSize: 108,
  },
  {
    key: 'rewards',
    label: 'Rewards',
    subtitle: 'Earn points for seva & donations',
    status: 'soon',
    icon: 'gift',
  },
  {
    key: 'jobs',
    label: 'Jobs',
    subtitle: 'Community jobs & opportunities',
    status: 'soon',
    icon: 'briefcase',
  },
];
