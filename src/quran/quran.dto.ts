import { IsInt, Max, Min } from 'class-validator';

export class JuzActionDto {
  @IsInt()
  @Min(1)
  @Max(30)
  juzNumber!: number;
}
