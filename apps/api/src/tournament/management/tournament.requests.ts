import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
    SCORING_SYSTEM_TYPES,
    type ScoringSystemType,
} from '@tournament-hub/scoring';

export class CreateTournamentDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'UEFA Euro 2024', description: 'The name of the tournament.' })
    name: string;
}

export class UpdateTournamentDto {
    @IsOptional()
    @IsString()
    @ApiProperty({ example: 'UEFA Euro 2024', description: 'The name of the tournament.', required: false })
    name?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({ description: 'start.gg API key for this tournament.', required: false })
    startggApiKey?: string | null;

    @IsOptional()
    @IsIn(SCORING_SYSTEM_TYPES)
    @ApiProperty({ enum: SCORING_SYSTEM_TYPES, description: 'Default scoring system for newly created matches.', required: false })
    defaultScoringSystem?: ScoringSystemType;
}
