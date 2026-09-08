import {
  ArrayNotEmpty,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import type { ChartDifficulty } from '@tournament-hub/contracts';

export const CHART_DIFFICULTIES: ChartDifficulty[] = ['Novice', 'Easy', 'Medium', 'Hard', 'Expert', 'Edit'];

export class ImportSongDto {
  @ApiProperty({ example: 'Pack A/Song Folder', description: 'SyncStart song path: <pack>/<song folder>' })
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  title: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  artist?: string;

  @ApiProperty({ example: 'Pack A', description: 'Pack the song was imported from' })
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  group: string;

  @ApiProperty({ example: 13, description: 'Chart meter' })
  @IsInt()
  @Type(() => Number)
  difficulty: number;

  @ApiProperty({ enum: CHART_DIFFICULTIES, description: 'Difficulty slot read from the simfile' })
  @IsIn(CHART_DIFFICULTIES)
  chartDifficulty: ChartDifficulty;
}

export class ImportSongsDto {
  @ApiProperty({ example: 1, description: 'Tournament whose pool the songs join' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  tournamentId: number;

  @ApiProperty({ type: [ImportSongDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20000)
  @ValidateNested({ each: true })
  @Type(() => ImportSongDto)
  songs: ImportSongDto[];
}

export class CreateSongDto {
  @ApiProperty({
    example: 'Song Title',
    description: 'Title of the song',
  })
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  title: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  artist?: string;

  @ApiProperty({
    example: 'Song Group',
    description: 'Group of the song',
  })
  @IsNotEmpty()
  @IsString()
  @Type(() => String)
  group: string;

  @ApiProperty({
    example: 5,
    description: 'Difficulty of the song',
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  difficulty: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tournamentId?: number;
}

export class RollSongsDto {
    @ApiProperty({ example: 3, description: 'Division whose pool is drawn from' })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    divisionId: number;

    @ApiProperty({ example: [9, 9, 10, 10], description: 'One song is drawn per level asked for' })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(50)
    @IsInt({ each: true })
    @Type(() => Number)
    levels: number[];

    @ApiProperty({ example: 'Pack A', required: false, description: 'Pack to draw from; the whole pool when absent' })
    @IsOptional()
    @IsString()
    @Type(() => String)
    group?: string;

    @ApiProperty({ example: false, required: false, description: 'Draws songs the division has already played too' })
    @IsOptional()
    @IsBoolean()
    allowPlayed?: boolean;

    @ApiProperty({ example: [12, 34], required: false, description: 'Songs the caller already holds, which are not drawn again' })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    excludeSongIds?: number[];

    @ApiProperty({ example: 7, required: false, description: 'Match the draw is for, whose songs are never drawn again' })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    matchId?: number;
}
