import { ArrayUnique, IsArray, IsDateString, IsInt, IsNotEmpty, IsString, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class ScheduleEntryInputDto {
    @IsInt()
    @Min(1)
    matchId: number;

    @IsInt()
    @Min(1)
    @Max(1440)
    expectedDurationMinutes: number;
}

export class CreateScheduleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsDateString()
    willStartAt: string;

    @IsInt()
    @Min(1)
    @Max(1440)
    defaultExpectedDurationMinutes: number;

    @IsArray()
    @ArrayUnique()
    matchIds: number[];
}

export class UpdateScheduleDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsDateString()
    willStartAt: string;
}

export class ReplaceScheduleEntriesDto {
    @IsInt()
    @Min(1)
    version: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ScheduleEntryInputDto)
    entries: ScheduleEntryInputDto[];
}

export class UpdateScheduleEntryTimeDto {
    @IsInt()
    @Min(1)
    @Max(1440)
    expectedDurationMinutes: number;
}
