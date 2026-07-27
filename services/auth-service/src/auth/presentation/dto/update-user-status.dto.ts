import { IsEnum } from 'class-validator';

export enum UpdateUserStatusDtoValue {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdateUserStatusDto {
  @IsEnum(UpdateUserStatusDtoValue)
  status!: UpdateUserStatusDtoValue;
}
