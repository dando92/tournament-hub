import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type EventEnvelope,
  LIVE_EVENT_PUBLISHER,
  type LiveEventPublisher,
} from '@tournament-hub/live-messaging';
import { MatchAddress } from '@match/match.aggregate';
import { PlanVersionStore } from '@tournament/shared/plan-version.store';
import { DivisionAddress } from '@tournament/structure/division/division.aggregate';
import { PhaseAddress, PhaseGroupAddress } from '@tournament/structure/phase-group/phase-group.aggregate';

@Injectable()
export class UiUpdatePublisher {
  constructor(
    private readonly config: ConfigService,
    @Inject(LIVE_EVENT_PUBLISHER) private readonly transport: LiveEventPublisher,
    private readonly planVersions: PlanVersionStore,
  ) {}

  emitTournamentUpdate(tournamentId: number | null | undefined): Promise<void> {
    if (!tournamentId) return Promise.resolve();
    return this.publish('ui.tournament-changed', tournamentId, { tournamentId });
  }

  emitSongsUpdate(tournamentId: number | null | undefined): Promise<void> {
    if (!tournamentId) return Promise.resolve();
    return this.publish('ui.songs-changed', tournamentId, { tournamentId });
  }

  emitDivisionUpdate(address: DivisionAddress): Promise<void> {
    if (!address?.tournamentId || !address?.divisionId) return Promise.resolve();
    return this.publish('ui.division-changed', address.tournamentId, address);
  }

  emitPhaseUpdate(address: PhaseAddress): Promise<void> {
    if (!address?.tournamentId || !address?.phaseId) return Promise.resolve();
    const { tournamentId, divisionId, phaseId } = address;
    return this.publish('ui.phase-changed', tournamentId, { tournamentId, divisionId, phaseId });
  }

  emitMatchUpdate(address: MatchAddress): Promise<void> {
    if (!address?.tournamentId) return Promise.resolve();
    return this.publish('ui.match-changed', address.tournamentId, address);
  }

  emitScheduleUpdate(tournamentId: number | null | undefined, scheduleId: number | null | undefined): Promise<void> {
    if (!tournamentId || !scheduleId) return Promise.resolve();
    return this.publish('ui.schedule-changed', tournamentId, { tournamentId, scheduleId });
  }

  emitPhaseGroupUpdate(address: PhaseGroupAddress): Promise<void> {
    if (!address?.tournamentId || !address?.phaseGroupId) return Promise.resolve();
    const { tournamentId, divisionId, phaseId, phaseGroupId } = address;
    return this.publish('ui.phase-group-changed', tournamentId, { tournamentId, divisionId, phaseId, phaseGroupId });
  }

  emitWarning(tournamentId: number | null | undefined, message: string): Promise<void> {
    if (!tournamentId) return Promise.resolve();
    const event: EventEnvelope = { type: 'ui.warning', tournamentId, payload: { message } };
    return this.transport.publish(event);
  }

  private async publish(type: string, tournamentId: number, payload: unknown): Promise<void> {
    await this.planVersions.bump(tournamentId);
    const event: EventEnvelope = { type, tournamentId, payload };
    await this.transport.publish(event);
  }
}
