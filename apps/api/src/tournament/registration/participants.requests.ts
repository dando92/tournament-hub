import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateParticipantDto {
    @ApiProperty({ required: false, description: 'Existing local player id to register into the tournament' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    playerId?: number;

    @ApiProperty({ required: false, description: 'New participant gamer tag / player name' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    playerName?: string;
}

export class ImportParticipantsPreviewDto {
    @ApiProperty({ type: [String], description: 'Ordered list of participant names to import' })
    @IsArray()
    @IsString({ each: true })
    playerNames: string[];
}

export class ImportParticipantEntryDto {
    @ApiProperty({ description: 'Requested participant name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ required: false, description: 'Matched existing local player id' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    playerId?: number;
}

export class ImportParticipantsDto {
    @ApiProperty({ type: [ImportParticipantEntryDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportParticipantEntryDto)
    entries: ImportParticipantEntryDto[];
}
