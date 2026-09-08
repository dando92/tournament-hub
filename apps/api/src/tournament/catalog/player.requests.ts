import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkAddPlayersToDivisionDto {
    @ApiProperty({ type: [String], description: 'List of player names to add to the division' })
    @IsArray()
    @IsString({ each: true })
    playerNames: string[];
}
