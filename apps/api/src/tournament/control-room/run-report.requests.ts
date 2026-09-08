import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNumber, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

export class ReportedRunDto {
    @IsInt()
    @Min(1)
    playerId: number;

    @IsNumber()
    @Min(0)
    score: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    exScore: number;

    @IsBoolean()
    isFailed: boolean;
}

export class ReportRunsDto {
    @IsString()
    @Length(1, 200)
    submissionId: string;

    @IsInt()
    @Min(1)
    songId: number;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(64)
    @ValidateNested({ each: true })
    @Type(() => ReportedRunDto)
    runs: ReportedRunDto[];
}
