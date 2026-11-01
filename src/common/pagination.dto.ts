import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(21_474_836)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage = 20;
}
