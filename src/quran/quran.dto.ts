import { IsInt, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto.js';

export class JuzPaginationQueryDto extends PaginationQueryDto {
  override perPage = 30;
}

export class JuzActionDto {
  @IsInt()
  @Min(1)
  @Max(30)
  juzNumber!: number;
}
