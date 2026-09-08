import {
  BadRequestException,
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';

export type TournamentEntityReference =
  | 'tournament'
  | 'division'
  | 'phase'
  | 'phase-group'
  | 'match'
  | 'round'
  | 'song'
  | 'schedule'
  | 'advancement-source';

export interface TournamentMutationReference {
  entity: TournamentEntityReference;
  location: 'params' | 'body';
  field: string;
}

const TOURNAMENT_MUTATION_REFERENCE = 'tournamentMutationReference';

type TournamentRow = { id: number; status: string };

const TOURNAMENT_OF: Record<
  Exclude<TournamentEntityReference, 'advancement-source'>,
  string
> = {
  tournament: `SELECT t."id" AS id, t."status" AS status FROM "tournament" t WHERE t."id" = $1`,
  division: `SELECT t."id" AS id, t."status" AS status FROM "division" d JOIN "tournament" t ON t."id" = d."tournamentId" WHERE d."id" = $1`,
  phase: `SELECT t."id" AS id, t."status" AS status FROM "phase" p JOIN "division" d ON d."id" = p."divisionId" JOIN "tournament" t ON t."id" = d."tournamentId" WHERE p."id" = $1`,
  'phase-group': `SELECT t."id" AS id, t."status" AS status FROM "competition_address" ca JOIN "tournament" t ON t."id" = ca."tournamentId" WHERE ca."phaseGroupId" = $1 LIMIT 1`,
  match: `SELECT t."id" AS id, t."status" AS status FROM "competition_address" ca JOIN "tournament" t ON t."id" = ca."tournamentId" WHERE ca."matchId" = $1`,
  round: `SELECT t."id" AS id, t."status" AS status FROM "round" r JOIN "competition_address" ca ON ca."matchId" = r."matchId" JOIN "tournament" t ON t."id" = ca."tournamentId" WHERE r."id" = $1`,
  song: `SELECT t."id" AS id, t."status" AS status FROM "song" s JOIN "tournament" t ON t."id" = s."tournamentId" WHERE s."id" = $1`,
  'schedule': `SELECT t."id" AS id, t."status" AS status FROM "schedule" s JOIN "tournament" t ON t."id" = s."tournamentId" WHERE s."id" = $1`,
};

export const RequireOpenTournament = (reference: TournamentMutationReference) =>
  SetMetadata(TOURNAMENT_MUTATION_REFERENCE, reference);

@Injectable()
export class TournamentOpenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const reference = this.reflector.get<TournamentMutationReference>(
      TOURNAMENT_MUTATION_REFERENCE,
      context.getHandler(),
    );
    if (!reference) return true;

    const request = context.switchToHttp().getRequest();
    const rawId = request[reference.location]?.[reference.field];
    const entityId = Number(rawId);
    if (!Number.isInteger(entityId)) {
      throw new BadRequestException(
        `Cannot resolve tournament from ${reference.location}.${reference.field}`,
      );
    }

    const tournament = await this.resolveTournament(
      reference.entity,
      entityId,
      request.params,
    );
    if (!tournament) {
      throw new NotFoundException(
        reference.entity === 'tournament'
          ? `Tournament with id ${entityId} not found`
          : `Cannot resolve a tournament for ${reference.entity} ${entityId}`,
      );
    }
    if (tournament.status === 'closed') {
      throw new ConflictException(
        `Tournament with id ${tournament.id} is closed and must be reopened before it can be modified`,
      );
    }
    request.tournamentId = tournament.id;
    return true;
  }

  private async resolveTournament(
    entity: TournamentEntityReference,
    entityId: number,
    params: Record<string, string>,
  ): Promise<TournamentRow | null> {
    if (entity === 'advancement-source') {
      const sourceKind = params.sourceKind;
      if (sourceKind === 'match') {
        return this.queryOne(TOURNAMENT_OF.match, entityId);
      }
      if (sourceKind === 'phase_group') {
        return this.queryOne(TOURNAMENT_OF['phase-group'], entityId);
      }
      throw new BadRequestException(
        `Unsupported advancement source ${sourceKind}`,
      );
    }

    return this.queryOne(TOURNAMENT_OF[entity], entityId);
  }

  private async queryOne(
    query: string,
    id: number,
  ): Promise<TournamentRow | null> {
    const rows: TournamentRow[] = await this.dataSource.query(query, [id]);
    return rows[0] ?? null;
  }
}
