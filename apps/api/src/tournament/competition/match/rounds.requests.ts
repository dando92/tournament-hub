import {
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertScoreDto {
    @ApiProperty({ description: 'EX score percentage', example: 92.5 })
    @IsNotEmpty()
    @IsNumber()
    percentage: number;

    @ApiProperty({ description: 'Whether the run failed', example: false })
    @IsNotEmpty()
    @IsBoolean()
    isFailed: boolean;

    @ApiProperty({
        description: 'An existing score to attach instead of creating one',
        required: false,
    })
    @IsOptional()
    @IsNumber()
    scoreId?: number;
}

export class UpsertPointsDto {
    @ApiProperty({ description: 'Points assigned to the player', example: 3 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    points: number;
}
