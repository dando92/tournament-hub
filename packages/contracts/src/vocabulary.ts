export type TournamentStatus = 'open' | 'closed';

export type ParticipantRole = 'competitor' | 'spectator' | 'owner' | 'staff' | 'unknown';
export type ParticipantStatus = 'registered' | 'checked_in' | 'withdrawn' | 'unknown';

export type EntrantType = 'player' | 'team';
export type EntrantStatus = 'active' | 'dropped' | 'withdrawn' | 'dq' | 'unknown';

export type MatchState = 'open' | 'partial' | 'ready' | 'tiebreak_required' | 'completed';

export type PhaseGroupState = 'pending' | 'active' | 'completed';
export type PhaseGroupEntrantStatus = 'pending' | 'active' | 'advanced' | 'eliminated' | 'withdrawn' | 'dq';

export type AdvancementCompetitionKind = 'match' | 'phase_group';

export type ChartDifficulty = 'Novice' | 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Edit';
