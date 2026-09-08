import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsInt, IsOptional, Min } from "class-validator";

export class CreateMatchTiebreakDto {
    @ApiProperty({ description: "The tied players participating in this attempt", type: [Number] })
    @IsArray()
    @ArrayMinSize(2)
    @IsInt({ each: true })
    playerIds: number[];

    @ApiProperty({ description: "Song used by a played attempt; omit for hand scoring", required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    songId?: number;
}
