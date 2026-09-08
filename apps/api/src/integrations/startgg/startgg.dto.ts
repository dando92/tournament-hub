import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StartggImportPreviewDto {
    @ApiProperty({ description: 'start.gg event slug', example: 'tournament/genesis-9-1/event/ultimate-singles' })
    @IsString()
    @IsNotEmpty()
    eventSlug: string;

    @ApiProperty({ description: 'Optional local target tournament id for matching and previewing writes', required: false })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    targetTournamentId?: number;

    @ApiProperty({ description: 'Import mode hint', required: false, example: 'create-division' })
    @IsOptional()
    @IsString()
    mode?: string;
}

export class StartggImportDto extends StartggImportPreviewDto {
    @ApiProperty({ description: 'Local target tournament id', example: 1 })
    @Type(() => Number)
    @IsInt()
    targetTournamentId: number;
}
