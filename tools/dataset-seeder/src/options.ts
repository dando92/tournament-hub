export type ProfileName = 'venue' | 'season' | 'stress';

export type Profile = {
    name: ProfileName;
    tournaments: number;
    closedTournaments: number;
    divisionsPerClosedTournament: number;
    entrantsPerClosedDivision: number;
    divisions: number;
    completedDivisions: number;
    entrantsPerDivision: number;
    phasesPerDivision: number;
    poolsPerPhase: number;
    matchesPerPool: number;
    songs: number;
    schedules: number;
    entriesPerSchedule: number;
};

const PROFILES: Record<ProfileName, Profile> = {
    venue: {
        name: 'venue',
        tournaments: 1,
        closedTournaments: 0,
        divisionsPerClosedTournament: 0,
        entrantsPerClosedDivision: 0,
        divisions: 8,
        completedDivisions: 1,
        entrantsPerDivision: 25,
        phasesPerDivision: 2,
        poolsPerPhase: 4,
        matchesPerPool: 5,
        songs: 120,
        schedules: 4,
        entriesPerSchedule: 36,
    },
    season: {
        name: 'season',
        tournaments: 1,
        closedTournaments: 60,
        divisionsPerClosedTournament: 8,
        entrantsPerClosedDivision: 45,
        divisions: 4,
        completedDivisions: 1,
        entrantsPerDivision: 20,
        phasesPerDivision: 2,
        poolsPerPhase: 3,
        matchesPerPool: 4,
        songs: 90,
        schedules: 2,
        entriesPerSchedule: 20,
    },
    stress: {
        name: 'stress',
        tournaments: 1,
        closedTournaments: 0,
        divisionsPerClosedTournament: 0,
        entrantsPerClosedDivision: 0,
        divisions: 40,
        completedDivisions: 1,
        entrantsPerDivision: 50,
        phasesPerDivision: 3,
        poolsPerPhase: 8,
        matchesPerPool: 12,
        songs: 400,
        schedules: 12,
        entriesPerSchedule: 60,
    },
};

export type Options = {
    profile: Profile;
    seed: number;
    reset: boolean;
    tournamentName: string;
    into: number | 'last' | null;
};

const USAGE = `
Usage: npm run seed:dataset -- [options]

  --profile <venue|season|stress>  Which shape to write. Default: venue.
  --seed <number>                  Generator seed. Default: 20260904.
  --tournaments <number>           How many tournaments are under way, each
                                   with the profile's full structure, matches
                                   and boards. Default: the profile's own.
  --completed <number>             How many divisions of each tournament are
                                   played to the end, as a single-elimination
                                   bracket. Default: the profile's own.
  --scale <number>                 Multiplies the structural counts. Default: 1.
  --into <id|last>                 Add the profile's divisions, matches and
                                   boards to a tournament that already exists
                                   instead of creating one.
  --reset                          Empty every data table first. Accounts and
                                   applied migrations are kept.
  --name <text>                    Name of the tournament under way.
  --help                           This text.

Every run appends. Without --reset the database keeps what it holds, so the
same command run again adds another tournament, and --into adds to one that is
already there. The seed is offset by the tournaments already present, so
repeated runs differ from one another while a given sequence of commands from a
reset database still reproduces row for row.

Database connection: DATABASE_HOST, DATABASE_PORT, DATABASE_USER,
DATABASE_PASSWORD, DATABASE_NAME, DATABASE_SSL — the same variables the
migration runner reads.
`;

export function parseOptions(argv: string[]): Options | null {
    if (argv.includes('--help') || argv.includes('-h')) {
        console.log(USAGE.trim());

        return null;
    }

    const profileName = (value(argv, 'profile') ?? 'venue') as ProfileName;
    if (!PROFILES[profileName]) {
        throw new Error(`Unknown profile "${profileName}". Known profiles: ${Object.keys(PROFILES).join(', ')}.`);
    }

    const scale = Number(value(argv, 'scale') ?? 1);
    if (!Number.isFinite(scale) || scale <= 0) {
        throw new Error(`--scale must be a positive number, got "${value(argv, 'scale')}".`);
    }

    const tournaments = Number(value(argv, 'tournaments') ?? PROFILES[profileName].tournaments);
    if (!Number.isInteger(tournaments) || tournaments < 1) {
        throw new Error(`--tournaments must be a positive whole number, got "${value(argv, 'tournaments')}".`);
    }

    const completed = Number(value(argv, 'completed') ?? PROFILES[profileName].completedDivisions);
    if (!Number.isInteger(completed) || completed < 0) {
        throw new Error(`--completed must be a whole number, got "${value(argv, 'completed')}".`);
    }

    return {
        profile: { ...scaled(PROFILES[profileName], scale), tournaments, completedDivisions: completed },
        seed: Number(value(argv, 'seed') ?? 20260904),
        reset: argv.includes('--reset'),
        tournamentName: value(argv, 'name') ?? `Dataset ${profileName}`,
        into: parseInto(value(argv, 'into')),
    };
}

function parseInto(raw: string | undefined): number | 'last' | null {
    if (raw === undefined) {
        return null;
    }
    if (raw === 'last') {
        return 'last';
    }

    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) {
        throw new Error(`--into takes a tournament id or "last", got "${raw}".`);
    }

    return id;
}

function scaled(profile: Profile, scale: number): Profile {
    if (scale === 1) {
        return profile;
    }

    return {
        ...profile,
        closedTournaments: Math.round(profile.closedTournaments * scale),
        divisions: Math.max(1, Math.round(profile.divisions * scale)),
        schedules: Math.max(1, Math.round(profile.schedules * scale)),
    };
}

function value(argv: string[], name: string): string | undefined {
    const index = argv.indexOf(`--${name}`);

    return index >= 0 ? argv[index + 1] : undefined;
}
